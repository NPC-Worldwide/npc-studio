 import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File as FileIcon,  Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, 
    Send, BarChart3,Minimize2,  Maximize2, MessageCircle, BrainCircuit, Star, Origami, ChevronDown,
    Clock,FolderTree // Add Clock icon for cron jobs

} from 'lucide-react';

import { Icon } from 'lucide-react';
import { avocado } from '@lucide/lab';
import Sidebar from './Sidebar';
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
import PdfViewer, { loadPdfHighlightsForActivePane } from './PdfViewer';
import WebBrowserViewer from './WebBrowserViewer';
import BrowserUrlDialog from './BrowserUrlDialog';
import PptxViewer from './PptxViewer';
import LatexViewer from './LatexViewer';
import PicViewer from './PicViewer';
import {
    serializeWorkspace,
    saveWorkspaceToStorage,
    loadWorkspaceFromStorage,
    deserializeWorkspace,
    createDefaultWorkspace
} from './workspaces';
import {
    generateId,
    normalizePath,
    getFileIcon,
    convertFileToBase64,
    useLoadWebsiteHistory,
    handleBrowserCopyText,
    handleBrowserAddToChat,
    handleBrowserAiAction,
    loadAvailableNPCs,
    hashContext,
    gatherWorkspaceContext,
    useSwitchToPath,
    useDebounce,
    useAIEditModalStreamHandlers,
    handleMemoryDecision,
    handleBatchMemoryProcess,
    toggleTheme,
    loadDefaultPath,
    fetchModels,
    loadConversations,
    loadDirectoryStructure as loadDirectoryStructureUtil,
    goUpDirectory,
    usePaneAwareStreamListeners,
    useTrackLastActiveChatPane,
    handleRenameFile,
    getThumbnailIcon,
    createToggleMessageSelectionMode,
    findNodeByPath,
    findNodePath
} from './utils';
import { BranchingUI, createBranchPoint } from './BranchingUI';
import { syncLayoutWithContentData } from './LayoutNode';
// Note: Sidebar.tsx, ChatViewer.tsx are code fragments, not proper modules yet
import PaneHeader from './PaneHeader';
import { LayoutNode } from './LayoutNode';
import ConversationList from './ConversationList';
import AutosizeTextarea from './AutosizeTextarea';
import { ChatMessage } from './ChatMessage';
import { PredictiveTextOverlay } from './PredictiveTextOverlay';
import { usePredictiveText } from './PredictiveText';
import { CommandPalette } from './CommandPalette';
import MessageLabeling, { MessageLabelStorage, MessageLabel, ConversationLabel, ConversationLabelStorage, ContextFile, ContextFileStorage } from './MessageLabeling';
import LabeledDataManager from './LabeledDataManager';
import ConversationLabeling from './ConversationLabeling';
import ContextFilesPanel from './ContextFilesPanel';

const ChatInterface = () => {
    const [gitPanelCollapsed, setGitPanelCollapsed] = useState(true);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [pdfHighlightsTrigger, setPdfHighlightsTrigger] = useState(0);
    const [conversationBranches, setConversationBranches] = useState(new Map());
    const [currentBranchId, setCurrentBranchId] = useState('main');
    const [showBranchingUI, setShowBranchingUI] = useState(false);
    const [isPredictiveTextEnabled, setIsPredictiveTextEnabled] = useState(false);
    const [predictiveTextModel, setPredictiveTextModel] = useState<string | null>(null);
    const [predictiveTextProvider, setPredictiveTextProvider] = useState<string | null>(null);
    const [predictionSuggestion, setPredictionSuggestion] = useState('');
    const [predictionTargetElement, setPredictionTargetElement] = useState<HTMLElement | null>(null);


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

    // Message labeling state
    const [labelingModal, setLabelingModal] = useState<{ isOpen: boolean; message: any | null }>({ isOpen: false, message: null });
    const [labeledDataManagerOpen, setLabeledDataManagerOpen] = useState(false);
    const [messageLabels, setMessageLabels] = useState<{ [key: string]: MessageLabel }>(() => {
        // Load existing labels from storage on mount
        const allLabels = MessageLabelStorage.getAll();
        const labelsMap: { [key: string]: MessageLabel } = {};
        allLabels.forEach(label => {
            labelsMap[label.messageId] = label;
        });
        return labelsMap;
    });

    // Conversation labeling state
    const [conversationLabelingModal, setConversationLabelingModal] = useState<{ isOpen: boolean; conversation: any | null }>({ isOpen: false, conversation: null });
    const [conversationLabels, setConversationLabels] = useState<{ [key: string]: ConversationLabel }>(() => {
        const allLabels = ConversationLabelStorage.getAll();
        const labelsMap: { [key: string]: ConversationLabel } = {};
        allLabels.forEach(label => {
            labelsMap[label.conversationId] = label;
        });
        return labelsMap;
    });

    // Context files state
    const [contextFiles, setContextFiles] = useState<ContextFile[]>(() => ContextFileStorage.getAll());
    const [contextFilesCollapsed, setContextFilesCollapsed] = useState(true);



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
    const toggleMessageSelectionMode = createToggleMessageSelectionMode(setMessageSelectionMode, setSelectedMessages);
    const [messageContextMenuPos, setMessageContextMenuPos] = useState(null);
    const [messageOperationModal, setMessageOperationModal] = useState({
        isOpen: false,
        type: '',
        title: '',
        defaultPrompt: '',
        onConfirm: null
    });
    const [resendModal, setResendModal] = useState({
        isOpen: false,
        message: null,
        selectedModel: '',
        selectedNPC: ''
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

    const [contextHash, setContextHash] = useState('');

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

    // Resize handlers for sidebar and input area
    const handleSidebarResize = useCallback((e) => {
        if (!isResizingSidebar) return;
        const newWidth = e.clientX;
        // Constrain between 150px and 500px
        if (newWidth >= 150 && newWidth <= 500) {
            setSidebarWidth(newWidth);
        }
    }, [isResizingSidebar]);

    const handleInputResize = useCallback((e) => {
        if (!isResizingInput) return;
        const newHeight = window.innerHeight - e.clientY;
        // Constrain between 100px and 600px
        if (newHeight >= 100 && newHeight <= 600) {
            setInputHeight(newHeight);
        }
    }, [isResizingInput]);

    // Website history loader hook
    const loadWebsiteHistory = useLoadWebsiteHistory(currentPath, setWebsiteHistory, setCommonSites);

    // Predictive text hook
    usePredictiveText({
        isPredictiveTextEnabled,
        predictiveTextModel,
        predictiveTextProvider,
        currentPath,
        predictionSuggestion,
        setPredictionSuggestion,
        predictionTargetElement,
        setPredictionTargetElement,
    });

    useEffect(() => {
        rootLayoutNodeRef.current = rootLayoutNode;
    }, [rootLayoutNode]);

    useEffect(() => {
        const saveCurrentWorkspace = () => {
            if (currentPath && rootLayoutNode) {
                const workspaceData = serializeWorkspace(
                    rootLayoutNode,
                    currentPath,
                    contentDataRef.current,
                    activeContentPaneId
                );
                if (workspaceData) {
                    saveWorkspaceToStorage(currentPath, workspaceData);
                    console.log(`Saved workspace for ${currentPath}`);
                }
            }
        };

        window.addEventListener('beforeunload', saveCurrentWorkspace);

        return () => {
            saveCurrentWorkspace();
            window.removeEventListener('beforeunload', saveCurrentWorkspace);
        };
    }, [currentPath, rootLayoutNode, activeContentPaneId]);

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

    // Helper function for conversation stats
    const getConversationStats = (messages: any[]) => {
        if (!messages || messages.length === 0) {
            return { messageCount: 0, tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set() };
        }

        const stats = messages.reduce((acc, msg) => {
            if (msg.content) {
                acc.tokenCount += Math.ceil(msg.content.length / 4);
            }
            if (msg.reasoningContent) {
                acc.tokenCount += Math.ceil(msg.reasoningContent.length / 4);
            }
            if (msg.role !== 'user') {
                if (msg.model) acc.models.add(msg.model);
                if (msg.npc) acc.agents.add(msg.npc);
                if (msg.provider) acc.providers.add(msg.provider);
            }
            return acc;
        }, { messageCount: messages.length, tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set() });

        return stats;
    };

    // Path switching hook
    const switchToPath = useSwitchToPath(
        windowId,
        currentPath,
        rootLayoutNode,
        serializeWorkspace,
        saveWorkspaceToStorage,
        setRootLayoutNode,
        setActiveContentPaneId,
        contentDataRef,
        setActiveConversationId,
        setCurrentFile,
        setCurrentPath
    );

    const toggleFavoriteModel = (modelValue: string) => {
        if (!modelValue) return;
        setFavoriteModels(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(modelValue)) {
                newFavorites.delete(modelValue);
            } else {
                newFavorites.add(modelValue);
            }
            localStorage.setItem('npcStudioFavoriteModels', JSON.stringify(Array.from(newFavorites)));
            return newFavorites;
        });
    };

    const modelsToDisplay = useMemo(() => {
        // If no favorites are set, always show all models
        if (favoriteModels.size === 0) {
            return availableModels;
        }

        // If showing all or no favorites exist, show all
        if (showAllModels) {
            return availableModels;
        }

        // Filter to favorites
        return availableModels.filter((m: any) => favoriteModels.has(m.value));
    }, [availableModels, favoriteModels, showAllModels]);

    const jinxsToDisplay = useMemo(() => {
        if (favoriteJinxs.size === 0 || showAllJinxs) return availableJinxs;
        return availableJinxs.filter(j => favoriteJinxs.has(j.name));
    }, [availableJinxs, favoriteJinxs, showAllJinxs]);

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

    // Fetch tool-capable Ollama models
    useEffect(() => {
        const fetchOllamaToolModels = async () => {
            try {
                const res = await fetch('http://localhost:5337/api/ollama/tool_models');
                const data = await res.json();
                if (data?.models) {
                    setOllamaToolModels(new Set(data.models));
                }
            } catch (e) {
                console.warn('Failed to fetch Ollama tool-capable models', e);
            }
        };
        fetchOllamaToolModels();
    }, []);

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




    // Refs to hold callbacks for use in keyboard handler
    const handleFileClickRef = useRef<((filePath: string) => void) | null>(null);
    const createNewTerminalRef = useRef<(() => void) | null>(null);
    const createNewConversationRef = useRef<(() => void) | null>(null);
    const handleCreateNewFolderRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Ctrl+Shift+P - Command Palette (file search)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setCommandPaletteOpen(true);
                return;
            }

            // Ctrl+Shift+F - Global search
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                setIsGlobalSearch(true);
                setIsSearching(true);
                setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 });
                searchInputRef.current?.focus();
                return;
            }

            // Ctrl+O - Open file dialog
            if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O') && !e.shiftKey) {
                e.preventDefault();
                try {
                    const fileData = await (window as any).api.showOpenDialog({
                        properties: ['openFile'],
                        filters: [
                            { name: 'All Files', extensions: ['*'] },
                            { name: 'Code', extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'md'] },
                            { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
                            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] },
                        ],
                    });
                    if (fileData && fileData.length > 0 && handleFileClickRef.current) {
                        handleFileClickRef.current(fileData[0].path);
                    }
                } catch (error) {
                    console.error('Error opening file dialog:', error);
                }
                return;
            }

            // Ctrl+F - Local search in chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const activePane = contentDataRef.current[activeContentPaneId];
                if ((activePane as any)?.contentType === 'chat') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsGlobalSearch(false);
                    setIsSearching(false);
                    setLocalSearch(prev => ({ ...prev, isActive: true, paneId: activeContentPaneId }));
                }
            }

            // Ctrl+B - Open browser URL dialog
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
                e.preventDefault();
                setBrowserUrlDialogOpen(true);
                return;
            }

            // Ctrl+Shift+T - New Terminal
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                createNewTerminalRef.current?.();
                return;
            }

            // Ctrl+Shift+C - New Conversation/Chat
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                createNewConversationRef.current?.();
                return;
            }

            // Ctrl+Shift+B - New Browser
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                setBrowserUrlDialogOpen(true);
                return;
            }

            // Ctrl+Shift+N - New Workspace/Window
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
                e.preventDefault();
                if ((window as any).api?.openNewWindow) {
                    (window as any).api.openNewWindow(currentPath);
                } else {
                    window.open(window.location.href, '_blank');
                }
                return;
            }

            // Ctrl+N - New Folder
            if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N') && !e.shiftKey) {
                e.preventDefault();
                handleCreateNewFolderRef.current?.();
                return;
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

// Update content pane with new content type and ID
const updateContentPane = useCallback(async (paneId, newContentType, newContentId, skipMessageLoad = false) => {
    if (!contentDataRef.current[paneId]) {
        contentDataRef.current[paneId] = {};
    }
    const paneData = contentDataRef.current[paneId];

    paneData.contentType = newContentType;
    paneData.contentId = newContentId;

    if (newContentType === 'editor') {
        try {
            const response = await window.api.readFileContent(newContentId);
            paneData.fileContent = response.error ? `Error: ${response.error}` : response.content;
            paneData.fileChanged = false;
        } catch (err) {
            paneData.fileContent = `Error loading file: ${err.message}`;
        }
    } else if (newContentType === 'browser') {
        paneData.chatMessages = null;
        paneData.fileContent = null;
        paneData.browserUrl = newContentId;
    } else if (newContentType === 'chat') {
        if (!paneData.chatMessages) {
            paneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
        }
        if (skipMessageLoad) {
            paneData.chatMessages.messages = [];
            paneData.chatMessages.allMessages = [];
            paneData.chatStats = getConversationStats([]);
        } else {
            try {
                const msgs = await window.api.getConversationMessages(newContentId);
                const formatted = (msgs && Array.isArray(msgs))
                    ? msgs.map((m) => ({ ...m, id: m.id || generateId() }))
                    : [];
                paneData.chatMessages.allMessages = formatted;
                paneData.chatMessages.messages = formatted.slice(-paneData.chatMessages.displayedMessageCount);
                paneData.chatStats = getConversationStats(formatted);
            } catch (err) {
                paneData.chatMessages.messages = [];
                paneData.chatMessages.allMessages = [];
                paneData.chatStats = getConversationStats([]);
            }
        }
    } else if (newContentType === 'terminal' || newContentType === 'pdf') {
        paneData.chatMessages = null;
        paneData.fileContent = null;
    }

    setRootLayoutNode(oldRoot => syncLayoutWithContentData(oldRoot, contentDataRef.current));
}, []);

// Perform split on a pane - creates a new pane and splits the layout
const performSplit = useCallback((targetNodePath, side, newContentType, newContentId) => {
    setRootLayoutNode(oldRoot => {
        if (!oldRoot) return oldRoot;

        const newRoot = JSON.parse(JSON.stringify(oldRoot));
        let targetNode = newRoot;

        for (let i = 0; i < targetNodePath.length; i++) {
            targetNode = targetNode.children[targetNodePath[i]];
        }

        const newPaneId = generateId();
        const newPaneNode = { id: newPaneId, type: 'content' };

        contentDataRef.current[newPaneId] = {};
        updateContentPane(newPaneId, newContentType, newContentId);

        const isHorizontalSplit = side === 'left' || side === 'right';
        const newSplitNode = {
            id: generateId(),
            type: 'split',
            direction: isHorizontalSplit ? 'horizontal' : 'vertical',
            children: side === 'left' || side === 'top' ? [newPaneNode, targetNode] : [targetNode, newPaneNode],
            sizes: [50, 50]
        };

        if (targetNodePath.length === 0) {
            return newSplitNode;
        }

        let parentNode = newRoot;
        for (let i = 0; i < targetNodePath.length - 1; i++) {
            parentNode = parentNode.children[targetNodePath[i]];
        }
        parentNode.children[targetNodePath[targetNodePath.length - 1]] = newSplitNode;

        setActiveContentPaneId(newPaneId);
        return newRoot;
    });
}, [updateContentPane]);

const closeContentPane = useCallback((paneId, nodePath) => {
    setRootLayoutNode(oldRoot => {
        if (!oldRoot) return oldRoot;

        // If this is the root node and it's a content pane, allow closing it (returns null)
        if (oldRoot.type === 'content' && oldRoot.id === paneId) {
            console.log('[CLOSE_PANE] Closing the last pane');
            delete contentDataRef.current[paneId];
            return null;
        }

        const newRoot = JSON.parse(JSON.stringify(oldRoot));

        // If path is empty, this is the root node - allow closing
        if (nodePath.length === 0) {
            console.log('[CLOSE_PANE] Closing root pane');
            delete contentDataRef.current[paneId];
            return null;
        }

        // Navigate to parent of the node we want to remove
        let parentNode = newRoot;
        for (let i = 0; i < nodePath.length - 1; i++) {
            parentNode = parentNode.children[nodePath[i]];
        }

        const indexToRemove = nodePath[nodePath.length - 1];

        // If parent is a split node with 2 children, replace parent with the sibling
        if (parentNode.type === 'split' && parentNode.children.length === 2) {
            const siblingIndex = indexToRemove === 0 ? 1 : 0;
            const sibling = parentNode.children[siblingIndex];

            // Replace parent with sibling
            if (nodePath.length === 1) {
                // Parent is root, replace root with sibling
                delete contentDataRef.current[paneId];
                return sibling;
            } else {
                // Navigate to grandparent and replace parent with sibling
                let grandParentNode = newRoot;
                for (let i = 0; i < nodePath.length - 2; i++) {
                    grandParentNode = grandParentNode.children[nodePath[i]];
                }
                grandParentNode.children[nodePath[nodePath.length - 2]] = sibling;
            }
        } else if (parentNode.type === 'split' && parentNode.children.length > 2) {
            // Remove the child and redistribute sizes
            parentNode.children.splice(indexToRemove, 1);
            const equalSize = 100 / parentNode.children.length;
            parentNode.sizes = parentNode.children.map(() => equalSize);
        }

        // Clean up contentDataRef
        delete contentDataRef.current[paneId];

        // If we closed the active pane, switch to a different pane
        if (activeContentPaneId === paneId) {
            // Find first content pane in the tree
            const findFirstContentPane = (node) => {
                if (!node) return null;
                if (node.type === 'content') return node.id;
                if (node.type === 'split') {
                    for (const child of node.children) {
                        const found = findFirstContentPane(child);
                        if (found) return found;
                    }
                }
                return null;
            };
            const firstPaneId = findFirstContentPane(newRoot);
            if (firstPaneId) {
                setActiveContentPaneId(firstPaneId);
            }
        }

        return newRoot;
    });
}, [activeContentPaneId, setActiveContentPaneId]);

// Message labeling handlers (defined before renderChatView to avoid reference errors)
const handleLabelMessage = useCallback((message: any) => {
    setLabelingModal({
        isOpen: true,
        message: message
    });
}, []);

const handleSaveLabel = useCallback((label: MessageLabel) => {
    MessageLabelStorage.save(label);
    setMessageLabels(prev => ({
        ...prev,
        [label.messageId]: label
    }));
    setLabelingModal({ isOpen: false, message: null });
}, []);

const handleCloseLabelingModal = useCallback(() => {
    setLabelingModal({ isOpen: false, message: null });
}, []);

// Conversation labeling handlers
const handleLabelConversation = useCallback((conversationId: string, messages: any[]) => {
    setConversationLabelingModal({
        isOpen: true,
        conversation: {
            id: conversationId,
            messages: messages
        }
    });
}, []);

const handleSaveConversationLabel = useCallback((label: ConversationLabel) => {
    ConversationLabelStorage.save(label);
    setConversationLabels(prev => ({
        ...prev,
        [label.conversationId]: label
    }));
    setConversationLabelingModal({ isOpen: false, conversation: null });
}, []);

const handleCloseConversationLabelingModal = useCallback(() => {
    setConversationLabelingModal({ isOpen: false, conversation: null });
}, []);

// Render functions for different content pane types
const renderChatView = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData || !paneData.chatMessages) {
        return <div className="flex-1 flex items-center justify-center theme-text-muted">No messages</div>;
    }

    const messages = paneData.chatMessages.messages || [];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg: any, idx: number) => (
                    <ChatMessage
                        key={msg.id || msg.timestamp || idx}
                        message={msg}
                        isSelected={selectedMessages.has(msg.id || msg.timestamp)}
                        messageSelectionMode={messageSelectionMode}
                        toggleMessageSelection={(msgId) => {
                            const newSet = new Set(selectedMessages);
                            if (newSet.has(msgId)) {
                                newSet.delete(msgId);
                            } else {
                                newSet.add(msgId);
                            }
                            setSelectedMessages(newSet);
                        }}
                        handleMessageContextMenu={(e: React.MouseEvent) => handleMessageContextMenu(e, msg)}
                        searchTerm={searchTerm}
                        isCurrentSearchResult={false}
                        onResendMessage={() => handleResendMessage(msg)}
                        onCreateBranch={() => {}}
                        messageIndex={idx}
                        onLabelMessage={handleLabelMessage}
                        messageLabel={messageLabels[msg.id || msg.timestamp]}
                        conversationId={paneData.contentId}
                    />
                ))}
            </div>
        </div>
    );
}, [selectedMessages, messageSelectionMode, searchTerm, handleLabelMessage, messageLabels]);

const renderFileEditor = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData || !paneData.contentId) {
        return <div className="flex-1 flex items-center justify-center theme-text-muted">No file selected</div>;
    }

    return (
        <CodeEditor
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            setRootLayoutNode={setRootLayoutNode}
            activeContentPaneId={activeContentPaneId}
            editorContextMenuPos={editorContextMenuPos}
            setEditorContextMenuPos={setEditorContextMenuPos}
            aiEditModal={aiEditModal}
            renamingPaneId={renamingPaneId}
            setRenamingPaneId={setRenamingPaneId}
            editedFileName={editedFileName}
            setEditedFileName={setEditedFileName}
            handleTextSelection={() => {}}
            handleEditorCopy={() => {}}
            handleEditorPaste={() => {}}
            handleAddToChat={() => {}}
            setPromptModal={setPromptModal}
        />
    );
}, [activeContentPaneId, editorContextMenuPos, aiEditModal, renamingPaneId, editedFileName, setRootLayoutNode]);

const renderTerminalView = useCallback(({ nodeId }) => {
    return (
        <TerminalView
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            currentPath={currentPath}
            activeContentPaneId={activeContentPaneId}
        />
    );
}, [currentPath, activeContentPaneId]);

const renderPdfViewer = useCallback(({ nodeId }) => {
    return (
        <PdfViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            currentPath={currentPath}
            activeContentPaneId={activeContentPaneId}
            pdfContextMenuPos={pdfContextMenuPos}
            setPdfContextMenuPos={setPdfContextMenuPos}
            handleCopyPdfText={() => {}}
            handleHighlightPdfSelection={() => {}}
            handleApplyPromptToPdfText={() => {}}
            pdfHighlights={pdfHighlights}
            setPdfHighlights={setPdfHighlights}
            pdfHighlightsTrigger={pdfHighlightsTrigger}
        />
    );
}, [currentPath, activeContentPaneId, pdfContextMenuPos, pdfHighlights, pdfHighlightsTrigger]);

const renderCsvViewer = useCallback(({ nodeId }) => {
    return (
        <CsvViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            currentPath={currentPath}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [currentPath, rootLayoutNode, closeContentPane]);

const renderDocxViewer = useCallback(({ nodeId }) => {
    return (
        <DocxViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [rootLayoutNode, closeContentPane]);

const renderBrowserViewer = useCallback(({ nodeId }) => {
    return (
        <WebBrowserViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
        />
    );
}, []);

const renderPptxViewer = useCallback(({ nodeId }) => {
    return (
        <PptxViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [rootLayoutNode, closeContentPane]);

const renderLatexViewer = useCallback(({ nodeId }) => {
    return (
        <LatexViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [rootLayoutNode, closeContentPane]);

const renderPicViewer = useCallback(({ nodeId }) => {
    return (
        <PicViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
        />
    );
}, []);

// Use the PDF highlights loader from PdfViewer module
useEffect(() => {
    loadPdfHighlightsForActivePane(activeContentPaneId, contentDataRef, setPdfHighlights);
}, [activeContentPaneId, pdfHighlightsTrigger]);




    useEffect(() => {
        if (currentPath) {
            loadAvailableNPCs(currentPath, setNpcsLoading, setNpcsError, setAvailableNPCs);
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

    // Set data transfer for context files panel
    if (item.type === 'file' && item.id) {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'sidebar-file',
            path: item.id
        }));
    }

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







    // Directory and conversation loading functions
    const loadConversationsWithoutAutoSelect = async (dirPath: string) => {
        try {
            const normalizedPath = normalizePath(dirPath);
            if (!normalizedPath) return;
            const response = await window.api.getConversations(normalizedPath);
            const formattedConversations = response?.conversations?.map((conv: any) => ({
                id: conv.id,
                title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                preview: conv.preview || 'No content',
                timestamp: conv.timestamp || Date.now(),
                last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
            })) || [];
            setDirectoryConversations(formattedConversations);
            console.log('[loadConversationsWithoutAutoSelect] Loaded conversations without selecting');
        } catch (err: any) {
            console.error('Error loading conversations:', err);
            setError(err.message);
            setDirectoryConversations([]);
        }
    };

    const loadDirectoryStructureWithoutConversationLoad = async (dirPath: string) => {
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
            await loadConversationsWithoutAutoSelect(dirPath);
            return structureResult;
        } catch (err: any) {
            console.error('Error loading structure:', err);
            setError(err.message);
            setFolderStructure({ error: err.message });
            return { error: err.message };
        }
    };

    const loadDirectoryStructure = async (dirPath: string) => {
        await loadDirectoryStructureUtil(
            dirPath,
            setFolderStructure,
            loadConversationsWithoutAutoSelect,
            setError
        );
    };

    // File drag and drop handler
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);

        // Check for sidebar file drag (add to context files)
        const jsonData = e.dataTransfer.getData('application/json');
        const textData = e.dataTransfer.getData('text/plain');

        if (jsonData) {
            try {
                const data = JSON.parse(jsonData);
                if (data.type === 'sidebar-file' && data.path) {
                    // Add to context files
                    const response = await window.api?.readFileContent?.(data.path);
                    const content = response?.content || '';
                    const name = data.path.split('/').pop() || data.path;

                    const newFile = {
                        id: crypto.randomUUID(),
                        path: data.path,
                        name: name,
                        content: content,
                        size: content.length,
                        addedAt: new Date().toISOString(),
                        source: 'sidebar' as const
                    };

                    setContextFiles(prev => {
                        if (prev.find(f => f.path === data.path)) return prev;
                        return [...prev, newFile];
                    });
                    return;
                }
            } catch (err) {
                console.error('Failed to parse drag data:', err);
            }
        }

        // Check for file path from sidebar (plain text starting with /)
        if (textData && textData.startsWith('/') && !e.dataTransfer.files.length) {
            const response = await window.api?.readFileContent?.(textData);
            const content = response?.content || '';
            const name = textData.split('/').pop() || textData;

            const newFile = {
                id: crypto.randomUUID(),
                path: textData,
                name: name,
                content: content,
                size: content.length,
                addedAt: new Date().toISOString(),
                source: 'sidebar' as const
            };

            setContextFiles(prev => {
                if (prev.find(f => f.path === textData)) return prev;
                return [...prev, newFile];
            });
            return;
        }

        // Handle external file drops (original behavior - add as attachments)
        const files = Array.from(e.dataTransfer.files);

        const existingFileNames = new Set(uploadedFiles.map(f => f.name));
        const newFiles = files.filter(file => !existingFileNames.has(file.name));

        const attachmentPromises = newFiles.map(async (file) => {
            try {
                const { dataUrl, base64 } = await convertFileToBase64(file);
                return {
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    data: base64,
                    size: file.size,
                    preview: file.type.startsWith('image/') ? dataUrl : null
                };
            } catch (error) {
                console.error(`Failed to process dropped file ${file.name}:`, error);
                return null;
            }
        });

        const attachmentData = (await Promise.all(attachmentPromises)).filter(Boolean);

        if (attachmentData.length > 0) {
            setUploadedFiles(prev => [...prev, ...attachmentData]);
        }
    };

    // File attachment click handler
    const handleAttachFileClick = async () => {
        try {
            const fileData = await window.api.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
            });

            if (fileData && fileData.length > 0) {
                const existingFileNames = new Set(uploadedFiles.map(f => f.name));
                const newFiles = fileData.filter((file: any) => !existingFileNames.has(file.name));

                const attachmentData = newFiles.map((file: any) => ({
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    path: file.path,
                    size: file.size,
                    preview: file.type.startsWith('image/') ? `file://${file.path}` : null
                }));

                if (attachmentData.length > 0) {
                    setUploadedFiles(prev => [...prev, ...attachmentData]);
                }
            }
        } catch (error) {
            console.error('Error selecting files:', error);
        }
    };

    // Main input submit handler
    const handleInputSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isJinxMode = executionMode !== 'chat' && selectedJinx;
        const currentJinxInputs = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};

        const hasContent = (input || '').trim() || uploadedFiles.length > 0 || (isJinxMode && Object.values(currentJinxInputs).some(val => val !== null && String(val).trim()));

        if (isStreaming || !hasContent || (!activeContentPaneId && !isJinxMode)) {
            if (!isJinxMode && !activeContentPaneId) {
                console.error("No active chat pane to send message to.");
            }
            return;
        }

        const paneData = contentDataRef.current[activeContentPaneId];
        if (!paneData || paneData.contentType !== 'chat' || !paneData.contentId) {
            console.error("No active chat pane to send message to.");
            return;
        }

        const conversationId = paneData.contentId;
        const newStreamId = generateId();

        streamToPaneRef.current[newStreamId] = activeContentPaneId;
        setIsStreaming(true);

        let finalPromptForUserMessage = input;
        let jinxName = null;
        let jinxArgsForApi: any[] = [];

        if (isJinxMode) {
            jinxName = selectedJinx.name;

            selectedJinx.inputs.forEach((inputDef: any) => {
                const inputName = typeof inputDef === 'string' ? inputDef : Object.keys(inputDef)[0];
                const value = currentJinxInputs[inputName];
                if (value !== null && String(value).trim()) {
                    jinxArgsForApi.push(value);
                } else {
                    const defaultValue = typeof inputDef === 'object' ? inputDef[inputName] : '';
                    jinxArgsForApi.push(defaultValue || '');
                }
            });

            console.log(`[Jinx Submit] Jinx Name: ${jinxName}`);
            console.log(`[Jinx Submit] jinxArgsForApi (ordered array before API call):`, JSON.stringify(jinxArgsForApi, null, 2));

            const jinxCommandParts = [`/${selectedJinx.name}`];
            selectedJinx.inputs.forEach((inputDef: any) => {
                const inputName = typeof inputDef === 'string' ? inputDef : Object.keys(inputDef)[0];
                const value = currentJinxInputs[inputName];
                if (value !== null && String(value).trim()) {
                    jinxCommandParts.push(`${inputName}="${String(value).replace(/"/g, '\\"')}"`);
                }
            });
            finalPromptForUserMessage = jinxCommandParts.join(' ');

        } else {
            const contexts = gatherWorkspaceContext(contentDataRef, contextFiles);
            const newHash = hashContext(contexts);
            const contextChanged = newHash !== contextHash;

            if (contexts.length > 0 && contextChanged) {
                const fileContexts = contexts.filter((c: any) => c.type === 'file');
                const browserContexts = contexts.filter((c: any) => c.type === 'browser');
                let contextPrompt = '';

                if (fileContexts.length > 0) {
                    contextPrompt += fileContexts.map((ctx: any) =>
                        `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\``
                    ).join('\n\n');
                }

                if (browserContexts.length > 0) {
                    if (contextPrompt) contextPrompt += '\n\n';

                    const browserContentPromises = browserContexts.map(async (ctx: any) => {
                        const result = await window.api.browserGetPageContent({
                            viewId: ctx.viewId
                        });
                        if (result.success && result.content) {
                            return `Webpage: ${result.title} (${result.url})\n\`\`\`\n${result.content}\n\`\`\``;
                        }
                        return `Currently viewing: ${ctx.url}`;
                    });

                    const browserContents = await Promise.all(browserContentPromises);
                    contextPrompt += browserContents.join('\n\n');
                }

                if (executionMode === 'agent') {
                    finalPromptForUserMessage = `${input}

Available context:
${contextPrompt}

IMPORTANT: Propose changes as unified diffs, NOT full file contents.`;
                } else {
                    finalPromptForUserMessage = `${input}

Context - currently open:
${contextPrompt}`;
                }

                setContextHash(newHash);
            }
        }

        const userMessage = {
            id: generateId(),
            role: 'user',
            content: finalPromptForUserMessage,
            timestamp: new Date().toISOString(),
            attachments: uploadedFiles,
            executionMode: executionMode,
            isJinxCall: isJinxMode,
            jinxName: isJinxMode ? jinxName : null,
            jinxInputs: isJinxMode ? jinxArgsForApi : null
        };

        const assistantPlaceholder = {
            id: newStreamId, role: 'assistant', content: '', timestamp: new Date().toISOString(),
            isStreaming: true, streamId: newStreamId, npc: currentNPC, model: currentModel
        };

        if (!paneData.chatMessages) {
            paneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
        }
        paneData.chatMessages.allMessages.push(userMessage, assistantPlaceholder);
        paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-(paneData.chatMessages.displayedMessageCount || 20));
        paneData.chatStats = getConversationStats(paneData.chatMessages.allMessages);

        setRootLayoutNode(prev => ({ ...prev }));
        setInput('');
        setUploadedFiles([]);
        if (isJinxMode) {
            setJinxInputValues(prev => ({
                ...prev,
                [selectedJinx.name]: {}
            }));
        }

        try {
            const selectedNpc = availableNPCs.find((npc: any) => npc.value === currentNPC);

            if (isJinxMode) {
                await window.api.executeJinx({
                    jinxName: jinxName,
                    jinxArgs: jinxArgsForApi,
                    currentPath,
                    conversationId,
                    model: currentModel,
                    provider: currentProvider,
                    npc: selectedNpc ? selectedNpc.name : currentNPC,
                    npcSource: selectedNpc ? selectedNpc.source : 'global',
                    streamId: newStreamId,
                });
            } else {
                const commandData = {
                    commandstr: finalPromptForUserMessage,
                    currentPath,
                    conversationId,
                    model: currentModel,
                    provider: currentProvider,
                    npc: selectedNpc ? selectedNpc.name : currentNPC,
                    npcSource: selectedNpc ? selectedNpc.source : 'global',
                    attachments: uploadedFiles.map((f: any) => {
                        if (f.path) return { name: f.name, path: f.path, size: f.size, type: f.type };
                        else if (f.data) return { name: f.name, data: f.data, size: f.size, type: f.type };
                        return { name: f.name, type: f.type };
                    }),
                    streamId: newStreamId,
                    executionMode: executionMode,
                    mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
                    selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
                };
                console.log('[DEBUG] Sending to backend via executeCommandStream:', commandData);
                await window.api.executeCommandStream(commandData);
                console.log('[DEBUG] executeCommandStream call completed');
            }
        } catch (err: any) {
            setError(err.message);
            setIsStreaming(false);
            delete streamToPaneRef.current[newStreamId];
        }
    };

    const handleInterruptStream = async () => {
        const activePaneData = contentDataRef.current[activeContentPaneId];
        if (!activePaneData || !activePaneData.chatMessages) {
            console.warn("Interrupt clicked but no active chat pane found.");
            return;
        }

        const streamingMessage = activePaneData.chatMessages.allMessages.find((m: any) => m.isStreaming);
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

    const handleMessageContextMenu = (e: React.MouseEvent, message: any) => {
        e.preventDefault();
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';

        setMessageContextMenuPos({
            x: e.clientX,
            y: e.clientY,
            selectedText,
            messageId: message.id || message.timestamp
        });
    };

    const handleApplyPromptToMessages = async (operationType: string, customPrompt = '') => {
        const selectedIds = Array.from(selectedMessages);
        if (selectedIds.length === 0) return;

        const activePaneData = contentDataRef.current[activeContentPaneId];
        if (!activePaneData || !activePaneData.chatMessages) {
            console.error("No active chat pane data found for message operation.");
            return;
        }
        const allMessagesInPane = activePaneData.chatMessages.allMessages;
        const selectedMsgs = allMessagesInPane.filter((msg: any) => selectedIds.includes(msg.id || msg.timestamp));

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
            default:
                prompt = `Process these ${selectedMsgs.length} messages:\n\n`;
                break;
        }

        const messagesText = selectedMsgs.map((msg: any, idx: number) =>
            `Message ${idx + 1} (${msg.role}):\n${msg.content}`
        ).join('\n\n');

        const fullPrompt = prompt + messagesText;

        try {
            console.log('Creating new conversation for message operation:', operationType);
            await createNewConversation();
            setInput(fullPrompt);
        } catch (err: any) {
            console.error('Error processing messages:', err);
            setError(err.message);
            setInput(fullPrompt);
        } finally {
            setSelectedMessages(new Set());
            setMessageContextMenuPos(null);
            setMessageSelectionMode(false);
        }
    };

    const handleResendMessage = (messageToResend: any) => {
        if (isStreaming) {
            console.warn('Cannot resend while streaming');
            return;
        }

        setResendModal({
            isOpen: true,
            message: messageToResend,
            selectedModel: currentModel,
            selectedNPC: currentNPC
        });
    };

    const handleDeleteSelectedMessages = async () => {
        const selectedIds = Array.from(selectedMessages);
        if (selectedIds.length === 0) return;

        const activePaneData = contentDataRef.current[activeContentPaneId];
        if (!activePaneData || !activePaneData.chatMessages) {
            console.error("No active chat pane for deletion.");
            return;
        }

        const conversationId = activePaneData.contentId;
        if (!conversationId) return;

        try {
            const messageIdsToDelete = activePaneData.chatMessages.allMessages
                .filter((m: any) => selectedIds.includes(m.id || m.timestamp))
                .map((m: any) => m.message_id || m.id)
                .filter(Boolean);

            if (messageIdsToDelete.length > 0) {
                await window.api.deleteMessages({
                    conversationId,
                    messageIds: messageIdsToDelete
                });
            }

            activePaneData.chatMessages.allMessages = activePaneData.chatMessages.allMessages.filter(
                (m: any) => !selectedIds.includes(m.id || m.timestamp)
            );
            activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(-(activePaneData.chatMessages.displayedMessageCount || 20));
            activePaneData.chatStats = getConversationStats(activePaneData.chatMessages.allMessages);

            setRootLayoutNode(prev => ({ ...prev }));
            setSelectedMessages(new Set());
            setMessageContextMenuPos(null);
            setMessageSelectionMode(false);
        } catch (err: any) {
            console.error('Error deleting messages:', err);
            setError(err.message);
        }
    };

    const handleResendWithSettings = async (messageToResend: any, selectedModel: string, selectedNPC: string) => {
        const activePaneData = contentDataRef.current[activeContentPaneId];
        if (!activePaneData || activePaneData.contentType !== 'chat' || !activePaneData.contentId) {
            setError("Cannot resend: The active pane is not a valid chat window.");
            return;
        }
        if (isStreaming) {
            console.warn('Cannot resend while another operation is in progress.');
            return;
        }

        const conversationId = activePaneData.contentId;
        let newStreamId: string | null = null;

        try {
            // Find the user message and the assistant response that followed
            const messageIdToResend = messageToResend.id || messageToResend.timestamp;
            const allMessages = activePaneData.chatMessages.allMessages;
            const userMsgIndex = allMessages.findIndex((m: any) =>
                (m.id || m.timestamp) === messageIdToResend
            );

            console.log('[RESEND] Found user message at index:', userMsgIndex);

            if (userMsgIndex !== -1) {
                // Collect messages to delete (the user message and any assistant responses after it)
                const messagesToDelete = [];

                // Add the original user message to delete list
                const userMsg = allMessages[userMsgIndex];
                if (userMsg.message_id || userMsg.id) {
                    messagesToDelete.push(userMsg.message_id || userMsg.id);
                }

                // Add the assistant response that followed (if exists)
                if (userMsgIndex + 1 < allMessages.length &&
                    allMessages[userMsgIndex + 1].role === 'assistant') {
                    const assistantMsg = allMessages[userMsgIndex + 1];
                    if (assistantMsg.message_id || assistantMsg.id) {
                        messagesToDelete.push(assistantMsg.message_id || assistantMsg.id);
                    }
                }

                console.log('[RESEND] Messages to delete:', messagesToDelete);

                // Delete from database
                for (const msgId of messagesToDelete) {
                    try {
                        const result = await window.api.deleteMessage({
                            conversationId,
                            messageId: msgId
                        });
                        console.log('[RESEND] Deleted message:', msgId, 'Result:', result);
                    } catch (err) {
                        console.error('[RESEND] Error deleting message:', msgId, err);
                    }
                }

                // Remove from local state - keep everything BEFORE the user message
                activePaneData.chatMessages.allMessages = allMessages.slice(0, userMsgIndex);
                activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(
                    -(activePaneData.chatMessages.displayedMessageCount || 20)
                );

                console.log('[RESEND] Messages after deletion:', activePaneData.chatMessages.allMessages.length);
            }

            // Now send the new message
            newStreamId = generateId();
            streamToPaneRef.current[newStreamId] = activeContentPaneId;
            setIsStreaming(true);

            const selectedNpc = availableNPCs.find((npc: any) => npc.value === selectedNPC);

            // Create NEW user message (don't reuse the old one)
            const newUserMessage = {
                id: generateId(), // NEW ID
                role: 'user',
                content: messageToResend.content,
                timestamp: new Date().toISOString(),
                attachments: messageToResend.attachments || [],
            };

            const assistantPlaceholderMessage = {
                id: newStreamId,
                role: 'assistant',
                content: '',
                isStreaming: true,
                timestamp: new Date().toISOString(),
                streamId: newStreamId,
                model: selectedModel,
                npc: selectedNPC,
            };

            // Add new messages
            activePaneData.chatMessages.allMessages.push(newUserMessage, assistantPlaceholderMessage);
            activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(
                -(activePaneData.chatMessages.displayedMessageCount || 20)
            );

            console.log('[RESEND] Added new messages, total now:', activePaneData.chatMessages.allMessages.length);

            setRootLayoutNode(prev => ({ ...prev }));

            const selectedModelObj = availableModels.find((m: any) => m.value === selectedModel);
            const providerToUse = selectedModelObj ? selectedModelObj.provider : currentProvider;

            await window.api.executeCommandStream({
                commandstr: messageToResend.content,
                currentPath,
                conversationId: conversationId,
                model: selectedModel,
                provider: providerToUse,
                npc: selectedNpc ? selectedNpc.name : selectedNPC,
                npcSource: selectedNpc ? selectedNpc.source : 'global',
                attachments: messageToResend.attachments?.map((att: any) => ({
                    name: att.name, path: att.path, size: att.size, type: att.type
                })) || [],
                streamId: newStreamId,
                isResend: true
            });

            setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' });
        } catch (err: any) {
            console.error('[RESEND] Error resending message:', err);
            setError(err.message);

            if (activePaneData.chatMessages && newStreamId) {
                const msgIndex = activePaneData.chatMessages.allMessages.findIndex((m: any) => m.id === newStreamId);
                if (msgIndex !== -1) {
                    const message = activePaneData.chatMessages.allMessages[msgIndex];
                    message.content = `[Error resending message: ${err.message}]`;
                    message.type = 'error';
                    message.isStreaming = false;
                }
            }

            if (newStreamId) delete streamToPaneRef.current[newStreamId];
            if (Object.keys(streamToPaneRef.current).length === 0) {
                setIsStreaming(false);
            }

            setRootLayoutNode(prev => ({ ...prev }));
        }
    };

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

    // Keep refs updated for keyboard handler
    useEffect(() => {
        createNewTerminalRef.current = createNewTerminal;
        createNewConversationRef.current = createNewConversation;
        handleCreateNewFolderRef.current = handleCreateNewFolder;
    }, [createNewTerminal, createNewConversation, handleCreateNewFolder]);

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

    const createNewDocument = async (docType: 'docx' | 'xlsx' | 'pptx') => {
        try {
            const filename = `untitled-${Date.now()}.${docType}`;
            const filepath = normalizePath(`${currentPath}/${filename}`);
            // Create empty document - the viewer components will handle creating proper structure
            await window.api.writeFileContent(filepath, '');
            await loadDirectoryStructure(currentPath);
            await handleFileClick(filepath);
        } catch (err) {
            setError(err.message);
        }
    };

    // Refresh conversations list
    const refreshConversations = useCallback(async () => {
        if (currentPath) {
            console.log('[REFRESH] Starting conversation refresh for path:', currentPath);
            try {
                const normalizedPath = normalizePath(currentPath);
                const response = await window.api.getConversations(normalizedPath);
                console.log('[REFRESH] Got response:', response);

                if (response?.conversations) {
                    const formattedConversations = response.conversations.map((conv: any) => ({
                        id: conv.id,
                        title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                        preview: conv.preview || 'No content',
                        timestamp: conv.timestamp || Date.now(),
                        last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
                    }));

                    formattedConversations.sort((a: any, b: any) =>
                        new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
                    );

                    console.log('[REFRESH] Setting conversations:', formattedConversations.length);
                    setDirectoryConversations([...formattedConversations]);
                    console.log('[REFRESH] Refresh complete, preserving current selection');
                } else {
                    console.error('[REFRESH] No conversations in response');
                    setDirectoryConversations([]);
                }
            } catch (err: any) {
                console.error('[REFRESH] Error:', err);
                setDirectoryConversations([]);
            }
        }
    }, [currentPath, normalizePath]);

    // Parse agentic responses for file changes
    const parseAgenticResponse = useCallback((response: string, contexts: any[]) => {
        const changes = [];
        const fileRegex = /FILE:\s*(.+?)\s*\nREASONING:\s*(.+?)\s*\n```diff\n([\s\S]*?)```/gi;

        let match;
        while ((match = fileRegex.exec(response)) !== null) {
            const filePath = match[1].trim();
            const reasoning = match[2].trim();
            const rawUnifiedDiffText = match[3].trim();

            const context = contexts.find((c: any) =>
                c.path.includes(filePath) || filePath.includes(c.path.split('/').pop())
            );

            if (context) {
                changes.push({
                    paneId: context.paneId,
                    filePath: context.path,
                    reasoning: reasoning,
                    originalCode: context.content,
                    newCode: rawUnifiedDiffText,
                    diff: []
                });
            }
        }

        console.log('Parsed agent changes:', changes);
        return changes;
    }, []);

    // Set up streaming listeners
    console.log('[DEBUG] Setting up stream listeners. Config:', config, 'config.stream:', config?.stream);
    usePaneAwareStreamListeners(
        config,
        listenersAttached,
        streamToPaneRef,
        contentDataRef,
        setRootLayoutNode,
        setIsStreaming,
        setAiEditModal,
        parseAgenticResponse,
        getConversationStats,
        refreshConversations
    );


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

                    workspaceRestored = await deserializeWorkspace(
                        savedWorkspace,
                        contentDataRef,
                        setRootLayoutNode,
                        setActiveContentPaneId,
                        setIsLoadingWorkspace,
                        generateId,
                        getConversationStats
                    );
                    
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

            const fetchedModels = await fetchModels(currentPath, setModelsLoading, setModelsError, setAvailableModels);
            const fetchedNPCs = await loadAvailableNPCs(currentPath, setNpcsLoading, setNpcsError, setAvailableNPCs);

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
                            <FileIcon size={16} className="text-gray-400 flex-shrink-0" />
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

        {messageContextMenuPos && (
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
        )}

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


            {isMacroInputOpen && (
                <MacroInput
                    isOpen={isMacroInputOpen}
                    currentPath={currentPath}
                    onClose={() => {
                        setIsMacroInputOpen(false);
                        window.api?.hideMacro?.();
                    }}
                    onSubmit={async ({ macro, conversationId, model, provider }) => {
                        // Open or create a chat pane for this conversation and get the pane ID
                        const paneId = await handleConversationSelect(conversationId);
                        console.log('[MacroInput onSubmit] Got paneId:', paneId);

                        if (!paneId || !contentDataRef.current[paneId]) {
                            console.error('[MacroInput onSubmit] No paneData found for paneId:', paneId);
                            return;
                        }

                        const paneData = contentDataRef.current[paneId];
                        const newStreamId = generateId();

                        // Register stream to pane mapping
                        streamToPaneRef.current[newStreamId] = paneId;
                        setIsStreaming(true);

                        // Add user message
                        const userMsg = {
                            id: generateId(),
                            role: 'user',
                            content: macro,
                            timestamp: new Date().toISOString(),
                            type: 'message'
                        };

                        // Add placeholder assistant message
                        const assistantMsg = {
                            id: newStreamId,
                            role: 'assistant',
                            content: '',
                            timestamp: new Date().toISOString(),
                            type: 'message',
                            isStreaming: true
                        };

                        if (paneData.chatMessages) {
                            paneData.chatMessages.allMessages = [
                                ...(paneData.chatMessages.allMessages || []),
                                userMsg,
                                assistantMsg
                            ];
                            paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(
                                -(paneData.chatMessages.displayedMessageCount || 20)
                            );
                        }

                        setRootLayoutNode(prev => ({ ...prev }));

                        try {
                            // Execute streaming command
                            await window.api.executeCommandStream({
                                commandstr: macro,
                                currentPath,
                                conversationId,
                                model,
                                provider,
                                npc: currentNPC,
                                npcSource: 'global',
                                attachments: [],
                                streamId: newStreamId
                            });
                        } catch (err: any) {
                            console.error('[MacroInput onSubmit] Error:', err);
                            // Update message with error
                            if (paneData.chatMessages) {
                                const msgIndex = paneData.chatMessages.allMessages.findIndex((m: any) => m.id === newStreamId);
                                if (msgIndex !== -1) {
                                    paneData.chatMessages.allMessages[msgIndex].content = `Error: ${err.message}`;
                                    paneData.chatMessages.allMessages[msgIndex].isStreaming = false;
                                    paneData.chatMessages.allMessages[msgIndex].type = 'error';
                                }
                            }
                            delete streamToPaneRef.current[newStreamId];
                            if (Object.keys(streamToPaneRef.current).length === 0) {
                                setIsStreaming(false);
                            }
                            setRootLayoutNode(prev => ({ ...prev }));
                        }

                        refreshConversations();
                    }}
                />
            )}
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

            {/* Message Labeling Modal */}
            {labelingModal.isOpen && labelingModal.message && (
                <MessageLabeling
                    message={labelingModal.message}
                    existingLabel={messageLabels[labelingModal.message.id]}
                    onSave={handleSaveLabel}
                    onClose={handleCloseLabelingModal}
                />
            )}

            {/* Conversation Labeling Modal */}
            {conversationLabelingModal.isOpen && conversationLabelingModal.conversation && (
                <ConversationLabeling
                    conversation={conversationLabelingModal.conversation}
                    existingLabel={conversationLabels[conversationLabelingModal.conversation.id]}
                    onSave={handleSaveConversationLabel}
                    onClose={handleCloseConversationLabelingModal}
                />
            )}

            {/* Labeled Data Manager */}
            <LabeledDataManager
                isOpen={labeledDataManagerOpen}
                onClose={() => setLabeledDataManagerOpen(false)}
                messageLabels={messageLabels}
                setMessageLabels={setMessageLabels}
                conversationLabels={conversationLabels}
                setConversationLabels={setConversationLabels}
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
    renderPicViewer,
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
    renderPicViewer,
    setActiveContentPaneId, setDraggedItem, setDropTarget,
    setPaneContextMenu,
    // ADD THESE NEW DEPENDENCIES:
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
]);

// Handle conversation selection - opens conversation in a pane
const handleConversationSelect = async (conversationId: string, skipMessageLoad = false) => {
    setActiveConversationId(conversationId);
    setCurrentFile(null);

    // CRITICAL: Don't create/update panes if workspace is being restored
    if (isLoadingWorkspace) {
        console.log('[SELECT_CONVO] Skipping pane update - currently restoring workspace');
        return null;
    }

    // NEW: Check if this conversation is already open in a pane
    const existingPaneId = Object.keys(contentDataRef.current).find(paneId => {
        const paneData = contentDataRef.current[paneId];
        return paneData?.contentType === 'chat' && paneData?.contentId === conversationId;
    });

    if (existingPaneId) {
        console.log('[SELECT_CONVO] Conversation already open in pane:', existingPaneId);
        setActiveContentPaneId(existingPaneId);
        return existingPaneId;
    }

    let paneIdToUpdate;

    if (!rootLayoutNode) {
        const newPaneId = generateId();
        const newLayout = { id: newPaneId, type: 'content' };

        // Initialize contentData SYNCHRONOUSLY with layout
        contentDataRef.current[newPaneId] = {
            contentType: 'chat',
            contentId: conversationId,
            chatMessages: { messages: [], allMessages: [], displayedMessageCount: 20 }
        };
        setRootLayoutNode(newLayout);

        // NOW update the content
        await updateContentPane(newPaneId, 'chat', conversationId, skipMessageLoad);

        setActiveContentPaneId(newPaneId);
        paneIdToUpdate = newPaneId;
    }
    else {
        paneIdToUpdate = activeContentPaneId || Object.keys(contentDataRef.current)[0];

        // ADD THIS CHECK: Only update if the pane exists and is not empty
        if (paneIdToUpdate && contentDataRef.current[paneIdToUpdate]) {
            await updateContentPane(paneIdToUpdate, 'chat', conversationId, skipMessageLoad);
            setRootLayoutNode(prev => ({...prev}));
        } else {
            console.warn('[SELECT_CONVO] No valid pane to update, creating new one');
            const newPaneId = createAndAddPaneNodeToLayout();
            await updateContentPane(newPaneId, 'chat', conversationId, skipMessageLoad);
            paneIdToUpdate = newPaneId;
        }
    }
    return paneIdToUpdate;
};

// Handle file click - opens file in a new pane
const handleFileClick = useCallback(async (filePath: string) => {
    setCurrentFile(filePath);
    setActiveConversationId(null);

    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'editor';

    if (extension === 'pdf') contentType = 'pdf';
    else if (['csv', 'xlsx', 'xls'].includes(extension)) contentType = 'csv';
    else if (extension === 'pptx') contentType = 'pptx';
    else if (extension === 'tex') contentType = 'latex';
    else if (['docx', 'doc'].includes(extension)) contentType = 'docx';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) contentType = 'image';

    console.log('[FILE_CLICK] File:', filePath, 'ContentType:', contentType);

    const newPaneId = generateId();

    setRootLayoutNode(oldRoot => {
        contentDataRef.current[newPaneId] = {};

        if (!oldRoot) {
            return { id: newPaneId, type: 'content' };
        }

        let newRoot = JSON.parse(JSON.stringify(oldRoot));

        if (activeContentPaneId) {
            const pathToActive = findNodePath(newRoot, activeContentPaneId);
            if (pathToActive && pathToActive.length > 0) {
                const targetParent = findNodeByPath(newRoot,
                    pathToActive.slice(0, -1)
                );
                const targetIndex = pathToActive[pathToActive.length - 1];

                if (targetParent && targetParent.type === 'split') {
                    const newChildren = [...targetParent.children];
                    newChildren.splice(targetIndex + 1, 0,
                        { id: newPaneId, type: 'content' }
                    );
                    const newSizes = new Array(newChildren.length)
                        .fill(100 / newChildren.length);
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

    setTimeout(async () => {
        console.log('[FILE_CLICK] Updating content pane:', newPaneId, contentType, filePath);
        await updateContentPane(newPaneId, contentType, filePath);
        setRootLayoutNode(prev => ({ ...prev }));
    }, 0);

    setActiveContentPaneId(newPaneId);
}, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);

// Update ref for keyboard handler access
handleFileClickRef.current = handleFileClick;

// Open NPC Team Menu
const handleOpenNpcTeamMenu = () => {
    setNpcTeamMenuOpen(true);
};

// Close NPC Team Menu
const handleCloseNpcTeamMenu = () => {
    setNpcTeamMenuOpen(false);
};

// Start new conversation with NPC
const startNewConversationWithNpc = async (npcName: string) => {
    setCurrentNPC(npcName);
    await createNewConversation();
    setNpcTeamMenuOpen(false);
};

// Render pane context menu
const renderPaneContextMenu = () => {
    if (!paneContextMenu?.isOpen) return null;
    const { x, y, nodeId, nodePath } = paneContextMenu;

    const closePane = () => {
        closeContentPane(nodeId, nodePath);
        setPaneContextMenu(null);
    };

    const splitPane = (side: string) => {
        performSplit(nodePath, side, 'chat', null);
        setPaneContextMenu(null);
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setPaneContextMenu(null)} />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                style={{ top: y, left: x }}
                onMouseLeave={() => setPaneContextMenu(null)}
            >
                <button onClick={closePane} className="block px-4 py-2 w-full text-left theme-hover">
                    Close Pane
                </button>
                <div className="border-t theme-border my-1" />
                <button onClick={() => splitPane('left')} className="block px-4 py-2 w-full text-left theme-hover">
                    Split Left
                </button>
                <button onClick={() => splitPane('right')} className="block px-4 py-2 w-full text-left theme-hover">
                    Split Right
                </button>
                <button onClick={() => splitPane('top')} className="block px-4 py-2 w-full text-left theme-hover">
                    Split Top
                </button>
                <button onClick={() => splitPane('bottom')} className="block px-4 py-2 w-full text-left theme-hover">
                    Split Bottom
                </button>
            </div>
        </>
    );
};

// Render PDF context menu
const renderPdfContextMenu = () => {
    if (!pdfContextMenuPos) return null;
    return <div>PDF Context Menu</div>;
};

// Render browser context menu
const renderBrowserContextMenu = () => {
    if (!browserContextMenuPos) return null;
    return <div>Browser Context Menu</div>;
};

// Handle starting conversation from a viewer (PhotoViewer, etc.)
const handleStartConversationFromViewer = async (images?: Array<{ path: string }>) => {
    console.log('[handleStartConversationFromViewer] Called with images:', images);
    if (!images || images.length === 0) {
        console.log('[handleStartConversationFromViewer] No images provided, returning');
        return;
    }

    // Helper to get mime type from extension
    const getMimeType = (filePath: string): string => {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
        };
        return mimeTypes[ext] || 'image/jpeg';
    };

    const attachmentsToAdd = images.map(img => ({
        id: generateId(),
        name: img.path.split('/').pop() || 'image',
        type: getMimeType(img.path),
        path: img.path,
        size: 0,
        preview: `file://${img.path}`
    }));

    console.log('[handleStartConversationFromViewer] Adding attachments:', attachmentsToAdd);
    setUploadedFiles(prev => {
        const newFiles = [...prev, ...attachmentsToAdd];
        console.log('[handleStartConversationFromViewer] New uploadedFiles:', newFiles);
        return newFiles;
    });
};

// Sidebar rendering function
// Render attachment thumbnails in the input area
const renderAttachmentThumbnails = () => {
    if (uploadedFiles.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 p-2 border-b theme-border">
            {uploadedFiles.map((file: any) => (
                <div key={file.id} className="relative group">
                    {file.preview ? (
                        <img
                            src={file.preview}
                            alt={file.name}
                            className="w-16 h-16 object-cover rounded border theme-border"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded border theme-border bg-gray-700 flex items-center justify-center text-xs text-gray-400 text-center p-1">
                            {file.name.split('.').pop()?.toUpperCase()}
                        </div>
                    )}
                    <button
                        onClick={() => setUploadedFiles(prev => prev.filter((f: any) => f.id !== file.id))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove attachment"
                    >
                        ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate rounded-b">
                        {file.name.length > 10 ? file.name.slice(0, 8) + '...' : file.name}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Input area rendering function
const renderInputArea = () => {
    const isJinxMode = executionMode !== 'chat' && selectedJinx;
    const jinxInputsForSelected = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};
    const hasJinxContent = isJinxMode && Object.values(jinxInputsForSelected).some(val => val !== null && String(val).trim());
    const inputStr = typeof input === 'string' ? input : '';
    const hasContextFiles = contextFiles.length > 0;
    const hasInputContent = inputStr.trim() || uploadedFiles.length > 0 || hasJinxContent || hasContextFiles;
    const canSend = !isStreaming && hasInputContent && (activeConversationId || isJinxMode);

    if (isInputMinimized) {
        return (
            <div className="px-4 py-1 border-t theme-border theme-bg-secondary flex-shrink-0">
                <div className="flex justify-center">
                    <button
                        onClick={() => setIsInputMinimized(false)}
                        className="p-2 w-full theme-button theme-hover rounded-full transition-all group"
                        title="Expand input area"
                    >
                        <div className="flex items-center gap-1 group-hover:gap-0 transition-all duration-200 justify-center">
                            <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="transform rotate-180 group-hover:scale-75 transition-all duration-200"
                            >
                                <path d="M18 15l-6-6-6 6"/>
                            </svg>
                            <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (isInputExpanded) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4">
                <div className="flex-1 flex flex-col theme-bg-primary theme-border border rounded-lg">
                    <div className="p-2 border-b theme-border flex-shrink-0 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsInputExpanded(false)}
                            className="p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover"
                            aria-label="Minimize input"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>
                    <div className="flex-1 p-2 flex">
                         <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (!isStreaming && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleInputSubmit(e);
                                    setIsInputExpanded(false);
                                }
                            }}
                            placeholder={isStreaming ? "Streaming response..." : "Type a message... (Ctrl+Enter to send)"}
                            className="w-full h-full theme-input text-base rounded-lg p-4 focus:outline-none border-0 resize-none bg-transparent"
                            disabled={isStreaming}
                            autoFocus
                        />
                    </div>
                    <div className="p-2 border-t theme-border flex-shrink-0 flex items-center justify-end gap-2">
                        {isStreaming ? (
                            <button type="button" onClick={handleInterruptStream} className="theme-button-danger text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1" aria-label="Stop generating">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                                Stop
                            </button>
                        ) : (
                            <button type="button" onClick={(e) => { handleInputSubmit(e); setIsInputExpanded(false); }} disabled={(!(input || '').trim() && uploadedFiles.length === 0) || !activeConversationId} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Send size={16}/>
                                Send (Ctrl+Enter)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="px-4 pt-2 pb-3 border-t theme-border theme-bg-secondary flex-shrink-0 relative"
            style={{ height: `${inputHeight}px` }}
        >
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-50"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingInput(true);
                }}
                style={{
                    backgroundColor: isResizingInput ? '#3b82f6' : 'transparent'
                }}
            />

            <div
                className="relative theme-bg-primary theme-border border rounded-lg group h-full flex flex-col"
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragEnter={() => setIsHovering(true)}
                onDragLeave={() => setIsHovering(false)}
                onDrop={handleDrop}
            >
                {isHovering && (
                    <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-blue-300 font-semibold">Drop files here</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {/* Context Files Panel */}
                    <ContextFilesPanel
                        isCollapsed={contextFilesCollapsed}
                        onToggleCollapse={() => setContextFilesCollapsed(!contextFilesCollapsed)}
                        contextFiles={contextFiles}
                        setContextFiles={setContextFiles}
                        currentPath={currentPath}
                    />

                    {renderAttachmentThumbnails()}

                    <div className="flex items-end p-2 gap-2 relative z-0">
                        <div className="flex-grow relative">
                            {isJinxMode ? (
                                <div className="flex flex-col gap-2 w-full">
                                    {selectedJinx.inputs && selectedJinx.inputs.length > 0 && (
                                        <div className="space-y-2">
                                            {selectedJinx.inputs.map((rawInputDef, idx) => {
                                                const inputDef = (typeof rawInputDef === 'string')
                                                                 ? { [rawInputDef]: "" }
                                                                 : rawInputDef;

                                                const inputName = (inputDef && typeof inputDef === 'object' && Object.keys(inputDef).length > 0)
                                                                  ? Object.keys(inputDef)[0]
                                                                  : `__unnamed_input_${idx}__`;

                                                if (!inputName || inputName.startsWith('__unnamed_input_')) {
                                                    return (
                                                        <div key={`malformed-${selectedJinx.name}-${idx}`} className="text-red-400 text-xs">
                                                            Error: Malformed input definition for "{selectedJinx.name}" at index {idx}.
                                                        </div>
                                                    );
                                                }

                                                            const inputPlaceholder = inputDef[inputName] || '';
                                                            const isTextArea = ['code', 'prompt', 'query', 'content', 'text', 'command'].includes(inputName.toLowerCase());

                                                            return (
                                                                <div key={`${selectedJinx.name}-${inputName}`} className="flex flex-col">
                                                        <label htmlFor={`jinx-input-${selectedJinx.name}-${inputName}`} className="text-xs theme-text-muted mb-1 capitalize">
                                                            {inputName}:
                                                        </label>
                                                            {isTextArea ? (
                                                                <textarea
                                                                    id={`jinx-input-${selectedJinx.name}-${inputName}`}
                                                                    value={jinxInputValues[selectedJinx.name]?.[inputName] || ''}
                                                                    onChange={(e) => setJinxInputValues(prev => ({
                                                                        ...prev,
                                                                    [selectedJinx.name]: {
                                                                        ...prev[selectedJinx.name],
                                                                        [inputName]: e.target.value
                                                                    }
                                                                }))}
                                                                    placeholder={inputPlaceholder || `Enter ${inputName}...`}
                                                                    className="theme-input text-sm rounded px-2 py-1 border min-h-[60px] resize-vertical"
                                                                    rows={3}
                                                                    onKeyDown={(e) => {
                                                                        if (!isStreaming && e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleInputSubmit(e);
                                                                        }
                                                                    }}
                                                                    disabled={isStreaming}
                                                                />
                                                            ) : (
                                                                <input
                                                                    id={`jinx-input-${selectedJinx.name}-${inputName}`}
                                                                    type="text"
                                                                    value={jinxInputValues[selectedJinx.name]?.[inputName] || ''}
                                                                    onChange={(e) => setJinxInputValues(prev => ({
                                                                        ...prev,
                                                                        [selectedJinx.name]: {
                                                                            ...prev[selectedJinx.name],
                                                                            [inputName]: e.target.value
                                                                        }
                                                                    }))}
                                                                    placeholder={inputPlaceholder || `Enter ${inputName}...`}
                                                                    className="theme-input text-sm rounded px-2 py-1 border"
                                                                    onKeyDown={(e) => {
                                                                        if (!isStreaming && e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleInputSubmit(e);
                                                                        }
                                                                    }}
                                                                    disabled={isStreaming}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if (!isStreaming && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }}
                                    placeholder={isStreaming ? "Streaming response..." : "Type a message or drop files..."}
                                    className={`w-full theme-input text-sm rounded-lg pl-4 pr-20 py-3 focus:outline-none border-0 resize-none ${isStreaming ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    style={{
                                        height: `${Math.max(56, inputHeight - 120)}px`,
                                        maxHeight: `${inputHeight - 120}px`
                                    }}
                                    disabled={isStreaming}
                                />
                            )}

                            <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setIsInputMinimized(true)}
                                    className="p-1 theme-text-muted hover:theme-text-primary rounded-lg theme-hover opacity-50 group-hover:opacity-100 transition-opacity"
                                    aria-label="Minimize input"
                                    title="Minimize input area"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M18 15l-6-6-6 6"/>
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsInputExpanded(true)}
                                    className="p-1 theme-text-muted hover:theme-text-primary rounded-lg theme-hover opacity-50 group-hover:opacity-100 transition-opacity"
                                    aria-label="Expand input"
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAttachFileClick}
                            className={`p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover flex-shrink-0 self-end ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Attach file"
                            disabled={isStreaming}
                        >
                            <Paperclip size={20} />
                        </button>
                         {isStreaming ? (
                            <button type="button" onClick={handleInterruptStream} className="theme-button-danger text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 w-[76px] h-[40px] self-end" aria-label="Stop generating" title="Stop generating" >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                            </button>
                        ) : (
                            <button type="button" onClick={handleInputSubmit} disabled={!canSend} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-[76px] h-[40px] self-end" >
                                <Send size={16}/>
                            </button>
                        )}
                    </div>
                </div>

                {/* MCP tools dropdown for tool_agent mode */}
                {executionMode === 'tool_agent' && (
                    <div className="px-2 pb-1 border-t theme-border">
                        <div className="relative w-1/2">
                            <button
                                type="button"
                                className="theme-input text-xs w-full text-left px-2 py-1 flex items-center justify-between rounded border"
                                disabled={isStreaming || availableMcpServers.length === 0}
                                onClick={() => setShowMcpServersDropdown(prev => !prev)}
                            >
                                <span className="truncate">
                                    {availableMcpServers.find(s => s.serverPath === mcpServerPath)?.serverPath || 'Select MCP server & tools'}
                                </span>
                                <ChevronDown size={12} />
                            </button>
                            {showMcpServersDropdown && (
                                <div className="absolute z-50 w-full bottom-full mb-1 bg-black/90 border theme-border rounded shadow-lg max-h-56 overflow-y-auto">
                                    {availableMcpServers.length === 0 && (
                                        <div className="px-2 py-1 text-xs theme-text-muted">No MCP servers in ctx</div>
                                    )}
                                    {availableMcpServers.map((srv) => (
                                        <div key={srv.serverPath} className="border-b theme-border last:border-b-0">
                                            <div
                                                className="px-2 py-1 text-xs theme-hover cursor-pointer flex items-center justify-between"
                                                onClick={() => {
                                                    setMcpServerPath(srv.serverPath);
                                                    setSelectedMcpTools([]);
                                                    setMcpToolsLoading(true);
                                                    window.api.listMcpTools({ serverPath: srv.serverPath, currentPath }).then((res) => {
                                                        setMcpToolsLoading(false);
                                                        if (res.error) {
                                                            setMcpToolsError(res.error);
                                                            setAvailableMcpTools([]);
                                                        } else {
                                                            setMcpToolsError(null);
                                                            const tools = res.tools || [];
                                                            setAvailableMcpTools(tools);
                                                            const names = tools.map(t => t.function?.name).filter(Boolean);
                                                            setSelectedMcpTools(prev => prev.filter(n => names.includes(n)));
                                                        }
                                                    });
                                                }}
                                            >
                                                <span className="truncate">{srv.serverPath}</span>
                                            </div>
                                            {srv.serverPath === mcpServerPath && (
                                                <div className="px-3 py-1 space-y-1">
                                                    {mcpToolsLoading && <div className="text-xs theme-text-muted">Loading MCP tools…</div>}
                                                    {mcpToolsError && <div className="text-xs text-red-400">Error: {mcpToolsError}</div>}
                                                    {!mcpToolsLoading && !mcpToolsError && (
                                                        <div className="flex flex-col gap-1">
                                                            {availableMcpTools.length === 0 && (
                                                                <div className="text-xs theme-text-muted">No tools available.</div>
                                                            )}
                                                            {availableMcpTools.map(tool => {
                                                                const name = tool.function?.name || '';
                                                                const desc = tool.function?.description || '';
                                                                if (!name) return null;
                                                                const checked = selectedMcpTools.includes(name);
                                                                return (
                                                                    <details key={name} className="bg-black/30 border theme-border rounded px-2 py-1">
                                                                        <summary className="flex items-center gap-2 text-xs theme-text-primary cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                disabled={isStreaming}
                                                                                onChange={() => {
                                                                                    setSelectedMcpTools(prev => {
                                                                                        if (prev.includes(name)) {
                                                                                            return prev.filter(n => n !== name);
                                                                                        }
                                                                                        return [...prev, name];
                                                                                    });
                                                                                }}
                                                                            />
                                                                            <span>{name}</span>
                                                                        </summary>
                                                                        <div className="ml-6 text-[11px] theme-text-muted whitespace-pre-wrap">
                                                                            {desc || 'No description.'}
                                                                        </div>
                                                                    </details>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom controls: Jinx/mode selector, model selector, NPC selector */}
                <div className={`flex items-center gap-2 px-2 pb-2 border-t theme-border ${isStreaming ? 'opacity-50' : ''}`}>
                    <div className="relative min-w-[180px]">
                        <button
                            type="button"
                            className="theme-input text-xs rounded px-2 py-1 border w-full flex items-center justify-between"
                            disabled={isStreaming}
                            onClick={() => setShowJinxDropdown(prev => !prev)}
                        >
                            <span className="truncate">
                                {executionMode === 'chat' && '💬 Chat'}
                                {executionMode === 'tool_agent' && '🛠 Agent'}
                                {executionMode !== 'chat' && executionMode !== 'tool_agent' && (selectedJinx?.name || executionMode)}
                            </span>
                            <ChevronDown size={12}/>
                        </button>
                        {showJinxDropdown && (
                            <div className="absolute z-50 w-full bottom-full mb-1 bg-black/90 border theme-border rounded shadow-lg max-h-72 overflow-y-auto">
                                <div
                                    className="px-2 py-1 text-xs theme-hover cursor-pointer flex items-center gap-2"
                                    onClick={() => {
                                        setExecutionMode('chat');
                                        setSelectedJinx(null);
                                        setShowJinxDropdown(false);
                                    }}
                                >
                                    💬 Chat
                                </div>
                                <div
                                    className="px-2 py-1 text-xs theme-hover cursor-pointer flex items-center gap-2"
                                    onClick={() => {
                                        const selectedModelObj = availableModels.find(m => m.value === currentModel);
                                        const providerForModel = selectedModelObj?.provider || currentProvider;
                                        const toolCapable = providerForModel !== 'ollama' || (currentModel && ollamaToolModels.has(currentModel));
                                        if (!toolCapable) {
                                            setError('Selected model does not support native tool-calling; using chat or Jinx instead.');
                                            setShowJinxDropdown(false);
                                            return;
                                        }
                                        setExecutionMode('tool_agent');
                                        setSelectedJinx(null);
                                        setShowJinxDropdown(false);
                                    }}
                                >
                                    🛠 Agent
                                </div>
                                {['project','global'].map(origin => {
                                    const originJinxs = jinxsToDisplay.filter(j => (j.origin || 'unknown') === origin);
                                    if (!originJinxs.length) return null;
                                    const grouped = originJinxs.reduce((acc, j) => {
                                        const g = j.group || 'root';
                                        if (!acc[g]) acc[g] = [];
                                        acc[g].push(j);
                                        return acc;
                                    }, {});
                                    return (
                                        <div key={origin} className="border-t theme-border">
                                            <div className="px-2 py-1 text-[11px] uppercase theme-text-muted">{origin === 'project' ? 'Project Jinxs' : 'Global Jinxs'}</div>
                                            {Object.entries(grouped)
                                                .filter(([gName]) => gName.toLowerCase() !== 'modes')
                                                .sort(([a],[b]) => a.localeCompare(b))
                                                .map(([gName, jinxs]) => (
                                                    <details key={`${origin}-${gName}`} className="px-2">
                                                        <summary className="text-xs theme-text-primary cursor-pointer py-1 flex items-center gap-2">
                                                            <FolderTree size={12}/> {gName}
                                                        </summary>
                                                        <div className="pl-4 pb-1 flex flex-col gap-1">
                                                            {jinxs.sort((a,b)=>a.name.localeCompare(b.name)).map(jinx => (
                                                                <div
                                                                    key={`${origin}-${gName}-${jinx.name}`}
                                                                    className="flex items-center gap-2 text-xs theme-hover cursor-pointer"
                                                                    onClick={() => {
                                                                        setExecutionMode(jinx.name);
                                                                        setSelectedJinx(jinx);
                                                                        setShowJinxDropdown(false);
                                                                    }}
                                                                >
                                                                    <span className="truncate">{jinx.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-grow flex items-center gap-1">
                        <select
                            value={currentModel || ''}
                            onChange={(e) => {
                                const selectedModel = availableModels.find(m => m.value === e.target.value);
                                setCurrentModel(e.target.value);
                                if (selectedModel?.provider) {
                                    setCurrentProvider(selectedModel.provider);
                                }
                            }}
                            className="theme-input text-xs rounded px-2 py-1 border flex-grow disabled:cursor-not-allowed"
                            disabled={modelsLoading || !!modelsError || isStreaming}
                        >
                            {modelsLoading && <option value="">Loading...</option>}
                            {modelsError && <option value="">Error</option>}
                            {!modelsLoading && !modelsError && modelsToDisplay.length === 0 && (
                                <option value="">{favoriteModels.size > 0 ? "No Favorite Models" : "No Models"}</option>
                            )}
                            {!modelsLoading && !modelsError && modelsToDisplay.map(model => (<option key={model.value} value={model.value}>{model.display_name}</option>))}
                        </select>
                        <button onClick={() => toggleFavoriteModel(currentModel)} className={`p-1 rounded ${favoriteModels.has(currentModel) ? 'text-yellow-400' : 'theme-text-muted hover:text-yellow-400'}`} disabled={!currentModel} title="Toggle favorite"><Star size={14}/></button>
                        <button
                            onClick={() => setShowAllModels(!showAllModels)}
                            className="p-1 theme-hover rounded theme-text-muted"
                            title={showAllModels ? "Show Favorites Only" : "Show All Models"}
                            disabled={favoriteModels.size === 0}
                        >
                            <ListFilter size={14} className={favoriteModels.size === 0 ? 'opacity-30' : ''} />
                        </button>
                    </div>
                     <select
                        value={currentNPC || ''}
                        onChange={e => setCurrentNPC(e.target.value)}
                        className="theme-input text-xs rounded px-2 py-1 border flex-grow disabled:cursor-not-allowed"
                        disabled={npcsLoading || !!npcsError || isStreaming}
                     >
                         {npcsLoading && <option value="">Loading NPCs...</option>}
                         {npcsError && <option value="">Error loading NPCs</option>}
                         {!npcsLoading && !npcsError && availableNPCs.length === 0 && (<option value="">No NPCs available</option>)}
                         {!npcsLoading && !npcsError && availableNPCs.map(npc => ( <option key={`${npc.source}-${npc.value}`} value={npc.value}> {npc.display_name} </option>))}
                    </select>
                </div>
            </div>
        </div>
    );
};

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
                        if (extension === 'pdf') contentType = 'pdf';
                        else if (['csv', 'xlsx', 'xls'].includes(extension)) contentType = 'csv';
                        else if (extension === 'pptx') contentType = 'pptx';
                        else if (extension === 'tex') contentType = 'latex';
                        else if (['docx', 'doc'].includes(extension)) contentType = 'docx';
                        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) contentType = 'image';
                        else contentType = 'editor';
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
    <Sidebar
        // Pass all necessary state and functions as props
        sidebarCollapsed={sidebarCollapsed}
        sidebarWidth={sidebarWidth}
        isResizingSidebar={isResizingSidebar}
        contentDataRef={contentDataRef}
        isDarkMode={isDarkMode}
        currentPath={currentPath}
        baseDir={baseDir}
        selectedFiles={selectedFiles}
        selectedConvos={selectedConvos}
        windowId={windowId}
        activeWindowsExpanded={activeWindowsExpanded}
        workspaceIndicatorExpanded={workspaceIndicatorExpanded}
        expandedFolders={expandedFolders}
        renamingPath={renamingPath}
        editedSidebarItemName={editedSidebarItemName}
        currentFile={currentFile}
        lastClickedIndex={lastClickedIndex}
        lastClickedFileIndex={lastClickedFileIndex}
        activeContentPaneId={activeContentPaneId}
        activeConversationId={activeConversationId}
        folderStructure={folderStructure}
        directoryConversations={directoryConversations}
        gitStatus={gitStatus}
        gitPanelCollapsed={gitPanelCollapsed}
        gitCommitMessage={gitCommitMessage}
        gitLoading={gitLoading}
        gitError={gitError}
        rootLayoutNode={rootLayoutNode}
        openBrowsers={openBrowsers}
        commonSites={commonSites}
        websiteHistory={websiteHistory}
        filesCollapsed={filesCollapsed}
        conversationsCollapsed={conversationsCollapsed}
        websitesCollapsed={websitesCollapsed}
        isGlobalSearch={isGlobalSearch}
        searchTerm={searchTerm}
        searchInputRef={searchInputRef}
        loading={loading}
        isSearching={isSearching}
        contextMenuPos={contextMenuPos}
        sidebarItemContextMenuPos={sidebarItemContextMenuPos}
        fileContextMenuPos={fileContextMenuPos}
        isEditingPath={isEditingPath}
        editedPath={editedPath}
        setSidebarWidth={setSidebarWidth}
        setIsResizingSidebar={setIsResizingSidebar}
        setSelectedFiles={setSelectedFiles}
        setFileContextMenuPos={setFileContextMenuPos}
        setError={setError}
        setIsStreaming={setIsStreaming}
        setRootLayoutNode={setRootLayoutNode}
        setActiveWindowsExpanded={setActiveWindowsExpanded}
        setWorkspaceIndicatorExpanded={setWorkspaceIndicatorExpanded}
        setGitPanelCollapsed={setGitPanelCollapsed}
        setExpandedFolders={setExpandedFolders}
        setRenamingPath={setRenamingPath}
        setEditedSidebarItemName={setEditedSidebarItemName}
        setLastClickedIndex={setLastClickedIndex}
        setLastClickedFileIndex={setLastClickedFileIndex}
        setSelectedConvos={setSelectedConvos}
        setActiveContentPaneId={setActiveContentPaneId}
        setCurrentFile={setCurrentFile}
        setActiveConversationId={setActiveConversationId}
        setDirectoryConversations={setDirectoryConversations}
        setFolderStructure={setFolderStructure}
        setGitCommitMessage={setGitCommitMessage}
        setGitLoading={setGitLoading}
        setGitError={setGitError}
        setGitStatus={setGitStatus}
        setFilesCollapsed={setFilesCollapsed}
        setConversationsCollapsed={setConversationsCollapsed}
        setWebsitesCollapsed={setWebsitesCollapsed}
        setInput={setInput}
        setContextMenuPos={setContextMenuPos}
        setSidebarItemContextMenuPos={setSidebarItemContextMenuPos}
        setSearchTerm={setSearchTerm}
        setIsSearching={setIsSearching}
        setDeepSearchResults={setDeepSearchResults}
        setMessageSearchResults={setMessageSearchResults}
        setIsEditingPath={setIsEditingPath}
        setEditedPath={setEditedPath}
        setSettingsOpen={setSettingsOpen}
        setBrowserUrlDialogOpen={setBrowserUrlDialogOpen}
        setCronDaemonPanelOpen={setCronDaemonPanelOpen}
        setPhotoViewerOpen={setPhotoViewerOpen}
        setDashboardMenuOpen={setDashboardMenuOpen}
        setJinxMenuOpen={setJinxMenuOpen}
        setCtxEditorOpen={setCtxEditorOpen}
        setSidebarCollapsed={setSidebarCollapsed}
        setLabeledDataManagerOpen={setLabeledDataManagerOpen}
        createNewConversation={createNewConversation}
        generateId={generateId}
        streamToPaneRef={streamToPaneRef}
        availableNPCs={availableNPCs}
        currentNPC={currentNPC}
        currentModel={currentModel}
        currentProvider={currentProvider}
        executionMode={executionMode}
        mcpServerPath={mcpServerPath}
        selectedMcpTools={selectedMcpTools}
        updateContentPane={updateContentPane}
        loadDirectoryStructure={loadDirectoryStructure}
        loadWebsiteHistory={loadWebsiteHistory}
        createNewBrowser={createNewBrowser}
        handleGlobalDragStart={handleGlobalDragStart}
        handleGlobalDragEnd={handleGlobalDragEnd}
        normalizePath={normalizePath}
        getFileIcon={getFileIcon}
        serializeWorkspace={serializeWorkspace}
        saveWorkspaceToStorage={saveWorkspaceToStorage}
        handleConversationSelect={handleConversationSelect}
        handleFileClick={handleFileClick}
        handleInputSubmit={handleInputSubmit}
        toggleTheme={() => toggleTheme(setIsDarkMode)}
        goUpDirectory={() => goUpDirectory(currentPath, baseDir, switchToPath, setError)}
        switchToPath={switchToPath}
        handleCreateNewFolder={handleCreateNewFolder}
        createNewTextFile={createNewTextFile}
        createNewTerminal={createNewTerminal}
        createNewDocument={createNewDocument}
        handleOpenNpcTeamMenu={handleOpenNpcTeamMenu}
        renderSearchResults={renderSearchResults}
    />
    {renderMainContent()}
        <PredictiveTextOverlay
            predictionSuggestion={predictionSuggestion}
            predictionTargetElement={predictionTargetElement}
            isPredictiveTextEnabled={isPredictiveTextEnabled}
            setPredictionSuggestion={setPredictionSuggestion}
            setPredictionTargetElement={setPredictionTargetElement}
        />
        <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onFileSelect={handleFileClick}
            currentPath={currentPath}
            folderStructure={folderStructure}
        />

</div>
            {renderModals()}
        <BranchingUI />
            
        </div>
    );
};

export default ChatInterface;
