const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose all API functions through contextBridge
contextBridge.exposeInMainWorld('api', {
    // Directory operations
    getDefaultConfig: () => ipcRenderer.invoke('getDefaultConfig'),
    readDirectoryStructure: (dirPath) => ipcRenderer.invoke('readDirectoryStructure', dirPath),
    goUpDirectory: (currentPath) => ipcRenderer.invoke('goUpDirectory', currentPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('readDirectory', dirPath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('ensureDirectory', dirPath),
    readDirectoryImages: (dirPath) => ipcRenderer.invoke('readDirectoryImages', dirPath),
    open_directory_picker: () => ipcRenderer.invoke('open_directory_picker'),

    // Conversation operations
    getConversations: (path) => ipcRenderer.invoke('getConversations', path),
    getConversationsInDirectory: (path) => ipcRenderer.invoke('getConversationsInDirectory', path),
    getConversationMessages: (id) => ipcRenderer.invoke('getConversationMessages', id),
    createConversation: (data) => ipcRenderer.invoke('createConversation', data),
    sendMessage: (data) => ipcRenderer.invoke('sendMessage', data),
    waitForScreenshot: (path) => ipcRenderer.invoke('wait-for-screenshot', path),
    saveNPC: (data) => ipcRenderer.invoke('save-npc', data),

    // File operations
    readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
    writeFileContent: (filePath, content) => ipcRenderer.invoke('write-file-content', filePath, content),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('renameFile', oldPath, newPath),

// Command operations
    executeCommand: (data) => ipcRenderer.invoke('executeCommand', {
        commandstr: data.commandstr,
        current_path: data.currentPath,
        conversationId: data.conversationId,
        model: data.model,
        provider:data.provider,
        npc: data.npc,
    }),
    executeCommandStream: (data) => ipcRenderer.invoke('executeCommandStream', data),
    onStreamData: (callback) => {
        // The callback will receive (event, { streamId, chunk })
        ipcRenderer.on('stream-data', callback);
        return () => ipcRenderer.removeListener('stream-data', callback);
    },
    
    onStreamComplete: (callback) => ipcRenderer.on('stream-complete', callback),
    onStreamError: (callback) => ipcRenderer.on('stream-error', callback),
    interruptStream: async (streamIdToInterrupt) => {
        try {
            await ipcRenderer.invoke('interruptStream', streamIdToInterrupt);
            console.log('Stream interrupted successfully');
        } catch (error) {
            console.error('Error interrupting stream:', error);
            throw error;
        }
    },



    checkFileExists: async (path) => {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    },

    showPromptDialog: (options) => ipcRenderer.invoke('showPromptDialog', options),

    getJinxsGlobal: async () => {
        try {
            const response = await fetch('http://127.0.0.1:5337/api/jinxs/global');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('API returned jinxs data:', data); // Debug what's returned
            return data; 
        } catch (error) {
            console.error('Error loading global jinxs:', error);
            return { jinxs: [], error: error.message };
        }
    },
    getJinxsProject: async (currentPath) => {
        try {
            const response = await fetch(`http://127.0.0.1:5337/api/jinxs/project?currentPath=${encodeURIComponent(currentPath)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('API returned project jinxs data:', data); // Debug what's returned
            return data;
        } catch (error) {
            console.error('Error loading project jinxs:', error);
            return { jinxs: [], error: error.message };
        }
    },
    saveJinx: (data) => ipcRenderer.invoke('save-jinx', data),

    getNPCTeamProject: async (currentPath) => {
        if (!currentPath || typeof currentPath !== 'string') {
          throw new Error('currentPath must be a string');
        }
        return await ipcRenderer.invoke('getNPCTeamProject', currentPath);
      },
    getMessageAttachments: (messageId) => ipcRenderer.invoke('get-message-attachments', messageId),
    getAttachment: (attachmentId) => ipcRenderer.invoke('get-attachment', attachmentId),

    getNPCTeamGlobal: () => ipcRenderer.invoke('getNPCTeamGlobal'),
    checkServerConnection: () => ipcRenderer.invoke('checkServerConnection'),
    getWorkingDirectory: () => ipcRenderer.invoke('getWorkingDirectory'),
    setWorkingDirectory: (dir) => ipcRenderer.invoke('setWorkingDirectory', dir),
    deleteConversation: (id) => ipcRenderer.invoke('deleteConversation', id),
    convertFileToBase64: (path) => ipcRenderer.invoke('convertFileToBase64', path),
    get_attachment_response: (attachmentData, conversationId) =>
        ipcRenderer.invoke('get_attachment_response', attachmentData, conversationId),
    updateShortcut: (shortcut) => ipcRenderer.invoke('update-shortcut', shortcut),
    onShowMacroInput: (callback) => {
      ipcRenderer.on('show-macro-input', callback);
      return () => ipcRenderer.removeListener('show-macro-input', callback);
    },
    submitMacro: (macro) => ipcRenderer.invoke('submit-macro', macro),
    captureScreenshot: async () => {
        console.log('PRELOAD: Capture screenshot called');  // This should show up
        try {
            const result = await ipcRenderer.invoke('captureScreenshot');
            console.log('PRELOAD: Got result:', result);
            return result;
        } catch (error) {
            console.error('PRELOAD: Screenshot error:', error);
            throw error;
        }
    },
    onScreenshotCaptured: (callback) => {
        const wrappedCallback = (_, data) => callback(data);
        ipcRenderer.on('screenshot-captured', wrappedCallback);
        return () => ipcRenderer.removeListener('screenshot-captured', wrappedCallback);
    },
    loadGlobalSettings: () => ipcRenderer.invoke('loadGlobalSettings'),
    getAvailableModels: (currentPath) => ipcRenderer.invoke('getAvailableModels', currentPath),

    // Shell operationss
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});