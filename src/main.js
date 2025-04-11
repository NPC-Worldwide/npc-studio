const { app, BrowserWindow, globalShortcut,ipcMain, protocol, shell} = require('electron');
const { desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(os.homedir(), 'npcsh_history.db');
const fetch = require('node-fetch');
const { dialog } = require('electron');

const logFilePath = path.join(process.resourcesPath, 'app.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const log = (...messages) => {
    const msg = messages.join(' ');
    console.log(msg);
    logStream.write(`${msg}\n`);
};
const DEFAULT_SHORTCUT = 'CommandOrControl+Space';
const DEFAULT_CONFIG = {
  baseDir: path.resolve(os.homedir(), '.npcsh'),
  stream: true,
  model: 'llama3.2',
  provider: 'ollama',
  npc: 'sibiji',
};
let isCapturingScreenshot = false;

let lastScreenshotTime = 0;
const SCREENSHOT_COOLDOWN = 1000; // 1 second cooldown between screenshots

function ensureUserDataDirectory() {
  const userDataPath = path.join(os.homedir(), '.npc_studio', 'data');
  log('Creating user data directory:', userDataPath);

  try {
      fs.mkdirSync(userDataPath, { recursive: true });
      log('User data directory created/verified');
  } catch (err) {
      log('ERROR creating user data directory:', err);
  }

  return userDataPath;
}

function registerGlobalShortcut(win) {
  if (!win) {
    console.warn('No window provided to registerGlobalShortcut');
    return;
  }

  globalShortcut.unregisterAll();

  try {
    const rcPath = path.join(os.homedir(), '.npcshrc');
    let shortcut = DEFAULT_SHORTCUT;

    if (fs.existsSync(rcPath)) {
      const rcContent = fs.readFileSync(rcPath, 'utf8');
      const shortcutMatch = rcContent.match(/CHAT_SHORTCUT=["']?([^"'\n]+)["']?/);
      if (shortcutMatch) {
        shortcut = shortcutMatch[1];
      }
    }

    // Register the macro shortcut
    const macroSuccess = globalShortcut.register(shortcut, () => {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send('show-macro-input');
    });
    console.log('Macro shortcut registered:', macroSuccess);
    const screenshotSuccess = globalShortcut.register('Alt+Shift+4', async () => {
      // Prevent multiple captures at once
      const now = Date.now();
      if (isCapturingScreenshot || (now - lastScreenshotTime) < SCREENSHOT_COOLDOWN) {
        console.log('Screenshot capture blocked - too soon or already capturing');
        return;
      }

      isCapturingScreenshot = true;
      lastScreenshotTime = now;

      console.log('Screenshot shortcut triggered');
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();
      const primaryDisplay = displays[0];
      const selectionWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: primaryDisplay.bounds.width,
        height: primaryDisplay.bounds.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      const selectionPath = path.join(__dirname, 'renderer', 'components', 'selection.html');

      // Use a single event handler
      const handleScreenshot = async (event, bounds) => {
        try {
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
              width: bounds.width * primaryDisplay.scaleFactor,
              height: bounds.height * primaryDisplay.scaleFactor
            }
          });

          const image = sources[0].thumbnail.crop(bounds);
          const screenshotPath = path.join(DEFAULT_CONFIG.baseDir, 'screenshots', `screenshot-${Date.now()}.png`);

          // Write file synchronously
          fs.writeFileSync(screenshotPath, image.toPNG());

          // Send event once
          win.webContents.send('screenshot-captured', screenshotPath);

        } catch (error) {
          console.error('Screenshot failed:', error);
        } finally {
          // Clean up
          ipcMain.removeListener('selection-complete', handleScreenshot);
          selectionWindow.close();
          isCapturingScreenshot = false;
        }
      };

      ipcMain.once('selection-complete', handleScreenshot);

      ipcMain.once('selection-cancel', () => {
        ipcMain.removeListener('selection-complete', handleScreenshot);
        selectionWindow.close();
        isCapturingScreenshot = false;
      });

      try {
        await selectionWindow.loadFile(selectionPath);
      } catch (err) {
        console.error('Failed to load selection window:', err);
        selectionWindow.close();
        isCapturingScreenshot = false;
      }
    });

  } catch (error) {
    console.error('Failed to register global shortcut:', error);
  }
}



const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const DEFAULT_CONFIG = {
    baseDir: path.resolve(os.homedir(), '.npcsh'),
    model: 'llama3.2',
    provider: 'ollama',
    stream: true,
    npc: 'sibiji'
  };

  const expandHomeDir = (filepath) => {
    if (filepath.startsWith('~')) {
      return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
  };

  // Second instance handler
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (files) => {
    const attachmentData = [];
    for (const file of Array.from(files)) {
      const base64 = await convertFileToBase64(file);
      attachmentData.push({
        name: file.name,
        type: file.type,
        base64: base64
      });
    }
    await window.api.get_attachment_response(attachmentData);
  };
  // Add this near your other protocol.registerFileProtocol calls

  protocol.registerSchemesAsPrivileged([{
    scheme: 'media',
    privileges: {
      standard: true,
      supportFetchAPI: true,
      stream: true,
      secure: true,
      corsEnabled: true
    }
  }]);

  async function ensureBaseDir() {
    try {
      await fsPromises.mkdir(DEFAULT_CONFIG.baseDir, { recursive: true });
      await fsPromises.mkdir(path.join(DEFAULT_CONFIG.baseDir, 'conversations'), { recursive: true });
      await fsPromises.mkdir(path.join(DEFAULT_CONFIG.baseDir, 'config'), { recursive: true });
      await fsPromises.mkdir(path.join(DEFAULT_CONFIG.baseDir, 'images'), { recursive: true });
      await fsPromises.mkdir(path.join(DEFAULT_CONFIG.baseDir, 'screenshots'), { recursive: true });
    } catch (err) {
      console.error('Error creating base directory:', err);
    }
  }

  async function getConversationsFromDb(dirPath) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      const query = `
        SELECT DISTINCT conversation_id,
              MIN(timestamp) as start_time,
              GROUP_CONCAT(content) as preview
        FROM conversation_history
        WHERE directory_path = ?
        GROUP BY conversation_id
        ORDER BY start_time DESC
      `;

      db.all(query, [dirPath], (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve({
            conversations: rows.map(row => ({
              id: row.conversation_id,
              timestamp: row.start_time,
              preview: row.preview
            }))
          });
        }
      });
    });
  }
  function showWindow() {
    if (!mainWindow) {
      createWindow();
    }

    // Get all screens
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Center the window
    mainWindow.setPosition(
      Math.round(width / 2 - 600), // Assuming window width is 1200
      Math.round(height / 2 - 400)  // Assuming window height is 800
    );

    mainWindow.show();
    mainWindow.focus();

    // Tell renderer to show macro input
    mainWindow.webContents.send('show-macro-input');
  }

  function createWindow() {
    console.log('Creating window');
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        webSecurity: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Change win to mainWindow here
    registerGlobalShortcut(mainWindow);



    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "connect-src 'self' http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "font-src 'self' data: https://cdn.jsdelivr.net https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "img-src 'self' media: data: file: http: https: blob:; " +
            "frame-src 'self' https://web.squarecdn.com https://*.squarecdn.com https://*.square.site;"+
            "img-src 'self' file: data: media: http: https: blob:; "

          ]
        }
      });
    });

    console.log('DEV MODE: Loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
  }





  ipcMain.on('submit-macro', (event, command) => {
    // Hide the window after macro submission
    mainWindow.hide();

    // Here you would handle the command, e.g., send it to your npcsh process
    // For example:
    // executeNpcshCommand(command);
  });



    ipcMain.handle('getAvailableModels', async (event, currentPath) => {
      log('Handler: getAvailableModels called for path:', currentPath); // Use your log function
      if (!currentPath) {
          log('Error: getAvailableModels called without currentPath');
          return { models: [], error: 'Current path is required to fetch models.' };
      }
      try {
          const url = `http://127.0.0.1:5337/api/models?currentPath=${encodeURIComponent(currentPath)}`;
          log('Fetching models from:', url); // Log the URL being called

          const response = await fetch(url);

          if (!response.ok) {
              const errorText = await response.text();
              log(`Error fetching models: ${response.status} ${response.statusText} - ${errorText}`);
              throw new Error(`HTTP error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          log('Received models:', data.models?.length); // Log how many models received
          return data; // Should be { models: [...], error: null } on success

      } catch (err) {
          log('Error in getAvailableModels handler:', err); // Log the error
          // Ensure a consistent error structure is returned
          return { models: [], error: err.message || 'Failed to fetch models from backend' };
      }
  });


  ipcMain.handle('open_directory_picker', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });
  ipcMain.on('screenshot-captured', (event, data) => {
    window.postMessage({
        type: 'screenshot-captured',
        path: data.path,
        timestamp: data.timestamp
    }, '*');
});
  // Update IPC handler to modify npcshrc
  ipcMain.handle('update-shortcut', (event, newShortcut) => {
    const rcPath = path.join(os.homedir(), '.npcshrc');
    try {
      let rcContent = '';
      if (fsPromises.existsSync(rcPath)) {
        rcContent = fsPromises.readFileSync(rcPath, 'utf8');
        // Replace existing shortcut if it exists
        if (rcContent.includes('CHAT_SHORTCUT=')) {
          rcContent = rcContent.replace(/CHAT_SHORTCUT=["']?[^"'\n]+["']?/, `CHAT_SHORTCUT="${newShortcut}"`);
        } else {
          // Add new shortcut line if it doesn't exist
          rcContent += `\nCHAT_SHORTCUT="${newShortcut}"\n`;
        }
      } else {
        rcContent = `CHAT_SHORTCUT="${newShortcut}"\n`;
      }
      fsPromises.writeFileSync(rcPath, rcContent);
      registerGlobalShortcut(BrowserWindow.getFocusedWindow());
      return true;
    } catch (error) {
      console.error('Failed to update shortcut:', error);
      return false;
    }
  });

  // In main.js
  ipcMain.handle('wait-for-screenshot', async (event, screenshotPath) => {
    const maxAttempts = 20; // 10 seconds total
    const delay = 500; // 500ms between attempts

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fs.access(screenshotPath);
        const stats = await fs.stat(screenshotPath);
        if (stats.size > 0) {
          return true;
        }
      } catch (err) {
        // File doesn't exist yet or is empty
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return false;
  });
// Clean up on app quit
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
  ipcMain.handle('getNPCTeamGlobal', async () => {
    try {
      const response = await fetch('http://127.0.0.1:5337/api/npc_team_global', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch NPC team');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching NPC team:', error);
      throw error;
    }
  });

  ipcMain.handle('getNPCTeamProject', async (event, currentPath) => {
    try {
      if (!currentPath || typeof currentPath !== 'string') {
        throw new Error('Invalid currentPath provided');
      }

      const queryParams = new URLSearchParams({
        currentPath: currentPath
      }).toString();

      const url = `http://127.0.0.1:5337/api/npc_team_project?${queryParams}`;
      console.log('Fetching NPC team from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      return {
        npcs: data.npcs || []  // Ensure we always return an array
      };
    } catch (error) {
      console.error('Error fetching NPC team:', error);
      return {
        npcs: [],
        error: error.message
      };
    }
  });


  ipcMain.handle('loadGlobalSettings',  async () => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/settings/global', {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }
        return data

      } catch (err) {
        console.error('Error loading global settings:', err)

      }
    }
  );


  ipcMain.handle('get_attachment_response', async (_, attachmentData, messages) => {
    try {
      const response = await fetch('http://127.0.0.1:5337/api/get_attachment_response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachments: attachmentData,
          messages: messages
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      return result;
    } catch (err) {
      console.error('Error handling attachment response:', err);
      throw err;
    }
  });

  ipcMain.handle('showPromptDialog', async (event, options) => {
    const { title, message, defaultValue } = options;
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['OK', 'Cancel'],
      title: title,
      message: message,
      detail: defaultValue,
      noLink: true,
    });
    if (result.response === 0) {
      return defaultValue;
    }
    return null;
  });
  ipcMain.handle('get-tools-global', async () => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/tools/global', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error loading global tools:', err);
        return { error: err.message };
    }
});

ipcMain.handle('get-tools-project', async (event, currentPath) => {
  try {
      // Correctly interpolate `currentPath` into the URL
      const response = await fetch(`http://127.0.0.1:5337/api/tools/project?currentPath=${encodeURIComponent(currentPath)}`, {
          method: 'GET', // Use GET method
          headers: {
              'Content-Type': 'application/json'
          },
          // Remove the `body` for GET requests
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
  } catch (err) {
      console.error('Error loading project tools:', err);
      return { error: err.message };
  }
});

ipcMain.handle('save-tool', async (event, data) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/tools/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Error saving tool:', err);
        return { error: err.message };
    }
});

  ipcMain.handle('save-npc', async (event, data) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/save_npc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    } catch (error) {
        return { error: error.message };
    }
});
ipcMain.handle('executeCommandStream', async (event, data) => {
  try {
    const response = await fetch('http://127.0.0.1:5337/api/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commandstr: data.commandstr,
        currentPath: data.currentPath,
        conversationId: data.conversationId,
        model: data.model,
        npc: data.npc,
        attachments: data.attachments || [], // Add support for attachments
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Use Node.js streams to handle the response body
    const stream = response.body;

    // Listen for data events
    stream.on('data', (chunk) => {
      // Send each chunk to the frontend
      event.sender.send('stream-data', chunk.toString());
    });

    // Listen for the end of the stream
    stream.on('end', () => {
      // Notify the frontend that the stream is complete
      event.sender.send('stream-complete');
    });

    // Listen for errors
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      event.sender.send('stream-error', err.message);
    });
  } catch (err) {
    console.error('Error in executeCommandStream:', err);
    event.sender.send('stream-error', err.message);
  }
});
  ipcMain.handle('get-attachment', async (event, attachmentId) => {
    const response = await fetch('http://127.0.0.1:5337/api/attachment/${attachmentId}');
    return response.json();
  });

  ipcMain.handle('get-message-attachments', async (event, messageId) => {
    const response = await fetch('http://127.0.0.1:5337/api/attachments/${messageId}');
    return response.json();
  });

  ipcMain.handle('executeCommand', async (_, data) => {
    try {
      console.log('Executing command:', data);
      console.log('Data type:', typeof data);
      const commandString = data.commandstr;
      const currentPath = data.currentPath || DEFAULT_CONFIG.baseDir;
      const conversationId = data.conversationId || null;

      const response = await fetch('http://127.0.0.1:5337/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commandstr: commandString,
          currentPath,
          conversationId,
          model: data.model || DEFAULT_CONFIG.model,
          npc: data.npc || DEFAULT_CONFIG.npc
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }
      return result;
    } catch (err) {
      throw err;
    }
  });

  ipcMain.handle('getConversations', async (_, path) => {
    try {
      console.log('Handler: getConversations called for path:', path);
      // Add filesystem check to see if directory exists
      try {
        await fsPromises.access(path);
        console.log('Directory exists and is accessible');
      } catch (err) {
        console.error('Directory does not exist or is not accessible:', path);
        return { conversations: [], error: 'Directory not accessible' };
      }

      const apiUrl = `http://127.0.0.1:5337/api/conversations?path=${encodeURIComponent(path)}`;
      console.log('Calling API with URL:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.error('API returned error status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Raw API response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Error parsing JSON response:', err);
        return { conversations: [], error: 'Invalid JSON response' };
      }

      console.log('Parsed conversations data from API:', data);

      // Ensure we always return in the expected format
      return {
        conversations: data.conversations || []
      };
    } catch (err) {
      console.error('Error getting conversations:', err);
      return {
        error: err.message,
        conversations: []
      };
    }
  });
  ipcMain.handle('checkServerConnection', async () => {
    try {
      const response = await fetch('http://127.0.0.1:5337/api/status');
      if (!response.ok) return { error: 'Server not responding properly' };
      return await response.json();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('getConversationsInDirectory', async (_, directoryPath) => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      const query = `
        SELECT DISTINCT conversation_id,
              MIN(timestamp) as start_time,
              GROUP_CONCAT(content) as preview
        FROM conversation_history
        WHERE directory_path = ?
        GROUP BY conversation_id
        ORDER BY start_time DESC
      `;
      db.all(query, [directoryPath], (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  ipcMain.handle('read-file-content', async (_, filePath) => {
    try {
      const content = await fsPromises.readFile(filePath, 'utf8');
      return { content, error: null };
    } catch (err) {
      console.error('Error reading file:', err);
      return { content: null, error: err.message };
    }
  });

  ipcMain.handle('write-file-content', async (_, filePath, content) => {
    try {
      await fsPromises.writeFile(filePath, content, 'utf8');
      return { success: true, error: null };
    } catch (err) {
      console.error('Error writing file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-file', async (_, filePath) => {
    try {
      await fsPromises.unlink(filePath);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error deleting file:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('getConversationMessages', async (_, conversationId) => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);
      const query = `
        WITH ranked_messages AS (
          SELECT
              ch.*,
              ma.id AS attachment_id,
              ma.attachment_name,
              ma.attachment_data,
              ROW_NUMBER() OVER (
                  PARTITION BY ch.role, strftime('%s', ch.timestamp)
                  ORDER BY ch.id DESC
              ) as rn
          FROM conversation_history ch
          LEFT JOIN message_attachments ma
              ON ch.message_id = ma.message_id
          WHERE ch.conversation_id = ?
        )
        SELECT *
        FROM ranked_messages
        WHERE rn = 1
        ORDER BY timestamp ASC, id ASC
      `;

      db.all(query, [conversationId], (err, rows) => {
        db.close();
        if (err) reject(err);
        else {
          resolve(rows.map(row => ({
            ...row,
            attachment_data: row.attachment_data ? row.attachment_data.toString('base64') : null, // Convert BLOB to Base64
          })));
          console.log('Handler: getConversationMessages called for:', rows);
        }
      });
    });
  });

  ipcMain.handle('getDefaultConfig', () => {
    console.log('Handler: getDefaultConfig called');
    console.log('CONFIG:', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;

  });

  ipcMain.handle('getWorkingDirectory', () => {
    console.log('Handler: getWorkingDirectory called');
    return DEFAULT_CONFIG.baseDir;
  });

  ipcMain.handle('setWorkingDirectory', async (_, dir) => {
    console.log('Handler: setWorkingDirectory called with:', dir);
    try {
      const normalizedDir = path.normalize(dir);
      const baseDir = DEFAULT_CONFIG.baseDir;
      if (!normalizedDir.startsWith(baseDir)) {
        console.log('Attempted to access directory above base:', normalizedDir);
        return baseDir;
      }
      await fsPromises.access(normalizedDir);
      return normalizedDir;
    } catch (err) {
      console.error('Error in setWorkingDirectory:', err);
      throw err;
    }
  });

  ipcMain.handle('readDirectoryImages', async (_, dirPath) => {
    try {
      const fullPath = expandHomeDir(dirPath);
      const files = await fsPromises.readdir(fullPath);
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      return files
        .filter(file => imageExtensions.some(ext => file.toLowerCase().endsWith(ext)))
        .map(file => {
          const filePath = path.join(fullPath, file);
          return `media://${filePath}`;
        });
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  });

  ipcMain.handle('readDirectoryStructure', async (_, dirPath) => {
    const structure = {};
    const allowedExtensions = ['.py', '.md', '.js', '.json', '.txt', '.yaml', '.yml', '.html', '.css', '.npc', '.tool'];
    console.log(`[Main Process] readDirectoryStructure called for: ${dirPath}`); // LOG 1

    try {
      await fsPromises.access(dirPath, fs.constants.R_OK);
      const items = await fsPromises.readdir(dirPath, { withFileTypes: true });
      console.log(`[Main Process] Read ${items.length} items from ${dirPath}`); // LOG 2

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          structure[item.name] = { type: 'directory', path: itemPath };
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (allowedExtensions.includes(ext)) {
            console.log(`[Main Process] Found allowed file: ${item.name}`); // LOG 3
            structure[item.name] = { type: 'file', path: itemPath };
          }
        }
      }
      console.log(`[Main Process] Returning structure for ${dirPath}:`, JSON.stringify(structure, null, 2)); // LOG 4 (Critical: See the final structure)
      return structure;

    } catch (err) {
      console.error(`[Main Process] Error in readDirectoryStructure for ${dirPath}:`, err); // LOG 5
      if (err.code === 'ENOENT') return { error: 'Directory not found' };
      if (err.code === 'EACCES') return { error: 'Permission denied' };
      return { error: err.message || 'Failed to read directory contents' };
    }
  });


  ipcMain.handle('goUpDirectory', async (_, currentPath) => {
    console.log('goUpDirectory called with:', currentPath);
    if (!currentPath) {
      console.log('No current path, returning base dir');
      return DEFAULT_CONFIG.baseDir;
    }
    const parentPath = path.dirname(currentPath);
    console.log('Parent path:', parentPath);
    return parentPath;
  });

  ipcMain.handle('readDirectory', async (_, dir) => {
    console.log('Handler: readDirectory called for:', dir);
    try {
      const items = await fsPromises.readdir(dir, { withFileTypes: true });
      return items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(dir, item.name)
      }));
    } catch (err) {
      console.error('Error in readDirectory:', err);
      throw err;
    }
  });

  ipcMain.handle('deleteConversation', async (_, conversationId) => {
    try {
      const db = new sqlite3.Database(dbPath);
      const deleteQuery = 'DELETE FROM conversation_history WHERE conversation_id = ?';
      await new Promise((resolve, reject) => {
        db.run(deleteQuery, [conversationId], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      db.close();
      return { success: true };
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  });

  ipcMain.handle('createConversation', async (_, { title, model, provider, directory }) => {
    try {
      const conversationId = Date.now().toString();
      const conversation = {
        id: conversationId,
        title: title || 'New Conversation',
        model: model || DEFAULT_CONFIG.model,
        provider: provider || DEFAULT_CONFIG.provider,
        created: new Date().toISOString(),
        messages: []
      };
      const targetDir = directory || path.join(DEFAULT_CONFIG.baseDir, 'conversations');
      const filePath = path.join(targetDir, `${conversationId}.json`);
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
      await fsPromises.writeFile(filePath, JSON.stringify(conversation, null, 2));
      return conversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  });

  ipcMain.handle('openExternal', async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening external URL:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ensureDirectory', async (_, dirPath) => {
    try {
      const fullPath = expandHomeDir(dirPath);
      await fsPromises.mkdir(fullPath, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error ensuring directory:', error);
      throw error;
    }
  });

  ipcMain.handle('sendMessage', async (_, { conversationId, message, model, provider }) => {
    try {
      const filePath = path.join(DEFAULT_CONFIG.baseDir, 'conversations', `${conversationId}.json`);
      let conversation;
      try {
        const data = await fsPromises.readFile(filePath, 'utf8');
        conversation = JSON.parse(data);
      } catch (err) {
        conversation = {
          id: conversationId || Date.now().toString(),
          title: message.slice(0, 30) + '...',
          model: model || DEFAULT_CONFIG.model,
          provider: provider || DEFAULT_CONFIG.provider,
          created: new Date().toISOString(),
          messages: []
        };
      }
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      conversation.messages.push({
        role: 'assistant',
        content: `Mock response to: ${message}`,
        timestamp: new Date().toISOString()
      });
      await fsPromises.writeFile(filePath, JSON.stringify(conversation, null, 2));
      return conversation;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  });

  // App lifecycle events
// App lifecycle events

app.whenReady().then(async () => {
  globalShortcut.register('CommandOrControl+Space', () => {
      showWindow();
  });
  const dataPath = ensureUserDataDirectory();
  const backendServerPath = path.join(process.resourcesPath, 'backend_server');

  if (!fs.existsSync(backendServerPath)) {
    log('ERROR: Backend server not found at:', backendServerPath);
    log('Checking resource path contents:', fs.readdirSync(process.resourcesPath));
}

backendProcess = spawn(backendServerPath, [], {
  stdio: 'inherit',
  env: {
      ...process.env,
      CORNERIA_DATA_DIR: dataPath,
      NPC_STUDIO_PORT: '5337', // Change port if necessary
      FLASK_DEBUG: '1',
      PYTHONUNBUFFERED: '1'
  }
});


backendProcess.on('close', (code) => {
  if (code !== 0) {
      console.error('Backend server exited with code:', code);
  }
}
);

  // Register both protocols here
  protocol.registerFileProtocol('file', (request, callback) => {
    const filepath = request.url.replace('file://', '');
    try {
        return callback(decodeURIComponent(filepath));
    } catch (error) {
        console.error(error);
    }
});

  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '');
    try {
        return callback(decodeURIComponent(url));
    } catch (error) {
        console.error(error);
    }
  });

  await ensureBaseDir();
  createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (backendProcess) {
        log('Killing backend process');
        backendProcess.kill();
      }

      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    console.error(error.stack);
  });

  console.log('MAIN PROCESS SETUP COMPLETE');
}