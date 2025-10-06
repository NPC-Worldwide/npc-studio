 import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File, Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, 
    Send, BarChart3,Minimize2,  Maximize2, MessageCircle, BrainCircuit, Star, Origami,
} from 'lucide-react';

import { Icon } from 'lucide-react';
import { avocado } from '@lucide/lab';

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

const generateId = () => Math.random().toString(36).substr(2, 9);

const LAST_ACTIVE_PATH_KEY = 'npcStudioLastPath';
const LAST_ACTIVE_CONVO_ID_KEY = 'npcStudioLastConvoId';

const normalizePath = (path) => {
    if (!path) return '';
    let normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
};



const LayoutNode = memo(({ node, path, component }) => {
    if (!node) return null;

    if (node.type === 'split') {
        const handleResize = (e, index) => {
            e.preventDefault();
            const parentNode = component.findNodeByPath(component.rootLayoutNode, path);
            if (!parentNode) return;
            const startSizes = [...parentNode.sizes];
            const isHorizontal = parentNode.direction === 'horizontal';
            const startPos = isHorizontal ? e.clientX : e.clientY;
            const containerSize = isHorizontal ? e.currentTarget.parentElement.offsetWidth : e.currentTarget.parentElement.offsetHeight;

            const onMouseMove = (moveEvent) => {
                const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
                const deltaPercent = ((currentPos - startPos) / containerSize) * 100;
                let newSizes = [...startSizes];
                const amount = Math.min(newSizes[index + 1] - 10, Math.max(-(newSizes[index] - 10), deltaPercent));
                newSizes[index] += amount;
                newSizes[index + 1] -= amount;

                component.setRootLayoutNode(currentRoot => {
                    const newRoot = JSON.parse(JSON.stringify(currentRoot));
                    const target = component.findNodeByPath(newRoot, path);
                    if (target) target.sizes = newSizes;
                    return newRoot;
                });
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        return (
            <div className={`flex flex-1 ${node.direction === 'horizontal' ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden`}>
                {node.children.map((child, index) => (
                    <React.Fragment key={child.id}>
                        <div className="flex overflow-hidden" style={{ flexBasis: `${node.sizes[index]}%` }}>
                            <LayoutNode node={child} path={[...path, index]} component={component} />
                        </div>
                        {index < node.children.length - 1 && (
                            <div
                                className={`flex-shrink-0 ${node.direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-gray-700 hover:bg-blue-500 transition-colors`}
                                onMouseDown={(e) => handleResize(e, index)}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (node.type === 'content') {
        const { activeContentPaneId, setActiveContentPaneId, draggedItem,
            setDraggedItem, dropTarget, setDropTarget, contentDataRef,
            updateContentPane, performSplit, renderChatView,
            renderFileEditor, renderTerminalView,
            renderPdfViewer, renderBrowserViewer,
            moveContentPane // Ensure moveContentPane is destructured here
        } = component;

        const isActive = node.id === activeContentPaneId;
        const isTargeted = dropTarget?.nodePath.join('') === path.join('');

        // --- CORRECTED onDrop FUNCTION ---
        const onDrop = (e, side) => {
  e.preventDefault();
  e.stopPropagation();
  if (!component.draggedItem) return;

  if (component.draggedItem.type === 'pane') {
    if (component.draggedItem.id === node.id) return;
    component.moveContentPane(component.draggedItem.id, component.draggedItem.nodePath, path, side);
    component.setDraggedItem(null);
    component.setDropTarget(null);
    return;
  }

            // Existing logic for new items dropped from sidebar
            let contentType;
            if (draggedItem.type === 'conversation') { // Use local draggedItem
                contentType = 'chat';
            } else if (draggedItem.type === 'file') {
                const ext = draggedItem.id.split('.').pop()?.toLowerCase();
                contentType = ext === 'pdf' ? 'pdf' : 'editor';
            } else if (draggedItem.type === 'browser') {
                contentType = 'browser';
            } else if (draggedItem.type === 'terminal') {
                contentType = 'terminal';
            } else {
                return;
            }

            if (side === 'center') {
                updateContentPane(node.id, contentType, draggedItem.id);
            } else {
                performSplit(path, side, contentType, draggedItem.id);
            }
            setDraggedItem(null);
            setDropTarget(null);
        };
        // --- END CORRECTED onDrop FUNCTION ---

        // --- RE-ADDED renderContent FUNCTION ---
        const renderContent = () => {
            const contentType = contentDataRef.current[node.id]?.contentType;
            switch (contentType) {
                case 'chat':
                    return renderChatView({ nodeId: node.id });
                case 'editor':
                    return renderFileEditor({ nodeId: node.id });
                case 'terminal':
                    return renderTerminalView({ nodeId: node.id });
                case 'pdf':
                    return renderPdfViewer({ nodeId: node.id });
                case 'browser':
                    return renderBrowserViewer({ nodeId: node.id });
                default:
                    return <div className="p-4 theme-text-muted">Empty pane.</div>;
            }
        };
        // --- END RE-ADDED renderContent FUNCTION ---

        return (
            <div
                className={`flex-1 flex flex-col relative border ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : 'theme-border'}`}
                onClick={() => setActiveContentPaneId(node.id)}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'center' }); }}
                onDrop={(e) => onDrop(e, 'center')} // Call the corrected onDrop
            >
                {draggedItem && (
                    <>
                        <div className={`absolute left-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'left' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'left' }); }} onDrop={(e) => onDrop(e, 'left')} />
                        <div className={`absolute right-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'right' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'right' }); }} onDrop={(e) => onDrop(e, 'right')} />
                        <div className={`absolute left-0 top-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'top' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'top' }); }} onDrop={(e) => onDrop(e, 'top')} />
                        <div className={`absolute left-0 bottom-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'bottom' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'bottom' }); }} onDrop={(e) => onDrop(e, 'bottom')} />
                    </>
                )}
                {renderContent()}
            </div>
        );
    }
    return null;
});

const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconProps = { size: 16, className: "flex-shrink-0" };
    switch(ext) {
        case 'py': return <Code2 {...iconProps} className={`${iconProps.className} text-blue-500`} />;
        case 'js': return <Code2 {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
        case 'md': return <FileText {...iconProps} className={`${iconProps.className} text-green-400`} />;
        case 'json': return <FileJson {...iconProps} className={`${iconProps.className} text-orange-400`} />;
        case 'html': return <Code2 {...iconProps} className={`${iconProps.className} text-red-400`} />;
        case 'css': return <Code2 {...iconProps} className={`${iconProps.className} text-blue-300`} />;
        case 'txt': case 'yaml': case 'yml': case 'npc': case 'jinx':
             return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
        case 'pdf': return <FileText {...iconProps} className={`${iconProps.className} text-purple-400`} />;

        default: return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
    }
};
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

const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    return text;
};

const ChatMessage = memo(({ 
    message, 
    isSelected, 
    messageSelectionMode, 
    toggleMessageSelection, 
    handleMessageContextMenu, 
    searchTerm, 
    isCurrentSearchResult,
    onResendMessage
}) => {
    const showStreamingIndicators = !!message.isStreaming;
    const messageId = message.id || message.timestamp;

    return (
        <div
        id={`message-${messageId}`}
        className={`max-w-[85%] rounded-lg p-3 relative group ${
            message.role === 'user' ? 'theme-message-user' : 'theme-message-assistant'
        } ${message.type === 'error' ? 'theme-message-error theme-border' : ''} ${
            isSelected ? 'ring-2 ring-blue-500' : ''
        } ${isCurrentSearchResult ? 'ring-2 ring-yellow-500' : ''} ${messageSelectionMode ? 'cursor-pointer' : ''}`}
        onClick={() => messageSelectionMode && toggleMessageSelection(messageId)}
        onContextMenu={(e) => handleMessageContextMenu(e, messageId)}
    >

        {messageSelectionMode && (
                <div className="absolute top-2 right-2 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMessageSelection(messageId)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            
            {message.role === 'user' && !messageSelectionMode && onResendMessage && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onResendMessage(message);
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title="Resend"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center text-xs theme-text-muted mb-1 opacity-80">
                <span className="font-semibold">{message.role === 'user' ? 'You' : (message.npc || 'Agent')}</span>
                <div className="flex items-center gap-2">
                    {message.role !== 'user' && message.model && (
                        <span className="truncate" title={message.model}>{message.model}</span>
                    )}
                    <span>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
             {message.originalModel && message.originalNPC && (
                    <span className="text-yellow-400 text-xs mb-1 block">
                        (Resent from {message.originalNPC} / {message.originalModel})
                    </span>
                )}

            <div className="relative message-content-area">
                {showStreamingIndicators && (
                    <div className="absolute top-0 left-0 -translate-y-full flex space-x-1 mb-1">
                        <div className="w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                )}
                {message.reasoningContent && (
                    <div className="mb-3 px-3 py-2 theme-bg-tertiary rounded-md border-l-2 border-yellow-500">
                        <div className="text-xs text-yellow-400 mb-1 font-semibold">Thinking Process:</div>
                        <div className="prose prose-sm prose-invert max-w-none theme-text-secondary text-sm">
                            <MarkdownRenderer content={message.reasoningContent || ''} />
                        </div>
                    </div>
                )}
                <div className="prose prose-sm prose-invert max-w-none theme-text-primary">
                    {searchTerm && message.content ? (
                        <MarkdownRenderer content={highlightSearchTerm(message.content, searchTerm)} />
                    ) : (
                        <MarkdownRenderer content={message.content || ''} />
                    )}
                    {showStreamingIndicators && message.type !== 'error' && (
                        <span className="ml-1 inline-block w-0.5 h-4 theme-text-primary animate-pulse stream-cursor"></span>
                    )}
                </div>
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 px-3 py-2 theme-bg-tertiary rounded-md border-l-2 border-blue-500">
                        <div className="text-xs text-blue-400 mb-1 font-semibold">Function Calls:</div>
                        {message.toolCalls.map((tool, idx) => (
                            <div key={idx} className="mb-2 last:mb-0">
                                <div className="text-blue-300 text-sm">{tool.function_name || tool.function?.name || "Function"}</div>
                                <pre className="theme-bg-primary p-2 rounded text-xs overflow-x-auto my-1 theme-text-secondary">{JSON.stringify(tool.arguments || tool.function?.arguments || {}, null, 2)}</pre>
                            </div>
                        ))}
                    </div>
                )}
                {message.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 border-t theme-border pt-2">
                        {message.attachments.map((attachment, idx) => {
                            const isImage = attachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                           
                            const imageSrc = attachment.preview || (attachment.path ? `media://${attachment.path}` : attachment.data); 
                            return (
                                <div key={idx} className="text-xs theme-bg-tertiary rounded px-2 py-1 flex items-center gap-1">
                                    <Paperclip size={12} className="flex-shrink-0" />
                                    <span className="truncate" title={attachment.name}>{attachment.name}</span>
                                    {isImage && imageSrc && (
                                        <img src={imageSrc} alt={attachment.name} className="mt-1 max-w-[100px] max-h-[100px] rounded-md object-cover"/>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});


const ChatInterface = () => {
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images');
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [contextMenuPos, setContextMenuPos] = useState(null);
   
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


    const [windowId] = useState(() => {
        // Generate unique window ID on component mount
        return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });

    const WINDOW_WORKSPACES_KEY = 'npcStudioWindowWorkspaces';
    const ACTIVE_WINDOWS_KEY = 'npcStudioActiveWindows';    
    const [localSearch, setLocalSearch] = useState({
        isActive: false,
        term: '',
        paneId: null,
        results: [],
        currentIndex: -1
    });

    const [workspaces, setWorkspaces] = useState(new Map());
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
    const WORKSPACES_STORAGE_KEY = 'npcStudioWorkspaces';
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
    const [browserContextMenu, setBrowserContextMenu] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        selectedText: '',
        viewId: null,
    });
    
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const [browserContextMenuPos, setBrowserContextMenuPos] = useState(null);


        
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
   
    const [draggedItem, setDraggedItem] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
   
    const contentDataRef = useRef({});
    const [editorContextMenuPos, setEditorContextMenuPos] = useState(null);
    const rootLayoutNodeRef = useRef(rootLayoutNode);
    useEffect(() => {
        rootLayoutNodeRef.current = rootLayoutNode;
    }, [rootLayoutNode]);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [resendModal, setResendModal] = useState({
        isOpen: false,
        message: null,
        selectedModel: '',
        selectedNPC: ''
    });

    const generateId = () => Math.random().toString(36).substr(2, 9);
    const syncLayoutWithContentData = useCallback((layoutNode, contentData) => {
  if (!layoutNode) return null;

  const collectPaneIds = (node) => {
    if (!node) return new Set();
    if (node.type === 'content') return new Set([node.id]);
    if (node.type === 'split') {
      return node.children.reduce((acc, child) => {
        const childIds = collectPaneIds(child);
        childIds.forEach(id => acc.add(id));
        return acc;
      }, new Set());
    }
    return new Set();
  };

  const paneIdsInLayout = collectPaneIds(layoutNode);
  const missingPaneIds = Object.keys(contentData).filter(id => !paneIdsInLayout.has(id));

  if (missingPaneIds.length === 0) return layoutNode;

  let newRoot = JSON.parse(JSON.stringify(layoutNode));

  missingPaneIds.forEach(paneId => {
    const newPaneNode = { id: paneId, type: 'content' };

    if (newRoot.type === 'content') {
      newRoot = {
        id: generateId(),
        type: 'split',
        direction: 'horizontal',
        children: [newRoot, newPaneNode],
        sizes: [50, 50],
      };
    } else if (newRoot.type === 'split') {
      newRoot.children.push(newPaneNode);
      const equalSize = 100 / newRoot.children.length;
      newRoot.sizes = new Array(newRoot.children.length).fill(equalSize);
    }
  });

  return newRoot;
}, []);
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
          ? msgs.map(m => ({ ...m, id: m.id || generateId() }))
          : [];

        paneData.chatMessages.allMessages = formatted;
        const count = paneData.chatMessages.displayedMessageCount || 20;
        paneData.chatMessages.messages = formatted.slice(-count);
        paneData.chatStats = getConversationStats(formatted);
      } catch (err) {
        paneData.chatMessages.messages = [];
        paneData.chatMessages.allMessages = [];
        paneData.chatStats = getConversationStats([]);
      }
    }
  } else if (newContentType === 'terminal') {
    paneData.chatMessages = null;
    paneData.fileContent = null;
  } else if (newContentType === 'pdf') {
    paneData.chatMessages = null;
    paneData.fileContent = null;
  }

  setRootLayoutNode(oldRoot => {
    const syncedRoot = syncLayoutWithContentData(oldRoot, contentDataRef.current);
    return syncedRoot;
  });
}, [syncLayoutWithContentData]);
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
const serializeWorkspace = useCallback(() => {
    if (!rootLayoutNode || !currentPath) return null;
    
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
        setRootLayoutNode(newRootLayout);
        setActiveContentPaneId(workspaceData.activeContentPaneId);
        
        contentDataRef.current = {};
        
        for (const [paneId, paneData] of Object.entries(workspaceData.contentData)) {
            contentDataRef.current[paneId] = {};
            await updateContentPane(paneId, paneData.contentType, paneData.contentId, paneData.skipMessageLoad); 
            
            if (paneData.displayedMessageCount) {
                if (contentDataRef.current[paneId]?.chatMessages) { 
                    contentDataRef.current[paneId].chatMessages.displayedMessageCount = paneData.displayedMessageCount;
                }
            }
            if (paneData.browserUrl) {
                contentDataRef.current[paneId].browserUrl = paneData.browserUrl;
            }
            if (paneData.fileChanged !== undefined) {
                contentDataRef.current[paneId].fileChanged = paneData.fileChanged;
            }
        }
        
        const validPaneIdsInLayout = new Set();
        const collectPaneIds = (node) => {
            if (!node) return;
            if (node.type === 'content') validPaneIdsInLayout.add(node.id);
            if (node.type === 'split') {
                node.children.forEach(collectPaneIds);
            }
        };
        collectPaneIds(newRootLayout);

        Object.keys(contentDataRef.current).forEach(paneId => {
            if (!validPaneIdsInLayout.has(paneId)) {
                delete contentDataRef.current[paneId];
            }
        });

        if (activeContentPaneId && !validPaneIdsInLayout.has(activeContentPaneId)) {
            const firstValidPaneId = Array.from(validPaneIdsInLayout).shift();
            setActiveContentPaneId(firstValidPaneId || null);
        } else if (!activeContentPaneId && validPaneIdsInLayout.size > 0) {
            setActiveContentPaneId(Array.from(validPaneIdsInLayout).shift());
        }

        setRootLayoutNode(prev => ({ ...prev }));
        
        return true;
    } catch (error) {
        console.error('Error restoring workspace:', error);
        contentDataRef.current = {}; 
        setRootLayoutNode(null); 
        setActiveContentPaneId(null);
        return false;
    } finally {
        setIsLoadingWorkspace(false);
    }
}, [updateContentPane, activeContentPaneId]);


const saveWorkspaceToStorage = useCallback((path, workspaceData) => {
    try {
        // Load existing data
        const allWorkspaces = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
        const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
        
        // Ensure window entry exists
        if (!allWorkspaces[windowId]) {
            allWorkspaces[windowId] = {};
        }
        
        // Save workspace for this window and path
        allWorkspaces[windowId][path] = {
            ...workspaceData,
            lastAccessed: Date.now(),
            windowId
        };
        
        // Update active windows registry
        activeWindows[windowId] = {
            currentPath: path,
            lastActive: Date.now()
        };
        
        // Cleanup old inactive windows (older than 24 hours)
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        Object.keys(activeWindows).forEach(wId => {
            if (activeWindows[wId].lastActive < dayAgo) {
                delete activeWindows[wId];
                delete allWorkspaces[wId];
            }
        });
        
        localStorage.setItem(WINDOW_WORKSPACES_KEY, JSON.stringify(allWorkspaces));
        localStorage.setItem(ACTIVE_WINDOWS_KEY, JSON.stringify(activeWindows));
        
        console.log(`[Window ${windowId}] Saved workspace for ${path}`);
    } catch (error) {
        console.error('Error saving window workspace:', error);
    }
}, [windowId]);

const loadWorkspaceFromStorage = useCallback((path) => {
    try {
        const allWorkspaces = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
        const windowWorkspaces = allWorkspaces[windowId] || {};
        return windowWorkspaces[path] || null;
    } catch (error) {
        console.error('Error loading window workspace:', error);
        return null;
    }
}, [windowId]);

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

    // Save workspace before the component unmounts
    window.addEventListener('beforeunload', saveCurrentWorkspace);
    
    return () => {
        saveCurrentWorkspace();
        window.removeEventListener('beforeunload', saveCurrentWorkspace);
    };
}, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);

useEffect(() => {
    const loadWorkspaceForNewPath = async () => {
        if (!currentPath || loading) return;
        
        setIsLoadingWorkspace(true);
        console.log(`[Window ${windowId}] Loading workspace for ${currentPath}`);
        
        try {
            // Try to restore window-specific workspace FIRST
            const savedWorkspace = loadWorkspaceFromStorage(currentPath);
            if (savedWorkspace) {
                console.log(`[Window ${windowId}] Found saved workspace for ${currentPath}`);
                
                // Load directory structure WITHOUT triggering conversation selection
                await loadDirectoryStructureWithoutConversationLoad(currentPath);
                
                const restored = await deserializeWorkspace(savedWorkspace);
                if (restored) {
                    console.log(`[Window ${windowId}] Successfully restored workspace`);
                    return;
                }
            }
            
            // No workspace found - load normally
            console.log(`[Window ${windowId}] No workspace found, loading normally for ${currentPath}`);
            await loadDirectoryStructure(currentPath);
            await createDefaultWorkspace();
            
        } catch (error) {
            console.error(`[Window ${windowId}] Error loading workspace:`, error);
            await createDefaultWorkspace();
        } finally {
            setIsLoadingWorkspace(false);
        }
    };

    loadWorkspaceForNewPath();
}, [currentPath, windowId]);
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
        
        // DON'T auto-select any conversations - let workspace restoration handle it

    } catch (err) {
        console.error('Error loading conversations:', err);
        setError(err.message);
        setDirectoryConversations([]);
    }
};

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


const LAST_ACTIVE_PATH_KEY = 'npcStudioLastPath';
const LAST_ACTIVE_CONVO_ID_KEY = 'npcStudioLastConvoId';

    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [executionMode, setExecutionMode] = useState('chat');
    const [favoriteModels, setFavoriteModels] = useState(new Set());
    const [showAllModels, setShowAllModels] = useState(false);
    const [availableJinxs, setAvailableJinxss] = useState([
    ]);
    const [selectedTools, setSelectedTools] = useState([]);
    
   
    useEffect(() => {
        const savedFavorites = localStorage.getItem('npcStudioFavoriteModels');
        if (savedFavorites) {
            setFavoriteModels(new Set(JSON.parse(savedFavorites)));
        }
    }, []);
    
    const toggleFavoriteModel = (modelValue) => {
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
        if (showAllModels || favoriteModels.size === 0) {
            return availableModels;
        }
        return availableModels.filter(m => favoriteModels.has(m.value));
    }, [availableModels, favoriteModels, showAllModels]);
    
    
   


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

   
    const findNodeByPath = useCallback((node, path) => {
        if (!node || !path) return null;
        let currentNode = node;
        for (const index of path) {
            if (currentNode && currentNode.children && currentNode.children[index]) {
                currentNode = currentNode.children[index];
            } else {
                return null;
            }
        }
        return currentNode;
    }, []);

    const findNodePath = useCallback((node, id, currentPath = []) => {
        if (!node) return null;
        if (node.id === id) return currentPath;
        if (node.type === 'split') {
            for (let i = 0; i < node.children.length; i++) {
                const result = findNodePath(node.children[i], id, [...currentPath, i]);
                if (result) return result;
            }
        }
        return null;
    }, []);

    const handleEditorCopy = () => {
        const selectedText = aiEditModal.selectedText;
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
        }
        setEditorContextMenuPos(null);
    };
    
    const handleEditorPaste = async () => {
        const paneId = activeContentPaneId;
        const paneData = contentDataRef.current[paneId];
        if (!paneId || !paneData || paneData.contentType !== 'editor') return;
    
        try {
            const textToPaste = await navigator.clipboard.readText();
            if (!textToPaste) return;
    
            const originalContent = paneData.fileContent || '';
            const { selectionStart, selectionEnd } = aiEditModal;
    
           
            const newContent = originalContent.substring(0, selectionStart) +
                               textToPaste +
                               originalContent.substring(selectionEnd);
            
           
            paneData.fileContent = newContent;
            paneData.fileChanged = true;
    
            setRootLayoutNode(p => ({ ...p }));
        } catch (err) {
            console.error("Failed to read from clipboard:", err);
            setError("Clipboard paste failed. Please grant permission if prompted.");
        } finally {
            setEditorContextMenuPos(null);
        }
    };
    
    const handleAddToChat = () => {
        const selectedText = aiEditModal.selectedText;
        if (selectedText) {
           
            setInput(prevInput => {
                const separator = prevInput.trim() ? '\n\n' : '';
                return `${prevInput}${separator}\`\`\`\n${selectedText}\n\`\`\``;
            });
        }
        setEditorContextMenuPos(null);
    };    
    const handleStartConversationFromViewer = async (images) => {
        if (!images || images.length === 0) return;
    
        const attachmentsToAdd = images.map(img => {
            const filePath = img.path;
            return {
                id: generateId(),
                name: filePath.split('/').pop(),
                path: filePath,
                size: 0,
                type: 'image/jpeg',
                preview: `file://${filePath}`
            };
        });
    
        setUploadedFiles(prev => [...prev, ...attachmentsToAdd]);
        setPhotoViewerOpen(false);
    };

    
    const handleSearchSubmit = async () => {
        if (!isGlobalSearch || !searchTerm.trim()) {
            setIsSearching(false);
            setDeepSearchResults([]);
            return;
        }
    
        setSearchLoading(true);
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
            setSearchLoading(false);
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

   
    const toggleMessageSelection = useCallback((messageId) => {
        if (!messageSelectionMode) return;
        setSelectedMessages(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(messageId)) {
                newSelected.delete(messageId);
            } else {
                newSelected.add(messageId);
            }
            return newSelected;
        });
    }, [messageSelectionMode]);


const toggleMessageSelectionMode = () => {
    setMessageSelectionMode(!messageSelectionMode);
    setSelectedMessages(new Set());
    setMessageContextMenuPos(null);
};
const handleMessageContextMenu = useCallback((e, messageId) => {
    e.preventDefault();
    e.stopPropagation();
   
    if (!messageSelectionMode) {
        setMessageSelectionMode(true);
        setSelectedMessages(new Set([messageId]));
    } else {
       
        setSelectedMessages(prev => {
            const newSelected = new Set(prev);
            if (!newSelected.has(messageId)) {
                newSelected.add(messageId);
            }
            return newSelected;
        });
    }
    setMessageContextMenuPos({ x: e.clientX, y: e.clientY, messageId });
}, [messageSelectionMode]);
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

const handlePdfTextSelect = (selectionEvent) => {
    console.log('[PDF_SELECT] handlePdfTextSelect called with:', selectionEvent);
    
    if (selectionEvent && selectionEvent.selectedText && selectionEvent.selectedText.trim()) {
        console.log('[PDF_SELECT] Setting selectedPdfText:', {
            text: selectionEvent.selectedText.substring(0, 50) + '...',
            textLength: selectionEvent.selectedText.length,
            pageIndex: selectionEvent.pageIndex,
            hasQuads: !!selectionEvent.quads
        });
        
        setSelectedPdfText({
            text: selectionEvent.selectedText,
            position: {
                pageIndex: selectionEvent.pageIndex,
                quads: selectionEvent.quads
            }
        });
    } else {
        console.log('[PDF_SELECT] No valid selection event or empty text:', {
            hasEvent: !!selectionEvent,
            hasSelectedText: !!(selectionEvent?.selectedText),
            textLength: selectionEvent?.selectedText?.length || 0,
            trimmedLength: selectionEvent?.selectedText?.trim()?.length || 0
        });
    }
};

const handleCopyPdfText = () => {
    if (selectedPdfText?.text) {
        navigator.clipboard.writeText(selectedPdfText.text);
    }
    setPdfContextMenuPos(null);
};
const handleHighlightPdfSelection = async () => {
    if (!selectedPdfText) return;
    const paneData = contentDataRef.current[activeContentPaneId];
    if (!paneData || paneData.contentType !== 'pdf') return;

    const filePath = paneData.contentId;
    
   
    const highlightData = {
        filePath: filePath,
        text: selectedPdfText.text,
        position: selectedPdfText.position 
    };

    await window.api.addPdfHighlight(highlightData);
    const response = await window.api.getHighlightsForFile(filePath);
    if (response.highlights) {
        setPdfHighlights(response.highlights);
    }
    setPdfContextMenuPos(null);
};

const handleApplyPromptToPdfText = (promptType) => {
    if (!selectedPdfText?.text) return;
    const text = selectedPdfText.text;
    let prompt = '';
    switch(promptType) {
        case 'summarize':
            prompt = `Please summarize the following text:\n\n---\n${text}\n---`;
            break;
        case 'explain':
            prompt = `Please explain the following text in simple terms:\n\n---\n${text}\n---`;
            break;
    }
    setInput(prompt);
    setPdfContextMenuPos(null);
};


useEffect(() => {
    const loadHighlights = async () => {
        if (activeContentPaneId) {
            const paneData = contentDataRef.current[activeContentPaneId];
            if (paneData && paneData.contentType === 'pdf') {
                const response = await window.api.getHighlightsForFile(paneData.contentId);
                if (response.highlights) {
                   
                   
                    const transformedHighlights = response.highlights.map(h => ({
                        id: h.id,
                        position: {
                            pageIndex: h.position.pageIndex,
                            rects: h.position.quads,        
                        },
                        content: {
                            text: h.highlighted_text,
                        }
                    }));
                    setPdfHighlights(transformedHighlights);
                   
                } else {
                    setPdfHighlights([]);
                }
            } else {
                setPdfHighlights([]);
            }
        }
    };
    loadHighlights();
}, [activeContentPaneId, contentDataRef.current[activeContentPaneId]?.contentId]);

const handleEditorContextMenu = (e) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    e.preventDefault();
    
    setAiEditModal(prev => ({
        ...prev,
        selectedText,
        selectionStart: start,
        selectionEnd: end
    }));
    
    setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
};



const handleAnalyzeInDashboard = () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;

    log(`Analyzing ${selectedIds.length} conversations in dashboard.`);
    setAnalysisContext({ type: 'conversations', ids: selectedIds });
    setDashboardMenuOpen(true);
    setContextMenuPos(null);
};

const handleAIEdit = async (action, customPrompt = null) => {
   
    setEditorContextMenuPos(null);

   
   
    if (action === 'edit' && customPrompt === null) {
        setPromptModal({
            isOpen: true,
            title: 'Customize AI Edit',
            message: 'Describe the changes you want the AI to make to the selected code.',
            defaultValue: 'Refactor this for clarity and efficiency',
            onConfirm: (userPrompt) => {
               
                handleAIEdit('edit', userPrompt);
            },
        });
        return;
    }

   

    const newStreamId = generateId();
    
    setAiEditModal(prev => ({
        ...prev,
        isOpen: true,
        type: action,
        isLoading: true,
        aiResponse: '',
        showDiff: action !== 'ask',
        streamId: newStreamId,
        modelForEdit: currentModel,
        npcForEdit: currentNPC,
        customEditPrompt: customPrompt || ''
    }));

    try {
        let finalPrompt = '';
        const activePaneData = contentDataRef.current[activeContentPaneId];
        const selectedText = activePaneData ? (activePaneData.fileContent || '').substring(aiEditModal.selectionStart, aiEditModal.selectionEnd) : '';

        if (!selectedText) throw new Error("No text selected.");

        switch (action) {
            case 'ask':
                finalPrompt = `Please analyze and explain this code. Provide a concise overview, highlighting its purpose, key components, and any notable patterns or potential improvements:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
            case 'document':
                finalPrompt = `Add comprehensive inline comments and, if appropriate, a docstring to this code. Ensure the comments explain complex logic, parameters, return values, and any assumptions. Return only the commented version of the code, preserving original indentation and structure:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
            case 'edit':
                finalPrompt = `${customPrompt}\n\nHere is the code to apply changes to. Return only the modified code:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
        }

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);

        const result = await window.api.executeCommandStream({
            commandstr: finalPrompt,
            currentPath,
            conversationId: null,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId, 
            executionMode: executionMode,
            tools: executionMode === 'agent' ? selectedTools : [],
        
        });

        if (result && result.error) {
            throw new Error(result.error);
        }

    } catch (err) {
        console.error('Error processing AI edit:', err);
        setError(err.message);
        setAiEditModal(prev => ({
            ...prev,
            isLoading: false,
            isOpen: false,
        }));
    }
};
const generateDiff = (original, modified) => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const diff = [];
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < modifiedLines.length) {
        if (i >= originalLines.length) {
           
            diff.push({ type: 'added', content: modifiedLines[j], lineNumber: j + 1 });
            j++;
        } else if (j >= modifiedLines.length) {
           
            diff.push({ type: 'removed', content: originalLines[i], lineNumber: i + 1 });
            i++;
        } else if (originalLines[i] === modifiedLines[j]) {
           
            diff.push({ type: 'unchanged', content: originalLines[i], lineNumber: i + 1 });
            i++;
            j++;
        } else {
           
            diff.push({ type: 'removed', content: originalLines[i], lineNumber: i + 1 });
            diff.push({ type: 'added', content: modifiedLines[j], lineNumber: j + 1 });
            i++;
            j++;
        }
    }
    
    return diff;
};

const applyAIEdit = () => {
   
    if (!activeContentPaneId) return;
    const paneData = contentDataRef.current[activeContentPaneId];
   
    if (!paneData || paneData.contentType !== 'editor') return;

    const originalContent = paneData.fileContent || '';

    const newContent = originalContent.substring(0, aiEditModal.selectionStart) + 
                      aiEditModal.aiResponse + 
                      originalContent.substring(aiEditModal.selectionEnd);
    
   
    paneData.fileContent = newContent;
    paneData.fileChanged = true;

   
    setRootLayoutNode(p => ({ ...p }));
    
   
    setAiEditModal({ isOpen: false, type: '', selectedText: '', selectionStart: 0, selectionEnd: 0, aiResponse: '', showDiff: false, isLoading: false });
};



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
            streamId: newStreamId
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


const handleSidebarItemContextMenu = (e, path, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'file' && !selectedFiles.has(path)) {
        setSelectedFiles(new Set([path]));
    }
    setSidebarItemContextMenuPos({ x: e.clientX, y: e.clientY, path, type });
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

const handleSidebarRenameSubmit = async () => {
    if (!renamingPath || !editedSidebarItemName.trim()) {
        setRenamingPath(null);
        return;
    }
    
    const dir = renamingPath.substring(0, renamingPath.lastIndexOf('/'));
    const newPath = `${dir}/${editedSidebarItemName}`;

    if (newPath === renamingPath) {
        setRenamingPath(null);
        return;
    }

    try {
        const response = await window.api.renameFile(renamingPath, newPath);
        if (response?.error) throw new Error(response.error);

        await loadDirectoryStructure(currentPath);

    } catch (err) {
        setError(`Failed to rename: ${err.message}`);
    } finally {
        setRenamingPath(null);
    }
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
                <button
                    onClick={() => handleApplyPromptToMessages('summarize')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <MessageSquare size={14} />
                    <span>Summarize in New Convo ({selectedMessages.size})</span>
                </button>
                <button
                    onClick={() => handleApplyPromptToCurrentConversation('summarize')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <Edit size={14} />
                    <span>Summarize in Input Field ({selectedMessages.size})</span>
                </button>
                <div className="border-t theme-border my-1"></div>
                <button
                    onClick={() => handleApplyPromptToMessages('analyze')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <Terminal size={14} />
                    <span>Analyze in New Convo ({selectedMessages.size})</span>
                </button>
                <button
                    onClick={() => handleApplyPromptToCurrentConversation('analyze')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <Edit size={14} />
                    <span>Analyze in Input Field ({selectedMessages.size})</span>
                </button>
                <div className="border-t theme-border my-1"></div>
                <button
                    onClick={() => handleApplyPromptToMessages('extract')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <FileText size={14} />
                    <span>Extract in New Convo ({selectedMessages.size})</span>
                </button>
                <button
                    onClick={() => handleApplyPromptToCurrentConversation('extract')}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-xs"
                >
                    <Edit size={14} />
                    <span>Extract in Input Field ({selectedMessages.size})</span>
                </button>
            </div>
        </>
    )
);


const performSplit = useCallback((targetNodePath, side, newContentType, newContentId) => {
    setRootLayoutNode(oldRoot => {
        if (!oldRoot) return oldRoot;

        const newRoot = JSON.parse(JSON.stringify(oldRoot));
        let parentNode = null;
        let targetNode = newRoot;
        let targetIndexInParent = -1;

        for (let i = 0; i < targetNodePath.length; i++) {
            parentNode = targetNode;
            targetIndexInParent = targetNodePath[i];
            targetNode = targetNode.children[targetIndexInParent];
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
            children: [],
            sizes: [50, 50]
        };

        if (side === 'left' || side === 'top') {
            newSplitNode.children = [newPaneNode, targetNode];
        } else {
            newSplitNode.children = [targetNode, newPaneNode];
        }

        if (parentNode) {
            parentNode.children[targetIndexInParent] = newSplitNode;
        } else {
            return newSplitNode;
        }

        setActiveContentPaneId(newPaneId);
        return newRoot;
    });
}, [updateContentPane]);
   
const createAndAddPaneNodeToLayout = useCallback(() => {
  const newPaneId = generateId();
  contentDataRef.current[newPaneId] = {};

  setRootLayoutNode(oldRoot => {
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
const closeContentPane = useCallback((paneId, nodePath) => {
    console.log(`[closeContentPane] Attempting to close pane: ${paneId} with path:`, nodePath);

    setRootLayoutNode(currentRoot => {
        if (!currentRoot) {
            console.log('[closeContentPane] No root layout node, nothing to close.');
            return null;
        }

        let newRoot = JSON.parse(JSON.stringify(currentRoot));

        if (newRoot.id === paneId) {
            console.log(`[closeContentPane] Closing root node with ID: ${paneId}`);
            delete contentDataRef.current[paneId];
            setActiveContentPaneId(null);
            return null;
        }

        if (!nodePath || nodePath.length === 0) {
            console.error('[closeContentPane] Cannot close pane: nodePath is null or empty.');
            return newRoot;
        }

        const parentPath = nodePath.slice(0, -1);
        const childIndex = nodePath[nodePath.length - 1];
        const parentNode = findNodeByPath(newRoot, parentPath);

        if (!parentNode || !parentNode.children) {
            console.error("[closeContentPane] Cannot close pane: parent not found or has no children.", { parentPath, childIndex, parentNode });
            return currentRoot;
        }

        parentNode.children.splice(childIndex, 1);
        parentNode.sizes.splice(childIndex, 1);
        delete contentDataRef.current[paneId];
        console.log(`[closeContentPane] Removed pane ${paneId} from contentDataRef and layout.`);


        if (parentNode.children.length === 1) {
            const remainingChild = parentNode.children[0];

            if (parentPath.length === 0) {
                newRoot = remainingChild;
                console.log('[closeContentPane] Parent was root, new root is remaining child.');
            } else {
                const grandParentNode = findNodeByPath(newRoot, parentPath.slice(0, -1));
                if (grandParentNode) {
                    const parentIndex = parentPath[parentPath.length - 1];
                    grandParentNode.children[parentIndex] = remainingChild;
                    console.log('[closeContentPane] Replaced parent with its single remaining child.');
                } else {
                    console.warn('[closeContentPane] Grandparent not found when trying to replace parent with single child.');
                }
            }
        } else if (parentNode.children.length > 1) {
            const equalSize = 100 / parentNode.children.length;
            parentNode.sizes = new Array(parentNode.children.length).fill(equalSize);
            console.log('[closeContentPane] Recalculated sizes for remaining siblings.');
        }

        if (activeContentPaneId === paneId) {
            const remainingPaneIds = Object.keys(contentDataRef.current);
            const newActivePaneId = remainingPaneIds.length > 0 ? remainingPaneIds[0] : null;
            setActiveContentPaneId(newActivePaneId);
            console.log(`[closeContentPane] Active pane was closed, setting new active pane to: ${newActivePaneId}`);
        }

        console.log('[closeContentPane] Returning new root layout node.');
        return newRoot;
    });
}, [activeContentPaneId, findNodeByPath]);
   


const handleConversationSelect = async (conversationId, skipMessageLoad = false) => {
    setActiveConversationId(conversationId);
    setCurrentFile(null);

    // Only skip pane updates if we're currently in the process of loading a workspace
    // Don't block ALL conversation selections!
    if (isLoadingWorkspace) {
        console.log('Skipping pane update - currently restoring workspace');
        return null;
    }

    let paneIdToUpdate;

    if (!rootLayoutNode) {
        const newPaneId = generateId();
        const newLayout = { id: newPaneId, type: 'content' };
        
        contentDataRef.current[newPaneId] = {};
        await updateContentPane(newPaneId, 'chat', conversationId, skipMessageLoad);
        
        setRootLayoutNode(newLayout);
        setActiveContentPaneId(newPaneId);
        paneIdToUpdate = newPaneId;
    } 
    else {
        paneIdToUpdate = activeContentPaneId || Object.keys(contentDataRef.current)[0];
        if (paneIdToUpdate) {
            await updateContentPane(paneIdToUpdate, 'chat', conversationId, skipMessageLoad);
            setRootLayoutNode(prev => ({...prev}));
        }
    }
    return paneIdToUpdate;
};


const handleFileClick = useCallback(async (filePath) => {
    setCurrentFile(filePath);
    setActiveConversationId(null);

    const extension = filePath.split('.').pop()?.toLowerCase();
    const contentType = extension === 'pdf' ? 'pdf' : 'editor';

    // --- CORRECTED LINE HERE ---
    const newPaneId = createAndAddPaneNodeToLayout();
    await updateContentPane(newPaneId, contentType, filePath);
    // --- END CORRECTED LINE ---

}, [createAndAddPaneNodeToLayout, updateContentPane]);


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

    // --- CORRECTED LINE HERE ---
    const newPaneId = createAndAddPaneNodeToLayout();
    await updateContentPane(newPaneId, 'terminal', newTerminalId);
    // --- END CORRECTED LINE ---

    setActiveConversationId(null);
    setCurrentFile(null);
}, [createAndAddPaneNodeToLayout, updateContentPane]);

    const renderPdfViewer = useCallback(({ nodeId }) => {
        const paneData = contentDataRef.current[nodeId];
        if (!paneData?.contentId) return null;
        const path = findNodePath(rootLayoutNode, nodeId);
    
        console.log('[PDF_RENDER] Rendering PDF viewer for pane:', nodeId, 'with selectedPdfText:', {
            hasSelection: !!selectedPdfText,
            textPreview: selectedPdfText?.text?.substring(0, 30) + '...' || 'none'
        });
    
        const handlePdfContextMenu = (e) => {
            console.log('[PDF_CONTEXT] Context menu handler called from PdfViewer');
            console.log('[PDF_CONTEXT] Event details:', {
                clientX: e.clientX,
                clientY: e.clientY,
                hasSelectedPdfText: !!selectedPdfText,
                selectedTextPreview: selectedPdfText?.text?.substring(0, 50) || 'none'
            });
            
           
            if (selectedPdfText && selectedPdfText.text) {
                console.log('[PDF_CONTEXT] Showing context menu at:', { x: e.clientX, y: e.clientY });
                setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
            } else {
                console.log('[PDF_CONTEXT] Not showing context menu - no selected text');
            }
        };
    
        return (
            <div className="flex-1 flex flex-col theme-bg-secondary relative">
<div className="p-2 border-b theme-border text-xs theme-text-primary flex-shrink-0 flex justify-between items-center cursor-move" draggable="true" 
 onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'; // Use 'move' for existing panes
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        setDraggedItem({ type: 'pane', id: nodeId, nodePath });
    }}
onDragEnd={handleGlobalDragEnd}>

                <div className="flex items-center gap-2 truncate">
                        {getFileIcon(paneData.contentId)}
                        <span className="truncate" title={paneData.contentId}>
                            {paneData.contentId.split('/').pop()}
                        </span>
                    </div>
                    <button 
                        onClick={() => closeContentPane(nodeId, path)} 
                        className="p-1 theme-hover rounded-full flex-shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 min-h-0">
                <PdfViewer
                        filePath={paneData.contentId}
                        highlights={pdfHighlights}
                        onTextSelect={handlePdfTextSelect}
                        onContextMenu={handlePdfContextMenu}
                    />
                </div>
            </div>
        );
    }, [rootLayoutNode, selectedPdfText, pdfHighlights,setDraggedItem]);
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
    // --- CORRECTED LINE HERE ---
    const newPaneId = createAndAddPaneNodeToLayout();
    await updateContentPane(newPaneId, 'browser', newBrowserId);
    // --- END CORRECTED LINE ---

    // Set the initial URL for the new browser pane
    if (contentDataRef.current[newPaneId]) {
        contentDataRef.current[newPaneId].browserUrl = url;
    }

    setActiveConversationId(null);
    setCurrentFile(null);
}, [createAndAddPaneNodeToLayout, updateContentPane]);

const handleBrowserDialogNavigate = (url) => {
        createNewBrowser(url);
        setBrowserUrlDialogOpen(false);
    };
const moveContentPane = useCallback((draggedId, draggedPath, targetPath, dropSide) => {
  setRootLayoutNode(oldRoot => {
    if (!oldRoot) return oldRoot;

    let newRoot = JSON.parse(JSON.stringify(oldRoot));

    // Trova nodo e genitore sorgente
    let draggedParent = null;
    let draggedIndex = -1;
    let draggedNode = newRoot;
    for (const idx of draggedPath) {
      draggedParent = draggedNode;
      draggedIndex = idx;
      draggedNode = draggedNode.children[draggedIndex];
    }

    // Trova nodo e genitore destinazione
    let targetParent = null;
    let targetIndex = -1;
    let targetNode = newRoot;
    for (const idx of targetPath) {
      targetParent = targetNode;
      targetIndex = idx;
      targetNode = targetNode.children[targetIndex];
    }

    if (!draggedParent || !targetParent) return oldRoot;

    // Rimuovi nodo sorgente
    draggedParent.children.splice(draggedIndex, 1);
    draggedParent.sizes.splice(draggedIndex, 1);

    // Pulisci genitore sorgente se ha 0 o 1 figli
    if (draggedParent.children.length === 0) {
      const grandParentPath = draggedPath.slice(0, -1);
      if (grandParentPath.length === 0) {
        newRoot = null;
      } else {
        const grandParent = findNodeByPath(newRoot, grandParentPath);
        const parentIndex = grandParentPath[grandParentPath.length - 1];
        if (grandParent && grandParent.children) {
          grandParent.children.splice(parentIndex, 1);
          grandParent.sizes.splice(parentIndex, 1);
        }
      }
    } else if (draggedParent.children.length === 1) {
      const remaining = draggedParent.children[0];
      const grandParentPath = draggedPath.slice(0, -1);
      if (grandParentPath.length === 0) {
        newRoot = remaining;
      } else {
        const grandParent = findNodeByPath(newRoot, grandParentPath);
        const parentIndex = grandParentPath[grandParentPath.length - 1];
        if (grandParent && grandParent.children) {
          grandParent.children[parentIndex] = remaining;
        }
      }
    } else {
      const equalSize = 100 / draggedParent.children.length;
      draggedParent.sizes = new Array(draggedParent.children.length).fill(equalSize);
    }

    // Trova genitore e nodo destinazione aggiornati nel nuovo albero
    let finalTargetParent = null;
    let finalTargetIndex = -1;
    let finalTargetNode = newRoot;
    for (const idx of targetPath) {
      finalTargetParent = finalTargetNode;
      finalTargetIndex = idx;
      finalTargetNode = finalTargetNode.children[finalTargetIndex];
    }

    if (!finalTargetParent || finalTargetIndex === -1) {
      // Se il genitore destinazione non esiste, il nodo trascinato diventa la radice
      newRoot = draggedNode;
    } else if (dropSide === 'center') {
      // Scambio: sostituisci il nodo destinazione con quello trascinato
      const tempTargetNode = finalTargetNode;
      finalTargetParent.children[finalTargetIndex] = draggedNode;

      // Reinserisci il nodo destinazione nella posizione originale del nodo trascinato
      let originalDraggedParent = findNodeByPath(newRoot, draggedPath.slice(0, -1));
      let originalDraggedIndex = draggedPath[draggedPath.length - 1];

      if (originalDraggedParent && originalDraggedParent.children && originalDraggedIndex !== -1) {
        originalDraggedParent.children.splice(originalDraggedIndex, 0, tempTargetNode);
        const equalSize = 100 / originalDraggedParent.children.length;
        originalDraggedParent.sizes = new Array(originalDraggedParent.children.length).fill(equalSize);
      }
    } else {
      // Split: crea un nuovo nodo split con i due nodi
      const isHorizontal = dropSide === 'left' || dropSide === 'right';
      const newSplit = {
        id: generateId(),
        type: 'split',
        direction: isHorizontal ? 'horizontal' : 'vertical',
        children: [],
        sizes: [50, 50],
      };

      if (dropSide === 'left' || dropSide === 'top') {
        newSplit.children = [draggedNode, finalTargetNode];
      } else {
        newSplit.children = [finalTargetNode, draggedNode];
      }

      finalTargetParent.children[finalTargetIndex] = newSplit;
    }

    // Ricalcola le dimensioni del genitore aggiornato
    if (finalTargetParent && finalTargetParent.type === 'split' && finalTargetParent.children.length > 1) {
      const equalSize = 100 / finalTargetParent.children.length;
      finalTargetParent.sizes = new Array(finalTargetParent.children.length).fill(equalSize);
    }

    setActiveContentPaneId(draggedId);
    return newRoot;
  });
}, [findNodeByPath, findNodePath]);

    const renderBrowserViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: browserId, browserUrl } = paneData;
    
    // NO useMemo here - just use the values directly
    const viewId = browserId;
    const initialUrl = browserUrl;
    
    console.log('[renderBrowserViewer] Rendering with:', { 
        viewId, 
        initialUrl, 
        key: `browser-${nodeId}-${browserId}` 
    });
    
    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
<div className="p-2 border-b theme-border text-xs theme-text-primary flex-shrink-0 flex justify-between items-center cursor-move"
    draggable="true"
    onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        setDraggedItem({ type: 'pane', id: nodeId, nodePath });
    }}
    onDragEnd={() => setDraggedItem(null)}
>


                <div className="flex items-center gap-2 truncate">
                    <Globe size={14} />
                    <span className="truncate">Browser</span>
                </div>
                <button 
                    onClick={() => closeContentPane(nodeId, findNodePath(rootLayoutNode, nodeId))}
                    className="p-1 theme-hover rounded-full"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <X size={14} />
                </button>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
                {browserId && (
                    <WebBrowserViewer 
                        key={`browser-${nodeId}-${browserId}`} 
                        initialUrl={initialUrl}
                        viewId={viewId}
                        currentPath={currentPath}
                    />
                )}
            </div>
        </div>
    );
}, [
    contentDataRef,
    closeContentPane,
    findNodePath,
    handleGlobalDragStart, 
    handleGlobalDragEnd,
    currentPath,
    rootLayoutNode
]);

useEffect(() => {
       
        const cleanup = window.api.onBrowserShowContextMenu(({ x, y, selectedText, viewId }) => {
            console.log(`[REACT BROWSER CONTEXT] Received event for viewId: ${viewId}`);
            setBrowserContextMenu({ isOpen: true, x, y, selectedText, viewId });
        });
    
        const handleClickOutside = () => {
            setBrowserContextMenu(currentState => {
               
                if (currentState.isOpen) {
                    console.log(`[REACT BROWSER CONTEXT] Closing menu, restoring viewId: ${currentState.viewId}`);
                   
                    window.api.browserSetVisibility({ viewId: currentState.viewId, visible: true });
                   
                    return { isOpen: false, x: 0, y: 0, selectedText: '', viewId: null };
                }
                return currentState;
            });
        };
    
       
        window.addEventListener('mousedown', handleClickOutside);
    
        return () => {
            cleanup();
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    
    const renderBrowserContextMenu = () => {
        if (!browserContextMenu.isOpen) return null;
    
        return (
           
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                style={{ top: browserContextMenu.y, left: browserContextMenu.x }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-2 text-xs theme-text-muted border-b theme-border truncate max-w-xs italic">
                    "{browserContextMenu.selectedText.substring(0, 50)}..."
                </div>
                <button onClick={handleBrowserCopyText} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">
                    <Edit size={14} /> Copy
                </button>
                <div className="border-t theme-border my-1"></div>
                <button onClick={handleBrowserAddToChat} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">
                    <MessageSquare size={14} /> Add to Chat
                </button>
                <button onClick={() => handleBrowserAiAction('summarize')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">
                    <FileText size={14} /> Summarize with AI
                </button>
                <button onClick={() => handleBrowserAiAction('explain')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">
                    <Wrench size={14} /> Explain with AI
                </button>
            </div>
        );
    };
    
    
    const renderPdfContextMenu = () => {
       
       
       
       
       
       
    
        return pdfContextMenuPos && (
            <>

                <div className="fixed inset-0 z-40" onClick={() => {
               
                    setPdfContextMenuPos(null);
                }} />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                    style={{ top: pdfContextMenuPos.y, left: pdfContextMenuPos.x }}
                >
                    <button onClick={handleCopyPdfText} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Copy</button>
                    <button onClick={handleHighlightPdfSelection} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Highlight</button>
                    <div className="border-t theme-border my-1"></div>
                    <button onClick={() => handleApplyPromptToPdfText('summarize')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Summarize Text</button>
                    <button onClick={() => handleApplyPromptToPdfText('explain')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Explain Text</button>
                </div>
            </>
        );
    };
    
    

    const renderTerminalView = useCallback(({ nodeId }) => {
        const paneData = contentDataRef.current[nodeId];
        if (!paneData) return null;
    
        const { contentId: terminalId } = paneData;
    
        return (
            <div className="flex-1 flex flex-col theme-bg-secondary relative">
<div className="p-2 border-b theme-border text-xs theme-text-primary flex-shrink-0 flex justify-between items-center cursor-move"
    draggable="true"
    onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        setDraggedItem({ type: 'pane', id: nodeId, nodePath });
    }}
    onDragEnd={() => setDraggedItem(null)}
>

                    <div className="flex items-center gap-2 truncate">
                        <Terminal size={14} />
                        <span className="truncate" title={terminalId}>Terminal</span>
                    </div>
                    <button onClick={() => closeContentPane(nodeId, findNodePath(rootLayoutNode, nodeId))} className="p-1 theme-hover rounded-full">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden min-h-0">
                    <TerminalView
                        terminalId={terminalId}
                        currentPath={currentPath}
                        isActive={activeContentPaneId === nodeId}
                    />
                </div>
            </div>
        );
    }, [rootLayoutNode, currentPath, activeContentPaneId,setDraggedItem]);
    
const renderFileEditor = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: filePath, fileContent, fileChanged } = paneData;
    const fileName = filePath?.split('/').pop() || 'Untitled';
    const isRenaming = renamingPaneId === nodeId;

    const onContentChange = (value) => {
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].fileContent = value;
            if (!contentDataRef.current[nodeId].fileChanged) {
                contentDataRef.current[nodeId].fileChanged = true;
                setRootLayoutNode(p => ({ ...p }));
            }
        }
    };

    const onSave = async () => {
        const currentPaneData = contentDataRef.current[nodeId];
        if (currentPaneData?.contentId && currentPaneData.fileChanged) {
            await window.api.writeFileContent(currentPaneData.contentId, currentPaneData.fileContent);
            currentPaneData.fileChanged = false;
            setRootLayoutNode(p => ({ ...p }));
        }
    };
    
    const onEditorContextMenu = (e) => {
        if (activeContentPaneId === nodeId) {
            e.preventDefault();
            setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    };

    const path = findNodePath(rootLayoutNode, nodeId); // Get the path here!
    console.log(`[renderFileEditor] Rendering pane ${nodeId}. Path for close button:`, path); // <--- LAVANZARO'S LOGGING!

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-secondary relative">
<div
  draggable="true"
  onDragStart={(e) => {
    e.dataTransfer.effectAllowed = 'move';
    const nodePath = findNodePath(rootLayoutNode, nodeId);
    setDraggedItem({ type: 'pane', id: nodeId, nodePath });
  }}
  onDragEnd={() => setDraggedItem(null)}
  className="cursor-move"
>

                <div className="flex items-center gap-2 truncate">
                    {getFileIcon(fileName)}
                    {isRenaming ? (
                        <input
                            type="text"
                            value={editedFileName}
                            onChange={(e) => setEditedFileName(e.target.value)}
                            onBlur={() => handleRenameFile(nodeId, filePath)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFile(nodeId, filePath);
                                if (e.key === 'Escape') setRenamingPaneId(null);
                            }}
                            className="theme-input text-xs rounded px-2 py-1 border focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <span
                            className="truncate cursor-pointer"
                            title={filePath}
                            onDoubleClick={() => {
                                setRenamingPaneId(nodeId);
                                setEditedFileName(fileName);
                            }}
                        >
                            {fileName}{fileChanged ? '*' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onSave} disabled={!fileChanged} className="px-3 py-1 rounded text-xs theme-button-success disabled:opacity-50">Save</button>
                    <button 
                        onClick={() => {
                            console.log(`[renderFileEditor] X button clicked for pane ${nodeId}. Calling closeContentPane with path:`, path); // <--- LAVANZARO'S LOGGING!
                            closeContentPane(nodeId, path);
                        }} 
                        className="p-1 theme-hover rounded-full flex-shrink-0"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-scroll min-h-0">
                <CodeEditor
                    value={fileContent || ''}
                    onChange={onContentChange}
                    onSave={onSave}
                    filePath={filePath}
                    onSelect={handleTextSelection}
                    onContextMenu={onEditorContextMenu}
                    />
            </div>

{editorContextMenuPos && activeContentPaneId === nodeId && (
    <>
        <div 
            className="fixed inset-0 z-40"
            onClick={() => setEditorContextMenuPos(null)}
        />
        <div 
            className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
            style={{ 
                top: `${editorContextMenuPos.y}px`, 
                left: `${editorContextMenuPos.x}px` 
            }}
        >
            <button onClick={handleEditorCopy} disabled={!aiEditModal.selectedText} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                Copy
            </button>
            <button onClick={handleEditorPaste} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                Paste
            </button>
            <div className="border-t theme-border my-1"></div>
            <button onClick={handleAddToChat} disabled={!aiEditModal.selectedText} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                Add to Chat
            </button>
            <div className="border-t theme-border my-1"></div>
            <button onClick={() => { handleAIEdit('ask'); setEditorContextMenuPos(null); }} 
                disabled={!aiEditModal.selectedText} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                <MessageSquare size={16} />Explain
            </button>
            <button onClick={() => { handleAIEdit('document'); setEditorContextMenuPos(null); }} 
                disabled={!aiEditModal.selectedText} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                <FileText size={16} />Add Comments
            </button>
            <button onClick={() => { handleAIEdit('edit'); setEditorContextMenuPos(null); }} 
                disabled={!aiEditModal.selectedText} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                <Edit size={16} />Refactor
            </button>
            <div className="border-t theme-border my-1"></div>
            <button onClick={() => {
                setEditorContextMenuPos(null);
                setPromptModal({
                    isOpen: true,
                    title: 'Agentic Code Edit',
                    message: 'What would you like AI to do with all open files?',
                    defaultValue: 'Add error handling and improve code quality',
                    onConfirm: (instruction) => startAgenticEdit(instruction)
                });
            }} 
                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-blue-400 text-sm">
                <BrainCircuit size={16} />Agentic Edit (All Files)
            </button>
        </div>
    </>
)}
            </div>
        );
}, [rootLayoutNode, activeContentPaneId, editorContextMenuPos, aiEditModal, renamingPaneId, editedFileName, setDraggedItem, searchTerm, isGlobalSearch, closeContentPane, findNodePath]); // <--- Added closeContentPane and findNodePath to dependencies!

    const InPaneSearchBar = ({
        searchTerm,       
        onSearchTermChange,
        onNext,
        onPrevious,
        onClose,
        resultCount,
        currentIndex
    }) => {
        const inputRef = useRef(null);
       
        const [localInputTerm, setLocalInputTerm] = useState(searchTerm);
    
       
        useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();
               
                inputRef.current.setSelectionRange(localInputTerm.length, localInputTerm.length);
            }
        }, [localInputTerm]);
    
       
        useEffect(() => {
            if (localInputTerm !== searchTerm) {
                setLocalInputTerm(searchTerm);
            }
        }, [searchTerm]);
    
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    onPrevious();
                } else {
                    onNext();
                }
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };
    
        return (
            <div className="flex items-center gap-2 w-full theme-bg-tertiary p-2 rounded-lg">
                <input
                    ref={inputRef}
                    type="text"
                    value={localInputTerm}
                    onChange={(e) => {
                        setLocalInputTerm(e.target.value);
                        onSearchTermChange(e.target.value);
                    }}
                    className="flex-1 theme-input text-xs rounded px-3 py-2 border-0 focus:ring-1 focus:ring-blue-500"
                    placeholder="Search messages..."
                    onKeyDown={handleKeyDown}
                />
                <span className="text-xs theme-text-muted min-w-[60px] text-center">
                    {resultCount > 0 ? `${currentIndex + 1} of ${resultCount}` : 'No results'}
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={onPrevious} disabled={resultCount === 0} className="p-2 theme-hover rounded disabled:opacity-50" title="Previous (Shift+Enter)">
                        <ChevronLeft size={14} />
                    </button>
                    <button onClick={onNext} disabled={resultCount === 0} className="p-2 theme-hover rounded disabled:opacity-50" title="Next (Enter)">
                        <ChevronRight size={14} />
                    </button>
                    <button onClick={onClose} className="p-2 theme-hover rounded text-red-400" title="Close search (Escape)">
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    };    

    const renderChatView = useCallback(({ nodeId }) => {
        const paneData = contentDataRef.current[nodeId];
        if (!paneData) return <div className="p-4 theme-text-muted">Loading pane...</div>;
    
        const scrollRef = useRef(null);
        const paneRef = useRef(null);
    
        const debouncedSearchTerm = useDebounce(localSearch.term, 300);
    
        const debouncedSetSearchTerm = useCallback((newTerm) => {
            setLocalSearch(prev => ({ ...prev, term: newTerm }));
        }, []);
    
        useEffect(() => {
            const paneElement = paneRef.current;
            const handleKeyDown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocalSearch(prev => ({
                        ...prev,
                        isActive: true,
                        paneId: nodeId,
                        term: prev.paneId === nodeId ? prev.term : ''
                    }));
                }
            };
            if (paneElement) {
                paneElement.addEventListener('keydown', handleKeyDown);
                return () => paneElement.removeEventListener('keydown', handleKeyDown);
            }
        }, [nodeId]);
    
        useEffect(() => {
            if (localSearch.isActive && localSearch.paneId === nodeId && debouncedSearchTerm) {
                const allMessages = paneData.chatMessages?.allMessages || [];
                const results = [];
                allMessages.forEach(msg => {
                    if (msg.content && msg.content.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
                        results.push(msg.id || msg.timestamp);
                    }
                });
                setLocalSearch(prev => ({ ...prev, results, currentIndex: results.length > 0 ? 0 : -1 }));
            } else if (localSearch.paneId === nodeId && !debouncedSearchTerm) {
                setLocalSearch(prev => ({ ...prev, results: [], currentIndex: -1 }));
            }
        }, [debouncedSearchTerm, localSearch.isActive, localSearch.paneId, nodeId, paneData.chatMessages?.allMessages]);
    
        useEffect(() => {
            if (localSearch.currentIndex !== -1 && localSearch.results.length > 0) {
                const messageId = localSearch.results[localSearch.currentIndex];
                const element = document.getElementById(`message-${messageId}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, [localSearch.currentIndex, localSearch.results]);
    
        useEffect(() => {
            if (autoScrollEnabled && scrollRef.current && !localSearch.isActive) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, [paneData?.chatMessages?.messages, autoScrollEnabled, localSearch.isActive]);
    
        const handleLocalSearchNavigate = (direction) => {
            if (localSearch.results.length === 0) return;
            setLocalSearch(prev => {
                const nextIndex = (prev.currentIndex + direction + prev.results.length) % prev.results.length;
                return { ...prev, currentIndex: nextIndex };
            });
        };
    
        const messagesToDisplay = paneData.chatMessages?.messages || [];
        const totalMessages = paneData.chatMessages?.allMessages?.length || 0;
        const stats = paneData.chatStats || {};
        const path = findNodePath(rootLayoutNode, nodeId);
    
        return (
            <div ref={paneRef} className="flex-1 flex flex-col min-h-0 overflow-hidden relative focus:outline-none" tabIndex={-1}>
<div className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary cursor-move"
    draggable="true"
    onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        setDraggedItem({ type: 'pane', id: nodeId, nodePath });
    }}
    onDragEnd={() => setDraggedItem(null)}
>

                    <div className="flex justify-between items-center min-h-[28px]">
                        <span className="truncate min-w-0 font-semibold" title={paneData.contentId}>
                            Conversation: {paneData.contentId?.slice(-8) || 'None'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                                className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                                    autoScrollEnabled ? 'theme-button-success' : 'theme-button'
                                } theme-hover`}
                                title={autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14M19 12l-7 7-7-7"/>
                                </svg>
                                {autoScrollEnabled ? 'Auto' : 'Manual'}
                            </button>
                            <button onClick={toggleMessageSelectionMode} className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${messageSelectionMode ? 'theme-button-primary' : 'theme-button theme-hover'}`}>
                                <ListFilter size={14} />{messageSelectionMode ? `Exit (${selectedMessages.size})` : 'Select'}
                            </button>
                            <button onClick={() => closeContentPane(nodeId, path)} className="p-1 theme-hover rounded-full flex-shrink-0">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-gray-400 min-h-[20px]">
                        <span><MessageSquare size={12} className="inline mr-1"/>{stats.messageCount || 0} Msgs</span>
                        <span><Terminal size={12} className="inline mr-1"/>~{stats.tokenCount || 0} Tokens</span>
                        <span><Code2 size={12} className="inline mr-1"/>{stats.models?.size || 0} Models</span>
                        <span><Users size={12} className="inline mr-1"/>{stats.agents?.size || 0} Agents</span>
                        {stats.totalAttachments > 0 && <span><Paperclip size={12} className="inline mr-1"/>{stats.totalAttachments} Attachments</span>}
                        {stats.totalToolCalls > 0 && <span><Wrench size={12} className="inline mr-1"/>{stats.totalToolCalls} Tool Calls</span>}
                    </div>
                </div>
    
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4 theme-bg-primary">
                    {totalMessages > messagesToDisplay.length && (
                        <div className="text-center">
                            <button onClick={() => {
                                const currentPane = contentDataRef.current[nodeId];
                                if (currentPane && currentPane.chatMessages) {
                                    currentPane.chatMessages.displayedMessageCount += 20;
                                    currentPane.chatMessages.messages = currentPane.chatMessages.allMessages.slice(-currentPane.chatMessages.displayedMessageCount);
                                    setRootLayoutNode(p => ({ ...p }));
                                }
                            }} className="theme-button theme-hover px-3 py-1 text-xs rounded">Load More</button>
                        </div>
                    )}
                    {messagesToDisplay.map(msg => {
                        const messageId = msg.id || msg.timestamp;
                        const isCurrentSearchResult = localSearch.isActive && localSearch.paneId === nodeId && localSearch.results[localSearch.currentIndex] === messageId;
                        return (
                            <ChatMessage
                                key={messageId}
                                message={msg}
                                searchTerm={localSearch.isActive && localSearch.paneId === nodeId ? debouncedSearchTerm : ''}
                                isCurrentSearchResult={isCurrentSearchResult}
                                isSelected={selectedMessages.has(messageId)}
                                messageSelectionMode={messageSelectionMode}
                                toggleMessageSelection={toggleMessageSelection}
                                handleMessageContextMenu={handleMessageContextMenu}
                                onResendMessage={handleResendMessage}
                            />
                        );
                    })}
                </div>
    
                {localSearch.isActive && localSearch.paneId === nodeId && (
                    <div className="flex-shrink-0 p-2 border-t theme-border theme-bg-secondary">
                        <InPaneSearchBar
                            searchTerm={localSearch.term}
                            onSearchTermChange={debouncedSetSearchTerm}
                            onNext={() => handleLocalSearchNavigate(1)}
                            onPrevious={() => handleLocalSearchNavigate(-1)}
                            onClose={() => setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 })}
                            resultCount={localSearch.results.length}
                            currentIndex={localSearch.currentIndex}
                        />
                    </div>
                )}
            </div>
        );
    }, [rootLayoutNode, messageSelectionMode, selectedMessages, autoScrollEnabled, localSearch]);
        
    
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

        // --- CORRECTED LINE HERE ---
        const newPaneId = createAndAddPaneNodeToLayout();
        await updateContentPane(newPaneId, 'chat', conversation.id, skipMessageLoad);
        // --- END CORRECTED LINE ---

        setActiveConversationId(conversation.id);
        setCurrentFile(null);

        return { conversation, paneId: newPaneId };

    } catch (err) {
        console.error("Error creating new conversation:", err);
        setError(err.message);
        return { conversation: null, paneId: null };
    }
}, [currentPath, createAndAddPaneNodeToLayout, updateContentPane]);

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

const handleInputSubmit = async (e) => {
    e.preventDefault();
    if (isStreaming || (!input.trim() && uploadedFiles.length === 0) || !activeContentPaneId) {
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

    let finalPrompt = input;
    
    const contexts = gatherWorkspaceContext();
    const newHash = hashContext(contexts);
    const contextChanged = newHash !== contextHash;
    
    if (contexts.length > 0 && contextChanged) {
        const fileContexts = contexts.filter(c => c.type === 'file');
        const browserContexts = contexts.filter(c => c.type === 'browser');
        let contextPrompt = '';
        
        if (fileContexts.length > 0) {
            contextPrompt += fileContexts.map(ctx => 
                `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\``
            ).join('\n\n');
        }
                        
        if (browserContexts.length > 0) {
            if (contextPrompt) contextPrompt += '\n\n';
            
            const browserContentPromises = browserContexts.map(async ctx => {
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
            finalPrompt = `${input}

Available context:
${contextPrompt}

IMPORTANT: Propose changes as unified diffs, NOT full file contents.`;
        } else {
            finalPrompt = `${input}

Context - currently open:
${contextPrompt}`;
        }
        
        setContextHash(newHash);
    }
    
    const userMessage = { 
        id: generateId(), 
        role: 'user', 
        content: finalPrompt, 
        timestamp: new Date().toISOString(), 
        attachments: uploadedFiles,
        executionMode: executionMode
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

    try {
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        await window.api.executeCommandStream({
            commandstr: finalPrompt, 
            currentPath, 
            conversationId, 
            model: currentModel, 
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: uploadedFiles.map(f => {
                if (f.path) return { name: f.name, path: f.path, size: f.size, type: f.type };
                else if (f.data) return { name: f.name, data: f.data, size: f.size, type: f.type };
                return { name: f.name, type: f.type };
            }),
            streamId: newStreamId, 
            executionMode: 'chat',
        });
    } catch (err) {
        setError(err.message); 
        setIsStreaming(false); 
        delete streamToPaneRef.current[newStreamId];
    }
};




    const [isSaving, setIsSaving] = useState(false);

    const handleFileSave = async () => {
        if (!currentFile || !fileChanged || isSaving) return;
        try {
            setIsSaving(true);
            const response = await window.api.writeFileContent(currentFile, fileContent);
            if (response.error) throw new Error(response.error);
            setFileChanged(false);
            
           
            const structureResult = await window.api.readDirectoryStructure(currentPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
            }
            
            console.log('File saved successfully');
        } catch (err) {
            console.error('Error saving file:', err);
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };
    const handleFileContentChange = useCallback((value) => {
        setFileContent(value);
        setFileChanged(true);
    }, []);

   
    const handleTextSelection = useCallback((from, to) => {
       
        if (!activeContentPaneId) return;
        const paneData = contentDataRef.current[activeContentPaneId];
       
        if (!paneData || paneData.contentType !== 'editor') return;

        const selectedText = (paneData.fileContent || '').substring(from, to);
        if (selectedText.length > 0) {
            setAiEditModal(prev => ({
                ...prev,
                selectedText,
                selectionStart: from,
                selectionEnd: to,
            }));
        }
    }, [activeContentPaneId]);

   
    const [isRenamingFile, setIsRenamingFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');

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
    
           
            if (contentDataRef.current[nodeId]) {
                contentDataRef.current[nodeId].contentId = newPath;
            }
    
           
            await loadDirectoryStructure(currentPath);
    
           
            setRootLayoutNode(p => ({ ...p }));
    
        } catch (err) {
            console.error("Error renaming file:", err);
            setError(`Failed to rename: ${err.message}`);
        } finally {
           
            setRenamingPaneId(null);
        }
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

const [activeWindowsExpanded, setActiveWindowsExpanded] = useState(false);
const extractCodeFromMarkdown = (text) => {
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];
  if (matches.length > 0) return matches[matches.length - 1][1].trim();
  const thinkingRegex = /<think>[\s\S]*?<\/think>/g;
  return text.replace(thinkingRegex, '').trim();
};

const generateInlineDiff = (unifiedDiffText) => {
    const diff = [];
    const lines = unifiedDiffText.split('\n');
    let originalLineNum = 0;
    let modifiedLineNum = 0;

    for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++')) {
            continue;
        }

        if (line.startsWith('@@')) {
            const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                originalLineNum = parseInt(match[1]); // Starting line number in original file
                modifiedLineNum = parseInt(match[3]); // Starting line number in modified file
            }
            continue;
        }

        if (line.startsWith('-')) {
            diff.push({ type: 'removed', content: line.substring(1), originalLine: originalLineNum, modifiedLine: null });
            originalLineNum++;
        } else if (line.startsWith('+')) {
            diff.push({ type: 'added', content: line.substring(1), originalLine: null, modifiedLine: modifiedLineNum });
            modifiedLineNum++;
        } else if (line.startsWith(' ')) {
            diff.push({ type: 'unchanged', content: line.substring(1), originalLine: originalLineNum, modifiedLine: modifiedLineNum });
            originalLineNum++;
            modifiedLineNum++;
        }
    }
    console.log('generateInlineDiff output:', diff);
    return diff;
};

const startAgenticEdit = async (instruction) => {
    const contexts = gatherWorkspaceContext();
    
    if (contexts.length === 0) {
        setError("No open files or contexts to work with");
        return;
    }
    
    const fileContexts = contexts.filter(c => c.type === 'file');
    
    if (fileContexts.length === 0) {
        setError("No open files to edit");
        return;
    }
    
    const contextPrompt = fileContexts.map(ctx => 
        `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\``
    ).join('\n\n');
    
    const fullPrompt = `${instruction}

Available files in workspace:
${contextPrompt}

For each file you want to modify, respond with a unified diff. If there are multiple distinct logical changes within a single file, please provide a separate 'FILE: <filepath>\nREASONING: <why this change>\n\`\`\`diff\n...\`\`\`' block for each of them.

Use this exact format:
FILE: <filepath>
REASONING: <why this change>
\`\`\`diff
--- a/<filepath>
+++ b/<filepath>
@@ -<line>,<count> +<line>,<count> @@
 context line
-removed line
+added line
 context line
\`\`\`

Only show the lines that change, with a few lines of context. Multiple files = multiple FILE blocks.`; // <-- EXPLICITLY ASKING FOR UNIFIED DIFFS AND DISTINCT BLOCKS!

    const newStreamId = generateId();
    
    setAiEditModal({
        isOpen: true,
        type: 'agentic',
        selectedText: '',
        selectionStart: 0,
        selectionEnd: 0,
        aiResponse: '',
        showDiff: false,
        isLoading: true,
        streamId: newStreamId,
        modelForEdit: currentModel,
        npcForEdit: currentNPC,
        workspaceContexts: fileContexts,
        proposedChanges: []
    });

    try {
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        
        await window.api.executeCommandStream({
            commandstr: fullPrompt,
            currentPath,
            conversationId: null,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId,
            executionMode: 'chat'
        });
    } catch (err) {
        console.error('Error starting agentic edit:', err);
        setError(err.message);
        setAiEditModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
    }
};

const parseAgenticResponse = (response, contexts) => {
    const changes = [];
    const fileRegex = /FILE:\s*(.+?)\s*\nREASONING:\s*(.+?)\s*\n```diff\n([\s\S]*?)```/gi;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
        const filePath = match[1].trim();
        const reasoning = match[2].trim();
        const rawUnifiedDiffText = match[3].trim();
        
        const context = contexts.find(c => 
            c.path.includes(filePath) || filePath.includes(c.path.split('/').pop())
        );
        
        if (context) {
            const newCode = applyUnifiedDiff(context.content, rawUnifiedDiffText);
            
            changes.push({
                paneId: context.paneId,
                filePath: context.path,
                reasoning: reasoning,
                originalCode: context.content,
                newCode: newCode,
                diff: generateInlineDiff(rawUnifiedDiffText) || []
            });
        }
    }
    
    console.log('Parsed agent changes:', changes);
    return changes;
};

const applyUnifiedDiff = (originalContent, unifiedDiffText) => {
    console.log('--- applyUnifiedDiff START ---'); // <--- LAVANZARO'S LOGGING!
    console.log('Original Content (first 10 lines):\n', originalContent.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!
    console.log('Unified Diff Text (first 10 lines):\n', unifiedDiffText.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!

    const originalLines = originalContent.split('\n');
    const diffLines = unifiedDiffText.split('\n');
    const resultLines = [];
    
    let currentOriginalIndex = 0; // Pointer for originalLines
    
    for (const diffLine of diffLines) {
        console.log(`Processing diffLine: "${diffLine}" (currentOriginalIndex: ${currentOriginalIndex})`); // <--- LAVANZARO'S LOGGING!

        if (diffLine.startsWith('---') || diffLine.startsWith('+++')) {
            continue;
        }
        
        if (diffLine.startsWith('@@')) {
            const match = diffLine.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                const originalHunkStart = parseInt(match[1]) - 1; // 0-indexed
                
                // Add lines from original that are *before* this hunk
                while (currentOriginalIndex < originalHunkStart) {
                    if (currentOriginalIndex < originalLines.length) { // Safety check
                        resultLines.push(originalLines[currentOriginalIndex]);
                        console.log(`  Added original context line (before hunk): ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
                    } else {
                        console.warn("applyUnifiedDiff: Attempted to add original line beyond file bounds before hunk:", currentOriginalIndex); // <--- LAVANZARO'S LOGGING!
                    }
                    currentOriginalIndex++;
                }
            }
            continue;
        }
        
        if (diffLine.startsWith('-')) {
            // Line removed. Just advance original index.
            console.log(`  Removed line (original): ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
            currentOriginalIndex++;
        } else if (diffLine.startsWith('+')) {
            // Line added. Add to result.
            resultLines.push(diffLine.substring(1));
            console.log(`  Added new line: ${diffLine.substring(1)}`); // <--- LAVANZARO'S LOGGING!
        } else if (diffLine.startsWith(' ')) {
            // Context line. Add from original and advance both.
            if (currentOriginalIndex < originalLines.length) {
                resultLines.push(originalLines[currentOriginalIndex]);
                console.log(`  Added unchanged context line: ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
                currentOriginalIndex++;
            } else {
                console.warn("applyUnifiedDiff: Context line references beyond original content, ignoring:", diffLine); // <--- LAVANZARO'S LOGGING!
            }
        }
        console.log(`  resultLines length: ${resultLines.length}`); // <--- LAVANZARO'S LOGGING!
    }
    
    // Add any remaining lines from the original content after the last hunk
    while (currentOriginalIndex < originalLines.length) {
        resultLines.push(originalLines[currentOriginalIndex]);
        console.log(`Adding remaining original line: ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
        currentOriginalIndex++;
    }
    
    const newContent = resultLines.join('\n');
    console.log('New Content (first 10 lines):\n', newContent.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!
    console.log('--- applyUnifiedDiff END ---'); // <--- LAVANZARO'S LOGGING!
    return newContent;
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
    useEffect(() => {
        if (currentPath) {
            localStorage.setItem(LAST_ACTIVE_PATH_KEY, currentPath);
        }
    }, [currentPath]);

    

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
                    if (dataContent === '[DONE]') return;
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


   
   
    useEffect(() => {
        if (activeConversationId) {
            localStorage.setItem(LAST_ACTIVE_CONVO_ID_KEY, activeConversationId);
        } else {
            localStorage.removeItem(LAST_ACTIVE_CONVO_ID_KEY);
        }
    }, [activeConversationId]);    





    


    const startNewConversationWithNpc = async (npc) => {
        try {
            const newConversation = await createNewConversation();
            if (newConversation) {
               
                setCurrentNPC(npc.name);
                
               
                setMessages([{ 
                    role: 'assistant', 
                    content: `Hello, I'm ${npc.name}. ${npc.primary_directive}`, 
                    timestamp: new Date().toISOString(), 
                    npc: npc.name,
                    model: npc.model || currentModel
                }]);
            }
        } catch (error) {
            console.error('Error starting conversation with NPC:', error);
            setError(error.message);
        }
    };

    useEffect(() => {
        window.api.onShowMacroInput(() => {
            setIsMacroInputOpen(true);
            setMacroText('');
        });
    }, []);

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

    const handleImagesClick = () => {
        setPhotoViewerType('images');
        setPhotoViewerOpen(true);
    };

    const handleScreenshotsClick = () => {
        setPhotoViewerType('screenshots');
        setPhotoViewerOpen(true);
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
    
            const activeExists = formattedConversations.some(c => c.id === currentActiveId);
    
            if (!activeExists && initialLoadComplete.current) {
                if (formattedConversations.length > 0) {
                    await handleConversationSelect(formattedConversations[0].id);
                } else {
                    await createNewConversation();
                }
            } else if (!currentActiveId && formattedConversations.length > 0 && initialLoadComplete.current) {
                 await handleConversationSelect(formattedConversations[0].id);
            } else if (!currentActiveId && formattedConversations.length === 0 && initialLoadComplete.current) {
                 await createNewConversation();
            }
    
        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(err.message);
            setDirectoryConversations([]);
             if (!activeConversationId && initialLoadComplete.current) {
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

       
        await loadDirectoryStructure(currentPath);

       
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

                            
            const hasExistingWorkspace = rootLayoutNode && Object.keys(contentDataRef.current).length > 0;
            const isLoadingWorkspaceForPath = isLoadingWorkspace; 

            if (!hasExistingWorkspace && !isLoadingWorkspaceForPath) {
                if (targetConvoId && currentConversations.find(c => c.id === targetConvoId)) {
                    console.log('Selecting stored conversation:', targetConvoId);
                    await handleConversationSelect(targetConvoId, false, false); // Allow pane update
                } else if (currentConversations.length > 0) {
                    console.log('Selecting first conversation:', currentConversations[0].id);
                    await handleConversationSelect(currentConversations[0].id, false, false); // Allow pane update
                } else {
                    console.log('Creating new conversation - none found');
                    await createNewConversation();
                }
            } else {
                if (targetConvoId && currentConversations.find(c => c.id === targetConvoId)) {
                    console.log('Setting active conversation without overriding workspace:', targetConvoId);
                    await handleConversationSelect(targetConvoId, false, true); // Skip pane update
                }
                console.log('Skipping conversation selection - workspace was restored or is being restored');
            }


        setLoading(false);
    };



    initApplicationData();
}, [currentPath, config]);    

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

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsHovering(false);
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

    
   
    const handleFileUpload = async (files) => {
        console.log('handleFileUpload called with:', files);
        const existingFileNames = new Set(uploadedFiles.map(f => f.name));
        const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));
        
        const attachmentData = [];
        
        for (const file of newFiles) {
            console.log(`Processing file: ${file.name}`, {
                hasPath: !!file.path,
                path: file.path,
                type: file.type,
                size: file.size
            });
            
            try {
                if (file.path) {
                   
                    attachmentData.push({
                        id: generateId(), 
                        name: file.name, 
                        type: file.type, 
                        path: file.path,
                        size: file.size, 
                        preview: file.type.startsWith('image/') ? `file://${file.path}` : null
                    });
                    console.log(`Added file with path: ${file.path}`);
                } else {
                   
                    console.log(`No path property found, converting ${file.name} to base64...`);
                    const base64Data = await convertFileToBase64(file);
                    attachmentData.push({
                        id: generateId(),
                        name: file.name,
                        type: file.type,
                        data: base64Data,
                        size: file.size,
                        preview: file.type.startsWith('image/') ? `data:${file.type};base64,${base64Data}` : null
                    });
                    console.log(`Added file with base64 data: ${file.name}`);
                }
            } catch (error) {
                console.error(`Failed to process file ${file.name}:`, error);
               
                attachmentData.push({
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    error: `Failed to process: ${error.message}`,
                    size: file.size,
                    preview: null
                });
            }
        }
        
        if (attachmentData.length > 0) {
            console.log('Adding attachment data:', attachmentData);
            setUploadedFiles(prev => [...prev, ...attachmentData]);
        }
    };


    const handleFileInput = async (event) => {
        try {
            const fileData = await window.api.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
                    { name: 'Documents', extensions: ['pdf', 'txt', 'md'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (fileData && fileData.length > 0) {
                const existingFileNames = new Set(uploadedFiles.map(f => f.name));
                const newFiles = fileData.filter(file => !existingFileNames.has(file.name));
                
                const attachmentData = newFiles.map(file => ({
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
        
       
        if (event && event.target) {
            event.target.value = null;
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
                        toolCalls = parsed.tool_calls || null;
                    }
                } else { content = chunk; }
            } else if (chunk?.choices) {
                isDecision = chunk.choices[0]?.delta?.role === 'decision';
                content = chunk.choices[0]?.delta?.content || '';
                reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
                toolCalls = chunk.tool_calls || null;
            }

           
            const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === incomingStreamId);
            if (msgIndex !== -1) {
                const message = paneData.chatMessages.allMessages[msgIndex];
                message.role = isDecision ? 'decision' : 'assistant';
                message.content = (message.content || '') + content;
                message.reasoningContent = (message.reasoningContent || '') + reasoningContent;
                if (toolCalls) {
                    message.toolCalls = (message.toolCalls || []).concat(toolCalls);
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
const getConversationStats = (messages) => {
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
    }, { tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set() });

    return {
        messageCount: messages.length,
        ...stats
    };
};


const handleSummarizeAndStart = async () => {
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

           
            const newConversation = await createNewConversation();
            if (!newConversation) {
                throw new Error('Failed to create a new conversation for the summary.');
            }

           
            setActiveConversationId(newConversation.id);
            setCurrentConversation(newConversation);
            setMessages([]);
            setAllMessages([]);
            setDisplayedMessageCount(10);

           
            const newStreamId = generateId();
            streamIdRef.current = newStreamId;
            setIsStreaming(true);

            const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);

            const userMessage = {
                id: generateId(),
                role: 'user',
                content: fullPrompt,
                timestamp: new Date().toISOString(),
                type: 'message'
            };

            const assistantPlaceholderMessage = {
                id: newStreamId,
                role: 'assistant',
                content: '',
                reasoningContent: '',
                toolCalls: [],
                timestamp: new Date().toISOString(),
                streamId: newStreamId,
                model: currentModel,
                npc: currentNPC
            };

            setMessages([userMessage, assistantPlaceholderMessage]);
            setAllMessages([userMessage, assistantPlaceholderMessage]);
            
           
            await window.api.executeCommandStream({
                commandstr: fullPrompt,
                currentPath,
                conversationId: newConversation.id,
                model: currentModel,
                provider: currentProvider, 
                npc: selectedNpc ? selectedNpc.name : currentNPC,
                npcSource: selectedNpc ? selectedNpc.source : 'global',
                attachments: [],
                streamId: newStreamId
            });

        } catch (err) {
            console.error('Error summarizing and starting new conversation:', err);
            setError(err.message);
            setIsStreaming(false);
            streamIdRef.current = null;
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

        if (!activeConversationId) {
            await createNewConversation();
        }

        setInput(fullPrompt);
        
    } catch (err) {
        console.error('Error summarizing conversations for draft:', err);
        setError(err.message);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSummarizeAndPrompt = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    setPromptModal({
        isOpen: true,
        title: 'Custom Summary Prompt',
        message: `Enter a custom prompt for summarizing these ${selectedIds.length} conversation(s):`,
        defaultValue: 'Provide a detailed analysis of the key themes and insights from these conversations',
        onConfirm: async (customPrompt) => {
            try {
                const convosContentPromises = selectedIds.map(async (id, index) => {
                    const messages = await window.api.getConversationMessages(id);
                    if (!Array.isArray(messages)) {
                        return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
                    }
                    const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
                    return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
                });
                const convosContent = await Promise.all(convosContentPromises);
                
                const fullPrompt = `${customPrompt}\n\nConversations to analyze:\n\n` + convosContent.join('\n\n');

                const { conversation: newConversation, paneId: newPaneId } = await createNewConversation(true);
                if (!newConversation || !newPaneId) {
                    throw new Error('Failed to create new conversation');
                }

                const paneData = contentDataRef.current[newPaneId];
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
                    streamId: newStreamId
                });

            } catch (err) {
                console.error('Error processing custom summary:', err);
                setError(err.message);
                setIsStreaming(false);
            } finally {
                setSelectedConvos(new Set());
            }
        }
    });
};
// In ChatInterface.jsx

const renderSidebarItemContextMenu = () => {
    if (!sidebarItemContextMenuPos) return null;
    const { x, y, path, type } = sidebarItemContextMenuPos;
    if (type !== 'file') return null;

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



const renderSidebar = () => {
    // All these hooks MUST be called every render, regardless of collapsed state
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

    // Single return statement with conditional rendering inside
    return (
        <div className={`border-r theme-border flex flex-col flex-shrink-0 theme-sidebar ${sidebarCollapsed ? 'w-8' : 'w-64'}`}>
            {/* Always render this structure but hide sections when collapsed */}
            
            {/* Header - hidden when collapsed */}
            <div className={`p-4 border-b theme-border flex items-center justify-between flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`} 
                  style={{ WebkitAppRegion: 'drag' }}>
                <span className="text-sm font-semibold theme-text-primary">NPC Studio</span>
                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button onClick={() => setSettingsOpen(true)} className="p-2 theme-button theme-hover rounded-full transition-all" aria-label="Settings"><Settings size={14} /></button>

                    <div className="relative group">
                        <div className="flex">
                            <button onClick={createNewConversation} className="p-2 theme-button-primary rounded-full flex items-center gap-1 transition-all" aria-label="New Conversation">
                                <Plus size={14} />
                                <ChevronRight size={10} className="transform rotate-90 opacity-60" />
                            </button>
                        </div>
                        
                        <div className="absolute left-0 top-full mt-1 theme-bg-secondary border theme-border rounded shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-all duration-150">
                            <button onClick={createNewConversation} className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs">
                                <MessageSquare size={12} />
                                <span>New Conversation</span>
                            </button>
                            <button onClick={handleCreateNewFolder} className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs">
                                <Folder size={12} />
                                <span>New Folder</span>
                            </button>
                            <button onClick={() => setBrowserUrlDialogOpen(true)} className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs">
                                <Globe size={12} />
                                <span>New Browser</span>
                            </button>
                            <button onClick={createNewTextFile} className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs">
                                <FileText size={12} />
                                <span>New Text File</span>
                            </button>
                            <button onClick={createNewTerminal} className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs">
                                <Terminal size={12} />
                                <span>New Terminal</span>
                            </button>
                            <button 
                                onClick={() => {
                                    if (window.api && window.api.openNewWindow) {
                                        window.api.openNewWindow(currentPath);
                                    } else {
                                        window.open(window.location.href, '_blank');
                                    }
                                }}
                                className="p-2 theme-button theme-hover rounded-full transition-all" 
                                aria-label="Open New NPC Studio Window"
                                title="Open New NPC Studio Window"
                            >
                                <Plus size={14} /> 
                            </button>
                        </div>
                    </div>
                    
                    <button className="theme-toggle-btn p-1" onClick={toggleTheme}>{isDarkMode ? '🌙' : '☀️'}</button>
                </div>
            </div>

            {/* Path navigation - hidden when collapsed */}
            <div className={`p-2 border-b theme-border flex items-center gap-2 flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
                <button onClick={goUpDirectory} className="p-2 theme-hover rounded-full transition-all" title="Go Up" aria-label="Go Up Directory"><ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "theme-text-secondary"}/></button>
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
                            className="text-xs theme-text-muted theme-input border rounded px-2 py-1 flex-1"
                        />
                    ) : (
                    <div 
                        onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }} 
                        className="text-xs theme-text-muted overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer theme-hover px-2 py-1 rounded flex-1" 
                        title={currentPath}
                    >
                        {currentPath || '...'}
                    </div>
                )}
            </div>
            
            {/* Search - hidden when collapsed */}
            <div className={`p-2 border-b theme-border flex flex-col gap-2 flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2">
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (isGlobalSearch) {
                                handleSearchSubmit();
                            }
                        }
                    }}
                    placeholder={getPlaceholderText()}
                    className="flex-grow theme-input text-xs rounded px-2 py-1 border focus:outline-none"
                />
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setIsSearching(false);
                            setDeepSearchResults([]);
                            setMessageSearchResults([]);
                        }}
                        className="p-2 theme-hover rounded-full transition-all"
                        aria-label="Clear Search"
                    >
                        <X size={14} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Main content area - use flex-1 or fixed height to push buttons to bottom */}
            <div className={`flex-1 overflow-y-auto px-2 py-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
                {loading ? (
                    <div className="p-4 theme-text-muted">Loading...</div>
                ) : isSearching ? (
                    renderSearchResults()
                ) : (
                    <>
                        {renderFolderList(folderStructure)}
                        {renderConversationList(directoryConversations)}
                    </>
                )}
                {contextMenuPos && renderContextMenu()}
                {sidebarItemContextMenuPos && renderSidebarItemContextMenu()}
                {fileContextMenuPos && renderFileContextMenu()}
            </div>
            
            {/* When collapsed, show spacer to push button to bottom */}
            {sidebarCollapsed && <div className="flex-1"></div>}
            
            {/* Window indicators - hidden when collapsed */}
            <div className={sidebarCollapsed ? 'hidden' : ''}>
                {renderActiveWindowsIndicator()}
                {renderWorkspaceIndicator()}
            </div>

            {/* Delete button - hidden when collapsed */}
            <div className={`flex justify-center ${sidebarCollapsed ? 'hidden' : ''}`}>
                <button
                    onClick={deleteSelectedConversations}
                    className="p-2 theme-hover rounded-full text-red-400 transition-all"
                    title="Delete selected items"
                >
                    <Trash size={24} />
                </button>
            </div>
            
            {/* Bottom actions - always shown, collapse button always at bottom */}
            <div className="p-4 border-t theme-border flex-shrink-0">
                <div className="flex gap-2 justify-center">
                    {!sidebarCollapsed && (
                        <>
                            <button onClick={() => setPhotoViewerOpen(true)} className="p-2 theme-hover rounded-full transition-all" aria-label="Open Photo Viewer">
                                <Image size={16} />
                            </button>
                            <button onClick={() => setDashboardMenuOpen(true)} className="p-2 theme-hover rounded-full transition-all" aria-label="Open Dashboard"><BarChart3 size={16} /></button>
                            <button onClick={() => setJinxMenuOpen(true)} className="p-2 theme-hover rounded-full transition-all" aria-label="Open Jinx Menu"><Wrench size={16} /></button>
                            <button onClick={() => setCtxEditorOpen(true)} className="p-2 theme-hover rounded-full transition-all" aria-label="Open Context Editor">
                                <FileJson size={16} />
                            </button>
                            <button onClick={handleOpenNpcTeamMenu} className="p-2 theme-hover rounded-full transition-all" aria-label="Open NPC Team Menu"><Users size={16} /></button>
                        </>
                    )}
                    <button 
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                        className="p-2 theme-button theme-hover rounded-full transition-all group" 
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <div className="flex items-center gap-1 group-hover:gap-0 transition-all duration-200">
                            <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                            <ChevronRight size={14} className={`transform ${sidebarCollapsed ? '' : 'rotate-180'} group-hover:scale-75 transition-all duration-200`} />
                            <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
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
        <div className="flex items-center justify-between px-4 py-2 mt-4">
            <div className="text-xs text-gray-500 font-medium">Files and Folders</div>
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshFilesAndFolders();
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title="Refresh file and folder list"
                >
                    {/* Refresh icon SVG */}
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
        // Show only current file button when collapsed
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

    // Recursive renderer for folders and files
    const renderFolderContents = (currentStructure, parentPath = '') => {
        if (!currentStructure) return null;

        // Normalize children: accept array or object
        let items = [];
        if (Array.isArray(currentStructure)) {
            items = currentStructure;
        } else if (typeof currentStructure === 'object') {
            items = Object.values(currentStructure);
        }

        // Sort: folders first, then files, alphabetically
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

            if (isFolder) {
                return (
                    <div key={fullPath} className="pl-4">
                        <button
                            onClick={() => {
                                setExpandedFolders(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(fullPath)) newSet.delete(fullPath);
                                    else newSet.add(fullPath);
                                    return newSet;
                                });
                            }}
                            onContextMenu={(e) => handleSidebarItemContextMenu(e, fullPath, 'directory')}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Click to expand/collapse ${name}`}
                        >
                            <Folder size={16} className="text-blue-400 flex-shrink-0" />
                            <span className="text-gray-300 truncate">{name}</span>
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
                                // Get file entries at this level for shift selection
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
                                // Update lastClickedFileIndex for shift selections
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
                        <span className="text-gray-300 truncate">{name}</span>
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
    const handleAttachFileClick = async () => {
        try {
            const fileData = await window.api.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
            });
            
            if (fileData && fileData.length > 0) {
                const existingFileNames = new Set(uploadedFiles.map(f => f.name));
                const newFiles = fileData.filter(file => !existingFileNames.has(file.name));
                
                const attachmentData = newFiles.map(file => ({
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

    const renderConversationList = (conversations) => {
        if (!conversations?.length) return null;
        
       
        const sortedConversations = [...conversations].sort((a, b) => {
            const aTimestamp = new Date(a.last_message_timestamp || a.timestamp).getTime();
            const bTimestamp = new Date(b.last_message_timestamp || b.timestamp).getTime();
            return bTimestamp - aTimestamp;
        });
        
       
        const header = (
            <div className="flex items-center justify-between px-4 py-2 mt-4">
                <div className="text-xs text-gray-500 font-medium">Conversations ({sortedConversations.length})</div>
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
    const handleResendMessage = (messageToResend) => {
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

const handleResendWithSettings = async (messageToResend, selectedModel, selectedNPC) => {
   
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
    let newStreamId = null;

    try {
       
        newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = activeContentPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === selectedNPC);

       
        const resentUserMessage = {
            id: generateId(),
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

       
        if (!activePaneData.chatMessages) {
             activePaneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
        }
        activePaneData.chatMessages.allMessages.push(resentUserMessage, assistantPlaceholderMessage);
        activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(-activePaneData.chatMessages.displayedMessageCount);

       
        setRootLayoutNode(prev => ({ ...prev }));

        const selectedModelObj = availableModels.find(m => m.value === selectedModel);
        const providerToUse = selectedModelObj ? selectedModelObj.provider : currentProvider;

       
        await window.api.executeCommandStream({
            commandstr: messageToResend.content,
            currentPath,
            conversationId: conversationId,
            model: selectedModel,
            provider: providerToUse,
            npc: selectedNpc ? selectedNpc.name : selectedNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: messageToResend.attachments?.map(att => ({
                name: att.name, path: att.path, size: att.size, type: att.type
            })) || [],
            streamId: newStreamId,
        });

    } catch (err) {
        console.error('Error resending message:', err);
        setError(err.message);
        
       
        if (activePaneData.chatMessages) {
            const msgIndex = activePaneData.chatMessages.allMessages.findIndex(m => m.id === newStreamId);
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

    const fetchTools = async (serverPath) => {
        if (!serverPath) {
            setAvailableMcpTools([]);
            setSelectedMcpTools([]);
            return;
        }
        try {
            // Include conversationId and currentNPC in the request
            const response = await window.api.getMcpTools(serverPath, activeConversationId, currentNPC); // <-- ADDED PARAMS
            if (response.tools && Array.isArray(response.tools)) {
                setAvailableMcpTools(response.tools.map(tool => tool.function.name));
            } else {
                setAvailableMcpTools([]);
            }
            setSelectedMcpTools([]);
        } catch (err) {
            console.error("Error fetching MCP tools:", err);
            setAvailableMcpTools([]);
            setSelectedMcpTools([]);
        }
    };



const renderInputArea = () => {
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
                            <button type="button" onClick={(e) => { handleInputSubmit(e); setIsInputExpanded(false); }} disabled={(!input.trim() && uploadedFiles.length === 0) || !activeConversationId} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
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
        <div className="px-4 pt-2 pb-3 border-t theme-border theme-bg-secondary flex-shrink-0">
            <div
                className="relative theme-bg-primary theme-border border rounded-lg group"
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
                {renderAttachmentThumbnails()}

                <div className="flex items-end p-2 gap-2 relative z-0">
                    <div className="flex-grow relative">
                        <textarea
                            ref={(el) => {
                                if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                                }
                            }}
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                            }}
                            onKeyDown={(e) => { if (!isStreaming && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }}
                            placeholder={isStreaming ? "Streaming response..." : "Type a message or drop files..."}
                            className={`w-full theme-input text-sm rounded-lg pl-4 pr-8 py-3 focus:outline-none border-0 min-h-[56px] max-h-[200px] resize-none ${isStreaming ? 'opacity-70 cursor-not-allowed' : ''}`}
                            rows={1}
                            style={{ overflowY: 'auto', lineHeight: '1.5' }}
                            disabled={isStreaming}
                        />
                         <button
                            type="button"
                            onClick={() => setIsInputExpanded(true)}
                            className="absolute top-2 right-2 p-1 theme-text-muted hover:theme-text-primary rounded-lg theme-hover opacity-50 group-hover:opacity-100 transition-opacity"
                            aria-label="Expand input"
                        >
                            <Maximize2 size={16} />
                        </button>
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
                        <button type="button" onClick={handleInputSubmit} disabled={(!input.trim() && uploadedFiles.length === 0) || !activeConversationId} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-[76px] h-[40px] self-end" >
                            <Send size={16}/>
                        </button>
                    )}
                </div>

                <div className={`flex items-center gap-2 px-2 pb-2 ${isStreaming ? 'opacity-50' : ''}`}>
                    <div className="flex theme-border border rounded-md p-0.5">
                        <div className="flex theme-border border rounded-md p-0.5">
                            <button onClick={() => setExecutionMode('chat')} className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${executionMode === 'chat' ? 'theme-button-primary' : 'theme-hover'}`}>
                                <div className="flex items-center gap-1"><MessageCircle size={12}/> Chat</div>
                            </button>
                            <button onClick={() => setExecutionMode('agent')} className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${executionMode === 'agent' ? 'theme-button-primary' : 'theme-hover'}`}>
                                <div className="flex items-center gap-1"><BrainCircuit size={12}/> Agent</div>
                            </button>
                            <button onClick={() => setExecutionMode('code')} className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${executionMode === 'code' ? 'theme-button-primary' : 'theme-hover'}`}>
                                <div className="flex items-center gap-1"><Code2 size={12}/> Code</div>
                            </button>
                        </div>

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
                        <button onClick={() => setShowAllModels(!showAllModels)} className="p-1 theme-hover rounded theme-text-muted" title={showAllModels ? "Show Favorites" : "Show All Models"}><ListFilter size={14} /></button>
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
                
                {executionMode === 'npcsh' && (
                    <div className="px-2 pb-2">
                        <select
                            multiple
                            value={selectedTools}
                            onChange={(e) => setSelectedTools(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full theme-input text-xs rounded px-2 py-1 border h-20"
                            disabled={isStreaming}
                            title="Select Jinxs for the NPC (Ctrl+Click for multiple)"
                        >
                            {availableJinxs.map(tool => (
                                <option key={tool.id} value={tool.id}>{tool.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                    {executionMode === 'corca' && (
                        <div className="flex-grow">
                            <input
                                type="text"
                                value={mcpServerPath}
                                onChange={(e) => setMcpServerPath(e.target.value)}
                                placeholder="MCP server path (optional)"
                                className="w-full theme-input text-xs rounded px-2 py-1 border"
                                disabled={isStreaming}
                            />
                        </div>
                    )}

            </div>
        </div>
    );
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

const renderAttachmentThumbnails = () => {
    if (uploadedFiles.length === 0) return null;
    return (
        <div className="px-2 pb-2">
            <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                    <div key={file.id} className="relative group">
                        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 border border-gray-600 min-w-0">
                            <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                                {file.preview ? 
                                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover rounded" /> : 
                                    getThumbnailIcon(file.name, file.type)}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs text-gray-300 truncate font-medium" title={file.name}>{file.name}</span>
                                <span className="text-xs text-gray-500">{file.size ? `${Math.round(file.size / 1024)} KB` : ''}</span>
                            </div>
                            <button
                                onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                                className="flex-shrink-0 p-1 hover:bg-gray-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove file"
                            >
                                <X size={14} className="text-gray-400" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};



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



            <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentPath={currentPath} onPathChange={(newPath) => { setCurrentPath(newPath); }}/>
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
                className="w-full h-24 theme-input border rounded p-2 mb-4 font-mono text-sm"
                defaultValue={promptModal.defaultValue}
                id="customPromptInput"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const value = document.getElementById('customPromptInput').value;
                        promptModal.onConfirm?.(value);
                        setPromptModal({ ...promptModal, isOpen: false });
                    }
                }}
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



        {renderPdfContextMenu()}
        {renderBrowserContextMenu()}
        

        {renderMessageContextMenu()}

            {isMacroInputOpen && (<MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({ macro, conversationId, result }) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }}/> )}
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

   
    const handleOpenNpcTeamMenu = () => {
        setNpcTeamMenuOpen(true);
    };

    const handleCloseNpcTeamMenu = () => {
        setNpcTeamMenuOpen(false);
    };

const handleSearchResultSelect = async (conversationId, searchTerm) => {
   
    await handleConversationSelect(conversationId);

    setTimeout(() => {
       
        setAllMessages(currentMessages => {
            const results = [];
            currentMessages.forEach((msg, index) => {
                if (msg.content && msg.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                    results.push({
                        messageId: msg.id || msg.timestamp,
                        index: index,
                        content: msg.content
                    });
                }
            });
            setMessageSearchResults(results);
            if (results.length > 0) {
                const firstResultId = results[0].messageId;
                setActiveSearchResult(firstResultId);

               
                setTimeout(() => {
                    const messageElement = document.getElementById(`message-${firstResultId}`);
                    if (messageElement) {
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
            return currentMessages;
        });
    }, 100);
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
    moveContentPane, // Pass the moveContentPane function
    createAndAddPaneNodeToLayout, // Pass the pane creation helper
    renderChatView, renderFileEditor, renderTerminalView, renderPdfViewer, renderBrowserViewer,
}), [
    rootLayoutNode,
    findNodeByPath, findNodePath, activeContentPaneId,
    draggedItem, dropTarget, updateContentPane, performSplit, closeContentPane,
    moveContentPane, createAndAddPaneNodeToLayout, // Ensure these are in the dependency array
    renderChatView, renderFileEditor, renderTerminalView, renderPdfViewer, renderBrowserViewer,
    setActiveContentPaneId, setDraggedItem, setDropTarget
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
</div>
            {renderModals()}
        </div>
    );
};

export default ChatInterface;
