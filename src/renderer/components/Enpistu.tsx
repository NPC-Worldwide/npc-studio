 import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File as FileIcon,  Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, ArrowDown,X, Wrench, FileText, Code2, FileJson, Paperclip,
    Send, BarChart3,Minimize2,  Maximize2, MessageCircle, BrainCircuit, Star, Origami, ChevronDown,
    Clock, FolderTree, Search, HardDrive, Brain, GitBranch, Activity, Tag, Sparkles, Code, BookOpen
} from 'lucide-react';

import { Icon } from 'lucide-react';
import { avocado } from '@lucide/lab';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import CsvViewer from './CsvViewer';
import DocxViewer from './DocxViewer';
import MacroInput from './MacroInput';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import JinxMenu from './JinxMenu';
import '../../index.css';
import CtxEditor from './CtxEditor';
import TeamManagement from './TeamManagement';
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
import MindMapViewer from './MindMapViewer';
import ZipViewer from './ZipViewer';
import DiskUsageAnalyzer from './DiskUsageAnalyzer';
import ProjectEnvEditor from './ProjectEnvEditor';
import DBTool from './DBTool';
import LibraryViewer from './LibraryViewer';
import FolderViewer from './FolderViewer';
import { useActivityTracker } from './ActivityTracker';
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
import ConversationLabeling from './ConversationLabeling';
import ContextFilesPanel from './ContextFilesPanel';
import GraphViewer from './GraphViewer';
import BrowserHistoryWeb from './BrowserHistoryWeb';
import DataLabeler from './DataLabeler';
import ChatInput from './ChatInput';

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

    // Activity tracking for RNN predictions
    const { trackActivity } = useActivityTracker();

    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [projectEnvEditorOpen, setProjectEnvEditorOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images');
    const [libraryViewerOpen, setLibraryViewerOpen] = useState(false);
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState(null);

    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [lastClickedFileIndex, setLastClickedFileIndex] = useState(null);
    const [fileContextMenuPos, setFileContextMenuPos] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [folderStructure, setFolderStructure] = useState({});
    const [activeConversationId, setActiveConversationId] = useState(null);

    const [currentModel, setCurrentModel] = useState(() => {
        const saved = localStorage.getItem('npcStudioCurrentModel');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentProvider, setCurrentProvider] = useState(() => {
        const saved = localStorage.getItem('npcStudioCurrentProvider');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentNPC, setCurrentNPC] = useState(() => {
        const saved = localStorage.getItem('npcStudioCurrentNPC');
        return saved ? JSON.parse(saved) : null;
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [jinxMenuOpen, setJinxMenuOpen] = useState(false);
    const [teamManagementOpen, setTeamManagementOpen] = useState(false);
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
    const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; message: string; defaultValue: string; onConfirm: ((value: string) => void) | null }>({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
    const [promptModalValue, setPromptModalValue] = useState('');
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
    const [showDateTime, setShowDateTime] = useState(() => {
        const saved = localStorage.getItem('npcStudioShowDateTime');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [gitModalOpen, setGitModalOpen] = useState(false);
    const [gitModalTab, setGitModalTab] = useState<'status' | 'diff' | 'branches' | 'history'>('status');
    const [gitDiffContent, setGitDiffContent] = useState<{ staged: string; unstaged: string } | null>(null);
    const [gitBranches, setGitBranches] = useState<{ current: string; branches: string[]; local: any } | null>(null);
    const [gitCommitHistory, setGitCommitHistory] = useState<any[]>([]);
    const [gitSelectedFile, setGitSelectedFile] = useState<string | null>(null);
    const [gitNewBranchName, setGitNewBranchName] = useState('');
    const [gitSelectedCommit, setGitSelectedCommit] = useState<any | null>(null);
    const [gitFileDiff, setGitFileDiff] = useState<string | null>(null);
    const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
    const [searchResultsModalOpen, setSearchResultsModalOpen] = useState(false);
    const [graphViewerOpen, setGraphViewerOpen] = useState(false);
    const [dataLabelerOpen, setDataLabelerOpen] = useState(false);
    // Memory modal state
    const [memories, setMemories] = useState<any[]>([]);
    const [memoryLoading, setMemoryLoading] = useState(false);
    const [memoryFilter, setMemoryFilter] = useState('all');
    const [memorySearchTerm, setMemorySearchTerm] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
    const [inputHeight, setInputHeight] = useState(200); // Default height in pixels
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingInput, setIsResizingInput] = useState(false);
    const WINDOW_WORKSPACES_KEY = 'npcStudioWindowWorkspaces';

    // Message labeling state
    const [labelingModal, setLabelingModal] = useState<{ isOpen: boolean; message: any | null }>({ isOpen: false, message: null });
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

    // Python environment setup prompt
    const [pythonEnvPrompt, setPythonEnvPrompt] = useState({ isOpen: false, dismissed: false });
    const [pythonEnvPromptCheckedPaths, setPythonEnvPromptCheckedPaths] = useState<Set<string>>(new Set());


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
    const [executionMode, setExecutionMode] = useState(() => {
        const saved = localStorage.getItem('npcStudioExecutionMode');
        return saved ? JSON.parse(saved) : 'chat';
    });
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

    // Zen mode state - when set to a paneId, that pane renders full-screen
    const [zenModePaneId, setZenModePaneId] = useState<string | null>(null);

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

    // Git functions
    const loadGitStatus = useCallback(async () => {
        if (!currentPath) return;
        try {
            const status = await (window as any).api.getGitStatus(currentPath);
            setGitStatus(status);
        } catch (err) {
            console.error('Failed to load git status:', err);
            setGitStatus(null);
        }
    }, [currentPath]);

    const gitStageFile = async (file: string) => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitStageFile(currentPath, file);
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to stage file');
        } finally {
            setGitLoading(false);
        }
    };

    const gitUnstageFile = async (file: string) => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitUnstageFile(currentPath, file);
            await loadGitStatus();
        } catch (err: any) {
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
            await (window as any).api.gitCommit(currentPath, gitCommitMessage.trim());
            setGitCommitMessage('');
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to commit');
        } finally {
            setGitLoading(false);
        }
    };

    const gitPullChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitPull(currentPath);
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to pull');
        } finally {
            setGitLoading(false);
        }
    };

    const gitPushChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitPush(currentPath);
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to push');
        } finally {
            setGitLoading(false);
        }
    };

    // Load git diff for all changes
    const loadGitDiff = useCallback(async () => {
        if (!currentPath) return;
        try {
            const diff = await (window as any).api.gitDiffAll(currentPath);
            setGitDiffContent(diff);
        } catch (err) {
            console.error('Failed to load git diff:', err);
            setGitDiffContent(null);
        }
    }, [currentPath]);

    // Load git branches
    const loadGitBranches = useCallback(async () => {
        if (!currentPath) return;
        try {
            const branches = await (window as any).api.gitBranches(currentPath);
            setGitBranches(branches);
        } catch (err) {
            console.error('Failed to load git branches:', err);
            setGitBranches(null);
        }
    }, [currentPath]);

    // Load git commit history
    const loadGitHistory = useCallback(async () => {
        if (!currentPath) return;
        try {
            const result = await (window as any).api.gitLog(currentPath, { maxCount: 50 });
            if (result?.success && result.commits) {
                setGitCommitHistory(result.commits);
            } else {
                setGitCommitHistory([]);
            }
        } catch (err) {
            console.error('Failed to load git history:', err);
            setGitCommitHistory([]);
        }
    }, [currentPath]);

    // Create a new branch
    const gitCreateBranch = async () => {
        if (!gitNewBranchName.trim()) return;
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitCreateBranch(currentPath, gitNewBranchName.trim());
            setGitNewBranchName('');
            await loadGitBranches();
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to create branch');
        } finally {
            setGitLoading(false);
        }
    };

    // Switch to a branch
    const gitCheckoutBranch = async (branchName: string) => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitCheckout(currentPath, branchName);
            await loadGitBranches();
            await loadGitStatus();
        } catch (err: any) {
            setGitError(err.message || 'Failed to checkout branch');
        } finally {
            setGitLoading(false);
        }
    };

    // Delete a branch
    const gitDeleteBranch = async (branchName: string, force: boolean = false) => {
        setGitLoading(true);
        setGitError(null);
        try {
            await (window as any).api.gitDeleteBranch(currentPath, branchName, force);
            await loadGitBranches();
        } catch (err: any) {
            setGitError(err.message || 'Failed to delete branch');
        } finally {
            setGitLoading(false);
        }
    };

    // View a specific commit
    const loadCommitDetails = async (commitHash: string) => {
        try {
            const result = await (window as any).api.gitShowCommit(currentPath, commitHash);
            // Find the commit in history to get metadata
            const commitMeta = gitCommitHistory.find((c: any) => c.hash === commitHash);
            if (result?.success) {
                setGitSelectedCommit({
                    hash: commitHash,
                    author_name: commitMeta?.author_name || 'Unknown',
                    author_email: commitMeta?.author_email || '',
                    date: commitMeta?.date || new Date().toISOString(),
                    message: commitMeta?.message || '',
                    details: result.details,
                    diff: result.diff
                });
            }
        } catch (err) {
            console.error('Failed to load commit details:', err);
        }
    };

    // Load file diff
    const loadFileDiff = async (filePath: string, staged: boolean = false) => {
        try {
            const diff = await (window as any).api.gitDiff(currentPath, filePath, staged);
            setGitSelectedFile(filePath);
            setGitFileDiff(diff);
            return diff;
        } catch (err) {
            console.error('Failed to load file diff:', err);
            setGitFileDiff(null);
            return null;
        }
    };

    // Load memories for memory modal
    const loadMemories = useCallback(async () => {
        setMemoryLoading(true);
        try {
            const response = await (window as any).api.executeSQL({
                query: `SELECT id, message_id, conversation_id, npc, team, directory_path,
                       initial_memory, final_memory, status, timestamp, model, provider
                       FROM memory_lifecycle ORDER BY timestamp DESC LIMIT 500`
            });
            if (response.error) throw new Error(response.error);
            setMemories(response.result || []);
        } catch (err) {
            console.error('Error loading memories:', err);
            setMemories([]);
        } finally {
            setMemoryLoading(false);
        }
    }, []);

    // Note: Memory loading is now handled by MemoryManagement component itself

    // Filtered memories
    const filteredMemories = useMemo(() => {
        return memories.filter(memory => {
            const matchesStatus = memoryFilter === 'all' || memory.status === memoryFilter;
            const matchesSearch = !memorySearchTerm ||
                memory.initial_memory?.toLowerCase().includes(memorySearchTerm.toLowerCase()) ||
                memory.final_memory?.toLowerCase().includes(memorySearchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [memories, memoryFilter, memorySearchTerm]);

    // Save showDateTime preference
    useEffect(() => {
        localStorage.setItem('npcStudioShowDateTime', JSON.stringify(showDateTime));
    }, [showDateTime]);

    // Save model/provider/NPC preferences
    useEffect(() => {
        if (currentModel !== null) {
            localStorage.setItem('npcStudioCurrentModel', JSON.stringify(currentModel));
        }
    }, [currentModel]);

    useEffect(() => {
        if (currentProvider !== null) {
            localStorage.setItem('npcStudioCurrentProvider', JSON.stringify(currentProvider));
        }
    }, [currentProvider]);

    useEffect(() => {
        if (currentNPC !== null) {
            localStorage.setItem('npcStudioCurrentNPC', JSON.stringify(currentNPC));
        }
    }, [currentNPC]);

    // Save execution mode preference
    useEffect(() => {
        localStorage.setItem('npcStudioExecutionMode', JSON.stringify(executionMode));
    }, [executionMode]);

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
    const createNewBrowserRef = useRef<(() => void) | null>(null);
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

            // Ctrl+B - New Browser
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
                e.preventDefault();
                createNewBrowserRef.current?.();
                return;
            }

            // Ctrl+Shift+T - New Terminal
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                createNewTerminalRef.current?.();
                return;
            }

            // Ctrl+Shift+C - New Conversation/Chat (but not when in terminal - let terminal handle copy)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
                // Check if focus is inside a terminal - if so, let the terminal handle the copy
                const activeElement = document.activeElement;
                const isInTerminal = activeElement?.closest('.xterm') || activeElement?.closest('[data-terminal]');
                if (isInTerminal) {
                    // Don't prevent default - let the terminal's copy handler work
                    return;
                }
                e.preventDefault();
                createNewConversationRef.current?.();
                return;
            }

            // Ctrl+Shift+B - New Browser
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                createNewBrowserRef.current?.();
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
        const cleanup = window.api.onBrowserShowContextMenu((data) => {
            console.log('[REACT BROWSER CONTEXT] Received context menu event', data);

            setBrowserContextMenuPos({
                x: data.x,
                y: data.y,
                selectedText: data.selectedText || '',
                linkURL: data.linkURL || '',
                srcURL: data.srcURL || '',
                pageURL: data.pageURL || '',
                isEditable: data.isEditable || false,
                mediaType: data.mediaType || 'none',
                canCopy: data.canCopy || false,
                canPaste: data.canPaste || false,
                canSaveImage: data.canSaveImage || false,
                canSaveLink: data.canSaveLink || false,
            });
        });

        return () => {
            cleanup();
        };
    }, []);

    // Handle download requests forwarded from main process
    useEffect(() => {
        const cleanup = window.api.onBrowserDownloadRequested?.(async (data: { url: string; filename: string; mimeType: string; totalBytes: number }) => {
            console.log('[DOWNLOAD] Received download request from main:', data);
            // Call browserSaveLink with currentPath - this follows the IPC pattern
            await (window as any).api?.browserSaveLink?.(data.url, data.filename, currentPath);
        });

        return () => {
            cleanup?.();
        };
    }, [currentPath]);

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

        // Update browser download directory
        if (newPath && window.api?.setDownloadDirectory) {
            window.api.setDownloadDirectory(newPath);
        }
    }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);

    // Check if Python environment is configured when workspace changes
    useEffect(() => {
        const checkPythonEnv = async () => {
            if (!currentPath || pythonEnvPrompt.dismissed) return;

            // Don't check the same path twice in a session
            if (pythonEnvPromptCheckedPaths.has(currentPath)) return;

            try {
                const result = await (window as any).api?.pythonEnvCheckConfigured?.(currentPath);
                setPythonEnvPromptCheckedPaths(prev => new Set([...prev, currentPath]));

                if (!result?.configured) {
                    // No Python env configured - show prompt
                    setPythonEnvPrompt({ isOpen: true, dismissed: false });
                }
            } catch (err) {
                console.error('Error checking python env config:', err);
            }
        };

        // Small delay to not interrupt initial load
        const timer = setTimeout(checkPythonEnv, 1500);
        return () => clearTimeout(timer);
    }, [currentPath, pythonEnvPrompt.dismissed, pythonEnvPromptCheckedPaths]);


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

    // Track activity for RNN predictions
    trackActivity('pane_open', {
        paneType: newContentType,
        filePath: newContentType === 'editor' ? newContentId : undefined,
        url: newContentType === 'browser' ? newContentId : undefined,
        fileType: newContentType === 'editor' ? newContentId?.split('.').pop() : undefined,
    });

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
        // Initialize per-pane execution mode if not set
        if (paneData.executionMode === undefined) {
            paneData.executionMode = 'chat';
            paneData.selectedJinx = null;
            paneData.showJinxDropdown = false;
        }
        if (skipMessageLoad) {
            paneData.chatMessages.messages = [];
            paneData.chatMessages.allMessages = [];
            paneData.chatStats = getConversationStats([]);
        } else {
            try {
                const msgs = await window.api.getConversationMessages(newContentId);
                const formatted = (msgs && Array.isArray(msgs))
                    ? msgs.map((m) => {
                        const msg = { ...m, id: m.id || generateId() };
                        // Reconstruct contentParts for assistant messages with tool calls
                        if (msg.role === 'assistant' && msg.toolCalls && Array.isArray(msg.toolCalls)) {
                            const contentParts: any[] = [];
                            // Add text content first
                            if (msg.content) {
                                contentParts.push({ type: 'text', content: msg.content });
                            }
                            // Add tool calls
                            msg.toolCalls.forEach((tc: any) => {
                                contentParts.push({
                                    type: 'tool_call',
                                    call: {
                                        id: tc.id,
                                        function_name: tc.function_name,
                                        arguments: tc.arguments,
                                        status: 'complete'
                                    }
                                });
                            });
                            msg.contentParts = contentParts;
                        }
                        return msg;
                    })
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
}, [trackActivity]);

// Helper to find existing pane by content type (for singleton tools)
const findExistingPaneByContentType = useCallback((targetContentType: string): string | null => {
    for (const [paneId, paneData] of Object.entries(contentDataRef.current)) {
        if ((paneData as any)?.contentType === targetContentType) {
            return paneId;
        }
    }
    return null;
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
    // Track pane close activity
    const paneData = contentDataRef.current[paneId];
    if (paneData) {
        trackActivity('pane_close', {
            paneType: paneData.contentType,
            filePath: paneData.contentId,
        });
    }

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

// Handle resend message - opens resend modal
const handleResendMessage = useCallback((messageToResend: any) => {
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
}, [isStreaming, currentModel, currentNPC]);

// Handle creating a conversation branch from a specific message
const handleCreateBranch = useCallback((messageIndex: number) => {
    createBranchPoint(
        messageIndex,
        activeContentPaneId,
        currentBranchId,
        conversationBranches,
        contentDataRef,
        setConversationBranches,
        setCurrentBranchId,
        setRootLayoutNode
    );
    // Show the branching UI after creating a branch
    setShowBranchingUI(true);
}, [activeContentPaneId, currentBranchId, conversationBranches, contentDataRef, setConversationBranches, setCurrentBranchId, setRootLayoutNode]);

// Handle running a Python script in a new terminal
const handleRunScript = useCallback(async (scriptPath: string) => {
    if (!scriptPath) return;

    // Create a new terminal pane
    const newPaneId = `pane-${Date.now()}`;

    // Add terminal to content data
    contentDataRef.current[newPaneId] = {
        contentType: 'terminal',
        contentId: newPaneId,
        terminalId: newPaneId
    };

    // Add pane to layout
    setRootLayoutNode((prev) => {
        if (!prev) {
            return { id: newPaneId, type: 'content' };
        }
        if (prev.type === 'content') {
            return {
                id: `split-${Date.now()}`,
                type: 'split',
                direction: 'horizontal',
                children: [prev, { id: newPaneId, type: 'content' }],
                sizes: [50, 50]
            };
        }
        const newRoot = JSON.parse(JSON.stringify(prev));
        newRoot.children.push({ id: newPaneId, type: 'content' });
        const equalSize = 100 / newRoot.children.length;
        newRoot.sizes = new Array(newRoot.children.length).fill(equalSize);
        return newRoot;
    });

    setActiveContentPaneId(newPaneId);

    // Wait for terminal to initialize then send the run command
    setTimeout(async () => {
        // Get the script directory and filename
        const scriptDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
        const scriptName = scriptPath.split('/').pop();

        // Get configured Python environment or use system default
        let pythonCmd = 'python3';
        try {
            const resolved = await window.api?.pythonEnvResolve?.(currentPath);
            if (resolved?.pythonPath) {
                pythonCmd = resolved.pythonPath;
            }
        } catch (e) {
            console.warn('Failed to resolve Python environment, using system python:', e);
        }

        // Send the command to run the script
        const runCommand = `cd "${scriptDir}" && ${pythonCmd} "${scriptName}"\n`;
        window.api?.writeToTerminal?.({ id: newPaneId, data: runCommand });
    }, 500);
}, [currentPath, setRootLayoutNode, setActiveContentPaneId]);

// Handle sending selected code to an open terminal (Ctrl+Enter)
const handleSendToTerminal = useCallback((text: string) => {
    if (!text) return;

    // Find the first open terminal pane
    const terminalPaneId = Object.keys(contentDataRef.current).find(
        id => contentDataRef.current[id]?.type === 'terminal'
    );

    if (!terminalPaneId) {
        console.warn('No terminal pane open. Please open a terminal first.');
        return;
    }

    // Send the text to the terminal (add newline to execute)
    window.api?.writeToTerminal?.({ id: terminalPaneId, data: text + '\n' });
}, []);

// Render functions for different content pane types
const renderChatView = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData || !paneData.chatMessages) {
        return <div className="flex-1 flex items-center justify-center theme-text-muted">No messages</div>;
    }

    const messages = paneData.chatMessages.messages || [];

    // Note: The scrollable container is in LayoutNode.tsx, we just render the messages here
    return (
        <div className="p-4 space-y-4">
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
                    onCreateBranch={handleCreateBranch}
                    messageIndex={idx}
                    onLabelMessage={handleLabelMessage}
                    messageLabel={messageLabels[msg.id || msg.timestamp]}
                    conversationId={paneData.contentId}
                />
            ))}
        </div>
    );
}, [selectedMessages, messageSelectionMode, searchTerm, handleLabelMessage, messageLabels, handleResendMessage, handleCreateBranch]);

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
            handleAIEdit={() => {}}
            startAgenticEdit={() => {}}
            onGitBlame={() => {}}
            setPromptModal={setPromptModal}
            currentPath={currentPath}
            onRunScript={handleRunScript}
            onSendToTerminal={handleSendToTerminal}
        />
    );
}, [activeContentPaneId, editorContextMenuPos, aiEditModal, renamingPaneId, editedFileName, setRootLayoutNode, currentPath, handleRunScript, handleSendToTerminal]);

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

// PDF highlight handlers
const handleCopyPdfText = useCallback((text: string) => {
    if (text) {
        navigator.clipboard.writeText(text);
    }
}, []);

const handleHighlightPdfSelection = useCallback(async (text: string, position: any, color: string = 'yellow') => {
    if (!text || !position || !activeContentPaneId) return;

    const paneData = contentDataRef.current[activeContentPaneId];
    if (!paneData || paneData.contentType !== 'pdf') return;

    const filePath = paneData.contentId;
    try {
        await (window as any).api.addPdfHighlight({
            filePath,
            text,
            position,
            annotation: '',
            color
        });
        // Trigger reload of highlights
        setPdfHighlightsTrigger(prev => prev + 1);
    } catch (err) {
        console.error('Failed to save highlight:', err);
    }
}, [activeContentPaneId]);

const handleApplyPromptToPdfText = useCallback((promptType: string, text: string) => {
    if (!text) return;
    // Could integrate with chat or AI features here
    console.log(`Apply ${promptType} to:`, text);
}, []);

const renderPdfViewer = useCallback(({ nodeId }) => {
    return (
        <PdfViewer
            nodeId={nodeId}
            contentDataRef={contentDataRef}
            currentPath={currentPath}
            activeContentPaneId={activeContentPaneId}
            pdfContextMenuPos={pdfContextMenuPos}
            setPdfContextMenuPos={setPdfContextMenuPos}
            handleCopyPdfText={handleCopyPdfText}
            handleHighlightPdfSelection={handleHighlightPdfSelection}
            handleApplyPromptToPdfText={handleApplyPromptToPdfText}
            pdfHighlights={pdfHighlights}
            setPdfHighlights={setPdfHighlights}
            pdfHighlightsTrigger={pdfHighlightsTrigger}
        />
    );
}, [currentPath, activeContentPaneId, pdfContextMenuPos, pdfHighlights, pdfHighlightsTrigger, handleCopyPdfText, handleHighlightPdfSelection, handleApplyPromptToPdfText]);

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
            currentPath={currentPath}
            setBrowserContextMenuPos={setBrowserContextMenuPos}
            setRootLayoutNode={setRootLayoutNode}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [currentPath, rootLayoutNode, closeContentPane]);

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
            performSplit={performSplit}
        />
    );
}, [rootLayoutNode, closeContentPane, performSplit]);

const renderZipViewer = useCallback(({ nodeId }) => {
    return (
        <ZipViewer
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

const renderMindMapViewer = useCallback(({ nodeId }) => {
    return (
        <MindMapViewer
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

// Render DataLabeler pane (for pane-based viewing)
const renderDataLabelerPane = useCallback(({ nodeId }) => {
    return (
        <DataLabeler
            isPane={true}
            messageLabels={messageLabels}
            setMessageLabels={setMessageLabels}
            conversationLabels={conversationLabels}
            setConversationLabels={setConversationLabels}
        />
    );
}, [messageLabels, setMessageLabels, conversationLabels, setConversationLabels]);

// Render GraphViewer pane (for pane-based viewing)
const renderGraphViewerPane = useCallback(({ nodeId }) => {
    return (
        <GraphViewer
            isPane={true}
            currentPath={currentPath}
        />
    );
}, [currentPath]);

// Render BrowserHistoryWeb pane (browser navigation graph)
const renderBrowserGraphPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <BrowserHistoryWeb
            currentPath={currentPath}
        />
    );
}, [currentPath]);

// Handle starting conversation from a viewer (PhotoViewer, etc.)
const handleStartConversationFromViewer = useCallback(async (images?: Array<{ path: string }>) => {
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
}, [setUploadedFiles]);

// Render DataDash pane (for pane-based viewing)
const renderDataDashPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <DataDash
            initialAnalysisContext={analysisContext}
            currentPath={currentPath}
            currentModel={currentModel}
            currentProvider={currentProvider}
            currentNPC={currentNPC}
            messageLabels={messageLabels}
            setMessageLabels={setMessageLabels}
            conversationLabels={conversationLabels}
            setConversationLabels={setConversationLabels}
        />
    );
}, [analysisContext, currentPath, currentModel, currentProvider, currentNPC, messageLabels, setMessageLabels, conversationLabels, setConversationLabels]);

// Render PhotoViewer pane (for pane-based viewing)
const renderPhotoViewerPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <PhotoViewer
            currentPath={currentPath}
            onStartConversation={handleStartConversationFromViewer}
        />
    );
}, [currentPath, handleStartConversationFromViewer]);

// Handle opening a document from the library viewer
const handleOpenDocumentFromLibrary = useCallback(async (path: string, type: 'pdf' | 'epub') => {
    // Open the document in a new pane
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

    setTimeout(async () => {
        await updateContentPane(newPaneId, type, path);
        setRootLayoutNode(prev => ({ ...prev }));
    }, 0);

    setActiveContentPaneId(newPaneId);
}, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);

// Render LibraryViewer pane (for pane-based viewing)
const renderLibraryViewerPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <LibraryViewer
            currentPath={currentPath}
            onOpenDocument={handleOpenDocumentFromLibrary}
        />
    );
}, [currentPath, handleOpenDocumentFromLibrary]);

// Render FolderViewer pane (for pane-based folder browsing)
const renderFolderViewerPane = useCallback(({ nodeId }: { nodeId: string }) => {
    const paneData = contentDataRef.current[nodeId];
    const folderPath = paneData?.contentId || currentPath || '/';

    const handleOpenFile = (filePath: string) => {
        // Open the file in a new pane or tab
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'editor';
        if (ext === 'pdf') contentType = 'pdf';
        else if (['csv', 'xlsx', 'xls'].includes(ext || '')) contentType = 'csv';
        else if (['docx', 'doc'].includes(ext || '')) contentType = 'docx';
        else if (ext === 'pptx') contentType = 'pptx';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) contentType = 'image';

        // Add as a new tab in the current pane
        if (paneData) {
            if (!paneData.tabs || paneData.tabs.length === 0) {
                paneData.tabs = [{
                    id: `tab_${Date.now()}_0`,
                    contentType: 'folder',
                    contentId: folderPath,
                    title: folderPath.split('/').pop() || 'Folder'
                }];
                paneData.activeTabIndex = 0;
            }
            const newTab = {
                id: `tab_${Date.now()}_${paneData.tabs.length}`,
                contentType,
                contentId: filePath,
                title: filePath.split('/').pop() || 'File'
            };
            paneData.tabs.push(newTab);
            paneData.activeTabIndex = paneData.tabs.length - 1;
            paneData.contentType = contentType;
            paneData.contentId = filePath;
            setRootLayoutNode(prev => ({ ...prev }));
        }
    };

    const handleNavigate = (newPath: string) => {
        if (paneData) {
            paneData.contentId = newPath;
            setRootLayoutNode(prev => ({ ...prev }));
        }
    };

    return (
        <FolderViewer
            folderPath={folderPath}
            onOpenFile={handleOpenFile}
            onNavigate={handleNavigate}
        />
    );
}, [currentPath, setRootLayoutNode]);

// Render ProjectEnvEditor pane (for pane-based viewing)
const renderProjectEnvPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <ProjectEnvEditor
            currentPath={currentPath}
        />
    );
}, [currentPath]);

// Render DiskUsageAnalyzer pane (for pane-based viewing)
const renderDiskUsagePane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <DiskUsageAnalyzer
            path={currentPath}
            isDarkMode={isDarkMode}
            isPane={true}
        />
    );
}, [currentPath, isDarkMode]);

// Render DBTool pane (for pane-based viewing)
const renderDBToolPane = useCallback(({ nodeId }: { nodeId: string }) => {
    return (
        <DBTool
            currentPath={currentPath}
            currentModel={currentModel}
            currentProvider={currentProvider}
            currentNPC={currentNPC}
        />
    );
}, [currentPath, currentModel, currentProvider, currentNPC]);

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
                // Close context menus
                setContextMenuPos(null);
                setFileContextMenuPos(null);
                setMessageContextMenuPos(null);
                setEditorContextMenuPos(null);
                setBrowserContextMenu({ isOpen: false, x: 0, y: 0, selectedText: '' });
                setBrowserContextMenuPos(null);
                // Close status bar modals
                setGitModalOpen(false);
                setWorkspaceModalOpen(false);
                setSearchResultsModalOpen(false);
                // Exit zen mode
                setZenModePaneId(null);
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

    // Handle file rename from PaneHeader
    const handleConfirmRename = useCallback(async (paneId: string, oldFilePath: string) => {
        if (!editedFileName || !oldFilePath) {
            setRenamingPaneId(null);
            return;
        }

        const directory = oldFilePath.substring(0, oldFilePath.lastIndexOf('/'));
        const newFilePath = normalizePath(`${directory}/${editedFileName}`);

        if (newFilePath === oldFilePath) {
            setRenamingPaneId(null);
            return;
        }

        try {
            const result = await window.api.renameFile(oldFilePath, newFilePath);
            if (result?.error) throw new Error(result.error);

            // Update the content pane with new file path
            if (contentDataRef.current[paneId]) {
                contentDataRef.current[paneId].contentId = newFilePath;
            }

            // Refresh directory structure directly
            if (currentPath) {
                const structureResult = await window.api.readDirectoryStructure(currentPath);
                if (structureResult && !structureResult.error) {
                    setFolderStructure(structureResult);
                }
            }
            setRootLayoutNode(p => ({ ...p }));
        } catch (err: any) {
            setError(`Failed to rename file: ${err.message}`);
        } finally {
            setRenamingPaneId(null);
            setEditedFileName('');
        }
    }, [editedFileName, currentPath]);

    const createNewTerminal = useCallback(async (shellType: 'system' | 'npcsh' | 'guac' = 'system') => {
        const newTerminalId = `term_${generateId()}`;
        const newPaneId = generateId();

        // Create layout first
        setRootLayoutNode(oldRoot => {
            contentDataRef.current[newPaneId] = { shellType };

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

        // Then update content (shellType is already in paneData from above)
        setTimeout(async () => {
            await updateContentPane(newPaneId, 'terminal', newTerminalId);
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
        setActiveConversationId(null);
        setCurrentFile(null);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane]);

    // Create DataLabeler pane (singleton - only one per folder)
    const createDataLabelerPane = useCallback(async () => {
        // Check if DataLabeler pane already exists
        const existingPaneId = findExistingPaneByContentType('data-labeler');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'data-labeler', 'data-labeler');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create GraphViewer pane (singleton - only one per folder)
    const createGraphViewerPane = useCallback(async () => {
        // Check if GraphViewer pane already exists
        const existingPaneId = findExistingPaneByContentType('graph-viewer');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'graph-viewer', 'graph-viewer');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create BrowserHistoryWeb pane (browser navigation graph) (singleton - only one per folder)
    const createBrowserGraphPane = useCallback(async () => {
        // Check if BrowserGraph pane already exists
        const existingPaneId = findExistingPaneByContentType('browsergraph');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'browsergraph', 'browsergraph');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create DataDash pane (singleton - only one per folder)
    const createDataDashPane = useCallback(async () => {
        // Check if DataDash pane already exists
        const existingPaneId = findExistingPaneByContentType('datadash');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'datadash', 'datadash');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create DBTool pane (singleton - only one per folder)
    const createDBToolPane = useCallback(async () => {
        // Check if DBTool pane already exists
        const existingPaneId = findExistingPaneByContentType('dbtool');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'dbtool', 'dbtool');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create PhotoViewer pane (singleton - only one per folder)
    const createPhotoViewerPane = useCallback(async () => {
        // Check if PhotoViewer pane already exists
        const existingPaneId = findExistingPaneByContentType('photoviewer');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'photoviewer', 'photoviewer');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create LibraryViewer pane (singleton - only one per folder)
    const createLibraryViewerPane = useCallback(async () => {
        // Check if LibraryViewer pane already exists
        const existingPaneId = findExistingPaneByContentType('library');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'library', 'library');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create ProjectEnv pane (singleton - only one per folder)
    const createProjectEnvPane = useCallback(async () => {
        // Check if ProjectEnv pane already exists
        const existingPaneId = findExistingPaneByContentType('projectenv');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'projectenv', 'projectenv');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Create DiskUsage pane (singleton - only one per folder)
    const createDiskUsagePane = useCallback(async () => {
        // Check if DiskUsage pane already exists
        const existingPaneId = findExistingPaneByContentType('diskusage');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'diskusage', 'diskusage');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

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
    // Check for workspace-specific homepage in .env file
    let defaultHomepage = 'https://wikipedia.org';
    if (currentPath) {
        try {
            const envResult = await (window as any).api?.readFileContent?.(`${currentPath}/.env`);
            if (envResult?.content) {
                const match = envResult.content.match(/^BROWSER_HOMEPAGE=(.+)$/m);
                if (match) {
                    defaultHomepage = match[1].trim().replace(/^["']|["']$/g, '');
                }
            }
        } catch {
            // Ignore errors, use default
        }
    }
    const targetUrl = url || defaultHomepage;

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
            contentDataRef.current[newPaneId].browserUrl = targetUrl;
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

        // Get pane-specific execution mode and selectedJinx
        const paneExecMode = activeContentPaneId ? (contentDataRef.current[activeContentPaneId]?.executionMode || 'chat') : 'chat';
        const paneSelectedJinx = activeContentPaneId ? (contentDataRef.current[activeContentPaneId]?.selectedJinx || null) : null;

        const isJinxMode = paneExecMode !== 'chat' && paneSelectedJinx;
        const currentJinxInputs = isJinxMode ? (jinxInputValues[paneSelectedJinx.name] || {}) : {};

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
            jinxName = paneSelectedJinx.name;

            paneSelectedJinx.inputs.forEach((inputDef: any) => {
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

            const jinxCommandParts = [`/${paneSelectedJinx.name}`];
            paneSelectedJinx.inputs.forEach((inputDef: any) => {
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

                if (paneExecMode === 'tool_agent') {
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
            executionMode: paneExecMode,
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
                [paneSelectedJinx.name]: {}
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
                    executionMode: paneExecMode,
                    mcpServerPath: paneExecMode === 'tool_agent' ? mcpServerPath : undefined,
                    selectedMcpTools: paneExecMode === 'tool_agent' ? selectedMcpTools : undefined,
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
        createNewBrowserRef.current = createNewBrowser;
        handleCreateNewFolderRef.current = handleCreateNewFolder;
    }, [createNewTerminal, createNewConversation, createNewBrowser, handleCreateNewFolder]);

    // Render NPC Team pane (embedded version for pane layout)
    const renderNPCTeamPane = useCallback(({ nodeId }: { nodeId: string }) => {
        return (
            <NPCTeamMenu
                isOpen={true}
                onClose={() => {}}
                currentPath={currentPath}
                startNewConversation={(npc) => {
                    setCurrentNPC(npc.name || npc);
                    createNewConversation();
                }}
                embedded={true}
            />
        );
    }, [currentPath, createNewConversation]);

    // Create NPC Team pane (singleton - only one per folder)
    const createNPCTeamPane = useCallback(async () => {
        // Check if NPC Team pane already exists
        const existingPaneId = findExistingPaneByContentType('npcteam');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'npcteam', 'npcteam');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, createNewConversation, findExistingPaneByContentType]);

    // Render Jinx Menu pane (embedded version for pane layout)
    const renderJinxPane = useCallback(({ nodeId }: { nodeId: string }) => {
        return (
            <JinxMenu
                isOpen={true}
                onClose={() => {}}
                currentPath={currentPath}
                embedded={true}
            />
        );
    }, [currentPath]);

    // Create Jinx pane (singleton - only one per folder)
    const createJinxPane = useCallback(async () => {
        // Check if Jinx pane already exists
        const existingPaneId = findExistingPaneByContentType('jinx');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'jinx', 'jinx');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    // Render Team Management pane (embedded version for pane layout)
    const renderTeamManagementPane = useCallback(({ nodeId }: { nodeId: string }) => {
        return (
            <TeamManagement
                isOpen={true}
                onClose={() => {}}
                currentPath={currentPath}
                startNewConversation={(npc) => {
                    setCurrentNPC(npc.name || npc);
                    createNewConversation();
                }}
                embedded={true}
            />
        );
    }, [currentPath, createNewConversation]);

    // Create Team Management pane (singleton - only one per folder)
    const createTeamManagementPane = useCallback(async () => {
        // Check if Team Management pane already exists
        const existingPaneId = findExistingPaneByContentType('teammanagement');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            return;
        }

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'teammanagement', 'teammanagement');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, createNewConversation, findExistingPaneByContentType]);

    // Render Settings pane (embedded version for pane layout)
    const renderSettingsPane = useCallback(({ nodeId }: { nodeId: string }) => {
        const paneData = contentDataRef.current[nodeId] || {};
        const initialTab = paneData.settingsInitialTab || 'global';
        return (
            <SettingsMenu
                isOpen={true}
                onClose={() => {}}
                currentPath={currentPath}
                onPathChange={handlePathChange}
                availableModels={availableModels}
                embedded={true}
                initialTab={initialTab}
            />
        );
    }, [currentPath, handlePathChange, availableModels]);

    // Create Settings pane (singleton - only one per folder)
    const createSettingsPane = useCallback(async (initialTab = 'global') => {
        // Check if Settings pane already exists
        const existingPaneId = findExistingPaneByContentType('settings');
        if (existingPaneId) {
            setActiveContentPaneId(existingPaneId);
            // Update the initial tab if one was specified
            if (initialTab !== 'global' && contentDataRef.current[existingPaneId]) {
                contentDataRef.current[existingPaneId].settingsInitialTab = initialTab;
                setRootLayoutNode(prev => ({ ...prev })); // Trigger re-render
            }
            return;
        }

        const newPaneId = generateId();

        setRootLayoutNode(oldRoot => {
            contentDataRef.current[newPaneId] = { settingsInitialTab: initialTab };

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

        setTimeout(async () => {
            await updateContentPane(newPaneId, 'settings', 'settings');
            setRootLayoutNode(prev => ({ ...prev }));
        }, 0);

        setActiveContentPaneId(newPaneId);
    }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, findExistingPaneByContentType]);

    const createNewTextFile = () => {
        setPromptModalValue('untitled.py');
        setPromptModal({
            isOpen: true,
            title: 'Create New File',
            message: 'Enter filename with extension (e.g., script.py, index.js, notes.md)',
            defaultValue: 'untitled.py',
            onConfirm: async (filename) => {
                try {
                    if (!filename || filename.trim() === '') return;
                    const cleanName = filename.trim();
                    const filepath = normalizePath(`${currentPath}/${cleanName}`);
                    await window.api.writeFileContent(filepath, '');
                    await loadDirectoryStructure(currentPath);
                    await handleFileClick(filepath);
                } catch (err) {
                    setError(err.message);
                }
            }
        });
    };

    const createNewDocument = async (docType: 'docx' | 'xlsx' | 'pptx' | 'mindmap') => {
        try {
            const filename = `untitled-${Date.now()}.${docType}`;
            const filepath = normalizePath(`${currentPath}/${filename}`);
            // Create empty document - the viewer components will handle creating proper structure
            // For mindmap, create initial JSON structure
            if (docType === 'mindmap') {
                const initialMindMap = {
                    nodes: [{ id: 'root', label: 'Central Idea', x: 400, y: 300, color: '#3b82f6' }],
                    links: []
                };
                await window.api.writeFileContent(filepath, JSON.stringify(initialMindMap, null, 2));
            } else {
                await window.api.writeFileContent(filepath, '');
            }
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

    // Handle browser download complete - refresh folder listing
    useEffect(() => {
        if (!window.api?.onDownloadComplete) return;

        const cleanup = window.api.onDownloadComplete((data) => {
            console.log('[DOWNLOAD] Completed:', data);
            if (data.state === 'completed' && data.directory === currentPath) {
                // Refresh folder listing
                loadDirectoryStructure(currentPath);
            }
        });

        return cleanup;
    }, [currentPath, loadDirectoryStructure]);

    // Screenshot capture handler - creates new conversation with screenshot attachment
    useEffect(() => {
        const cleanup = window.api.onScreenshotCaptured(async (screenshotPath: string) => {
            console.log('[Screenshot] Captured:', screenshotPath);

            // Create a new conversation
            const newConvoId = generateId();
            const newConversation = {
                id: newConvoId,
                title: `Screenshot ${new Date().toLocaleString()}`,
                messages: [],
                timestamp: new Date().toISOString(),
                npc: currentNPC,
                model: currentModel,
                provider: currentProvider
            };

            // Add to conversations list
            setDirectoryConversations(prev => [newConversation, ...prev]);

            // Create the attachment from the screenshot path
            const fileName = screenshotPath.split('/').pop() || 'screenshot.png';
            const attachment = {
                id: generateId(),
                name: fileName,
                type: 'image/png',
                path: screenshotPath,
                size: 0,
                preview: `file://${screenshotPath}`
            };

            // Set the uploaded files with the screenshot
            setUploadedFiles([attachment]);

            // Open the conversation in a new pane
            const newPaneData = {
                type: 'chat' as const,
                title: newConversation.title,
                conversationId: newConvoId,
                conversation: newConversation,
                npc: currentNPC,
                model: currentModel,
                provider: currentProvider,
            };

            createAndAddPaneNodeToLayout(newPaneData);
            setActiveConversationId(newConvoId);

            // Focus the window
            window.focus();
        });

        return cleanup;
    }, [currentNPC, currentModel, currentProvider, generateId, createAndAddPaneNodeToLayout]);

        
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
            // Only determine initial path on first load (when currentPath is empty)
            if (!currentPath) {
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

                setCurrentPath(initialPathToLoad);
                // Set browser download directory to current path
                if (window.api?.setDownloadDirectory) {
                    window.api.setDownloadDirectory(initialPathToLoad);
                }
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="theme-text-primary">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 theme-text-primary">{promptModal.title}</h3>
                <p className="theme-text-muted mb-4 text-sm">{promptModal.message}</p>
            </div>
            <input
                type="text"
                value={promptModalValue}
                onChange={(e) => setPromptModalValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        promptModal.onConfirm?.(promptModalValue);
                        setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                        setPromptModalValue('');
                    } else if (e.key === 'Escape') {
                        setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                        setPromptModalValue('');
                    }
                }}
                placeholder="Enter filename..."
                className="w-full theme-input text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
            />
            <div className="flex justify-end gap-3">
                <button
                    className="px-4 py-2 theme-button theme-hover rounded text-sm"
                    onClick={() => {
                        setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                        setPromptModalValue('');
                    }}
                >
                    Cancel
                </button>
                <button
                    className="px-4 py-2 theme-button-primary rounded text-sm"
                    onClick={() => {
                        promptModal.onConfirm?.(promptModalValue);
                        setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                        setPromptModalValue('');
                    }}
                >
                    Create
                </button>
            </div>
        </div>
    </div>
)}

{/* Python Environment Setup Prompt */}
{pythonEnvPrompt.isOpen && (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-md w-full">
            <div className="flex flex-col items-center text-center">
                <div className="theme-bg-tertiary p-3 rounded-full mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <h3 className="text-lg font-medium mb-2 theme-text-primary">Python Environment</h3>
                <p className="theme-text-muted mb-4 text-sm">
                    No Python environment is configured for this workspace. Would you like to set one up now?
                </p>
                <p className="text-xs text-gray-500 mb-4">
                    This is useful for managing packages like transformers, diffusers, torch, etc.
                </p>
            </div>
            <div className="flex justify-center gap-3">
                <button
                    className="px-4 py-2 theme-button theme-hover rounded text-sm"
                    onClick={() => {
                        setPythonEnvPrompt({ isOpen: false, dismissed: true });
                    }}
                >
                    Skip for Now
                </button>
                <button
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    onClick={() => {
                        setPythonEnvPrompt({ isOpen: false, dismissed: false });
                        // Open settings to Python tab
                        createSettingsPane('python');
                    }}
                >
                    Configure Python
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

            <CtxEditor
                isOpen={ctxEditorOpen}
                onClose={() => setCtxEditorOpen(false)}
                currentPath={currentPath}
                npcList={availableNPCs.map(npc => ({ name: npc.name, display_name: npc.display_name }))}
                jinxList={availableJinxs.map(jinx => ({ jinx_name: jinx.name, description: jinx.description }))}
            />

            <TeamManagement
                isOpen={teamManagementOpen}
                onClose={() => setTeamManagementOpen(false)}
                currentPath={currentPath}
                startNewConversation={startNewConversationWithNpc}
                npcList={availableNPCs.map(npc => ({ name: npc.name, display_name: npc.display_name }))}
                jinxList={availableJinxs.map(jinx => ({ jinx_name: jinx.name, description: jinx.description }))}
            />

            {/* Git Modal - Enhanced with tabs */}
            {gitModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setGitModalOpen(false)}>
                    <div className="w-full max-w-5xl max-h-[85vh] theme-bg-primary rounded-lg border theme-border flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b theme-border">
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                                    <line x1="6" y1="3" x2="6" y2="15"></line>
                                    <circle cx="18" cy="6" r="3"></circle>
                                    <circle cx="6" cy="18" r="3"></circle>
                                    <path d="M18 9a9 9 0 0 1-9 9"></path>
                                </svg>
                                <h2 className="text-lg font-semibold theme-text-primary">Git</h2>
                                {gitStatus?.branch && <span className="text-sm theme-text-muted">({gitStatus.branch})</span>}
                            </div>
                            <button onClick={() => setGitModalOpen(false)} className="p-2 theme-hover rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex border-b theme-border px-4">
                            {(['status', 'diff', 'branches', 'history'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setGitModalTab(tab);
                                        if (tab === 'diff') loadGitDiff();
                                        if (tab === 'branches') loadGitBranches();
                                        if (tab === 'history') loadGitHistory();
                                    }}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                        gitModalTab === tab
                                            ? 'border-purple-500 text-purple-400'
                                            : 'border-transparent theme-text-muted hover:theme-text-primary'
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-auto p-4">
                            {!gitStatus ? (
                                <div className="text-center theme-text-muted py-8">No git repository in this directory</div>
                            ) : gitModalTab === 'status' ? (
                                /* Status Tab */
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="theme-text-primary font-medium">Branch: {gitStatus.branch}</span>
                                        {gitStatus.ahead > 0 && <span className="text-green-400">↑{gitStatus.ahead} ahead</span>}
                                        {gitStatus.behind > 0 && <span className="text-yellow-400">↓{gitStatus.behind} behind</span>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="theme-bg-secondary rounded-lg p-3">
                                            <h3 className="text-sm font-medium text-green-400 mb-2">Staged ({(gitStatus.staged || []).length})</h3>
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {(gitStatus.staged || []).length === 0 ? (
                                                    <div className="text-xs theme-text-muted">No staged files</div>
                                                ) : (gitStatus.staged || []).map((file: any) => (
                                                    <div key={file.path} className="flex items-center justify-between text-xs group">
                                                        <button
                                                            onClick={() => loadFileDiff(file.path, true)}
                                                            className="text-green-300 truncate flex-1 text-left hover:underline"
                                                        >
                                                            {file.path}
                                                        </button>
                                                        <button onClick={() => gitUnstageFile(file.path)} className="text-red-400 hover:text-red-300 px-2 opacity-0 group-hover:opacity-100">Unstage</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="theme-bg-secondary rounded-lg p-3">
                                            <h3 className="text-sm font-medium text-yellow-400 mb-2">Unstaged ({(gitStatus.unstaged || []).length + (gitStatus.untracked || []).length})</h3>
                                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                                {(gitStatus.unstaged || []).length + (gitStatus.untracked || []).length === 0 ? (
                                                    <div className="text-xs theme-text-muted">No changes</div>
                                                ) : [...(gitStatus.unstaged || []), ...(gitStatus.untracked || [])].map((file: any) => (
                                                    <div key={file.path} className="flex items-center justify-between text-xs group">
                                                        <button
                                                            onClick={() => loadFileDiff(file.path, false)}
                                                            className={`truncate flex-1 text-left hover:underline ${file.isUntracked ? 'text-gray-400' : 'text-yellow-300'}`}
                                                        >
                                                            {file.path}
                                                        </button>
                                                        <button onClick={() => gitStageFile(file.path)} className="text-green-400 hover:text-green-300 px-2 opacity-0 group-hover:opacity-100">Stage</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* File Diff Preview */}
                                    {gitSelectedFile && gitFileDiff && (
                                        <div className="theme-bg-secondary rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium theme-text-primary">{gitSelectedFile}</h3>
                                                <button onClick={() => { setGitSelectedFile(null); setGitFileDiff(null); }} className="text-xs theme-text-muted hover:theme-text-primary">Close</button>
                                            </div>
                                            <pre className="text-xs font-mono overflow-auto max-h-60 p-2 bg-black/30 rounded">
                                                {gitFileDiff.split('\n').map((line, i) => (
                                                    <div
                                                        key={i}
                                                        className={
                                                            line.startsWith('+') && !line.startsWith('+++') ? 'text-green-400 bg-green-900/20' :
                                                            line.startsWith('-') && !line.startsWith('---') ? 'text-red-400 bg-red-900/20' :
                                                            line.startsWith('@@') ? 'text-cyan-400' :
                                                            'theme-text-muted'
                                                        }
                                                    >
                                                        {line}
                                                    </div>
                                                ))}
                                            </pre>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            className="w-full theme-input text-sm rounded px-3 py-2"
                                            placeholder="Commit message..."
                                            value={gitCommitMessage}
                                            onChange={e => setGitCommitMessage(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                disabled={gitLoading || !gitCommitMessage.trim()}
                                                onClick={gitCommitChanges}
                                                className="theme-button-primary px-4 py-2 rounded text-sm flex-1 disabled:opacity-50"
                                            >
                                                Commit
                                            </button>
                                            <button disabled={gitLoading} onClick={gitPullChanges} className="theme-button px-4 py-2 rounded text-sm flex-1">
                                                Pull
                                            </button>
                                            <button disabled={gitLoading} onClick={gitPushChanges} className="theme-button px-4 py-2 rounded text-sm flex-1">
                                                Push
                                            </button>
                                            <button disabled={gitLoading} onClick={loadGitStatus} className="theme-button px-4 py-2 rounded text-sm">
                                                Refresh
                                            </button>
                                        </div>
                                        {gitError && <div className="text-red-500 text-xs">{gitError}</div>}
                                    </div>
                                </div>
                            ) : gitModalTab === 'diff' ? (
                                /* Diff Tab */
                                <div className="space-y-4">
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={loadGitDiff} className="theme-button px-3 py-1 rounded text-sm">Refresh Diff</button>
                                    </div>
                                    {gitDiffContent ? (
                                        <div className="space-y-4">
                                            {gitDiffContent.staged && (
                                                <div className="theme-bg-secondary rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-green-400 mb-2">Staged Changes</h3>
                                                    <pre className="text-xs font-mono overflow-auto max-h-64 p-2 bg-black/30 rounded whitespace-pre-wrap">
                                                        {gitDiffContent.staged.split('\n').map((line, i) => (
                                                            <div
                                                                key={i}
                                                                className={
                                                                    line.startsWith('+') && !line.startsWith('+++') ? 'text-green-400 bg-green-900/20' :
                                                                    line.startsWith('-') && !line.startsWith('---') ? 'text-red-400 bg-red-900/20' :
                                                                    line.startsWith('@@') ? 'text-cyan-400' :
                                                                    line.startsWith('diff ') ? 'text-purple-400 font-bold mt-2' :
                                                                    'theme-text-muted'
                                                                }
                                                            >
                                                                {line}
                                                            </div>
                                                        ))}
                                                    </pre>
                                                </div>
                                            )}
                                            {gitDiffContent.unstaged && (
                                                <div className="theme-bg-secondary rounded-lg p-3">
                                                    <h3 className="text-sm font-medium text-yellow-400 mb-2">Unstaged Changes</h3>
                                                    <pre className="text-xs font-mono overflow-auto max-h-64 p-2 bg-black/30 rounded whitespace-pre-wrap">
                                                        {gitDiffContent.unstaged.split('\n').map((line, i) => (
                                                            <div
                                                                key={i}
                                                                className={
                                                                    line.startsWith('+') && !line.startsWith('+++') ? 'text-green-400 bg-green-900/20' :
                                                                    line.startsWith('-') && !line.startsWith('---') ? 'text-red-400 bg-red-900/20' :
                                                                    line.startsWith('@@') ? 'text-cyan-400' :
                                                                    line.startsWith('diff ') ? 'text-purple-400 font-bold mt-2' :
                                                                    'theme-text-muted'
                                                                }
                                                            >
                                                                {line}
                                                            </div>
                                                        ))}
                                                    </pre>
                                                </div>
                                            )}
                                            {!gitDiffContent.staged && !gitDiffContent.unstaged && (
                                                <div className="text-center theme-text-muted py-8">No changes to display</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center theme-text-muted py-8">Loading diff...</div>
                                    )}
                                </div>
                            ) : gitModalTab === 'branches' ? (
                                /* Branches Tab */
                                <div className="space-y-4">
                                    {/* Create New Branch */}
                                    <div className="theme-bg-secondary rounded-lg p-3">
                                        <h3 className="text-sm font-medium theme-text-primary mb-2">Create New Branch</h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 theme-input text-sm rounded px-3 py-2"
                                                placeholder="Branch name..."
                                                value={gitNewBranchName}
                                                onChange={e => setGitNewBranchName(e.target.value)}
                                            />
                                            <button
                                                disabled={gitLoading || !gitNewBranchName.trim()}
                                                onClick={gitCreateBranch}
                                                className="theme-button-primary px-4 py-2 rounded text-sm disabled:opacity-50"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </div>

                                    {/* Branch List */}
                                    <div className="theme-bg-secondary rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-medium theme-text-primary">Branches</h3>
                                            <button onClick={loadGitBranches} className="text-xs theme-text-muted hover:theme-text-primary">Refresh</button>
                                        </div>
                                        {gitBranches?.branches ? (
                                            <div className="space-y-1 max-h-80 overflow-y-auto">
                                                {gitBranches.branches.map((branch: string) => (
                                                    <div
                                                        key={branch}
                                                        className={`flex items-center justify-between p-2 rounded text-sm ${
                                                            branch === gitBranches.current ? 'bg-purple-900/30 border border-purple-500/30' : 'hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {branch === gitBranches.current && (
                                                                <span className="text-purple-400">●</span>
                                                            )}
                                                            <span className={branch === gitBranches.current ? 'text-purple-400 font-medium' : 'theme-text-primary'}>
                                                                {branch}
                                                            </span>
                                                        </div>
                                                        {branch !== gitBranches.current && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => gitCheckoutBranch(branch)}
                                                                    disabled={gitLoading}
                                                                    className="text-xs text-blue-400 hover:text-blue-300"
                                                                >
                                                                    Checkout
                                                                </button>
                                                                <button
                                                                    onClick={() => gitDeleteBranch(branch)}
                                                                    disabled={gitLoading}
                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center theme-text-muted py-4">Loading branches...</div>
                                        )}
                                    </div>
                                    {gitError && <div className="text-red-500 text-xs">{gitError}</div>}
                                </div>
                            ) : gitModalTab === 'history' ? (
                                /* History Tab */
                                <div className="flex gap-4 h-full">
                                    {/* Commit List */}
                                    <div className="w-1/2 theme-bg-secondary rounded-lg p-3 flex flex-col">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-medium theme-text-primary">Commit History</h3>
                                            <button onClick={loadGitHistory} className="text-xs theme-text-muted hover:theme-text-primary">Refresh</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1">
                                            {gitCommitHistory.length > 0 ? gitCommitHistory.map((commit: any) => (
                                                <button
                                                    key={commit.hash}
                                                    onClick={() => loadCommitDetails(commit.hash)}
                                                    className={`w-full text-left p-2 rounded text-xs hover:bg-white/5 ${
                                                        gitSelectedCommit?.hash === commit.hash ? 'bg-purple-900/30 border border-purple-500/30' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-purple-400 font-mono">{commit.hash.slice(0, 7)}</span>
                                                        <span className="theme-text-muted">{new Date(commit.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="theme-text-primary truncate mt-1">{commit.message}</div>
                                                    <div className="theme-text-muted text-xs mt-1">{commit.author_name}</div>
                                                </button>
                                            )) : (
                                                <div className="text-center theme-text-muted py-4">Loading history...</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Commit Details */}
                                    <div className="w-1/2 theme-bg-secondary rounded-lg p-3 flex flex-col">
                                        <h3 className="text-sm font-medium theme-text-primary mb-2">Commit Details</h3>
                                        {gitSelectedCommit ? (
                                            <div className="flex-1 overflow-y-auto">
                                                <div className="space-y-2 text-xs mb-4">
                                                    <div><span className="theme-text-muted">Hash:</span> <span className="font-mono text-purple-400">{gitSelectedCommit.hash}</span></div>
                                                    <div><span className="theme-text-muted">Author:</span> <span className="theme-text-primary">{gitSelectedCommit.author_name} &lt;{gitSelectedCommit.author_email}&gt;</span></div>
                                                    <div><span className="theme-text-muted">Date:</span> <span className="theme-text-primary">{new Date(gitSelectedCommit.date).toLocaleString()}</span></div>
                                                    <div className="theme-text-primary whitespace-pre-wrap">{gitSelectedCommit.message}</div>
                                                </div>
                                                {gitSelectedCommit.diff && (
                                                    <pre className="text-xs font-mono overflow-auto max-h-64 p-2 bg-black/30 rounded whitespace-pre-wrap">
                                                        {gitSelectedCommit.diff.split('\n').map((line: string, i: number) => (
                                                            <div
                                                                key={i}
                                                                className={
                                                                    line.startsWith('+') && !line.startsWith('+++') ? 'text-green-400 bg-green-900/20' :
                                                                    line.startsWith('-') && !line.startsWith('---') ? 'text-red-400 bg-red-900/20' :
                                                                    line.startsWith('@@') ? 'text-cyan-400' :
                                                                    line.startsWith('diff ') ? 'text-purple-400 font-bold mt-2' :
                                                                    'theme-text-muted'
                                                                }
                                                            >
                                                                {line}
                                                            </div>
                                                        ))}
                                                    </pre>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center theme-text-muted py-8">Select a commit to view details</div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace Modal */}
            {workspaceModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setWorkspaceModalOpen(false)}>
                    <div className="w-full max-w-2xl max-h-[70vh] theme-bg-primary rounded-lg border theme-border flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b theme-border">
                            <div className="flex items-center gap-3">
                                <Folder size={20} className="text-blue-400" />
                                <h2 className="text-lg font-semibold theme-text-primary">Workspace</h2>
                            </div>
                            <button onClick={() => setWorkspaceModalOpen(false)} className="p-2 theme-hover rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="space-y-3">
                                <div className="theme-bg-secondary rounded-lg p-3">
                                    <div className="text-xs theme-text-muted mb-1">Current Path</div>
                                    <div className="text-sm theme-text-primary font-mono">{currentPath || 'Not set'}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="theme-bg-secondary rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold theme-text-primary">{Object.keys(contentDataRef.current).length}</div>
                                        <div className="text-xs theme-text-muted">Open Panes</div>
                                    </div>
                                    <div className="theme-bg-secondary rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold theme-text-primary">{directoryConversations.length}</div>
                                        <div className="text-xs theme-text-muted">Conversations</div>
                                    </div>
                                    <div className="theme-bg-secondary rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold theme-text-primary">{Object.keys(folderStructure || {}).length}</div>
                                        <div className="text-xs theme-text-muted">Files/Folders</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Results Modal */}
            {searchResultsModalOpen && (deepSearchResults.length > 0 || messageSearchResults.length > 0) && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSearchResultsModalOpen(false)}>
                    <div className="w-full max-w-4xl max-h-[80vh] theme-bg-primary rounded-lg border theme-border flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b theme-border">
                            <div className="flex items-center gap-3">
                                <Search size={20} className="text-blue-400" />
                                <h2 className="text-lg font-semibold theme-text-primary">Search Results</h2>
                                <span className="text-sm theme-text-muted">({deepSearchResults.length + messageSearchResults.length} results)</span>
                            </div>
                            <button onClick={() => setSearchResultsModalOpen(false)} className="p-2 theme-hover rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <div className="space-y-2">
                                {deepSearchResults.map((result: any, idx: number) => (
                                    <button
                                        key={`deep-${idx}`}
                                        onClick={() => {
                                            if (result.type === 'conversation') {
                                                handleConversationSelect(result.id);
                                            } else if (result.type === 'file') {
                                                handleFileClick(result.path);
                                            }
                                            setSearchResultsModalOpen(false);
                                        }}
                                        className="w-full text-left p-3 theme-bg-secondary rounded-lg theme-hover"
                                    >
                                        <div className="flex items-center gap-2">
                                            {result.type === 'conversation' ? <MessageSquare size={14} className="text-blue-400" /> : <FileIcon size={14} className="text-gray-400" />}
                                            <span className="text-sm theme-text-primary">{result.title || result.name || result.path}</span>
                                        </div>
                                        {result.snippet && <div className="text-xs theme-text-muted mt-1 truncate">{result.snippet}</div>}
                                    </button>
                                ))}
                                {messageSearchResults.map((result: any, idx: number) => (
                                    <button
                                        key={`msg-${idx}`}
                                        onClick={() => {
                                            handleConversationSelect(result.conversationId);
                                            setSearchResultsModalOpen(false);
                                        }}
                                        className="w-full text-left p-3 theme-bg-secondary rounded-lg theme-hover"
                                    >
                                        <div className="flex items-center gap-2">
                                            <MessageSquare size={14} className="text-green-400" />
                                            <span className="text-sm theme-text-primary">{result.content?.slice(0, 100)}...</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

        </>

    );
};




// Per-pane execution mode getter/setter
const getPaneExecutionMode = useCallback((paneId: string) => {
    return contentDataRef.current[paneId]?.executionMode || 'chat';
}, []);

const setPaneExecutionMode = useCallback(async (paneId: string, mode: string) => {
    if (!contentDataRef.current[paneId]) {
        contentDataRef.current[paneId] = { executionMode: mode, selectedJinx: null, showJinxDropdown: false };
    } else {
        contentDataRef.current[paneId].executionMode = mode;
    }

    // Load MCP servers when switching to tool_agent mode
    if (mode === 'tool_agent' && currentPath) {
        const res = await window.api.getMcpServers(currentPath);
        if (res && Array.isArray(res.servers)) {
            setAvailableMcpServers(res.servers);
            if (!res.servers.find(s => s.serverPath === mcpServerPath) && res.servers.length > 0) {
                setMcpServerPath(res.servers[0].serverPath);
            }
        }
    }

    // Trigger re-render
    setRootLayoutNode(prev => ({ ...prev }));
}, [currentPath, mcpServerPath]);

const getPaneSelectedJinx = useCallback((paneId: string) => {
    return contentDataRef.current[paneId]?.selectedJinx || null;
}, []);

const setPaneSelectedJinx = useCallback((paneId: string, jinx: any) => {
    if (!contentDataRef.current[paneId]) {
        contentDataRef.current[paneId] = { executionMode: 'chat', selectedJinx: jinx, showJinxDropdown: false };
    } else {
        contentDataRef.current[paneId].selectedJinx = jinx;
    }
    // Trigger re-render
    setRootLayoutNode(prev => ({ ...prev }));
}, []);

// Per-pane dropdown state
const getPaneShowJinxDropdown = useCallback((paneId: string) => {
    return contentDataRef.current[paneId]?.showJinxDropdown || false;
}, []);

const setPaneShowJinxDropdown = useCallback((paneId: string, show: boolean) => {
    if (!contentDataRef.current[paneId]) {
        contentDataRef.current[paneId] = { executionMode: 'chat', selectedJinx: null, showJinxDropdown: show };
    } else {
        contentDataRef.current[paneId].showJinxDropdown = show;
    }
    // Trigger re-render
    setRootLayoutNode(prev => ({ ...prev }));
}, []);

// Build chatInputProps function that returns props for a specific pane
const getChatInputProps = useCallback((paneId: string) => ({
    input, setInput, inputHeight, setInputHeight,
    isInputMinimized, setIsInputMinimized, isInputExpanded, setIsInputExpanded,
    isResizingInput, setIsResizingInput,
    isStreaming, handleInputSubmit, handleInterruptStream,
    uploadedFiles, setUploadedFiles, contextFiles, setContextFiles,
    contextFilesCollapsed, setContextFilesCollapsed, currentPath,
    // Per-pane execution mode
    executionMode: getPaneExecutionMode(paneId),
    setExecutionMode: (mode: string) => setPaneExecutionMode(paneId, mode),
    selectedJinx: getPaneSelectedJinx(paneId),
    setSelectedJinx: (jinx: any) => setPaneSelectedJinx(paneId, jinx),
    jinxInputValues, setJinxInputValues, jinxsToDisplay,
    // Per-pane dropdown state
    showJinxDropdown: getPaneShowJinxDropdown(paneId),
    setShowJinxDropdown: (show: boolean) => setPaneShowJinxDropdown(paneId, show),
    availableModels, modelsLoading, modelsError, currentModel, setCurrentModel,
    currentProvider, setCurrentProvider, favoriteModels, toggleFavoriteModel,
    showAllModels, setShowAllModels, modelsToDisplay, ollamaToolModels, setError,
    availableNPCs, npcsLoading, npcsError, currentNPC, setCurrentNPC,
    availableMcpServers, mcpServerPath, setMcpServerPath,
    selectedMcpTools, setSelectedMcpTools, availableMcpTools, setAvailableMcpTools,
    mcpToolsLoading, setMcpToolsLoading, mcpToolsError, setMcpToolsError,
    showMcpServersDropdown, setShowMcpServersDropdown,
    activeConversationId,
}), [
    input, inputHeight, isInputMinimized, isInputExpanded, isResizingInput,
    isStreaming, handleInputSubmit, handleInterruptStream,
    uploadedFiles, contextFiles, contextFilesCollapsed, currentPath,
    getPaneExecutionMode, setPaneExecutionMode, getPaneSelectedJinx, setPaneSelectedJinx,
    getPaneShowJinxDropdown, setPaneShowJinxDropdown,
    jinxInputValues, jinxsToDisplay,
    availableModels, modelsLoading, modelsError, currentModel, currentProvider,
    favoriteModels, showAllModels, modelsToDisplay, ollamaToolModels,
    availableNPCs, npcsLoading, npcsError, currentNPC,
    availableMcpServers, mcpServerPath, selectedMcpTools, availableMcpTools,
    mcpToolsLoading, mcpToolsError, showMcpServersDropdown, activeConversationId,
]);

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
    renderMindMapViewer,
    renderZipViewer,
    renderDataLabelerPane,
    renderGraphViewerPane,
    renderBrowserGraphPane,
    renderDataDashPane,
    renderDBToolPane,
    renderNPCTeamPane,
    renderJinxPane,
    renderTeamManagementPane,
    renderSettingsPane,
    renderPhotoViewerPane,
    renderLibraryViewerPane,
    renderFolderViewerPane,
    renderProjectEnvPane,
    renderDiskUsagePane,
    setPaneContextMenu,
    // Chat-specific props:
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
    // ChatInput props function for rendering input in chat panes (takes paneId)
    getChatInputProps,
    // Zen mode props
    zenModePaneId,
    toggleZenMode: (paneId: string) => {
        setZenModePaneId(prev => prev === paneId ? null : paneId);
    },
    // Renaming props
    renamingPaneId,
    setRenamingPaneId,
    editedFileName,
    setEditedFileName,
    handleConfirmRename,
    // Script running
    onRunScript: handleRunScript,
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
    renderMindMapViewer,
    renderZipViewer,
    renderDataLabelerPane,
    renderGraphViewerPane,
    renderBrowserGraphPane,
    renderDataDashPane,
    renderDBToolPane,
    renderNPCTeamPane,
    renderJinxPane,
    renderTeamManagementPane,
    renderSettingsPane,
    renderPhotoViewerPane,
    renderLibraryViewerPane,
    renderFolderViewerPane,
    renderProjectEnvPane,
    renderDiskUsagePane,
    setActiveContentPaneId, setDraggedItem, setDropTarget,
    setPaneContextMenu,
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
    getChatInputProps,
    zenModePaneId,
    renamingPaneId, editedFileName, handleConfirmRename,
    handleRunScript,
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
    else if (extension === 'mindmap') contentType = 'mindmap';
    else if (extension === 'zip') contentType = 'zip';
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

    const handleNewChat = () => {
        createNewConversation();
        setPaneContextMenu(null);
    };

    const handleNewTerminal = (shellType: 'system' | 'npcsh' | 'guac' = 'system') => {
        createNewTerminal(shellType);
        setPaneContextMenu(null);
    };

    const handleNewBrowser = () => {
        setBrowserUrlDialogOpen(true);
        setPaneContextMenu(null);
    };

    const handleNewFolder = () => {
        handleCreateNewFolder();
        setPaneContextMenu(null);
    };

    const handleNewTextFile = () => {
        createNewTextFile();
        setPaneContextMenu(null);
    };

    const handleNewLibrary = () => {
        createLibraryViewerPane();
        setPaneContextMenu(null);
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setPaneContextMenu(null)} />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm min-w-[160px]"
                style={{ top: y, left: x }}
            >
                {/* Close Pane at top */}
                <button onClick={closePane} className="block px-4 py-2 w-full text-left theme-hover text-red-400">
                    Close Pane
                </button>

                <div className="border-t theme-border my-1" />

                {/* Create New Section */}
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Create New</div>
                <button onClick={handleNewChat} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                    <MessageSquare size={14} className="text-blue-400" /> Chat
                </button>
                {/* Terminal submenu */}
                <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover justify-between">
                        <span className="flex items-center gap-2">
                            <Terminal size={14} className="text-green-400" /> Terminal
                        </span>
                        <ChevronRight size={14} className="opacity-50" />
                    </button>
                    <div className="absolute left-full top-0 ml-1 theme-bg-secondary theme-border border rounded shadow-lg py-1 min-w-[140px] hidden group-hover:block">
                        <button onClick={() => handleNewTerminal('system')} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                            <Terminal size={14} className="text-gray-400" /> Shell
                        </button>
                        <button onClick={() => handleNewTerminal('npcsh')} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                            <Sparkles size={14} className="text-purple-400" /> npcsh
                        </button>
                        <button onClick={() => handleNewTerminal('guac')} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                            <Code size={14} className="text-yellow-400" /> guac
                        </button>
                    </div>
                </div>
                <button onClick={handleNewBrowser} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                    <Globe size={14} className="text-cyan-400" /> Browser
                </button>
                <button onClick={handleNewLibrary} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                    <BookOpen size={14} className="text-red-400" /> Library
                </button>
                <button onClick={handleNewFolder} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                    <Folder size={14} className="text-yellow-400" /> Folder
                </button>
                <button onClick={handleNewTextFile} className="flex items-center gap-2 px-4 py-2 w-full text-left theme-hover">
                    <Code2 size={14} className="text-purple-400" /> Text File
                </button>

                <div className="border-t theme-border my-1" />

                {/* Split Section */}
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Split Pane</div>
                <button onClick={() => splitPane('left')} className="block px-4 py-2 w-full text-left theme-hover">
                    ← Split Left
                </button>
                <button onClick={() => splitPane('right')} className="block px-4 py-2 w-full text-left theme-hover">
                    → Split Right
                </button>
                <button onClick={() => splitPane('top')} className="block px-4 py-2 w-full text-left theme-hover">
                    ↑ Split Top
                </button>
                <button onClick={() => splitPane('bottom')} className="block px-4 py-2 w-full text-left theme-hover">
                    ↓ Split Bottom
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

    const { x, y, selectedText, linkURL, srcURL, pageURL, isEditable, mediaType, canCopy, canSaveImage, canSaveLink } = browserContextMenuPos;

    const closeMenu = () => setBrowserContextMenuPos(null);

    const handleCopy = () => {
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
        }
        closeMenu();
    };

    const handleCopyLink = () => {
        if (linkURL) {
            navigator.clipboard.writeText(linkURL);
        }
        closeMenu();
    };

    const handleOpenLinkInNewPane = () => {
        if (linkURL) {
            createNewBrowser(linkURL);
        }
        closeMenu();
    };

    const handleOpenLinkExternal = async () => {
        if (linkURL) {
            await (window as any).api?.browserOpenExternal?.(linkURL);
        }
        closeMenu();
    };

    const handleSaveImage = async () => {
        if (srcURL) {
            await (window as any).api?.browserSaveImage?.(srcURL, currentPath);
        }
        closeMenu();
    };

    const handleSaveLinkAs = async () => {
        if (linkURL) {
            await (window as any).api?.browserSaveLink?.(linkURL, undefined, currentPath);
        }
        closeMenu();
    };

    const handleCopyImageAddress = () => {
        if (srcURL) {
            navigator.clipboard.writeText(srcURL);
        }
        closeMenu();
    };

    const handleSendToChat = () => {
        if (selectedText) {
            const citation = `[From ${pageURL || 'webpage'}]\n\n> ${selectedText}`;
            setInput(prev => `${prev}${prev ? '\n\n' : ''}${citation}`);
        }
        closeMenu();
    };

    const handleStartNewConvo = async () => {
        if (selectedText) {
            // Create a new conversation with the selected text
            await createNewConversation();
            // Wait a bit for the conversation to be created, then set the input
            setTimeout(() => {
                const citation = `[From ${pageURL || 'webpage'}]\n\n> ${selectedText}`;
                setInput(citation);
            }, 200);
        }
        closeMenu();
    };

    const handleSummarize = () => {
        if (selectedText) {
            const prompt = `Please summarize the following text:\n\n---\n${selectedText}\n---`;
            setInput(prompt);
        }
        closeMenu();
    };

    const handleExplain = () => {
        if (selectedText) {
            const prompt = `Please explain this text in simple terms:\n\n---\n${selectedText}\n---`;
            setInput(prompt);
        }
        closeMenu();
    };

    const handleTranslate = () => {
        if (selectedText) {
            const prompt = `Please translate this text to English:\n\n---\n${selectedText}\n---`;
            setInput(prompt);
        }
        closeMenu();
    };

    const handleSelectAll = () => {
        // This would require sending a command to the webview - for now just close
        closeMenu();
    };

    // Calculate position to keep menu within viewport
    const menuWidth = 220;
    const menuHeight = 400; // Approximate max height
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

    return (
        <>
            {/* Backdrop to close menu */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={closeMenu}
                onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
                tabIndex={-1}
            />

            {/* Context Menu */}
            <div
                className="fixed z-[9999] theme-bg-secondary border theme-border rounded-lg shadow-xl py-1 min-w-[200px]"
                style={{
                    left: Math.max(10, adjustedX),
                    top: Math.max(10, adjustedY),
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }}
            >
                {/* Browser Actions Section */}
                {(canCopy || linkURL) && (
                    <>
                        <div className="px-3 py-1 text-xs theme-text-muted font-medium uppercase tracking-wide">
                            Browser
                        </div>

                        {canCopy && (
                            <button
                                onClick={handleCopy}
                                className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copy
                            </button>
                        )}

                        {linkURL && (
                            <>
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Copy Link Address
                                </button>
                                <button
                                    onClick={handleOpenLinkInNewPane}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open Link in New Pane
                                </button>
                                <button
                                    onClick={handleSaveLinkAs}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Save Link As...
                                </button>
                                <button
                                    onClick={handleOpenLinkExternal}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open in Default Browser
                                </button>
                            </>
                        )}

                        {canSaveImage && srcURL && (
                            <>
                                <button
                                    onClick={handleSaveImage}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Save Image As...
                                </button>
                                <button
                                    onClick={handleCopyImageAddress}
                                    className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Copy Image Address
                                </button>
                            </>
                        )}

                        <div className="border-t theme-border my-1" />
                    </>
                )}

                {/* NPC Studio Actions Section */}
                {selectedText && (
                    <>
                        <div className="px-3 py-1 text-xs theme-text-muted font-medium uppercase tracking-wide">
                            NPC Studio
                        </div>

                        <button
                            onClick={handleSendToChat}
                            className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Send to Chat
                        </button>

                        <button
                            onClick={handleStartNewConvo}
                            className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Start New Conversation
                        </button>

                        <div className="border-t theme-border my-1" />

                        <div className="px-3 py-1 text-xs theme-text-muted font-medium uppercase tracking-wide">
                            AI Actions
                        </div>

                        <button
                            onClick={handleSummarize}
                            className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Summarize
                        </button>

                        <button
                            onClick={handleExplain}
                            className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            Explain
                        </button>

                        <button
                            onClick={handleTranslate}
                            className="w-full px-3 py-2 text-left text-sm theme-text-primary theme-hover flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            Translate
                        </button>
                    </>
                )}

                {/* If no text selected and no link, show minimal menu */}
                {!selectedText && !linkURL && (
                    <div className="px-3 py-2 text-sm theme-text-muted italic">
                        Select text for more options
                    </div>
                )}
            </div>
        </>
    );
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

    // Top bar component - always visible
    const topBar = (
        <div className="flex-shrink-0 h-8 px-2 flex items-center gap-3 text-[11px] theme-bg-secondary border-b theme-border">
            {/* Full Path selector - left */}
            <div className="flex items-center gap-1 min-w-[200px] max-w-[300px]">
                <button
                    onClick={() => goUpDirectory(currentPath, baseDir, switchToPath, setError)}
                    className="p-1 theme-hover rounded transition-all flex-shrink-0"
                    title="Go Up"
                    aria-label="Go Up Directory"
                >
                    <ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "theme-text-secondary"}/>
                </button>
                {isEditingPath ? (
                    <input
                        type="text"
                        value={editedPath}
                        onChange={(e) => setEditedPath(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsEditingPath(false);
                                switchToPath(editedPath);
                            } else if (e.key === 'Escape') {
                                setIsEditingPath(false);
                            }
                        }}
                        onBlur={() => setIsEditingPath(false)}
                        autoFocus
                        className="text-xs theme-text-muted theme-input border rounded px-2 py-0.5 flex-1 min-w-0"
                    />
                ) : (
                    <div
                        onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }}
                        className="text-xs theme-text-muted overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer theme-hover px-2 py-0.5 rounded flex-1 min-w-0"
                        title={currentPath}
                    >
                        {currentPath || '...'}
                    </div>
                )}
            </div>

            <div className="flex-1" />

            {/* Search - center */}
            <div className="flex items-center gap-2 max-w-md w-full">
                <Search size={14} className="theme-text-muted flex-shrink-0" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!e.target.value.trim()) {
                            setIsSearching(false);
                            setDeepSearchResults([]);
                            setMessageSearchResults([]);
                            setSearchResultsModalOpen(false);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchTerm.trim()) {
                            e.preventDefault();
                            setSearchResultsModalOpen(true);
                        }
                    }}
                    placeholder={isGlobalSearch ? "Global search (Ctrl+Shift+F)..." : "Search (Ctrl+F)..."}
                    className="flex-1 bg-transparent theme-text-primary text-xs focus:outline-none"
                />
                {(deepSearchResults.length > 0 || messageSearchResults.length > 0) && (
                    <button
                        onClick={() => setSearchResultsModalOpen(true)}
                        className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded"
                    >
                        {deepSearchResults.length + messageSearchResults.length} results
                    </button>
                )}
                {searchTerm && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setIsSearching(false);
                            setDeepSearchResults([]);
                            setMessageSearchResults([]);
                            setSearchResultsModalOpen(false);
                        }}
                        className="p-1 theme-hover rounded"
                    >
                        <X size={12} className="theme-text-muted" />
                    </button>
                )}
            </div>

            <div className="flex-1" />

            {/* DateTime - right */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowDateTime(!showDateTime)}
                    className="p-1 theme-hover rounded theme-text-muted"
                    title={showDateTime ? "Hide date/time" : "Show date/time"}
                >
                    <Clock size={14} />
                </button>
                {showDateTime && (
                    <span className="theme-text-muted tabular-nums text-[10px]">
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </div>
    );

    if (!rootLayoutNode) {
        return (
            <main className={`flex-1 flex flex-col bg-gray-900 ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}>
                {topBar}
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
                            else if (extension === 'mindmap') contentType = 'mindmap';
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
            </main>
        );
    }

    // Pane items for dock
    const paneItems = Object.entries(contentDataRef.current).map(([paneId, data]: [string, any]) => ({
        id: paneId,
        type: data?.contentType || 'empty',
        title: data?.contentType === 'chat'
            ? `Chat ${data?.contentId?.slice(-6) || ''}`
            : data?.contentType === 'editor'
                ? data?.contentId?.split('/').pop() || 'File'
                : data?.contentType || 'Pane',
        isActive: paneId === activeContentPaneId
    }));

    // Get git branch from gitStatus
    const gitBranch = gitStatus?.branch || null;

    return (
        <main className={`flex-1 flex flex-col bg-gray-900 ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}>
            {topBar}
            <div className="flex-1 flex overflow-hidden">
                {rootLayoutNode ? (
                    <LayoutNode node={rootLayoutNode} path={[]} component={layoutComponentApi} />
                ) : (
                    <div className="flex-1 flex items-center justify-center theme-text-muted">
                        {loading ? "Loading..." : "Drag a conversation or file to start."}
                    </div>
                )}
            </div>
            <StatusBar
                gitBranch={gitBranch}
                gitStatus={gitStatus}
                setGitModalOpen={setGitModalOpen}
                directoryConversations={directoryConversations}
                setWorkspaceModalOpen={setWorkspaceModalOpen}
                paneItems={paneItems}
                setActiveContentPaneId={setActiveContentPaneId}
                autoScrollEnabled={autoScrollEnabled}
                setAutoScrollEnabled={setAutoScrollEnabled}
                isPredictiveTextEnabled={isPredictiveTextEnabled}
                setIsPredictiveTextEnabled={setIsPredictiveTextEnabled}
            />
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
        setProjectEnvEditorOpen={setProjectEnvEditorOpen}
        setBrowserUrlDialogOpen={setBrowserUrlDialogOpen}
        setPhotoViewerOpen={setPhotoViewerOpen}
        setDashboardMenuOpen={setDashboardMenuOpen}
        setJinxMenuOpen={setJinxMenuOpen}
        setCtxEditorOpen={setCtxEditorOpen}
        setTeamManagementOpen={setTeamManagementOpen}
        setNpcTeamMenuOpen={setNpcTeamMenuOpen}
        setSidebarCollapsed={setSidebarCollapsed}
        createGraphViewerPane={createGraphViewerPane}
        createBrowserGraphPane={createBrowserGraphPane}
        createDataLabelerPane={createDataLabelerPane}
        createDataDashPane={createDataDashPane}
        createDBToolPane={createDBToolPane}
        createNPCTeamPane={createNPCTeamPane}
        createJinxPane={createJinxPane}
        createTeamManagementPane={createTeamManagementPane}
        createSettingsPane={createSettingsPane}
        createPhotoViewerPane={createPhotoViewerPane}
        createProjectEnvPane={createProjectEnvPane}
        createDiskUsagePane={createDiskUsagePane}
        createLibraryViewerPane={createLibraryViewerPane}
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

            {/* Zen Mode Overlay */}
            {zenModePaneId && contentDataRef.current[zenModePaneId] && (
                <div className="fixed inset-0 z-[200] bg-gray-900 flex flex-col">
                    {/* Zen mode header with minimize/close */}
                    <div className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Zen Mode</span>
                            <span className="text-gray-500">-</span>
                            <span>{contentDataRef.current[zenModePaneId]?.contentId?.split('/').pop() || 'Focused View'}</span>
                        </div>
                        <button
                            onClick={() => setZenModePaneId(null)}
                            className="p-1 theme-hover rounded-full flex-shrink-0 transition-all hover:bg-blue-500/20"
                            title="Exit zen mode (Esc)"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {/* Zen mode content */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {(() => {
                            const paneData = contentDataRef.current[zenModePaneId];
                            const contentType = paneData?.contentType;
                            switch (contentType) {
                                case 'chat':
                                    const zenChatInputProps = getChatInputProps(zenModePaneId);
                                    return (
                                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                            <div className="flex-1 min-h-0 overflow-y-auto">
                                                {renderChatView({ nodeId: zenModePaneId })}
                                            </div>
                                            {zenChatInputProps && (
                                                <ChatInput
                                                    {...zenChatInputProps}
                                                    paneId={zenModePaneId}
                                                    onFocus={() => setActiveContentPaneId(zenModePaneId)}
                                                />
                                            )}
                                        </div>
                                    );
                                case 'editor':
                                    return renderFileEditor({ nodeId: zenModePaneId });
                                case 'terminal':
                                    return renderTerminalView({ nodeId: zenModePaneId });
                                case 'pdf':
                                    return renderPdfViewer({ nodeId: zenModePaneId });
                                case 'csv':
                                    return renderCsvViewer({ nodeId: zenModePaneId });
                                case 'docx':
                                    return renderDocxViewer({ nodeId: zenModePaneId });
                                case 'browser':
                                    return renderBrowserViewer({ nodeId: zenModePaneId });
                                case 'pptx':
                                    return renderPptxViewer({ nodeId: zenModePaneId });
                                case 'latex':
                                    return renderLatexViewer({ nodeId: zenModePaneId });
                                case 'image':
                                    return renderPicViewer({ nodeId: zenModePaneId });
                                case 'mindmap':
                                    return renderMindMapViewer({ nodeId: zenModePaneId });
                                case 'data-labeler':
                                    return renderDataLabelerPane({ nodeId: zenModePaneId });
                                case 'graph-viewer':
                                    return renderGraphViewerPane({ nodeId: zenModePaneId });
                                case 'datadash':
                                    return renderDataDashPane({ nodeId: zenModePaneId });
                                case 'photoviewer':
                                    return renderPhotoViewerPane({ nodeId: zenModePaneId });
                                case 'library':
                                    return renderLibraryViewerPane({ nodeId: zenModePaneId });
                                case 'projectenv':
                                    return renderProjectEnvPane({ nodeId: zenModePaneId });
                                case 'diskusage':
                                    return renderDiskUsagePane({ nodeId: zenModePaneId });
                                default:
                                    return <div className="flex-1 flex items-center justify-center theme-text-muted">Unknown content type</div>;
                            }
                        })()}
                    </div>
                </div>
            )}

        <BranchingUI
            showBranchingUI={showBranchingUI}
            setShowBranchingUI={setShowBranchingUI}
            conversationBranches={conversationBranches}
            currentBranchId={currentBranchId}
            setCurrentBranchId={setCurrentBranchId}
            setConversationBranches={setConversationBranches}
            activeContentPaneId={activeContentPaneId}
            contentDataRef={contentDataRef}
            setRootLayoutNode={setRootLayoutNode}
        />

        </div>
    );
};

export default ChatInterface;
