// src/renderer/components/ChatInterface.jsx
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File, Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, 
    Send, BarChart3, Minimize2, Maximize2, MessageCircle, BrainCircuit, Star, Origami,
} from 'lucide-react';

// Modals (existing components)
import MacroInput from './MacroInput';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import JinxMenu from './JinxMenu';
import CtxEditor from './CtxEditor';
import DataDash from './DataDash';
import BrowserUrlDialog from './BrowserUrlDialog';

// New organized components
import Sidebar from './sidebar/Sidebar';
import LayoutNode from './layout/LayoutNode';
import InputArea from './chat/InputArea';
import AIEditModal from './modals/AIEditModal';
import MemoryApprovalModal from './modals/MemoryApprovalModal';
import PromptModal from './modals/PromptModal';
import ResendModal from './modals/ResendModal';

// Utils
import { generateId, normalizePath, LAST_ACTIVE_PATH_KEY, LAST_ACTIVE_CONVO_ID_KEY } from '../utils/constants';

// Hooks
import useWorkspace from '../hooks/useWorkspace';
import useConversations from '../hooks/useConversations';
import useStreaming from '../hooks/useStreaming';
import useFileSystem from '../hooks/useFileSystem';
import useLayout from '../hooks/useLayout';

import '../../index.css';

const ChatInterface = () => {
    // Window management
    const [windowId] = useState(() => `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    // Core state
    const [currentPath, setCurrentPath] = useState('');
    const [baseDir, setBaseDir] = useState('');
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    
    // UI state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    
    // Modal state
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images');
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [jinxMenuOpen, setJinxMenuOpen] = useState(false);
    const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
    const [ctxEditorOpen, setCtxEditorOpen] = useState(false);
    const [browserUrlDialogOpen, setBrowserUrlDialogOpen] = useState(false);
    const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
    
    // Modal data state
    const [promptModal, setPromptModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        defaultValue: '', 
        onConfirm: null 
    });
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
        customEditPrompt: '',
        workspaceContexts: [],
        proposedChanges: []
    });
    const [resendModal, setResendModal] = useState({
        isOpen: false,
        message: null,
        selectedModel: '',
        selectedNPC: ''
    });
    const [memoryApprovalModal, setMemoryApprovalModal] = useState({
        isOpen: false,
        memories: []
    });
    const [pendingMemories, setPendingMemories] = useState([]);
    
    // Context menus
    const [contextMenuPos, setContextMenuPos] = useState(null);
    const [fileContextMenuPos, setFileContextMenuPos] = useState(null);
    const [messageContextMenuPos, setMessageContextMenuPos] = useState(null);
    const [editorContextMenuPos, setEditorContextMenuPos] = useState(null);
    const [pdfContextMenuPos, setPdfContextMenuPos] = useState(null);
    const [browserContextMenu, setBrowserContextMenu] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        selectedText: '',
        viewId: null,
    });
    const [sidebarItemContextMenuPos, setSidebarItemContextMenuPos] = useState(null);
    
    // Selection state
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [lastClickedFileIndex, setLastClickedFileIndex] = useState(null);
    const [messageSelectionMode, setMessageSelectionMode] = useState(false);
    
    // File/folder state
    const [folderStructure, setFolderStructure] = useState({});
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [filesCollapsed, setFilesCollapsed] = useState(true);
    const [conversationsCollapsed, setConversationsCollapsed] = useState(true);
    
    // Conversations
    const [directoryConversations, setDirectoryConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const activeConversationRef = useRef(null);
    const directoryConversationsRef = useRef(directoryConversations);
    
    // Models and NPCs
    const [availableModels, setAvailableModels] = useState([]);
    const [availableNPCs, setAvailableNPCs] = useState([]);
    const [currentModel, setCurrentModel] = useState(null);
    const [currentProvider, setCurrentProvider] = useState(null);
    const [currentNPC, setCurrentNPC] = useState(null);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState(null);
    const [npcsLoading, setNpcsLoading] = useState(false);
    const [npcsError, setNpcsError] = useState(null);
    const [favoriteModels, setFavoriteModels] = useState(new Set());
    const [showAllModels, setShowAllModels] = useState(false);
    
    // Input state
    const [input, setInput] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [executionMode, setExecutionMode] = useState('chat');
    const [selectedTools, setSelectedTools] = useState([]);
    const [mcpServerPath, setMcpServerPath] = useState('~/.npcsh/mcp_server.py');
    
    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const streamIdRef = useRef(null);
    const streamToPaneRef = useRef({});
    const listenersAttached = useRef(false);
    
    // Layout state
    const [rootLayoutNode, setRootLayoutNode] = useState(null);
    const [activeContentPaneId, setActiveContentPaneId] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
    const contentDataRef = useRef({});
    const rootLayoutNodeRef = useRef(rootLayoutNode);
    
    // File editing state
    const [currentFile, setCurrentFile] = useState(null);
    const [renamingPaneId, setRenamingPaneId] = useState(null);
    const [editedFileName, setEditedFileName] = useState('');
    const [renamingPath, setRenamingPath] = useState(null);
    const [editedSidebarItemName, setEditedSidebarItemName] = useState('');
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isGlobalSearch, setIsGlobalSearch] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [deepSearchResults, setDeepSearchResults] = useState([]);
    const [messageSearchResults, setMessageSearchResults] = useState([]);
    const [activeSearchResult, setActiveSearchResult] = useState(null);
    const searchInputRef = useRef(null);
    const [localSearch, setLocalSearch] = useState({
        isActive: false,
        term: '',
        paneId: null,
        results: [],
        currentIndex: -1
    });
    
    // Workspace state
    const [workspaces, setWorkspaces] = useState(new Map());
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
    const [workspaceIndicatorExpanded, setWorkspaceIndicatorExpanded] = useState(false);
    const [activeWindowsExpanded, setActiveWindowsExpanded] = useState(false);
    const [contextHash, setContextHash] = useState('');
    
    // PDF state
    const [selectedPdfText, setSelectedPdfText] = useState(null);
    const [pdfHighlights, setPdfHighlights] = useState([]);
    
    // Other state
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [lastActiveChatPaneId, setLastActiveChatPaneId] = useState(null);
    const [analysisContext, setAnalysisContext] = useState(null);
    const initialLoadComplete = useRef(false);
    const fileInputRef = useRef(null);
    
    // Path editing
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    
    // Refs
    const chatContainerRef = useRef(null);

    // Keep rootLayoutNodeRef in sync
    useEffect(() => {
        rootLayoutNodeRef.current = rootLayoutNode;
    }, [rootLayoutNode]);

    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        directoryConversationsRef.current = directoryConversations;
    }, [directoryConversations]);

    // Dark mode
    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    // Initialize app
    useEffect(() => {
        const initApp = async () => {
            setLoading(true);
            try {
                const loadedConfig = await window.api.getDefaultConfig();
                if (!loadedConfig || !loadedConfig.baseDir) {
                    throw new Error('Invalid config');
                }
                setConfig(loadedConfig);
                setBaseDir(loadedConfig.baseDir);
                
                // Set initial path
                const storedPath = localStorage.getItem(LAST_ACTIVE_PATH_KEY);
                const initialPath = storedPath || loadedConfig.default_folder || loadedConfig.baseDir;
                setCurrentPath(initialPath);
                
                setLoading(false);
            } catch (err) {
                console.error('Init error:', err);
                setError(err.message);
                setLoading(false);
            }
        };
        
        initApp();
    }, []);

    // Layout component API for LayoutNode
    const layoutComponentApi = useMemo(() => ({
        rootLayoutNode,
        setRootLayoutNode,
        findNodeByPath: () => null, // TODO: implement
        findNodePath: () => null, // TODO: implement
        activeContentPaneId,
        setActiveContentPaneId,
        draggedItem,
        setDraggedItem,
        dropTarget,
        setDropTarget,
        contentDataRef,
        updateContentPane: () => {}, // TODO: implement
        performSplit: () => {}, // TODO: implement
        closeContentPane: () => {}, // TODO: implement
        moveContentPane: () => {}, // TODO: implement
        createAndAddPaneNodeToLayout: () => {}, // TODO: implement
        renderChatView: () => <div>Chat View</div>, // TODO: implement
        renderFileEditor: () => <div>File Editor</div>, // TODO: implement
        renderTerminalView: () => <div>Terminal View</div>, // TODO: implement
        renderPdfViewer: () => <div>PDF Viewer</div>, // TODO: implement
        renderBrowserViewer: () => <div>Browser Viewer</div>, // TODO: implement
    }), [
        rootLayoutNode,
        activeContentPaneId,
        draggedItem,
        dropTarget,
    ]);

    // Sidebar props
    const sidebarProps = {
        collapsed: sidebarCollapsed,
        setCollapsed: setSidebarCollapsed,
        currentPath,
        setCurrentPath,
        baseDir,
        isEditingPath,
        setIsEditingPath,
        editedPath,
        setEditedPath,
        searchTerm,
        setSearchTerm,
        isSearching,
        isGlobalSearch,
        setIsGlobalSearch,
        searchInputRef,
        folderStructure,
        expandedFolders,
        setExpandedFolders,
        filesCollapsed,
        setFilesCollapsed,
        conversationsCollapsed,
        setConversationsCollapsed,
        directoryConversations,
        selectedConvos,
        setSelectedConvos,
        selectedFiles,
        setSelectedFiles,
        activeConversationId,
        currentFile,
        loading,
        onSettingsClick: () => setSettingsOpen(true),
        onNewConversation: () => console.log('New conversation'),
        onNewFolder: () => console.log('New folder'),
        onNewBrowser: () => setBrowserUrlDialogOpen(true),
        onNewTextFile: () => console.log('New text file'),
        onNewTerminal: () => console.log('New terminal'),
        onThemeToggle: toggleTheme,
        isDarkMode,
        onPhotoViewerClick: () => setPhotoViewerOpen(true),
        onDashboardClick: () => setDashboardMenuOpen(true),
        onJinxMenuClick: () => setJinxMenuOpen(true),
        onCtxEditorClick: () => setCtxEditorOpen(true),
        onNpcTeamMenuClick: () => setNpcTeamMenuOpen(true),
    };
    const inputAreaProps = {
        input,
        setInput,
        uploadedFiles,
        setUploadedFiles,
        isStreaming,
        activeConversationId,
        executionMode,
        setExecutionMode,
        currentModel,
        setCurrentModel,
        currentProvider,
        setCurrentProvider,
        currentNPC,
        setCurrentNPC,
        availableModels,
        availableNPCs,
        modelsLoading,
        modelsError,
        npcsLoading,
        npcsError,
        favoriteModels,
        setFavoriteModels,
        showAllModels,
        setShowAllModels,
        selectedTools,
        setSelectedTools,
        mcpServerPath,
        setMcpServerPath,
        isInputExpanded,
        setIsInputExpanded,
        onSubmit: (e) => console.log('Submit input'), // TODO: implement
        onInterrupt: () => console.log('Interrupt'), // TODO: implement
        onAttachFile: () => console.log('Attach file'), // TODO: implement
        isHovering,
        setIsHovering,
    };

    // Render main layout
    const renderMainContent = () => {
        if (!rootLayoutNode) {
            return (
                <div 
                    className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-400 m-4"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Drop on empty workspace'); // TODO: implement
                    }}
                >
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
                    <LayoutNode 
                        node={rootLayoutNode} 
                        path={[]} 
                        component={layoutComponentApi} 
                    />
                </div>
                <div className="flex-shrink-0">
                    <InputArea {...inputAreaProps} />
                </div>
            </main>
        );
    };

    // Render all modals
    const renderModals = () => (
        <>
            <SettingsMenu 
                isOpen={settingsOpen} 
                onClose={() => setSettingsOpen(false)} 
                currentPath={currentPath} 
                onPathChange={setCurrentPath}
            />
            
            <NPCTeamMenu 
                isOpen={npcTeamMenuOpen} 
                onClose={() => setNpcTeamMenuOpen(false)} 
                currentPath={currentPath} 
                startNewConversation={(npc) => console.log('Start conversation with', npc)}
            />
            
            <JinxMenu 
                isOpen={jinxMenuOpen} 
                onClose={() => setJinxMenuOpen(false)} 
                currentPath={currentPath}
            />
            
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
            
            <PhotoViewer 
                isOpen={photoViewerOpen}
                onClose={() => setPhotoViewerOpen(false)}
                currentPath={currentPath}
                onStartConversation={(images) => console.log('Start conversation with images', images)}
            />
            
            <CtxEditor 
                isOpen={ctxEditorOpen} 
                onClose={() => setCtxEditorOpen(false)} 
                currentPath={currentPath}
            />
            
            <BrowserUrlDialog
                isOpen={browserUrlDialogOpen}
                onClose={() => setBrowserUrlDialogOpen(false)}
                onNavigate={(url) => console.log('Navigate to', url)}
                currentPath={currentPath}
            />
            
            <MacroInput 
                isOpen={isMacroInputOpen} 
                currentPath={currentPath} 
                onClose={() => { 
                    setIsMacroInputOpen(false); 
                    window.api?.hideMacro?.(); 
                }} 
                onSubmit={({ macro, conversationId, result }) => {
                    console.log('Macro submit', { macro, conversationId, result });
                }}
            />
            
            <AIEditModal
                isOpen={aiEditModal.isOpen}
                modal={aiEditModal}
                onClose={() => setAiEditModal({ ...aiEditModal, isOpen: false })}
                onApply={(change) => console.log('Apply AI edit', change)}
                onApplyAll={() => console.log('Apply all AI edits')}
            />
            
            <MemoryApprovalModal
                isOpen={memoryApprovalModal.isOpen}
                memories={memoryApprovalModal.memories}
                onClose={() => setMemoryApprovalModal({ isOpen: false, memories: [] })}
                onDecision={(memoryId, decision, finalMemory) => 
                    console.log('Memory decision', { memoryId, decision, finalMemory })
                }
            />
            
            <PromptModal
                isOpen={promptModal.isOpen}
                title={promptModal.title}
                message={promptModal.message}
                defaultValue={promptModal.defaultValue}
                onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
                onConfirm={(value) => {
                    promptModal.onConfirm?.(value);
                    setPromptModal({ ...promptModal, isOpen: false });
                }}
            />
            
            <ResendModal
                isOpen={resendModal.isOpen}
                message={resendModal.message}
                selectedModel={resendModal.selectedModel}
                selectedNPC={resendModal.selectedNPC}
                availableModels={availableModels}
                availableNPCs={availableNPCs}
                modelsLoading={modelsLoading}
                modelsError={modelsError}
                npcsLoading={npcsLoading}
                npcsError={npcsError}
                onModelChange={(model) => setResendModal({ ...resendModal, selectedModel: model })}
                onNPCChange={(npc) => setResendModal({ ...resendModal, selectedNPC: npc })}
                onClose={() => setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' })}
                onResend={(message, model, npc) => {
                    console.log('Resend with', { message, model, npc });
                    setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' });
                }}
            />
        </>
    );

    // Main render
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-100">
                <div className="text-center">
                    <div className="text-xl mb-2">Loading NPC Studio...</div>
                    <div className="text-sm text-gray-400">Initializing workspace</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-100">
                <div className="text-center">
                    <div className="text-xl mb-2 text-red-400">Error</div>
                    <div className="text-sm text-gray-400">{error}</div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'} h-screen flex flex-col bg-gray-900 text-gray-100 font-mono`}>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar {...sidebarProps} />
                {renderMainContent()}
            </div>
            {renderModals()}
        </div>
    );
};

export default ChatInterface;