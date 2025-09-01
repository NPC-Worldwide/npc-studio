const { app, BrowserWindow, globalShortcut,ipcMain, protocol, shell, BrowserView} = require('electron');
const { desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const pty = require('node-pty'); // <-- ADD THIS

const sqlite3 = require('sqlite3');
const dbPath = path.join(os.homedir(), 'npcsh_history.db');
const fetch = require('node-fetch');
const { dialog } = require('electron');
const crypto = require('crypto');
const sharp = require('sharp');

const logFilePath = path.join(os.homedir(), '.npc_studio', 'app.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
let mainWindow = null;
let pdfView = null; 
// Update your ensureTablesExist function:
const ensureTablesExist = async () => {
  console.log('[DB] Ensuring all tables exist...');
  
  const createHighlightsTable = `
      CREATE TABLE IF NOT EXISTS pdf_highlights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT NOT NULL,
          highlighted_text TEXT NOT NULL,
          position_json TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  `;
  
  const createBookmarksTable = `
      CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          folder_path TEXT,
          is_global BOOLEAN DEFAULT 0,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  `;
  
  const createBrowserHistoryTable = `
      CREATE TABLE IF NOT EXISTS browser_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          url TEXT NOT NULL,
          folder_path TEXT,
          visit_count INTEGER DEFAULT 1,
          last_visited DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  `;

  const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_file_path ON pdf_highlights(file_path);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_path);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_global ON bookmarks(is_global);
      CREATE INDEX IF NOT EXISTS idx_history_folder ON browser_history(folder_path);
      CREATE INDEX IF NOT EXISTS idx_history_url ON browser_history(url);
  `;

  try {
      await dbQuery(createHighlightsTable);
      await dbQuery(createBookmarksTable);
      await dbQuery(createBrowserHistoryTable);
      await dbQuery(createIndexes);
      console.log('[DB] All tables are ready.');
  } catch (error) {
      console.error('[DB] FATAL: Could not create tables.', error);
  }
};
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
const ptySessions = new Map(); // <-- ADD THIS
const ptyKillTimers = new Map();

// In main.js
const dbQuery = (query, params = []) => {
  // CORRECTED: Also treat PRAGMA as a read query
  const isReadQuery = query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA');
  console.log(`[DB] EXECUTING: ${query.substring(0, 100).replace(/\s+/g, ' ')}...`, params);

  return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
          if (err) {
              console.error('[DB] CONNECTION ERROR:', err.message);
              return reject(err);
          }
      });

      if (isReadQuery) { // Use the corrected check
          // Use .all for SELECT and PRAGMA queries to get rows back
          db.all(query, params, (err, rows) => {
              db.close();
              if (err) {
                  console.error(`[DB] READ FAILED: ${err.message}`);
                  return reject(err);
              }
              resolve(rows);
          });
      } else {
          // Use .run for INSERT, UPDATE, DELETE to get info like lastID
          db.run(query, params, function(err) {
              db.close();
              if (err) {
                  console.error(`[DB] COMMAND FAILED: ${err.message}`);
                  return reject(err);
              }
              resolve({ lastID: this.lastID, changes: this.changes });
          });
      }
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
  await ensureTablesExist(); // <<< ADD THIS LINE. IT MUST BE CALLED.

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
  const browserViews = new Map(); // Stores state: { view, bounds, visible }

  // --- 2. Update 'show-browser' handler ---
  ipcMain.handle('show-browser', (event, { url, bounds, viewId }) => {
      log(`[BROWSER VIEW] Received 'show-browser' for URL: ${url}, viewId: ${viewId}`);
      if (!mainWindow) return { success: false, error: 'Main window not found' };
  
      if (browserViews.has(viewId)) {
          const existing = browserViews.get(viewId);
          mainWindow.removeBrowserView(existing.view);
          existing.view.webContents.destroy();
      }
  
      const newBrowserView = new BrowserView({
          webPreferences: {
              nodeIntegration: true,
              contextIsolation: true,
              webSecurity: true,
          },
      });
  
      mainWindow.addBrowserView(newBrowserView);
      newBrowserView.setBounds(bounds);
      
      // Store the complete state
      browserViews.set(viewId, { view: newBrowserView, bounds, visible: true });
  

      newBrowserView.webContents.on('context-menu', (e, params) => {
        const { x, y, selectionText } = params;

        if (selectionText && selectionText.trim().length > 0) {
            log(`[BROWSER CONTEXT] Selected text found, hiding view for menu.`);
          
            // --- THIS IS THE FIX ---
            // 1. Find the view's state from our map
            if (browserViews.has(viewId)) {
                const browserState = browserViews.get(viewId);
                
                // 2. Temporarily hide the BrowserView by moving it off-screen
                browserState.view.setBounds({ x: -2000, y: -2000, width: 0, height: 0 });
                // We DON'T set `visible: false` because this is a temporary hide
                
                // 3. Tell React to show the HTML menu, passing the viewId
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('browser-show-context-menu', {
                        x,
                        y,
                        selectedText: selectionText.trim(),
                        viewId // Pass the viewId so React knows which view to restore
                    });
                }
            }
        }
    });
      
      const finalURL = url.startsWith('http') ? url : `https://${url}`;
      newBrowserView.webContents.loadURL(finalURL);
      return { success: true, viewId };
  });
  
  // --- 3. Add NEW 'browser:set-visibility' handler ---
  ipcMain.handle('browser:set-visibility', (event, { viewId, visible }) => {
      if (browserViews.has(viewId)) {
          const browserState = browserViews.get(viewId);
          if (visible) {
              log(`[BROWSER VIEW] Setting visibility to TRUE for ${viewId}`);
              browserState.view.setBounds(browserState.bounds);
              browserState.visible = true;
          } else {
              log(`[BROWSER VIEW] Setting visibility to FALSE for ${viewId}`);
              // Hide by moving it off-screen with zero size
              browserState.view.setBounds({ x: -2000, y: -2000, width: 0, height: 0 });
              browserState.visible = false;
          }
          return { success: true };
      }
      return { success: false, error: 'View not found' };
  });
  
  // --- 4. Update 'update-browser-bounds' handler ---
  ipcMain.handle('update-browser-bounds', (event, { viewId, bounds }) => {
      if (browserViews.has(viewId)) {
          const browserState = browserViews.get(viewId);
          browserState.bounds = bounds; // Always update stored bounds
          
          // Only set bounds if the view is supposed to be visible
          if (browserState.visible) {
              browserState.view.setBounds(bounds);
          }
          return { success: true };
      }
      return { success: false, error: 'Browser view not found' };
  });
  
  // --- 5. Update 'hide-browser' handler ---
  ipcMain.handle('hide-browser', (event, { viewId }) => {
      log(`[BROWSER VIEW] Received 'hide-browser' for viewId: ${viewId}`);
      if (browserViews.has(viewId) && mainWindow && !mainWindow.isDestroyed()) {
          log(`[BROWSER VIEW] Removing and destroying BrowserView for ${viewId}`);
          const browserState = browserViews.get(viewId);
          mainWindow.removeBrowserView(browserState.view);
          browserState.view.webContents.destroy();
          browserViews.delete(viewId); // Clean up the map
          return { success: true };
      }
      return { success: false, error: 'Browser view not found' };
  });
  

  
  ipcMain.handle('browser:addToHistory', async (event, { url, title, folderPath }) => {
    try {
      // Check if URL already exists in this folder
      const existing = await dbQuery(
        'SELECT id, visit_count FROM browser_history WHERE url = ? AND folder_path = ?', 
        [url, folderPath]
      );
      
      if (existing.length > 0) {
        // Update existing record
        await dbQuery(
          'UPDATE browser_history SET visit_count = visit_count + 1, last_visited = CURRENT_TIMESTAMP, title = ? WHERE id = ?',
          [title, existing[0].id]
        );
      } else {
        // Insert new record
        await dbQuery(
          'INSERT INTO browser_history (url, title, folder_path) VALUES (?, ?, ?)',
          [url, title, folderPath]
        );
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('browser:getHistory', async (event, { folderPath, limit = 50 }) => {
    try {
      const history = await dbQuery(
        'SELECT * FROM browser_history WHERE folder_path = ? ORDER BY last_visited DESC LIMIT ?',
        [folderPath, limit]
      );
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('browser:addBookmark', async (event, { url, title, folderPath, isGlobal = false }) => {
    try {
      await dbQuery(
        'INSERT INTO bookmarks (url, title, folder_path, is_global) VALUES (?, ?, ?, ?)',
        [url, title, isGlobal ? null : folderPath, isGlobal ? 1 : 0]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('browser:getBookmarks', async (event, { folderPath }) => {
    try {
      // Get both local and global bookmarks
      const bookmarks = await dbQuery(
        'SELECT * FROM bookmarks WHERE (folder_path = ? OR is_global = 1) ORDER BY is_global ASC, timestamp DESC',
        [folderPath]
      );
      return { success: true, bookmarks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('browser:deleteBookmark', async (event, { bookmarkId }) => {
    try {
      await dbQuery('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('browser:clearHistory', async (event, { folderPath }) => {
    try {
      await dbQuery('DELETE FROM browser_history WHERE folder_path = ?', [folderPath]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  
  ipcMain.handle('browser-navigate', (event, { viewId, url }) => {
    if (browserViews.has(viewId)) {
      const finalURL = url.startsWith('http') ? url : `https://${url}`;
      log(`[BROWSER VIEW] Navigating ${viewId} to: ${finalURL}`);
      browserViews.get(viewId).webContents.loadURL(finalURL);
      return { success: true };
    }
    return { success: false, error: 'Browser view not found' };
  });
  
  ipcMain.handle('browser-back', (event, { viewId }) => {
    if (browserViews.has(viewId)) {
      const webContents = browserViews.get(viewId).webContents;
      if (webContents.canGoBack()) {
        webContents.goBack();
        return { success: true };
      }
      return { success: false, error: 'Cannot go back' };
    }
    return { success: false, error: 'Browser view not found' };
  });
  
  ipcMain.handle('browser-forward', (event, { viewId }) => {
    if (browserViews.has(viewId)) {
      const webContents = browserViews.get(viewId).webContents;
      if (webContents.canGoForward()) {
        webContents.goForward();
        return { success: true };
      }
      return { success: false, error: 'Cannot go forward' };
    }
    return { success: false, error: 'Browser view not found' };
  });
  
  ipcMain.handle('browser-refresh', (event, { viewId }) => {
    if (browserViews.has(viewId)) {
      browserViews.get(viewId).webContents.reload();
      return { success: true };
    }
    return { success: false, error: 'Browser view not found' };
  });
  
  ipcMain.handle('browser-get-selected-text', (event, { viewId }) => {
    if (browserViews.has(viewId)) {
      return new Promise((resolve) => {
        browserViews.get(viewId).webContents.executeJavaScript(`
          window.getSelection().toString();
        `).then(selectedText => {
          resolve({ success: true, selectedText });
        }).catch(error => {
          resolve({ success: false, error: error.message });
        });
      });
    }
    return { success: false, error: 'Browser view not found' };
  });
  
  

function createWindow() {

    const iconPath = path.resolve(__dirname, '..', 'build', 'icons', '512x512.png');
    console.log(`[ICON DEBUG] Using direct path: ${iconPath}`);
  
    console.log('Creating window');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: iconPath,
      title: 'NPC Studio',
      name: 'npc-studio',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        webSecurity: false,
        webviewTag: true, 
        plugins: true, 
        enableRemoteModule: true,
        nodeIntegrationInSubFrames: true,
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        preload: path.join(__dirname, 'preload.js')
      }
          });
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    
    mainWindow.webContents.session.protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURI(request.url.replace('file:///', ''));
      callback(pathname);
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
      "default-src 'self' 'unsafe-inline' media: http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 file: data: blob:; " +
      "connect-src 'self' file: media: http://localhost:5173 http://localhost:5337 http://127.0.0.1:5337 blob:; " +
      "script-src 'self' 'unsafe-inline' media: 'unsafe-eval' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' media: https://cdn.jsdelivr.net ; " +
      "style-src-elem 'self' 'unsafe-inline' media: https://cdn.jsdelivr.net; " +
      "font-src 'self' data: media: https://cdn.jsdelivr.net; " +
      "frame-src 'self' file: data: blob: media: chrome-extension: ;"+
      "img-src 'self' file: data: media: http: https: blob:; " +
      "object-src 'self' file: data: blob: media: chrome-extension: 'unsafe-inline'; " +
      "worker-src 'self' blob: data:; "
  ]
        },
      });
    });
    
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      const htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
      mainWindow.loadFile(htmlPath);
    }
  
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
}
  


  ipcMain.on('submit-macro', (event, command) => {
    mainWindow.hide();
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

  ipcMain.handle('db:getHighlightsForFile', async (event, { filePath }) => {
    try {
      ensureTablesExist(); // Ensure tables exist before querying
      const rows = await dbQuery('SELECT * FROM pdf_highlights WHERE file_path = ? ORDER BY id ASC', [filePath]);
      // We need to parse the position data back into an object
      return { highlights: rows.map(r => ({ ...r, position: JSON.parse(r.position_json) })) };
    } catch (error) {
      return { error: error.message };
    }
  });
  
  ipcMain.handle('db:addPdfHighlight', async (event, { filePath, text, position }) => {
    try {
      const positionJson = JSON.stringify(position);
      await dbQuery(
        'INSERT INTO pdf_highlights (file_path, highlighted_text, position_json) VALUES (?, ?, ?)',
        [filePath, text, positionJson]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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


  
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    
    if (!result.canceled && result.filePaths.length > 0) {
      // Return file info with real paths
      return result.filePaths.map(filePath => {
        const stats = fs.statSync(filePath);
        return {
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          type: getFileType(filePath)
        };
      });
    }
    
    return [];
  });
  
  // Helper function to get MIME type - add this near the top of your main.js
  function getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }


// Add these alongside your existing ipcMain.handle calls
ipcMain.handle('ollama:checkStatus', async () => {
    log('[Main Process] Checking Ollama status via backend...');
    return await callBackendApi('http://127.0.0.1:5337/api/ollama/status');
});

ipcMain.handle('ollama:install', async () => {
    log('[Main Process] Requesting Ollama installation from backend...');
    // This could be a long-running process. The backend should handle this asynchronously.
    // The `callBackendApi` might need a timeout adjustment if it's very long.
    return await callBackendApi('http://127.0.0.1:5337/api/ollama/install', { method: 'POST' });
});

ipcMain.handle('ollama:getLocalModels', async () => {
    log('[Main Process] Fetching local Ollama models from backend...');
    return await callBackendApi('http://127.0.0.1:5337/api/ollama/models');
});

ipcMain.handle('ollama:deleteModel', async (event, { model }) => {
    log(`[Main Process] Requesting deletion of model: ${model}`);
    return await callBackendApi('http://127.0.0.1:5337/api/ollama/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
    });
});

ipcMain.handle('ollama:pullModel', async (event, { model }) => {
    log(`[Main Process] Starting pull for model: ${model}`);
    try {
        const response = await fetch('http://127.0.0.1:5337/api/ollama/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model }),
        });

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`Backend error on pull start: ${errorText}`);
        }

        const stream = response.body;
        stream.on('data', (chunk) => {
            try {
                // The backend should send newline-delimited JSON objects for progress
                const progressLines = chunk.toString().trim().split('\n');
                for (const line of progressLines) {
                    if (line) {
                      const progress = JSON.parse(line);
        
                    if (progress.status && progress.status.toLowerCase() === 'error') {
                        log(`[Ollama Pull] Received error from backend stream:`, progress.details);
                        mainWindow?.webContents.send('ollama-pull-error', progress.details || 'An unknown error occurred during download.');
                        // We can stop processing this stream now if we want, but letting it end naturally is also fine.
                    } else {
                        // It's a normal progress update
                        const frontendProgress = {
                            status: progress.status,
                            details: `${progress.digest || ''} - ${progress.total ? (progress.completed / progress.total * 100).toFixed(1) + '%' : ''}`,
                            percent: progress.total ? (progress.completed / progress.total * 100) : null
                        };
                        mainWindow?.webContents.send('ollama-pull-progress', frontendProgress);
                    }


        
                    }
                }
            } catch (e) {
                console.error('Error parsing pull progress:', e);
                // Send a generic error if parsing fails
                mainWindow?.webContents.send('ollama-pull-error', 'Failed to parse progress update.');
            }
        });

        stream.on('end', () => {
            log(`[Main Process] Pull stream for ${model} ended.`);
            mainWindow?.webContents.send('ollama-pull-complete');
        });

        stream.on('error', (err) => {
            log(`[Main Process] Pull stream for ${model} errored:`, err);
            mainWindow?.webContents.send('ollama-pull-error', err.message);
        });

        return { success: true, message: 'Pull started.' };
    } catch (err) {
        log(`[Main Process] Failed to initiate pull for ${model}:`, err);
        mainWindow?.webContents.send('ollama-pull-error', err.message);
        return { success: false, error: err.message };
    }
});
ipcMain.handle('loadProjectSettings', async (event, currentPath) => {
    try {
        const url = `http://127.0.0.1:5337/api/settings/project?path=${encodeURIComponent(currentPath)}`;
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    } catch (err) {
        console.error('Error loading project settings in main:', err);
        return { error: err.message };
    }
});

ipcMain.handle('saveProjectSettings', async (event, { path, env_vars }) => {
    try {
        const url = `http://127.0.0.1:5337/api/settings/project?path=${encodeURIComponent(path)}`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ env_vars: env_vars })
        });
        return { success: true };
    } catch (err) {
        console.error('Error saving project settings in main:', err);
        return { error: err.message };
    }
});

ipcMain.handle('saveGlobalSettings', async (event, { global_settings, global_vars }) => {
    try {
        await fetch('http://127.0.0.1:5337/api/settings/global', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                global_settings: global_settings,
                global_vars: global_vars,
            })
        });
        return { success: true };
    } catch (err) {
        console.error('Error saving global settings in main:', err);
        return { error: err.message };
    }
});

ipcMain.handle('kg:getNetworkStats', async (event, { generation }) => {
  const params = generation !== null ? `?generation=${generation}` : '';
  // Note: Ensure callBackendApi can handle GET requests without a body
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/network-stats${params}`);
});

ipcMain.handle('kg:getCooccurrenceNetwork', async (event, { generation, minCooccurrence = 2 }) => {
  const params = new URLSearchParams();
  if (generation !== null) params.append('generation', generation);
  params.append('min_cooccurrence', minCooccurrence);
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/cooccurrence?${params.toString()}`);
});

ipcMain.handle('kg:getCentralityData', async (event, { generation }) => {
  const params = generation !== null ? `?generation=${generation}` : '';
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/centrality${params}`);
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


ipcMain.handle('resizeTerminal', (event, { id, cols, rows }) => {
  const ptyProcess = ptySessions.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
      return { success: true };
    } catch (error) {
      console.error(`Failed to resize terminal ${id}:`, error);
      return { success: false, error: error.message };
    }
  } else {
    return { success: false, error: 'Session not found' };
  }
});

ipcMain.handle('read-file-buffer', async (event, filePath) => {
  try {
    console.log(`[Main Process] Reading file buffer for: ${filePath}`);
    const buffer = await fsPromises.readFile(filePath);
    return buffer;
  } catch (error) {
    throw error;
  }
});



ipcMain.handle('getAvailableImageModels', async (event, currentPath) => {
  log('[Main Process] getAvailableImageModels called for path:', currentPath);
  if (!currentPath) {
      log('Error: getAvailableImageModels called without currentPath');
      return { models: [], error: 'Current path is required to fetch image models.' };
  }
  try {
      const url = `http://127.0.0.1:5337/api/image_models?currentPath=${encodeURIComponent(currentPath)}`;
      log('Fetching image models from:', url);

      const response = await fetch(url); // No 'body' for GET request

      if (!response.ok) {
          const errorText = await response.text();
          log(`Error fetching image models: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      log('Received image models:', data.models?.length);
      return data;
  } catch (err) {
      log('Error in getAvailableImageModels handler:', err);
      return { models: [], error: err.message || 'Failed to fetch image models from backend' };
  }
});
ipcMain.handle('generate_images', async (event, { prompt, n, model, provider, attachments, baseFilename='vixynt_gen_', currentPath='~/.npcsh/images' }) => {
  log(`[Main Process] Received request to generate ${n} image(s) with prompt: "${prompt}" using model: "${model}" (${provider})`);

  if (!prompt) {
      return { error: 'Prompt cannot be empty' };
  }
  if (!model || !provider) {
      return { error: 'Image model and provider must be selected.' };
  }

  try {
      const apiUrl = 'http://127.0.0.1:5337/api/generate_images';
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            n,
            model,
            provider,
            attachments,
            baseFilename, 
            currentPath
            
          })
      
        });

      if (!response.ok) {
          const errorBody = await response.json();
          const errorMessage = errorBody.error || `HTTP error! status: ${response.status}`;
          log('Backend image generation failed:', errorMessage);
          return { error: errorMessage };
      }

      const data = await response.json();
      // The backend now returns { images: [...] } with base64 data URLs
      if (data.error) {
          return { error: data.error };
      }
      return { images: data.images };
  } catch (error) {
      log('Error generating images in main process handler:', error);
      return { error: error.message || 'Image generation failed in main process' };
  }
});


ipcMain.handle('createTerminalSession', (event, { id, cwd }) => {
  if (ptyKillTimers.has(id)) {
    console.log(`[PTY] INFO: Re-creation request for ${id} received. Cancelling pending kill timer.`);
    clearTimeout(ptyKillTimers.get(id));
    ptyKillTimers.delete(id);
    
    // If the session still exists, we don't need to do anything else. It's ready.
    if (ptySessions.has(id)) {
        console.log(`[PTY] INFO: Session ${id} already exists and is active. Re-attaching.`);
        return { success: true };
    }
  }

  console.log(`[Main Process] INFO: Received request to create session ID=${id}`);
  const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
  const args = os.platform() === 'win32' ? [] : ['-l'];
  
  try {
    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: cwd || os.homedir(),
      env: process.env
    });

    ptySessions.set(id, ptyProcess);

    ptyProcess.onData(data => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', { id, data });
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[Main Process] INFO: PTY process ${id} has exited. Code: ${exitCode}, Signal: ${signal}.`);
      ptySessions.delete(id); // Clean up the session from the map
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-closed', { id });
      }
    });

    console.log(`[Main Process] SUCCESS: Session ${id} created.`);
    return { success: true };
    
  } catch (error) {
    console.error(`[Main Process] FATAL: Failed to spawn PTY for session ${id}. Error: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('closeTerminalSession', (event, id) => {
  // --- THIS IS THE OTHER KEY ---
  // Instead of killing immediately, we set a timer.
  // This gives the app a brief moment (100ms) to cancel the kill if it was just a re-render.
  if (ptySessions.has(id)) {
    console.log(`[PTY] INFO: Received request to close session ${id}. Setting a 100ms delayed kill timer.`);
    
    // If there's already a timer, do nothing.
    if (ptyKillTimers.has(id)) return { success: true };

    const timer = setTimeout(() => {
      if (ptySessions.has(id)) {
        console.log(`[PTY] INFO: Executing delayed kill for session ${id}.`);
        ptySessions.get(id).kill();
        // The onExit handler will clean up the ptySessions map.
      }
      ptyKillTimers.delete(id); // Clean up the timer itself
    }, 100);

    ptyKillTimers.set(id, timer);
  } else {
    console.log(`[PTY] WARN: Close request for non-existent session ${id}.`);
  }
  return { success: true };
});

ipcMain.handle('writeToTerminal', (event, { id, data }) => {
  const ptyProcess = ptySessions.get(id);


  console.log(`[Frontend -> PTY] Writing to session ${id}: ${JSON.stringify(data)}`);

  if (ptyProcess) {
    ptyProcess.write(data);
    return { success: true };
  } else {

    console.error(`[PTY] ERROR: Write failed. No session found for ID: ${id}`);
    console.error(`[PTY] DEBUG: Available sessions are: [${Array.from(ptySessions.keys()).join(', ')}]`);
    return { success: false, error: 'Session not found in backend' };
  }
});



ipcMain.handle('executeShellCommand', async (event, { command, currentPath }) => {
    console.log(`[TERMINAL DEBUG] Executing command: "${command}"`);
    console.log(`[TERMINAL DEBUG] Current Path: "${currentPath}"`);

    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');

        exec(command, { 
            cwd: currentPath || process.env.HOME,
            shell: '/bin/bash'
        }, (error, stdout, stderr) => {
            console.log(`[TERMINAL DEBUG] Command Execution Result:`);
            console.log(`[TERMINAL DEBUG] STDOUT: "${stdout}"`);
            console.log(`[TERMINAL DEBUG] STDERR: "${stderr}"`);
            console.log(`[TERMINAL DEBUG] ERROR: ${error}`);

            // Convert Unix line endings to terminal-friendly format
            const normalizedStdout = stdout.replace(/\n/g, '\r\n');
            const normalizedStderr = stderr.replace(/\n/g, '\r\n');

            if (error) {
                console.error(`[TERMINAL DEBUG] Execution Error:`, error);
                resolve({ 
                    error: normalizedStderr || normalizedStdout || error.message,
                    output: normalizedStdout
                });
            } else {
                resolve({ 
                    output: normalizedStdout, 
                    error: normalizedStderr 
                });
            }
        });
    });
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
      const db = new sqlite3.Database(dbPath, (dbErr) => {
        if (dbErr) {
          console.error('[DB] Error opening database:', dbErr);
          return reject(dbErr);
        }
  
        const query = `
        SELECT
            ch.id,
            ch.message_id,
            ch.timestamp,
            ch.role,
            ch.content,
            ch.conversation_id,
            ch.directory_path,
            ch.model,
            ch.provider,
            ch.npc,
            ch.team,
            json_group_array(
                json_object(
                    'id', ma.id,
                    'name', ma.attachment_name,
                    'path', ma.file_path,
                    'type', ma.attachment_type,
                    'size', ma.attachment_size,
                    'timestamp', ma.upload_timestamp
                )
            ) FILTER (WHERE ma.id IS NOT NULL) AS attachments_json
        FROM
            conversation_history ch
        LEFT JOIN
            message_attachments ma ON ch.message_id = ma.message_id
        WHERE
            ch.conversation_id = ?
        GROUP BY
            ch.id
        ORDER BY
            ch.timestamp ASC, ch.id ASC;
      `;


      db.all(query, [conversationId], (err, rows) => {
        db.close();
        if (err) {
            return reject(err);
        }

        const messages = rows.map(row => {
            let attachments = [];
            if (row.attachments_json) {
                try {
                    const parsedAttachments = JSON.parse(row.attachments_json);
                    attachments = parsedAttachments.filter(att => att && att.id !== null);
                } catch (e) {
                    attachments = [];
                }
            }

            let content = row.content;
            if (typeof content === 'string' && content.startsWith('[')) {
                try {
                    content = JSON.parse(content);
                } catch (e) {
                    // keep as string if parse fails
                }
            }
            
            const newRow = { ...row, attachments, content };
            delete newRow.attachments_json;
            return newRow;
        });

        resolve(messages);
      });
    });
});
} );


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
    const allowedExtensions = ['.py', '.md', '.js', '.jsx', '.tsx', '.ts', 
                               '.json', '.txt', '.yaml', '.yml', '.html', '.css', 
                               '.npc', '.jinx', '.pdf', '.csv', '.sh',];
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

ipcMain.handle('create-directory', async (_, directoryPath) => {
  try {
    // fs.promises.mkdir will create the directory. It will throw an error if it already exists.
    await fsPromises.mkdir(directoryPath);
    return { success: true, error: null };
  } catch (err) {
    console.error('Error creating directory:', err);
    // Return the specific error message to the frontend
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-directory', async (_, directoryPath) => {
  try {
    await fsPromises.rm(directoryPath, { recursive: true, force: true });
    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting directory:', err);
    return { success: false, error: err.message };
  }
});

// Add this handler to get all file paths inside a folder for AI overview
ipcMain.handle('get-directory-contents-recursive', async (_, directoryPath) => {
    const allFiles = [];
    async function readDir(currentDir) {
        const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await readDir(fullPath); // Recurse into subdirectories
            } else if (entry.isFile()) {
                allFiles.push(fullPath);
            }
        }
    }
    try {
        await readDir(directoryPath);
        return { files: allFiles, error: null };
    } catch (err) {
        console.error('Error getting directory contents:', err);
        return { files: [], error: err.message };
    }
});

ipcMain.handle('renameFile', async (_, oldPath, newPath) => {
    try {
      await fsPromises.rename(oldPath, newPath);
      return { success: true, error: null };
    } catch (err) {
      console.error('Error renaming file:', err);
      return { success: false, error: err.message };
    }
  });
  let currentPdfPath = null; // <<< THIS IS THE FIX. DECLARE THE VARIABLE HERE.

