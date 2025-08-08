const { app, BrowserWindow, globalShortcut,ipcMain, protocol, shell} = require('electron');
const { desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const sqlite3 = require('sqlite3');
const dbPath = path.join(os.homedir(), 'npcsh_history.db');
const fetch = require('node-fetch');
const { dialog } = require('electron');
const crypto = require('crypto');

const logFilePath = path.join(os.homedir(), '.npc_studio', 'app.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
let mainWindow = null;
app.setAppUserModelId('com.npc_studio.chat');
app.name = 'npc-studio';
app.setName('npc-studio');
const log = (...messages) => {
    const msg = messages.join(' ');
    console.log(msg);
    logStream.write(`${msg}\n`);
};
// Use Option+Space on macOS, Command/Control+Space elsewhere
const DEFAULT_SHORTCUT = process.platform === 'darwin' ? 'Alt+Space' : 'CommandOrControl+Space';


// In main.js
const dbQuery = (query, params = []) => {
  console.log(`[DB] EXECUTING: ${query.substring(0, 100).replace(/\s+/g, ' ')}...`, params);
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('[DB] CONNECTION ERROR:', err.message);
        return reject(err);
      }
    });

    db.all(query, params, (err, rows) => {
      db.close((closeErr) => {
        if (closeErr) console.error('[DB] CLOSE ERROR:', closeErr.message);
      });
      if (err) {
        console.error(`[DB] QUERY FAILED: ${err.message}`);
        return reject(err);
      }
      console.log(`[DB] SUCCESS, Rows: ${rows.length}`);
      resolve(rows);
    });
  });
};

const DEFAULT_CONFIG = {
  baseDir: path.resolve(os.homedir(), '.npcsh'),
  stream: true,
  model: 'llama3.2',
  provider: 'ollama',
  npc: 'sibiji',
};

function generateId() {
  return crypto.randomUUID(); // Requires crypto module
}

const activeStreams = new Map();


let isCapturingScreenshot = false;

let lastScreenshotTime = 0;
const SCREENSHOT_COOLDOWN = 1000; // 1 second cooldown between screenshots

let backendProcess = null;


async function waitForServer(maxAttempts = 120, delay = 1000) {
  log('Waiting for backend server to start...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:5337/api/health');
      if (response.ok) {
        log(`Backend server is ready (attempt ${attempt}/${maxAttempts})`);
        return true;
      }
    } catch (err) {
      // Server not ready yet, will retry
      log(`Waiting for server... attempt ${attempt}/${maxAttempts}`);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  log('Backend server failed to start in the allocated time');
  return false;
}

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


app.whenReady().then(async () => {
  // Ensure user data directory exists
  const dataPath = ensureUserDataDirectory();

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

  try {
    log('Starting backend server...');
    // Use the bundled Python executable instead of 'npc serve'
    const executableName = process.platform === 'win32' ? 'npc_studio_serve.exe' : 'npc_studio_serve';
    const backendPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'backend', executableName)
      : path.join(app.getAppPath(), 'dist', 'resources', 'backend', executableName);
    
    log(`Using backend path: ${backendPath}`);
    
    // Make sure it's executable
    //if (app.isPackaged && fs.existsSync(backendPath)) {
    //  fs.chmodSync(backendPath, '755');
    //}
    
    backendProcess = spawn(backendPath, {
      stdio: 'inherit',
      env: {
        ...process.env,
        CORNERIA_DATA_DIR: dataPath,
        NPC_STUDIO_PORT: '5337',
        FLASK_DEBUG: '1',
        PYTHONUNBUFFERED: '1',  
      },
    });

    backendProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Backend server exited with code:', code);
      }
    });

    
    // Wait for server to be ready before proceeding
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('Backend server failed to start in time');
      // You might want to display an error message to the user here
    }
  } catch (err) {
    console.error('Error spawning backend server:', err);
  }

  // Ensure base directories and create the main window
  await ensureBaseDir();
  createWindow();
});

async function callBackendApi(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`API call failed to ${url}:`, err);
    // Return a consistent error object
    return { error: err.message, success: false };
  }
}
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

          console.log(bounds);
          const image = sources[0].thumbnail.crop(bounds);
          console.log(image);
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

    const iconPath = path.resolve(__dirname, '..', 'build', 'icons', '512x512.png');
    console.log(`[ICON DEBUG] Using direct path: ${iconPath}`);
  
    console.log('Creating window');
    mainWindow = new BrowserWindow({ // Remove the 'const' keyword here
      width: 1200,
      height: 800,
      icon: iconPath,
      title: 'NPC Studio',
      name: 'npc-studio',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        webSecurity: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    setTimeout(() => {
      const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
      if (fs.existsSync(iconPath)) {
        mainWindow.setIcon(iconPath);
      } else {
        console.log(`Warning: Icon file not found at ${iconPath}`);
      }
    }, 100);
  
    registerGlobalShortcut(mainWindow);



    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 https://web.squarecdn.com https://*.squarecdn.com https://*.square.site; " +
            "connect-src 'self' http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 https://web.squarecdn.com https://*.squarecdn.com https://*.square.site https://license-verification-120419531021.us-central1.run.app;" +
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
    
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    
    if (isDev) {
      // Load from Vite dev server
      mainWindow.loadURL('http://localhost:5173');
      console.log('Loading from Vite dev server: http://localhost:5173');
    } else {
      // Load from built files
      const htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
      mainWindow.loadFile(htmlPath);
      console.log(`Loading from packaged app path: ${htmlPath}`);
    }
  
    //mainWindow.webContents.openDevTools();

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
      //log('Handler: getAvailableModels called for path:', currentPath); // Use your log function
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


  





// --- Knowledge Graph Handlers ---
ipcMain.handle('kg:getGraphData', async (event, { generation }) => {
  const params = generation !== null ? `?generation=${generation}` : '';
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/graph${params}`);
});

ipcMain.handle('kg:listGenerations', async () => {
  return await callBackendApi('http://127.0.0.1:5337/api/kg/generations');
});

ipcMain.handle('kg:triggerProcess', async (event, { type }) => {
  return await callBackendApi('http://127.0.0.1:5337/api/kg/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ process_type: type }),
  });
});

ipcMain.handle('kg:rollback', async (event, { generation }) => {
  return await callBackendApi('http://127.0.0.1:5337/api/kg/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generation }),
  });
});
ipcMain.handle('interruptStream', async (event, streamIdToInterrupt) => {
  log(`[Main Process] Received request to interrupt stream: ${streamIdToInterrupt}`);
  
  try {
    const response = await fetch('http://127.0.0.1:5337/api/interrupt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ streamId: streamIdToInterrupt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend failed to acknowledge interruption: ${errorText}`);
    }

    const result = await response.json();
    log(`[Main Process] Backend response to interruption:`, result.message);
    
    // It's still good practice to destroy the client-side stream to stop processing
    // any data that might already be in the pipe.
    if (activeStreams.has(streamIdToInterrupt)) {
        const { stream } = activeStreams.get(streamIdToInterrupt);
        if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
        }
        // The 'end' and 'error' listeners on the stream will handle deleting from activeStreams.
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[Main Process] Error sending interrupt request to backend:', error);
    return { success: false, error: error.message };
  }
});

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
    if (backendProcess) {
      log('Killing backend process');
      backendProcess.kill();
    }
  
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
  ipcMain.handle('get-jinxs-global', async () => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/jinxs/global');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Global jinxs data:', data); // Log the data
        return data; // Make sure we're returning the whole response
    } catch (err) {
        console.error('Error loading global jinxs:', err);
        return { jinxs: [], error: err.message };
    }
});
ipcMain.handle('db:listTables', async () => {
  try {
    const rows = await dbQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    return { tables: rows.map(r => r.name) };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('db:getTableSchema', async (event, { tableName }) => {
  // Basic validation to prevent obvious SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return { error: 'Invalid table name provided.' };
  }
  try {
    const rows = await dbQuery(`PRAGMA table_info(${tableName});`);
    return { schema: rows.map(r => ({ name: r.name, type: r.type })) };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('db:exportCSV', async (event, data) => {
    if (!data || data.length === 0) {
        return { success: false, error: 'No data to export.'};
    }

    const { filePath } = await dialog.showSaveDialog({
        title: 'Export Query Results to CSV',
        defaultPath: `query-export-${Date.now()}.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (!filePath) {
        return { success: false, message: 'Export cancelled.' };
    }

    try {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => {
            return Object.values(row).map(value => {
                const strValue = String(value ?? '');
                // Handle commas, quotes, and newlines in values
                if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                    return `"${strValue.replace(/"/g, '""')}"`;
                }
                return strValue;
            }).join(',');
        });
        const csvContent = `${headers}\n${rows.join('\n')}`;
        fs.writeFileSync(filePath, csvContent, 'utf-8');
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-jinxs-project', async (event, currentPath) => {
  try {
      const url = `http://127.0.0.1:5337/api/jinxs/project?currentPath=${encodeURIComponent(currentPath)}`;
      console.log('Fetching project jinxs from URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Project jinxs data:', data); // Log the data
      return data; // Make sure we're returning the whole response
  } catch (err) {
      console.error('Error loading project jinxs:', err);
      return { jinxs: [], error: err.message };
  }
});
  ipcMain.handle('save-jinx', async (event, data) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/jinxs/save', {
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
        console.error('Error saving jinx:', err);
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
  // Your React code is already generating a streamId, which is perfect.
  const currentStreamId = data.streamId || generateId(); 
  log(`[Main Process] executeCommandStream: Starting stream with ID: ${currentStreamId}`);
  
  try {
    const apiUrl = 'http://127.0.0.1:5337/api/stream'; // Or /api/execute if that's the one
    
    // --- KEY CHANGE: Ensure streamId is in the payload ---
    const payload = {
      streamId: currentStreamId, // Pass the ID to the backend
      commandstr: data.commandstr,
      currentPath: data.currentPath,
      conversationId: data.conversationId,
      model: data.model,
      provider: data.provider,
      npc: data.npc,
      npcSource: data.npcSource || 'global',
      attachments: data.attachments || []
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    log(`[Main Process] Backend response status for streamId ${currentStreamId}: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}. Body: ${errorText}`);
    }

    const stream = response.body;
    if (!stream) {
      event.sender.send('stream-error', { streamId: currentStreamId, error: 'Backend returned no stream data.' });
      return { error: 'Backend returned no stream data.', streamId: currentStreamId };
    }
    
    // Keep track of the stream to manage listeners
    activeStreams.set(currentStreamId, { stream, eventSender: event.sender });
    
    // This listener setup is correct and does not need to change.
    (function(capturedStreamId) {
      stream.on('data', (chunk) => {
        if (event.sender.isDestroyed()) {
          stream.destroy();
          activeStreams.delete(capturedStreamId);
          return;
        }
        event.sender.send('stream-data', {
          streamId: capturedStreamId,
          chunk: chunk.toString()
        });
      });

      stream.on('end', () => {
        log(`[Main Process] Stream ${capturedStreamId} ended from backend.`);
        if (!event.sender.isDestroyed()) {
          event.sender.send('stream-complete', { streamId: capturedStreamId });
        }
        activeStreams.delete(capturedStreamId);
      });

      stream.on('error', (err) => {
        log(`[Main Process] Stream ${capturedStreamId} error:`, err.message);
        if (!event.sender.isDestroyed()) {
            event.sender.send('stream-error', {
              streamId: capturedStreamId,
              error: err.message
            });
        }
        activeStreams.delete(capturedStreamId);
      });
    })(currentStreamId);

    return { streamId: currentStreamId };

  } catch (err) {
    log(`[Main Process] Error setting up stream ${currentStreamId}:`, err.message);
    if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('stream-error', {
          streamId: currentStreamId,
          error: `Failed to set up stream: ${err.message}`
        });
    }
    return { error: `Failed to set up stream: ${err.message}`, streamId: currentStreamId };
  }
});


ipcMain.handle('get-attachment', async (event, attachmentId) => {
  const response = await fetch(`http://127.0.0.1:5337/api/attachment/${attachmentId}`);
  return response.json();
});

ipcMain.handle('get-message-attachments', async (event, messageId) => {
  const response = await fetch(`http://127.0.0.1:5337/api/attachments/${messageId}`);
  return response.json();
});


ipcMain.handle('get-usage-stats', async () => {
  console.log('[IPC] get-usage-stats handler STARTED');
  try {
    const conversationQuery = `SELECT COUNT(DISTINCT conversation_id) as total FROM conversation_history;`;
    const messagesQuery = `SELECT COUNT(*) as total FROM conversation_history WHERE role = 'user' OR role = 'assistant';`;
    const modelsQuery = `SELECT model, COUNT(*) as count FROM conversation_history WHERE model IS NOT NULL AND model != '' GROUP BY model ORDER BY count DESC LIMIT 5;`;
    const npcsQuery = `SELECT npc, COUNT(*) as count FROM conversation_history WHERE npc IS NOT NULL AND npc != '' GROUP BY npc ORDER BY count DESC LIMIT 5;`;

    const [convResult] = await dbQuery(conversationQuery);
    const [msgResult] = await dbQuery(messagesQuery);
    const topModels = await dbQuery(modelsQuery);
    const topNPCs = await dbQuery(npcsQuery);

    console.log('[IPC] get-usage-stats returning:', {
      totalConversations: convResult?.total || 0,
      totalMessages: msgResult?.total || 0,
      topModels,
      topNPCs
    });

    return {
      stats: {
        totalConversations: convResult?.total || 0,
        totalMessages: msgResult?.total || 0,
        topModels,
        topNPCs
      },
      error: null
    };
  } catch (err) {
    console.error('[IPC] get-usage-stats ERROR:', err);
    return { stats: null, error: err.message };
  }
});
ipcMain.handle('getActivityData', async (event, { period }) => {
  try {
    let dateModifier = '-30 days';
    if (period === '7d') dateModifier = '-7 days';
    if (period === '90d') dateModifier = '-90 days';

    const query = `
      SELECT 
        strftime('%Y-%m-%d', timestamp) as date, 
        COUNT(*) as count
      FROM conversation_history
      WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', ?)
      GROUP BY date
      ORDER BY date ASC;
    `;
    
    const rows = await dbQuery(query, [dateModifier]);
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
});

ipcMain.handle('getHistogramData', async () => {
  try {
    const query = `
      SELECT 
        CASE
          WHEN LENGTH(content) BETWEEN 0 AND 50 THEN '0-50'
          WHEN LENGTH(content) BETWEEN 51 AND 200 THEN '51-200'
          WHEN LENGTH(content) BETWEEN 201 AND 500 THEN '201-500'
          WHEN LENGTH(content) BETWEEN 501 AND 1000 THEN '501-1000'
          ELSE '1000+'
        END as bin,
        COUNT(*) as count
      FROM conversation_history
      WHERE role = 'user' OR role = 'assistant'
      GROUP BY bin
      ORDER BY MIN(LENGTH(content));
    `;
    const rows = await dbQuery(query);
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
});

ipcMain.handle('executeSQL', async (event, { query }) => {
  try {
    const rows = await dbQuery(query);
    return { result: rows, error: null };
  } catch (err) {
    return { result: null, error: err.message };
  }
});
ipcMain.handle('executeCommand', async (event, data) => {
    const currentStreamId = generateId();
    log(`[Main Process] executeCommand: Starting. streamId: ${currentStreamId}`);

    try {
        const apiUrl = 'http://127.0.0.1:5337/api/execute';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commandstr: data.commandstr,
                currentPath: data.currentPath,
                conversationId: data.conversationId,
                model: data.model,
                provider: data.provider,
                npc: data.npc,
                npcSource: data.npcSource || 'global',
                attachments: data.attachments || []
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}. Body: ${errorText}`);
        }

        const stream = response.body;
        if (!stream) {
            throw new Error('Backend returned no stream data.');
        }

        // Match the working stream pattern
        activeStreams.set(currentStreamId, { stream, eventSender: event.sender });

        stream.on('data', (chunk) => {
            if (event.sender.isDestroyed()) {
                stream.destroy();
                activeStreams.delete(currentStreamId);
                return;
            }
            event.sender.send('stream-data', {
                streamId: currentStreamId,
                chunk: chunk.toString()
            });
        });

        stream.on('end', () => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('stream-complete', { streamId: currentStreamId });
            }
            activeStreams.delete(currentStreamId);
        });

        stream.on('error', (err) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('stream-error', {
                    streamId: currentStreamId,
                    error: err.message
                });
            }
            activeStreams.delete(currentStreamId);
        });

        return { streamId: currentStreamId };

    } catch (err) {
        if (event.sender && !event.sender.isDestroyed()) {
            event.sender.send('stream-error', {
                streamId: currentStreamId,
                error: err.message
            });
        }
        return { error: err.message, streamId: currentStreamId };
    }
});
ipcMain.handle('getConversations', async (_, path) => {
    try {
      //console.log('Handler: getConversations called for path:', path);
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
      //console.log('Raw API response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Error parsing JSON response:', err);
        return { conversations: [], error: 'Invalid JSON response' };
      }

      //console.log('Parsed conversations data from API:', data);

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
          //console.log('Handler: getConversationMessages called for:', rows);
        }
      });
    });
  });

  ipcMain.handle('getDefaultConfig', () => {
    //console.log('Handler: getDefaultConfig called');
    console.log('CONFIG:', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;

  });

  ipcMain.handle('getWorkingDirectory', () => {
    //console.log('Handler: getWorkingDirectory called');
    return DEFAULT_CONFIG.baseDir;
  });

  ipcMain.handle('setWorkingDirectory', async (_, dir) => {
    //console.log('Handler: setWorkingDirectory called with:', dir);
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
    const allowedExtensions = ['.py', '.md', '.js', '.jsx', '.tsx', '.ts', '.json', '.txt', '.yaml', '.yml', '.html', '.css', '.npc', '.jinx'];
    //console.log(`[Main Process] readDirectoryStructure called for: ${dirPath}`); // LOG 1

    try {
      await fsPromises.access(dirPath, fs.constants.R_OK);
      const items = await fsPromises.readdir(dirPath, { withFileTypes: true });
      //console.log(`[Main Process] Read ${items.length} items from ${dirPath}`); // LOG 2

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          structure[item.name] = { type: 'directory', path: itemPath };
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (allowedExtensions.includes(ext)) {
            //console.log(`[Main Process] Found allowed file: ${item.name}`); // LOG 3
            structure[item.name] = { type: 'file', path: itemPath };
          }
        }
      }
      //console.log(`[Main Process] Returning structure for ${dirPath}:`, JSON.stringify(structure, null, 2)); // LOG 4 (Critical: See the final structure)
      return structure;

    } catch (err) {
      console.error(`[Main Process] Error in readDirectoryStructure for ${dirPath}:`, err); // LOG 5
      if (err.code === 'ENOENT') return { error: 'Directory not found' };
      if (err.code === 'EACCES') return { error: 'Permission denied' };
      return { error: err.message || 'Failed to read directory contents' };
    }
  });


  ipcMain.handle('goUpDirectory', async (_, currentPath) => {
    //console.log('goUpDirectory called with:', currentPath);
    if (!currentPath) {
      console.log('No current path, returning base dir');
      return DEFAULT_CONFIG.baseDir;
    }
    const parentPath = path.dirname(currentPath);
    console.log('Parent path:', parentPath);
    return parentPath;
  });

  ipcMain.handle('readDirectory', async (_, dir) => {
    //console.log('Handler: readDirectory called for:', dir);
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
ipcMain.handle('get-global-context', async () => {
  return await callBackendApi('http://127.0.0.1:5337/api/context/global');
});

ipcMain.handle('save-global-context', async (event, contextData) => {
  return await callBackendApi('http://127.0.0.1:5337/api/context/global', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: contextData }),
  });
});
ipcMain.handle('get-last-used-in-directory', async (event, path) => {
  if (!path) return { model: null, npc: null, error: 'Path is required' };
  const url = `http://127.0.0.1:5337/api/last_used_in_directory?path=${encodeURIComponent(path)}`;
  return await callBackendApi(url);
});

ipcMain.handle('get-last-used-in-conversation', async (event, conversationId) => {
  if (!conversationId) return { model: null, npc: null, error: 'Conversation ID is required' };
  const url = `http://127.0.0.1:5337/api/last_used_in_conversation?conversationId=${encodeURIComponent(conversationId)}`;
  return await callBackendApi(url);
});
ipcMain.handle('get-project-context', async (event, path) => {
  if (!path) return { error: 'Path is required' };
  const url = `http://127.0.0.1:5337/api/context/project?path=${encodeURIComponent(path)}`;
  return await callBackendApi(url);
});

ipcMain.handle('save-project-context', async (event, { path, contextData }) => {
  if (!path) return { error: 'Path is required' };
  const url = `http://127.0.0.1:5337/api/context/project`;
  return await callBackendApi(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, context: contextData }),
  });
});

// Add file rename functionality
  ipcMain.handle('renameFile', async (_, oldPath, newPath) => {
    try {
      await fsPromises.rename(oldPath, newPath);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error renaming file:', err);
      return { success: false, error: err.message };
    }
  });