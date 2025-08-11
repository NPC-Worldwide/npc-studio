const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {

    getDefaultConfig: () => ipcRenderer.invoke('getDefaultConfig'),
    readDirectoryStructure: (dirPath) => ipcRenderer.invoke('readDirectoryStructure', dirPath),
    goUpDirectory: (currentPath) => ipcRenderer.invoke('goUpDirectory', currentPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('readDirectory', dirPath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('ensureDirectory', dirPath),
    readDirectoryImages: (dirPath) => ipcRenderer.invoke('readDirectoryImages', dirPath),
    open_directory_picker: () => ipcRenderer.invoke('open_directory_picker'),

    // Conversation operations
    deleteConversation: (id) => ipcRenderer.invoke('deleteConversation', id),
    getConversations: (path) => ipcRenderer.invoke('getConversations', path),
    getConversationsInDirectory: (path) => ipcRenderer.invoke('getConversationsInDirectory', path),
    getConversationMessages: (id) => ipcRenderer.invoke('getConversationMessages', id),
    createConversation: (data) => ipcRenderer.invoke('createConversation', data),
    sendMessage: (data) => ipcRenderer.invoke('sendMessage', data),
    waitForScreenshot: (path) => ipcRenderer.invoke('wait-for-screenshot', path),
    saveNPC: (data) => ipcRenderer.invoke('save-npc', data),

    readFile: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),
    // File operations
    readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
    writeFileContent: (filePath, content) => ipcRenderer.invoke('write-file-content', filePath, content),
    createDirectory: (path) => ipcRenderer.invoke('create-directory', path), // <-- ADD THIS LINE
    deleteDirectory: (path) => ipcRenderer.invoke('delete-directory', path), // <-- ADD THIS LINE
    getDirectoryContentsRecursive: (path) => ipcRenderer.invoke('get-directory-contents-recursive', path), // <-- ADD THIS LINE
    showPdf: (args) => ipcRenderer.send('show-pdf', args),
    updatePdfBounds: (bounds) => ipcRenderer.send('update-pdf-bounds', bounds),
    hidePdf: (filePath) => ipcRenderer.send('hide-pdf', filePath),
  
      
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    renameFile: (oldPath, newPath) => ipcRenderer.invoke('renameFile', oldPath, newPath),
    getGlobalContext: () => ipcRenderer.invoke('get-global-context'),
    saveGlobalContext: (contextData) => ipcRenderer.invoke('save-global-context', contextData),
    getProjectContext: (path) => ipcRenderer.invoke('get-project-context', path),
    saveProjectContext: (data) => ipcRenderer.invoke('save-project-context', data),
    getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
    getActivityData: (options) => ipcRenderer.invoke('getActivityData', options),
    getHistogramData: () => ipcRenderer.invoke('getHistogramData'),
    executeSQL: (options) => ipcRenderer.invoke('executeSQL', options),

    listTables: () => ipcRenderer.invoke('db:listTables'),
    getTableSchema: (args) => ipcRenderer.invoke('db:getTableSchema', args),
    exportToCSV: (data) => ipcRenderer.invoke('db:exportCSV', data),

    getLastUsedInDirectory: (path) => ipcRenderer.invoke('get-last-used-in-directory', path),
    getLastUsedInConversation: (conversationId) => ipcRenderer.invoke('get-last-used-in-conversation', conversationId),

    kg_getGraphData: (args) => ipcRenderer.invoke('kg:getGraphData', args),
    kg_listGenerations: () => ipcRenderer.invoke('kg:listGenerations'),
    kg_triggerProcess: (args) => ipcRenderer.invoke('kg:triggerProcess', args),
    kg_rollback: (args) => ipcRenderer.invoke('kg:rollback', args),

    resizeTerminal: (data) => ipcRenderer.invoke('resizeTerminal', data),

        createTerminalSession: (args) => ipcRenderer.invoke('createTerminalSession', args),
    writeToTerminal: (args) => ipcRenderer.invoke('writeToTerminal', args),
    closeTerminalSession: (id) => ipcRenderer.invoke('closeTerminalSession', id),
    onTerminalData: (callback) => {
        const handler = (_, data) => callback(_, data);
        ipcRenderer.on('terminal-data', handler);
        return () => ipcRenderer.removeListener('terminal-data', handler);
    },
onTerminalClosed: (callback) => {
    const handler = (_, data) => callback(_, data);
    ipcRenderer.on('terminal-closed', handler);
    return () => ipcRenderer.removeListener('terminal-closed', handler);
},
    executeShellCommand: (args) => ipcRenderer.invoke('executeShellCommand', args),

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
    interruptStream: async (streamIdToInterrupt) => {
        try {
            await ipcRenderer.invoke('interruptStream', streamIdToInterrupt);
            console.log('Stream interrupted successfully');
        } catch (error) {
            console.error('Error interrupting stream:', error);
            throw error;
        }
    },
    
    // Stream listeners
    onStreamData: (callback) => {
        const handler = (_, data) => callback(_, data);
        ipcRenderer.on('stream-data', handler);
        return () => ipcRenderer.removeListener('stream-data', handler);
    },
    onStreamComplete: (callback) => {
        const handler = (_, data) => callback(_, data);
        ipcRenderer.on('stream-complete', handler);
        return () => ipcRenderer.removeListener('stream-complete', handler);
    },
    onStreamError: (callback) => {
        const handler = (_, data) => callback(_, data);
        ipcRenderer.on('stream-error', handler);
        return () => ipcRenderer.removeListener('stream-error', handler);
    },
    // Jinx operations
    getJinxsGlobal: async () => {
        try {
            const response = await fetch('http://127.0.0.1:5337/api/jinxs/global');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
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
            return data;
        } catch (error) {
            console.error('Error loading project jinxs:', error);
            return { jinxs: [], error: error.message };
        }
    },
    saveJinx: (data) => ipcRenderer.invoke('save-jinx', data),
    
    // NPC operations
    getNPCTeamProject: async (currentPath) => {
        if (!currentPath || typeof currentPath !== 'string') {
          throw new Error('currentPath must be a string');
        }
        return await ipcRenderer.invoke('getNPCTeamProject', currentPath);
    },
    getNPCTeamGlobal: () => ipcRenderer.invoke('getNPCTeamGlobal'),
    
    // Attachment operations
    getMessageAttachments: (messageId) => ipcRenderer.invoke('get-message-attachments', messageId),
    getAttachment: (attachmentId) => ipcRenderer.invoke('get-attachment', attachmentId),
    get_attachment_response: (attachmentData, conversationId) =>
        ipcRenderer.invoke('get_attachment_response', attachmentData, conversationId),

    // Settings & Config
    loadGlobalSettings: () => ipcRenderer.invoke('loadGlobalSettings'),
    getAvailableModels: (currentPath) => ipcRenderer.invoke('getAvailableModels', currentPath),
    updateShortcut: (shortcut) => ipcRenderer.invoke('update-shortcut', shortcut),

    // Screenshot & Macro
    onShowMacroInput: (callback) => {
      ipcRenderer.on('show-macro-input', callback);
      return () => ipcRenderer.removeListener('show-macro-input', callback);
    },
    submitMacro: (macro) => ipcRenderer.invoke('submit-macro', macro),
    onScreenshotCaptured: (callback) => {
        const wrappedCallback = (_, data) => callback(data);
        ipcRenderer.on('screenshot-captured', wrappedCallback);
        return () => ipcRenderer.removeListener('screenshot-captured', wrappedCallback);
    },

    showPromptDialog: (options) => ipcRenderer.invoke('showPromptDialog', options),
    checkServerConnection: () => ipcRenderer.invoke('checkServerConnection'),
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});