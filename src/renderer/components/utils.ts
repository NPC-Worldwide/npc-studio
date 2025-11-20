

const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
           
            resolve({
                dataUrl: reader.result,
                base64: reader.result.split(',')[1] 
            });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
    const debouncedSetSearchTerm = useCallback((newTerm) => {
        setLocalSearch(prev => ({ ...prev, term: newTerm }));
    }, [setLocalSearch]); // setLocalSearch is a stable setter, so this function is stable

    // NEW: Define handleLocalSearchNavigate here, in the main component scope
    const handleLocalSearchNavigate = useCallback((direction) => {
        if (localSearch.results.length === 0) return;
        setLocalSearch(prev => {
            const nextIndex = (prev.currentIndex + direction + prev.results.length) % prev.results.length;
            return { ...prev, currentIndex: nextIndex };
        });
    }, [localSearch.results.length, setLocalSearch]); // Depends on localSearch.results.length and setLocalSearch


const normalizePath = (path) => {
    if (!path) return '';
    let normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
};
const generateId = () => Math.random().toString(36).substr(2, 9);

const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconProps = { size: 16, className: "flex-shrink-0" };
    switch(ext) {
        case 'py': return <Code2 {...iconProps} 
            className={`${iconProps.className} text-blue-500`} />;
        case 'js': return <Code2 {...iconProps} 
            className={`${iconProps.className} text-yellow-400`} />;
        case 'md': return <FileText {...iconProps} 
            className={`${iconProps.className} text-green-400`} />;
        case 'json': return <FileJson {...iconProps} 
            className={`${iconProps.className} text-orange-400`} />;
        case 'csv': case 'xlsx': case 'xls': return <BarChart3 {...iconProps} 
            className={`${iconProps.className} text-green-500`} />;
        case 'docx': case 'doc': return <FileText {...iconProps} 
            className={`${iconProps.className} text-blue-600`} />;
        case 'pdf': return <FileText {...iconProps} 
            className={`${iconProps.className} text-purple-400`} />;

        // ✅ ADD THESE TWO ↓↓↓
        case 'pptx': return <FileText {...iconProps}
            className={`${iconProps.className} text-red-500`} />;
        case 'tex': return <FileText {...iconProps}
            className={`${iconProps.className} text-yellow-500`} />;
        // ✅ END ADD ↑↑↑

        default: return <File {...iconProps} 
            className={`${iconProps.className} text-gray-400`} />;
    }
};





    const loadWebsiteHistory = useCallback(async () => {
    if (!currentPath) return;
    try {
        const response = await window.api.getBrowserHistory(currentPath);
        if (response?.history) {
            setWebsiteHistory(response.history);
            
            // Calculate common sites based on visit frequency
            const siteMap = new Map();
            response.history.forEach(item => {
                const domain = new URL(item.url).hostname;
                if (!siteMap.has(domain)) {
                    siteMap.set(domain, {
                        domain,
                        count: 0,
                        lastVisited: item.timestamp,
                        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
                    });
                }
                const site = siteMap.get(domain);
                site.count++;
                if (new Date(item.timestamp) > new Date(site.lastVisited)) {
                    site.lastVisited = item.timestamp;
                }
            });
            
            // Sort by visit count and take top 10
            const common = Array.from(siteMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            setCommonSites(common);
        }
    } catch (err) {
        console.error('Error loading website history:', err);
    }
}, [currentPath]);


    const handleBrowserCopyText = () => {
        if (browserContextMenu.selectedText) {
            navigator.clipboard.writeText(browserContextMenu.selectedText);
        }
       
        window.api.browserSetVisibility({ viewId: browserContextMenu.viewId, visible: true });
        setBrowserContextMenu({ isOpen: false, x: 0, y: 0, selectedText: '', viewId: null });
    };
    
const handleBrowserAddToChat = () => {
    if (browserContextMenu.selectedText) {
        const citation = `[From ${browserContextMenu.pageTitle || 'webpage'}](${browserContextMenu.currentUrl})\n\n> ${browserContextMenu.selectedText}`;
        setInput(prev => `${prev}${prev ? '\n\n' : ''}${citation}`);
    }
    
    setBrowserContextMenu({ 
        isOpen: false, x: 0, y: 0, 
        selectedText: '', viewId: null, 
        currentUrl: '', pageTitle: '' 
    });
};

    const handleBrowserAiAction = (action) => {
        const { selectedText, viewId } = browserContextMenu;
        if (!selectedText) return;
    
        let prompt = '';
        switch(action) {
            case 'summarize':
                prompt = `Please summarize the following text from a website:\n\n---\n${selectedText}\n---`;
                break;
            case 'explain':
                prompt = `Please explain the key points of the following text from a website:\n\n---\n${selectedText}\n---`;
                break;
        }
        setInput(prompt);
       

        setBrowserContextMenu({ isOpen: false, x: 0, y: 0, selectedText: '', viewId: null });
    };
    



const loadAvailableNPCs = async () => {
    if (!currentPath) return [];
    setNpcsLoading(true);
    setNpcsError(null);
    try {
       
        const projectResponse = await window.api.getNPCTeamProject(currentPath);
        const projectNPCs = projectResponse.npcs || [];
        
       
        const globalResponse = await window.api.getNPCTeamGlobal();
        const globalNPCs = globalResponse.npcs || [];
        
       
        const formattedProjectNPCs = projectNPCs.map(npc => ({
            ...npc,
            value: npc.name,
            display_name: `${npc.name} | Project`,
            source: 'project'
        }));
        
        const formattedGlobalNPCs = globalNPCs.map(npc => ({
            ...npc,
            value: npc.name,
            display_name: `${npc.name} | Global`,
            source: 'global'
        }));
        
       
        const combinedNPCs = [...formattedProjectNPCs, ...formattedGlobalNPCs];
        setAvailableNPCs(combinedNPCs);
        return combinedNPCs;
    } catch (err) {
        console.error('Error fetching NPCs:', err);
        setNpcsError(err.message);
        setAvailableNPCs([]);
        return [];
    } finally {
        setNpcsLoading(false);
    }
};


const [contextHash, setContextHash] = useState('');

const hashContext = (contexts) => {
    const contentString = contexts
        .map(ctx => `${ctx.type}:${ctx.path || ctx.url}:${ctx.content?.substring(0, 100)}`)
        .join('|');
    return btoa(contentString);
};

    const gatherWorkspaceContext = () => {
        const contexts = [];
        
        Object.entries(contentDataRef.current).forEach(([paneId, paneData]) => {
            if (paneData.contentType === 'editor' && paneData.fileContent) {
                contexts.push({
                    type: 'file',
                    path: paneData.contentId,
                    content: paneData.fileContent,
                    paneId: paneId
                });
            } else if (paneData.contentType === 'browser' && paneData.browserUrl) {
                contexts.push({
                    type: 'browser',
                    url: paneData.browserUrl,
                    viewId: paneData.contentId,
                    paneId: paneId
                });
            }
        });
        
        return contexts;
    };


        const switchToPath = useCallback(async (newPath) => {
            if (newPath === currentPath) return;
            
            console.log(`[Window ${windowId}] Switching from ${currentPath} to ${newPath}`);
            
            // Save current workspace before leaving
            if (currentPath && rootLayoutNode) {
                const workspaceData = serializeWorkspace();
                if (workspaceData) {
                    saveWorkspaceToStorage(currentPath, workspaceData);
                    console.log(`[Window ${windowId}] Saved workspace for ${currentPath}`);
                }
            }
            
            // Clear current state
            setRootLayoutNode(null);
            setActiveContentPaneId(null);
            contentDataRef.current = {};
            setActiveConversationId(null);
            setCurrentFile(null);
            
            // THIS IS THE KEY PART - Actually set the new path
            setCurrentPath(newPath);
        }, [windowId, currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};



    useEffect(() => {
        if (!aiEditModal.isOpen || !aiEditModal.isLoading) return;

        const currentStreamId = aiEditModal.streamId;
        
        const handleAIStreamData = (_, { streamId, chunk }) => {
            if (streamId !== currentStreamId) return;
            
            try {
                let content = '';
                if (typeof chunk === 'string') {
                    if (chunk.startsWith('data:')) {
                        const dataContent = chunk.replace(/^data:\s*/, '').trim();
                        if (dataContent === '[DONE]') {
                            const idx = paneData.chatMessages.allMessages.findIndex(m => m.id === incomingStreamId);
                            if (idx !== -1) {
                                const msg = paneData.chatMessages.allMessages[idx];
                                msg.isStreaming = false;
                                msg.streamId = null;
                                paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-(paneData.chatMessages.displayedMessageCount || 20));
                                setRootLayoutNode(prev => ({ ...prev }));
                            }
                            return;
                        }
                        if (dataContent) {
                            const parsed = JSON.parse(dataContent);
                            if (parsed.type === 'memory_approval') {
                                setPendingMemories(prev => [...prev, ...parsed.memories]);
                                setMemoryApprovalModal({
                                    isOpen: true,
                                    memories: parsed.memories
                                });
                                return;
                            }
        
                            content = parsed.choices?.[0]?.delta?.content || '';
                        }
                    } else {
                        content = chunk;
                    }
                } else if (chunk && chunk.choices) {
                    content = chunk.choices[0]?.delta?.content || '';
                }
                
                if (content) {
                
                    setAiEditModal(prev => ({
                        ...prev,
                        aiResponse: (prev.aiResponse || '') + content
                    }));
                }
            } catch (err) {
                console.error('Error processing AI edit stream chunk:', err);
            }
        };


const handleAIStreamComplete = async (_, { streamId }) => {
    if (streamId !== currentStreamId) return;
    
    // First, update isLoading to false, and keep the raw aiResponse
    setAiEditModal(prev => ({
        ...prev,
        isLoading: false,
    }));

    // Now, parse the full aiResponse to get proposedChanges
    // We need to ensure we're using the *latest* aiResponse state.
    // A small delay or a separate useEffect might be more robust,
    // but for now, let's assume the state is updated enough for this synchronous call.
    const latestAiEditModal = aiEditModal; // Capture current state for parsing
    console.log('handleAIStreamComplete: Full AI Response for parsing:', latestAiEditModal.aiResponse); // <--- LAVANZARO'S LOGGING!

    if (latestAiEditModal.type === 'agentic' && latestAiEditModal.aiResponse) {
        const contexts = gatherWorkspaceContext().filter(c => c.type === 'file');
        const proposedChanges = parseAgenticResponse(latestAiEditModal.aiResponse, contexts);
        
        setAiEditModal(prev => ({
            ...prev,
            proposedChanges: proposedChanges,
            showDiff: proposedChanges.length > 0,
        }));
        console.log('handleAIStreamComplete: Proposed changes set:', proposedChanges); // <--- LAVANZARO'S LOGGING!
    }
};

    const handleAIStreamError = (_, { streamId, error }) => {
        if (streamId !== currentStreamId) return;
        
        console.error('AI edit stream error:', error);
        setError(error);
        setAiEditModal(prev => ({ ...prev, isLoading: false }));
    };

    const cleanupStreamData = window.api.onStreamData(handleAIStreamData);
    const cleanupStreamComplete = window.api.onStreamComplete(handleAIStreamComplete);  
    const cleanupStreamError = window.api.onStreamError(handleAIStreamError);

    return () => {
        cleanupStreamData();
        cleanupStreamComplete();
        cleanupStreamError();
    };
}, [aiEditModal.isOpen, aiEditModal.isLoading, aiEditModal.streamId, aiEditModal.aiResponse]); // <--- Added aiEditModal.aiResponse to dependencies!


    const handleMemoryDecision = async (memoryId, decision, finalMemory = null) => {
        try {
            await window.api.approveMemory({
                memory_id: memoryId,
                decision: decision,
                final_memory: finalMemory
            });
            
            setPendingMemories(prev => prev.filter(m => m.memory_id !== memoryId));
        } catch (err) {
            console.error('Error processing memory decision:', err);
            setError(err.message);
        }
    };

    const handleBatchMemoryProcess = (memories, decisions) => {
        memories.forEach(memory => {
            const decision = decisions[memory.memory_id];
            if (decision) {
                handleMemoryDecision(memory.memory_id, decision.decision, decision.final_memory);
            }
        });
        setMemoryApprovalModal({ isOpen: false, memories: [] });
    };

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

        const loadDefaultPath = async (callback) => {
        try {
            const data = await window.api.loadGlobalSettings();
            const defaultFolder = data?.global_settings?.default_folder;
            if (defaultFolder) {
                setCurrentPath(defaultFolder);
                if (callback && typeof callback === 'function') {
                    callback(defaultFolder);
                }
            }
            return defaultFolder;
        } catch (error) {
            console.error('Error loading default path:', error);
            return null;
        }
    };


    const fetchModels = async () => {
        if (!currentPath) return [];
        setModelsLoading(true);
        setModelsError(null);
        try {
            const response = await window.api.getAvailableModels(currentPath);
            if (response?.models && Array.isArray(response.models)) {
                setAvailableModels(response.models);
                return response.models;
            } else {
                throw new Error(response?.error || "Invalid models response");
            }
        } catch (err) {
            console.error('Error fetching models:', err);
            setModelsError(err.message);
            setAvailableModels([]);
            return [];
        } finally {
            setModelsLoading(false);
        }
    };
    // Register window on mount and update activity
    
    const loadConversations = async (dirPath) => {
        let currentActiveId = activeConversationId;
        try {
            const normalizedPath = normalizePath(dirPath);
            if (!normalizedPath) return;
            const response = await window.api.getConversations(normalizedPath);
            const formattedConversations = response?.conversations?.map(conv => ({
                id: conv.id,
                title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                preview: conv.preview || 'No content',
                timestamp: conv.timestamp || Date.now(),
                last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
            })) || [];

            formattedConversations.sort((a, b) => 
                new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
            );
            
            setDirectoryConversations(formattedConversations);

            // CHANGE THIS SECTION:
            // Check if any conversation is already open in a pane
            const hasOpenConversation = Object.values(contentDataRef.current).some(
                paneData => paneData?.contentType === 'chat' && paneData?.contentId
            );

            // Only auto-select if:
            // 1. Initial load is complete
            // 2. No conversation is currently open in ANY pane
            // 3. Current active conversation doesn't exist anymore
            const activeExists = formattedConversations.some(c => c.id === currentActiveId);

            if (!activeExists && !hasOpenConversation && initialLoadComplete.current) {
                if (formattedConversations.length > 0) {
                    await handleConversationSelect(formattedConversations[0].id);
                } else {
                    await createNewConversation();
                }
            } else if (!currentActiveId && !hasOpenConversation && formattedConversations.length > 0 && initialLoadComplete.current) {
                await handleConversationSelect(formattedConversations[0].id);
            } else if (!currentActiveId && !hasOpenConversation && formattedConversations.length === 0 && initialLoadComplete.current) {
                await createNewConversation();
            } else {
                console.log('[LOAD_CONVOS] Preserving existing conversation selection');
            }

        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(err.message);
            setDirectoryConversations([]);
            
            // Also check for open conversations here
            const hasOpenConversation = Object.values(contentDataRef.current).some(
                paneData => paneData?.contentType === 'chat' && paneData?.contentId
            );
            
            if (!activeConversationId && !hasOpenConversation && initialLoadComplete.current) {
                await createNewConversation();
            }
        }
    };
    const loadDirectoryStructure = async (dirPath) => {
        try {
            if (!dirPath) {
                console.error('No directory path provided');
                return {};
            }
            const structureResult = await window.api.readDirectoryStructure(dirPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
            } else {
                console.error('Error loading structure:', structureResult?.error);
                setFolderStructure({ error: structureResult?.error || 'Failed' });
            }
            await loadConversations(dirPath);
            return structureResult;
        } catch (err) {
            console.error('Error loading structure:', err);
            setError(err.message);
            setFolderStructure({ error: err.message });
            return { error: err.message };
        }
    };

        const handleOpenFolderAsWorkspace = useCallback(async (folderPath) => {
        if (folderPath === currentPath) {
            console.log("Already in this workspace, no need to switch!");
            setSidebarItemContextMenuPos(null); // Close context menu if open
            return;
        }
        console.log(`Opening folder as workspace: ${folderPath} 🔥`);
        await switchToPath(folderPath);
        setSidebarItemContextMenuPos(null); // Close context menu if open
    }, [currentPath, switchToPath]);
    const goUpDirectory = async () => {
        try {
            if (!currentPath || currentPath === baseDir) return;
            const newPath = await window.api.goUpDirectory(currentPath);
            await switchToPath(newPath);
        } catch (err) {
            console.error('Error going up directory:', err);
            setError(err.message);
        }
    };

        
    useEffect(() => {
    
        if (!config?.stream || listenersAttached.current) return;

        console.log('[REACT] Attaching PANE-AWARE stream listeners.');

    
        const handleStreamData = (_, { streamId: incomingStreamId, chunk }) => {
        
            const targetPaneId = streamToPaneRef.current[incomingStreamId];
            if (!targetPaneId) return;

        
            const paneData = contentDataRef.current[targetPaneId];
            if (!paneData || !paneData.chatMessages) return;

                try {
                
                let content = '', reasoningContent = '', toolCalls = null, isDecision = false;
                if (typeof chunk === 'string') {
                    if (chunk.startsWith('data:')) {
                        const dataContent = chunk.replace(/^data:\s*/, '').trim();
                        if (dataContent === '[DONE]') return;
                        if (dataContent) {
                            const parsed = JSON.parse(dataContent);
                            isDecision = parsed.choices?.[0]?.delta?.role === 'decision';
                            content = parsed.choices?.[0]?.delta?.content || '';
                            reasoningContent = parsed.choices?.[0]?.delta?.reasoning_content || '';
                            if (parsed.type) {
                                // Handle tool events coming as standalone payloads
                                const type = parsed.type;
                                if (type === 'tool_execution_start' && Array.isArray(parsed.tool_calls)) {
                                    toolCalls = parsed.tool_calls;
                                } else if ((type === 'tool_start' || type === 'tool_complete' || type === 'tool_error') && parsed.name) {
                                    toolCalls = [{
                                        id: parsed.id || '',
                                        type: 'function',
                                        function: {
                                            name: parsed.name,
                                            arguments: parsed.args ? (typeof parsed.args === 'object' ? JSON.stringify(parsed.args, null, 2) : String(parsed.args)) : ''
                                        },
                                        status: type === 'tool_error' ? 'error' : (type === 'tool_complete' ? 'complete' : 'running'),
                                        result_preview: parsed.result_preview || parsed.error || ''
                                    }];
                                }
                            } else {
                                toolCalls = parsed.tool_calls || null;
                            }
                        }
                    } else { content = chunk; }
                } else if (chunk?.choices) {
                    isDecision = chunk.choices[0]?.delta?.role === 'decision';
                    content = chunk.choices[0]?.delta?.content || '';
                    reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
                    toolCalls = chunk.tool_calls || null;
                } else if (chunk?.type) {
                    // tool event payloads
                    const type = chunk.type;
                    if (type === 'tool_execution_start' && Array.isArray(chunk.tool_calls)) {
                        toolCalls = chunk.tool_calls;
                    } else if ((type === 'tool_start' || type === 'tool_complete' || type === 'tool_error') && chunk.name) {
                        toolCalls = [{
                            id: chunk.id || '',
                            type: 'function',
                            function: {
                                name: chunk.name,
                                arguments: chunk.args ? (typeof chunk.args === 'object' ? JSON.stringify(chunk.args, null, 2) : String(chunk.args)) : ''
                            },
                            status: type === 'tool_error' ? 'error' : (type === 'tool_complete' ? 'complete' : 'running'),
                            result_preview: chunk.result_preview || chunk.error || ''
                        }];
                    }
                }

            
                const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === incomingStreamId);
                if (msgIndex !== -1) {
                    const message = paneData.chatMessages.allMessages[msgIndex];
                    message.role = isDecision ? 'decision' : 'assistant';
                    message.content = (message.content || '') + content;
                    message.reasoningContent = (message.reasoningContent || '') + reasoningContent;
                    if (toolCalls) {
                        const normalizedCalls = (Array.isArray(toolCalls) ? toolCalls : []).map(tc => ({
                            id: tc.id || '',
                            type: tc.type || 'function',
                            function: {
                                name: tc.function?.name || (tc.name || ''),
                                arguments: (() => {
                                    if (tc.args) {
                                        return typeof tc.args === 'object' ? JSON.stringify(tc.args, null, 2) : String(tc.args);
                                    }
                                    const argVal = tc.function?.arguments;
                                    if (typeof argVal === 'object') return JSON.stringify(argVal, null, 2);
                                    return argVal || '';
                                })()
                            },
                            status: tc.status,
                            result_preview: tc.result_preview || ''
                        }));
                        console.log('[STREAM][TOOLCALLS]', normalizedCalls);
                        // merge by id/name
                        const existing = message.toolCalls || [];
                        const merged = [...existing];
                        normalizedCalls.forEach(tc => {
                            const idx = merged.findIndex(mtc => mtc.id === tc.id || mtc.function.name === tc.function.name);
                            if (idx >= 0) {
                                const existing = merged[idx];
                                const newArgs = tc.function?.arguments;
                                const shouldReplaceArgs = newArgs && String(newArgs).trim().length > 0;
                                merged[idx] = {
                                    ...existing,
                                    ...tc,
                                    function: {
                                        name: tc.function?.name || existing.function?.name || '',
                                        arguments: shouldReplaceArgs ? newArgs : (existing.function?.arguments || '')
                                    }
                                };
                            } else {
                                merged.push(tc);
                            }
                        });
                        message.toolCalls = merged;
                    }

                
                    paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-(paneData.chatMessages.displayedMessageCount || 20));

                
                    setRootLayoutNode(prev => ({ ...prev }));
                }
            } catch (err) {
                console.error('[REACT] Error processing stream chunk:', err, 'Raw chunk:', chunk);
            }
        };

   
const handleStreamComplete = async (_, { streamId: completedStreamId } = {}) => {
    const targetPaneId = streamToPaneRef.current[completedStreamId];
    if (targetPaneId) {
        const paneData = contentDataRef.current[targetPaneId];
        if (paneData?.chatMessages) {
            const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === completedStreamId);
            if (msgIndex !== -1) {
                const msg = paneData.chatMessages.allMessages[msgIndex];
                msg.isStreaming = false;
                msg.streamId = null;
                
                // Find the most recent user message to check mode
                const recentUserMsgs = paneData.chatMessages.allMessages.filter(m => m.role === 'user').slice(-3);
                const wasAgentMode = recentUserMsgs.some(m => m.executionMode === 'agent');
                
                console.log('Stream complete. Was agent mode?', wasAgentMode);
                console.log('Assistant response:', msg.content.substring(0, 200));
                
                if (wasAgentMode) {
                    const contexts = gatherWorkspaceContext().filter(c => c.type === 'file');
                    console.log('Available file contexts:', contexts.map(c => c.path));
                    
                    const proposedChanges = parseAgenticResponse(msg.content, contexts);
                    console.log('Proposed changes found:', proposedChanges.length);
                    
                    if (proposedChanges.length > 0) {
                        setAiEditModal({
                            isOpen: true,
                            type: 'agentic',
                            proposedChanges: proposedChanges,
                            isLoading: false,
                            selectedText: '',
                            selectionStart: 0,
                            selectionEnd: 0,
                            aiResponse: '',
                            showDiff: false
                        });
                    } else {
                        console.warn('Agent mode but no changes detected. Response format may be wrong.');
                    }
                }
            }
            paneData.chatStats = getConversationStats(paneData.chatMessages.allMessages);
        }
        delete streamToPaneRef.current[completedStreamId];
    }

    if (Object.keys(streamToPaneRef.current).length === 0) {
        setIsStreaming(false);
    }

    setRootLayoutNode(prev => ({ ...prev }));
    await refreshConversations();
};


    const handleStreamError = (_, { streamId: errorStreamId, error } = {}) => {
        const targetPaneId = streamToPaneRef.current[errorStreamId];
        if (targetPaneId) {
            const paneData = contentDataRef.current[targetPaneId];
             if (paneData?.chatMessages) {
                const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === errorStreamId);
                if (msgIndex !== -1) {
                    const message = paneData.chatMessages.allMessages[msgIndex];
                    message.content += `\n\n[STREAM ERROR: ${error}]`;
                    message.type = 'error';
                    message.isStreaming = false;
                }
            }
            delete streamToPaneRef.current[errorStreamId];
        }

        if (Object.keys(streamToPaneRef.current).length === 0) {
            setIsStreaming(false);
        }
        setRootLayoutNode(prev => ({ ...prev }));
    };

    const cleanupStreamData = window.api.onStreamData(handleStreamData);
    const cleanupStreamComplete = window.api.onStreamComplete(handleStreamComplete);
    const cleanupStreamError = window.api.onStreamError(handleStreamError);
    
    listenersAttached.current = true;

    return () => {
        console.log('[REACT] Cleaning up stream listeners.');
        cleanupStreamData();
        cleanupStreamComplete();
        cleanupStreamError();
        listenersAttached.current = false;
    };
}, [config]);





   
    useEffect(() => {
        if (activeContentPaneId) {
            const paneData = contentDataRef.current[activeContentPaneId];
            if (paneData && paneData.contentType === 'chat') {
                setLastActiveChatPaneId(activeContentPaneId);
            }
        }
    }, [activeContentPaneId]);
const handleInterruptStream = async () => {
   
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) {
        console.warn("Interrupt clicked but no active chat pane found.");
        return;
    }

   
    const streamingMessage = activePaneData.chatMessages.allMessages.find(m => m.isStreaming);
    if (!streamingMessage || !streamingMessage.streamId) {
        console.warn("Interrupt clicked, but no streaming message found in the active pane.");
       
        if (isStreaming) {
            const anyStreamId = Object.keys(streamToPaneRef.current)[0];
            if (anyStreamId) {
                await window.api.interruptStream(anyStreamId);
                console.log(`Fallback interrupt sent for stream: ${anyStreamId}`);
            }
            setIsStreaming(false);
        }
        return;
    }
    
    const streamIdToInterrupt = streamingMessage.streamId;
    console.log(`[REACT] handleInterruptStream: Attempting to interrupt stream: ${streamIdToInterrupt}`);

   
    streamingMessage.content = (streamingMessage.content || '') + `\n\n[Stream Interrupted by User]`;
    streamingMessage.isStreaming = false;
    streamingMessage.streamId = null;
    
   
    delete streamToPaneRef.current[streamIdToInterrupt];
    if (Object.keys(streamToPaneRef.current).length === 0) {
        setIsStreaming(false);
    }
    
   
    setRootLayoutNode(prev => ({ ...prev }));
   

   
    try {
        await window.api.interruptStream(streamIdToInterrupt);
        console.log(`[REACT] handleInterruptStream: API call to interrupt stream ${streamIdToInterrupt} successful.`);
    } catch (error) {
        console.error(`[REACT] handleInterruptStream: API call to interrupt stream ${streamIdToInterrupt} failed:`, error);
       
        streamingMessage.content += " [Interruption API call failed]";
        setRootLayoutNode(prev => ({ ...prev }));
    }
};


// Update the handleRenameFile function to work correctly
const handleRenameFile = async (nodeId, oldPath) => {
    if (!editedFileName.trim() || editedFileName === oldPath.split('/').pop()) {
        setRenamingPaneId(null);
        return;
    }

    const dirPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
    const newPath = `${dirPath}/${editedFileName}`;

    try {
        const response = await window.api.renameFile(oldPath, newPath);
        if (response?.error) throw new Error(response.error);

        // Update contentData for the pane
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].contentId = newPath;
        }

        // Reload directory structure
        await loadDirectoryStructure(currentPath);

        // Force re-render
        setRootLayoutNode(p => ({ ...p }));

    } catch (err) {
        console.error("Error renaming file:", err);
        setError(`Failed to rename: ${err.message}`);
    } finally {
        setRenamingPaneId(null);
    }
};
const getThumbnailIcon = (fileName, fileType) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconProps = { size: 20, className: "flex-shrink-0" };
    if (fileType?.startsWith('image/')) return null;
    switch(ext) {
        case 'pdf': return <FileText {...iconProps} className="text-red-500" />;
        case 'csv': case 'xlsx': case 'xls': return <BarChart3 {...iconProps} className="text-green-500" />;
        case 'json': return <FileJson {...iconProps} className="text-orange-400" />;
        default: return <File {...iconProps} className="text-gray-400" />;
    }
};
