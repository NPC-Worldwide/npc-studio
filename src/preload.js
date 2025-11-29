const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {
textPredict: (data) => ipcRenderer.invoke('text-predict', data),

readCsvContent: (filePath) => 
  ipcRenderer.invoke('read-csv-content', filePath),

readFileBuffer: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),
readDocxContent: (filePath) => 
  ipcRenderer.invoke('read-docx-content', filePath),
    getDefaultConfig: () => ipcRenderer.invoke('getDefaultConfig'),
    readDirectoryStructure: (dirPath) => ipcRenderer.invoke('readDirectoryStructure', dirPath),
    goUpDirectory: (currentPath) => ipcRenderer.invoke('goUpDirectory', currentPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('readDirectory', dirPath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('ensureDirectory', dirPath),
    readDirectoryImages: (dirPath) => ipcRenderer.invoke('readDirectoryImages', dirPath),
    open_directory_picker: () => ipcRenderer.invoke('open_directory_picker'),

    getAvailableJinxs: (params) => ipcRenderer.invoke('getAvailableJinxs', params),
    executeJinx: (params) => ipcRenderer.invoke('executeJinx', params),

    getAvailableImageModels: (currentPath) => ipcRenderer.invoke('getAvailableImageModels', currentPath),
    getCronDaemons: (currentPath) => ipcRenderer.invoke('getCronDaemons', currentPath),
    addCronJob: (params) => ipcRenderer.invoke('addCronJob', params),
    removeCronJob: (jobId) => ipcRenderer.invoke('removeCronJob', jobId),
    addDaemon: (params) => ipcRenderer.invoke('addDaemon', params),
    removeDaemon: (daemonId) => ipcRenderer.invoke('removeDaemon', daemonId),

   
    generateImages: (prompt, n, model, provider, attachments, baseFilename, currentPath) => ipcRenderer.invoke('generate_images', { prompt, n, model, provider, attachments, baseFilename,currentPath}),

    openNewWindow: (path) => ipcRenderer.invoke('open-new-window', path),

   
    deleteConversation: (id) => ipcRenderer.invoke('deleteConversation', id),
    getConversations: (path) => ipcRenderer.invoke('getConversations', path),
    getConversationsInDirectory: (path) => ipcRenderer.invoke('getConversationsInDirectory', path),
    getConversationMessages: (id) => ipcRenderer.invoke('getConversationMessages', id),
    createConversation: (data) => ipcRenderer.invoke('createConversation', data),
    sendMessage: (data) => ipcRenderer.invoke('sendMessage', data),
    waitForScreenshot: (path) => ipcRenderer.invoke('wait-for-screenshot', path),
    saveNPC: (data) => ipcRenderer.invoke('save-npc', data),
    gitStatus: (repoPath) => ipcRenderer.invoke('gitStatus', repoPath),
    gitStageFile: (repoPath, file) => ipcRenderer.invoke('gitStageFile', repoPath, file),
    gitUnstageFile: (repoPath, file) => ipcRenderer.invoke('gitUnstageFile', repoPath, file),
    gitCommit: (repoPath, message) => ipcRenderer.invoke('gitCommit', repoPath, message),
    gitPull: (repoPath) => ipcRenderer.invoke('gitPull', repoPath),
    gitPush: (repoPath) => ipcRenderer.invoke('gitPush', repoPath),

    readFile: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),
   
    readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
    writeFileContent: (filePath, content) => ipcRenderer.invoke('write-file-content', filePath, content),
    createDirectory: (path) => ipcRenderer.invoke('create-directory', path),
    deleteDirectory: (path) => ipcRenderer.invoke('delete-directory', path),
    getDirectoryContentsRecursive: (path) => ipcRenderer.invoke('get-directory-contents-recursive', path),
    analyzeDiskUsage: (path) => ipcRenderer.invoke('analyze-disk-usage', path),
    showPdf: (args) => ipcRenderer.send('show-pdf', args),
    updatePdfBounds: (bounds) => ipcRenderer.send('update-pdf-bounds', bounds),
    hidePdf: (filePath) => ipcRenderer.send('hide-pdf', filePath),
    browserNavigate: (args) => ipcRenderer.invoke('browser-navigate', args),
    browserBack: (args) => ipcRenderer.invoke('browser-back', args),
    browserForward: (args) => ipcRenderer.invoke('browser-forward', args),
    browserRefresh: (args) => ipcRenderer.invoke('browser-refresh', args),
    browserGetSelectedText: (args) => ipcRenderer.invoke('browser-get-selected-text', args),
    browserAddToHistory: (args) => ipcRenderer.invoke('browser:addToHistory', args),
    browserGetHistory: (args) => ipcRenderer.invoke('browser:getHistory', args),
    browserAddBookmark: (args) => ipcRenderer.invoke('browser:addBookmark', args),
    browserGetBookmarks: (args) => ipcRenderer.invoke('browser:getBookmarks', args),
    browserDeleteBookmark: (args) => ipcRenderer.invoke('browser:deleteBookmark', args),
    browserClearHistory: (args) => ipcRenderer.invoke('browser:clearHistory', args),
    browserGetHistoryGraph: (args) => ipcRenderer.invoke('browser:getHistoryGraph', args),
    browserSetVisibility: (args) => ipcRenderer.invoke('browser:set-visibility', args),

   
    onBrowserLoaded: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-loaded', handler);
        return () => ipcRenderer.removeListener('browser-loaded', handler);
    },
    onBrowserLoading: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-loading', handler);
        return () => ipcRenderer.removeListener('browser-loading', handler);
    },
    onBrowserTitleUpdated: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-title-updated', handler);
        return () => ipcRenderer.removeListener('browser-title-updated', handler);
    },
    onBrowserLoadError: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-load-error', handler);
        return () => ipcRenderer.removeListener('browser-load-error', handler);
    },
    onBrowserNavigationStateUpdated: (callback) => { // Expose new event
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-navigation-state-updated', handler);
        return () => ipcRenderer.removeListener('browser-navigation-state-updated', handler);
    },
    

    
    onThumbnailCreated: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('thumbnail-created', handler);
        return () => ipcRenderer.removeListener('thumbnail-created', handler);
    },
    onThumbnailError: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('thumbnail-error', handler);
        return () => ipcRenderer.removeListener('thumbnail-error', handler);
    },
    onThumbnailComplete: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('thumbnail-complete', handler);
        return () => ipcRenderer.removeListener('thumbnail-complete', handler);
    },
    
    
    getHighlightsForFile: (filePath) => ipcRenderer.invoke('db:getHighlightsForFile', { filePath }),
    addPdfHighlight: (data) => ipcRenderer.invoke('db:addPdfHighlight', data),

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
    deleteMessage: (params) => ipcRenderer.invoke('deleteMessage', params),

    listTables: () => ipcRenderer.invoke('db:listTables'),
    getTableSchema: (args) => ipcRenderer.invoke('db:getTableSchema', args),
    exportToCSV: (data) => ipcRenderer.invoke('db:exportCSV', data),

    // Custom database connection APIs (supports SQLite, PostgreSQL, MySQL, MSSQL, Snowflake)
    testDbConnection: (args) => ipcRenderer.invoke('db:testConnection', args),
    listTablesForPath: (args) => ipcRenderer.invoke('db:listTablesForPath', args),
    getTableSchemaForPath: (args) => ipcRenderer.invoke('db:getTableSchemaForPath', args),
    executeSQLForPath: (args) => ipcRenderer.invoke('db:executeSQLForPath', args),
    browseForDatabase: () => ipcRenderer.invoke('db:browseForDatabase'),
    getSupportedDbTypes: () => ipcRenderer.invoke('db:getSupportedTypes'),

    getLastUsedInDirectory: (path) => ipcRenderer.invoke('get-last-used-in-directory', path),
    getLastUsedInConversation: (conversationId) => ipcRenderer.invoke('get-last-used-in-conversation', conversationId),

    kg_getGraphData: (args) => ipcRenderer.invoke('kg:getGraphData', args),
    kg_listGenerations: () => ipcRenderer.invoke('kg:listGenerations'),
    kg_triggerProcess: (args) => ipcRenderer.invoke('kg:triggerProcess', args),
    kg_rollback: (args) => ipcRenderer.invoke('kg:rollback', args),
    kg_getNetworkStats: (args) => ipcRenderer.invoke('kg:getNetworkStats', args),
    kg_getCooccurrenceNetwork: (args) => ipcRenderer.invoke('kg:getCooccurrenceNetwork', args),
    kg_getCentralityData: (args) => ipcRenderer.invoke('kg:getCentralityData', args),
    kg_addNode: (args) => ipcRenderer.invoke('kg:addNode', args),
    kg_updateNode: (args) => ipcRenderer.invoke('kg:updateNode', args),
    kg_deleteNode: (args) => ipcRenderer.invoke('kg:deleteNode', args),
    kg_addEdge: (args) => ipcRenderer.invoke('kg:addEdge', args),
    kg_deleteEdge: (args) => ipcRenderer.invoke('kg:deleteEdge', args),

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

    // MCP server management
    getMcpServers: (currentPath) => ipcRenderer.invoke('mcp:getServers', { currentPath }),
    startMcpServer: (args) => ipcRenderer.invoke('mcp:startServer', args),
    stopMcpServer: (args) => ipcRenderer.invoke('mcp:stopServer', args),
    getMcpStatus: (args) => ipcRenderer.invoke('mcp:status', args),
    listMcpTools: (args) => ipcRenderer.invoke('mcp:listTools', args),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showBrowser: (args) => ipcRenderer.invoke('show-browser', args),
    hideBrowser: (args) => ipcRenderer.invoke('hide-browser', args),
    updateBrowserBounds: (args) => ipcRenderer.invoke('update-browser-bounds', args),
    getBrowserHistory: (folderPath) => ipcRenderer.invoke('get-browser-history', folderPath),
    browserAddToHistory: (data) => ipcRenderer.invoke('browser-add-to-history', data),
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

    // Mapx (Mind Map) APIs - YAML-based storage like NPCs/Jinxs
    getMapsGlobal: async () => {
        try {
            const response = await fetch('http://127.0.0.1:5337/api/maps/global');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading global maps:', error);
            return { maps: [], error: error.message };
        }
    },
    getMapsProject: async (currentPath) => {
        try {
            const response = await fetch(`http://127.0.0.1:5337/api/maps/project?currentPath=${encodeURIComponent(currentPath)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error loading project maps:', error);
            return { maps: [], error: error.message };
        }
    },
    saveMap: (data) => ipcRenderer.invoke('save-map', data),
    loadMap: (filePath) => ipcRenderer.invoke('load-map', filePath),

    // SQL Models APIs (dbt-style npcsql with jinja syntax)
    getSqlModelsGlobal: () => ipcRenderer.invoke('getSqlModelsGlobal'),
    getSqlModelsProject: (currentPath) => ipcRenderer.invoke('getSqlModelsProject', currentPath),
    saveSqlModelGlobal: (modelData) => ipcRenderer.invoke('saveSqlModelGlobal', modelData),
    saveSqlModelProject: (args) => ipcRenderer.invoke('saveSqlModelProject', args),
    deleteSqlModelGlobal: (modelId) => ipcRenderer.invoke('deleteSqlModelGlobal', modelId),
    deleteSqlModelProject: (args) => ipcRenderer.invoke('deleteSqlModelProject', args),
    runSqlModel: (args) => ipcRenderer.invoke('runSqlModel', args),

    // Local Model Provider APIs (LM Studio, Ollama, llama.cpp)
    scanLocalModels: (provider) => ipcRenderer.invoke('scan-local-models', provider),
    getLocalModelStatus: (provider) => ipcRenderer.invoke('get-local-model-status', provider),

    // Activity Tracking for RNN predictor
    trackActivity: (activity) => ipcRenderer.invoke('track-activity', activity),
    getActivityPredictions: () => ipcRenderer.invoke('get-activity-predictions'),
    trainActivityModel: () => ipcRenderer.invoke('train-activity-model'),

    generativeFill: async (params) => {
    return ipcRenderer.invoke('generative-fill', params);
},
    fineTuneDiffusers: (params) => ipcRenderer.invoke('finetune-diffusers', params),
    getFineTuneStatus: (jobId) => ipcRenderer.invoke('get-finetune-status', jobId),
    saveGeneratedImage: (blob, folderPath, filename) => ipcRenderer.invoke('save-generated-image', blob, folderPath, filename),


getFileStats: (filePath) => ipcRenderer.invoke('getFileStats', filePath),

openFile: (path) => ipcRenderer.invoke('open-file', path),

writeFileBuffer: (path, uint8) => ipcRenderer.invoke('write-file-buffer', path, uint8),

compileLatex: (path, opts) => ipcRenderer.invoke('compile-latex', path, opts),

    getNPCTeamProject: async (currentPath) => {
        if (!currentPath || typeof currentPath !== 'string') {
          throw new Error('currentPath must be a string');
        }
        return await ipcRenderer.invoke('getNPCTeamProject', currentPath);
    },
    getNPCTeamGlobal: () => ipcRenderer.invoke('getNPCTeamGlobal'),
    onBrowserShowContextMenu: (callback) => {
        const handler = (_, data) => callback(data);
        ipcRenderer.on('browser-show-context-menu', handler);
        return () => ipcRenderer.removeListener('browser-show-context-menu', handler);
    },
    browserGetPageContent: (args) => ipcRenderer.invoke('browser-get-page-content', args),
    
   
    getMessageAttachments: (messageId) => ipcRenderer.invoke('get-message-attachments', messageId),
    getAttachment: (attachmentId) => ipcRenderer.invoke('get-attachment', attachmentId),
    get_attachment_response: (attachmentData, conversationId) =>
        ipcRenderer.invoke('get_attachment_response', attachmentData, conversationId),

   
    loadGlobalSettings: () => ipcRenderer.invoke('loadGlobalSettings'),
    saveGlobalSettings: (args) => ipcRenderer.invoke('saveGlobalSettings', args),
    loadProjectSettings: (path) => ipcRenderer.invoke('loadProjectSettings', path),
    saveProjectSettings: (args) => ipcRenderer.invoke('saveProjectSettings', args),

    getAvailableModels: (currentPath) => ipcRenderer.invoke('getAvailableModels', currentPath),
    updateShortcut: (shortcut) => ipcRenderer.invoke('update-shortcut', shortcut),

        checkOllamaStatus: () => ipcRenderer.invoke('ollama:checkStatus'),
    installOllama: () => ipcRenderer.invoke('ollama:install'),
    getLocalOllamaModels: () => ipcRenderer.invoke('ollama:getLocalModels'),
    pullOllamaModel: (args) => ipcRenderer.invoke('ollama:pullModel', args),
    deleteOllamaModel: (args) => ipcRenderer.invoke('ollama:deleteModel', args),

   
    onOllamaPullProgress: (callback) => {
        const handler = (_, progress) => callback(progress);
        ipcRenderer.on('ollama-pull-progress', handler);
        return () => ipcRenderer.removeListener('ollama-pull-progress', handler);
    },
    onOllamaPullComplete: (callback) => {
        ipcRenderer.on('ollama-pull-complete', callback);
        return () => ipcRenderer.removeListener('ollama-pull-complete', callback);
    },
    onOllamaPullError: (callback) => {
        const handler = (_, error) => callback(error);
        ipcRenderer.on('ollama-pull-error', handler);
        return () => ipcRenderer.removeListener('ollama-pull-error', handler);
    },

   
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
