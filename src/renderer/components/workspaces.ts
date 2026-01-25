// Workspace utility functions - NO HOOKS, just pure functions

const WORKSPACES_STORAGE_KEY = 'npcStudioWorkspaces_v2';

export const serializeWorkspace = (
    rootLayoutNode: any,
    currentPath: string,
    contentDataRef: any,
    activeContentPaneId: string | null
) => {
    if (!rootLayoutNode || !currentPath) {
        return null;
    }

    const serializedContentData: Record<string, any> = {};
    Object.entries(contentDataRef).forEach(([paneId, paneData]: [string, any]) => {
        // SKIP panes without contentType - never save empty panes
        if (!paneData?.contentType) return;

        // Serialize tabs if present (strip fileContent to save space)
        const serializedTabs = paneData.tabs?.map((tab: any) => ({
            id: tab.id,
            contentType: tab.contentType,
            contentId: tab.contentId,
            browserUrl: tab.browserUrl,
            title: tab.title,
            fileChanged: tab.fileChanged
            // Note: fileContent is NOT saved - will be reloaded on restore
        }));

        serializedContentData[paneId] = {
            contentType: paneData.contentType,
            contentId: paneData.contentId,
            displayedMessageCount: paneData.chatMessages?.displayedMessageCount,
            browserUrl: paneData.browserUrl,
            fileChanged: paneData.fileChanged,
            jinxFile: paneData.jinxFile,  // Preserve jinxFile for tilejinx panes
            tabs: serializedTabs,  // Preserve tabs
            activeTabIndex: paneData.activeTabIndex  // Preserve active tab index
        };
    });

    return {
        layoutNode: rootLayoutNode,
        contentData: serializedContentData,
        activeContentPaneId,
        timestamp: Date.now()
    };
};

export const saveWorkspaceToStorage = (path: string, workspaceData: any) => {
    try {
        const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');

        allWorkspaces[path] = {
            ...workspaceData,
            lastAccessed: Date.now()
        };

        const workspaceEntries = Object.entries(allWorkspaces);
        if (workspaceEntries.length > 20) {
            workspaceEntries.sort((a: any, b: any) => (b[1].lastAccessed || 0) - (a[1].lastAccessed || 0));
            const top20 = Object.fromEntries(workspaceEntries.slice(0, 20));
            localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(top20));
        } else {
            localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(allWorkspaces));
        }
    } catch (error) {
        console.error('[SAVE_WORKSPACE] Error saving workspace:', error);
    }
};

export const loadWorkspaceFromStorage = (path: string) => {
    try {
        const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
        return allWorkspaces[path] || null;
    } catch (error) {
        console.error('Error loading workspace:', error);
        return null;
    }
};

export const deserializeWorkspace = async (
    workspaceData: any,
    contentDataRef: React.MutableRefObject<any>,
    setRootLayoutNode: (layout: any) => void,
    setActiveContentPaneId: (id: string | null) => void,
    setIsLoadingWorkspace: (loading: boolean) => void,
    generateId: () => string,
    getConversationStats: (messages: any[]) => any
) => {
    console.log('[WORKSPACE] deserializeWorkspace called with', Object.keys(workspaceData?.contentData || {}));
    if (!workspaceData) return false;

    setIsLoadingWorkspace(true);

    try {
        const newRootLayout = workspaceData.layoutNode;

        // CRITICAL: Clear contentDataRef COMPLETELY first
        contentDataRef.current = {};

        // Collect all pane IDs from layout
        const paneIdsInLayout = new Set<string>();
        const collectPaneIds = (node: any) => {
            if (!node) return;
            if (node.type === 'content') paneIdsInLayout.add(node.id);
            if (node.type === 'split') {
                node.children.forEach(collectPaneIds);
            }
        };
        collectPaneIds(newRootLayout);

        // Populate contentDataRef synchronously BEFORE any async operations
        // Only create panes that have valid content data
        const validPaneIds = new Set<string>();
        paneIdsInLayout.forEach(paneId => {
            const paneData = workspaceData.contentData[paneId];
            // SKIP panes without a valid contentType - don't create empty panes
            if (!paneData?.contentType) {
                return;
            }
            validPaneIds.add(paneId);
            // For tilejinx panes, jinxFile === contentId, so use contentId as fallback
            const jinxFile = paneData?.jinxFile ||
                (paneData?.contentType === 'tilejinx' ? paneData?.contentId : undefined);
            // Fix content type for .exp files that were saved as 'notebook'
            let contentType = paneData.contentType;
            if (contentType === 'notebook' && paneData.contentId?.endsWith('.exp')) {
                contentType = 'exp';
            }
            contentDataRef.current[paneId] = {
                contentType: contentType,
                contentId: paneData.contentId,
                displayedMessageCount: paneData.displayedMessageCount,
                browserUrl: paneData.browserUrl,
                fileChanged: paneData.fileChanged || false,
                jinxFile: jinxFile,  // Restore jinxFile for tilejinx panes
                tabs: paneData.tabs,  // Restore tabs
                activeTabIndex: paneData.activeTabIndex || 0  // Restore active tab index
            };
        });

        // Clean the layout to remove any pane IDs without valid content
        const cleanLayout = (node: any): any => {
            if (!node) return null;
            if (node.type === 'content') {
                // Remove this pane if it doesn't have valid content
                return validPaneIds.has(node.id) ? node : null;
            }
            if (node.type === 'split') {
                const cleanedChildren = node.children
                    .map((child: any) => cleanLayout(child))
                    .filter((child: any) => child !== null);
                if (cleanedChildren.length === 0) return null;
                if (cleanedChildren.length === 1) return cleanedChildren[0];
                return { ...node, children: cleanedChildren, sizes: new Array(cleanedChildren.length).fill(100 / cleanedChildren.length) };
            }
            return node;
        };
        const cleanedLayout = cleanLayout(newRootLayout);

        // If no valid panes remain, don't set the layout (let default workspace creation handle it)
        if (!cleanedLayout) {
            setIsLoadingWorkspace(false);
            return false;
        }

        // Set the cleaned layout
        setRootLayoutNode(cleanedLayout);
        setActiveContentPaneId(workspaceData.activeContentPaneId);

        // Load actual content asynchronously
        const loadPromises = [];
        for (const [paneId, paneData] of Object.entries(workspaceData.contentData)) {
            if (!paneIdsInLayout.has(paneId)) continue;

            const loadPromise = (async () => {
                try {
                    const paneDataRef = contentDataRef.current[paneId];
                    const pd = paneData as any;

                    if (pd.contentType === 'editor') {
                        const response = await window.api.readFileContent(pd.contentId);
                        paneDataRef.fileContent = response.error ? `Error: ${response.error}` : response.content;
                    } else if (pd.contentType === 'chat') {
                        paneDataRef.chatMessages = {
                            messages: [],
                            allMessages: [],
                            displayedMessageCount: pd.displayedMessageCount || 20
                        };

                        const msgs = await window.api.getConversationMessages(pd.contentId);
                        const formatted = (msgs && Array.isArray(msgs))
                            ? msgs.map((m: any) => ({ ...m, id: m.message_id || m.id || generateId() }))
                            : [];

                        paneDataRef.chatMessages.allMessages = formatted;
                        paneDataRef.chatMessages.messages = formatted.slice(-paneDataRef.chatMessages.displayedMessageCount);
                        paneDataRef.chatStats = getConversationStats(formatted);
                        console.log('[WORKSPACE RESTORE] Loaded', formatted.length, 'messages for chat pane', paneId);
                    } else if (pd.contentType === 'browser') {
                        paneDataRef.browserUrl = pd.browserUrl || pd.contentId;
                    }
                } catch (err) {
                    console.error('Error loading pane content:', paneId, err);
                }
            })();

            loadPromises.push(loadPromise);
        }

        await Promise.all(loadPromises);

        // Log what was loaded
        console.log('[WORKSPACE] All content loaded. ContentDataRef keys:', Object.keys(contentDataRef.current));
        for (const [paneId, paneData] of Object.entries(contentDataRef.current)) {
            const pd = paneData as any;
            if (pd.contentType === 'chat') {
                console.log('[WORKSPACE] Chat pane', paneId, 'has', pd.chatMessages?.allMessages?.length || 0, 'messages');
            }
        }

        // Force final re-render - this triggers renderChatView to re-execute with fresh data
        console.log('[WORKSPACE] Triggering re-render...');
        setRootLayoutNode((prev: any) => ({ ...prev }));

        setIsLoadingWorkspace(false);
        return true;
    } catch (error) {
        console.error('Error deserializing workspace:', error);
        setIsLoadingWorkspace(false);
        return false;
    }
};

export const createDefaultWorkspace = async (
    currentPath: string,
    directoryConversations: any[],
    contentDataRef: React.MutableRefObject<any>,
    setRootLayoutNode: (layout: any) => void,
    setActiveContentPaneId: (id: string | null) => void,
    setActiveConversationId: (id: string | null) => void,
    updateContentPane: (paneId: string, contentType: string, contentId: string, skipLoad?: boolean) => Promise<void>,
    generateId: () => string
) => {
    const LAST_ACTIVE_CONVO_ID_KEY = 'npcStudioLastConvoId';

    // Figure out what conversation to use FIRST
    const storedConvoId = localStorage.getItem(LAST_ACTIVE_CONVO_ID_KEY);
    let targetConvoId = null;

    if (storedConvoId && directoryConversations.find((c: any) => c.id === storedConvoId)) {
        targetConvoId = storedConvoId;
    } else if (directoryConversations.length > 0) {
        targetConvoId = directoryConversations[0].id;
    } else {
        // Create new conversation if none exist
        const newConversation = await window.api.createConversation({ directory_path: currentPath });
        if (newConversation?.id) {
            targetConvoId = newConversation.id;
            setActiveConversationId(newConversation.id);
        }
    }

    // Only create pane if we have content
    if (targetConvoId) {
        const initialPaneId = generateId();
        contentDataRef.current[initialPaneId] = {
            contentType: 'chat',
            contentId: targetConvoId,
            chatMessages: { messages: [], allMessages: [], displayedMessageCount: 20 }
        };
        setRootLayoutNode({ id: initialPaneId, type: 'content' });
        setActiveContentPaneId(initialPaneId);
        await updateContentPane(initialPaneId, 'chat', targetConvoId);
    }
};
