const serializeWorkspace = useCallback(() => {
    if (!rootLayoutNode || !currentPath) {
        console.log('[SERIALIZE] Skipping - no layout or path');
        return null;
    }
    
    console.log('[SERIALIZE] Starting serialization');
    console.log('[SERIALIZE] contentDataRef keys:', Object.keys(contentDataRef.current));
    console.log('[SERIALIZE] rootLayoutNode:', rootLayoutNode);
    
    const serializedContentData = {};
    Object.entries(contentDataRef.current).forEach(([paneId, paneData]) => {
        serializedContentData[paneId] = {
            contentType: paneData.contentType,
            contentId: paneData.contentId,
            displayedMessageCount: paneData.chatMessages?.displayedMessageCount,
            browserUrl: paneData.browserUrl,
            fileChanged: paneData.fileChanged
        };
    });
    
    console.log('[SERIALIZE] Serialized pane count:', Object.keys(serializedContentData).length);
    
    return {
        layoutNode: rootLayoutNode,
        contentData: serializedContentData,
        activeContentPaneId,
        timestamp: Date.now()
    };
}, [rootLayoutNode, currentPath, activeContentPaneId]);

const deserializeWorkspace = useCallback(async (workspaceData) => {
    if (!workspaceData) return false;
    
    setIsLoadingWorkspace(true);
    
    try {
        const newRootLayout = workspaceData.layoutNode;
        
        console.log('[DESERIALIZE] Starting workspace restore', {
            paneCount: Object.keys(workspaceData.contentData).length,
            layoutExists: !!newRootLayout
        });
        
        // CRITICAL FIX: Clear contentDataRef COMPLETELY first
        contentDataRef.current = {};
        
        // Collect all pane IDs from layout
        const paneIdsInLayout = new Set();
        const collectPaneIds = (node) => {
            if (!node) return;
            if (node.type === 'content') paneIdsInLayout.add(node.id);
            if (node.type === 'split') {
                node.children.forEach(collectPaneIds);
            }
        };
        collectPaneIds(newRootLayout);
        
        console.log('[DESERIALIZE] Panes in layout:', Array.from(paneIdsInLayout));
        console.log('[DESERIALIZE] Panes in saved data:', Object.keys(workspaceData.contentData));
        
        // FIX: Populate contentDataRef synchronously BEFORE any async operations
        paneIdsInLayout.forEach(paneId => {
            const paneData = workspaceData.contentData[paneId];
            contentDataRef.current[paneId] = {
                contentType: paneData?.contentType,
                contentId: paneData?.contentId,
                displayedMessageCount: paneData?.displayedMessageCount,
                browserUrl: paneData?.browserUrl,
                fileChanged: paneData?.fileChanged || false
            };
        });
        
        console.log('[DESERIALIZE] Initialized contentDataRef with', Object.keys(contentDataRef.current).length, 'panes');
        
        // NOW set the layout - at this point contentDataRef is already populated
        setRootLayoutNode(newRootLayout);
        setActiveContentPaneId(workspaceData.activeContentPaneId);
        
        // THEN load the actual content asynchronously
        const loadPromises = [];
        for (const [paneId, paneData] of Object.entries(workspaceData.contentData)) {
            if (!paneIdsInLayout.has(paneId)) continue;
            
            console.log('[DESERIALIZE] Loading content for pane:', paneId, paneData.contentType, paneData.contentId);
            
            const loadPromise = (async () => {
                try {
                    const paneDataRef = contentDataRef.current[paneId];
                    
                    if (paneData.contentType === 'editor') {
                        const response = await window.api.readFileContent(paneData.contentId);
                        paneDataRef.fileContent = response.error ? `Error: ${response.error}` : response.content;
                    } else if (paneData.contentType === 'chat') {
                        paneDataRef.chatMessages = { 
                            messages: [], 
                            allMessages: [], 
                            displayedMessageCount: paneData.displayedMessageCount || 20 
                        };
                        
                        const msgs = await window.api.getConversationMessages(paneData.contentId);
                        const formatted = (msgs && Array.isArray(msgs))
                            ? msgs.map(m => ({ ...m, id: m.id || generateId() }))
                            : [];

                        paneDataRef.chatMessages.allMessages = formatted;
                        paneDataRef.chatMessages.messages = formatted.slice(-paneDataRef.chatMessages.displayedMessageCount);
                        paneDataRef.chatStats = getConversationStats(formatted);
                    } else if (paneData.contentType === 'browser') {
                        paneDataRef.browserUrl = paneData.browserUrl || paneData.contentId;
                    }
                    
                    console.log('[DESERIALIZE] Successfully loaded pane:', paneId);
                } catch (err) {
                    console.error('[DESERIALIZE] Error loading pane content:', paneId, err);
                }
            })();
            
            loadPromises.push(loadPromise);
        }
        
        // Wait for all content to load
        await Promise.all(loadPromises);
        
        // Force final re-render with all content loaded
        setRootLayoutNode(prev => ({ ...prev }));
        
        console.log('[DESERIALIZE] Workspace restored successfully', {
            paneCount: Object.keys(contentDataRef.current).length,
            layoutPanes: paneIdsInLayout.size
        });
        
        return true;
    } catch (error) {
        console.error('[DESERIALIZE] Error restoring workspace:', error);
        contentDataRef.current = {}; 
        setRootLayoutNode(null); 
        setActiveContentPaneId(null);
        return false;
    } finally {
        setIsLoadingWorkspace(false);
    }
}, []);

const saveWorkspaceToStorage = useCallback((path, workspaceData) => {
    try {
        console.log('[SAVE_WORKSPACE] Saving for path:', path);
        console.log('[SAVE_WORKSPACE] Received workspaceData:', {
            hasLayout: !!workspaceData.layoutNode,
            paneCount: Object.keys(workspaceData.contentData || {}).length,
            layoutNodeId: workspaceData.layoutNode?.id,
            contentDataKeys: Object.keys(workspaceData.contentData || {})
        });
        console.log('[SAVE_WORKSPACE] Called from:');
        console.trace();  // This will show the call stack
        
        console.log('[SAVE_WORKSPACE] Saving for path:', path);

        
        // Use path-based storage instead of window-based
        const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
        
        allWorkspaces[path] = {
            ...workspaceData,
            lastAccessed: Date.now()
        };
        
        // Keep only the 20 most recently accessed workspaces
        const workspaceEntries = Object.entries(allWorkspaces);
        if (workspaceEntries.length > 20) {
            workspaceEntries.sort((a, b) => (b[1].lastAccessed || 0) - (a[1].lastAccessed || 0));
            const top20 = Object.fromEntries(workspaceEntries.slice(0, 20));
            localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(top20));
        } else {
            localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(allWorkspaces));
        }
        
        console.log('[SAVE_WORKSPACE] Successfully saved for path:', path);
    } catch (error) {
        console.error('[SAVE_WORKSPACE] Error saving workspace:', error);
    }
}, []);

// Update loadWorkspaceFromStorage
const loadWorkspaceFromStorage = useCallback((path) => {
    try {
        console.log('[LOAD_WORKSPACE] Attempting to load for path:', path);
        
        const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
        console.log('[LOAD_WORKSPACE] All workspace paths in storage:', Object.keys(allWorkspaces));
        
        const workspace = allWorkspaces[path];
        console.log('[LOAD_WORKSPACE] Found workspace for path:', !!workspace);
        
        if (workspace) {
            console.log('[LOAD_WORKSPACE] Workspace details:', {
                hasLayout: !!workspace.layoutNode,
                paneCount: Object.keys(workspace.contentData || {}).length,
                timestamp: workspace.timestamp
            });
        }
        
        return workspace || null;
    } catch (error) {
        console.error('[LOAD_WORKSPACE] Error loading workspace:', error);
        return null;
    }
}, []);

const createDefaultWorkspace = useCallback(async () => {
    const initialPaneId = generateId();
    const initialLayout = { id: initialPaneId, type: 'content' };
    
    contentDataRef.current[initialPaneId] = {};
    
    // Try to use stored conversation ID or create new one
    const storedConvoId = localStorage.getItem(LAST_ACTIVE_CONVO_ID_KEY);
    const currentConvos = directoryConversationsRef.current;
    
    let targetConvoId = null;
    if (storedConvoId && currentConvos.find(c => c.id === storedConvoId)) {
        targetConvoId = storedConvoId;
    } else if (currentConvos.length > 0) {
        targetConvoId = currentConvos[0].id;
    }
    
    if (targetConvoId) {
        await updateContentPane(initialPaneId, 'chat', targetConvoId);
    } else {
        // Create new conversation if none exist
        const newConversation = await window.api.createConversation({ directory_path: currentPath });
        if (newConversation?.id) {
            await updateContentPane(initialPaneId, 'chat', newConversation.id, true);
            setActiveConversationId(newConversation.id);
        }
    }
    
    setRootLayoutNode(initialLayout);
    setActiveContentPaneId(initialPaneId);
}, [updateContentPane, currentPath]);

    const updateActivity = () => {
        try {
            const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
            if (activeWindows[windowId]) {
                activeWindows[windowId].lastActive = Date.now();
                activeWindows[windowId].currentPath = currentPath || '';
                localStorage.setItem(ACTIVE_WINDOWS_KEY, JSON.stringify(activeWindows));
            }
        } catch (error) {
            console.error('Error updating window activity:', error);
        }
    };

