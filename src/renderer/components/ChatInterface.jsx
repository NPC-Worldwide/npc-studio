 import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import {
    Folder, File, Globe, ChevronRight, ChevronLeft, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare,
    ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, 
    Send, BarChart3,Minimize2,  Maximize2, MessageCircle, BrainCircuit, Star, Origami,
    Clock, // Add Clock icon for cron jobs

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
// Add these to your lucide-react imports if not already there
// import { X, MessageSquare, Terminal, Globe, FileText, Code2, ListFilter, ArrowUp } from 'lucide-react';
// And also ensure getFileIcon is accessible, usually it's defined near the top.
const PaneHeader = memo(({
    nodeId,
    icon,
    title,
    children, // This is where extra buttons will be passed
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane,
    fileChanged,
    onSave,
    onStartRename
}) => {
    const nodePath = findNodePath(rootLayoutNode, nodeId);

    return (
        <div
            draggable="true"
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pane', id: nodeId, nodePath }));

                setTimeout(() => {
                    setDraggedItem({ type: 'pane', id: nodeId, nodePath });
                }, 0);
            }}
            onDragEnd={() => setDraggedItem(null)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaneContextMenu({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                    nodeId,
                    nodePath
                });
            }}
            className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary cursor-move"
        >
            <div className="flex justify-between items-center min-h-[28px] w-full">
                <div className="flex items-center gap-2 truncate min-w-0">
                    {icon}
                    <span
                        className="truncate font-semibold cursor-pointer hover:bg-gray-700 px-1 rounded"
                        title={title}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onStartRename) {
                                onStartRename();
                            }
                        }}
                    >
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {children} {/* This is where the extra buttons will render */}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            closeContentPane(nodeId, nodePath);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1 theme-hover rounded-full flex-shrink-0 transition-all hover:bg-red-500/20"
                        aria-label="Close pane"
                    >
                        <X size={14} className="hover:text-red-400" />
                    </button>
                </div>
            </div>
        </div>
    );
});

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
            updateContentPane, performSplit,
            renderChatView, renderFileEditor, renderTerminalView,
            renderPdfViewer, renderCsvViewer, renderDocxViewer, renderBrowserViewer,
            renderPptxViewer, renderLatexViewer,
            moveContentPane,
            findNodePath, rootLayoutNode, setPaneContextMenu, closeContentPane,
            // Destructure the new chat-specific props from component:
            autoScrollEnabled, setAutoScrollEnabled,
            messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
            conversationBranches, showBranchingUI, setShowBranchingUI,
        } = component;

        const isActive = node.id === activeContentPaneId;
        const isTargeted = dropTarget?.nodePath.join('') === path.join('');

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

            let contentType;
            if (draggedItem.type === 'conversation') {
                contentType = 'chat';
            } else if (draggedItem.type === 'file') {
                const ext = draggedItem.id.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') contentType = 'pdf';
                else if (['csv', 'xlsx', 'xls'].includes(ext)) contentType = 'csv';
                else if (['docx', 'doc'].includes(ext)) contentType = 'docx';
                else if (ext === 'pptx') contentType = 'pptx'; // Added
                else if (ext === 'tex') contentType = 'latex'; // Added
                else contentType = 'editor';
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

        const paneData = contentDataRef.current[node.id];
        const contentType = paneData?.contentType;
        const contentId = paneData?.contentId;

        // Determine icon and title for the PaneHeader
        let headerIcon = <File size={14} className="text-gray-400" />; // Default icon
        let headerTitle = 'Empty Pane';

        if (contentType === 'chat') {
            headerIcon = <MessageSquare size={14} />;
            headerTitle = `Conversation: ${contentId?.slice(-8) || 'None'}`;
        } else if (contentType === 'editor' && contentId) {
            headerIcon = getFileIcon(contentId); // Assuming getFileIcon is accessible
            headerTitle = contentId.split('/').pop();
        } else if (contentType === 'browser') {
            headerIcon = <Globe size={14} className="text-blue-400" />;
            headerTitle = paneData.browserTitle || paneData.browserUrl || 'Web Browser';
        } else if (contentType === 'terminal') {
            headerIcon = <Terminal size={14} />;
            headerTitle = 'Terminal';
        } else if (contentId) { // For other file types like PDF, CSV, DOCX, PPTX, LATEX
            headerIcon = getFileIcon(contentId);
            headerTitle = contentId.split('/').pop();
        }

        // Conditionally construct children for PaneHeader (chat-specific buttons)
        let paneHeaderChildren = null;
        if (contentType === 'chat') {
            paneHeaderChildren = (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); setAutoScrollEnabled(!autoScrollEnabled); }}
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
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMessageSelectionMode(); }}
                        className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${messageSelectionMode ? 'theme-button-primary' : 'theme-button theme-hover'}`}
                    >
                        <ListFilter size={14} />{messageSelectionMode ? `Exit (${selectedMessages.size})` : 'Select'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowBranchingUI(!showBranchingUI); }}
                        className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                            showBranchingUI ? 'theme-button-primary' : 'theme-button theme-hover'
                        }`}
                        title="Manage conversation branches"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="6" y1="3" x2="6" y2="15"></line>
                            <circle cx="18" cy="6" r="3"></circle>
                            <circle cx="6" cy="18" r="3"></circle>
                            <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                        {conversationBranches.size > 0 && `(${conversationBranches.size})`}
                    </button>
                </>
            );
        }

        const renderPaneContent = () => { // Renamed from renderContent to avoid confusion
            console.log('[RENDER_CONTENT] NodeId:', node.id, 'ContentType:', contentType);

            switch (contentType) {
                case 'chat':
                    return renderChatView({ nodeId: node.id });
                case 'editor':
                    return renderFileEditor({ nodeId: node.id });
                case 'terminal':
                    return renderTerminalView({ nodeId: node.id });
                case 'pdf':
                    return renderPdfViewer({ nodeId: node.id });
                case 'csv':
                    return renderCsvViewer({ nodeId: node.id });
                case 'docx':
                    return renderDocxViewer({ nodeId: node.id });
                case 'browser':
                    return renderBrowserViewer({ nodeId: node.id });
                case 'pptx':
                    return renderPptxViewer({ nodeId: node.id });
                case 'latex':
                    return renderLatexViewer({ nodeId: node.id });
                default:
                    // This is the content for an empty pane
                    return (
                        <div className="flex-1 flex items-center justify-center theme-text-muted">
                            <div className="text-center">
                                <div className="text-lg mb-2">Empty Pane</div>
                                <div className="text-sm">Drag content here or close this pane</div>
                            </div>
                        </div>
                    );
            }
        };

        return (
            <div
                className={`flex-1 flex flex-col relative border ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : 'theme-border'}`}
                onClick={() => setActiveContentPaneId(node.id)}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'center' }); }}
                onDrop={(e) => onDrop(e, 'center')}
            >
                {/* ALWAYS render PaneHeader here */}
                <PaneHeader
                    nodeId={node.id}
                    icon={headerIcon}
                    title={headerTitle}
                    findNodePath={findNodePath}
                    rootLayoutNode={rootLayoutNode}
                    setDraggedItem={setDraggedItem}
                    setPaneContextMenu={setPaneContextMenu}
                    closeContentPane={closeContentPane}
                    fileChanged={paneData?.fileChanged} // Only relevant for editor panes
                    onSave={() => { /* No-op, actual save logic is in renderFileEditor */ }}
                    onStartRename={() => { /* No-op, actual rename logic is in renderFileEditor */ }}
                >
                    {paneHeaderChildren} {/* Pass the conditional children here */}
                </PaneHeader>

                {draggedItem && (
                    <>
                        <div className={`absolute left-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'left' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'left' }); }} onDrop={(e) => onDrop(e, 'left')} />
                        <div className={`absolute right-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'right' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'right' }); }} onDrop={(e) => onDrop(e, 'right')} />
                        <div className={`absolute left-0 top-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'top' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'top' }); }} onDrop={(e) => onDrop(e, 'top')} />
                        <div className={`absolute left-0 bottom-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'bottom' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'bottom' }); }} onDrop={(e) => onDrop(e, 'bottom')} />
                    </>
                )}
                {renderPaneContent()} {/* Render the actual content below the header */}
            </div>
        );
    }
    return null;
});

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
    onResendMessage,
    onCreateBranch,
    messageIndex
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
            
            {/* Branch button */}
            {message.role === 'user' && !messageSelectionMode && onCreateBranch && (
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateBranch(messageIndex);
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title="Create branch from here"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="6" y1="3" x2="6" y2="15"></line>
                            <circle cx="18" cy="6" r="3"></circle>
                            <circle cx="6" cy="18" r="3"></circle>
                            <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                    </button>
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

            {/* Rest of message content... */}
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
    const [gitPanelCollapsed, setGitPanelCollapsed] = useState(true); // <--- NEW STATE: Default to collapsed
const [pdfHighlightsTrigger, setPdfHighlightsTrigger] = useState(0);
const [conversationBranches, setConversationBranches] = useState(new Map());
const [currentBranchId, setCurrentBranchId] = useState('main');
const [showBranchingUI, setShowBranchingUI] = useState(false);


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

const renderWebsiteList = () => {
    const header = (
        <div className="flex items-center justify-between px-4 py-2 mt-4">
            <div className="text-xs text-gray-500 font-medium">Websites</div>
            <div className="flex items-center gap-1">
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
      
// At the top of the component, change how windowId is generated
const [windowId] = useState(() => {
    // Try to get existing window ID from sessionStorage (persists across refreshes in same window)
    let id = sessionStorage.getItem('npcStudioWindowId');
    
    if (!id) {
        // Generate new ID only if this is truly a new window
        id = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('npcStudioWindowId', id);
    }
    
    console.log('[WINDOW_ID] Using window ID:', id);
    return id;
});

    const WINDOW_WORKSPACES_KEY = 'npcStudioWindowWorkspaces';


    const [localSearch, setLocalSearch] = useState({
        isActive: false,
        term: '',
        paneId: null,
        results: [],
        currentIndex: -1
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
    const [rootLayoutNode, setRootLayoutNode] = useState(null);
   
    const [activeContentPaneId, setActiveContentPaneId] = useState(null);
    
        const createBranchPoint = useCallback((fromMessageIndex) => {
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) return;

    const branchId = generateId();
    const branchPoint = {
        id: branchId,
        parentBranch: currentBranchId,
        branchFromIndex: fromMessageIndex,
        messages: [...activePaneData.chatMessages.allMessages.slice(0, fromMessageIndex + 1)],
        createdAt: Date.now(),
        name: `Branch ${conversationBranches.size + 1}`
    };

    setConversationBranches(prev => new Map(prev).set(branchId, branchPoint));
    setCurrentBranchId(branchId);

    // Update the pane to show branched messages
    activePaneData.chatMessages.allMessages = branchPoint.messages;
    activePaneData.chatMessages.messages = branchPoint.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
    setRootLayoutNode(prev => ({ ...prev }));

}, [activeContentPaneId, currentBranchId, conversationBranches]);

// Add function to switch branches
const switchToBranch = useCallback((branchId) => {
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) return;

    const branch = conversationBranches.get(branchId);
    if (!branch) return;

    setCurrentBranchId(branchId);
    activePaneData.chatMessages.allMessages = [...branch.messages];
    activePaneData.chatMessages.messages = branch.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
    setRootLayoutNode(prev => ({ ...prev }));
}, [activeContentPaneId, conversationBranches]);

// Add UI component for branching visualization
const BranchingUI = () => {
    if (!showBranchingUI) return null;

    const branches = Array.from(conversationBranches.values());

    return (
        <div className="fixed top-4 right-4 theme-bg-secondary border theme-border rounded-lg shadow-xl p-4 z-50 max-w-md">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Conversation Branches</h3>
                <button
                    onClick={() => setShowBranchingUI(false)}
                    className="p-1 theme-hover rounded-full"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Main branch */}
                <button
                    onClick={() => switchToBranch('main')}
                    className={`w-full p-2 rounded text-left transition-all ${
                        currentBranchId === 'main' 
                            ? 'theme-button-primary' 
                            : 'theme-hover'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-medium">Main Branch</span>
                    </div>
                </button>

                {/* Other branches */}
                {branches.map(branch => (
                    <button
                        key={branch.id}
                        onClick={() => switchToBranch(branch.id)}
                        className={`w-full p-2 rounded text-left transition-all ${
                            currentBranchId === branch.id 
                                ? 'theme-button-primary' 
                                : 'theme-hover'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="flex-1">
                                <div className="font-medium">{branch.name}</div>
                                <div className="text-xs theme-text-muted">
                                    {branch.messages.length} messages • {new Date(branch.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t theme-border text-xs theme-text-muted">
                Current: {currentBranchId === 'main' ? 'Main Branch' : conversationBranches.get(currentBranchId)?.name}
            </div>
        </div>
    );
};

const loadPdfHighlightsForActivePane = useCallback(async () => {
    console.log('[LOAD_HIGHLIGHTS] Starting load for pane:', activeContentPaneId);
    
    if (activeContentPaneId) {
        const paneData = contentDataRef.current[activeContentPaneId];
        console.log('[LOAD_HIGHLIGHTS] Pane data:', paneData);
        
        if (paneData && paneData.contentType === 'pdf') {
            console.log('[LOAD_HIGHLIGHTS] Fetching highlights for:', paneData.contentId);
            
            const response = await window.api.getHighlightsForFile(paneData.contentId);
            console.log('[LOAD_HIGHLIGHTS] Response:', response);
            
            if (response.highlights) {
                console.log('[LOAD_HIGHLIGHTS] Raw highlights count:', response.highlights.length);
                
                const transformedHighlights = response.highlights.map(h => {
                    console.log('[LOAD_HIGHLIGHTS] Transforming highlight:', h);
                    
                    const positionObject = typeof h.position === 'string' 
                        ? JSON.parse(h.position) 
                        : h.position;

                    return {
                        id: h.id,
                        position: positionObject,
                        content: {
                            text: h.highlighted_text,
                            annotation: h.annotation || ''
                        }
                    };
                });
                
                console.log('[LOAD_HIGHLIGHTS] Setting highlights:', transformedHighlights);
                setPdfHighlights(transformedHighlights);
            } else {
                console.log('[LOAD_HIGHLIGHTS] No highlights in response');
                setPdfHighlights([]);
            }
        } else {
            console.log('[LOAD_HIGHLIGHTS] Not a PDF pane or no pane data');
            setPdfHighlights([]);
        }
    } else {
        console.log('[LOAD_HIGHLIGHTS] No active content pane');
    }
}, [activeContentPaneId]);

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
    if (!layoutNode) {
        // If layoutNode is null, ensure contentData is also empty
        if (Object.keys(contentData).length > 0) {
            console.log('[SYNC] Layout node is null, clearing contentData.');
            for (const key in contentData) {
                delete contentData[key];
            }
        }
        return null; // Return null if the layout itself is null
    }

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
    const contentDataIds = new Set(Object.keys(contentData));

    // 1. Remove orphaned panes from contentData (not in layout)
    contentDataIds.forEach(id => {
        if (!paneIdsInLayout.has(id)) {
            console.warn('[SYNC] Removing orphaned pane from contentData:', id);
            delete contentData[id];
        }
    });

    // 2. Add missing panes to contentData (in layout but not in contentData)
    paneIdsInLayout.forEach(id => {
        if (!contentData.hasOwnProperty(id)) { // Use hasOwnProperty to check for actual property
            console.warn('[SYNC] Adding missing pane to contentData:', id);
            contentData[id] = {}; // Initialize with an empty object
        }
    });

    return layoutNode;
}, []);
    const updateContentPane = useCallback(async (paneId, newContentType, newContentId, skipMessageLoad = false) => {
  // Verify this paneId exists in the layout tree
  const paneExistsInLayout = (node, targetId) => {
    if (!node) return false;
    if (node.type === 'content' && node.id === targetId) return true;
    if (node.type === 'split') {
      return node.children.some(child => paneExistsInLayout(child, targetId));
    }
    return false;
  };

  if (!paneExistsInLayout(rootLayoutNodeRef.current, paneId)) {
    console.warn(`[updateContentPane] Pane ${paneId} not found in layout tree yet, waiting...`);
    // Don't abort - the layout update might be pending
  }

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
    const [showAllModels, setShowAllModels] = useState(true); // Change default to true


    const [availableJinxs, setAvailableJinxs] = useState({
        code: [],
        modes: [],
        utils: []
    });

    const [selectedJinx, setSelectedJinx] = useState(null);
    const [jinxLoadingError, setJinxLoadingError] = useState(null); // This already exists
    
    const [jinxInputValues, setJinxInputValues] = useState({}); // Stores { jinxName: { inputName: value, ... }, ... }

   
    const [jinxInputs, setJinxInputs] = useState({});

// In ChatInterface.jsx, update the useEffect that fetches Jinxs
useEffect(() => {
    const fetchJinxs = async () => {
        try {
            const [projectResponse, globalResponse] = await Promise.all([
                window.api.getJinxsProject(currentPath), // Correct function name
                window.api.getJinxsGlobal() // Correct function name
            ]);

            // Backend now returns { code: [], modes: [], utils: [] }
            const combined = {
                code: [
                    ...(projectResponse.code || []),
                    ...(globalResponse.code || [])
                ],
                modes: [
                    ...(projectResponse.modes || []),
                    ...(globalResponse.modes || [])
                ],
                utils: [
                    ...(projectResponse.utils || []),
                    ...(globalResponse.utils || [])
                ]
            };

            setAvailableJinxs(combined);
        } catch (err) {
            console.error('Error fetching jinxs:', err);
            setJinxLoadingError(err.message);
        }
    };

    fetchJinxs();
}, [currentPath]);
    
const executionModes = useMemo(() => {
    const modes = [
        { id: 'chat', name: 'Chat', icon: MessageCircle, builtin: true }
    ];
    
    // Now availableJinxs is an object with code, modes, utils arrays
    const allJinxs = [
        ...(availableJinxs.code || []),
        ...(availableJinxs.modes || []),
        ...(availableJinxs.utils || [])
    ];
    
    allJinxs.forEach(jinx => {
        modes.push({
            id: jinx.name,
            name: jinx.display_name || jinx.name,
            icon: Wrench,
            jinx: jinx,
            builtin: false
        });
    });
    
    return modes;
}, [availableJinxs]);


useEffect(() => {
    if (selectedJinx) {
        setJinxInputValues(prev => {
            const currentJinxValues = prev[selectedJinx.name] || {};
            const newJinxValues = { ...currentJinxValues };

            // Ensure all inputs defined by the jinx have an entry in currentJinxValues
            selectedJinx.inputs.forEach(inputDef => {
                const inputName = Object.keys(inputDef)[0];
                if (newJinxValues[inputName] === undefined) {
                    newJinxValues[inputName] = inputDef[inputName] || ''; // Use default from jinx definition
                }
            });
            return { ...prev, [selectedJinx.name]: newJinxValues };
        });
    }
}, [selectedJinx]);

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
    // If no favorites are set, always show all models
    if (favoriteModels.size === 0) {
        return availableModels;
    }
    
    // If showing all or no favorites exist, show all
    if (showAllModels) {
        return availableModels;
    }
    
    // Filter to favorites
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
    
    // Capture any selected text from the window
    const selectedText = window.getSelection()?.toString() || '';
    
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
    
    // Store selected text in context menu position state
    setMessageContextMenuPos({ x: e.clientX, y: e.clientY, messageId, selectedText });
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


const [pdfSelectionIndicator, setPdfSelectionIndicator] = useState(null);

const handlePdfTextSelect = (selectionEvent) => {
    console.log('[PDF_SELECT] handlePdfTextSelect called:', selectionEvent);
    
    if (selectionEvent?.selectedText?.trim()) {
        console.log('[PDF_SELECT] Setting selectedPdfText:', {
            text: selectionEvent.selectedText.substring(0, 50),
            length: selectionEvent.selectedText.length
        });
        
        setSelectedPdfText({
            text: selectionEvent.selectedText,
            position: {
                pageIndex: selectionEvent.pageIndex || 0,
                quads: selectionEvent.quads || []
            }
        });
        
        // Add visual indicator that text is selected
        setPdfSelectionIndicator({
            text: selectionEvent.selectedText.substring(0, 100),
            timestamp: Date.now()
        });
        
        // Clear indicator after 2 seconds
        setTimeout(() => {
            if (Date.now() - selectionEvent.timestamp < 2100) {
                setPdfSelectionIndicator(null);
            }
        }, 2000);
    } else {
        console.log('[PDF_SELECT] Clearing selectedPdfText');
        setSelectedPdfText(null);
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
    const { text, position } = selectedPdfText;

    try {
        // LOGGING: See what is being sent
        console.log('[SAVE HIGHLIGHT] Sending data:', { filePath, text, position });

        const saveResult = await window.api.addPdfHighlight({
            filePath,
            text,
            position: position, // FIX: Send the raw position object, NOT a string
            annotation: ''
        });

        if (saveResult.success) {
            console.log('[PDF] Highlight saved successfully');
            await loadPdfHighlightsForActivePane();
        } else {
            console.error('[PDF] Failed to save highlight:', saveResult.error);
        }
    } catch (err) {
        console.error('[PDF] Error saving highlight:', err);
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
    loadPdfHighlightsForActivePane();
}, [activeContentPaneId, pdfHighlightsTrigger, loadPdfHighlightsForActivePane]);


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
  
  
const closeContentPane = useCallback((paneId, nodePath) => {
    console.log(`[closeContentPane] Attempting to close pane: ${paneId} with path:`, nodePath);
    console.log(`[closeContentPane] Current rootLayoutNode before update:`, JSON.stringify(rootLayoutNode));
    console.log(`[closeContentPane] Current contentDataRef.current before update:`, JSON.stringify(contentDataRef.current));

    
    
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
}, [activeContentPaneId, findNodeByPath,rootLayoutNode]);
   
const handleConversationSelect = async (conversationId, skipMessageLoad = false) => {
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


const cleanupPhantomPanes = useCallback(() => {
  const validPaneIds = new Set();
  
  const collectPaneIds = (node) => {
    if (!node) return;
    if (node.type === 'content') validPaneIds.add(node.id);
    if (node.type === 'split') {
      node.children.forEach(collectPaneIds);
    }
  };
  
  collectPaneIds(rootLayoutNode);
  
  // Remove any contentDataRef entries not in the layout
  Object.keys(contentDataRef.current).forEach(paneId => {
    if (!validPaneIds.has(paneId)) {
      console.log(`Removing phantom pane: ${paneId}`);
      delete contentDataRef.current[paneId];
    }
  });
}, [rootLayoutNode]);

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


const handleFileClick = useCallback(async (filePath) => {
    setCurrentFile(filePath);
    setActiveConversationId(null);

    const extension = filePath.split('.').pop()?.toLowerCase();
    let contentType = 'editor';
    
    if (extension === 'pdf') contentType = 'pdf';
    else if (['csv', 'xlsx', 'xls'].includes(extension)) contentType = 'csv';
    else if (extension === 'pptx') contentType = 'pptx';
    else if (extension === 'tex') contentType = 'latex';

    else if (['docx', 'doc'].includes(extension)) contentType = 'docx';

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






const renderBrowserViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) {
        // Return null or a placeholder if paneData isn't ready
        return <div className="p-4 theme-text-muted">Initializing browser pane...</div>;
    }

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <WebBrowserViewer
                key={nodeId}
                initialUrl={paneData.browserUrl}
                viewId={paneData.contentId} // This is the unique ID for the BrowserView
                currentPath={currentPath}
            />
        </div>
    );
}, [contentDataRef, currentPath]);

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
    
const renderCsvViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <CsvViewer
                filePath={paneData.contentId}
                nodeId={nodeId} // This prop is likely for internal use within CsvViewer
            />
        </div>
    );
}, [contentDataRef]);
const renderPptxViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <PptxViewer
                filePath={paneData.contentId}
                nodeId={nodeId} // This prop is likely for internal use within PptxViewer
            />
        </div>
    );
}, [contentDataRef]);
const renderLatexViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <LatexViewer
                filePath={paneData.contentId}
                nodeId={nodeId} // This prop is likely for internal use within LatexViewer
            />
        </div>
    );
}, [contentDataRef]);const renderDocxViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    return (
        <DocxViewer
            filePath={paneData.contentId}
            nodeId={nodeId}
            findNodePath={findNodePath}
            rootLayoutNode={rootLayoutNode}
            setDraggedItem={setDraggedItem}
            setPaneContextMenu={setPaneContextMenu}
            closeContentPane={closeContentPane}
        />
    );
}, [rootLayoutNode, findNodePath, setDraggedItem, setPaneContextMenu, 
    closeContentPane]);
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
    
const handlePdfContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[PDF_CONTEXT] Context menu handler called');
    
    // The selected text should now be in selectedPdfText from handlePdfTextSelect
    if (selectedPdfText?.text && selectedPdfText.text.trim()) {
        console.log('[PDF_CONTEXT] Showing context menu with text:', selectedPdfText.text.substring(0, 50));
        setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
        console.log('[PDF_CONTEXT] No valid text selected, showing menu anyway');
        // Show menu even without text - user might want other options
        setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
    }
};
const renderPdfViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    const handlePdfContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (selectedPdfText?.text) {
            setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    };

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <div className="flex-1 min-h-0">
                <PdfViewer
                    filePath={paneData.contentId}
                    highlights={pdfHighlights}
                    onTextSelect={handlePdfTextSelect}
                    onContextMenu={handlePdfContextMenu}
                    onHighlightAddedCallback={loadPdfHighlightsForActivePane}
                />
            </div>
        </div>
    );
}, [contentDataRef, selectedPdfText, pdfHighlights, handlePdfTextSelect, loadPdfHighlightsForActivePane, setPdfContextMenuPos]);
const renderTerminalView = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: terminalId } = paneData;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <div className="flex-1 overflow-hidden min-h-0">
                <TerminalView
                    terminalId={terminalId}
                    currentPath={currentPath}
                    isActive={activeContentPaneId === nodeId}
                />
            </div>
        </div>
    );
}, [contentDataRef, currentPath, activeContentPaneId]);
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


const renderPaneContextMenu = () => {
  if (!paneContextMenu?.isOpen) return null;
  const { x, y, nodeId, nodePath } = paneContextMenu;

  const closePane = () => {
    closeContentPane(nodeId, nodePath);
    setPaneContextMenu(null);
  };

  const splitPane = (side) => {
    performSplit(nodePath, side, 'chat', null); // or appropriate contentType and contentId
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
        {/* You can add Move options or drag instructions here */}
      </div>
    </>
  );
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

    const isJinxMode = executionMode !== 'chat' && selectedJinx; // FIXED: Check if NOT chat and has selectedJinx
    const currentJinxInputs = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};

    const hasContent = input.trim() || uploadedFiles.length > 0 || (isJinxMode && Object.values(currentJinxInputs).some(val => val !== null && String(val).trim()));

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
    let jinxArgsForApi = [];

    if (isJinxMode) {
        jinxName = selectedJinx.name;
        
        selectedJinx.inputs.forEach(inputDef => {
            const inputName = typeof inputDef === 'string' ? inputDef : Object.keys(inputDef)[0]; // FIXED: Handle both string and object formats
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
        selectedJinx.inputs.forEach(inputDef => {
            const inputName = typeof inputDef === 'string' ? inputDef : Object.keys(inputDef)[0];
            const value = currentJinxInputs[inputName];
            if (value !== null && String(value).trim()) {
                jinxCommandParts.push(`${inputName}="${String(value).replace(/"/g, '\\"')}"`);
            }
        });
        finalPromptForUserMessage = jinxCommandParts.join(' ');

    } else {
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

            if (executionMode === 'agent') { // This will match the 'agent' jinx
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
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);

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
            await window.api.executeCommandStream({
                commandstr: finalPromptForUserMessage,
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
                executionMode: executionMode,
            });
        }
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
const handleDeleteSelectedMessages = async () => {
    const selectedIds = Array.from(selectedMessages);
    if (selectedIds.length === 0) return;
    
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) {
        console.error("No active chat pane data found for message deletion.");
        return;
    }
    
    const conversationId = activePaneData.contentId;
    
    try {
        // Get the actual message_id from the message object
        const messagesToDelete = activePaneData.chatMessages.allMessages.filter(
            msg => selectedIds.includes(msg.id || msg.timestamp)
        );
        
        console.log('Attempting to delete messages:', messagesToDelete.map(m => ({
            frontendId: m.id,
            message_id: m.message_id,
            timestamp: m.timestamp
        })));
        
        // Delete using message_id if available, otherwise use id
        const deleteResults = await Promise.all(
            messagesToDelete.map(async msg => {
                const idToUse = msg.message_id || msg.id || msg.timestamp;
                console.log(`Deleting message with ID: ${idToUse}`);
                const result = await window.api.deleteMessage({ 
                    conversationId, 
                    messageId: idToUse 
                });
                return { ...result, frontendId: msg.id };
            })
        );
        
        console.log('Delete results:', deleteResults);
        
        // Check if any actually deleted
        const successfulDeletes = deleteResults.filter(r => r.success && r.rowsAffected > 0);
        if (successfulDeletes.length === 0) {
            setError("Failed to delete messages from database");
            console.error("No messages were deleted from DB");
            return;
        }
        
        // Remove from local state
        activePaneData.chatMessages.allMessages = activePaneData.chatMessages.allMessages.filter(
            msg => !selectedIds.includes(msg.id || msg.timestamp)
        );
        activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(
            -activePaneData.chatMessages.displayedMessageCount
        );
        activePaneData.chatStats = getConversationStats(activePaneData.chatMessages.allMessages);
        
        setRootLayoutNode(prev => ({ ...prev }));
        setSelectedMessages(new Set());
        setMessageContextMenuPos(null);
        setMessageSelectionMode(false);
        
        console.log(`Successfully deleted ${successfulDeletes.length} of ${selectedIds.length} messages`);
    } catch (err) {
        console.error('Error deleting messages:', err);
        setError(err.message);
    }
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


const renderSidebar = () => {
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
        <div 
            className="border-r theme-border flex flex-col flex-shrink-0 theme-sidebar relative"
            style={{ 
                width: sidebarCollapsed ? '32px' : `${sidebarWidth}px`,
                transition: sidebarCollapsed ? 'width 0.2s ease' : 'none'
            }}
        >
            {/* Resize handle for sidebar */}
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
            
            {/* Rest of sidebar content remains the same */}
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
                        {renderGitPanel()}
                    </>
                )}
                {contextMenuPos && renderContextMenu()}
                {sidebarItemContextMenuPos && renderSidebarItemContextMenu()}
                {fileContextMenuPos && renderFileContextMenu()}
            </div>
            
            {sidebarCollapsed && <div className="flex-1"></div>}
            
            <div className={sidebarCollapsed ? 'hidden' : ''}>
                {renderActiveWindowsIndicator()}
                {renderWorkspaceIndicator()}
            </div>

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
                {!sidebarCollapsed && (
                    <div className="grid grid-cols-3 grid-rows-2 divide-x divide-y divide-theme-border border theme-border rounded-lg overflow-hidden">
                        <button onClick={() => setCronDaemonPanelOpen(true)} className="action-grid-button" aria-label="Open Cron/Daemon Panel"><Clock size={16} /></button>
                        <button onClick={() => setPhotoViewerOpen(true)} className="action-grid-button" aria-label="Open Photo Viewer"><Image size={16} /></button>
                        <button onClick={() => setDashboardMenuOpen(true)} className="action-grid-button" aria-label="Open Dashboard"><BarChart3 size={16} /></button>
                        <button onClick={() => setJinxMenuOpen(true)} className="action-grid-button" aria-label="Open Jinx Menu"><Wrench size={16} /></button>
                        <button onClick={() => setCtxEditorOpen(true)} className="action-grid-button" aria-label="Open Context Editor"><FileJson size={16} /></button>
                        <button onClick={handleOpenNpcTeamMenu} className="action-grid-button" aria-label="Open NPC Team Menu"><Users size={16} /></button>
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
    );
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

// Update renderFileEditor to properly handle double-click rename
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

    const handleStartRename = () => {
        setRenamingPaneId(nodeId);
        setEditedFileName(fileName);
    };  

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-secondary relative">
            {/* PaneHeader removed from here */}
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
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleStartRename();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            <Edit size={16} />Rename File
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
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
}, [contentDataRef, activeContentPaneId, editorContextMenuPos, aiEditModal, renamingPaneId, editedFileName, handleTextSelection, handleEditorCopy, handleEditorPaste, handleAddToChat, handleAIEdit, startAgenticEdit, setRootLayoutNode, setRenamingPaneId, setEditedFileName, setEditorContextMenuPos, setPromptModal]);

// Update renderSidebarItemContextMenu to properly handle rename
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
        // Find the user message and the assistant response that followed
        const messageIdToResend = messageToResend.id || messageToResend.timestamp;
        const allMessages = activePaneData.chatMessages.allMessages;
        const userMsgIndex = allMessages.findIndex(m => 
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
                -activePaneData.chatMessages.displayedMessageCount
            );
            
            console.log('[RESEND] Messages after deletion:', activePaneData.chatMessages.allMessages.length);
        }
        
        // Now send the new message
        newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = activeContentPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === selectedNPC);

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
            -activePaneData.chatMessages.displayedMessageCount
        );

        console.log('[RESEND] Added new messages, total now:', activePaneData.chatMessages.allMessages.length);
        
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
    isResend: true  // ADD THIS FLAG
            
            
        });

    } catch (err) {
        console.error('[RESEND] Error resending message:', err);
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
const renderInputArea = () => {
    const isJinxMode = executionMode !== 'chat' && selectedJinx;

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
                            <button type="button" onClick={handleInputSubmit} disabled={(!input.trim() && uploadedFiles.length === 0 && !isJinxMode) || (isJinxMode && Object.values(jinxInputValues[selectedJinx?.name] || {}).every(val => !String(val).trim())) || !activeConversationId} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-[76px] h-[40px] self-end" >
                                <Send size={16}/>
                            </button>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-2 pb-2 border-t theme-border ${isStreaming ? 'opacity-50' : ''}`}>
                    <select
                        value={executionMode}
                        onChange={(e) => {
                            setExecutionMode(e.target.value);
                            if (e.target.value === 'chat') {
                                setSelectedJinx(null);
                            } else {
                                const allJinxs = [
                                    ...(availableJinxs.code || []),
                                    ...(availableJinxs.modes || []),
                                    ...(availableJinxs.utils || [])
                                ];
                                const foundJinx = allJinxs.find(j => j.name === e.target.value);
                                setSelectedJinx(foundJinx || null);
                            }
                        }}
                        className="theme-input text-xs rounded px-2 py-1 border min-w-[150px]"
                        disabled={isStreaming}
                    >
                        <option value="chat">💬 Chat</option>
                        
                        {availableJinxs.code?.length > 0 && (
                            <optgroup label="Code">
                                {availableJinxs.code.map(jinx => (
                                    <option key={jinx.name} value={jinx.name}>
                                        📝 {jinx.name.length > 15 ? jinx.name.substring(0, 15) + '...' : jinx.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        
                        {availableJinxs.modes?.length > 0 && (
                            <optgroup label="Modes">
                                {availableJinxs.modes.map(jinx => (
                                    <option key={jinx.name} value={jinx.name}>
                                        🎯 {jinx.name.length > 15 ? jinx.name.substring(0, 15) + '...' : jinx.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        
                        {availableJinxs.utils?.length > 0 && (
                            <optgroup label="Utils">
                                {availableJinxs.utils.map(jinx => (
                                    <option key={jinx.name} value={jinx.name}>
                                        🔧 {jinx.name.length > 15 ? jinx.name.substring(0, 15) + '...' : jinx.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>

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
            jinxList={availableJinxs.map(jinx => ({ jinx_name: jinx.jinx_name, description: jinx.description }))} // Pass available Jinxs
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



    // Locate the renderChatView useCallback function:
const renderChatView = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return <div className="p-4 theme-text-muted">Loading pane...</div>;

    const scrollRef = useRef(null);
    const paneRef = useRef(null);

    const debouncedSearchTerm = useDebounce(localSearch.term, 300); // This one can stay here

    // REMOVED: The internal definition of debouncedSetSearchTerm
    // REMOVED: The internal definition of handleLocalSearchNavigate

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
    }, [nodeId, setLocalSearch, localSearch.paneId, localSearch.term]); // Added setLocalSearch, localSearch.paneId, localSearch.term

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
    }, [debouncedSearchTerm, localSearch.isActive, localSearch.paneId, nodeId, paneData.chatMessages?.allMessages, setLocalSearch]); // Added setLocalSearch

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

    // The handleLocalSearchNavigate is now passed as a prop from the parent, no longer defined here.
    // The debouncedSetSearchTerm is now passed as a prop from the parent, no longer defined here.

    const messagesToDisplay = paneData.chatMessages?.messages || [];
    const totalMessages = paneData.chatMessages?.allMessages?.length || 0;
    const stats = paneData.chatStats || {};

    const isEmpty = !paneData.contentId;

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative focus:outline-none" tabIndex={-1}>
            {!isEmpty && (
                <div className="p-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-400 min-h-[20px] theme-bg-secondary border-b theme-border">
                    <span><MessageSquare size={12} className="inline mr-1"/>{stats.messageCount || 0} Msgs</span>
                    <span><Terminal size={12} className="inline mr-1"/>~{stats.tokenCount || 0} Tokens</span>
                    <span><Code2 size={12} className="inline mr-1"/>{stats.models?.size || 0} Models</span>
                    <span><Users size={12} className="inline mr-1"/>{stats.agents?.size || 0} Agents</span>
                    {stats.totalAttachments > 0 && <span><Paperclip size={12} className="inline mr-1"/>{stats.totalAttachments} Attachments</span>}
                    {stats.totalToolCalls > 0 && <span><Wrench size={12} className="inline mr-1"/>{stats.totalToolCalls} Tool Calls</span>}
                </div>
            )}

            {isEmpty ? (
                <div className="flex-1 flex items-center justify-center theme-text-muted">
                    <div className="text-center">
                        <div className="text-lg mb-2">Empty Chat Content</div>
                        <div className="text-sm">Drag a conversation here</div>
                    </div>
                </div>
            ) : (
                <>
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
                        {messagesToDisplay.map((msg, index) => {
                            const messageId = msg.id || msg.timestamp;
                            const isCurrentSearchResult = localSearch.isActive && localSearch.paneId === nodeId && localSearch.results[localSearch.currentIndex] === messageId;
                            return (
                                <ChatMessage
                                    key={messageId}
                                    message={msg}
                                    messageIndex={index}
                                    searchTerm={localSearch.isActive && localSearch.paneId === nodeId ? debouncedSearchTerm : ''}
                                    isCurrentSearchResult={isCurrentSearchResult}
                                    isSelected={selectedMessages.has(messageId)}
                                    messageSelectionMode={messageSelectionMode}
                                    toggleMessageSelection={toggleMessageSelection}
                                    handleMessageContextMenu={handleMessageContextMenu}
                                    onResendMessage={handleResendMessage}
                                    onCreateBranch={createBranchPoint}
                                />
                            );
                        })}
                    </div>

                    {localSearch.isActive && localSearch.paneId === nodeId && (
                        <div className="flex-shrink-0 p-2 border-t theme-border theme-bg-secondary">
                            <InPaneSearchBar
                                searchTerm={localSearch.term}
                                onSearchTermChange={debouncedSetSearchTerm} // Now correctly in scope
                                onNext={() => handleLocalSearchNavigate(1)} // Now correctly in scope
                                onPrevious={() => handleLocalSearchNavigate(-1)} // Now correctly in scope
                                onClose={() => setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 })}
                                resultCount={localSearch.results.length}
                                currentIndex={localSearch.currentIndex}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}, [
    contentDataRef, autoScrollEnabled, localSearch, selectedMessages, messageSelectionMode,
    toggleMessageSelection, handleMessageContextMenu, handleResendMessage, createBranchPoint,
    setRootLayoutNode, debouncedSetSearchTerm, handleLocalSearchNavigate, setLocalSearch
]);
    
    
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
</div>
            {renderModals()}
        <BranchingUI />
            
        </div>
    );
};

export default ChatInterface;
