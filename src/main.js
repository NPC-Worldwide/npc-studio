const { app, BrowserWindow, globalShortcut,ipcMain, protocol, shell, BrowserView} = require('electron');
const { desktopCapturer } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
const fsPromises = require('fs/promises');
const os = require('os');
let pty;
try {
  pty = require('node-pty');
} catch (error) {
  pty = null;
}

const cron = require('node-cron');


const cronJobs = new Map();  // id => {id, schedule, command, npc, jinx, task}
const daemons = new Map();   // id => {id, name, command, npc, jinx, process}



const sqlite3 = require('sqlite3');
const dbPath = path.join(os.homedir(), 'npcsh_history.db');
const fetch = require('node-fetch');
const { dialog } = require('electron');
const crypto = require('crypto');

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
          annotation TEXT DEFAULT '', -- <--- CRITICAL FIX: ADDED ANNOTATION COLUMN
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
          pane_id TEXT,
          navigation_type TEXT DEFAULT 'click',
          visit_count INTEGER DEFAULT 1,
          last_visited DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  `;

  const createBrowserNavigationsTable = `
      CREATE TABLE IF NOT EXISTS browser_navigations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pane_id TEXT NOT NULL,
          from_url TEXT,
          to_url TEXT NOT NULL,
          navigation_type TEXT DEFAULT 'click',
          folder_path TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
  `;

  const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_file_path ON pdf_highlights(file_path);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_path);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_global ON bookmarks(is_global);
      CREATE INDEX IF NOT EXISTS idx_history_folder ON browser_history(folder_path);
      CREATE INDEX IF NOT EXISTS idx_history_url ON browser_history(url);
      CREATE INDEX IF NOT EXISTS idx_history_pane ON browser_history(pane_id);
      CREATE INDEX IF NOT EXISTS idx_navigations_pane ON browser_navigations(pane_id);
      CREATE INDEX IF NOT EXISTS idx_navigations_folder ON browser_navigations(folder_path);
  `;

  try {
      await dbQuery(createHighlightsTable);
      await dbQuery(createBookmarksTable);
      await dbQuery(createBrowserHistoryTable);
      await dbQuery(createBrowserNavigationsTable);
      await dbQuery(createIndexes);

      // Migration: Add new columns to existing browser_history table if they don't exist
      try {
          await dbQuery('ALTER TABLE browser_history ADD COLUMN pane_id TEXT');
          console.log('[DB] Added pane_id column to browser_history');
      } catch (e) {
          // Column already exists, ignore
      }
      try {
          await dbQuery("ALTER TABLE browser_history ADD COLUMN navigation_type TEXT DEFAULT 'click'");
          console.log('[DB] Added navigation_type column to browser_history');
      } catch (e) {
          // Column already exists, ignore
      }

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
const ptySessions = new Map();
const ptyKillTimers = new Map();

// In main.js
const dbQuery = (query, params = []) => {
 
  const isReadQuery = query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA');
  console.log(`[DB] EXECUTING: ${query.substring(0, 100).replace(/\s+/g, ' ')}...`, params);

  return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
          if (err) {
              console.error('[DB] CONNECTION ERROR:', err.message);
              return reject(err);
          }
      });

      if (isReadQuery) {
         
          db.all(query, params, (err, rows) => {
              db.close();
              if (err) {
                  console.error(`[DB] READ FAILED: ${err.message}`);
                  return reject(err);
              }
              resolve(rows);
          });
      } else {
         
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
  return crypto.randomUUID();
}

const activeStreams = new Map();


let isCapturingScreenshot = false;

let lastScreenshotTime = 0;
const SCREENSHOT_COOLDOWN = 1000;

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
     
      log(`Waiting for server... attempt ${attempt}/${maxAttempts}`);
    }
    
   
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  log('Backend server failed to start in the allocated time');
  return false;
}
function scheduleCronJob(job) {
  if (job.task) job.task.stop();
  job.task = cron.schedule(job.schedule, () => {
    // Here you can execute the command, maybe via npc/jinx logic or shell exec
    console.log(`Executing cron job ${job.id}: ${job.command}`);
    // Example: spawn a shell command
    const child = spawn(job.command, { shell: true });
    child.stdout.on('data', data => console.log(`Cron job output: ${data}`));
    child.stderr.on('data', data => console.error(`Cron job error: ${data}`));
  }, { scheduled: true });
  return job.task;
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
 
  const dataPath = ensureUserDataDirectory();
  await ensureTablesExist();

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
   
    const executableName = process.platform === 'win32' ? 'npc_studio_serve.exe' : 'npc_studio_serve';
    const backendPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'backend', executableName)
      : path.join(app.getAppPath(), 'dist', 'resources', 'backend', executableName);
    
    log(`Using backend path: ${backendPath}`);
    
   
   
   
   
    
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

    
   
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('Backend server failed to start in time');
     
    }
  } catch (err) {
    console.error('Error spawning backend server:', err);
  }

 
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

   
    const macroSuccess = globalShortcut.register(shortcut, () => {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send('show-macro-input');
    });
    console.log('Macro shortcut registered:', macroSuccess);
    
    const screenshotSuccess = globalShortcut.register('Ctrl+Alt+4', async () => {
      const now = Date.now();
      if (isCapturingScreenshot || (now - lastScreenshotTime) < SCREENSHOT_COOLDOWN) {
        console.log('Screenshot capture blocked - too soon or already capturing');
        return;
      }

      isCapturingScreenshot = true;
      lastScreenshotTime = now;

      console.log('Screenshot shortcut triggered (Ctrl+Alt+4)');
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();
      const primaryDisplay = displays[0];
      const scaleFactor = primaryDisplay.scaleFactor;

      // First capture the full screen
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: {
            width: primaryDisplay.bounds.width * scaleFactor,
            height: primaryDisplay.bounds.height * scaleFactor
          }
        });

        if (!sources || sources.length === 0) {
          console.error('No screen sources found');
          isCapturingScreenshot = false;
          return;
        }

        const fullScreenImage = sources[0].thumbnail;
        const fullScreenDataUrl = fullScreenImage.toDataURL();

        // Create transparent selection overlay window
        const selectionWindow = new BrowserWindow({
          x: primaryDisplay.bounds.x,
          y: primaryDisplay.bounds.y,
          width: primaryDisplay.bounds.width,
          height: primaryDisplay.bounds.height,
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          resizable: false,
          movable: false,
          hasShadow: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
          }
        });
        selectionWindow.setIgnoreMouseEvents(false);
        selectionWindow.setVisibleOnAllWorkspaces(true);

        const handleScreenshot = async (event, bounds) => {
          try {
            // Crop the already-captured full screen image
            const cropBounds = {
              x: Math.round(bounds.x * scaleFactor),
              y: Math.round(bounds.y * scaleFactor),
              width: Math.round(bounds.width * scaleFactor),
              height: Math.round(bounds.height * scaleFactor)
            };

            const croppedImage = fullScreenImage.crop(cropBounds);
            const screenshotsDir = path.join(DEFAULT_CONFIG.baseDir, 'screenshots');

            // Ensure screenshots directory exists
            if (!fs.existsSync(screenshotsDir)) {
              fs.mkdirSync(screenshotsDir, { recursive: true });
            }

            const screenshotPath = path.join(screenshotsDir, `screenshot-${Date.now()}.png`);
            fs.writeFileSync(screenshotPath, croppedImage.toPNG());

            console.log('Screenshot saved to:', screenshotPath);
            win.webContents.send('screenshot-captured', screenshotPath);

          } catch (error) {
            console.error('Screenshot crop/save failed:', error);
          } finally {
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

        // Load selection HTML - minimal transparent overlay, no background image flash
        const selectionHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                overflow: hidden;
                cursor: crosshair;
                user-select: none;
                background: transparent;
              }
              #overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.15);
              }
              #selection {
                position: fixed;
                border: 2px dashed #00aaff;
                background: rgba(0, 170, 255, 0.1);
                display: none;
                pointer-events: none;
              }
              #dimensions {
                position: fixed;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-family: system-ui, sans-serif;
                font-size: 12px;
                display: none;
                pointer-events: none;
              }
            </style>
          </head>
          <body>
            <div id="overlay"></div>
            <div id="selection"></div>
            <div id="dimensions"></div>
            <script>
              const { ipcRenderer } = require('electron');

              let startX, startY, isSelecting = false;
              const selection = document.getElementById('selection');
              const dimensions = document.getElementById('dimensions');

              document.addEventListener('mousedown', (e) => {
                startX = e.clientX;
                startY = e.clientY;
                isSelecting = true;
                selection.style.display = 'block';
                dimensions.style.display = 'block';
                selection.style.left = startX + 'px';
                selection.style.top = startY + 'px';
                selection.style.width = '0px';
                selection.style.height = '0px';
              });

              document.addEventListener('mousemove', (e) => {
                if (!isSelecting) return;

                const currentX = e.clientX;
                const currentY = e.clientY;

                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);

                selection.style.left = left + 'px';
                selection.style.top = top + 'px';
                selection.style.width = width + 'px';
                selection.style.height = height + 'px';

                dimensions.style.left = (left + width + 5) + 'px';
                dimensions.style.top = (top + height + 5) + 'px';
                dimensions.textContent = width + ' x ' + height;
              });

              document.addEventListener('mouseup', (e) => {
                if (!isSelecting) return;
                isSelecting = false;

                const rect = selection.getBoundingClientRect();
                if (rect.width > 5 && rect.height > 5) {
                  ipcRenderer.send('selection-complete', {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                  });
                } else {
                  ipcRenderer.send('selection-cancel');
                }
              });

              document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                  ipcRenderer.send('selection-cancel');
                }
              });
            </script>
          </body>
          </html>
        `;

        selectionWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(selectionHtml));

      } catch (error) {
        console.error('Screenshot capture failed:', error);
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

   
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

   
    mainWindow.setPosition(
      Math.round(width / 2 - 600),
      Math.round(height / 2 - 400) 
    );

    mainWindow.show();
    mainWindow.focus();

   
    mainWindow.webContents.send('show-macro-input');
  }

  
 

const browserViews = new Map();

 

  

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
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:5337;",
        
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://js.stripe.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com; " +
        "style-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com; " +
        "img-src 'self' data: file: media: blob: http: https:; " +
        "font-src 'self' data: https://cdn.jsdelivr.net; " +
        "connect-src 'self' file: media: http://localhost:6337 http://localhost:5337 http://127.0.0.1:5337 blob: ws: wss: https://; " +
        "frame-src 'self' file: data: blob: media: chrome-extension: https://js.stripe.com https://m.stripe.network https://checkout.stripe.com; " +
        "object-src 'self' file: data: blob: media: chrome-extension:; " +
        "worker-src 'self' blob: data:; " +
        "media-src 'self' data: file: blob: http: https:;"

          ]
        },
      });
    });
    
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    
    if (isDev) {
      mainWindow.loadURL('http://localhost:6337');
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

// Add these handlers near your other ipcMain.handle calls

ipcMain.handle('getAvailableJinxs', async (event, { currentPath, npc }) => {
  try {
      const params = new URLSearchParams();
      if (currentPath) params.append('currentPath', currentPath);
      if (npc) params.append('npc', npc);
      
      const url = `http://127.0.0.1:5337/api/jinxs/available?${params.toString()}`;
      log('Fetching available jinxs from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      log('Received jinxs:', data.jinxs?.length);
      return data;
  } catch (err) {
      log('Error in getAvailableJinxs handler:', err);
      return { jinxs: [], error: err.message };
  }
});

ipcMain.handle('executeJinx', async (event, data) => {
  const currentStreamId = data.streamId || generateId();
  log(`[Main Process] executeJinx: Starting stream with ID: ${currentStreamId}`);
  
  try {
      const apiUrl = 'http://127.0.0.1:5337/api/jinx/execute';
      
      const payload = {
          streamId: currentStreamId,
          jinxName: data.jinxName,
          jinxArgs: data.jinxArgs || [],
          currentPath: data.currentPath,
          conversationId: data.conversationId,
          model: data.model,
          provider: data.provider,
          npc: data.npc,
          npcSource: data.npcSource || 'global',
      };
      
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      log(`[Main Process] Backend response status for jinx ${data.jinxName}: ${response.status}`);
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! Status: ${response.status}. Body: ${errorText}`);
      }

      const stream = response.body;
      if (!stream) {
          event.sender.send('stream-error', { 
              streamId: currentStreamId, 
              error: 'Backend returned no stream data for jinx execution.' 
          });
          return { error: 'Backend returned no stream data.', streamId: currentStreamId };
      }
      
      activeStreams.set(currentStreamId, { stream, eventSender: event.sender });
      
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
              log(`[Main Process] Jinx stream ${capturedStreamId} ended.`);
              if (!event.sender.isDestroyed()) {
                  event.sender.send('stream-complete', { streamId: capturedStreamId });
              }
              activeStreams.delete(capturedStreamId);
          });

          stream.on('error', (err) => {
              log(`[Main Process] Jinx stream ${capturedStreamId} error:`, err.message);
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
      log(`[Main Process] Error setting up jinx stream ${currentStreamId}:`, err.message);
      if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('stream-error', {
              streamId: currentStreamId,
              error: `Failed to execute jinx: ${err.message}`
          });
      }
      return { error: `Failed to execute jinx: ${err.message}`, streamId: currentStreamId };
  }
});

    ipcMain.handle('getAvailableModels', async (event, currentPath) => {
     
      if (!currentPath) {
          log('Error: getAvailableModels called without currentPath');
          return { models: [], error: 'Current path is required to fetch models.' };
      }
      try {
          const url = `http://127.0.0.1:5337/api/models?currentPath=${encodeURIComponent(currentPath)}`;
          log('Fetching models from:', url);

          const response = await fetch(url);

          if (!response.ok) {
              const errorText = await response.text();
              log(`Error fetching models: ${response.status} ${response.statusText} - ${errorText}`);
              throw new Error(`HTTP error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          log('Received models:', data.models?.length);
          return data;

      } catch (err) {
          log('Error in getAvailableModels handler:', err);
         
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


ipcMain.handle('getCronDaemons', () => {
  return {
    cronJobs: Array.from(cronJobs.values()).map(({task, ...rest}) => rest),
    daemons: Array.from(daemons.values()).map(({process, ...rest}) => rest)
  };
});

ipcMain.handle('addCronJob', (event, { path, schedule, command, npc, jinx }) => {
  const id = generateId();
  const job = { id, path, schedule, command, npc, jinx, task: null };
  scheduleCronJob(job);
  cronJobs.set(id, job);
  return { success: true, id };
});

ipcMain.handle('removeCronJob', (event, id) => {
  if (cronJobs.has(id)) {
    const job = cronJobs.get(id);
    if (job.task) job.task.stop();
    cronJobs.delete(id);
    return { success: true };
  } else {
    return { success: false, error: 'Cron job not found' };
  }
});
ipcMain.handle('deleteMessage', async (_, { conversationId, messageId }) => {
  try {
    const db = new sqlite3.Database(dbPath);
    
    // Delete by message_id column (which is what the backend actually uses)
    const deleteMessageQuery = `
      DELETE FROM conversation_history 
      WHERE conversation_id = ? 
      AND message_id = ?
    `;
    
    let rowsAffected = 0;
    await new Promise((resolve, reject) => {
      db.run(deleteMessageQuery, [conversationId, messageId], function(err) {
        if (err) {
          reject(err);
        } else {
          rowsAffected = this.changes;
          log(`[DB] Deleted message ${messageId} from conversation ${conversationId}. Rows affected: ${this.changes}`);
          resolve();
        }
      });
    });
    
    // Also delete associated attachments
    if (rowsAffected > 0) {
      const deleteAttachmentsQuery = 'DELETE FROM message_attachments WHERE message_id = ?';
      await new Promise((resolve) => {
        db.run(deleteAttachmentsQuery, [messageId], function(err) {
          if (err) {
            log(`[DB] Warning: Failed to delete attachments for message ${messageId}:`, err.message);
          }
          resolve();
        });
      });
    }
    
    db.close();
    
    return { success: rowsAffected > 0, rowsAffected };
  } catch (err) {
    console.error('Error deleting message:', err);
    return { success: false, error: err.message, rowsAffected: 0 };
  }
});
ipcMain.handle('addDaemon', (event, { path, name, command, npc, jinx }) => {
  const id = generateId();

  try {
    // Spawn daemon process, e.g., continuous process for your NPC jinxs or commands
    const proc = spawn(command, {
      shell: true,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    proc.unref();

    proc.stdout.on('data', data => {
      console.log(`[Daemon ${name} stdout]: ${data.toString()}`);
    });
    proc.stderr.on('data', data => {
      console.error(`[Daemon ${name} stderr]: ${data.toString()}`);
    });
    proc.on('exit', (code, signal) => {
      console.log(`[Daemon ${name}] exited with code ${code}, signal ${signal}`);
      // You may want to remove or restart
    });

    daemons.set(id, { id, path, name, command, npc, jinx, process: proc });
    return { success: true, id };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('removeDaemon', (event, id) => {
  if (daemons.has(id)) {
    const daemon = daemons.get(id);
    if (daemon.process) {
      daemon.process.kill();
    }
    daemons.delete(id);
    return { success: true };
  }
  return { success: false, error: 'Daemon not found' };
});


  ipcMain.handle('update-shortcut', (event, newShortcut) => {
    const rcPath = path.join(os.homedir(), '.npcshrc');
    try {
      let rcContent = '';
      if (fsPromises.existsSync(rcPath)) {
        rcContent = fsPromises.readFileSync(rcPath, 'utf8');
       
        if (rcContent.includes('CHAT_SHORTCUT=')) {
          rcContent = rcContent.replace(/CHAT_SHORTCUT=["']?[^"'\n]+["']?/, `CHAT_SHORTCUT="${newShortcut}"`);
        } else {
         
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

ipcMain.handle('open-file', async (_event, filePath) => {
  const { shell } = require('electron');
  try {
    await shell.openPath(filePath);
    return true;
  } catch (err) {
    return { error: err.message };
  }
});

  
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    
    if (!result.canceled && result.filePaths.length > 0) {
     
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
               
                const progressLines = chunk.toString().trim().split('\n');
                for (const line of progressLines) {
                    if (line) {
                      const progress = JSON.parse(line);
        
                    if (progress.status && progress.status.toLowerCase() === 'error') {
                        log(`[Ollama Pull] Received error from backend stream:`, progress.details);
                        mainWindow?.webContents.send('ollama-pull-error', progress.details || 'An unknown error occurred during download.');
                       
                    } else {
                       
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
ipcMain.handle('generative-fill', async (event, params) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/generative_fill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Generative fill failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Generative fill error:', error);
        return { error: error.message };
    }
});
ipcMain.handle('browser-get-page-content', async (event, { viewId }) => {
    if (browserViews.has(viewId)) {
        const browserState = browserViews.get(viewId);
        try {
            // Extract text content from the page
            const pageContent = await browserState.view.webContents.executeJavaScript(`
                (function() {
                    // Get main content, skip nav/footer/ads
                    const main = document.querySelector('main, article, .content, #content') || document.body;
                    
                    // Remove script, style, nav, footer elements
                    const clone = main.cloneNode(true);
                    clone.querySelectorAll('script, style, nav, footer, aside, .nav, .footer, .ads').forEach(el => el.remove());
                    
                    // Get text content
                    let text = clone.innerText || clone.textContent;
                    
                    // Clean up whitespace
                    text = text.replace(/\\s+/g, ' ').trim();
                    
                    // Limit to ~4000 chars to avoid token limits
                    return text.substring(0, 4000);
                })();
            `);
            
            return { 
                success: true, 
                content: pageContent,
                url: browserState.view.webContents.getURL(),
                title: browserState.view.webContents.getTitle()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: 'Browser view not found' };
});
ipcMain.handle('gitStatus', async (event, repoPath) => {
  log(`[Git] Getting status for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const status = await git.status();

    const allChangedFiles = status.files.map(f => {
      let fileStatus = '';
      let isStaged = false;
      let isUntracked = false;

      // Determine the primary status for display
      if (f.index === 'M') {
        fileStatus = 'Staged Modified'; // Modified in index
        isStaged = true;
      } else if (f.index === 'A') {
        fileStatus = 'Staged Added'; // Added to index
        isStaged = true;
      } else if (f.index === 'D') {
        fileStatus = 'Staged Deleted'; // Deleted from index
        isStaged = true;
      } else if (f.working_dir === 'M') {
        fileStatus = 'Modified'; // Modified in working directory, not staged
      } else if (f.working_dir === 'D') {
        fileStatus = 'Deleted'; // Deleted in working directory, not staged
      } else if (f.index === '??') {
        fileStatus = 'Untracked'; // Untracked file
        isUntracked = true;
      } else {
        fileStatus = 'Unknown Change'; // Fallback for any other types
      }

      return {
        path: f.path,
        status: fileStatus,
        isStaged: isStaged,
        isUntracked: isUntracked,
      };
    });

    return {
      success: true,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      // Filter based on the new structured 'allChangedFiles'
      staged: allChangedFiles.filter(f => f.isStaged),
      unstaged: allChangedFiles.filter(f => !f.isStaged && !f.isUntracked),
      untracked: allChangedFiles.filter(f => f.isUntracked),
      hasChanges: allChangedFiles.length > 0
    };
  } catch (err) {
    console.error(`[Git] Error getting status for ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gitStageFile', async (event, repoPath, file) => {
  log(`[Git] Staging file: ${file} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    await git.add(file);
    return { success: true };
  } catch (err) {
    console.error(`[Git] Error staging file ${file} in ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gitUnstageFile', async (event, repoPath, file) => {
  log(`[Git] Unstaging file: ${file} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    await git.reset([file]); // 'git reset <file>' unstages it
    return { success: true };
  } catch (err) {
    console.error(`[Git] Error unstaging file ${file} in ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gitCommit', async (event, repoPath, message) => {
  log(`[Git] Committing with message: "${message}" in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const commitResult = await git.commit(message);
    return { success: true, commit: commitResult.commit };
  } catch (err) {
    console.error(`[Git] Error committing in ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gitPull', async (event, repoPath) => {
  log(`[Git] Pulling changes for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const pullResult = await git.pull();
    return { success: true, summary: pullResult };
  } catch (err) {
    console.error(`[Git] Error pulling in ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('gitPush', async (event, repoPath) => {
  log(`[Git] Pushing changes for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const pushResult = await git.push();
    return { success: true, summary: pushResult };
  } catch (err) {
    console.error(`[Git] Error pushing in ${repoPath}:`, err);
    return { success: false, error: err.message };
  }
});

// Git diff for a file
ipcMain.handle('gitDiff', async (event, repoPath, filePath, staged = false) => {
  log(`[Git] Getting diff for: ${filePath} in ${repoPath} (staged: ${staged})`);
  try {
    const git = simpleGit(repoPath);
    let diff;
    if (staged) {
      diff = await git.diff(['--cached', '--', filePath]);
    } else if (filePath) {
      diff = await git.diff(['--', filePath]);
    } else {
      diff = await git.diff();
    }
    return { success: true, diff };
  } catch (err) {
    console.error(`[Git] Error getting diff:`, err);
    return { success: false, error: err.message };
  }
});

// Git diff for all changes
ipcMain.handle('gitDiffAll', async (event, repoPath) => {
  log(`[Git] Getting all diffs for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const stagedDiff = await git.diff(['--cached']);
    const unstagedDiff = await git.diff();
    return { success: true, staged: stagedDiff, unstaged: unstagedDiff };
  } catch (err) {
    console.error(`[Git] Error getting diffs:`, err);
    return { success: false, error: err.message };
  }
});

// Git blame for a file
ipcMain.handle('gitBlame', async (event, repoPath, filePath) => {
  log(`[Git] Getting blame for: ${filePath} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    // Use raw to get blame output
    const blameOutput = await git.raw(['blame', '--line-porcelain', filePath]);

    // Parse the porcelain output
    const lines = blameOutput.split('\n');
    const blameData = [];
    let currentEntry = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^[0-9a-f]{40}/)) {
        if (currentEntry.hash) {
          blameData.push(currentEntry);
        }
        const parts = line.split(' ');
        currentEntry = {
          hash: parts[0],
          originalLine: parseInt(parts[1]),
          finalLine: parseInt(parts[2]),
        };
      } else if (line.startsWith('author ')) {
        currentEntry.author = line.substring(7);
      } else if (line.startsWith('author-time ')) {
        currentEntry.timestamp = parseInt(line.substring(12)) * 1000;
      } else if (line.startsWith('summary ')) {
        currentEntry.summary = line.substring(8);
      } else if (line.startsWith('\t')) {
        currentEntry.content = line.substring(1);
      }
    }
    if (currentEntry.hash) {
      blameData.push(currentEntry);
    }

    return { success: true, blame: blameData };
  } catch (err) {
    console.error(`[Git] Error getting blame:`, err);
    return { success: false, error: err.message };
  }
});

// Git branches
ipcMain.handle('gitBranches', async (event, repoPath) => {
  log(`[Git] Getting branches for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const branchSummary = await git.branch(['-a']);
    return {
      success: true,
      current: branchSummary.current,
      branches: branchSummary.all,
      local: branchSummary.branches
    };
  } catch (err) {
    console.error(`[Git] Error getting branches:`, err);
    return { success: false, error: err.message };
  }
});

// Git create branch
ipcMain.handle('gitCreateBranch', async (event, repoPath, branchName) => {
  log(`[Git] Creating branch: ${branchName} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    await git.checkoutLocalBranch(branchName);
    return { success: true };
  } catch (err) {
    console.error(`[Git] Error creating branch:`, err);
    return { success: false, error: err.message };
  }
});

// Git switch branch
ipcMain.handle('gitCheckout', async (event, repoPath, branchName) => {
  log(`[Git] Switching to branch: ${branchName} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    await git.checkout(branchName);
    return { success: true };
  } catch (err) {
    console.error(`[Git] Error switching branch:`, err);
    return { success: false, error: err.message };
  }
});

// Git delete branch
ipcMain.handle('gitDeleteBranch', async (event, repoPath, branchName, force = false) => {
  log(`[Git] Deleting branch: ${branchName} in ${repoPath} (force: ${force})`);
  try {
    const git = simpleGit(repoPath);
    await git.deleteLocalBranch(branchName, force);
    return { success: true };
  } catch (err) {
    console.error(`[Git] Error deleting branch:`, err);
    return { success: false, error: err.message };
  }
});

// Git commit history
ipcMain.handle('gitLog', async (event, repoPath, options = {}) => {
  log(`[Git] Getting commit history for: ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    const logOptions = {
      maxCount: options.maxCount || 50,
      ...options
    };
    const logResult = await git.log(logOptions);
    return { success: true, commits: logResult.all, total: logResult.total };
  } catch (err) {
    console.error(`[Git] Error getting log:`, err);
    return { success: false, error: err.message };
  }
});

// Git show commit details
ipcMain.handle('gitShowCommit', async (event, repoPath, commitHash) => {
  log(`[Git] Showing commit: ${commitHash} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    // Use raw to avoid pager issues
    const show = await git.raw(['show', commitHash, '--stat', '--format=fuller', '--no-color']);
    const diff = await git.raw(['show', commitHash, '--format=', '--no-color']);
    return { success: true, details: show, diff };
  } catch (err) {
    console.error(`[Git] Error showing commit:`, err);
    return { success: false, error: err.message };
  }
});

// Git stash
ipcMain.handle('gitStash', async (event, repoPath, action = 'push', message = '') => {
  log(`[Git] Stash ${action} in ${repoPath}`);
  try {
    const git = simpleGit(repoPath);
    let result;
    switch (action) {
      case 'push':
        result = message ? await git.stash(['push', '-m', message]) : await git.stash(['push']);
        break;
      case 'pop':
        result = await git.stash(['pop']);
        break;
      case 'list':
        result = await git.stash(['list']);
        break;
      case 'drop':
        result = await git.stash(['drop']);
        break;
      default:
        result = await git.stash([action]);
    }
    return { success: true, result };
  } catch (err) {
    console.error(`[Git] Error with stash:`, err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-add-to-history', async (event, { url, title, folderPath }) => {
    try {
        if (!url || url === 'about:blank') return { success: true };
        const existing = await dbQuery('SELECT id FROM browser_history WHERE url = ? AND folder_path = ?', [url, folderPath]);
        if (existing.length > 0) {
            await dbQuery('UPDATE browser_history SET visit_count = visit_count + 1, last_visited = CURRENT_TIMESTAMP, title = ? WHERE id = ?', [title, existing[0].id]);
        } else {
            await dbQuery('INSERT INTO browser_history (url, title, folder_path) VALUES (?, ?, ?)', [url, title, folderPath]);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});


// --- FIX 2: Replace your entire 'show-browser' handler with this robust version ---
ipcMain.handle('show-browser', async (event, { url, bounds, viewId }) => {
    log(`[BROWSER VIEW] Received 'show-browser' for viewId: ${viewId}`);
    if (!mainWindow) return { success: false, error: 'Main window not found' };

    // Clean up any pre-existing view with the same ID.
    if (browserViews.has(viewId)) {
        const existingState = browserViews.get(viewId);
        mainWindow.removeBrowserView(existingState.view);
        if (existingState.view && !existingState.view.webContents.isDestroyed()) {
            existingState.view.webContents.destroy();
        }
        browserViews.delete(viewId);
    }

    const finalBounds = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) };
    log(`[BROWSER VIEW] FINAL calculated bounds for ${viewId}:`, JSON.stringify(finalBounds));

  const newBrowserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      partition: `persist:${viewId}`,
    },
  });

  newBrowserView.setBackgroundColor('#0f172a');
  
  mainWindow.addBrowserView(newBrowserView);
  newBrowserView.setBounds(finalBounds);
  
  // 🔥 THE FIX: Enable auto-resize with clipping
  newBrowserView.setAutoResize({
    width: true,
    height: true,
    horizontal: true,
    vertical: true
  });

  // Store with clipping enabled flag
  browserViews.set(viewId, { 
    view: newBrowserView, 
    bounds: finalBounds, 
    visible: true 
  });


  
  
    const wc = newBrowserView.webContents;

    // Listeners now only send events to the renderer; they do not register handlers.
    wc.on('did-navigate', (event, navigatedUrl) => {
        mainWindow.webContents.send('browser-loaded', { viewId, url: navigatedUrl, title: wc.getTitle() });
    });
    wc.on('did-start-loading', () => mainWindow.webContents.send('browser-loading', { viewId, loading: true }));
    wc.on('page-title-updated', (e, title) => mainWindow.webContents.send('browser-title-updated', { viewId, title }));
    wc.on('did-stop-loading', () => {
        mainWindow.webContents.send('browser-loading', { viewId, loading: false });
        mainWindow.webContents.send('browser-navigation-state-updated', { viewId, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() });
    });

    const finalURL = url.startsWith('http') ? url : `https://${url}`;
    wc.loadURL(finalURL).catch(err => log(`[BROWSER VIEW ${viewId}] loadURL promise rejected: ${err.message}`));
    
    return { success: true, viewId };
});





ipcMain.handle('browser:set-visibility', (event, { viewId, visible }) => {
    if (browserViews.has(viewId)) {
        const browserState = browserViews.get(viewId);
        if (visible) {
            log(`[BROWSER VIEW] Setting visibility to TRUE for ${viewId}`);
            browserState.view.setBounds(browserState.bounds); // Use stored bounds
            browserState.visible = true;
        } else {
            log(`[BROWSER VIEW] Setting visibility to FALSE for ${viewId}`);
           
            browserState.view.setBounds({ x: -2000, y: -2000, width: 0, height: 0 });
            browserState.visible = false;
        }
        return { success: true };
    }
    return { success: false, error: 'View not found' };
});
  
 

ipcMain.handle('update-browser-bounds', (event, { viewId, bounds }) => {
  if (browserViews.has(viewId)) {
    const browserState = browserViews.get(viewId);
    
    // Get main window bounds to establish hard limits
    const winBounds = mainWindow.getBounds();
    
    // Clip bounds to NEVER exceed the pane's boundaries
    const adjustedBounds = {
      x: Math.max(0, Math.round(bounds.x)),
      y: Math.max(0, Math.round(bounds.y)),
      width: Math.min(
        Math.round(bounds.width),
        winBounds.width - Math.round(bounds.x)
      ),
      height: Math.min(
        Math.round(bounds.height),
        winBounds.height - Math.round(bounds.y)
      )
    };
    console.log(`[BROWSER ${viewId}] Setting bounds:`, adjustedBounds);
  console.log(`[BROWSER ${viewId}] Window size:`, mainWindow.getBounds());


    browserState.bounds = adjustedBounds;
    
    if (browserState.visible) {
      browserState.view.setBounds(adjustedBounds);
    }
    return { success: true };
  }
  return { success: false, error: 'Browser view not found' };
});
ipcMain.handle('hide-browser', (event, { viewId }) => {
    log(`[BROWSER VIEW] Received 'hide-browser' for viewId: ${viewId}`);
    if (browserViews.has(viewId) && mainWindow && !mainWindow.isDestroyed()) {
        log(`[BROWSER VIEW] Removing and destroying BrowserView for ${viewId}`);
        const browserState = browserViews.get(viewId);
        mainWindow.removeBrowserView(browserState.view);
        browserState.view.webContents.destroy();
        browserViews.delete(viewId);
        return { success: true };
    }
    return { success: false, error: 'Browser view not found' };
});
  
 
ipcMain.handle('browser:addToHistory', async (event, { url, title, folderPath, paneId, navigationType = 'click', fromUrl }) => {
  try {
    if (!url || url === 'about:blank') {
      log('[BROWSER HISTORY] Skipping add to history for blank or invalid URL:', url);
      return { success: true, message: 'Skipped blank URL' };
    }

    const existing = await dbQuery(
      'SELECT id, visit_count FROM browser_history WHERE url = ? AND folder_path = ?',
      [url, folderPath]
    );

    if (existing.length > 0) {
      await dbQuery(
        'UPDATE browser_history SET visit_count = visit_count + 1, last_visited = CURRENT_TIMESTAMP, title = ?, pane_id = ?, navigation_type = ? WHERE id = ?',
        [title, paneId, navigationType, existing[0].id]
      );
      log(`[BROWSER HISTORY] Updated history for ${url} in ${folderPath}`);
    } else {
      await dbQuery(
        'INSERT INTO browser_history (url, title, folder_path, pane_id, navigation_type) VALUES (?, ?, ?, ?, ?)',
        [url, title, folderPath, paneId, navigationType]
      );
      log(`[BROWSER HISTORY] Added new history entry for ${url} in ${folderPath}`);
    }

    // Record the navigation edge if we have a fromUrl (previous page in this pane)
    if (fromUrl && fromUrl !== 'about:blank' && fromUrl !== url) {
      await dbQuery(
        'INSERT INTO browser_navigations (pane_id, from_url, to_url, navigation_type, folder_path) VALUES (?, ?, ?, ?, ?)',
        [paneId, fromUrl, url, navigationType, folderPath]
      );
      log(`[BROWSER HISTORY] Recorded navigation: ${fromUrl} -> ${url} (${navigationType})`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-browser-history', async (event, folderPath) => {
  try {
    // Only return history entries for this specific folder
    const history = await dbQuery(
      'SELECT id, title, url, folder_path, visit_count, last_visited FROM browser_history WHERE folder_path = ? ORDER BY last_visited DESC LIMIT 50',
      [folderPath]
    );
    log(`[BROWSER HISTORY] Retrieved ${history.length} history entries for ${folderPath}`);
    return { history };
  } catch (error) {
    log(`[BROWSER HISTORY] Error getting history for ${folderPath}:`, error);
    return { error: error.message };
  }
});




ipcMain.handle('browser:getHistory', async (event, { folderPath, limit = 50 }) => {
  try {
    const history = await dbQuery(
      'SELECT * FROM browser_history WHERE folder_path = ? ORDER BY last_visited DESC LIMIT ?',
      [folderPath, limit]
    );
    log(`[BROWSER HISTORY] Retrieved ${history.length} history entries for ${folderPath}`);
    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
  
ipcMain.handle('browser:addBookmark', async (event, { url, title, folderPath, isGlobal = false }) => {
  try {
    if (!url || url === 'about:blank') { // Don't bookmark blank pages
      log('[BROWSER BOOKMARKS] Skipping add bookmark for blank or invalid URL:', url);
      return { success: false, error: 'Cannot bookmark a blank or invalid URL.' };
    }
    await dbQuery(
      'INSERT INTO bookmarks (url, title, folder_path, is_global) VALUES (?, ?, ?, ?)',
      [url, title, isGlobal ? null : folderPath, isGlobal ? 1 : 0]
    );
    log(`[BROWSER BOOKMARKS] Added bookmark: ${title} (${url})`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
  
ipcMain.handle('browser:getBookmarks', async (event, { folderPath }) => {
  try {
   
    const bookmarks = await dbQuery(
      'SELECT * FROM bookmarks WHERE (folder_path = ? OR is_global = 1) ORDER BY is_global ASC, timestamp DESC',
      [folderPath]
    );
    log(`[BROWSER BOOKMARKS] Retrieved ${bookmarks.length} bookmarks for ${folderPath}`);
    return { success: true, bookmarks };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
  
ipcMain.handle('browser:deleteBookmark', async (event, { bookmarkId }) => {
  try {
    await dbQuery('DELETE FROM bookmarks WHERE id = ?', [bookmarkId]);
    log(`[BROWSER BOOKMARKS] Deleted bookmark ID: ${bookmarkId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
  
ipcMain.handle('browser:clearHistory', async (event, { folderPath }) => {
  try {
    await dbQuery('DELETE FROM browser_history WHERE folder_path = ?', [folderPath]);
    await dbQuery('DELETE FROM browser_navigations WHERE folder_path = ?', [folderPath]);
    log(`[BROWSER HISTORY] Cleared history for ${folderPath}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get browser history as a graph for visualization
ipcMain.handle('browser:getHistoryGraph', async (event, { folderPath, minVisits = 1, dateFrom, dateTo }) => {
  try {
    // Build date filter clause
    let dateFilter = '';
    const params = [folderPath];
    if (dateFrom) {
      dateFilter += ' AND last_visited >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      dateFilter += ' AND last_visited <= ?';
      params.push(dateTo);
    }

    // Get all history entries as nodes (grouped by domain for cleaner visualization)
    const historyEntries = await dbQuery(
      `SELECT url, title, visit_count, last_visited, pane_id, navigation_type
       FROM browser_history
       WHERE folder_path = ? AND visit_count >= ?${dateFilter}
       ORDER BY visit_count DESC`,
      [...params.slice(0, 1), minVisits, ...params.slice(1)]
    );

    // Get all navigations as edges
    let navDateFilter = '';
    const navParams = [folderPath];
    if (dateFrom) {
      navDateFilter += ' AND timestamp >= ?';
      navParams.push(dateFrom);
    }
    if (dateTo) {
      navDateFilter += ' AND timestamp <= ?';
      navParams.push(dateTo);
    }

    const navigations = await dbQuery(
      `SELECT from_url, to_url, navigation_type, COUNT(*) as weight
       FROM browser_navigations
       WHERE folder_path = ?${navDateFilter}
       GROUP BY from_url, to_url, navigation_type
       ORDER BY weight DESC`,
      navParams
    );

    // Helper to extract domain from URL
    const getDomain = (url) => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    };

    // Build node map (by domain)
    const domainMap = new Map();
    for (const entry of historyEntries) {
      const domain = getDomain(entry.url);
      if (!domainMap.has(domain)) {
        domainMap.set(domain, {
          id: domain,
          label: domain,
          visitCount: 0,
          urls: [],
          lastVisited: entry.last_visited
        });
      }
      const node = domainMap.get(domain);
      node.visitCount += entry.visit_count;
      node.urls.push({ url: entry.url, title: entry.title, visits: entry.visit_count });
      if (entry.last_visited > node.lastVisited) {
        node.lastVisited = entry.last_visited;
      }
    }

    // Build edge map (domain to domain)
    const edgeMap = new Map();
    for (const nav of navigations) {
      const fromDomain = getDomain(nav.from_url);
      const toDomain = getDomain(nav.to_url);
      if (fromDomain === toDomain) continue; // Skip self-loops

      const edgeKey = `${fromDomain}->${toDomain}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          source: fromDomain,
          target: toDomain,
          weight: 0,
          clickWeight: 0,
          manualWeight: 0
        });
      }
      const edge = edgeMap.get(edgeKey);
      edge.weight += nav.weight;
      if (nav.navigation_type === 'click') {
        edge.clickWeight += nav.weight;
      } else {
        edge.manualWeight += nav.weight;
      }
    }

    // Convert maps to arrays, filtering to only include nodes that are in navigations
    const allDomains = new Set([...domainMap.keys()]);
    const navigatedDomains = new Set();
    for (const edge of edgeMap.values()) {
      navigatedDomains.add(edge.source);
      navigatedDomains.add(edge.target);
    }

    // Include all domains that have visits, plus any in navigations
    const nodes = Array.from(domainMap.values()).filter(n =>
      n.visitCount >= minVisits || navigatedDomains.has(n.id)
    );
    const links = Array.from(edgeMap.values());

    // Calculate stats
    const totalVisits = nodes.reduce((sum, n) => sum + n.visitCount, 0);
    const totalNavigations = links.reduce((sum, l) => sum + l.weight, 0);
    const topDomains = [...nodes].sort((a, b) => b.visitCount - a.visitCount).slice(0, 10);

    log(`[BROWSER HISTORY GRAPH] Built graph with ${nodes.length} nodes, ${links.length} edges`);

    return {
      success: true,
      nodes,
      links,
      stats: {
        totalNodes: nodes.length,
        totalEdges: links.length,
        totalVisits,
        totalNavigations,
        topDomains: topDomains.map(d => ({ domain: d.id, visits: d.visitCount }))
      }
    };
  } catch (error) {
    log(`[BROWSER HISTORY GRAPH] Error:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browser-navigate', (event, { viewId, url }) => {
  if (browserViews.has(viewId)) {
    const finalURL = url.startsWith('http') ? url : `https://${url}`;
    log(`[BROWSER VIEW] Navigating ${viewId} to: ${finalURL}`);
    browserViews.get(viewId).view.webContents.loadURL(finalURL); // Access webContents via .view
    return { success: true };
  }
  return { success: false, error: 'Browser view not found' };
});
  
ipcMain.handle('browser-back', (event, { viewId }) => {
  if (browserViews.has(viewId)) {
    const webContents = browserViews.get(viewId).view.webContents; // Access webContents via .view
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
    const webContents = browserViews.get(viewId).view.webContents; // Access webContents via .view
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
    browserViews.get(viewId).view.webContents.reload(); // Access webContents via .view
    return { success: true };
  }
  return { success: false, error: 'Browser view not found' };
});
  
ipcMain.handle('browser-get-selected-text', (event, { viewId }) => {
  if (browserViews.has(viewId)) {
    return new Promise((resolve) => {
      browserViews.get(viewId).view.webContents.executeJavaScript(` // Access webContents via .view
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

// --- MCP Server helpers ---
async function fetchCtxMcpServers(currentPath) {
  const servers = new Map(); // serverPath -> { serverPath, origin }
  const addServer = (entry, origin) => {
    if (!entry) return;
    const serverPath = typeof entry === 'string' ? entry : entry.value;
    if (serverPath && !servers.has(serverPath)) {
      servers.set(serverPath, { serverPath, origin });
    }
  };
  try {
    const globalRes = await fetch('http://127.0.0.1:5337/api/context/global');
    const globalJson = await globalRes.json();
    (globalJson.context?.mcp_servers || []).forEach(s => addServer(s, 'global'));
  } catch (e) {
    console.warn('Failed to load global ctx for MCP servers', e.message);
  }

  if (currentPath) {
    try {
      const projRes = await fetch(`http://127.0.0.1:5337/api/context/project?path=${encodeURIComponent(currentPath)}`);
      const projJson = await projRes.json();
      (projJson.context?.mcp_servers || []).forEach(s => addServer(s, 'project'));
    } catch (e) {
      console.warn('Failed to load project ctx for MCP servers', e.message);
    }
  }
  return Array.from(servers.values());
}

ipcMain.handle('mcp:getServers', async (event, { currentPath } = {}) => {
  try {
    const serverList = await fetchCtxMcpServers(currentPath);
    const statuses = [];
    for (const serverInfo of serverList) {
      const { serverPath, origin } = serverInfo;
      try {
        const statusRes = await fetch(`http://127.0.0.1:5337/api/mcp/server/status?serverPath=${encodeURIComponent(serverPath)}${currentPath ? `&currentPath=${encodeURIComponent(currentPath)}` : ''}`);
        const statusJson = await statusRes.json();
        statuses.push({ serverPath, origin, status: statusJson.status || (statusJson.running ? 'running' : 'unknown'), details: statusJson });
      } catch (err) {
        statuses.push({ serverPath, origin, status: 'error', error: err.message });
      }
    }
    return { servers: statuses, error: null };
  } catch (err) {
    console.error('Error in mcp:getServers', err);
    return { servers: [], error: err.message };
  }
});

ipcMain.handle('mcp:startServer', async (event, { serverPath, currentPath } = {}) => {
  try {
    const res = await fetch('http://127.0.0.1:5337/api/mcp/server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverPath, currentPath })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { result: json, error: null };
  } catch (err) {
    console.error('Error starting MCP server', err);
    return { error: err.message };
  }
});

ipcMain.handle('mcp:stopServer', async (event, { serverPath } = {}) => {
  try {
    const res = await fetch('http://127.0.0.1:5337/api/mcp/server/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverPath })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { result: json, error: null };
  } catch (err) {
    console.error('Error stopping MCP server', err);
    return { error: err.message };
  }
});

ipcMain.handle('mcp:status', async (event, { serverPath, currentPath } = {}) => {
  try {
    const res = await fetch(`http://127.0.0.1:5337/api/mcp/server/status?serverPath=${encodeURIComponent(serverPath || '')}${currentPath ? `&currentPath=${encodeURIComponent(currentPath)}` : ''}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { status: json, error: null };
  } catch (err) {
    console.error('Error fetching MCP server status', err);
    return { error: err.message };
  }
});

ipcMain.handle('mcp:listTools', async (event, { serverPath, conversationId, npc, selected, currentPath } = {}) => {
  try {
    const params = new URLSearchParams();
    if (serverPath) params.append('mcpServerPath', serverPath);
    if (conversationId) params.append('conversationId', conversationId);
    if (npc) params.append('npc', npc);
    if (currentPath) params.append('currentPath', currentPath);
    if (selected && selected.length) params.append('selected', selected.join(','));
    const res = await fetch(`http://127.0.0.1:5337/api/mcp_tools?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return { tools: json.tools || [], error: null };
  } catch (err) {
    console.error('Error listing MCP tools', err);
    return { tools: [], error: err.message };
  }
});

// Add a desktop integration MCP server
ipcMain.handle('mcp:addIntegration', async (event, { integrationId, serverScript, envVars, name } = {}) => {
  try {
    // Destination directory for MCP servers
    const npcshDir = path.join(os.homedir(), '.npcsh');
    const mcpServersDir = path.join(npcshDir, 'mcp_servers');

    // Ensure directories exist
    await fsPromises.mkdir(mcpServersDir, { recursive: true });

    // Source path (bundled with app)
    const sourcePath = path.join(__dirname, 'mcp_servers', serverScript);
    const destPath = path.join(mcpServersDir, serverScript);

    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return { error: `MCP server script not found: ${serverScript}` };
    }

    // Copy the script
    await fsPromises.copyFile(sourcePath, destPath);
    console.log(`[MCP] Copied ${serverScript} to ${destPath}`);

    // Build server path that will be added to context
    const serverPath = destPath;

    // Read current global context
    let globalContext = {};
    const globalCtxPath = path.join(npcshDir, '.ctx');
    try {
      const ctxContent = await fsPromises.readFile(globalCtxPath, 'utf-8');
      globalContext = JSON.parse(ctxContent);
    } catch (e) {
      // File doesn't exist yet, start fresh
      globalContext = {};
    }

    // Ensure mcp_servers array exists
    if (!globalContext.mcp_servers) {
      globalContext.mcp_servers = [];
    }

    // Check if this integration already exists
    const existingIndex = globalContext.mcp_servers.findIndex(s => {
      if (typeof s === 'string') return s === serverPath;
      return s.value === serverPath || s.id === integrationId;
    });

    // Create the server entry with env vars
    const serverEntry = {
      id: integrationId,
      name: name,
      value: serverPath,
      env: envVars || {}
    };

    if (existingIndex >= 0) {
      // Update existing
      globalContext.mcp_servers[existingIndex] = serverEntry;
    } else {
      // Add new
      globalContext.mcp_servers.push(serverEntry);
    }

    // Write back the context
    await fsPromises.writeFile(globalCtxPath, JSON.stringify(globalContext, null, 2), 'utf-8');
    console.log(`[MCP] Added ${name} integration to global context`);

    // Notify npcpy backend to reload context (if endpoint exists)
    try {
      await fetch('http://127.0.0.1:5337/api/context/reload', { method: 'POST' });
    } catch (e) {
      // Ignore if reload endpoint doesn't exist
    }

    return { success: true, serverPath, error: null };
  } catch (err) {
    console.error('Error adding MCP integration', err);
    return { error: err.message };
  }
});

ipcMain.handle('kg:getNetworkStats', async (event, { generation }) => {
  const params = generation !== null ? `?generation=${generation}` : '';
 
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

// KG Node/Edge editing handlers
ipcMain.handle('kg:addNode', async (event, { nodeId, nodeType = 'concept', properties = {} }) => {
  return await callBackendApi('http://127.0.0.1:5337/api/kg/node', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: nodeId, type: nodeType, properties }),
  });
});

ipcMain.handle('kg:updateNode', async (event, { nodeId, properties }) => {
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/node/${encodeURIComponent(nodeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties }),
  });
});

ipcMain.handle('kg:deleteNode', async (event, { nodeId }) => {
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/node/${encodeURIComponent(nodeId)}`, {
    method: 'DELETE',
  });
});

ipcMain.handle('kg:addEdge', async (event, { sourceId, targetId, edgeType = 'related_to', weight = 1 }) => {
  return await callBackendApi('http://127.0.0.1:5337/api/kg/edge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: sourceId, target: targetId, type: edgeType, weight }),
  });
});

ipcMain.handle('kg:deleteEdge', async (event, { sourceId, targetId }) => {
  return await callBackendApi(`http://127.0.0.1:5337/api/kg/edge/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}`, {
    method: 'DELETE',
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
    
   
   
    if (activeStreams.has(streamIdToInterrupt)) {
        const { stream } = activeStreams.get(streamIdToInterrupt);
        if (stream && typeof stream.destroy === 'function') {
            stream.destroy();
        }
       
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[Main Process] Error sending interrupt request to backend:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('wait-for-screenshot', async (event, screenshotPath) => {
    const maxAttempts = 20;
    const delay = 500;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fs.access(screenshotPath);
        const stats = await fs.stat(screenshotPath);
        if (stats.size > 0) {
          return true;
        }
      } catch (err) {
       
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
        npcs: data.npcs || [] 
      };
    } catch (error) {
      console.error('Error fetching NPC team:', error);
      return {
        npcs: [],
        error: error.message
      };
    }
  });
  ipcMain.handle('getFileStats', async (event, filePath) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    let resolvedPath = filePath;
    if (filePath.startsWith('~')) {
        resolvedPath = filePath.replace('~', os.homedir());
    }
    
    const stats = await fs.stat(resolvedPath);
    return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime
    };
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
        console.log('Global jinxs data:', data);
        return data;
    } catch (err) {
        console.error('Error loading global jinxs:', err);
        return { jinxs: [], error: err.message };
    }
});
ipcMain.handle('db:addPdfHighlight', async (event, { filePath, text, position, annotation = '' }) => {
  console.log('[DB_ADD_HIGHLIGHT] Received request:', {
    filePath,
    textLength: text?.length,
    positionType: typeof position,
    position: position,
    annotation
  });
  
  try {
    const positionJson = JSON.stringify(position);
    console.log('[DB_ADD_HIGHLIGHT] Stringified position:', positionJson.substring(0, 100));
    
    const result = await dbQuery(
      'INSERT INTO pdf_highlights (file_path, highlighted_text, position_json, annotation) VALUES (?, ?, ?, ?)',
      [filePath, text, positionJson, annotation]
    );
    
    console.log('[DB_ADD_HIGHLIGHT] Insert result:', result);
    return { success: true, lastID: result.lastID };
  } catch (error) {
    console.error('[DB_ADD_HIGHLIGHT] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:getHighlightsForFile', async (event, { filePath }) => {
  console.log('[DB_GET_HIGHLIGHTS] Fetching for file:', filePath);
  
  try {
    await ensureTablesExist();
    const rows = await dbQuery('SELECT * FROM pdf_highlights WHERE file_path = ? ORDER BY id ASC', [filePath]);
    
    console.log('[DB_GET_HIGHLIGHTS] Found rows:', rows.length);
    
    const highlights = rows.map(r => {
      console.log('[DB_GET_HIGHLIGHTS] Raw row:', r);
      
      let position = {};
      try {
        position = JSON.parse(r.position_json);
        console.log('[DB_GET_HIGHLIGHTS] Parsed position:', position);
      } catch (e) {
        console.error('[DB_GET_HIGHLIGHTS] Error parsing position_json:', e, r.position_json);
      }
      
      return {
        ...r,
        position: position,
        annotation: r.annotation || ''
      };
    });
    
    console.log('[DB_GET_HIGHLIGHTS] Returning highlights:', highlights);
    return { highlights };
  } catch (error) {
    console.error('[DB_GET_HIGHLIGHTS] Error:', error);
    return { error: error.message };
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
ipcMain.handle('open-new-window', async (event, initialPath) => {
    createWindow(initialPath); // Your existing window creation function
});

// =============================================================================
// Multi-Database Connection Support
// Supports: SQLite, PostgreSQL, MySQL, MSSQL, Snowflake via connection strings
// =============================================================================

// Parse connection string to determine database type and connection params
const parseConnectionString = (connString) => {
  if (!connString) {
    return { type: 'sqlite', path: path.join(os.homedir(), 'npcsh_history.db') };
  }

  const str = connString.trim();

  // Handle ~ for home directory in paths
  const expandHome = (p) => p.startsWith('~') ? p.replace('~', os.homedir()) : p;

  // SQLite: file path, sqlite:path, or sqlite://path
  if (str.match(/\.(db|sqlite|sqlite3)$/i) || str.startsWith('sqlite:') || str.startsWith('~') || str.startsWith('/') || str.startsWith('.')) {
    let dbPath = str;
    if (dbPath.startsWith('sqlite://')) {
      dbPath = dbPath.replace('sqlite://', '');
    } else if (dbPath.startsWith('sqlite:')) {
      dbPath = dbPath.replace('sqlite:', '');
    }
    dbPath = expandHome(dbPath);
    return { type: 'sqlite', path: path.resolve(dbPath) };
  }

  // PostgreSQL: postgres:// or postgresql://
  if (str.startsWith('postgres://') || str.startsWith('postgresql://')) {
    return { type: 'postgresql', connectionString: str };
  }

  // MySQL: mysql://
  if (str.startsWith('mysql://')) {
    return { type: 'mysql', connectionString: str };
  }

  // MSSQL: mssql:// or sqlserver://
  if (str.startsWith('mssql://') || str.startsWith('sqlserver://')) {
    return { type: 'mssql', connectionString: str };
  }

  // Snowflake: snowflake://
  if (str.startsWith('snowflake://')) {
    return { type: 'snowflake', connectionString: str };
  }

  // Default: assume SQLite file path
  return { type: 'sqlite', path: path.resolve(expandHome(str)) };
};

// Get database-specific SQL for listing tables
const getListTablesSQL = (dbType) => {
  switch (dbType) {
    case 'postgresql':
      return "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'";
    case 'mysql':
      return "SHOW TABLES";
    case 'mssql':
      return "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
    case 'snowflake':
      return "SHOW TABLES";
    case 'sqlite':
    default:
      return "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
  }
};

// Get database-specific SQL for table schema
const getTableSchemaSQL = (dbType, tableName) => {
  switch (dbType) {
    case 'postgresql':
      return `SELECT column_name as name, data_type as type, is_nullable,
              CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as pk
              FROM information_schema.columns c
              LEFT JOIN (
                SELECT ku.column_name FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
                WHERE tc.table_name = '${tableName}' AND tc.constraint_type = 'PRIMARY KEY'
              ) pk ON c.column_name = pk.column_name
              WHERE c.table_name = '${tableName}'`;
    case 'mysql':
      return `DESCRIBE ${tableName}`;
    case 'mssql':
      return `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE as is_nullable
              FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`;
    case 'snowflake':
      return `DESCRIBE TABLE ${tableName}`;
    case 'sqlite':
    default:
      return `PRAGMA table_info(${tableName})`;
  }
};

// Try to load optional database drivers
const tryRequire = (moduleName) => {
  try {
    return require(moduleName);
  } catch (e) {
    return null;
  }
};

// Execute query on any supported database
const executeOnDatabase = async (connConfig, query, params = []) => {
  const { type } = connConfig;

  if (type === 'sqlite') {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(connConfig.path)) {
        return reject(new Error(`Database file not found: ${connConfig.path}`));
      }

      const isReadQuery = query.trim().toUpperCase().startsWith('SELECT') ||
                          query.trim().toUpperCase().startsWith('PRAGMA') ||
                          query.trim().toUpperCase().startsWith('SHOW');
      const mode = isReadQuery ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);

      const db = new sqlite3.Database(connConfig.path, mode, (err) => {
        if (err) return reject(err);

        if (isReadQuery) {
          db.all(query, params, (err, rows) => {
            db.close();
            if (err) return reject(err);
            resolve(rows);
          });
        } else {
          db.run(query, params, function(err) {
            db.close();
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
          });
        }
      });
    });
  }

  // PostgreSQL
  if (type === 'postgresql') {
    const pg = tryRequire('pg');
    if (!pg) {
      throw new Error('PostgreSQL driver not installed. Run: npm install pg');
    }
    const client = new pg.Client({ connectionString: connConfig.connectionString });
    await client.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  // MySQL
  if (type === 'mysql') {
    const mysql = tryRequire('mysql2/promise');
    if (!mysql) {
      throw new Error('MySQL driver not installed. Run: npm install mysql2');
    }
    const connection = await mysql.createConnection(connConfig.connectionString);
    try {
      const [rows] = await connection.execute(query, params);
      return Array.isArray(rows) ? rows : [rows];
    } finally {
      await connection.end();
    }
  }

  // MSSQL
  if (type === 'mssql') {
    const mssql = tryRequire('mssql');
    if (!mssql) {
      throw new Error('MSSQL driver not installed. Run: npm install mssql');
    }
    await mssql.connect(connConfig.connectionString);
    try {
      const result = await mssql.query(query);
      return result.recordset;
    } finally {
      await mssql.close();
    }
  }

  // Snowflake
  if (type === 'snowflake') {
    const snowflake = tryRequire('snowflake-sdk');
    if (!snowflake) {
      throw new Error('Snowflake driver not installed. Run: npm install snowflake-sdk');
    }
    // Parse snowflake connection string: snowflake://user:pass@account/database/schema?warehouse=WH
    const url = new URL(connConfig.connectionString);
    const connection = snowflake.createConnection({
      account: url.hostname,
      username: url.username,
      password: url.password,
      database: url.pathname.split('/')[1],
      schema: url.pathname.split('/')[2],
      warehouse: url.searchParams.get('warehouse')
    });

    return new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) return reject(err);
        conn.execute({
          sqlText: query,
          complete: (err, stmt, rows) => {
            conn.destroy();
            if (err) return reject(err);
            resolve(rows);
          }
        });
      });
    });
  }

  throw new Error(`Unsupported database type: ${type}`);
};

// Test database connection and return basic info
ipcMain.handle('db:testConnection', async (event, { connectionString }) => {
  try {
    const connConfig = parseConnectionString(connectionString);
    const listSQL = getListTablesSQL(connConfig.type);

    const tables = await executeOnDatabase(connConfig, listSQL);
    const tableNames = tables.map(r => r.name || r.tablename || r.TABLE_NAME || Object.values(r)[0]);

    const result = {
      success: true,
      dbType: connConfig.type,
      tableCount: tableNames.length,
      tables: tableNames
    };

    // Add file info for SQLite
    if (connConfig.type === 'sqlite' && connConfig.path) {
      result.resolvedPath = connConfig.path;
      if (fs.existsSync(connConfig.path)) {
        const stats = fs.statSync(connConfig.path);
        result.fileSize = stats.size;
        result.lastModified = stats.mtime;
      }
    }

    return result;
  } catch (err) {
    const connConfig = parseConnectionString(connectionString);
    return {
      success: false,
      error: err.message,
      dbType: connConfig.type,
      resolvedPath: connConfig.path || null
    };
  }
});

// List tables for a database
ipcMain.handle('db:listTablesForPath', async (event, { connectionString }) => {
  try {
    const connConfig = parseConnectionString(connectionString);
    const listSQL = getListTablesSQL(connConfig.type);
    const tables = await executeOnDatabase(connConfig, listSQL);
    const tableNames = tables.map(r => r.name || r.tablename || r.TABLE_NAME || Object.values(r)[0]);
    return { tables: tableNames, dbType: connConfig.type };
  } catch (err) {
    return { error: err.message };
  }
});

// Get table schema for a database
ipcMain.handle('db:getTableSchemaForPath', async (event, { connectionString, tableName }) => {
  // Validate table name (allow dots for schema.table notation)
  if (!/^[a-zA-Z0-9_.]+$/.test(tableName)) {
    return { error: 'Invalid table name provided.' };
  }

  try {
    const connConfig = parseConnectionString(connectionString);
    const schemaSQL = getTableSchemaSQL(connConfig.type, tableName);
    const schemaRows = await executeOnDatabase(connConfig, schemaSQL);

    // Normalize schema response across database types
    const schema = schemaRows.map(r => ({
      name: r.name || r.column_name || r.COLUMN_NAME || r.Field,
      type: r.type || r.data_type || r.DATA_TYPE || r.Type,
      notnull: r.notnull || (r.is_nullable === 'NO') || (r.Null === 'NO') ? 1 : 0,
      pk: r.pk || (r.Key === 'PRI') ? 1 : 0
    }));

    // Try to get row count
    let rowCount = null;
    try {
      const countResult = await executeOnDatabase(connConfig, `SELECT COUNT(*) as count FROM ${tableName}`);
      rowCount = countResult[0]?.count || countResult[0]?.COUNT || null;
    } catch (e) {
      // Ignore count errors
    }

    return { schema, rowCount, dbType: connConfig.type };
  } catch (err) {
    return { error: err.message };
  }
});

// Execute SQL on a database
ipcMain.handle('db:executeSQLForPath', async (event, { connectionString, query, params = [] }) => {
  try {
    const connConfig = parseConnectionString(connectionString);
    const result = await executeOnDatabase(connConfig, query, params);

    // If it's an array, it's rows from a SELECT
    if (Array.isArray(result)) {
      return { rows: result, dbType: connConfig.type };
    }
    // Otherwise it's a write result
    return { ...result, dbType: connConfig.type };
  } catch (err) {
    return { error: err.message };
  }
});

// Browse for database file (SQLite only)
ipcMain.handle('db:browseForDatabase', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Database File',
    filters: [
      { name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3', 'mdb', 'accdb'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    return { path: filePaths[0] };
  }
  return { path: null };
});

// Get supported database types
ipcMain.handle('db:getSupportedTypes', async () => {
  const types = [
    { type: 'sqlite', name: 'SQLite', installed: true, example: '~/database.db or sqlite:~/database.db' }
  ];

  // Check which drivers are installed
  if (tryRequire('pg')) {
    types.push({ type: 'postgresql', name: 'PostgreSQL', installed: true, example: 'postgresql://user:pass@host:5432/database' });
  } else {
    types.push({ type: 'postgresql', name: 'PostgreSQL', installed: false, example: 'postgresql://user:pass@host:5432/database', install: 'npm install pg' });
  }

  if (tryRequire('mysql2/promise')) {
    types.push({ type: 'mysql', name: 'MySQL', installed: true, example: 'mysql://user:pass@host:3306/database' });
  } else {
    types.push({ type: 'mysql', name: 'MySQL', installed: false, example: 'mysql://user:pass@host:3306/database', install: 'npm install mysql2' });
  }

  if (tryRequire('mssql')) {
    types.push({ type: 'mssql', name: 'SQL Server', installed: true, example: 'mssql://user:pass@host/database' });
  } else {
    types.push({ type: 'mssql', name: 'SQL Server', installed: false, example: 'mssql://user:pass@host/database', install: 'npm install mssql' });
  }

  if (tryRequire('snowflake-sdk')) {
    types.push({ type: 'snowflake', name: 'Snowflake', installed: true, example: 'snowflake://user:pass@account/db/schema?warehouse=WH' });
  } else {
    types.push({ type: 'snowflake', name: 'Snowflake', installed: false, example: 'snowflake://user:pass@account/db/schema?warehouse=WH', install: 'npm install snowflake-sdk' });
  }

  return types;
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
      console.log('Project jinxs data:', data);
      return data;
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

// ============== Mapx (Mind Map) IPC Handlers ==============
ipcMain.handle('save-map', async (event, data) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/maps/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error saving map:', err);
        return { error: err.message };
    }
});

ipcMain.handle('load-map', async (event, filePath) => {
    try {
        const response = await fetch(`http://127.0.0.1:5337/api/maps/load?path=${encodeURIComponent(filePath)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error loading map:', err);
        return { error: err.message };
    }
});

// ============== SQL Models IPC Handlers (dbt-style npcsql) ==============
// Models are stored as .sql files in models/ directory (like dbt)
// Metadata is stored alongside in a models_meta.json file

// Helper to get models directory path
const getModelsDir = (basePath, isGlobal) => {
    if (isGlobal) {
        return path.join(os.homedir(), '.npcsh', 'npc_team', 'models');
    }
    return path.join(basePath, 'npc_team', 'models');
};

// Helper to get metadata file path
const getModelsMetaPath = (basePath, isGlobal) => {
    const modelsDir = getModelsDir(basePath, isGlobal);
    return path.join(modelsDir, 'models_meta.json');
};

// Helper to load models from directory
const loadModelsFromDir = (modelsDir) => {
    const models = [];
    if (!fs.existsSync(modelsDir)) return models;

    // Load metadata
    const metaPath = path.join(modelsDir, 'models_meta.json');
    let metadata = {};
    if (fs.existsSync(metaPath)) {
        try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (e) {
            console.error('Error reading models metadata:', e);
        }
    }

    // Discover .sql files
    const sqlFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.sql'));
    for (const file of sqlFiles) {
        const name = file.replace('.sql', '');
        const filePath = path.join(modelsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        const meta = metadata[name] || {};

        models.push({
            id: name, // Use filename as ID
            name,
            sql,
            description: meta.description || '',
            schedule: meta.schedule || '',
            materialization: meta.materialization || 'table',
            npc: meta.npc || '',
            createdAt: meta.createdAt || new Date().toISOString(),
            updatedAt: meta.updatedAt || new Date().toISOString(),
            lastRunAt: meta.lastRunAt,
            lastRunResult: meta.lastRunResult,
            filePath
        });
    }
    return models;
};

// Helper to save model metadata
const saveModelMeta = (modelsDir, name, meta) => {
    const metaPath = path.join(modelsDir, 'models_meta.json');
    let metadata = {};
    if (fs.existsSync(metaPath)) {
        try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (e) {}
    }
    metadata[name] = meta;
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
};

// Get global SQL models
ipcMain.handle('getSqlModelsGlobal', async () => {
    try {
        const modelsDir = getModelsDir(null, true);
        const models = loadModelsFromDir(modelsDir);
        return { models };
    } catch (err) {
        console.error('Error loading global SQL models:', err);
        return { models: [], error: err.message };
    }
});

// Get project SQL models
ipcMain.handle('getSqlModelsProject', async (event, currentPath) => {
    try {
        if (!currentPath) return { models: [], error: 'No project path provided' };
        const modelsDir = getModelsDir(currentPath, false);
        const models = loadModelsFromDir(modelsDir);
        return { models };
    } catch (err) {
        console.error('Error loading project SQL models:', err);
        return { models: [], error: err.message };
    }
});

// Save global SQL model (as .sql file)
ipcMain.handle('saveSqlModelGlobal', async (event, modelData) => {
    try {
        const modelsDir = getModelsDir(null, true);
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
        }

        // Sanitize model name for filename
        const safeName = modelData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sqlFilePath = path.join(modelsDir, `${safeName}.sql`);

        // Write the SQL file
        fs.writeFileSync(sqlFilePath, modelData.sql);

        // Save metadata
        const meta = {
            description: modelData.description || '',
            schedule: modelData.schedule || '',
            materialization: modelData.materialization || 'table',
            npc: modelData.npc || '',
            createdAt: modelData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastRunAt: modelData.lastRunAt,
            lastRunResult: modelData.lastRunResult
        };
        saveModelMeta(modelsDir, safeName, meta);

        return { success: true, model: { ...modelData, id: safeName, filePath: sqlFilePath } };
    } catch (err) {
        console.error('Error saving global SQL model:', err);
        return { success: false, error: err.message };
    }
});

// Save project SQL model (as .sql file)
ipcMain.handle('saveSqlModelProject', async (event, { path: projectPath, model: modelData }) => {
    try {
        if (!projectPath) return { success: false, error: 'No project path provided' };

        const modelsDir = getModelsDir(projectPath, false);
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
        }

        // Sanitize model name for filename
        const safeName = modelData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sqlFilePath = path.join(modelsDir, `${safeName}.sql`);

        // Write the SQL file
        fs.writeFileSync(sqlFilePath, modelData.sql);

        // Save metadata
        const meta = {
            description: modelData.description || '',
            schedule: modelData.schedule || '',
            materialization: modelData.materialization || 'table',
            npc: modelData.npc || '',
            createdAt: modelData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastRunAt: modelData.lastRunAt,
            lastRunResult: modelData.lastRunResult
        };
        saveModelMeta(modelsDir, safeName, meta);

        return { success: true, model: { ...modelData, id: safeName, filePath: sqlFilePath } };
    } catch (err) {
        console.error('Error saving project SQL model:', err);
        return { success: false, error: err.message };
    }
});

// Delete global SQL model
ipcMain.handle('deleteSqlModelGlobal', async (event, modelId) => {
    try {
        const modelsDir = getModelsDir(null, true);
        const sqlFilePath = path.join(modelsDir, `${modelId}.sql`);

        // Delete the .sql file
        if (fs.existsSync(sqlFilePath)) {
            fs.unlinkSync(sqlFilePath);
        }

        // Update metadata
        const metaPath = path.join(modelsDir, 'models_meta.json');
        if (fs.existsSync(metaPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                delete metadata[modelId];
                fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
            } catch (e) {}
        }

        return { success: true };
    } catch (err) {
        console.error('Error deleting global SQL model:', err);
        return { success: false, error: err.message };
    }
});

// Delete project SQL model
ipcMain.handle('deleteSqlModelProject', async (event, { path: projectPath, modelId }) => {
    try {
        if (!projectPath) return { success: false, error: 'No project path provided' };

        const modelsDir = getModelsDir(projectPath, false);
        const sqlFilePath = path.join(modelsDir, `${modelId}.sql`);

        // Delete the .sql file
        if (fs.existsSync(sqlFilePath)) {
            fs.unlinkSync(sqlFilePath);
        }

        // Update metadata
        const metaPath = path.join(modelsDir, 'models_meta.json');
        if (fs.existsSync(metaPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                delete metadata[modelId];
                fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
            } catch (e) {}
        }

        return { success: true };
    } catch (err) {
        console.error('Error deleting project SQL model:', err);
        return { success: false, error: err.message };
    }
});

// Run SQL model (execute via npcpy backend API)
ipcMain.handle('runSqlModel', async (event, { path: projectPath, modelId, isGlobal, targetDb: userTargetDb }) => {
    try {
        const modelsDir = getModelsDir(isGlobal ? null : projectPath, isGlobal);
        const sqlFilePath = path.join(modelsDir, `${modelId}.sql`);

        if (!fs.existsSync(sqlFilePath)) {
            return { success: false, error: `Model file not found: ${sqlFilePath}` };
        }

        // Load metadata for NPC context
        const metaPath = path.join(modelsDir, 'models_meta.json');
        let meta = {};
        if (fs.existsSync(metaPath)) {
            try {
                const allMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                meta = allMeta[modelId] || {};
            } catch (e) {}
        }

        const npcDirectory = isGlobal
            ? path.join(os.homedir(), '.npcsh', 'npc_team')
            : path.join(projectPath, 'npc_team');

        // Use user-selected database or default to npcsh_history.db
        let targetDb = userTargetDb || '~/npcsh_history.db';
        // Expand ~ to home directory
        if (targetDb.startsWith('~')) {
            targetDb = path.join(os.homedir(), targetDb.slice(1));
        }

        // Call the npcpy backend API
        const response = await fetch('http://127.0.0.1:5337/api/npcsql/run_model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modelsDir: modelsDir,
                modelName: modelId,
                npcDirectory: npcDirectory,
                targetDb: targetDb
            })
        });

        let result;
        if (!response.ok) {
            try {
                result = await response.json();
            } catch (e) {
                const errorText = await response.text();
                result = { success: false, error: errorText || `HTTP ${response.status}` };
            }
        } else {
            result = await response.json();
        }

        // Update last run timestamp in metadata
        meta.lastRunAt = new Date().toISOString();
        meta.lastRunResult = result.success ? 'success' : 'error';
        saveModelMeta(modelsDir, modelId, meta);

        return result;
    } catch (err) {
        console.error('Error running SQL model:', err);
        return { success: false, error: err.message };
    }
});

// ============== Local Model Provider IPC Handlers ==============
ipcMain.handle('scan-local-models', async (event, provider) => {
    try {
        const response = await fetch(`http://127.0.0.1:5337/api/models/local/scan?provider=${encodeURIComponent(provider)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error scanning local models:', err);
        return { models: [], error: err.message };
    }
});

ipcMain.handle('get-local-model-status', async (event, provider) => {
    try {
        const response = await fetch(`http://127.0.0.1:5337/api/models/local/status?provider=${encodeURIComponent(provider)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error getting local model status:', err);
        return { running: false, error: err.message };
    }
});

// ============== Activity Tracking IPC Handlers ==============
ipcMain.handle('track-activity', async (event, activity) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/activity/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error tracking activity:', err);
        return { error: err.message };
    }
});

ipcMain.handle('get-activity-predictions', async (event) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/activity/predictions');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error getting activity predictions:', err);
        return { predictions: [], error: err.message };
    }
});

ipcMain.handle('train-activity-model', async (event) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/activity/train', { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Error training activity model:', err);
        return { error: err.message };
    }
});

ipcMain.handle('executeCommandStream', async (event, data) => {
 
  const currentStreamId = data.streamId || generateId(); 
  log(`[Main Process] executeCommandStream: Starting stream with ID: ${currentStreamId}`);
  
  try {
    const apiUrl = 'http://127.0.0.1:5337/api/stream';
    
   
    const payload = {
      streamId: currentStreamId,
      commandstr: data.commandstr,
      currentPath: data.currentPath,
      conversationId: data.conversationId,
      model: data.model,
      provider: data.provider,
      npc: data.npc,
      npcSource: data.npcSource || 'global',
      attachments: data.attachments || [], 
      executionMode: data.executionMode || 'chat', 
      mcpServerPath: data.executionMode === 'tool_agent' ? data.mcpServerPath : undefined, 

      jinxs: data.jinxs || [],  
      tools: data.tools || [],     

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
    
   
    activeStreams.set(currentStreamId, { stream, eventSender: event.sender });
    
   
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
ipcMain.handle('read-csv-content', async (_, filePath) => {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    return { 
      headers: jsonData[0] || [], 
      rows: jsonData.slice(1) || [],
      error: null 
    };
  } catch (err) {
    console.error('Error reading CSV/XLSX:', err);
    return { headers: [], rows: [], error: err.message };
  }
});

ipcMain.handle('read-docx-content', async (_, filePath) => {
  try {
    const mammoth = require('mammoth');
    const buffer = await fsPromises.readFile(filePath);
    const result = await mammoth.convertToMarkdown({ buffer });
    
    return { content: result.value, error: null };
  } catch (err) {
    console.error('Error reading DOCX:', err);
    return { content: null, error: err.message };
  }
});
ipcMain.handle('write-file-buffer', async (_e, path, uint8) => {
  try {
    const fs = require('fs');
    fs.writeFileSync(path, Buffer.from(uint8));
    return true;
  } catch (err) {
    return { error: err.message };
  }
});


ipcMain.handle('finetune-diffusers', async (event, params) => {
    try {
        const response = await fetch('http://127.0.0.1:5337/api/finetune_diffusers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Finetuning failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Finetune diffusers error:', error);
        return { error: error.message };
    }
});

ipcMain.handle('get-finetune-status', async (event, jobId) => {
    try {
        const response = await fetch(`http://127.0.0.1:5337/api/finetune_status/${jobId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get finetune status');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Get finetune status error:', error);
        return { error: error.message };
    }
});

ipcMain.handle('save-generated-image', async (event, blob, folderPath, filename) => {
    try {
        const buffer = Buffer.from(await blob.arrayBuffer());
        const fullPath = path.join(folderPath, filename);
        await fsPromises.writeFile(fullPath, buffer);
        return { success: true, path: fullPath };
    } catch (error) {
        console.error('Error saving generated image:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('compile-latex', async (_event, texPath, opts) => {
  const { spawnSync } = require('child_process');
  const path = require('path');

  console.log('[LATEX] compile-latex called with:', texPath, opts);

  const engine = opts?.engine || 'pdflatex';

  const args = [
    '-interaction=nonstopmode',
    '-halt-on-error',
    '-file-line-error',
    texPath
  ];

  if (opts?.shellEscape) args.unshift('-shell-escape');

  console.log('[LATEX] Running first pass:', engine, args);
  const first = spawnSync(engine, args, { encoding: 'utf8' });
  console.log('[LATEX] First pass stdout:', first.stdout);
  console.log('[LATEX] First pass stderr:', first.stderr);

  if (opts?.bibtex) {
    const base = texPath.replace(/\.tex$/, '');
    console.log('[LATEX] Running bibtex on:', base);
    const bib = spawnSync('bibtex', [base], { encoding: 'utf8' });
    console.log('[LATEX] Bibtex stdout:', bib.stdout);
    console.log('[LATEX] Bibtex stderr:', bib.stderr);
  }

  console.log('[LATEX] Running second pass:', engine, args);
  const result = spawnSync(engine, args, { encoding: 'utf8' });
  console.log('[LATEX] Second pass stdout:', result.stdout);
  console.log('[LATEX] Second pass stderr:', result.stderr);

  const pdfPath = texPath.replace(/\.tex$/, '.pdf');
  const ok = result.status === 0;

  console.log('[LATEX] DONE. Status:', ok ? 'OK' : 'ERROR', 'PDF:', pdfPath);

  return {
    ok,
    pdfPath,
    error: !ok ? result.stderr : null
  };
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

      const response = await fetch(url);

      if (!response.ok) {
          const errorText = await response.text();
          log(`Error fetching image models: ${response.status} ${response.statusText} - ${errorText}`);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      // <--- CRITICAL FIX: Ensure data.models is an array before attempting to push
      if (!Array.isArray(data.models)) {
          log('Warning: Backend /api/image_models did not return an array for data.models. Initializing as empty array.');
          data.models = [];
      }
      
      log('Received image models:', data.models?.length);
      

      return data; // This `data` object now contains the combined list from Python
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
  if (!pty) {
    return { success: false, error: 'Terminal functionality not available' };
  }

  if (ptyKillTimers.has(id)) {
    clearTimeout(ptyKillTimers.get(id));
    ptyKillTimers.delete(id);
    
    if (ptySessions.has(id)) {
      return { success: true };
    }
  }

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
      ptySessions.delete(id);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-closed', { id });
      }
    });

    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('closeTerminalSession', (event, id) => {
  if (!pty) {
    return { success: false, error: 'Terminal functionality not available' };
  }

  if (ptySessions.has(id)) {
    if (ptyKillTimers.has(id)) return { success: true };

    const timer = setTimeout(() => {
      if (ptySessions.has(id)) {
        ptySessions.get(id).kill();
      }
      ptyKillTimers.delete(id);
    }, 100);

    ptyKillTimers.set(id, timer);
  }
  return { success: true };
});

ipcMain.handle('writeToTerminal', (event, { id, data }) => {
  if (!pty) {
    return { success: false, error: 'Terminal functionality not available' };
  }

  const ptyProcess = ptySessions.get(id);

  if (ptyProcess) {
    ptyProcess.write(data);
    return { success: true };
  } else {
    return { success: false, error: 'Session not found in backend' };
  }
});

ipcMain.handle('resizeTerminal', (event, { id, cols, rows }) => {
  if (!pty) {
    return { success: false, error: 'Terminal functionality not available' };
  }

  const ptyProcess = ptySessions.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else {
    return { success: false, error: 'Session not found' };
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
     

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Error parsing JSON response:', err);
        return { conversations: [], error: 'Invalid JSON response' };
      }

     

     
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
            ch.reasoning_content,
            ch.tool_calls,
            ch.tool_results,
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

                }
            }

            // Parse tool_calls and tool_results JSON
            let toolCalls = null;
            let toolResults = null;
            if (row.tool_calls) {
                try {
                    toolCalls = JSON.parse(row.tool_calls);
                } catch (e) {}
            }
            if (row.tool_results) {
                try {
                    toolResults = JSON.parse(row.tool_results);
                } catch (e) {}
            }

            const newRow = {
                ...row,
                attachments,
                content,
                reasoningContent: row.reasoning_content,
                toolCalls,
                toolResults
            };
            delete newRow.attachments_json;
            delete newRow.reasoning_content;
            delete newRow.tool_calls;
            delete newRow.tool_results;
            return newRow;
        });

        resolve(messages);
      });
    });
});
} );


    ipcMain.handle('getDefaultConfig', () => {
   
    console.log('CONFIG:', DEFAULT_CONFIG);
    return DEFAULT_CONFIG;

  });

  ipcMain.handle('getWorkingDirectory', () => {
   
    return DEFAULT_CONFIG.baseDir;
  });

  ipcMain.handle('setWorkingDirectory', async (_, dir) => {
   
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

  ipcMain.handle('text-predict', async (event, data) => {
  const currentStreamId = data.streamId || generateId();
  log(`[Main] text-predict: Starting stream ${currentStreamId}`);

  try {
    const apiUrl = 'http://127.0.0.1:5337/api/text_predict';

    const payload = {
      streamId: currentStreamId,
      text_content: data.text_content,        // FIXED
      cursor_position: data.cursor_position,
      currentPath: data.currentPath,
      model: data.model,
      provider: data.provider,
      context_type: data.context_type,
      file_path: data.file_path
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    log(`[Main] Backend status ${response.status} for stream ${currentStreamId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const stream = response.body;
    if (!stream) {
      event.sender.send('stream-error', {
        streamId: currentStreamId,
        error: 'No stream body returned from backend.'
      });
      return { error: 'No stream body', streamId: currentStreamId };
    }

    activeStreams.set(currentStreamId, { stream, eventSender: event.sender });

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
        log(`[Main] Stream ${capturedStreamId} ended.`);
        if (!event.sender.isDestroyed()) {
          event.sender.send('stream-complete', { streamId: capturedStreamId });
        }
        activeStreams.delete(capturedStreamId);
      });

      stream.on('error', err => {
        log(`[Main] Stream ${capturedStreamId} error: ${err.message}`);
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
    log(`[Main] Error setting up text prediction stream ${currentStreamId}:`, err.message);
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('stream-error', {
        streamId: currentStreamId,
        error: err.message
      });
    }
    return { error: err.message, streamId: currentStreamId };
  }
});



ipcMain.handle('readDirectoryStructure', async (_, dirPath) => {
  const allowedExtensions = ['.py', 
                             '.md', 
                             '.js', 
                             '.jsx', 
                             '.docx', 
                             '.csv', 
                             '.xlsx', 
                             '.doc', 
                             '.xlsx', 
                             '.tsx', 
                             '.ts', 
                             '.json', 
                             '.txt', 
                             '.tex', 
                             '.bib', 
                             '.pptx', 
                             '.yaml', 
                             '.yml', 
                             '.html', 
                             '.css', 
                             '.npc', 
                             '.jinx', 
                             '.pdf',
                             '.csv',
                             '.sh',
                             '.ctx',
                             '.cpp',
                             '.c',
                             '.r',
                             '.json',
                             '.jpg',
                             '.jpeg',
                             '.png',
                             '.gif',
                             '.webp',
                             '.bmp',
                             '.svg',
                            ];
  
  const ignorePatterns = ['node_modules', '.git', '.DS_Store'];

  async function readDirRecursive(currentPath) {
    const result = {};
    const items = await fsPromises.readdir(currentPath, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && ignorePatterns.includes(item.name)) {
        console.log(`[Main Process] Ignoring directory: ${path.join(currentPath, item.name)}`);
        continue; 
      }

      const itemPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        // Recursively read children
        result[item.name] = {
          type: 'directory',
          path: itemPath,
          children: await readDirRecursive(itemPath)
        };
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          result[item.name] = {
            type: 'file',
            path: itemPath
          };
        }
      }
    }
    return result;
  }

  try {
    await fsPromises.access(dirPath, fs.constants.R_OK);
    return await readDirRecursive(dirPath);
  } catch (err) {
    console.error(`[Main Process] Error in readDirectoryStructure for ${dirPath}:`, err);
    if (err.code === 'ENOENT') return { error: 'Directory not found' };
    if (err.code === 'EACCES') return { error: 'Permission denied' };
    return { error: err.message || 'Failed to read directory contents' };
  }
});

  ipcMain.handle('goUpDirectory', async (_, currentPath) => {
   
    if (!currentPath) {
      console.log('No current path, returning base dir');
      return DEFAULT_CONFIG.baseDir;
    }
    const parentPath = path.dirname(currentPath);
    console.log('Parent path:', parentPath);
    return parentPath;
  });

  ipcMain.handle('readDirectory', async (_, dir) => {
   
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

ipcMain.handle('init-project-team', async (event, projectPath) => {
  if (!projectPath) return { error: 'Path is required' };
  const url = `http://127.0.0.1:5337/api/context/project/init`;
  return await callBackendApi(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: projectPath }),
  });
});

ipcMain.handle('create-directory', async (_, directoryPath) => {
  try {
   
    await fsPromises.mkdir(directoryPath);
    return { success: true, error: null };
  } catch (err) {
    console.error('Error creating directory:', err);
   
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
                await readDir(fullPath);
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

// Disk usage analyzer handler
ipcMain.handle('analyze-disk-usage', async (_, folderPath) => {
    try {
        const analyzePath = async (currentPath, depth = 0, maxDepth = 3) => {
            const stats = await fsPromises.stat(currentPath);
            const name = path.basename(currentPath);

            if (stats.isFile()) {
                return {
                    name,
                    path: currentPath,
                    type: 'file',
                    size: stats.size
                };
            }

            if (stats.isDirectory()) {
                let children = [];
                let totalSize = 0;
                let fileCount = 0;
                let folderCount = 0;

                try {
                    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });

                    // Only go deeper if we haven't hit max depth
                    if (depth < maxDepth) {
                        for (const entry of entries) {
                            const childPath = path.join(currentPath, entry.name);
                            try {
                                const childResult = await analyzePath(childPath, depth + 1, maxDepth);
                                if (childResult) {
                                    children.push(childResult);
                                    totalSize += childResult.size || 0;
                                    if (childResult.type === 'file') {
                                        fileCount++;
                                    } else {
                                        folderCount++;
                                        fileCount += childResult.fileCount || 0;
                                        folderCount += childResult.folderCount || 0;
                                    }
                                }
                            } catch (childErr) {
                                // Skip inaccessible files/folders
                                console.warn(`Skipping inaccessible: ${childPath}`);
                            }
                        }
                    } else {
                        // At max depth, just count sizes without going deeper
                        for (const entry of entries) {
                            const childPath = path.join(currentPath, entry.name);
                            try {
                                const childStats = await fsPromises.stat(childPath);
                                if (childStats.isFile()) {
                                    totalSize += childStats.size;
                                    fileCount++;
                                } else if (childStats.isDirectory()) {
                                    folderCount++;
                                }
                            } catch (e) {
                                // Skip inaccessible
                            }
                        }
                    }
                } catch (readErr) {
                    console.warn(`Cannot read directory: ${currentPath}`);
                }

                // Sort children by size (largest first)
                children.sort((a, b) => (b.size || 0) - (a.size || 0));

                return {
                    name,
                    path: currentPath,
                    type: 'folder',
                    size: totalSize,
                    fileCount,
                    folderCount,
                    children
                };
            }

            return null;
        };

        const result = await analyzePath(folderPath, 0, 3);
        return result;
    } catch (err) {
        console.error('Error analyzing disk usage:', err);
        throw err;
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
  }
);
