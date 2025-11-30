import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Folder, File, Globe, ChevronRight, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, MessageSquare,
    X, Wrench, FileText, FileJson, BarChart3, Code2, HardDrive, ChevronDown, ChevronUp,
    Sun, Moon, FileStack, Share2, Bot, Zap, GitBranch, Tag, FolderCog
} from 'lucide-react';
import DiskUsageAnalyzer from './DiskUsageAnalyzer';
import npcLogo from '../../assets/icon.png';

const Sidebar = (props: any) => {
    // Destructure all props from Enpistu
    const {
        // State
        sidebarCollapsed, sidebarWidth, isResizingSidebar, contentDataRef, isDarkMode,
        currentPath, baseDir, selectedFiles, selectedConvos, windowId, activeWindowsExpanded,
        workspaceIndicatorExpanded, expandedFolders, renamingPath, editedSidebarItemName,
        currentFile, lastClickedIndex, lastClickedFileIndex, activeContentPaneId,
        folderStructure, directoryConversations, gitStatus, gitPanelCollapsed,
        gitCommitMessage, gitLoading, gitError, rootLayoutNode, openBrowsers, commonSites,
        websiteHistory, filesCollapsed, conversationsCollapsed, websitesCollapsed,
        isGlobalSearch, searchTerm, searchInputRef, loading, isSearching,
        contextMenuPos, sidebarItemContextMenuPos, fileContextMenuPos,
        isEditingPath, editedPath, isLoadingWorkspace, activeConversationId,
        // Setters
        setSidebarWidth, setIsResizingSidebar, setSelectedFiles, setFileContextMenuPos,
        setError, setIsStreaming, setRootLayoutNode, setActiveWindowsExpanded,
        setWorkspaceIndicatorExpanded, setGitPanelCollapsed, setExpandedFolders,
        setRenamingPath, setEditedSidebarItemName, setLastClickedIndex, setLastClickedFileIndex,
        setSelectedConvos, setActiveContentPaneId, setCurrentFile, setActiveConversationId,
        setDirectoryConversations, setFolderStructure, setGitCommitMessage, setGitLoading,
        setGitError, setGitStatus, setFilesCollapsed, setConversationsCollapsed, setWebsitesCollapsed,
        setInput, setContextMenuPos, setSidebarItemContextMenuPos, setSearchTerm,
        setIsSearching, setDeepSearchResults, setMessageSearchResults,
        setIsEditingPath, setEditedPath, setSettingsOpen, setBrowserUrlDialogOpen,
        setPhotoViewerOpen, setDashboardMenuOpen, setJinxMenuOpen,
        setCtxEditorOpen, setTeamManagementOpen, setNpcTeamMenuOpen, setSidebarCollapsed,
        setGraphViewerOpen, setDataLabelerOpen, setDiskUsageModalOpen,
        // Functions from Enpistu
        createNewConversation, generateId, streamToPaneRef, availableNPCs, currentNPC, currentModel,
        currentProvider, executionMode, mcpServerPath, selectedMcpTools, updateContentPane,
        loadDirectoryStructure, loadWebsiteHistory, createNewBrowser,
        handleGlobalDragStart, handleGlobalDragEnd, normalizePath, getFileIcon,
        serializeWorkspace, saveWorkspaceToStorage, handleConversationSelect, handleFileClick,
        handleInputSubmit, toggleTheme, goUpDirectory, switchToPath,
        handleCreateNewFolder, createNewTextFile, createNewTerminal, createNewDocument,
        handleOpenNpcTeamMenu, renderSearchResults,
        createAndAddPaneNodeToLayout, findNodePath, findNodeByPath
    } = props;

    const WINDOW_WORKSPACES_KEY = 'npcStudioWorkspaces';
    const ACTIVE_WINDOWS_KEY = 'npcStudioActiveWindows';

    // Local state for disk usage panel
    const [diskUsageCollapsed, setDiskUsageCollapsed] = useState(true);
    // Local state for header actions expanded/collapsed (persisted)
    const [headerActionsExpanded, setHeaderActionsExpanded] = useState(() => {
        const saved = localStorage.getItem('npcStudio_headerActionsExpanded');
        return saved !== null ? JSON.parse(saved) : true;
    });
    // Persist headerActionsExpanded to localStorage
    useEffect(() => {
        localStorage.setItem('npcStudio_headerActionsExpanded', JSON.stringify(headerActionsExpanded));
    }, [headerActionsExpanded]);

    // Doc dropdown state (click-based instead of hover)
    const [docDropdownOpen, setDocDropdownOpen] = useState(false);
    // Chat+ dropdown state (click-based)
    const [chatPlusDropdownOpen, setChatPlusDropdownOpen] = useState(false);

// ===== ALL THE SIDEBAR FUNCTIONS BELOW =====

const handleSidebarResize = useCallback((e) => {
    if (!isResizingSidebar) return;

    const newWidth = e.clientX;
    // Constrain between 150px and 500px
    if (newWidth >= 150 && newWidth <= 500) {
        setSidebarWidth(newWidth);
    }
}, [isResizingSidebar, setSidebarWidth]);

const handleApplyPromptToFiles = async (operationType, customPrompt = '') => {
    const selectedFilePaths = Array.from(selectedFiles);
    if (selectedFilePaths.length === 0) return;

    try {
       
        const filesContentPromises = selectedFilePaths.map(async (filePath) => {
            const response = await window.api.readFileContent(filePath);
            if (response.error) {
                console.warn(`Could not read file ${filePath}:`, response.error);
                return `File (${filePath.split('/').pop()}): [Error reading content]`;
            }
            const fileName = filePath.split('/').pop();
            return `File (${fileName}):\n---\n${response.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);

        let prompt = '';
        switch (operationType) {
            case 'summarize':
                prompt = `Summarize the content of these ${selectedFilePaths.length} file(s):\n\n`;
                break;
           
            default:
                 prompt = customPrompt + `\n\nApply this to these ${selectedFilePaths.length} file(s):\n\n`;
                 break;
        }
        const fullPrompt = prompt + filesContent.join('\n\n');

        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();

        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create and retrieve new conversation pane details.');
        }

        const paneData = contentDataRef.current[newPaneId];
        if (!paneData || paneData.contentType !== 'chat') {
            throw new Error("Target pane is not a chat pane.");
        }

        const newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = newPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        const userMessage = { id: generateId(), role: 'user', content: fullPrompt, timestamp: new Date().toISOString() };
        const assistantPlaceholderMessage = { id: newStreamId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString(), streamId: newStreamId, model: currentModel, npc: currentNPC };

        paneData.chatMessages.allMessages.push(userMessage, assistantPlaceholderMessage);
        paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-paneData.chatMessages.displayedMessageCount);

        setRootLayoutNode(prev => ({ ...prev }));


        await window.api.executeCommandStream({
            commandstr: fullPrompt,
            currentPath,
            conversationId: newConversation.id,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId,
            executionMode,
            mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
            selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
        });

    } catch (err) {
        console.error('Error processing files:', err);
        setError(err.message);
        setIsStreaming(false);
    } finally {
        setSelectedFiles(new Set());
        setFileContextMenuPos(null);
    }
};

const handleApplyPromptToFilesInInput = async (operationType, customPrompt = '') => {
    const selectedFilePaths = Array.from(selectedFiles);
    if (selectedFilePaths.length === 0) return;
    
    try {
        const filesContentPromises = selectedFilePaths.map(async (filePath, index) => {
            const response = await window.api.readFileContent(filePath);
            if (response.error) {
                console.warn(`Could not read file ${filePath}:`, response.error);
                return `File ${index + 1} (${filePath}): [Error reading content: ${response.error}]`;
            }
            const fileName = filePath.split('/').pop();
            return `File ${index + 1} (${fileName}):\n---\n${response.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);
        
        let prompt = '';
        switch (operationType) {
            case 'summarize':
                prompt = `Summarize the content of these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'analyze':
                prompt = `Analyze the content of these ${selectedFilePaths.length} file(s) for key insights:\n\n`;
                break;
            case 'refactor':
                prompt = `Refactor and improve the code in these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'document':
                prompt = `Generate documentation for these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'custom':
                prompt = customPrompt + `\n\nApply this to these ${selectedFilePaths.length} file(s):\n\n`;
                break;
        }

        const fullPrompt = prompt + filesContent.join('\n\n');

        if (!activeConversationId) {
            await createNewConversation();
        }

        setInput(fullPrompt);
        
    } catch (err) {
        console.error('Error preparing file prompt for input field:', err);
        setError(err.message);
    } finally {
        setSelectedFiles(new Set());
        setFileContextMenuPos(null);
    }
};

const handleFileContextMenu = (e, filePath) => {
    e.preventDefault();
    if (!selectedFiles.has(filePath) && selectedFiles.size > 0) {
        setSelectedFiles(prev => new Set([...prev, filePath]));
    } else if (selectedFiles.size === 0) {
        setSelectedFiles(new Set([filePath]));
    }
    setFileContextMenuPos({ x: e.clientX, y: e.clientY, filePath });
};

const handleOpenFolderAsWorkspace = useCallback(async (folderPath) => {
    console.log(`[handleOpenFolderAsWorkspace] Received folderPath: "${folderPath}", currentPath: "${currentPath}"`);
    if (folderPath === currentPath) {
        console.log("Already in this workspace, no need to switch!");
        setSidebarItemContextMenuPos(null);
        return;
    }
    // If folderPath doesn't start with /, it's a relative path - make it absolute
    let fullPath = folderPath;
    if (!folderPath.startsWith('/') && currentPath) {
        fullPath = `${currentPath}/${folderPath}`;
        console.log(`[handleOpenFolderAsWorkspace] Converted relative path to absolute: "${fullPath}"`);
    }
    console.log(`Opening folder as workspace: ${fullPath}`);
    await switchToPath(fullPath);
    setSidebarItemContextMenuPos(null);
}, [currentPath, switchToPath]);

const handleSidebarItemContextMenu = (e, path, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'file' && !selectedFiles.has(path)) {
        setSelectedFiles(new Set([path]));
    }
    setSidebarItemContextMenuPos({ x: e.clientX, y: e.clientY, path, type });
};

const handleAnalyzeInDashboard = () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    console.log(`Analyzing ${selectedIds.length} conversations in dashboard.`);
    setDashboardMenuOpen(true);
    setContextMenuPos(null);
};

const handleSummarizeAndStart = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create new conversation');
        }

        const paneData = contentDataRef.current[newPaneId];
        if (!paneData || paneData.contentType !== 'chat') {
            throw new Error("Target pane is not a chat pane.");
        }

        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                console.warn(`Could not fetch messages for conversation ${id}`);
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');

        const newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = newPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        const userMessage = { id: generateId(), role: 'user', content: fullPrompt, timestamp: new Date().toISOString() };
        const assistantPlaceholderMessage = { id: newStreamId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString(), streamId: newStreamId, model: currentModel, npc: currentNPC };

        paneData.chatMessages.allMessages.push(userMessage, assistantPlaceholderMessage);
        paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-paneData.chatMessages.displayedMessageCount);
        setRootLayoutNode(prev => ({ ...prev }));

        await window.api.executeCommandStream({
            commandstr: fullPrompt,
            currentPath,
            conversationId: newConversation.id,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId,
            executionMode,
            mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
            selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
        });
    } catch (err) {
        console.error('Error summarizing:', err);
        setError(err.message);
        setIsStreaming(false);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSummarizeAndDraft = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                console.warn(`Could not fetch messages for conversation ${id}`);
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');
        setInput(fullPrompt);
    } catch (err) {
        console.error('Error summarizing for draft:', err);
        setError(err.message);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSummarizeAndPrompt = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create new conversation');
        }

        const paneData = contentDataRef.current[newPaneId];
        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const customPrompt = 'Provide a detailed analysis of the key themes and insights from these conversations';
        const fullPrompt = `${customPrompt}\n\nConversations to analyze:\n\n` + convosContent.join('\n\n');
        setInput(fullPrompt);
    } catch (err) {
        console.error('Error:', err);
        setError(err.message);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSidebarItemDelete = async () => {
    if (!sidebarItemContextMenuPos) return;
    const { path, type } = sidebarItemContextMenuPos;
    
   
    const confirmation = window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`);
    if (!confirmation) {
        setSidebarItemContextMenuPos(null);
        return;
    }

    try {
        let response;
        if (type === 'file') {
            response = await window.api.deleteFile(path);
        } else if (type === 'directory') {
            response = await window.api.deleteDirectory(path);
        }

        if (response?.error) throw new Error(response.error);
        
        await loadDirectoryStructure(currentPath);

    } catch (err) {
        setError(`Failed to delete: ${err.message}`);
    } finally {
        setSidebarItemContextMenuPos(null);
    }
};

const handleSidebarRenameStart = () => {
    if (!sidebarItemContextMenuPos) return;
    const { path } = sidebarItemContextMenuPos;
    const currentName = path.split('/').pop();
    
    setRenamingPath(path);
    setEditedSidebarItemName(currentName);
    setSidebarItemContextMenuPos(null);
};

const handleFolderOverview = async () => {
    if (!sidebarItemContextMenuPos || sidebarItemContextMenuPos.type !== 'directory') return;
    const { path } = sidebarItemContextMenuPos;
    setSidebarItemContextMenuPos(null);

    try {
       
        const response = await window.api.getDirectoryContentsRecursive(path);
        if (response.error) throw new Error(response.error);
        if (response.files.length === 0) {
            setError("This folder contains no files to analyze.");
            return;
        }

       
        const filesContentPromises = response.files.map(async (filePath) => {
            const fileResponse = await window.api.readFileContent(filePath);
            const fileName = filePath.split('/').pop();
            return fileResponse.error 
                ? `File (${fileName}): [Error reading content]`
                : `File (${fileName}):\n---\n${fileResponse.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);
        
        const fullPrompt = `Provide a high-level overview of the following ${response.files.length} file(s) from the '${path.split('/').pop()}' folder:\n\n` + filesContent.join('\n\n');

        const { conversation, paneId } = await createNewConversation();
        if (!conversation) throw new Error("Failed to create conversation for overview.");

       
        handleInputSubmit(new Event('submit'), fullPrompt, paneId, conversation.id);

    } catch (err) {
        setError(`Failed to get folder overview: ${err.message}`);
    }
};

const renderActiveWindowsIndicator = () => {
    const [otherWindows, setOtherWindows] = useState([]);
    
    useEffect(() => {
        const checkOtherWindows = () => {
            try {
                const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                const now = Date.now();
                const others = Object.entries(activeWindows)
                    .filter(([wId]) => wId !== windowId) // Not this window
                    .filter(([, data]) => !data.closing) // Not marked as closing
                    .filter(([, data]) => (now - data.lastActive) < 30000) // Active in last 30 seconds
                    .map(([wId, data]) => ({
                        id: wId,
                        path: data.currentPath,
                        lastActive: data.lastActive
                    }));
                setOtherWindows(others);
            } catch (error) {
                console.error('Error checking other windows:', error);
                setOtherWindows([]);
            }
        };
        
        checkOtherWindows();
        const interval = setInterval(checkOtherWindows, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, [windowId]);
    
    // Don't render if no other windows - this prevents the "Other Windows (1)" issue
    if (otherWindows.length === 0) return null;
    
    return (
        <div className="px-4 py-2 border-b theme-border">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setActiveWindowsExpanded(!activeWindowsExpanded)}
            >
                <div className="text-xs theme-text-muted">
                    Other Windows ({otherWindows.length})
                </div>
                <ChevronRight 
                    size={12} 
                    className={`transform transition-transform ${activeWindowsExpanded ? 'rotate-90' : ''}`} 
                />
            </div>
            
            {activeWindowsExpanded && (
                <div className="mt-1 pl-2 space-y-1">
                    {otherWindows.map(window => (
                        <div key={window.id} className="text-xs theme-text-muted truncate">
                            📁 {window.path?.split('/').pop() || 'No folder'}
                            <span className="text-gray-600 ml-2">
                                ({Math.round((Date.now() - window.lastActive) / 1000)}s ago)
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const renderWorkspaceIndicator = () => {
    // Debug logging
    console.log('contentDataRef.current:', contentDataRef.current);
    console.log('Object.keys(contentDataRef.current):', Object.keys(contentDataRef.current));
    console.log('rootLayoutNode:', rootLayoutNode);
    
    // Check if current path has a saved workspace
    const allWorkspaces = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
    const windowWorkspaces = allWorkspaces[windowId] || {};
    const hasWorkspace = !!windowWorkspaces[currentPath];
    
    // Count ONLY currently active panes
    const activePaneCount = Object.keys(contentDataRef.current).length;
    
    // Let's also count from the layout tree to double-check
    const countPanesInLayout = (node) => {
        if (!node) return 0;
        if (node.type === 'content') return 1;
        if (node.type === 'split') {
            return node.children.reduce((count, child) => count + countPanesInLayout(child), 0);
        }
        return 0;
    };
    const layoutPaneCount = countPanesInLayout(rootLayoutNode);
    
    console.log('activePaneCount from contentDataRef:', activePaneCount);
    console.log('layoutPaneCount from rootLayoutNode:', layoutPaneCount);
    
    const workspaceData = windowWorkspaces[currentPath];
    const workspaceInfo = workspaceData ? {
        paneCount: layoutPaneCount, // Use the layout count instead
        lastSaved: new Date(workspaceData.lastAccessed).toLocaleTimeString(),
        timestamp: workspaceData.timestamp
    } : null;
    
    return (
        <div className="px-4 py-2 border-b theme-border">
            <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setWorkspaceIndicatorExpanded(!workspaceIndicatorExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hasWorkspace ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs theme-text-muted">
                        {hasWorkspace ? `Workspace (${layoutPaneCount} panes)` : 'No Workspace'}
                    </span>
                </div>
                <ChevronRight 
                    size={12} 
                    className={`transform transition-transform ${workspaceIndicatorExpanded ? 'rotate-90' : ''}`} 
                />
            </div>
            
            {workspaceIndicatorExpanded && (
                <div className="mt-2 pl-4 space-y-2">
                    <div className="text-xs theme-text-muted">
                        Layout panes: {layoutPaneCount} | ContentData panes: {activePaneCount}
                    </div>
                    {hasWorkspace ? (
                        <>
                            <div className="text-xs theme-text-muted">
                                Last saved: {workspaceInfo?.lastSaved}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const workspaceData = serializeWorkspace();
                                        if (workspaceData) {
                                            saveWorkspaceToStorage(currentPath, workspaceData);
                                            setRootLayoutNode(p => ({ ...p }));
                                        }
                                    }}
                                    className="text-xs theme-button theme-hover px-2 py-1 rounded"
                                    title="Save current workspace"
                                >
                                    Save Now
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Clear workspace AND clean up contentDataRef
                                        const stored = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
                                        if (stored[windowId] && stored[windowId][currentPath]) {
                                            delete stored[windowId][currentPath];
                                            localStorage.setItem(WINDOW_WORKSPACES_KEY, JSON.stringify(stored));
                                        }
                                        
                                        // Clean up phantom panes in contentDataRef
                                        const validPaneIds = new Set();
                                        const collectPaneIds = (node) => {
                                            if (!node) return;
                                            if (node.type === 'content') validPaneIds.add(node.id);
                                            if (node.type === 'split') {
                                                node.children.forEach(collectPaneIds);
                                            }
                                        };
                                        collectPaneIds(rootLayoutNode);
                                        
                                        // Remove any contentDataRef entries that don't exist in the layout
                                        Object.keys(contentDataRef.current).forEach(paneId => {
                                            if (!validPaneIds.has(paneId)) {
                                                delete contentDataRef.current[paneId];
                                            }
                                        });
                                        
                                        setRootLayoutNode(p => ({ ...p }));
                                    }}
                                    className="text-xs theme-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded"
                                    title="Clear saved workspace and clean up phantom panes"
                                >
                                    Clear & Clean
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const workspaceData = serializeWorkspace();
                                if (workspaceData) {
                                    saveWorkspaceToStorage(currentPath, workspaceData);
                                    setRootLayoutNode(p => ({ ...p }));
                                }
                            }}
                            className="text-xs theme-button theme-hover px-2 py-1 rounded"
                            title="Save current layout as workspace"
                        >
                            Save Current Layout
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
    const deleteSelectedConversations = async () => {
    const selectedConversationIds = Array.from(selectedConvos);
    const selectedFilePaths = Array.from(selectedFiles);
    
    if (selectedConversationIds.length === 0 && selectedFilePaths.length === 0) {
        return;
    }
    
    try {
        
        if (selectedConversationIds.length > 0) {
            console.log('Deleting conversations from database:', selectedConversationIds);
            await Promise.all(selectedConversationIds.map(id => window.api.deleteConversation(id)));
        }
        
        if (selectedFilePaths.length > 0) {
            console.log('Deleting files from filesystem:', selectedFilePaths);
            await Promise.all(selectedFilePaths.map(filePath => window.api.deleteFile(filePath)));
        }

        
        await loadDirectoryStructure(currentPath);

    } catch (err) {
        console.error('Error deleting items:', err);
        setError(err.message);
    } finally {
        
        setSelectedConvos(new Set());
        setSelectedFiles(new Set());
    }
    };

const refreshDirectoryStructureOnly = async () => {
    try {
        if (!currentPath) {
            console.error('No directory path provided');
            return {};
        }
        const structureResult = await window.api.readDirectoryStructure(currentPath);
        if (structureResult && !structureResult.error) {
            setFolderStructure(structureResult);
        } else {
            console.error('Error loading structure:', structureResult?.error);
            setFolderStructure({ error: structureResult?.error || 'Failed' });
        }
        
        // DON'T load conversations - just refresh the file structure
        console.log('[REFRESH_STRUCTURE] Refreshed folder structure only');
        return structureResult;
    } catch (err) {
        console.error('Error loading structure:', err);
        setError(err.message);
        setFolderStructure({ error: err.message });
        return { error: err.message };
    }
};
const refreshConversations = async () => {
    if (currentPath) {
        console.log('[REFRESH] Starting conversation refresh for path:', currentPath);
        try {
            const normalizedPath = normalizePath(currentPath);
            const response = await window.api.getConversations(normalizedPath);
            console.log('[REFRESH] Got response:', response);
            
            if (response?.conversations) {
                const formattedConversations = response.conversations.map(conv => ({
                    id: conv.id,
                    title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                    preview: conv.preview || 'No content',
                    timestamp: conv.timestamp || Date.now(),
                    last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
                }));
                
                formattedConversations.sort((a, b) => 
                    new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
                );
                
                console.log('[REFRESH] Setting conversations:', formattedConversations.length);
                setDirectoryConversations([...formattedConversations]);
                
                // ADD THIS: Don't auto-select anything - just update the list
                console.log('[REFRESH] Refresh complete, preserving current selection');
            } else {
                console.error('[REFRESH] No conversations in response');
                setDirectoryConversations([]);
            }
        } catch (err) {
            console.error('[REFRESH] Error:', err);
            setDirectoryConversations([]);
        }
    }
};


const renderWebsiteList = () => {
    const header = (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
            <div className="text-xs text-gray-400 font-medium">Websites</div>
                    <div className="flex items-center gap-1 w-[66%]">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        loadWebsiteHistory();
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title="Refresh website history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5"/>
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setWebsitesCollapsed(!websitesCollapsed);
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title={websitesCollapsed ? "Expand websites" : "Collapse websites"}
                >
                    <ChevronRight
                        size={16}
                        className={`transform transition-transform ${websitesCollapsed ? "" : "rotate-90"}`}
                    />
                </button>
            </div>
        </div>
    );

    if (websitesCollapsed && openBrowsers.length === 0) {
        return <div className="mt-4">{header}</div>;
    }

    return (
        <div className="mt-4">
            {header}
            
            {!websitesCollapsed && (
                <div className="px-1 space-y-2">
                    {/* Currently Open Browsers */}
                    {openBrowsers.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-600 px-2 py-1 font-medium">
                                Open Now ({openBrowsers.length})
                            </div>
                            {openBrowsers.map(browser => (
                                <button
                                    key={browser.paneId}
                                    onClick={() => setActiveContentPaneId(browser.paneId)}
                                    className={`flex items-center gap-2 px-2 py-1 w-full text-left rounded transition-all ${
                                        activeContentPaneId === browser.paneId 
                                            ? 'conversation-selected border-l-2 border-blue-500' 
                                            : 'hover:bg-gray-800'
                                    }`}
                                >
                                    <Globe size={14} className="text-blue-400 flex-shrink-0" />
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                        <span className="text-xs truncate font-medium">
                                            {browser.title}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate">
                                            {browser.url}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Common Sites */}
                    {commonSites.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-600 px-2 py-1 font-medium">
                                Common Sites
                            </div>
                            {commonSites.map(site => (
                                <button
                                    key={site.domain}
                                    draggable="true"
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'copyMove';
                                        handleGlobalDragStart(e, { 
                                            type: 'browser', 
                                            id: `browser_${generateId()}`,
                                            url: `https://${site.domain}`
                                        });
                                    }}
                                    onDragEnd={handleGlobalDragEnd}
                                    onClick={() => createNewBrowser(`https://${site.domain}`)}
                                    className="flex items-center gap-2 px-2 py-1 w-full text-left rounded hover:bg-gray-800 transition-all group"
                                >
                                    <img 
                                        src={site.favicon} 
                                        alt="" 
                                        className="w-4 h-4 flex-shrink-0"
                                        onError={(e) => {
                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
                                        }}
                                    />
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                        <span className="text-xs truncate">{site.domain}</span>
                                        <span className="text-xs text-gray-500">
                                            {site.count} visits
                                        </span>
                                    </div>
                                    <Plus 
                                        size={12} 
                                        className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent History */}
                    {websiteHistory.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-600 px-2 py-1 font-medium">
                                Recent History ({websiteHistory.length})
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {websiteHistory.slice(0, 20).map((item, idx) => (
                                    <button
                                        key={`${item.url}-${idx}`}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'copyMove';
                                            handleGlobalDragStart(e, { 
                                                type: 'browser', 
                                                id: `browser_${generateId()}`,
                                                url: item.url
                                            });
                                        }}
                                        onDragEnd={handleGlobalDragEnd}
                                        onClick={() => createNewBrowser(item.url)}
                                        className="flex items-center gap-2 px-2 py-1 w-full text-left rounded hover:bg-gray-800 transition-all"
                                    >
                                        <Globe size={12} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                            <span className="text-xs truncate">
                                                {item.title || new URL(item.url).hostname}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const loadGitStatus = useCallback(async () => {
    setGitLoading(true);
    setGitError(null);
    try {
    const response = await window.api.gitStatus(currentPath);
    setGitStatus(response); // { staged: [], unstaged: [], untracked: [], branch: "", ahead: 0, behind: 0 }
    } catch (err) {
    setGitError(err.message || 'Failed to get git status');
    } finally {
    setGitLoading(false);
    }
}, [currentPath]);
useEffect(() => {
    if (currentPath) {
        loadGitStatus();
    }
    }, [currentPath, loadGitStatus]);

    const renderDiskUsagePanel = () => {
        console.log('[DiskUsage] renderDiskUsagePanel called, currentPath:', currentPath, 'diskUsageCollapsed:', diskUsageCollapsed);
        if (!currentPath) {
            console.log('[DiskUsage] No currentPath, returning null');
            return null;
        }

        return (
            <div className="mt-4 border-t theme-border pt-2">
                {/* Header with collapse toggle */}
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <HardDrive size={14} />
                        Disk Usage
                    </div>
                    <button
                        onClick={() => setDiskUsageCollapsed(!diskUsageCollapsed)}
                        className="p-1 theme-hover rounded"
                        title={diskUsageCollapsed ? "Expand disk usage" : "Collapse disk usage"}
                    >
                        <ChevronRight
                            size={14}
                            className={`transform transition-transform ${diskUsageCollapsed ? "" : "rotate-90"}`}
                        />
                    </button>
                </div>
                {!diskUsageCollapsed && (
                    <div className="px-2">
                        <DiskUsageAnalyzer path={currentPath} isDarkMode={isDarkMode} />
                    </div>
                )}
            </div>
        );
    };

    const renderGitPanel = () => {
        // Only render the panel if gitStatus is available
        if (!gitStatus) return null;
    
        const staged = Array.isArray(gitStatus.staged) ? gitStatus.staged : [];
        const unstaged = Array.isArray(gitStatus.unstaged) ? gitStatus.unstaged : [];
        const untracked = Array.isArray(gitStatus.untracked) ? gitStatus.untracked : [];
    
        return (
            <div className="p-4 border-t theme-border text-xs theme-text-muted">
                {/* Header for the Git Panel with a toggle */}
                <div 
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => setGitPanelCollapsed(!gitPanelCollapsed)} // <--- TOGGLE CLICK HANDLER
                >
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-branch"><circle cx="6" cy="18" r="3"/><path d="M18 6V3"/><path d="M18 18v-4"/><path d="M6 18v-2"/><path d="M6 6v4a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/></svg>
                        Git Status
                        {gitStatus.hasChanges && <span className="text-yellow-400 ml-2">(Changes!)</span>} {/* Indicate changes */}
                    </div>
                    <ChevronRight 
                        size={14} 
                        className={`transform transition-transform ${gitPanelCollapsed ? "" : "rotate-90"}`} // <--- ROTATE ICON
                    />
                </div>
    
                {/* Conditional rendering of the Git panel content */}
                {!gitPanelCollapsed && ( // <--- CONDITIONAL RENDERING
                    <div className="overflow-auto max-h-64 mt-2"> {/* Added mt-2 for spacing */}
                        <div className="mb-2 font-semibold">
                            Git Branch: {gitStatus.branch} {gitStatus.ahead > 0 && <span>↑{gitStatus.ahead}</span>} {gitStatus.behind > 0 && <span>↓{gitStatus.behind}</span>}
                        </div>
        
                        <div>
                            <div className="mb-1 font-semibold">Staged Files</div>
                            {(staged.length === 0) ? <div className="text-gray-600">No staged files</div> :
                            staged.map(file => (
                                <div key={file.path} className="flex justify-between items-center text-green-300">
                                <span title={file.path}>{file.path} (<span className="text-green-500 font-medium">{file.status}</span>)</span>
                                <button
                                    onClick={() => gitUnstageFile(file.path)}
                                    className="p-1 text-red-400 hover:bg-red-600"
                                >
                                    Unstage
                                </button>
                                </div>
                            ))
                            }
                        </div>
        
                        <div className="mt-3">
                            <div className="mb-1 font-semibold">Unstaged / Untracked Files</div>
                            {(unstaged.length + untracked.length === 0) ? <div className="text-gray-600">No unstaged or untracked files</div> :
                            [...unstaged, ...untracked].map(file => (
                                <div key={file.path} className="flex justify-between items-center">
                                <span title={file.path} className={file.isUntracked ? "text-gray-400" : "text-yellow-300"}>
                                    {file.path} (<span className="font-medium">{file.status}</span>)
                                </span>
                                <button
                                    onClick={() => gitStageFile(file.path)}
                                    className="p-1 text-green-400 px-1 rounded hover:bg-green-600"
                                >
                                    Stage
                                </button>
                                </div>
                            ))
                            }
                        </div>
        
                        <div className="mt-4">
                            <input
                                type="text"
                                className="w-full theme-input text-xs rounded px-2 py-1 mb-2"
                                placeholder="Commit message"
                                value={gitCommitMessage}
                                onChange={e => setGitCommitMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button
                                disabled={gitLoading || !gitCommitMessage.trim()}
                                onClick={gitCommitChanges}
                                className="theme-button-primary px-3 py-1 rounded text-xs flex-1 disabled:opacity-50"
                                >
                                Commit
                                </button>
                                <button
                                disabled={gitLoading}
                                onClick={gitPullChanges}
                                className="theme-button px-3 py-1 rounded text-xs flex-1"
                                >
                                Pull
                                </button>
                                <button
                                disabled={gitLoading}
                                onClick={gitPushChanges}
                                className="theme-button px-3 py-1 rounded text-xs flex-1"
                                >
                                Push
                                </button>
                            </div>
                            {gitError && <div className="mt-2 text-red-500 text-xs">{gitError}</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const gitStageFile = async (file) => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitStageFile(currentPath, file);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to stage file');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitUnstageFile = async (file) => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitUnstageFile(currentPath, file);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to unstage file');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitCommitChanges = async () => {
        if (!gitCommitMessage.trim()) return;
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitCommit(currentPath, gitCommitMessage.trim());
          setGitCommitMessage('');
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to commit');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitPullChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitPull(currentPath);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to pull');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitPushChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitPush(currentPath);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to push');
        } finally {
          setGitLoading(false);
        }
      };



      
      const loadDirectoryStructureWithoutConversationLoad = async (dirPath) => {
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
              
              // Load conversations but DON'T auto-select any
              await loadConversationsWithoutAutoSelect(dirPath);
              return structureResult;
          } catch (err) {
              console.error('Error loading structure:', err);
              setError(err.message);
              setFolderStructure({ error: err.message });
              return { error: err.message };
          }
      };
      const loadConversationsWithoutAutoSelect = async (dirPath) => {
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
              
              // DON'T auto-select any conversations
              console.log('[loadConversationsWithoutAutoSelect] Loaded conversations without selecting');
      
          } catch (err) {
              console.error('Error loading conversations:', err);
              setError(err.message);
              setDirectoryConversations([]);
          }
      };

          const handleSearchSubmit = async () => {
              if (!isGlobalSearch || !searchTerm.trim()) {
                  setIsSearching(false);
                  setDeepSearchResults([]);
                  return;
              }

              setIsSearching(true);
              setDeepSearchResults([]);
              setError(null);
          
              try {
                  console.log("Performing GLOBAL search for:", searchTerm);
                  const backendResults = await window.api.performSearch({
                      query: searchTerm,
                      path: currentPath,
                      global: true,
                  });
                  
                  if (backendResults && !backendResults.error) {
                      const sortedResults = (backendResults || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                      setDeepSearchResults(sortedResults);
                  } else {
                      throw new Error(backendResults?.error || "Global search failed.");
                  }
              } catch (err) {
                  console.error("Error during global search:", err);
                  setError(err.message);
                  setDeepSearchResults([]);
              } finally {
                  setIsSearching(false);
              }
          };
      
              const handleSearchChange = (e) => {
                  const searchValue = e.target.value;
                  setSearchTerm(searchValue);
          
                 
                  if (!searchValue.trim()) {
                      setIsSearching(false);
                      setDeepSearchResults([]);
                      setMessageSearchResults([]);
                  }
                 
              };
          
          



              // Update handleSidebarRenameSubmit for sidebar file renaming
              const handleSidebarRenameSubmit = async () => {
                  if (!renamingPath || !editedSidebarItemName.trim()) {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                      return;
                  }
                  
                  const oldName = renamingPath.split('/').pop();
                  if (editedSidebarItemName === oldName) {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                      return;
                  }
                  
                  const dir = renamingPath.substring(0, renamingPath.lastIndexOf('/'));
                  const newPath = `${dir}/${editedSidebarItemName}`;
              
                  try {
                      const response = await window.api.renameFile(renamingPath, newPath);
                      if (response?.error) throw new Error(response.error);
              
                      // Update any open panes with this file
                      Object.entries(contentDataRef.current).forEach(([paneId, paneData]) => {
                          if (paneData.contentType === 'editor' && paneData.contentId === renamingPath) {
                              paneData.contentId = newPath;
                          }
                      });
              
                      await loadDirectoryStructure(currentPath);
                      setRootLayoutNode(p => ({ ...p }));
              
                  } catch (err) {
                      setError(`Failed to rename: ${err.message}`);
                  } finally {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                  }
              };
              

              const renderSidebarItemContextMenu = () => {
    if (!sidebarItemContextMenuPos) return null;
    const { x, y, path, type } = sidebarItemContextMenuPos;

    const selectedFilePaths = Array.from(selectedFiles);

    return (
        <>
            <div
                className="fixed inset-0 z-40"
                onClick={() => setSidebarItemContextMenuPos(null)}
            />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                style={{ top: y, left: x }}
            >
                {type === 'file' && (
                    <>
                        <button
                            onClick={() => {
                                handleApplyPromptToFilesInInput('custom', `Here is the content of the file(s):`);
                                setSidebarItemContextMenuPos(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <MessageSquare size={16} />
                            <span>Add Content to Chat ({selectedFilePaths.length})</span>
                        </button>
                        <button
                            onClick={() => {
                                const fileNames = selectedFilePaths.map(p => p.split('/').pop()).join(', ');
                                setInput(prev => `${prev}${prev ? ' ' : ''}${fileNames}`);
                                setSidebarItemContextMenuPos(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <File size={16} />
                            <span>Add Filename(s) to Chat</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                    </>
                )}

                {type === 'directory' && (
                    <>
                        <button
                            onClick={() => handleOpenFolderAsWorkspace(path)}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <Folder size={16} />
                            <span>Open as Workspace</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                    </>
                )}
                
                <button
                    onClick={handleSidebarRenameStart}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                >
                    <Edit size={16} />
                    <span>Rename</span>
                </button>
                
                <button
                    onClick={handleSidebarItemDelete}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                >
                    <Trash size={16} />
                    <span>Delete</span>
                </button>
            </div>
        </>
    );
};
const renderFolderList = (structure) => {
    if (!structure || typeof structure !== 'object' || structure.error) {
        return <div className="p-2 text-xs text-red-500">Error: {structure?.error || 'Failed to load'}</div>;
    }
    if (Object.keys(structure).length === 0) {
        return <div className="p-2 text-xs text-gray-500">Empty directory</div>;
    }

    const header = (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
            <div className="text-xs text-gray-400 font-medium">Files & Folders</div>
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshFilesAndFolders();
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title="Refresh file and folder list"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5" />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setFilesCollapsed(!filesCollapsed);
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title={filesCollapsed ? "Expand files" : "Collapse files"}
                >
                    <ChevronRight
                        size={16}
                        className={`transform transition-transform ${filesCollapsed ? "" : "rotate-90"}`}
                    />
                </button>
            </div>
        </div>
    );

    if (filesCollapsed) {
        const findCurrentFile = (struct) => {
            for (const [name, content] of Object.entries(struct)) {
                if (content?.path === currentFile && content?.type === 'file') {
                    return { name, content };
                }
            }
            return null;
        };
        const activeFile = currentFile ? findCurrentFile(structure) : null;
        return (
            <div className="mt-4">
                {header}
                {activeFile && (
                    <div className="px-1 mt-1">
                        <button
                            onClick={() => handleFileClick(activeFile.content.path)}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Edit ${activeFile.name}`}
                        >
                            {getFileIcon(activeFile.name)}
                            <span className="text-gray-300 truncate">{activeFile.name}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const renderFolderContents = (currentStructure, parentPath = '') => {
        if (!currentStructure) return null;

        let items = [];
        if (Array.isArray(currentStructure)) {
            items = currentStructure;
        } else if (typeof currentStructure === 'object') {
            items = Object.values(currentStructure);
        }

        items = items.filter(Boolean).sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        return items.map(content => {
            const name = content.name || content.path?.split('/').pop() || 'Unknown';
            const fullPath = content.path || (parentPath ? `${parentPath}/${name}` : name);
            const isFolder = content.type === 'directory';
            const isFile = content.type === 'file';
            const isRenaming = renamingPath === fullPath;

            if (isFolder) {
                return (
                    <div key={fullPath} className="pl-4">
                        <button
                            onClick={(e) => {
                                // Check for Ctrl or Meta key (Command on Mac)
                                if (e.ctrlKey || e.metaKey) {
                                    handleOpenFolderAsWorkspace(fullPath);
                                } else {
                                    setExpandedFolders(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(fullPath)) newSet.delete(fullPath);
                                        else newSet.add(fullPath);
                                        return newSet;
                                    });
                                }
                            }}
                            onDoubleClick={() => handleOpenFolderAsWorkspace(fullPath)} // ADDED THIS LINE
                            onContextMenu={(e) => handleSidebarItemContextMenu(e, fullPath, 'directory')}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Click to expand/collapse ${name}`}
                        >
                            <Folder size={16} className="text-blue-400 flex-shrink-0" />
                            {isRenaming ? (
                                <input
                                    type="text"
                                    value={editedSidebarItemName}
                                    onChange={(e) => setEditedSidebarItemName(e.target.value)}
                                    onBlur={handleSidebarRenameSubmit}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSidebarRenameSubmit();
                                        if (e.key === 'Escape') {
                                            setRenamingPath(null);
                                            setEditedSidebarItemName('');
                                        }
                                    }}
                                    className="theme-input text-xs rounded px-1 py-0.5 border focus:outline-none flex-1"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-gray-300 truncate">{name}</span>
                            )}
                            <ChevronRight
                                size={14}
                                className={`ml-auto transition-transform ${expandedFolders.has(fullPath) ? 'rotate-90' : ''}`}
                            />
                        </button>
                        {expandedFolders.has(fullPath) && renderFolderContents(content.children || content.contents || [], fullPath)}
                    </div>
                );
            } else if (isFile) {
                const fileIcon = getFileIcon(name);
                const isActiveFile = currentFile === fullPath;
                const isSelected = selectedFiles.has(fullPath);
                return (
                    <button
                        key={fullPath}
                        draggable="true"
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copyMove'; handleGlobalDragStart(e, { type: 'file', id: fullPath }); }}
                        onDragEnd={handleGlobalDragEnd}
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                const newSelected = new Set(selectedFiles);
                                if (newSelected.has(fullPath)) newSelected.delete(fullPath);
                                else newSelected.add(fullPath);
                                setSelectedFiles(newSelected);
                            } else if (e.shiftKey && lastClickedFileIndex !== null) {
                                const fileEntries = items.filter(item => item.type === 'file');
                                const currentFileIndex = fileEntries.findIndex(item => item.path === fullPath);
                                const newSelected = new Set();
                                const start = Math.min(lastClickedFileIndex, currentFileIndex);
                                const end = Math.max(lastClickedFileIndex, currentFileIndex);
                                for (let i = start; i <= end; i++) {
                                    if (fileEntries[i]) newSelected.add(fileEntries[i].path);
                                }
                                setSelectedFiles(newSelected);
                            } else {
                                setSelectedFiles(new Set([fullPath]));
                                handleFileClick(fullPath);
                                const fileEntries = items.filter(item => item.type === 'file');
                                setLastClickedFileIndex(fileEntries.findIndex(item => item.path === fullPath));
                            }
                        }}
                        onContextMenu={(e) => handleSidebarItemContextMenu(e, fullPath, 'file')}
                        className={`flex items-center gap-2 px-2 py-1 w-full text-left rounded transition-all duration-200
                            ${isActiveFile ? 'conversation-selected border-l-2 border-blue-500' : 
                              isSelected ? 'conversation-selected' : 'hover:bg-gray-800'}`}
                        title={`Edit ${name}`}
                    >
                        {fileIcon}
                        {isRenaming ? (
                            <input
                                type="text"
                                value={editedSidebarItemName}
                                onChange={(e) => setEditedSidebarItemName(e.target.value)}
                                onBlur={handleSidebarRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSidebarRenameSubmit();
                                    if (e.key === 'Escape') {
                                        setRenamingPath(null);
                                        setEditedSidebarItemName('');
                                    }
                                }}
                                className="theme-input text-xs rounded px-1 py-0.5 border focus:outline-none flex-1"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="text-gray-300 truncate">{name}</span>
                        )}
                    </button>
                );
            }
            return null;
        });
    };

    return (
        <div>
            {header}
            <div className="px-1">{renderFolderContents(structure)}</div>
        </div>
    );
};

    const renderConversationList = (conversations) => {
        if (!conversations?.length) return null;
        
       
        const sortedConversations = [...conversations].sort((a, b) => {
            const aTimestamp = new Date(a.last_message_timestamp || a.timestamp).getTime();
            const bTimestamp = new Date(b.last_message_timestamp || b.timestamp).getTime();
            return bTimestamp - aTimestamp;
        });
        
       
        const header = (
            <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
                <div className="text-xs text-gray-400 font-medium">Conversations ({sortedConversations.length})</div>
                <div className="flex items-center gap-1">
    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            refreshConversations();
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title="Refresh conversations"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5"/>
                        </svg>
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setConversationsCollapsed(!conversationsCollapsed);
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title={conversationsCollapsed ? "Expand conversations" : "Collapse conversations"}
                    >
                        <ChevronRight
                            size={16}
                            className={`transform transition-transform ${conversationsCollapsed ? "" : "rotate-90"}`}
                        />
                    </button>
                </div>
            </div>
        );
        
       
        if (conversationsCollapsed) {
            const activeConversation = activeConversationId ? sortedConversations.find(conv => conv.id === activeConversationId) : null;
            
            return (
                <div className="mt-4">
                    {header}
                    {activeConversation && !currentFile && (
                        <div className="px-1 mt-1">
                            <button
                                key={activeConversation.id}
                                onClick={() => handleConversationSelect(activeConversation.id)}
                                className="flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200 conversation-selected border-l-2 border-blue-500"
                            >
                                <File size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm truncate">{activeConversation.title || activeConversation.id}</span>
                                    <span className="text-xs text-gray-500">{new Date(activeConversation.timestamp).toLocaleString()}</span>
                                </div>
                            </button>
                       
                       
                        </div>
                    
                    )}
                    
                </div>
            );
        }
        
       
        return (
    
            <div className="mt-4">
                {header}
                <div className="px-1">
                    {sortedConversations.map((conv, index) => {
    
                        const isSelected = selectedConvos?.has(conv.id);
                        const isActive = conv.id === activeConversationId && !currentFile;
                        const isLastClicked = lastClickedIndex === index;
    
                        
                        return (
                            <button
                            key={conv.id}
                            draggable="true"
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copyMove'; handleGlobalDragStart(e, { type: 'conversation', id: conv.id }); }}
                            onDragEnd={handleGlobalDragEnd}
    
                            onClick={(e) => { 
                                    if (e.ctrlKey || e.metaKey) { 
                                        const newSelected = new Set(selectedConvos || new Set()); 
                                        if (newSelected.has(conv.id)) { 
                                            newSelected.delete(conv.id); 
                                        } else { 
                                            newSelected.add(conv.id); 
                                        } 
                                        setSelectedConvos(newSelected);
                                        setLastClickedIndex(index);
                                    } else if (e.shiftKey && lastClickedIndex !== null) {
                                        const newSelected = new Set();
                                        const start = Math.min(lastClickedIndex, index);
                                        const end = Math.max(lastClickedIndex, index);
                                        for (let i = start; i <= end; i++) {
                                            if (sortedConversations[i]) {
                                                newSelected.add(sortedConversations[i].id);
                                            }
                                        }
                                        setSelectedConvos(newSelected);
                                    } else { 
                                        setSelectedConvos(new Set([conv.id])); 
                                        handleConversationSelect(conv.id);
                                        setLastClickedIndex(index);
                                    } 
                                }}
                                onContextMenu={(e) => { 
                                    e.preventDefault(); 
                                    if (!selectedConvos?.has(conv.id)) { 
                                        setSelectedConvos(new Set([conv.id])); 
                                    } 
                                    setContextMenuPos({ x: e.clientX, y: e.clientY }); 
                                }}
                                className={`flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200
                                    ${isSelected || isActive ? 'conversation-selected' : 'theme-text-primary'}
                                    ${isActive ? 'border-l-2 border-blue-500' : ''}`}
                            >
                                <File size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm truncate">{conv.title || conv.id}</span>
                                    <span className="text-xs text-gray-500">{new Date(conv.timestamp).toLocaleString()}</span>
                                </div>
    
                            </button>
                            
                        );
    
                
                })}
                
                
                </div>
    
    
    
    
            </div>
        );
    };

        const renderContextMenu = () => (
        contextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                    onMouseLeave={() => setContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleSummarizeAndStart()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize & Start ({selectedConvos?.size || 0})</span>
                    </button>
                    <button
                        onClick={() => handleSummarizeAndDraft()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Summarize & Draft ({selectedConvos?.size || 0})</span>
                    </button>
                    <button
                        onClick={() => handleSummarizeAndPrompt()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize & Prompt ({selectedConvos?.size || 0})</span>
                    </button>
                <div className="border-t theme-border my-1"></div>
                <button
                    onClick={handleAnalyzeInDashboard}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                >
                    <BarChart3 size={16} />
                    <span>Analyze in Dashboard ({selectedConvos?.size || 0})</span>
                </button>
                </div>
            </>
        )
    );

    const renderFileContextMenu = () => (
        fileContextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('refactor')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Code2 size={16} />
                        <span>Refactor Code ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFiles('document')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Document Code ({selectedFiles.size})</span>
                    </button>
                </div>
            </>
        )
    );

// Main Sidebar render
const getPlaceholderText = () => {
    if (isGlobalSearch) {
        return "Global search (Ctrl+Shift+F)...";
    }
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (activePaneData) {
        switch (activePaneData.contentType) {
            case 'editor':
                return "Search in current file (Ctrl+F)...";
            case 'chat':
                return "Search in conversation (Ctrl+F)...";
            default:
                return "Local search (Ctrl+F)...";
        }
    }
    return "Search (Ctrl+F)...";
};

return (
    <>
    <div
        className="border-r theme-border flex flex-col flex-shrink-0 theme-sidebar relative"
        style={{
            width: sidebarCollapsed ? '32px' : `${sidebarWidth}px`,
            transition: sidebarCollapsed ? 'width 0.2s ease' : 'none'
        }}
    >
        {!sidebarCollapsed && (
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingSidebar(true);
                }}
                style={{
                    backgroundColor: isResizingSidebar ? '#3b82f6' : 'transparent'
                }}
            />
        )}

        {/* Header Actions */}
        <div className={`px-4 py-2 border-b theme-border flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
            <div className={`grid grid-cols-2 ${headerActionsExpanded ? 'grid-rows-4' : ''} divide-x divide-y divide-theme-border border theme-border rounded-lg overflow-hidden`}>
                <button onClick={toggleTheme} className="action-grid-button-wide" aria-label="Toggle Theme" title="Toggle Theme">
                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}<span className="text-[10px] ml-1.5">Theme</span>
                </button>
                <div className="relative group">
                    <button onClick={createNewConversation} className="action-grid-button-wide w-full h-full" aria-label="New Chat" title="New Chat (Ctrl+Shift+C)">
                        <Plus size={16} /><span className="text-[10px] ml-1.5">Chat</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 theme-bg-secondary border theme-border rounded shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-all duration-150 min-w-[140px]">
                        <button onClick={handleCreateNewFolder} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <Folder size={14} /><span>New Folder</span>
                        </button>
                        <button onClick={() => setBrowserUrlDialogOpen(true)} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <Globe size={14} /><span>New Browser</span>
                        </button>
                        <button onClick={createNewTerminal} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <Terminal size={14} /><span>New Terminal</span>
                        </button>
                        <button onClick={createNewTextFile} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <Code2 size={14} /><span>New Code File</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={() => createNewDocument?.('docx')} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <FileText size={14} /><span>Word (.docx)</span>
                        </button>
                        <button onClick={() => createNewDocument?.('xlsx')} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <FileJson size={14} /><span>Excel (.xlsx)</span>
                        </button>
                        <button onClick={() => createNewDocument?.('pptx')} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <BarChart3 size={14} /><span>PowerPoint (.pptx)</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={() => { if ((window as any).api?.openNewWindow) (window as any).api.openNewWindow(currentPath); else window.open(window.location.href, '_blank'); }} className="flex items-center gap-2 px-3 py-1.5 w-full text-left theme-hover text-xs">
                            <img src={npcLogo} alt="NPC" style={{ width: 14, height: 14 }} className="rounded-full" /><span>New Workspace</span>
                        </button>
                    </div>
                </div>
                {/* Expanded rows (extensions of top two) */}
                {headerActionsExpanded && (
                    <>
                        <button onClick={handleCreateNewFolder} className="action-grid-button-wide" aria-label="New Folder" title="New Folder (Ctrl+N)">
                            <Folder size={16} /><span className="text-[10px] ml-1.5">Folder</span>
                        </button>
                        <button onClick={() => setBrowserUrlDialogOpen(true)} className="action-grid-button-wide" aria-label="New Browser" title="New Browser (Ctrl+Shift+B)">
                            <Globe size={16} /><span className="text-[10px] ml-1.5">Browser</span>
                        </button>
                        <button onClick={createNewTerminal} className="action-grid-button-wide" aria-label="New Terminal" title="New Terminal (Ctrl+Shift+T)">
                            <Terminal size={16} /><span className="text-[10px] ml-1.5">Terminal</span>
                        </button>
                        <button onClick={createNewTextFile} className="action-grid-button-wide" aria-label="New Code File" title="New Code File (Ctrl+Shift+F)">
                            <Code2 size={16} /><span className="text-[10px] ml-1.5">Code</span>
                        </button>
                        <button onClick={() => setDocDropdownOpen(!docDropdownOpen)} className="action-grid-button-wide" aria-label="New Document" title="New Document">
                            <FileStack size={16} /><span className="text-[10px] ml-1.5">Doc</span>
                        </button>
                        <button onClick={() => { if ((window as any).api?.openNewWindow) (window as any).api.openNewWindow(currentPath); else window.open(window.location.href, '_blank'); }} className="action-grid-button-wide" aria-label="New Workspace" title="New Workspace (Ctrl+Shift+N)">
                            <img src={npcLogo} alt="NPC" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }} className="rounded-full" />
                            <span className="text-[10px] ml-1.5">NPC</span>
                        </button>
                    </>
                )}
            </div>
            {/* Expand/collapse toggle */}
            <button onClick={() => setHeaderActionsExpanded(!headerActionsExpanded)} className="w-full mt-1 py-1 text-[10px] text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1">
                {headerActionsExpanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> More actions</>}
            </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-2 py-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            {loading ? (
                <div className="p-4 theme-text-muted">Loading...</div>
            ) : isSearching ? (
                renderSearchResults()
            ) : (
                <>
                    {renderWebsiteList()}
                    {renderFolderList(folderStructure)}
                    {renderConversationList(directoryConversations)}
                </>
            )}
            {contextMenuPos && renderContextMenu()}
            {sidebarItemContextMenuPos && renderSidebarItemContextMenu()}
            {fileContextMenuPos && renderFileContextMenu()}
        </div>

        {sidebarCollapsed && <div className="flex-1"></div>}

        {/* Top grid (2x3) - ABOVE delete button */}
        {!sidebarCollapsed && (
            <div className="px-4 pb-2">
                <div className="grid grid-cols-3 grid-rows-2 divide-x divide-y divide-theme-border border theme-border rounded-lg overflow-hidden">
                    <button onClick={() => setDashboardMenuOpen(true)} className="action-grid-button" aria-label="Data Dash" title="Data Dash"><BarChart3 size={16} /></button>
                    <button onClick={() => setPhotoViewerOpen(true)} className="action-grid-button" aria-label="Photo Viewer" title="Photo Viewer"><Image size={16} /></button>
                    <button onClick={() => setSettingsOpen(true)} className="action-grid-button" aria-label="Env Settings" title="Env Settings"><FolderCog size={16} /></button>
                    <button onClick={() => setGraphViewerOpen(true)} className="action-grid-button" aria-label="Graph Viewer" title="Graph Viewer (KG + Browser)"><GitBranch size={16} /></button>
                    <button onClick={() => setDataLabelerOpen(true)} className="action-grid-button" aria-label="Data Labeler" title="Data Labeler (Memory + Labels + Activity)"><Tag size={16} /></button>
                    <button onClick={() => setDiskUsageModalOpen(true)} className="action-grid-button" aria-label="Disk Usage" title="Disk Usage Analyzer"><HardDrive size={16} /></button>
                </div>
            </div>
        )}

        <div className={`flex justify-center ${sidebarCollapsed ? 'hidden' : ''}`}>
            <button
                onClick={deleteSelectedConversations}
                className="p-2 theme-hover rounded-full text-red-400 transition-all"
                title="Delete selected items"
            >
                <Trash size={24} />
            </button>
        </div>

        <div className="p-4 border-t theme-border flex-shrink-0">
            {/* Bottom row (1x4): Settings | Team Management | NPCs | Jinxs */}
            {!sidebarCollapsed && (
                <div className="grid grid-cols-4 divide-x divide-theme-border border theme-border rounded-lg overflow-hidden mb-2">
                    <button onClick={() => setSettingsOpen(true)} className="action-grid-button" aria-label="Settings" title="Settings"><Settings size={16} /></button>
                    <button onClick={() => setTeamManagementOpen(true)} className="action-grid-button" aria-label="Team Management" title="Team Management"><Users size={16} /></button>
                    <button onClick={() => setNpcTeamMenuOpen(true)} className="action-grid-button" aria-label="NPCs" title="NPCs"><Bot size={16} /></button>
                    <button onClick={() => setJinxMenuOpen(true)} className="action-grid-button" aria-label="Jinxs" title="Jinxs"><Zap size={16} /></button>
                </div>
            )}

            <div className={`flex justify-center ${!sidebarCollapsed ? 'mt-4' : ''}`}>
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-2 w-full theme-button theme-hover rounded-full transition-all group"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <div className="flex items-center gap-1 group-hover:gap-0 transition-all duration-200 justify-center">
                        <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                        <ChevronRight size={14} className={`transform ${sidebarCollapsed ? '' : 'rotate-180'} group-hover:scale-75 transition-all duration-200`} />
                        <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                    </div>
                </button>
            </div>
        </div>
    </div>

    {/* Chat Plus Dropdown - rendered outside sidebar to avoid clipping */}
    {chatPlusDropdownOpen && (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setChatPlusDropdownOpen(false)} />
            <div className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-2 z-[9999]" style={{ top: '80px', left: '10px', minWidth: '180px' }}>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Create New</div>
                <button onClick={() => { createNewConversation?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <MessageSquare size={16} className="text-blue-400" /><span>Chat</span>
                </button>
                <button onClick={() => { handleCreateNewFolder?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Folder size={16} className="text-yellow-400" /><span>Folder</span>
                </button>
                <button onClick={() => { setBrowserUrlDialogOpen?.(true); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Globe size={16} className="text-cyan-400" /><span>Browser</span>
                </button>
                <button onClick={() => { createNewTerminal?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Terminal size={16} className="text-green-400" /><span>Terminal</span>
                </button>
                <button onClick={() => { createNewTextFile?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Code2 size={16} className="text-purple-400" /><span>Code File</span>
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Documents</div>
                <button onClick={() => { createNewDocument?.('docx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <FileText size={16} className="text-blue-300" /><span>Word (.docx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('xlsx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <FileJson size={16} className="text-green-300" /><span>Excel (.xlsx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('pptx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <BarChart3 size={16} className="text-orange-300" /><span>PowerPoint (.pptx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('mindmap'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Share2 size={16} className="text-pink-300" /><span>Mind Map (.mindmap)</span>
                </button>
            </div>
        </>
    )}

    {/* Doc Dropdown - rendered outside sidebar to avoid clipping from overflow-hidden */}
    {docDropdownOpen && (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setDocDropdownOpen(false)} />
            <div className="fixed theme-bg-secondary border theme-border rounded-lg shadow-2xl py-2 z-[9999]" style={{ top: '160px', left: '10px', minWidth: '150px' }}>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">New Document</div>
                <button onClick={() => { createNewDocument?.('docx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <FileText size={16} className="text-blue-300" /><span>Word (.docx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('xlsx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <FileJson size={16} className="text-green-300" /><span>Excel (.xlsx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('pptx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <BarChart3 size={16} className="text-orange-300" /><span>PowerPoint (.pptx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('mindmap'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <Share2 size={16} className="text-pink-300" /><span>Mind Map</span>
                </button>
            </div>
        </>
    )}
</>
);

};

export default Sidebar;
