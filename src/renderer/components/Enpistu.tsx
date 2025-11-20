 import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File, Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, 
    Send, BarChart3,Minimize2,  Maximize2, MessageCircle, BrainCircuit, Star, Origami, ChevronDown,
    Clock,FolderTree // Add Clock icon for cron jobs

} from 'lucide-react';

import { Icon } from 'lucide-react';
import { avocado } from '@lucide/lab';
import CronDaemonPanel from './CronDaemonPanel'; // <--- NEW IMPORT
import CsvViewer from './CsvViewer';
import DocxViewer from './DocxViewer';
import MacroInput from './MacroInput';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import JinxMenu from './JinxMenu';
import '../../index.css';
import CtxEditor from './CtxEditor';
import MarkdownRenderer from './MarkdownRenderer';
import DataDash from './DataDash';
import CodeEditor from './CodeEditor';
import TerminalView from './Terminal';
import PdfViewer from './PdfViewer';
import WebBrowserViewer from './WebBrowserViewer';
import BrowserUrlDialog from './BrowserUrlDialog';
import PptxViewer from './PptxViewer';
import LatexViewer from './LatexViewer';


// Add these to your lucide-react imports if not already there
// import { X, MessageSquare, Terminal, Globe, FileText, Code2, ListFilter, ArrowUp } from 'lucide-react';
// And also ensure getFileIcon is accessible, usually it's defined near the top.

const ChatInterface = () => {
    const [gitPanelCollapsed, setGitPanelCollapsed] = useState(true); // <--- NEW STATE: Default to collapsed
    const [pdfHighlightsTrigger, setPdfHighlightsTrigger] = useState(0);
    const [conversationBranches, setConversationBranches] = useState(new Map());
    const [currentBranchId, setCurrentBranchId] = useState('main');
    const [showBranchingUI, setShowBranchingUI] = useState(false);
    const [isPredictiveTextEnabled, setIsPredictiveTextEnabled] = useState(false);
    const [predictiveTextModel, setPredictiveTextModel] = useState(null);
    const [predictiveTextProvider, setPredictiveTextProvider] = useState(null);
    const [predictionSuggestion, setPredictionSuggestion] = useState('');
    const [predictionTargetElement, setPredictionTargetElement] = useState(null);
    const predictionStreamIdRef = useRef(null); // To manage the streaming prediction
    const predictionTimeoutRef = useRef(null); // To debounce prediction requests


    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images');
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState(null);
    const [cronDaemonPanelOpen, setCronDaemonPanelOpen] = useState(false); // <--- NEW STATE

    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [lastClickedFileIndex, setLastClickedFileIndex] = useState(null);
    const [fileContextMenuPos, setFileContextMenuPos] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [folderStructure, setFolderStructure] = useState({});
    const [activeConversationId, setActiveConversationId] = useState(null);

    const [currentModel, setCurrentModel] = useState(null);
    const [currentProvider, setCurrentProvider] = useState(null);
    const [currentNPC, setCurrentNPC] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [jinxMenuOpen, setJinxMenuOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const activeConversationRef = useRef(null);
    const [availableModels, setAvailableModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState(null);
    const [ollamaToolModels, setOllamaToolModels] = useState(new Set());
    const [currentFile, setCurrentFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [fileChanged, setFileChanged] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
    const [macroText, setMacroText] = useState('');
    const [baseDir, setBaseDir] = useState('');
    const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
    const screenshotHandlingRef = useRef(false);
    const fileInputRef = useRef(null);
    const listenersAttached = useRef(false);
    const initialLoadComplete = useRef(false);
    const [directoryConversations, setDirectoryConversations] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const streamIdRef = useRef(null);
    const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
    const [analysisContext, setAnalysisContext] = useState(null); 
    const [renamingPaneId, setRenamingPaneId] = useState(null);
    const [editedFileName, setEditedFileName] = useState('');
    const [sidebarItemContextMenuPos, setSidebarItemContextMenuPos] = useState(null);

    const [pdfContextMenuPos, setPdfContextMenuPos] = useState(null);
    const [selectedPdfText, setSelectedPdfText] = useState(null);
    const [pdfHighlights, setPdfHighlights] = useState([]);
    const [browserUrlDialogOpen, setBrowserUrlDialogOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    const [pendingMemories, setPendingMemories] = useState([]);
    const [memoryApprovalModal, setMemoryApprovalModal] = useState({
        isOpen: false,
        memories: []
    });    
    const [gitStatus, setGitStatus] = useState(null);
    const [gitCommitMessage, setGitCommitMessage] = useState('');
    const [gitLoading, setGitLoading] = useState(false);
    const [gitError, setGitError] = useState(null);
    
    const [websiteHistory, setWebsiteHistory] = useState([]);
    const [commonSites, setCommonSites] = useState([]);
    const [openBrowsers, setOpenBrowsers] = useState([]);
    const [websitesCollapsed, setWebsitesCollapsed] = useState(false);
    const [paneContextMenu, setPaneContextMenu] = useState(null);
    const [isInputMinimized, setIsInputMinimized] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
    const [inputHeight, setInputHeight] = useState(200); // Default height in pixels
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingInput, setIsResizingInput] = useState(false);
    const WINDOW_WORKSPACES_KEY = 'npcStudioWindowWorkspaces';



    const [localSearch, setLocalSearch] = useState({
        isActive: false,
        term: '',
        paneId: null,
        results: [],
        currentIndex: -1
    });
    const [windowId] = useState(() => {
        let id = sessionStorage.getItem('npcStudioWindowId');        
        if (!id) {
            id = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('npcStudioWindowId', id);
        }
        console.log('[WINDOW_ID] Using window ID:', id);
        return id;
    });




    const [workspaces, setWorkspaces] = useState(new Map());
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);


    const WORKSPACES_STORAGE_KEY = 'npcStudioWorkspaces_v2'; // Per-path workspaces
    const ACTIVE_WINDOWS_KEY = 'npcStudioActiveWindows';

    const MAX_WORKSPACES = 50; // Limit stored workspaces
    
    const [renamingPath, setRenamingPath] = useState(null);
    const [editedSidebarItemName, setEditedSidebarItemName] = useState('');
    
    const [lastActiveChatPaneId, setLastActiveChatPaneId] = useState(null);    
    const [aiEditModal, setAiEditModal] = useState({
        isOpen: false,
        type: '',
        selectedText: '',
        selectionStart: 0,
        selectionEnd: 0,
        aiResponse: '',
        aiResponseDiff: [],
        showDiff: false,
        isLoading: false,
        streamId: null,
        modelForEdit: null,
        npcForEdit: null,
        customEditPrompt: ''
    });    
 
    const [availableNPCs, setAvailableNPCs] = useState([]);
    const [npcsLoading, setNpcsLoading] = useState(false);
    const [npcsError, setNpcsError] = useState(null);

    const [displayedMessageCount, setDisplayedMessageCount] = useState(10);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
    const streamToPaneRef = useRef({});

    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [messageSelectionMode, setMessageSelectionMode] = useState(false);
    const [messageContextMenuPos, setMessageContextMenuPos] = useState(null);
    const [messageOperationModal, setMessageOperationModal] = useState({
        isOpen: false,
        type: '',
        title: '',
        defaultPrompt: '',
        onConfirm: null
    });
    const [mcpServerPath, setMcpServerPath] = useState('~/.npcsh/npc_team/mcp_server.py');
    const [selectedMcpTools, setSelectedMcpTools] = useState([]);
    const [availableMcpTools, setAvailableMcpTools] = useState([]);
    const [mcpToolsLoading, setMcpToolsLoading] = useState(false);
    const [mcpToolsError, setMcpToolsError] = useState(null);
    const [availableMcpServers, setAvailableMcpServers] = useState([]);
    const [showMcpServersDropdown, setShowMcpServersDropdown] = useState(false);
    const [browserContextMenu, setBrowserContextMenu] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        selectedText: '',
        viewId: null,
    });
    
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const [browserContextMenuPos, setBrowserContextMenuPos] = useState(null);


        
    const [workspaceIndicatorExpanded, setWorkspaceIndicatorExpanded] = useState(false);


    const [ctxEditorOpen, setCtxEditorOpen] = useState(false);

   
    const [filesCollapsed, setFilesCollapsed] = useState(true);
    const [conversationsCollapsed, setConversationsCollapsed] = useState(true);
    const chatContainerRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isGlobalSearch, setIsGlobalSearch] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [deepSearchResults, setDeepSearchResults] = useState([]);
    const [messageSearchResults, setMessageSearchResults] = useState([]);
    const [activeSearchResult, setActiveSearchResult] = useState(null);
    const searchInputRef = useRef(null);
   
    const [rootLayoutNode, setRootLayoutNode] = useState(null);
   
    const [activeContentPaneId, setActiveContentPaneId] = useState(null);

    
    const LAST_ACTIVE_PATH_KEY = 'npcStudioLastPath';
    const LAST_ACTIVE_CONVO_ID_KEY = 'npcStudioLastConvoId';

    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [executionMode, setExecutionMode] = useState('chat');
    const [favoriteModels, setFavoriteModels] = useState(new Set());
    const [showAllModels, setShowAllModels] = useState(true); // Change default to true


    const [availableJinxs, setAvailableJinxs] = useState([]); // [{name, description, path, origin, group}]
    const [favoriteJinxs, setFavoriteJinxs] = useState(new Set());
    const [showAllJinxs, setShowAllJinxs] = useState(false);
    const [showJinxDropdown, setShowJinxDropdown] = useState(false);

    const [selectedJinx, setSelectedJinx] = useState(null);
    const [jinxLoadingError, setJinxLoadingError] = useState(null); // This already exists
    
    const [jinxInputValues, setJinxInputValues] = useState({}); // Stores { jinxName: { inputName: value, ... }, ... }

   
    const [jinxInputs, setJinxInputs] = useState({});

    const [draggedItem, setDraggedItem] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
   
    const contentDataRef = useRef({});
    const [editorContextMenuPos, setEditorContextMenuPos] = useState(null);
    const rootLayoutNodeRef = useRef(rootLayoutNode);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [resendModal, setResendModal] = useState({
        isOpen: false,
        message: null,
        selectedModel: '',
        selectedNPC: ''
    });


    window.addEventListener('beforeunload', saveCurrentWorkspace);
    useEffect(() => {
        rootLayoutNodeRef.current = rootLayoutNode;
    }, [rootLayoutNode]);

    useEffect(() => {
        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingInput(false);
        };

        if (isResizingSidebar || isResizingInput) {
            document.addEventListener('mousemove', isResizingSidebar ? handleSidebarResize : handleInputResize);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', isResizingSidebar ? handleSidebarResize : handleInputResize);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizingSidebar, isResizingInput, handleSidebarResize, handleInputResize]);




    useEffect(() => {
        const saveCurrentWorkspace = () => {
            if (currentPath && rootLayoutNode) {
                const workspaceData = serializeWorkspace();
                if (workspaceData) {
                    saveWorkspaceToStorage(currentPath, workspaceData);
                    console.log(`Saved workspace for ${currentPath}`);
                }
            }
        };
        return () => {
            saveCurrentWorkspace();
            window.removeEventListener('beforeunload', saveCurrentWorkspace);
        };
    }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);

    // In ChatInterface.jsx, update the useEffect that fetches Jinxs
    useEffect(() => {
        const fetchJinxs = async () => {
            try {
                const globalResp = await window.api.getJinxsGlobal(); // { jinxs: [...] }
                let projectResp = { jinxs: [] };
                if (currentPath) {
                    try {
                        projectResp = await window.api.getJinxsProject(currentPath); // { jinxs: [...] }
                    } catch (e) {
                        console.warn('Project jinxs fetch failed:', e?.message || e);
                    }
                }

                // Normalize entries and tag origin
                const normalize = (arr, origin) =>
                    (arr || []).map(j => {
                        let nm, desc = '', pathVal = '', group = '', inputs = [];
                        if (typeof j === 'string') {
                            nm = j;
                        } else if (j) {
                            nm = j.jinx_name || j.name;
                            desc = j.description || '';
                            pathVal = j.path || '';
                            inputs = Array.isArray(j.inputs) ? j.inputs : [];
                        }
                        if (!nm) return null;
                        // group from first path segment (subfolder) or 'root'
                        if (pathVal) {
                            const parts = pathVal.split(/[\\/]/);
                            group = parts.length > 1 ? parts[0] : 'root';
                        } else {
                            group = 'root';
                        }
                        return { name: nm, description: desc, path: pathVal, origin, group, inputs };
                    }).filter(Boolean);

                const merged = [
                    ...normalize(projectResp.jinxs, 'project'),
                    ...normalize(globalResp.jinxs, 'global'),
                ];

                // Deduplicate by name, prefer project over global (project entries come first)
                const seen = new Set();
                const deduped = [];
                for (const j of merged) {
                    const key = j.name;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    deduped.push(j);
                }

                setAvailableJinxs(deduped);
            } catch (err) {
                console.error('Error fetching jinxs:', err);
                setJinxLoadingError(err.message);
                setAvailableJinxs([]);
            }
        };

        fetchJinxs();
    }, [currentPath]);

    // Load MCP tools when in Tool Agent mode or when server path changes
    useEffect(() => {
        const loadMcpTools = async () => {
            if (executionMode !== 'tool_agent') return;
            setMcpToolsLoading(true);
            setMcpToolsError(null);
            const res = await window.api.listMcpTools({ serverPath: mcpServerPath, currentPath });
            setMcpToolsLoading(false);
            if (res.error) {
                setMcpToolsError(res.error);
                setAvailableMcpTools([]);
                return;
            }
            const tools = res.tools || [];
            setAvailableMcpTools(tools);
            const names = tools.map(t => t.function?.name).filter(Boolean);
            setSelectedMcpTools(prev => prev.filter(n => names.includes(n)));
        };
        loadMcpTools();
    }, [executionMode, mcpServerPath, currentPath]);

    // Load MCP servers from contexts for selection in Tool Agent mode
    useEffect(() => {
        const loadServers = async () => {
            if (executionMode !== 'tool_agent') return;
            const res = await window.api.getMcpServers(currentPath);
            if (res && Array.isArray(res.servers)) {
                setAvailableMcpServers(res.servers);
                if (!res.servers.find(s => s.serverPath === mcpServerPath) && res.servers.length > 0) {
                    setMcpServerPath(res.servers[0].serverPath);
                }
            } else {
                setAvailableMcpServers([]);
            }
        };
        loadServers();
    }, [executionMode, currentPath]);
        


    useEffect(() => {
        if (selectedJinx && Array.isArray(selectedJinx.inputs)) {
            setJinxInputValues(prev => {
                const currentJinxValues = prev[selectedJinx.name] || {};
                const newJinxValues = { ...currentJinxValues };

                // Ensure all inputs defined by the jinx have an entry in currentJinxValues
                selectedJinx.inputs.forEach(inputDef => {
                    let inputName = '';
                    let defaultVal = '';
                    if (typeof inputDef === 'string') {
                        inputName = inputDef;
                    } else if (inputDef && typeof inputDef === 'object') {
                        inputName = Object.keys(inputDef)[0];
                        defaultVal = inputDef[inputName] || '';
                    }
                    if (inputName) {
                        if (newJinxValues[inputName] === undefined) {
                            newJinxValues[inputName] = defaultVal;
                        }
                    }
                });
                return { ...prev, [selectedJinx.name]: newJinxValues };
            });
        }
    }, [selectedJinx]);




    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                setIsGlobalSearch(true);
                setIsSearching(true); 
                setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 });
                searchInputRef.current?.focus();
                return; 
            }
    
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const activePane = contentDataRef.current[activeContentPaneId];
                if (activePane?.contentType === 'chat') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalSearch(false);
                    setIsSearching(false);
                    setLocalSearch(prev => ({ ...prev, isActive: true, paneId: activeContentPaneId }));
                }
            }
    
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setBrowserUrlDialogOpen(true);
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeContentPaneId]);
    

    
    
    
    useEffect(() => {
        const cleanup = window.api.onBrowserShowContextMenu(({ x, y, selectedText }) => {
            console.log('[REACT BROWSER CONTEXT] Received context menu event', { x, y, selectedText });
           
            setBrowserContextMenuPos({ x, y, selectedText });
        });
    
        return () => {
            cleanup();
        };
    }, []);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [ activeConversationId]);

   

    
    
    const handlePathChange = useCallback(async (newPath) => {
        // Save current workspace before switching
        if (currentPath && rootLayoutNode) {
            const workspaceData = serializeWorkspace();
            if (workspaceData) {
                saveWorkspaceToStorage(currentPath, workspaceData);
            }
        }
        
        // Switch to new path
        setCurrentPath(newPath);
    }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);


const validateWorkspaceData = (workspaceData) => {
    if (!workspaceData || typeof workspaceData !== 'object') return false;
    if (!workspaceData.layoutNode || !workspaceData.contentData) return false;
    
    // Validate that referenced files/conversations still exist
    // You might want to add API calls to verify this
    
    return true;
};


const [pdfSelectionIndicator, setPdfSelectionIndicator] = useState(null);

useEffect(() => {
    loadPdfHighlightsForActivePane();
}, [activeContentPaneId, pdfHighlightsTrigger, loadPdfHighlightsForActivePane]);




    useEffect(() => {
        if (currentPath) {
            loadAvailableNPCs();
        }
    }, [currentPath]);
    useEffect(() => {
        const handleGlobalDismiss = (e) => {
            if (e.key === 'Escape') {
                setContextMenuPos(null);
                setFileContextMenuPos(null);
                setMessageContextMenuPos(null);
                setEditorContextMenuPos(null);
                setBrowserContextMenu({ isOpen: false, x: 0, y: 0, selectedText: '' });

            }
        };
    
        window.addEventListener('keydown', handleGlobalDismiss);
        return () => {
            window.removeEventListener('keydown', handleGlobalDismiss);
        };
    }, []);


const handleApplyPromptToMessages = async (operationType, customPrompt = '') => {
    const selectedIds = Array.from(selectedMessages);
    if (selectedIds.length === 0) return;


    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) {
        console.error("No active chat pane data found for message operation.");
        return;
    }
    const allMessagesInPane = activePaneData.chatMessages.allMessages;
    const selectedMsgs = allMessagesInPane.filter(msg => selectedIds.includes(msg.id || msg.timestamp));

    
    if (selectedMsgs.length === 0) return;

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
        default:
            prompt = `Process these ${selectedFilePaths.length} file(s):\n\n`;
            break;
    }    
    const messagesText = selectedMsgs.map((msg, idx) => 
        `Message ${idx + 1} (${msg.role}):\n${msg.content}`
    ).join('\n\n');

    const fullPrompt = prompt + messagesText;

    try {
        console.log('Creating new conversation for message operation:', operationType);
        const newConversation = await createNewConversation();
        
        if (!newConversation) throw new Error('Failed to create new conversation');

       
       
        setInput(fullPrompt);
        
    } catch (err) {
        console.error('Error processing messages:', err);
        setError(err.message);
        setInput(fullPrompt);
    } finally {
        setSelectedMessages(new Set());
        setMessageContextMenuPos(null);
        setMessageSelectionMode(false);
    }
};

const handleApplyPromptToCurrentConversation = async (operationType, customPrompt = '') => {
    const selectedIds = Array.from(selectedMessages);
    if (selectedIds.length === 0) return;
    
   
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) {
        console.error("No active chat pane data found for message operation.");
        return;
    }
    const allMessagesInPane = activePaneData.chatMessages.allMessages;
    const selectedMsgs = allMessagesInPane.filter(msg => selectedIds.includes(msg.id || msg.timestamp));
   
    
    if (selectedMsgs.length === 0) return;

    let prompt = '';
    switch (operationType) {
        case 'summarize':
            prompt = `Summarize these ${selectedMsgs.length} messages:\n\n`;
            break;
        case 'analyze':
            prompt = `Analyze these ${selectedMsgs.length} messages for key insights:\n\n`;
            break;
        case 'extract':
            prompt = `Extract the key information from these ${selectedMsgs.length} messages:\n\n`;
            break;
        case 'custom':
            prompt = customPrompt + `\n\nApply this to these ${selectedMsgs.length} messages:\n\n`;
            break;
    }

    const messagesText = selectedMsgs.map((msg, idx) => 
        `Message ${idx + 1} (${msg.role}):\n${msg.content}`
    ).join('\n\n');

    const fullPrompt = prompt + messagesText;

   
    setInput(fullPrompt);
    
   
    setSelectedMessages(new Set());
    setMessageContextMenuPos(null);
    setMessageSelectionMode(false);
};


   
    

    const directoryConversationsRef = useRef(directoryConversations);
    useEffect(() => {
        directoryConversationsRef.current = directoryConversations;
    }, [directoryConversations]);

    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
    }, [isDarkMode]);



    // Load history when path changes
    useEffect(() => {
        if (currentPath) {
            loadWebsiteHistory();
        }
    }, [currentPath, loadWebsiteHistory]);

    // Track open browsers
    useEffect(() => {
        const browsers = Object.entries(contentDataRef.current)
            .filter(([_, data]) => data.contentType === 'browser')
            .map(([paneId, data]) => ({
                paneId,
                url: data.browserUrl,
                viewId: data.contentId,
                title: data.browserTitle || 'Loading...'
            }));
        setOpenBrowsers(browsers);
    }, [rootLayoutNode]); // Re-check when layout changes



const renderMessageContextMenu = () => (
    messageContextMenuPos && (
        <>
            {/* Backdrop to catch outside clicks */}
            <div
                className="fixed inset-0 z-40"
                onClick={() => setMessageContextMenuPos(null)}
            />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                style={{ top: messageContextMenuPos.y, left: messageContextMenuPos.x }}
                onMouseLeave={() => setMessageContextMenuPos(null)}
            >
                {/* Show copy option if there's selected text */}
                {messageContextMenuPos.selectedText && (
                    <>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(messageContextMenuPos.selectedText);
                                setMessageContextMenuPos(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                        >
                            <Edit size={14} />
                            <span>Copy Selected Text</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                    </>
                )}
                
                <button
                    onClick={() => handleApplyPromptToMessages('summarize')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <MessageSquare size={14} />
                    <span>Summarize in New Convo ({selectedMessages.size})</span>
                </button>


                {/* Delete option */}
                <div className="border-t theme-border my-1"></div>
                <button
                    onClick={handleDeleteSelectedMessages}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400 text-xs"
                >
                    <Trash size={14} />
                    <span>Delete Messages ({selectedMessages.size})</span>
                </button>
            </div>
        </>
    )
);


  const createAndAddPaneNodeToLayout = useCallback(() => {
  const newPaneId = generateId();
  
  // Create the contentData entry ONLY AFTER we know where it goes
  let finalPaneId = newPaneId;
  
  setRootLayoutNode(oldRoot => {
    // Initialize contentData entry NOW, inside the state update
    contentDataRef.current[newPaneId] = {};
    
    if (!oldRoot) {
      return { id: newPaneId, type: 'content' };
    }

    let newRoot = JSON.parse(JSON.stringify(oldRoot));
    let targetParent = null;
    let targetIndex = -1;
    let pathToTarget = [];

    if (activeContentPaneId) {
      pathToTarget = findNodePath(newRoot, activeContentPaneId);
      if (pathToTarget && pathToTarget.length > 0) {
        targetParent = findNodeByPath(newRoot, pathToTarget.slice(0, -1));
        targetIndex = pathToTarget[pathToTarget.length - 1];
      }
    }

    if (!targetParent || targetIndex === -1) {
      if (newRoot.type === 'content') {
        const newSplitNode = {
          id: generateId(),
          type: 'split',
          direction: 'horizontal',
          children: [newRoot, { id: newPaneId, type: 'content' }],
          sizes: [50, 50],
        };
        return newSplitNode;
      } else if (newRoot.type === 'split') {
        const newChildren = [...newRoot.children, { id: newPaneId, type: 'content' }];
        const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
        return { ...newRoot, children: newChildren, sizes: newSizes };
      }
    } else {
      if (targetParent.type === 'split') {
        const newChildren = [...targetParent.children];
        newChildren.splice(targetIndex + 1, 0, { id: newPaneId, type: 'content' });
        const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
        const actualTargetParentInNewRoot = findNodeByPath(newRoot, pathToTarget.slice(0, -1));
        if (actualTargetParentInNewRoot) {
          actualTargetParentInNewRoot.children = newChildren;
          actualTargetParentInNewRoot.sizes = newSizes;
        }
        return newRoot;
      }
    }

    return { id: newPaneId, type: 'content' };
  });

  setActiveContentPaneId(newPaneId);
  return newPaneId;
}, [activeContentPaneId, findNodePath, findNodeByPath]);
  
  
   



    useEffect(() => {
        // This effect ensures contentDataRef.current is always in sync with rootLayoutNode.
        // It runs whenever rootLayoutNode changes.
        if (rootLayoutNode) {
            // Create a temporary object to hold the synchronized content data.
            const synchronizedContentData = { ...contentDataRef.current };
            
            // Call the sync function. It will modify synchronizedContentData in place.
            const originalContentDataKeys = Object.keys(contentDataRef.current);
            
            const updatedLayoutNode = syncLayoutWithContentData(rootLayoutNode, synchronizedContentData);
            
            const newContentDataKeys = Object.keys(synchronizedContentData);

            // Check if contentDataRef.current actually changed (added/removed keys)
            if (originalContentDataKeys.length !== newContentDataKeys.length || 
                !originalContentDataKeys.every(key => synchronizedContentData.hasOwnProperty(key)) ||
                !newContentDataKeys.every(key => contentDataRef.current.hasOwnProperty(key))
            ) {
                console.log('[EFFECT] Updating contentDataRef.current and forcing re-render after sync.');
                contentDataRef.current = synchronizedContentData;
                // Force a re-render since contentDataRef.current (a ref) was updated.
                setRootLayoutNode(prev => ({ ...prev }));
            }

            // If the layoutNode itself was changed by syncLayoutWithContentData (e.g., from null to a node)
            // then update the state.
            if (updatedLayoutNode !== rootLayoutNode) {
                setRootLayoutNode(updatedLayoutNode);
            }

        } else {
            // If rootLayoutNode is null, ensure contentDataRef is also empty.
            if (Object.keys(contentDataRef.current).length > 0) {
                console.log('[EFFECT] rootLayoutNode is null, clearing contentDataRef.current.');
                contentDataRef.current = {};
                setRootLayoutNode(prev => ({ ...prev })); // Force re-render
            }
        }
    }, [rootLayoutNode, syncLayoutWithContentData]);


    const handleCreateNewFolder = () => {
        setPromptModal({
            isOpen: true,
            title: 'Create New Folder',
            message: 'Enter the name for the new folder.',
            defaultValue: 'new-folder',
            onConfirm: async (folderName) => {
                if (!folderName || !folderName.trim()) return;
    
                const newFolderPath = normalizePath(`${currentPath}/${folderName}`);
                
                try {
                    const response = await window.api.createDirectory(newFolderPath);
                    
                    if (response?.error) {
                        throw new Error(response.error);
                    }
    
                   
                    await loadDirectoryStructure(currentPath);
    
                } catch (err) {
                    console.error('Error creating new folder:', err);
                    setError(`Failed to create folder: ${err.message}`);
                }
            },
        });
    };
    const createNewTerminal = useCallback(async () => {
        const newTerminalId = `term_${generateId()}`;
        const newPaneId = generateId();
        
        // Create layout first
        setRootLayoutNode(oldRoot => {
            contentDataRef.current[newPaneId] = {};
            
            if (!oldRoot) {
                return { id: newPaneId, type: 'content' };
            }

            let newRoot = JSON.parse(JSON.stringify(oldRoot));
            
            if (activeContentPaneId) {
                const pathToActive = findNodePath(newRoot, activeContentPaneId);
                if (pathToActive && pathToActive.length > 0) {
                    const targetParent = findNodeByPath(newRoot, pathToActive.slice(0, -1));
                    const targetIndex = pathToActive[pathToActive.length - 1];
                    
                    if (targetParent && targetParent.type === 'split') {
                        const newChildren = [...targetParent.children];
                        newChildren.splice(targetIndex + 1, 0, { id: newPaneId, type: 'content' });
                        const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
                        targetParent.children = newChildren;
                        targetParent.sizes = newSizes;
                        return newRoot;
                    }
                }
            }
            
            if (newRoot.type === 'content') {
                return {
                    id: generateId(),
                    type: 'split',
                    direction: 'horizontal',
                    children: [newRoot, { id: newPaneId, type: 'content' }],
                    sizes: [50, 50],
                };
            } else if (newRoot.type === 'split') {
                newRoot.children.push({ id: newPaneId, type: 'content' });
                const equalSize = 100 / newRoot.children.length;
                newRoot.sizes = new Array(newRoot.children.length).fill(equalSize);
                return newRoot;
            }
            
            return { id: newPaneId, type: 'content' };
        });
        
        // Then update content
        setTimeout(async () => {
            await updateContentPane(newPaneId, 'terminal', newTerminalId);
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);
        
        setActiveContentPaneId(newPaneId);
        setActiveConversationId(null);
        setCurrentFile(null);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);

    const handleGlobalDragStart = useCallback((e, item) => {
    Object.values(contentDataRef.current).forEach(paneData => {
        if (paneData.contentType === 'browser' && paneData.contentId) {
        window.api.browserSetVisibility({ viewId: paneData.contentId, visible: false });
        }
  });

    if (item.type === 'pane') {
        const paneNodePath = findNodePath(rootLayoutNode, item.id);
        if (paneNodePath) {
        setDraggedItem({ type: 'pane', id: item.id, nodePath: paneNodePath });
        } else {
        setDraggedItem(null);
        }
    } else {
        setDraggedItem(item);
    }
    }, [rootLayoutNode, findNodePath]);

const handleGlobalDragEnd = () => {
  setDraggedItem(null);
  setDropTarget(null);

  Object.values(contentDataRef.current).forEach(paneData => {
    if (paneData.contentType === 'browser' && paneData.contentId) {
      window.api.browserSetVisibility({ viewId: paneData.contentId, visible: true });
    }
  });
};    
  

  const createNewBrowser = useCallback(async (url = null) => {
    if (!url) {
        setBrowserUrlDialogOpen(true);
        return;
    }

    const newBrowserId = `browser_${generateId()}`;
    const newPaneId = generateId();
    
    // Create layout first
    setRootLayoutNode(oldRoot => {
        contentDataRef.current[newPaneId] = {};
        
        if (!oldRoot) {
            return { id: newPaneId, type: 'content' };
        }

        let newRoot = JSON.parse(JSON.stringify(oldRoot));
        
        if (activeContentPaneId) {
            const pathToActive = findNodePath(newRoot, activeContentPaneId);
            if (pathToActive && pathToActive.length > 0) {
                const targetParent = findNodeByPath(newRoot, pathToActive.slice(0, -1));
                const targetIndex = pathToActive[pathToActive.length - 1];
                
                if (targetParent && targetParent.type === 'split') {
                    const newChildren = [...targetParent.children];
                    newChildren.splice(targetIndex + 1, 0, { id: newPaneId, type: 'content' });
                    const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
                    targetParent.children = newChildren;
                    targetParent.sizes = newSizes;
                    return newRoot;
                }
            }
        }
        
        if (newRoot.type === 'content') {
            return {
                id: generateId(),
                type: 'split',
                direction: 'horizontal',
                children: [newRoot, { id: newPaneId, type: 'content' }],
                sizes: [50, 50],
            };
        } else if (newRoot.type === 'split') {
            newRoot.children.push({ id: newPaneId, type: 'content' });
            const equalSize = 100 / newRoot.children.length;
            newRoot.sizes = new Array(newRoot.children.length).fill(equalSize);
            return newRoot;
        }
        
        return { id: newPaneId, type: 'content' };
    });
    
    // Then update content
    setTimeout(async () => {
        await updateContentPane(newPaneId, 'browser', newBrowserId);
        if (contentDataRef.current[newPaneId]) {
            contentDataRef.current[newPaneId].browserUrl = url;
        }
        setRootLayoutNode(prev => ({ ...prev }));
    }, 0);
    
    setActiveContentPaneId(newPaneId);
    setActiveConversationId(null);
    setCurrentFile(null);
}, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);
const handleBrowserDialogNavigate = (url) => {
        createNewBrowser(url);
        setBrowserUrlDialogOpen(false);
    };
const moveContentPane = useCallback((draggedId, draggedPath, targetPath, dropSide) => {
    setRootLayoutNode(oldRoot => {
        if (!oldRoot) return oldRoot;

        // --- Step 1: Deep copy the layout to avoid mutation issues ---
        let newRoot = JSON.parse(JSON.stringify(oldRoot));

        // --- Step 2: Find the node being dragged ---
        const draggedNode = findNodeByPath(newRoot, draggedPath);
        if (!draggedNode) {
            console.error("Could not find dragged node in layout copy.");
            return oldRoot; // Abort
        }

        // --- Step 3: Remove the dragged node from its original position ---
        const removeNode = (root, path) => {
            if (path.length === 1) { // The node to remove is a direct child of the root
                root.children.splice(path[0], 1);
                root.sizes.splice(path[0], 1);
                return root;
            }

            const parent = findNodeByPath(root, path.slice(0, -1));
            const childIndex = path[path.length - 1];
            if (parent && parent.children) {
                parent.children.splice(childIndex, 1);
                parent.sizes.splice(childIndex, 1);
            }
            return root;
        };
        
        newRoot = removeNode(newRoot, draggedPath);

        // --- Step 4: Clean up any split nodes that now have only one child ---
        const cleanup = (node) => {
            if (!node) return null;
            if (node.type === 'split') {
                if (node.children.length === 1) {
                    return cleanup(node.children[0]);
                }
                node.children = node.children.map(cleanup).filter(Boolean);
                if (node.children.length === 0) return null;
                const equalSize = 100 / node.children.length;
                node.sizes = new Array(node.children.length).fill(equalSize);
            }
            return node;
        };

        newRoot = cleanup(newRoot);
        if (!newRoot) return draggedNode; // If everything was removed, the dragged node becomes the new root

        // --- Step 5: Recalculate the target path in the now-modified tree ---
        // This is the critical fix to prevent the crash
        const newTargetPath = findNodePath(newRoot, findNodeByPath(oldRoot, targetPath)?.id);
        if (!newTargetPath) {
            console.error("Could not find target node path after removal. Aborting drop.");
            return oldRoot;
        }

        // --- Step 6: Insert the dragged node at the new target position ---
        const insertNode = (root, path, nodeToInsert, side) => {
            const targetNode = findNodeByPath(root, path);
            if (!targetNode) return root;

            const isHorizontal = side === 'left' || side === 'right';
            const newSplit = {
                id: generateId(),
                type: 'split',
                direction: isHorizontal ? 'horizontal' : 'vertical',
                children: [],
                sizes: [50, 50],
            };

            if (side === 'left' || side === 'top') {
                newSplit.children = [nodeToInsert, targetNode];
            } else {
                newSplit.children = [targetNode, nodeToInsert];
            }
            
            if (path.length === 0) { // Target was the root
                return newSplit;
            }

            const parent = findNodeByPath(root, path.slice(0, -1));
            const childIndex = path[path.length - 1];
            if (parent && parent.children) {
                parent.children[childIndex] = newSplit;
            }
            return root;
        };

        newRoot = insertNode(newRoot, newTargetPath, draggedNode, dropSide);

        // --- Step 7: Final state update ---
        setActiveContentPaneId(draggedId);
        return newRoot;
    });
}, [findNodeByPath, findNodePath]);











  

    const createNewConversation = useCallback(async (skipMessageLoad = false) => {
        try {
            const conversation = await window.api.createConversation({ directory_path: currentPath });
            if (!conversation || !conversation.id) {
                throw new Error("Failed to create conversation or received invalid data.");
            }

            const formattedNewConversation = {
                id: conversation.id,
                title: 'New Conversation',
                preview: 'No content',
                timestamp: conversation.timestamp || new Date().toISOString()
            };

            setDirectoryConversations(prev => [formattedNewConversation, ...prev]);

            // CRITICAL: Create pane and layout synchronously in one step
            const newPaneId = generateId();
            
            // First, update the layout with the new pane
            setRootLayoutNode(oldRoot => {
                // Initialize contentData entry INSIDE the state update
                contentDataRef.current[newPaneId] = {};
                
                if (!oldRoot) {
                    return { id: newPaneId, type: 'content' };
                }

                let newRoot = JSON.parse(JSON.stringify(oldRoot));
                
                if (activeContentPaneId) {
                    const pathToActive = findNodePath(newRoot, activeContentPaneId);
                    if (pathToActive && pathToActive.length > 0) {
                        const targetParent = findNodeByPath(newRoot, pathToActive.slice(0, -1));
                        const targetIndex = pathToActive[pathToActive.length - 1];
                        
                        if (targetParent && targetParent.type === 'split') {
                            const newChildren = [...targetParent.children];
                            newChildren.splice(targetIndex + 1, 0, { id: newPaneId, type: 'content' });
                            const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
                            targetParent.children = newChildren;
                            targetParent.sizes = newSizes;
                            return newRoot;
                        }
                    }
                }
                
                // Fallback: create split with existing root
                if (newRoot.type === 'content') {
                    return {
                        id: generateId(),
                        type: 'split',
                        direction: 'horizontal',
                        children: [newRoot, { id: newPaneId, type: 'content' }],
                        sizes: [50, 50],
                    };
                } else if (newRoot.type === 'split') {
                    newRoot.children.push({ id: newPaneId, type: 'content' });
                    const equalSize = 100 / newRoot.children.length;
                    newRoot.sizes = new Array(newRoot.children.length).fill(equalSize);
                    return newRoot;
                }
                
                return { id: newPaneId, type: 'content' };
            });

            // THEN update the content (this will now pass validation)
            // Use setTimeout to ensure the state update has completed
            setTimeout(async () => {
                await updateContentPane(newPaneId, 'chat', conversation.id, skipMessageLoad);
                setRootLayoutNode(prev => ({ ...prev })); // Force re-render
            }, 0);

            setActiveContentPaneId(newPaneId);
            setActiveConversationId(conversation.id);
            setCurrentFile(null);

            return { conversation, paneId: newPaneId };

        } catch (err) {
            console.error("Error creating new conversation:", err);
            setError(err.message);
            return { conversation: null, paneId: null };
        }
    }, [currentPath, activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);
    
    const createNewTextFile = async () => {
            try {
                const filename = `untitled-${Date.now()}.txt`;
                const filepath = normalizePath(`${currentPath}/${filename}`);
                await window.api.writeFileContent(filepath, '');
                await loadDirectoryStructure(currentPath);
                await handleFileClick(filepath);
            } catch (err) {
                setError(err.message);
            }
        };




    const [isSaving, setIsSaving] = useState(false);

   

   
    const [isRenamingFile, setIsRenamingFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');





    const [activeWindowsExpanded, setActiveWindowsExpanded] = useState(false);
    const extractCodeFromMarkdown = (text) => {
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    if (matches.length > 0) return matches[matches.length - 1][1].trim();
    const thinkingRegex = /<think>[\s\S]*?<\/think>/g;
    return text.replace(thinkingRegex, '').trim();
    };




    useEffect(() => {
        if (currentPath) {
            localStorage.setItem(LAST_ACTIVE_PATH_KEY, currentPath);
        }
    }, [currentPath]);

    
   
   
    useEffect(() => {
        if (activeConversationId) {
            localStorage.setItem(LAST_ACTIVE_CONVO_ID_KEY, activeConversationId);
        } else {
            localStorage.removeItem(LAST_ACTIVE_CONVO_ID_KEY);
        }
    }, [activeConversationId]);    

    useEffect(() => {
        window.api.onShowMacroInput(() => {
            setIsMacroInputOpen(true);
            setMacroText('');
        });
    }, []);

        
    useEffect(() => {
        const registerWindow = () => {
            try {
                const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                activeWindows[windowId] = {
                    currentPath: currentPath || '',
                    lastActive: Date.now(),
                    created: Date.now()
                };
                localStorage.setItem(ACTIVE_WINDOWS_KEY, JSON.stringify(activeWindows));
            } catch (error) {
                console.error('Error registering window:', error);
            }
        };

        registerWindow();
        
        // Update activity periodically and on focus
        const activityInterval = setInterval(updateActivity, 30000); // Every 30 seconds
        const handleFocus = () => updateActivity();
        const handleVisibilityChange = () => {
            if (!document.hidden) updateActivity();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(activityInterval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [windowId, currentPath]);

    // Cleanup on window close
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Save current workspace
            if (currentPath && rootLayoutNode) {
                const workspaceData = serializeWorkspace();
                if (workspaceData) {
                    saveWorkspaceToStorage(currentPath, workspaceData);
                }
            }
            
            // Mark window as closed but don't remove immediately
            // (in case it's just a refresh)
            try {
                const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                if (activeWindows[windowId]) {
                    activeWindows[windowId].closing = true;
                    activeWindows[windowId].lastActive = Date.now();
                    localStorage.setItem(ACTIVE_WINDOWS_KEY, JSON.stringify(activeWindows));
                }
            } catch (error) {
                console.error('Error marking window as closing:', error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [windowId, currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);
    // Remove the separate workspace loading useEffect completely
    // Instead, integrate it directly into initApplicationData

    useEffect(() => {
        const initApplicationData = async () => {
            setLoading(true);
            setError(null);

            if (!config) {
                try {
                    const loadedConfig = await window.api.getDefaultConfig();
                    if (!loadedConfig || !loadedConfig.baseDir) throw new Error('Invalid config');
                    setConfig(loadedConfig);
                    setBaseDir(loadedConfig.baseDir);
                    return;
                } catch (err) {
                    console.error('Initial config load error:', err);
                    setError(err.message);
                    setLoading(false);
                    return;
                }
            }
            const globalSettings = await window.api.loadGlobalSettings();
            if (globalSettings) {
                // ... (existing global settings loading) ...
                setIsPredictiveTextEnabled(globalSettings.global_settings?.is_predictive_text_enabled || false);
                setPredictiveTextModel(globalSettings.global_settings?.predictive_text_model || 'llama3.2'); // Default to a reasonable model
                setPredictiveTextProvider(globalSettings.global_settings?.predictive_text_provider || 'ollama'); // Default to a reasonable provider
            }
            let initialPathToLoad = config.baseDir;
            const storedPath = localStorage.getItem(LAST_ACTIVE_PATH_KEY);
            if (storedPath) {
                const pathExistsResponse = await window.api.readDirectoryStructure(storedPath);
                if (!pathExistsResponse?.error) {
                    initialPathToLoad = storedPath;
                } else {
                    console.warn(`Stored path "${storedPath}" is invalid or inaccessible. Falling back to default.`);
                    localStorage.removeItem(LAST_ACTIVE_PATH_KEY);
                }
            } else if (config.default_folder) {
                initialPathToLoad = config.default_folder;
            }

            if (currentPath !== initialPathToLoad) {
                setCurrentPath(initialPathToLoad);
                return;
            }

            initialLoadComplete.current = true;

            // CRITICAL: Try to load workspace FIRST, before anything else
            console.log(`[INIT] Attempting to load workspace for ${currentPath}`);
            setIsLoadingWorkspace(true);
            
            let workspaceRestored = false;
            try {
                const savedWorkspace = loadWorkspaceFromStorage(currentPath);
                if (savedWorkspace) {
                    console.log(`[INIT] Found saved workspace for ${currentPath}`, {
                        paneCount: Object.keys(savedWorkspace.contentData).length,
                        layoutExists: !!savedWorkspace.layoutNode
                    });
                    
                    // Load directory structure WITHOUT triggering conversation selection
                    await loadDirectoryStructureWithoutConversationLoad(currentPath);
                    
                    workspaceRestored = await deserializeWorkspace(savedWorkspace);
                    
                    if (workspaceRestored) {
                        console.log(`[INIT] Successfully restored workspace with ${Object.keys(contentDataRef.current).length} panes`);
                    } else {
                        console.log(`[INIT] Workspace restoration failed`);
                    }
                } else {
                    console.log(`[INIT] No saved workspace found for ${currentPath}`);
                }
            } catch (error) {
                console.error(`[INIT] Error loading workspace:`, error);
            } finally {
                setIsLoadingWorkspace(false);
            }

            // Now check if workspace was restored
            const workspaceAlreadyLoaded = workspaceRestored && rootLayoutNode && Object.keys(contentDataRef.current).length > 0;
            
            console.log('[INIT] Workspace check after restoration attempt:', {
                workspaceRestored,
                workspaceAlreadyLoaded,
                rootLayoutNode: !!rootLayoutNode,
                contentDataCount: Object.keys(contentDataRef.current).length
            });

            // Only load directory structure if workspace wasn't restored
            if (!workspaceAlreadyLoaded) {
                console.log('[INIT] No workspace loaded, loading directory structure normally');
                await loadDirectoryStructure(currentPath);
            } else {
                console.log('[INIT] Workspace already loaded, just loading conversations list');
                await loadConversationsWithoutAutoSelect(currentPath);
            }

            const fetchedModels = await fetchModels();
            const fetchedNPCs = await loadAvailableNPCs();

            let modelToSet = config.model || 'llama3.2';
            let providerToSet = config.provider || 'ollama';
            let npcToSet = config.npc || 'sibiji';

            const storedConvoId = localStorage.getItem(LAST_ACTIVE_CONVO_ID_KEY);
            let targetConvoId = null;

            const currentConversations = directoryConversationsRef.current;
            
            if (storedConvoId) {
                const convoInCurrentDir = currentConversations.find(conv => conv.id === storedConvoId);
                if (convoInCurrentDir) {
                    targetConvoId = storedConvoId;
                    const lastUsedInConvo = await window.api.getLastUsedInConversation(targetConvoId);
                    if (lastUsedInConvo?.model) {
                        const validModel = fetchedModels.find(m => m.value === lastUsedInConvo.model);
                        if (validModel) { 
                            modelToSet = validModel.value; 
                            providerToSet = validModel.provider; 
                        }
                    }
                    if (lastUsedInConvo?.npc) {
                        const validNpc = fetchedNPCs.find(n => n.value === lastUsedInConvo.npc);
                        if (validNpc) { 
                            npcToSet = validNpc.value; 
                        }
                    }
                } else {
                    localStorage.removeItem(LAST_ACTIVE_CONVO_ID_KEY);
                }
            }

            if (!targetConvoId) {
                const lastUsedInDir = await window.api.getLastUsedInDirectory(currentPath);
                if (lastUsedInDir?.model) {
                    const validModel = fetchedModels.find(m => m.value === lastUsedInDir.model);
                    if (validModel) { 
                        modelToSet = validModel.value; 
                        providerToSet = validModel.provider; 
                    }
                }
                if (lastUsedInDir?.npc) {
                    const validNpc = fetchedNPCs.find(n => n.value === lastUsedInDir.npc);
                    if (validNpc) { 
                        npcToSet = validNpc.value; 
                    }
                }
            }
            
            if (!fetchedModels.some(m => m.value === modelToSet) && fetchedModels.length > 0) {
                modelToSet = fetchedModels[0].value;
                providerToSet = fetchedModels[0].provider;
            } else if (fetchedModels.length === 0) {
                modelToSet = 'llama3.2';
                providerToSet = 'ollama';
            }

            if (!fetchedNPCs.some(n => n.value === npcToSet) && fetchedNPCs.length > 0) {
                npcToSet = fetchedNPCs[0].value;
            } else if (fetchedNPCs.length === 0) {
                npcToSet = 'sibiji';
            }

            setCurrentModel(modelToSet);
            setCurrentProvider(providerToSet);
            setCurrentNPC(npcToSet);

            // Final check - only create panes if workspace wasn't loaded
    // Final check - only create panes if workspace wasn't loaded
    const hasExistingWorkspace = rootLayoutNode && Object.keys(contentDataRef.current).length > 0;

    console.log('[INIT] Final workspace check:', { 
        hasExistingWorkspace, 
        rootLayoutNode: !!rootLayoutNode, 
        contentDataCount: Object.keys(contentDataRef.current).length
    });

    if (!hasExistingWorkspace) {
        console.log('[INIT] Creating default panes');
        
        if (targetConvoId && currentConversations.find(c => c.id === targetConvoId)) {
            console.log('[INIT] Creating pane for stored conversation:', targetConvoId);
            await handleConversationSelect(targetConvoId, false, false);  // ← THIS IS CREATING PHANTOM PANES!
        }
    } else {
                console.log('[INIT] Workspace exists, skipping pane creation');
                
                if (targetConvoId) {
                    setActiveConversationId(targetConvoId);
                }
            }

            setLoading(false);
        };

        initApplicationData();

    }, [currentPath, config]);






    const PRED_PLACEHOLDER = 'Generating...';
    const streamBuffersRef = useRef(new Map()); // streamId -> pending buffer

    
    
    const renderSearchResults = () => {
        if (searchLoading) {
           

            return <div className="p-4 text-center theme-text-muted">Searching...</div>;
        }

        if (!deepSearchResults || deepSearchResults.length === 0) {
            return <div className="p-4 text-center theme-text-muted">No results for "{searchTerm}".</div>;
        }

        return (
            <div className="mt-4">
                <div className="px-4 py-2 text-xs text-gray-500">Search Results ({deepSearchResults.length})</div>
                {deepSearchResults.map(result => (
                    <button
                        key={result.conversationId}
                        onClick={() => handleSearchResultSelect(result.conversationId, searchTerm)}
                        className={`flex flex-col gap-1 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all ${
                            activeConversationId === result.conversationId ? 'border-l-2 border-blue-500' : ''
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <File size={16} className="text-gray-400 flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm truncate font-semibold">{result.conversationTitle || 'Conversation'}</span>
                                <span className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 pl-6">
                            {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
                        </div>
                        {result.matches[0] && (
                            <div
                                className="text-xs text-gray-500 pl-6 mt-1 italic truncate"
                                title={result.matches[0].snippet}
                            >
                                ...{result.matches[0].snippet}...
                                                       </div>
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const handleRefreshFilesAndFolders = () => {
        if (currentPath) {
            loadDirectoryStructure(currentPath);
        }
    }



                            
                            

    // Update the existing useEffect for resize to include body class management
    useEffect(() => {
        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingInput(false);
            document.body.classList.remove('resizing-sidebar', 'resizing-input');
        };

        if (isResizingSidebar) {
            document.body.classList.add('resizing-sidebar');
            document.addEventListener('mousemove', handleSidebarResize);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.body.classList.remove('resizing-sidebar');
                document.removeEventListener('mousemove', handleSidebarResize);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
        
        if (isResizingInput) {
            document.body.classList.add('resizing-input');
            document.addEventListener('mousemove', handleInputResize);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.body.classList.remove('resizing-input');
                document.removeEventListener('mousemove', handleInputResize);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizingSidebar, isResizingInput, handleSidebarResize, handleInputResize]);




    const renderModals = () => 
    {
        
    return     (
        <>
            <NPCTeamMenu isOpen={npcTeamMenuOpen} onClose={handleCloseNpcTeamMenu} currentPath={currentPath} startNewConversation={startNewConversationWithNpc}/>
            <JinxMenu isOpen={jinxMenuOpen} onClose={() => setJinxMenuOpen(false)} currentPath={currentPath}/>
        <DataDash 
            isOpen={dashboardMenuOpen} 
            onClose={() => {
                setDashboardMenuOpen(false);
                setAnalysisContext(null);
            }}
            initialAnalysisContext={analysisContext}
           
            currentModel={currentModel}
            currentProvider={currentProvider}
            currentNPC={currentNPC}
        />
                <BrowserUrlDialog
            isOpen={browserUrlDialogOpen}
            onClose={() => setBrowserUrlDialogOpen(false)}
            onNavigate={handleBrowserDialogNavigate}
            currentPath={currentPath}
        />



<SettingsMenu
    isOpen={settingsOpen}
    onClose={() => setSettingsOpen(false)}
    currentPath={currentPath}
    onPathChange={(newPath) => { setCurrentPath(newPath); }}
    // NEW PROPS FOR PREDICTIVE TEXT:
    isPredictiveTextEnabled={isPredictiveTextEnabled}
    setIsPredictiveTextEnabled={setIsPredictiveTextEnabled}
    predictiveTextModel={predictiveTextModel}
    setPredictiveTextModel={setPredictiveTextModel}
    predictiveTextProvider={predictiveTextProvider}
    setPredictiveTextProvider={setPredictiveTextProvider}
    availableModels={availableModels} // Pass available models for dropdown
/>

        {resendModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-md w-full">
                    <h3 className="text-lg font-medium mb-4 theme-text-primary">Resend Message</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 theme-text-primary">Model:</label>
                        <select
                            value={resendModal.selectedModel}
                            onChange={(e) => setResendModal(prev => ({ ...prev, selectedModel: e.target.value }))}
                            className="w-full theme-input text-sm rounded px-3 py-2 border"
                            disabled={modelsLoading || !!modelsError}
                        >
                            {modelsLoading && <option value="">Loading...</option>}
                            {modelsError && <option value="">Error loading models</option>}
                            {!modelsLoading && !modelsError && availableModels.length === 0 && (<option value="">No models</option>)}
                            {!modelsLoading && !modelsError && availableModels.map(model => (
                                <option key={model.value} value={model.value}>{model.display_name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 theme-text-primary">NPC:</label>
                        <select
                            value={resendModal.selectedNPC}
                            onChange={(e) => setResendModal(prev => ({ ...prev, selectedNPC: e.target.value }))}
                            className="w-full theme-input text-sm rounded px-3 py-2 border"
                            disabled={npcsLoading || !!npcsError}
                        >
                            {npcsLoading && <option value="">Loading NPCs...</option>}
                            {npcsError && <option value="">Error loading NPCs</option>}
                            {!npcsLoading && !npcsError && availableNPCs.length === 0 && (
                                <option value="">No NPCs available</option>
                            )}
                            {!npcsLoading && !npcsError && availableNPCs.map(npc => (
                                <option key={`${npc.source}-${npc.value}`} value={npc.value}>
                                    {npc.display_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4 p-3 theme-bg-tertiary rounded border">
                        <div className="text-xs theme-text-muted mb-1">Message to resend:</div>
                        <div className="text-sm theme-text-primary max-h-20 overflow-y-auto">
                            {resendModal.message?.content?.substring(0, 200)}
                            {resendModal.message?.content?.length > 200 && '...'}
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button
                            className="px-4 py-2 theme-button theme-hover rounded text-sm"
                            onClick={() => setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' })}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 theme-button-primary rounded text-sm"
                            onClick={() => {
                                handleResendWithSettings(
                                    resendModal.message, 
                                    resendModal.selectedModel, 
                                    resendModal.selectedNPC
                                );
                                setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' });
                            }}
                            disabled={!resendModal.selectedModel || !resendModal.selectedNPC}
                        >
                            Resend
                        </button>
                    </div>
                </div>

            </div>
        )}
        {memoryApprovalModal.isOpen && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">New Memories Extracted</h3>
            
            <div className="space-y-4 mb-6">
                {memoryApprovalModal.memories.map(memory => (
                    <div key={memory.memory_id} className="p-3 theme-bg-tertiary rounded border">
                        <p className="text-sm theme-text-primary mb-2">{memory.content}</p>
                        <div className="text-xs theme-text-muted mb-3">{memory.context}</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleMemoryDecision(memory.memory_id, 'human-approved')}
                                className="px-3 py-1 theme-button-success rounded text-xs"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => handleMemoryDecision(memory.memory_id, 'human-rejected')}
                                className="px-3 py-1 theme-button-danger rounded text-xs"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    const edited = prompt('Edit memory:', memory.content);
                                    if (edited && edited !== memory.content) {
                                        handleMemoryDecision(memory.memory_id, 'human-edited', edited);
                                    }
                                }}
                                className="px-3 py-1 theme-button rounded text-xs"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-end gap-3">
                <button
                    onClick={() => setMemoryApprovalModal({ isOpen: false, memories: [] })}
                    className="px-4 py-2 theme-button rounded text-sm"
                >
                    Ignore for Now
                </button>
            </div>
        </div>
    </div>
)}
{promptModal.isOpen && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex flex-col items-center text-center">
                <div className="theme-bg-tertiary p-3 rounded-full mb-4">
                    {/* You can replace this with a more specific icon if you have one */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="theme-text-primary">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        <path d="M12 15a6 6 0 0 0-3.25 11.25"/>
                        <path d="M12 3a6 6 0 0 0 3.25 11.25"/>
                        <path d="M12 22a6 6 0 0 0 3.25-11.25"/>
                        <path d="M12 3a6 6 0 0 0-3.25 11.25"/>
                        <path d="M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                    </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 theme-text-primary">{promptModal.title}</h3>
                <p className="theme-text-muted mb-4 text-sm">{promptModal.message}</p>
            </div>
<textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={(e) => { if (!isStreaming && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }}
    placeholder={isStreaming ? "Streaming response..." : "Type a message or drop files..."}
    className={`chat-input-textarea w-full theme-input text-sm rounded-lg pl-4 pr-20 py-3 focus:outline-none border-0 resize-none ${isStreaming ? 'opacity-70 cursor-not-allowed' : ''}`}
    style={{
        height: `${Math.max(56, inputHeight - 120)}px`,
        maxHeight: `${inputHeight - 120}px`
    }}
    disabled={isStreaming}
/>

            <div className="flex justify-end gap-3">
                <button
                    className="px-4 py-2 theme-button theme-hover rounded text-sm"
                    onClick={() => setPromptModal({ ...promptModal, isOpen: false })}
                >
                    Cancel
                </button>
                <button
                    className="px-4 py-2 theme-button-primary rounded text-sm"
                    onClick={() => {
                        const value = document.getElementById('customPromptInput').value;
                        promptModal.onConfirm?.(value);
                        setPromptModal({ ...promptModal, isOpen: false });
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    </div>
)}        
            {aiEditModal.isOpen && aiEditModal.type === 'agentic' && !aiEditModal.isLoading && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                        <h3 className="text-lg font-medium mb-4">Proposed Changes ({aiEditModal.proposedChanges?.length || 0} files)</h3>
                        
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {aiEditModal.proposedChanges?.map((change, idx) => {
                                console.log(`Rendering change for ${change.filePath}. Diff length: ${change.diff.length}`);
                                return (
                                    <div key={idx} className="border theme-border rounded p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold">{change.filePath.split('/').pop()}</h4>
                                                <p className="text-xs theme-text-muted mt-1">{change.reasoning}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        console.log(`Attempting to apply and save single change for: ${change.filePath}`); // <--- LAVANZARO'S LOGGING!
                                                        const paneData = contentDataRef.current[change.paneId];
                                                        if (paneData) {
                                                            paneData.fileContent = change.newCode;
                                                            paneData.fileChanged = true;
                                                            setRootLayoutNode(p => ({...p}));
                                                            try {
                                                                await window.api.writeFileContent(change.filePath, change.newCode);
                                                                paneData.fileChanged = false;
                                                                setRootLayoutNode(p => ({...p}));
                                                                console.log(`Successfully applied and saved file: ${change.filePath}`);
                                                            } catch (saveError) {
                                                                console.error(`Error saving file ${change.filePath} after agentic apply:`, saveError); // <--- LAVANZARO'S LOGGING!
                                                                setError(`Failed to save ${change.filePath}: ${saveError.message}`);
                                                            }
                                                        }
                                                        setAiEditModal(prev => ({
                                                            ...prev,
                                                            proposedChanges: prev.proposedChanges.filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="px-3 py-1 theme-button-success rounded text-xs"
                                                >
                                                    Apply
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setAiEditModal(prev => ({
                                                            ...prev,
                                                            proposedChanges: prev.proposedChanges.filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                    className="px-3 py-1 theme-button-danger rounded text-xs"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-2 text-xs font-mono overflow-x-auto border border-yellow-500 rounded p-2">
                                            <div className="text-center theme-text-muted mb-2">--- DIFF CONTENT BELOW (IF AVAILABLE) ---</div>
                                            {change.diff.length > 0 ? (
                                                <table className="w-full">
                                                    <tbody>
                                                        {change.diff.map((line, lineIdx) => (
                                                            <tr key={lineIdx} className={`
                                                                ${line.type === 'added' ? 'bg-green-900/20' : ''}
                                                                ${line.type === 'removed' ? 'bg-red-900/20' : ''}
                                                            `}>
                                                                <td className="px-2 text-gray-600 w-8">{line.originalLine || ''}</td>
                                                                <td className="px-2 text-gray-600 w-8">{line.modifiedLine || ''}</td>
                                                                <td className="px-2">
                                                                    <span className={line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}>
                                                                        {line.content}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="text-center theme-text-muted">No diff content available for this file.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setAiEditModal({ isOpen: false })} className="px-4 py-2 theme-button rounded">
                                Close
                            </button>
                            <button 
                                onClick={async () => {
                                    console.log('Attempting to apply and save ALL changes.'); // <--- LAVANZARO'S LOGGING!
                                    const savePromises = [];
                                    aiEditModal.proposedChanges?.forEach(change => {
                                        const paneData = contentDataRef.current[change.paneId];
                                        if (paneData) {
                                            paneData.fileContent = change.newCode;
                                            paneData.fileChanged = true;
                                            savePromises.push(
                                                window.api.writeFileContent(change.filePath, change.newCode)
                                                    .then(() => {
                                                        paneData.fileChanged = false;
                                                        console.log(`Successfully applied and saved file: ${change.filePath}`);
                                                    })
                                                    .catch(saveError => {
                                                        console.error(`Error saving file ${change.filePath} after agentic apply all:`, saveError); // <--- LAVANZARO'S LOGGING!
                                                        setError(`Failed to save ${change.filePath}: ${saveError.message}`);
                                                    })
                                            );
                                        }
                                    });
                                    await Promise.allSettled(savePromises);
                                    setRootLayoutNode(p => ({...p}));
                                    setAiEditModal({ isOpen: false });
                                }}
                                className="px-4 py-2 theme-button-success rounded"
                            >
                                Apply All
                            </button>
                        </div>
                    </div>
                </div>
            )}


                    {renderPaneContextMenu()}

        {renderPdfContextMenu()}
        {renderBrowserContextMenu()}
        

        {renderMessageContextMenu()}


            {isMacroInputOpen && (<MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({ macro, conversationId, result }) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }}/> )}
            {cronDaemonPanelOpen &&(
            <CronDaemonPanel // <--- NEW PANEL
            isOpen={cronDaemonPanelOpen}
            onClose={() => setCronDaemonPanelOpen(false)}
            currentPath={currentPath}
            npcList={availableNPCs.map(npc => ({ name: npc.name, display_name: npc.display_name }))} // Pass available NPCs
            jinxList={availableJinxs.map(jinx => ({ jinx_name: jinx.name, description: jinx.description }))} // Pass available Jinxs
            onAddCronJob={window.api.addCronJob}
            onAddDaemon={window.api.addDaemon}
            onRemoveCronJob={window.api.removeCronJob}
            onRemoveDaemon={window.api.removeDaemon}
        />
)
            }

            <PhotoViewer 
    isOpen={photoViewerOpen}
    onClose={() => setPhotoViewerOpen(false)}
    currentPath={currentPath}
    onStartConversation={handleStartConversationFromViewer}
/>

            <CtxEditor 
                isOpen={ctxEditorOpen} 
                onClose={() => setCtxEditorOpen(false)} 
                currentPath={currentPath}
            />               
        </>

    );
};




const layoutComponentApi = useMemo(() => ({
    rootLayoutNode,
    setRootLayoutNode,
    findNodeByPath,
    findNodePath,
    activeContentPaneId, setActiveContentPaneId,
    draggedItem, setDraggedItem, dropTarget, setDropTarget,
    contentDataRef, updateContentPane, performSplit,
    closeContentPane,
    moveContentPane,
    createAndAddPaneNodeToLayout,
    renderChatView,
    renderFileEditor,
    renderTerminalView,
    renderPdfViewer,
    renderCsvViewer,
    renderDocxViewer,
    renderBrowserViewer,
    renderPptxViewer,
    renderLatexViewer,
    setPaneContextMenu,
    // ADD THESE NEW PROPS:
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
}), [
    rootLayoutNode,
    findNodeByPath, findNodePath, activeContentPaneId,
    draggedItem, dropTarget, updateContentPane, performSplit, closeContentPane,
    moveContentPane, createAndAddPaneNodeToLayout,
    renderChatView, renderFileEditor, renderTerminalView, renderPdfViewer,
    renderCsvViewer, renderDocxViewer, renderBrowserViewer,
    renderPptxViewer,
    renderLatexViewer,
    setActiveContentPaneId, setDraggedItem, setDropTarget,
    setPaneContextMenu,
    // ADD THESE NEW DEPENDENCIES:
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
]);

const renderMainContent = () => {

    if (!rootLayoutNode) {
        return (
            <div 
                className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-400 m-4"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!draggedItem) return;
                    
                    const newPaneId = generateId();
                    const newLayout = { id: newPaneId, type: 'content' };
                    
                    let contentType;
                    if (draggedItem.type === 'conversation') {
                        contentType = 'chat';
                    } else if (draggedItem.type === 'browser') {
                        contentType = 'browser';
                    } else if (draggedItem.type === 'terminal') {
                        contentType = 'terminal';
                    } else if (draggedItem.type === 'file') {
                        const extension = draggedItem.id.split('.').pop()?.toLowerCase();
                        contentType = extension === 'pdf' ? 'pdf' : 'editor';
                    } else {
                        contentType = 'editor';
                    }
                    
                    contentDataRef.current[newPaneId] = {};
                    await updateContentPane(newPaneId, contentType, draggedItem.id);
                    
                    setRootLayoutNode(newLayout);
                    setActiveContentPaneId(newPaneId);
                    setDraggedItem(null);
                }}  >
                <div className="text-center text-gray-500">
                    <div className="text-xl mb-2">No panes open</div>
                    <div>Drag a conversation or file here to create a new pane</div>
                </div>
            </div>
        );
    }

    return (
        <main className={`flex-1 flex flex-col bg-gray-900 ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}>
            <div className="flex-1 flex overflow-hidden">
                {rootLayoutNode ? (
                    <LayoutNode node={rootLayoutNode} path={[]} component={layoutComponentApi} />
                ) : (
                    <div className="flex-1 flex items-center justify-center theme-text-muted">
                        {loading ? "Loading..." : "Drag a conversation or file to start."}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0">
                {renderInputArea()}
            </div>
        </main>
    );
};


    return (
        <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'} h-screen flex flex-col bg-gray-900 text-gray-100 font-mono`}>
<div className="flex flex-1 overflow-hidden">
    {renderSidebar()}
    {renderMainContent()}
        <PredictiveTextOverlay
            predictionSuggestion={predictionSuggestion}
            predictionTargetElement={predictionTargetElement}
            isPredictiveTextEnabled={isPredictiveTextEnabled}
            setPredictionSuggestion={setPredictionSuggestion}
            setPredictionTargetElement={setPredictionTargetElement}
        />
        

</div>
            {renderModals()}
        <BranchingUI />
            
        </div>
    );
};

export default ChatInterface;
