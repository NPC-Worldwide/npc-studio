// NpctsFullChat.tsx - The fiery heart of your application, now in TypeScript!
import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Plus, Search, ChevronDown,ChevronLeft, ChevronRight, Settings, ArrowUp,
  MessageCircle, Users, Code2, Cpu, FolderPlus, Globe, 
  FileText, Terminal, Folder, GitCommit, Trash, BarChart3, 
  Wand2, Image, Clock, RefreshCw, ExternalLink, FileJson,FilePlus,
  Send, Paperclip, X, Star, ListFilter, Maximize2, Minimize2,
  File, Edit, FolderTree, MessageSquare, Wrench, BrainCircuit, Sun, Moon,
} from 'lucide-react';
import { createElectronAdapter } from 'npcts';
import {
  ChatProvider, useChatContext, FileSystemProvider
} from 'npcts'; // We'll still use ChatProvider, but ChatView will be custom rendered

import JinxMenu from './JinxMenu';
import NPCTeamMenu from './NPCTeamMenu';
import CtxEditor from './CtxEditor';
import DataDashboard from './DataDashboard'; // Renamed from DataDash
import PhotoViewer from './PhotoViewer';
import CronDaemonPanel from './CronDaemonPanel';
import SettingsMenu from './SettingsMenu';
import BrowserUrlDialog from './BrowserUrlDialog'; // Added from original
import CsvViewer from './CsvViewer'; // Added from original
import DocxViewer from './DocxViewer'; // Added from original
import MacroInput from './MacroInput'; // Added from original
import MarkdownRenderer from './MarkdownRenderer'; // Added from original
import CodeEditor from './CodeEditor'; // Added from original
import TerminalView from './Terminal'; // Added from original
import PdfViewer from './PdfViewer'; // Added from original
import WebBrowserViewer from './WebBrowserViewer'; // Added from original
import PptxViewer from './PptxViewer'; // Added from original
import LatexViewer from './LatexViewer'; // Added from original

// --- Utility Functions (Copied from original) ---
interface ActiveWindowsIndicatorProps {
    windowId: string;
    currentPath: string;
    activeWindowsExpanded: boolean;
    setActiveWindowsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const ActiveWindowsIndicator = memo(({
    windowId,
    currentPath,
    activeWindowsExpanded,
    setActiveWindowsExpanded
}: ActiveWindowsIndicatorProps) => {
    const [otherWindows, setOtherWindows] = useState<any[]>([]); // TODO: Type this

    useEffect(() => {
        const checkOtherWindows = () => {
            try {
                const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                const now = Date.now();
                const others = Object.entries(activeWindows)
                    .filter(([wId]) => wId !== windowId)
                    .filter(([, data]: any) => !data.closing)
                    .filter(([, data]: any) => (now - data.lastActive) < 30000)
                    .map(([wId, data]: any) => ({
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
        const interval = setInterval(checkOtherWindows, 5000);
        return () => clearInterval(interval);
    }, [windowId, currentPath]); // Added currentPath to dependencies for window activity update

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
});

const LAST_ACTIVE_PATH_KEY = 'npcStudioLastPath';
const LAST_ACTIVE_CONVO_ID_KEY = 'npcStudioLastConvoId';
const WORKSPACES_STORAGE_KEY = 'npcStudioWorkspaces_v2'; // Per-path workspaces
const ACTIVE_WINDOWS_KEY = 'npcStudioActiveWindows';

const normalizePath = (path: string) => {
    if (!path) return '';
    let normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
};

const getFileIcon = (filename: string) => {
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
        case 'pptx': return <FileText {...iconProps}
            className={`${iconProps.className} text-red-500`} />;
        case 'tex': return <FileText {...iconProps}
            className={`${iconProps.className} text-yellow-500`} />;
        default: return <File {...iconProps} 
            className={`${iconProps.className} text-gray-400`} />;
    }
};

const convertFileToBase64 = (file: File): Promise<{ dataUrl: string; base64: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                dataUrl: result,
                base64: result.split(',')[1] 
            });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const highlightSearchTerm = (text: string, term: string) => {
    if (!term || !text) return text;
    // This is a simplified version, original had more complex highlighting logic,
    // but for exact replication, we'd need the full MarkdownRenderer with highlight support.
    // For now, returning text as in the original's simplified version.
    return text;
};

const getConversationStats = (messages: any[]) => {
    if (!messages || messages.length === 0) {
        return { messageCount: 0, tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set(), totalAttachments: 0, totalToolCalls: 0 };
    }

    const stats = messages.reduce((acc, msg) => {
        if (msg.content) {
            acc.tokenCount += Math.ceil(String(msg.content).length / 4);
        }
        if (msg.reasoningContent) {
            acc.tokenCount += Math.ceil(String(msg.reasoningContent).length / 4);
        }
        if (msg.role !== 'user') {
            if (msg.model) acc.models.add(msg.model);
            if (msg.npc) acc.agents.add(msg.npc);
            if (msg.provider) acc.providers.add(msg.provider);
        }
        if (msg.attachments && Array.isArray(msg.attachments)) {
            acc.totalAttachments += msg.attachments.length;
        }
        if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
            acc.totalToolCalls += msg.toolCalls.length;
        }
        return acc;
    }, { tokenCount: 0, models: new Set<string>(), agents: new Set<string>(), providers: new Set<string>(), totalAttachments: 0, totalToolCalls: 0 });

    return {
        messageCount: messages.length,
        ...stats
    };
};

const extractCodeFromMarkdown = (text: string) => {
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...text.matchAll(codeBlockRegex)];
  if (matches.length > 0) return matches[matches.length - 1][1].trim();
  const thinkingRegex = /<think>[\s\S]*?<\/think>/g;
  return text.replace(thinkingRegex, '').trim();
};

const generateInlineDiff = (unifiedDiffText: string) => {
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
    return diff;
};

const applyUnifiedDiff = (originalContent: string, unifiedDiffText: string) => {
    const originalLines = originalContent.split('\n');
    const diffLines = unifiedDiffText.split('\n');
    const resultLines: string[] = [];
    
    let currentOriginalIndex = 0; // Pointer for originalLines
    
    for (const diffLine of diffLines) {
        if (diffLine.startsWith('---') || diffLine.startsWith('+++')) {
            continue;
        }
        
        if (diffLine.startsWith('@@')) {
            const match = diffLine.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                const originalHunkStart = parseInt(match[1]) - 1; // 0-indexed
                
                while (currentOriginalIndex < originalHunkStart) {
                    if (currentOriginalIndex < originalLines.length) {
                        resultLines.push(originalLines[currentOriginalIndex]);
                    }
                    currentOriginalIndex++;
                }
            }
            continue;
        }
        
        if (diffLine.startsWith('-')) {
            currentOriginalIndex++;
        } else if (diffLine.startsWith('+')) {
            resultLines.push(diffLine.substring(1));
        } else if (diffLine.startsWith(' ')) {
            if (currentOriginalIndex < originalLines.length) {
                resultLines.push(originalLines[currentOriginalIndex]);
                currentOriginalIndex++;
            }
        }
    }
    
    while (currentOriginalIndex < originalLines.length) {
        resultLines.push(originalLines[currentOriginalIndex]);
        currentOriginalIndex++;
    }
    
    return resultLines.join('\n');
};

// --- Custom Components (Copied from original) ---

interface PaneHeaderProps {
    nodeId: string;
    icon: React.ReactNode;
    title: string;
    children?: React.ReactNode;
    findNodePath: (node: LayoutNode, id: string, currentPath?: number[]) => number[] | null;
    rootLayoutNode: LayoutNode | null;
    setDraggedItem: React.Dispatch<React.SetStateAction<any>>;
    setPaneContextMenu: React.Dispatch<React.SetStateAction<any>>;
    closeContentPane: (paneId: string, nodePath: number[]) => void;
    fileChanged?: boolean;
    onSave?: () => void;
    onStartRename?: () => void;
}

const PaneHeader = memo(({
    nodeId,
    icon,
    title,
    children,
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane,
    fileChanged,
    onSave,
    onStartRename
}: PaneHeaderProps) => {
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
                    {children}

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

interface ChatMessageProps {
    message: any; // TODO: Define a proper Message type
    isSelected: boolean;
    messageSelectionMode: boolean;
    toggleMessageSelection: (messageId: string) => void;
    handleMessageContextMenu: (e: React.MouseEvent, messageId: string) => void;
    searchTerm: string;
    isCurrentSearchResult: boolean;
    onResendMessage: (message: any) => void;
    onCreateBranch: (messageIndex: number) => void;
    messageIndex: number;
}

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
}: ChatMessageProps) => {
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
                        {message.toolCalls.map((tool: any, idx: number) => (
                            <div key={idx} className="mb-2 last:mb-0">
                        <div className="text-blue-300 text-sm">{tool.function_name || tool.function?.name || "Function"}</div>
                        {(() => {
                            const argVal = tool.arguments !== undefined ? tool.arguments : tool.function?.arguments;
                            const resultVal = tool.result_preview || '';
                            const argDisplay = argVal && String(argVal).trim().length > 0
                                ? (typeof argVal === 'string' ? argVal : JSON.stringify(argVal, null, 2))
                                : 'No arguments';
                            const resDisplay = resultVal && String(resultVal).trim().length > 0
                                ? (typeof resultVal === 'string' ? resultVal : JSON.stringify(resultVal, null, 2))
                                : null;
                            return (
                                <>
                                    <div className="text-[11px] theme-text-muted mb-1">Args:</div>
                                    <pre className="theme-bg-primary p-2 rounded text-xs overflow-x-auto my-1 theme-text-secondary">
                                        {argDisplay}
                                    </pre>
                                    {resDisplay && (
                                        <>
                                            <div className="text-[11px] theme-text-muted mb-1">Result:</div>
                                            <pre className="theme-bg-primary p-2 rounded text-xs overflow-x-auto my-1 theme-text-secondary">
                                                {resDisplay}
                                            </pre>
                                        </>
                                    )}
                                </>
                            );
                        })()}
                            </div>
                        ))}
                    </div>
                )}
                {message.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 border-t theme-border pt-2">
                        {message.attachments.map((attachment: any, idx: number) => {
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

interface PredictiveTextOverlayProps {
    predictionSuggestion: string;
    predictionTargetElement: HTMLElement | null;
    isPredictiveTextEnabled: boolean;
    setPredictionSuggestion: React.Dispatch<React.SetStateAction<string>>;
    setPredictionTargetElement: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
}

const PredictiveTextOverlay = ({
    predictionSuggestion,
    predictionTargetElement,
    isPredictiveTextEnabled,
    setPredictionSuggestion,
    setPredictionTargetElement
}: PredictiveTextOverlayProps) => {
    if (!predictionSuggestion || !predictionTargetElement || !isPredictiveTextEnabled) {
        return null;
    }

    const targetRect = predictionTargetElement.getBoundingClientRect();
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleAcceptSuggestion = useCallback(() => {
        if (predictionTargetElement && predictionSuggestion) {
            const suggestionToInsert = predictionSuggestion.trim();

            if (predictionTargetElement instanceof HTMLTextAreaElement || predictionTargetElement instanceof HTMLInputElement) {
                const start = predictionTargetElement.selectionStart;
                const end = predictionTargetElement.selectionEnd;
                const value = predictionTargetElement.value;

                predictionTargetElement.value = value.substring(0, start) + suggestionToInsert + value.substring(end);
                predictionTargetElement.selectionStart = predictionTargetElement.selectionEnd = (start || 0) + suggestionToInsert.length;
                const event = new Event('input', { bubbles: true });
                predictionTargetElement.dispatchEvent(event);

            } else if (predictionTargetElement.isContentEditable) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(suggestionToInsert));
                    range.setStart(range.endContainer, range.endOffset);
                    range.collapse(true);
                }
            }
            setPredictionSuggestion('');
            setPredictionTargetElement(null);
        }
    }, [predictionSuggestion, predictionTargetElement, setPredictionSuggestion, setPredictionTargetElement]);

    useEffect(() => {
        const handleOverlayKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && predictionSuggestion) {
                e.preventDefault();
                handleAcceptSuggestion();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setPredictionSuggestion('');
                setPredictionTargetElement(null);
            }
        };
        document.addEventListener('keydown', handleOverlayKeyDown);
        return () => document.removeEventListener('keydown', handleOverlayKeyDown);
    }, [handleAcceptSuggestion, predictionSuggestion, setPredictionSuggestion, setPredictionTargetElement]);


    const style: React.CSSProperties = {
        position: 'fixed',
        left: targetRect.left,
        top: targetRect.bottom + 5,
        zIndex: 1000,
        maxWidth: targetRect.width,
        backgroundColor: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        padding: '8px',
        color: 'var(--theme-text-muted)',
        fontSize: '0.875rem',
        whiteSpace: 'pre-wrap',
        cursor: 'text',
    };

    return (
        <div ref={overlayRef} style={style} onClick={handleAcceptSuggestion}>
            {predictionSuggestion}
            {predictionSuggestion === 'Generating...' && (
                 <span className="ml-1 inline-block w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
            )}
            <div className="text-xs text-blue-400 mt-1">
                Press <span className="font-bold">Tab</span> to accept, <span className="font-bold">Esc</span> to dismiss.
            </div>
        </div>
    );
};

interface InPaneSearchBarProps {
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
    resultCount: number;
    currentIndex: number;
}

const InPaneSearchBar = ({
    searchTerm,       
    onSearchTermChange,
    onNext,
    onPrevious,
    onClose,
    resultCount,
    currentIndex
}: InPaneSearchBarProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
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
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
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

// --- Type Definitions for Layout (Copied from original logic) ---
interface ContentNode {
    id: string;
    type: 'content';
}

interface SplitNode {
    id: string;
    type: 'split';
    direction: 'horizontal' | 'vertical';
    children: LayoutNode[];
    sizes: number[];
}

type LayoutNode = ContentNode | SplitNode;

interface PaneData {
    contentType?: 'chat' | 'editor' | 'browser' | 'terminal' | 'pdf' | 'csv' | 'docx' | 'pptx' | 'latex';
    contentId?: string;
    fileContent?: string;
    fileChanged?: boolean;
    browserUrl?: string;
    browserTitle?: string;
    chatMessages?: {
        messages: any[];
        allMessages: any[];
        displayedMessageCount: number;
    };
    chatStats?: ReturnType<typeof getConversationStats>;
}

interface LayoutComponentApi {
    rootLayoutNode: LayoutNode | null;
    setRootLayoutNode: React.Dispatch<React.SetStateAction<LayoutNode | null>>;
    findNodeByPath: (node: LayoutNode | null, path: number[]) => LayoutNode | null;
    findNodePath: (node: LayoutNode | null, id: string, currentPath?: number[]) => number[] | null;
    activeContentPaneId: string | null;
    setActiveContentPaneId: React.Dispatch<React.SetStateAction<string | null>>;
    draggedItem: any;
    setDraggedItem: React.Dispatch<React.SetStateAction<any>>;
    dropTarget: any;
    setDropTarget: React.Dispatch<React.SetStateAction<any>>;
    contentDataRef: React.MutableRefObject<Record<string, PaneData>>;
    updateContentPane: (paneId: string, newContentType: PaneData['contentType'], newContentId: string | null, skipMessageLoad?: boolean) => Promise<void>;
    performSplit: (targetNodePath: number[], side: 'left' | 'right' | 'top' | 'bottom', newContentType: PaneData['contentType'], newContentId: string | null) => void;
    closeContentPane: (paneId: string, nodePath: number[]) => void;
    moveContentPane: (draggedId: string, draggedPath: number[], targetPath: number[], dropSide: 'left' | 'right' | 'top' | 'bottom' | 'center') => void;
    createAndAddPaneNodeToLayout: () => string;
    renderChatView: (props: { nodeId: string }) => React.ReactNode;
    renderFileEditor: (props: { nodeId: string }) => React.ReactNode;
    renderTerminalView: (props: { nodeId: string }) => React.ReactNode;
    renderPdfViewer: (props: { nodeId: string }) => React.ReactNode;
    renderCsvViewer: (props: { nodeId: string }) => React.ReactNode;
    renderDocxViewer: (props: { nodeId: string }) => React.ReactNode;
    renderBrowserViewer: (props: { nodeId: string }) => React.ReactNode;
    renderPptxViewer: (props: { nodeId: string }) => React.ReactNode;
    renderLatexViewer: (props: { nodeId: string }) => React.ReactNode;
    setPaneContextMenu: React.Dispatch<React.SetStateAction<any>>;
    autoScrollEnabled: boolean;
    setAutoScrollEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    messageSelectionMode: boolean;
    toggleMessageSelectionMode: () => void;
    selectedMessages: Set<string>;
    conversationBranches: Map<string, any>; // TODO: Define Branch type
    showBranchingUI: boolean;
    setShowBranchingUI: React.Dispatch<React.SetStateAction<boolean>>;
}

interface LayoutNodeProps {
    node: LayoutNode;
    path: number[];
    component: LayoutComponentApi;
}

const LayoutNode = memo(({ node, path, component }: LayoutNodeProps) => {
    if (!node) return null;

    if (node.type === 'split') {
        const handleResize = (e: React.MouseEvent, index: number) => {
            e.preventDefault();
            const parentNode = component.findNodeByPath(component.rootLayoutNode, path) as SplitNode;
            if (!parentNode) return;
            const startSizes = [...parentNode.sizes];
            const isHorizontal = parentNode.direction === 'horizontal';
            const startPos = isHorizontal ? e.clientX : e.clientY;
            const containerSize = isHorizontal ? (e.currentTarget.parentElement as HTMLElement).offsetWidth : (e.currentTarget.parentElement as HTMLElement).offsetHeight;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
                const deltaPercent = ((currentPos - startPos) / containerSize) * 100;
                let newSizes = [...startSizes];
                const amount = Math.min(newSizes[index + 1] - 10, Math.max(-(newSizes[index] - 10), deltaPercent));
                newSizes[index] += amount;
                newSizes[index + 1] -= amount;

                component.setRootLayoutNode(currentRoot => {
                    const newRoot = JSON.parse(JSON.stringify(currentRoot));
                    const target = component.findNodeByPath(newRoot, path) as SplitNode;
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
            autoScrollEnabled, setAutoScrollEnabled,
            messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
            conversationBranches, showBranchingUI, setShowBranchingUI,
        } = component;

        const isActive = node.id === activeContentPaneId;
        const isTargeted = dropTarget?.nodePath.join('') === path.join('');

        const onDrop = async (e: React.DragEvent, side: 'left' | 'right' | 'top' | 'bottom' | 'center') => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedItem) return;

            if (draggedItem.type === 'pane') {
                if (draggedItem.id === node.id) return;
                moveContentPane(draggedItem.id, draggedItem.nodePath, path, side);
                setDraggedItem(null);
                setDropTarget(null);
                return;
            }

            let contentType: PaneData['contentType'];
            if (draggedItem.type === 'conversation') {
                contentType = 'chat';
            } else if (draggedItem.type === 'file') {
                const ext = draggedItem.id.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') contentType = 'pdf';
                else if (['csv', 'xlsx', 'xls'].includes(ext)) contentType = 'csv';
                else if (['docx', 'doc'].includes(ext)) contentType = 'docx';
                else if (ext === 'pptx') contentType = 'pptx';
                else if (ext === 'tex') contentType = 'latex';
                else contentType = 'editor';
            } else if (draggedItem.type === 'browser') {
                contentType = 'browser';
            } else if (draggedItem.type === 'terminal') {
                contentType = 'terminal';
            } else {
                return;
            }

            if (side === 'center') {
                await updateContentPane(node.id, contentType, draggedItem.id);
            } else {
                performSplit(path, side, contentType, draggedItem.id);
            }
            setDraggedItem(null);
            setDropTarget(null);
        };

        const paneData = contentDataRef.current[node.id];
        const contentType = paneData?.contentType;
        const contentId = paneData?.contentId;

        let headerIcon = <File size={14} className="text-gray-400" />;
        let headerTitle = 'Empty Pane';

        if (contentType === 'chat') {
            headerIcon = <MessageSquare size={14} />;
            headerTitle = `Conversation: ${contentId?.slice(-8) || 'None'}`;
        } else if (contentType === 'editor' && contentId) {
            headerIcon = getFileIcon(contentId);
            headerTitle = contentId.split('/').pop() || 'File Editor';
        } else if (contentType === 'browser') {
            headerIcon = <Globe size={14} className="text-blue-400" />;
            headerTitle = paneData.browserTitle || paneData.browserUrl || 'Web Browser';
        } else if (contentType === 'terminal') {
            headerIcon = <Terminal size={14} />;
            headerTitle = 'Terminal';
        } else if (contentId) {
            headerIcon = getFileIcon(contentId);
            headerTitle = contentId.split('/').pop() || 'Viewer';
        }

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

        const renderPaneContent = () => {
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
                <PaneHeader
                    nodeId={node.id}
                    icon={headerIcon}
                    title={headerTitle}
                    findNodePath={findNodePath}
                    rootLayoutNode={rootLayoutNode}
                    setDraggedItem={setDraggedItem}
                    setPaneContextMenu={setPaneContextMenu}
                    closeContentPane={closeContentPane}
                    fileChanged={paneData?.fileChanged}
                    onSave={() => { /* No-op, actual save logic is in renderFileEditor */ }}
                    onStartRename={() => { /* No-op, actual rename logic is in renderFileEditor */ }}
                >
                    {paneHeaderChildren}
                </PaneHeader>

                {draggedItem && (
                    <>
                        <div className={`absolute left-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'left' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'left' }); }} onDrop={(e) => onDrop(e, 'left')} />
                        <div className={`absolute right-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'right' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'right' }); }} onDrop={(e) => onDrop(e, 'right')} />
                        <div className={`absolute left-0 top-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'top' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'top' }); }} onDrop={(e) => onDrop(e, 'top')} />
                        <div className={`absolute left-0 bottom-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'bottom' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'bottom' }); }} onDrop={(e) => onDrop(e, 'bottom')} />
                    </>
                )}
                {renderPaneContent()}
            </div>
        );
    }
    return null;
});
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Main ChatInterface Component (Adapted for TypeScript and npcts) ---
const NpctsFullChat = () => {
  const {
      conversations,
      activeConversationId,
      setActiveConversation,
      createConversation,
      messages: chatContextMessages, // npcts messages for the active conversation
      sendMessage,
      streamMessageChunk,
      streamMessageComplete,
      streamMessageError
  } = useChatContext();
  
  const services = useMemo(() => createElectronAdapter(window.api), []);

  // --- State Variables (Copied from original) ---
  const [windowId] = useState(() => {
    let id = sessionStorage.getItem('npcStudioWindowId');
    if (!id) {
        id = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('npcStudioWindowId', id);
    }
    return id;
  });

  const [currentPath, setCurrentPath] = useState('/Users/caug/npcww/'); // Default path
  const [baseDir, setBaseDir] = useState('/Users/caug/npcww/'); // Default base directory

  const [gitPanelCollapsed, setGitPanelCollapsed] = useState(true);
  const [pdfHighlightsTrigger, setPdfHighlightsTrigger] = useState(0);
  const [conversationBranches, setConversationBranches] = useState<Map<string, any>>(new Map());
  const [currentBranchId, setCurrentBranchId] = useState('main');
  const [showBranchingUI, setShowBranchingUI] = useState(false);
  const [isPredictiveTextEnabled, setIsPredictiveTextEnabled] = useState(false);
  const [predictiveTextModel, setPredictiveTextModel] = useState<string | null>(null);
  const [predictiveTextProvider, setPredictiveTextProvider] = useState<string | null>(null);
  const [predictionSuggestion, setPredictionSuggestion] = useState('');
  const [predictionTargetElement, setPredictionTargetElement] = useState<HTMLElement | null>(null);
  const predictionStreamIdRef = useRef<string | null>(null);
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editedPath, setEditedPath] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerType, setPhotoViewerType] = useState<'images' | 'screenshots'>('images');
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<any>(null); // TODO: Type this
  const [cronDaemonPanelOpen, setCronDaemonPanelOpen] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastClickedFileIndex, setLastClickedFileIndex] = useState<number | null>(null);
  const [fileContextMenuPos, setFileContextMenuPos] = useState<any>(null); // TODO: Type this
  const [folderStructure, setFolderStructure] = useState<any>({}); // TODO: Type this
  // const [activeConversationId, setActiveConversationId] = useState<string | null>(null); // Now from npcts context

  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentNPC, setCurrentNPC] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentDataVersion, setContentDataVersion] = useState(0);

  const [config, setConfig] = useState<any>(null); // TODO: Type this
  const [currentConversation, setCurrentConversation] = useState<any>(null); // TODO: Type this
  const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
  const [jinxMenuOpen, setJinxMenuOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]); // TODO: Type this
  const activeConversationRef = useRef<string | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]); // TODO: Type this
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [ollamaToolModels, setOllamaToolModels] = useState<Set<string>>(new Set());
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Not used in original, but might be for file editing
  const [fileChanged, setFileChanged] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
  const [macroText, setMacroText] = useState('');
  const [promptModal, setPromptModal] = useState<any>({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null }); // TODO: Type this
  const screenshotHandlingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listenersAttached = useRef(false);
  const initialLoadComplete = useRef(false);
  const [directoryConversations, setDirectoryConversations] = useState<any[]>([]); // TODO: Type this
  const [isStreaming, setIsStreaming] = useState(false);
  const streamIdRef = useRef<string | null>(null);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const [analysisContext, setAnalysisContext] = useState<any>(null); // TODO: Type this
  const [renamingPaneId, setRenamingPaneId] = useState<string | null>(null);
  const [editedFileName, setEditedFileName] = useState('');
  const [sidebarItemContextMenuPos, setSidebarItemContextMenuPos] = useState<any>(null); // TODO: Type this

  const [pdfContextMenuPos, setPdfContextMenuPos] = useState<any>(null); // TODO: Type this
  const [selectedPdfText, setSelectedPdfText] = useState<any>(null); // TODO: Type this
  const [pdfHighlights, setPdfHighlights] = useState<any[]>([]); // TODO: Type this
  const [browserUrlDialogOpen, setBrowserUrlDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
  
  const [pendingMemories, setPendingMemories] = useState<any[]>([]); // TODO: Type this
  const [memoryApprovalModal, setMemoryApprovalModal] = useState<any>({
      isOpen: false,
      memories: []
  });    
  const [gitStatus, setGitStatus] = useState<any>(null); // TODO: Type this
  const [gitCommitMessage, setGitCommitMessage] = useState('');
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  
  const [websiteHistory, setWebsiteHistory] = useState<any[]>([]); // TODO: Type this
  const [commonSites, setCommonSites] = useState<any[]>([]); // TODO: Type this
  const [openBrowsers, setOpenBrowsers] = useState<any[]>([]); // TODO: Type this
  const [websitesCollapsed, setWebsitesCollapsed] = useState(false);
  const [paneContextMenu, setPaneContextMenu] = useState<any>(null); // TODO: Type this
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [inputHeight, setInputHeight] = useState(200);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingInput, setIsResizingInput] = useState(false);

  const handleSidebarResize = useCallback((e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= 500) {
          setSidebarWidth(newWidth);
      }
  }, [isResizingSidebar]);

  const handleInputResize = useCallback((e: MouseEvent) => {
      if (!isResizingInput) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 100 && newHeight <= 600) {
          setInputHeight(newHeight);
      }
  }, [isResizingInput]);

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


  const loadWebsiteHistory = useCallback(async () => {
      if (!currentPath) return;
      try {
          const response = await window.api.getBrowserHistory(currentPath);
          if (response?.history) {
              setWebsiteHistory(response.history);
              
              const siteMap = new Map();
              response.history.forEach((item: any) => {
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
              
              const common = Array.from(siteMap.values())
                  .sort((a: any, b: any) => b.count - a.count)
                  .slice(0, 10);
              setCommonSites(common);
          }
      } catch (err: any) {
          console.error('Error loading website history:', err);
      }
  }, [currentPath]);

  const loadGitStatus = useCallback(async () => {
    setGitLoading(true);
    setGitError(null);
    try {
      const response = await window.api.gitStatus(currentPath);
      setGitStatus(response);
    } catch (err: any) {
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
    
  const WINDOW_WORKSPACES_KEY = 'npcStudioWindowWorkspaces';

  const [localSearch, setLocalSearch] = useState<any>({
      isActive: false,
      term: '',
      paneId: null,
      results: [],
      currentIndex: -1
  });

  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [editedSidebarItemName, setEditedSidebarItemName] = useState('');
  
  const [lastActiveChatPaneId, setLastActiveChatPaneId] = useState<string | null>(null);    
  const [aiEditModal, setAiEditModal] = useState<any>({
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
      proposedChanges: []
  });    
  
  const [availableNPCs, setAvailableNPCs] = useState<any[]>([]); // TODO: Type this
  const [npcsLoading, setNpcsLoading] = useState(false);
  const [npcsError, setNpcsError] = useState<string | null>(null);

  const [displayedMessageCount, setDisplayedMessageCount] = useState(10);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false); // Not used in original, but could be for chat
  const streamToPaneRef = useRef<Record<string, string>>({});

  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [messageSelectionMode, setMessageSelectionMode] = useState(false);
  const [messageContextMenuPos, setMessageContextMenuPos] = useState<any>(null); // TODO: Type this
  const [messageOperationModal, setMessageOperationModal] = useState<any>({
      isOpen: false,
      type: '',
      title: '',
      defaultPrompt: '',
      onConfirm: null
  });
  const [mcpServerPath, setMcpServerPath] = useState('~/.npcsh/npc_team/mcp_server.py');
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [availableMcpTools, setAvailableMcpTools] = useState<any[]>([]); // TODO: Type this
  const [mcpToolsLoading, setMcpToolsLoading] = useState(false);
  const [mcpToolsError, setMcpToolsError] = useState<string | null>(null);
  const [availableMcpServers, setAvailableMcpServers] = useState<any[]>([]); // TODO: Type this
  const [showMcpServersDropdown, setShowMcpServersDropdown] = useState(false);
  const [browserContextMenu, setBrowserContextMenu] = useState<any>({
      isOpen: false,
      x: 0,
      y: 0,
      selectedText: '',
      viewId: null,
  });
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [browserContextMenuPos, setBrowserContextMenuPos] = useState<any>(null); // TODO: Type this
      
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

  const handleBrowserAiAction = (action: string) => {
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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [deepSearchResults, setDeepSearchResults] = useState<any[]>([]); // TODO: Type this
  const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]); // TODO: Type this
  const [activeSearchResult, setActiveSearchResult] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const gitStageFile = async (file: string) => {
      setGitLoading(true);
      setGitError(null);
      try {
        await window.api.gitStageFile(currentPath, file);
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
        await window.api.gitUnstageFile(currentPath, file);
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
        await window.api.gitCommit(currentPath, gitCommitMessage.trim());
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
        await window.api.gitPull(currentPath);
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
        await window.api.gitPush(currentPath);
        await loadGitStatus();
      } catch (err: any) {
        setGitError(err.message || 'Failed to push');
      } finally {
        setGitLoading(false);
      }
    };

  const [rootLayoutNode, setRootLayoutNode] = useState<LayoutNode | null>(null);
 
  const [activeContentPaneId, setActiveContentPaneId] = useState<string | null>(null);
  
  const createBranchPoint = useCallback((fromMessageIndex: number) => {
      const activePaneData = contentDataRef.current[activeContentPaneId!];
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

      activePaneData.chatMessages.allMessages = branchPoint.messages;
      activePaneData.chatMessages.messages = branchPoint.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
      setRootLayoutNode(prev => (prev ? { ...prev } : null));

  }, [activeContentPaneId, currentBranchId, conversationBranches]);

  const switchToBranch = useCallback((branchId: string) => {
      const activePaneData = contentDataRef.current[activeContentPaneId!];
      if (!activePaneData || !activePaneData.chatMessages) return;

      const branch = conversationBranches.get(branchId);
      if (!branch) return;

      setCurrentBranchId(branchId);
      activePaneData.chatMessages.allMessages = [...branch.messages];
      activePaneData.chatMessages.messages = branch.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
      setRootLayoutNode(prev => (prev ? { ...prev } : null));
  }, [activeContentPaneId, conversationBranches]);

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
      if (activeContentPaneId) {
          const paneData = contentDataRef.current[activeContentPaneId];
          if (paneData && paneData.contentType === 'pdf' && paneData.contentId) {
              const response = await window.api.getHighlightsForFile(paneData.contentId);
              if (response.highlights) {
                  const transformedHighlights = response.highlights.map((h: any) => {
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
                  setPdfHighlights(transformedHighlights);
              } else {
                  setPdfHighlights([]);
              }
          } else {
              setPdfHighlights([]);
          }
      } else {
          setPdfHighlights([]);
      }
  }, [activeContentPaneId]);

  const [draggedItem, setDraggedItem] = useState<any>(null); // TODO: Type this
  const [dropTarget, setDropTarget] = useState<any>(null); // TODO: Type this
 
  const contentDataRef = useRef<Record<string, PaneData>>({});
  const [editorContextMenuPos, setEditorContextMenuPos] = useState<any>(null); // TODO: Type this
  const rootLayoutNodeRef = useRef<LayoutNode | null>(rootLayoutNode);
  useEffect(() => {
      rootLayoutNodeRef.current = rootLayoutNode;
  }, [rootLayoutNode]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [resendModal, setResendModal] = useState<any>({
      isOpen: false,
      message: null,
      selectedModel: '',
      selectedNPC: ''
  });

  const syncLayoutWithContentData = useCallback((layoutNode: LayoutNode | null, contentData: Record<string, PaneData>) => {
      if (!layoutNode) {
          if (Object.keys(contentData).length > 0) {
              for (const key in contentData) {
                  delete contentData[key];
              }
          }
          return null;
      }

      const collectPaneIds = (node: LayoutNode | null): Set<string> => {
          if (!node) return new Set();
          if (node.type === 'content') return new Set([node.id]);
          if (node.type === 'split') {
              return node.children.reduce((acc, child) => {
                  const childIds = collectPaneIds(child);
                  childIds.forEach(id => acc.add(id));
                  return acc;
              }, new Set<string>());
          }
          return new Set();
      };

      const paneIdsInLayout = collectPaneIds(layoutNode);
      const contentDataIds = new Set(Object.keys(contentData));

      contentDataIds.forEach(id => {
          if (!paneIdsInLayout.has(id)) {
              delete contentData[id];
          }
      });

      paneIdsInLayout.forEach(id => {
          if (!contentData.hasOwnProperty(id)) {
              contentData[id] = {};
          }
      });

      return layoutNode;
  }, []);

  const updateContentPane = useCallback(async (paneId: string, newContentType: PaneData['contentType'], newContentId: string | null, skipMessageLoad = false) => {
    const paneExistsInLayout = (node: LayoutNode | null, targetId: string): boolean => {
      if (!node) return false;
      if (node.type === 'content' && node.id === targetId) return true;
      if (node.type === 'split') {
        return node.children.some(child => paneExistsInLayout(child, targetId));
      }
      return false;
    };

    if (!paneExistsInLayout(rootLayoutNodeRef.current, paneId)) {
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
        const response = await window.api.readFileContent(newContentId!);
        paneData.fileContent = response.error ? `Error: ${response.error}` : response.content;
        paneData.fileChanged = false;
      } catch (err: any) {
        paneData.fileContent = `Error loading file: ${err.message}`;
      }
    } else if (newContentType === 'browser') {
      paneData.chatMessages = undefined;
      paneData.fileContent = undefined;
      paneData.browserUrl = newContentId!;
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
          const msgs = await window.api.getConversationMessages(newContentId!);
          const parseMaybeJson = (val: any) => {
            if (!val || typeof val !== 'string') return val;
            try { return JSON.parse(val); } catch { return val; }
          };
          const formatted: any[] = [];
          let lastAssistant: any = null;
          if (msgs && Array.isArray(msgs)) {
            msgs.forEach((raw: any) => {
              const msg = { ...raw, id: raw.id || generateId() };
              msg.content = parseMaybeJson(msg.content);
              if (msg.role === 'assistant') {
                if (!Array.isArray(msg.toolCalls)) msg.toolCalls = [];
                if (msg.content && typeof msg.content === 'object' && msg.content.tool_call) {
                  const tc = msg.content.tool_call;
                  msg.toolCalls.push({
                    id: tc.id || tc.tool_call_id || generateId(),
                    function: { name: tc.function_name || tc.name || 'tool', arguments: tc.arguments || '' }
                  });
                  msg.content = '';
                }
                formatted.push(msg);
                lastAssistant = msg;
              } else if (msg.role === 'tool') {
                const toolPayload = msg.content && typeof msg.content === 'object' ? msg.content : { content: msg.content };
                const tcId = toolPayload.tool_call_id || generateId();
                const tcName = toolPayload.tool_name || 'tool';
                const tcContent = toolPayload.content !== undefined ? toolPayload.content : msg.content;
                if (lastAssistant) {
                  if (!Array.isArray(lastAssistant.toolCalls)) lastAssistant.toolCalls = [];
                  lastAssistant.toolCalls.push({
                    id: tcId,
                    function: { name: tcName, arguments: toolPayload.arguments || '' },
                    result_preview: typeof tcContent === 'string' ? tcContent : JSON.stringify(tcContent)
                  });
                } else {
                  formatted.push({
                    id: generateId(),
                    role: 'assistant',
                    content: '',
                    toolCalls: [{
                      id: tcId,
                      function: { name: tcName, arguments: toolPayload.arguments || '' },
                      result_preview: typeof tcContent === 'string' ? tcContent : JSON.stringify(tcContent)
                    }]
                  });
                  lastAssistant = formatted[formatted.length - 1];
                }
              } else {
                formatted.push(msg);
              }
            });
          }

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
      paneData.chatMessages = undefined;
      paneData.fileContent = undefined;
    } else if (newContentType === 'pdf') {
      paneData.chatMessages = undefined;
      paneData.fileContent = undefined;
    }

    //setRootLayoutNode(oldRoot => {
    //  const syncedRoot = syncLayoutWithContentData(oldRoot, contentDataRef.current);
    //  return syncedRoot;
    //});
  }, [syncLayoutWithContentData]);


  const useDebounce = (value: any, delay: number) => {
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
          return null;
      }
      
      const serializedContentData: Record<string, any> = {};
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

  const deserializeWorkspace = useCallback(async (workspaceData: any) => {
      if (!workspaceData) return false;
      
      setIsLoadingWorkspace(true);
      
      try {
          const newRootLayout = workspaceData.layoutNode;
          
          contentDataRef.current = {};
          
          const paneIdsInLayout = new Set<string>();
          const collectPaneIds = (node: LayoutNode | null) => {
              if (!node) return;
              if (node.type === 'content') paneIdsInLayout.add(node.id);
              if (node.type === 'split') {
                  node.children.forEach(collectPaneIds);
              }
          };
          collectPaneIds(newRootLayout);
          
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
          
          setRootLayoutNode(newRootLayout);
          setActiveContentPaneId(workspaceData.activeContentPaneId);
          
          const loadPromises: Promise<void>[] = [];
          for (const [paneId, paneData] of Object.entries(workspaceData.contentData)) {
              if (!paneIdsInLayout.has(paneId)) continue;
              
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
                              ? msgs.map((m: any) => ({ ...m, id: m.id || generateId() }))
                              : [];

                          paneDataRef.chatMessages.allMessages = formatted;
                          paneDataRef.chatMessages.messages = formatted.slice(-paneDataRef.chatMessages.displayedMessageCount);
                          paneDataRef.chatStats = getConversationStats(formatted);
                      } else if (paneData.contentType === 'browser') {
                          paneDataRef.browserUrl = paneData.browserUrl || paneData.contentId;
                      }
                  } catch (err) {
                      console.error('[DESERIALIZE] Error loading pane content:', paneId, err);
                  }
              })();
              
              loadPromises.push(loadPromise);
          }
          
          await Promise.all(loadPromises);
          
          setRootLayoutNode(prev => (prev ? { ...prev } : null));
          
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

  const saveWorkspaceToStorage = useCallback((path: string, workspaceData: any) => {
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
  }, []);

  const loadWorkspaceFromStorage = useCallback((path: string) => {
      try {
          const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
          const workspace = allWorkspaces[path];
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
              }
          }
      };

      window.addEventListener('beforeunload', saveCurrentWorkspace);
      
      return () => {
          saveCurrentWorkspace();
          window.removeEventListener('beforeunload', saveCurrentWorkspace);
      };
  }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);


  const loadDirectoryStructureWithoutConversationLoad = async (dirPath: string) => {
      try {
          if (!dirPath) {
              return {};
          }
          const structureResult = await window.api.readDirectoryStructure(dirPath);
          if (structureResult && !structureResult.error) {
              setFolderStructure(structureResult);
          } else {
              setFolderStructure({ error: structureResult?.error || 'Failed' });
          }
          
          await loadConversationsWithoutAutoSelect(dirPath);
          return structureResult;
      } catch (err: any) {
          setError(err.message);
          setFolderStructure({ error: err.message });
          return { error: err.message };
      }
  };
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

          formattedConversations.sort((a: any, b: any) => 
              new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
          );
          
          setDirectoryConversations(formattedConversations);

      } catch (err: any) {
          setError(err.message);
          setDirectoryConversations([]);
      }
  };
  const createDefaultWorkspace = useCallback(async () => {
      const initialPaneId = generateId();
      const initialLayout: ContentNode = { id: initialPaneId, type: 'content' };
      
      contentDataRef.current[initialPaneId] = {};
      
      const storedConvoId = localStorage.getItem(LAST_ACTIVE_CONVO_ID_KEY);
      const currentConvos = directoryConversationsRef.current;
      
      let targetConvoId: string | null = null;
      if (storedConvoId && currentConvos.find((c: any) => c.id === storedConvoId)) {
          targetConvoId = storedConvoId;
      } else if (currentConvos.length > 0) {
          targetConvoId = currentConvos[0].id;
      }
      
      if (targetConvoId) {
          await updateContentPane(initialPaneId, 'chat', targetConvoId);
      } else {
          const newConversation = await window.api.createConversation({ directory_path: currentPath });
          if (newConversation?.id) {
              await updateContentPane(initialPaneId, 'chat', newConversation.id, true);
              setActiveConversation(newConversation.id);
          }
      }
      
      setRootLayoutNode(initialLayout);
      setActiveContentPaneId(initialPaneId);
  }, [updateContentPane, currentPath, setActiveConversation]);


  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [executionMode, setExecutionMode] = useState('chat');
  const [favoriteModels, setFavoriteModels] = useState<Set<string>>(new Set());
  const [showAllModels, setShowAllModels] = useState(true);

  const [availableJinxs, setAvailableJinxs] = useState<any[]>([]); // TODO: Type this
  const [favoriteJinxs, setFavoriteJinxs] = useState<Set<string>>(new Set());
  const [showAllJinxs, setShowAllJinxs] = useState(false);
  const [showJinxDropdown, setShowJinxDropdown] = useState(false);

  const [selectedJinx, setSelectedJinx] = useState<any>(null); // TODO: Type this
  const [jinxLoadingError, setJinxLoadingError] = useState<string | null>(null);
  
  const [jinxInputValues, setJinxInputValues] = useState<Record<string, Record<string, any>>>({}); // Stores { jinxName: { inputName: value, ... }, ... }

  useEffect(() => {
      const fetchJinxs = async () => {
          try {
              const globalResp = await window.api.getJinxsGlobal();
              let projectResp = { jinxs: [] };
              if (currentPath) {
                  try {
                      projectResp = await window.api.getJinxsProject(currentPath);
                  } catch (e: any) {
                      console.warn('Project jinxs fetch failed:', e?.message || e);
                  }
              }

              const normalize = (arr: any[], origin: string) =>
                  (arr || []).map((j: any) => {
                      let nm: string = '';
                      let desc = '';
                      let pathVal = '';
                      let group = '';
                      let inputs: any[] = [];
                      if (typeof j === 'string') {
                          nm = j;
                      } else if (j) {
                          nm = j.jinx_name || j.name;
                          desc = j.description || '';
                          pathVal = j.path || '';
                          inputs = Array.isArray(j.inputs) ? j.inputs : [];
                      }
                      if (!nm) return null;
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

              const seen = new Set<string>();
              const deduped: any[] = [];
              for (const j of merged) {
                  const key = j.name;
                  if (seen.has(key)) continue;
                  seen.add(key);
                  deduped.push(j);
              }

              setAvailableJinxs(deduped);
          } catch (err: any) {
              console.error('Error fetching jinxs:', err);
              setJinxLoadingError(err.message);
              setAvailableJinxs([]);
          }
      };

      fetchJinxs();
  }, [currentPath]);

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
          const names = tools.map((t: any) => t.function?.name).filter(Boolean);
          setSelectedMcpTools(prev => prev.filter(n => names.includes(n)));
      };
      loadMcpTools();
  }, [executionMode, mcpServerPath, currentPath]);

  useEffect(() => {
      const loadServers = async () => {
          if (executionMode !== 'tool_agent') return;
          const res = await window.api.getMcpServers(currentPath);
          if (res && Array.isArray(res.servers)) {
              setAvailableMcpServers(res.servers);
              if (!res.servers.find((s: any) => s.serverPath === mcpServerPath) && res.servers.length > 0) {
                  setMcpServerPath(res.servers[0].serverPath);
              }
          } else {
              setAvailableMcpServers([]);
          }
      };
      loadServers();
  }, [executionMode, currentPath]);
      
  const executionModes = useMemo(() => {
      const modes = [
          { id: 'chat', name: 'Chat', icon: MessageCircle, builtin: true },
          { id: 'tool_agent', name: 'Agent', icon: Wrench, builtin: true },
      ];

      (availableJinxs || []).forEach(jinx => {
          modes.push({
              id: jinx.name,
              name: `Jinx Agent: ${jinx.name}`,
              icon: Wrench,
              jinx,
              builtin: false
          });
      });

      return modes;
  }, [availableJinxs]);


  useEffect(() => {
      if (selectedJinx && Array.isArray(selectedJinx.inputs)) {
          setJinxInputValues(prev => {
              const currentJinxValues = prev[selectedJinx.name] || {};
              const newJinxValues = { ...currentJinxValues };

              selectedJinx.inputs.forEach((inputDef: any) => {
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
      const savedFavorites = localStorage.getItem('npcStudioFavoriteModels');
      if (savedFavorites) {
          setFavoriteModels(new Set(JSON.parse(savedFavorites)));
      }
  }, []);
  
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
      if (favoriteModels.size === 0) {
          return availableModels;
      }
  
      if (showAllModels) {
          return availableModels;
      }
      
      return availableModels.filter(m => favoriteModels.has(m.value));
  }, [availableModels, favoriteModels, showAllModels]);

  useEffect(() => {
      const savedJinxFavs = localStorage.getItem('npcStudioFavoriteJinxs');
      if (savedJinxFavs) {
          setFavoriteJinxs(new Set(JSON.parse(savedJinxFavs)));
      }
  }, []);

  const toggleFavoriteJinx = (jinxName: string) => {
      if (!jinxName) return;
      setFavoriteJinxs(prev => {
          const next = new Set(prev);
          if (next.has(jinxName)) next.delete(jinxName);
          else next.add(jinxName);
          localStorage.setItem('npcStudioFavoriteJinxs', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const jinxsToDisplay = useMemo(() => {
      if (favoriteJinxs.size === 0 || showAllJinxs) return availableJinxs;
      return availableJinxs.filter(j => favoriteJinxs.has(j.name));
  }, [availableJinxs, favoriteJinxs, showAllJinxs]);


  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
              e.preventDefault();
              setIsGlobalSearch(true);
              setIsSearching(true); 
              setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 });
              searchInputRef.current?.focus();
              return; 
          }
  
          if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
              const activePane = contentDataRef.current[activeContentPaneId!];
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

  const findNodeByPath = useCallback((node: LayoutNode | null, path: number[]) => {
      if (!node || !path) return null;
      let currentNode: LayoutNode | null = node;
      for (const index of path) {
          if (currentNode && currentNode.type === 'split' && currentNode.children && currentNode.children[index]) {
              currentNode = currentNode.children[index];
          } else {
              return null;
          }
      }
      return currentNode;
  }, []);

  const findNodePath = useCallback((node: LayoutNode | null, id: string, currentPath: number[] = []) => {
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
      const paneData = contentDataRef.current[paneId!];
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
  
          setRootLayoutNode(p => (p ? { ...p } : null));
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
  const handleStartConversationFromViewer = async (images: any[]) => { // TODO: Type images
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
          const backendResults = await window.api.performSearch({
              query: searchTerm,
              path: currentPath,
              global: true,
          });
          
          if (backendResults && !backendResults.error) {
              const sortedResults = (backendResults || []).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
              setDeepSearchResults(sortedResults);
          } else {
              throw new Error(backendResults?.error || "Global search failed.");
          }
      } catch (err: any) {
          console.error("Error during global search:", err);
          setError(err.message);
          setDeepSearchResults([]);
      } finally {
          setSearchLoading(false);
      }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const searchValue = e.target.value;
      setSearchTerm(searchValue);

      if (!searchValue.trim()) {
          setIsSearching(false);
          setDeepSearchResults([]);
          setMessageSearchResults([]);
      }
  };

  const toggleMessageSelection = useCallback((messageId: string) => {
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
  const handleMessageContextMenu = useCallback((e: React.MouseEvent, messageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
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
      
      setMessageContextMenuPos({ x: e.clientX, y: e.clientY, messageId, selectedText });
  }, [messageSelectionMode]);

  const handlePathChange = useCallback(async (newPath: string) => {
      if (currentPath && rootLayoutNode) {
          const workspaceData = serializeWorkspace();
          if (workspaceData) {
              saveWorkspaceToStorage(currentPath, workspaceData);
          }
      }
      
      setCurrentPath(newPath);
  }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage]);


  const validateWorkspaceData = (workspaceData: any) => {
      if (!workspaceData || typeof workspaceData !== 'object') return false;
      if (!workspaceData.layoutNode || !workspaceData.contentData) return false;
      return true;
  };


  const [pdfSelectionIndicator, setPdfSelectionIndicator] = useState<any>(null); // TODO: Type this

  const handlePdfTextSelect = (selectionEvent: any) => { // TODO: Type this
      if (selectionEvent?.selectedText?.trim()) {
          setSelectedPdfText({
              text: selectionEvent.selectedText,
              position: {
                  pageIndex: selectionEvent.pageIndex || 0,
                  quads: selectionEvent.quads || []
              }
          });
          
          setPdfSelectionIndicator({
              text: selectionEvent.selectedText.substring(0, 100),
              timestamp: Date.now()
          });
          
          setTimeout(() => {
              if (Date.now() - selectionEvent.timestamp < 2100) {
                  setPdfSelectionIndicator(null);
              }
          }, 2000);
      } else {
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
      const paneData = contentDataRef.current[activeContentPaneId!];
      if (!paneData || paneData.contentType !== 'pdf') return;

      const filePath = paneData.contentId!;
      const { text, position } = selectedPdfText;

      try {
          const saveResult = await window.api.addPdfHighlight({
              filePath,
              text,
              position: position,
              annotation: ''
          });

          if (saveResult.success) {
              await loadPdfHighlightsForActivePane();
          } else {
              console.error('[PDF] Failed to save highlight:', saveResult.error);
          }
      } catch (err) {
          console.error('[PDF] Error saving highlight:', err);
      }

      setPdfContextMenuPos(null);
  };


  const handleApplyPromptToPdfText = (promptType: string) => {
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


  const handleEditorContextMenu = (e: React.MouseEvent) => {
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start!, end!);
      
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

      setAnalysisContext({ type: 'conversations', ids: selectedIds });
      setDashboardMenuOpen(true);
      setContextMenuPos(null);
  };

  const handleAIEdit = async (action: string, customPrompt: string | null = null) => {
     
      setEditorContextMenuPos(null);

      if (action === 'edit' && customPrompt === null) {
          setPromptModal({
              isOpen: true,
              title: 'Customize AI Edit',
              message: 'Describe the changes you want the AI to make to the selected code.',
              defaultValue: 'Refactor this for clarity and efficiency',
              onConfirm: (userPrompt: string) => {
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
          const activePaneData = contentDataRef.current[activeContentPaneId!];
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
              tools: executionMode === 'agent' ? selectedMcpTools : [], // Assuming selectedTools is selectedMcpTools for agent mode
              mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
              selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
          });

          if (result && result.error) {
              throw new Error(result.error);
          }

      } catch (err: any) {
          console.error('Error processing AI edit:', err);
          setError(err.message);
          setAiEditModal(prev => ({
              ...prev,
              isLoading: false,
              isOpen: false,
          }));
      }
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

      setRootLayoutNode(p => (p ? { ...p } : null));
      
      setAiEditModal({ isOpen: false, type: '', selectedText: '', selectionStart: 0, selectionEnd: 0, aiResponse: '', showDiff: false, isLoading: false, proposedChanges: [] });
  };



  const handleApplyPromptToMessages = async (operationType: string, customPrompt = '') => {
      const selectedIds = Array.from(selectedMessages);
      if (selectedIds.length === 0) return;


      const activePaneData = contentDataRef.current[activeContentPaneId!];
      if (!activePaneData || !activePaneData.chatMessages) {
          console.error("No active chat pane data found for message operation.");
          return;
      }
      const allMessagesInPane = activePaneData.chatMessages.allMessages;
      const selectedMsgs = allMessagesInPane.filter(msg => selectedIds.includes(msg.id || msg.timestamp));

      
      if (selectedMsgs.length === 0) return;

      let prompt = '';
      // The original code had a bug here, referencing `selectedFilePaths` instead of `selectedMsgs`.
      // Corrected to use `selectedMsgs.length`.
      switch (operationType) {
          case 'summarize':
              prompt = `Summarize the content of these ${selectedMsgs.length} messages:\n\n`;
              break;
          case 'analyze':
              prompt = `Analyze the content of these ${selectedMsgs.length} messages for key insights:\n\n`;
              break;
          case 'refactor':
              prompt = `Refactor and improve the code in these ${selectedMsgs.length} messages:\n\n`;
              break;
          case 'document':
              prompt = `Generate documentation for these ${selectedMsgs.length} messages:\n\n`;
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
          const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
          
          if (!newConversation) throw new Error('Failed to create new conversation');

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

  const handleApplyPromptToCurrentConversation = async (operationType: string, customPrompt = '') => {
      const selectedIds = Array.from(selectedMessages);
      if (selectedIds.length === 0) return;
      
      const activePaneData = contentDataRef.current[activeContentPaneId!];
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

      const messagesText = selectedMsgs.map((msg: any, idx: number) => 
          `Message ${idx + 1} (${msg.role}):\n${msg.content}`
      ).join('\n\n');

      const fullPrompt = prompt + messagesText;

      setInput(fullPrompt);
      
      setSelectedMessages(new Set());
      setMessageContextMenuPos(null);
      setMessageSelectionMode(false);
  };

  const handleApplyPromptToFiles = async (operationType: string, customPrompt = '') => {
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

          paneData.chatMessages!.allMessages.push(userMessage, assistantPlaceholderMessage);
          paneData.chatMessages!.messages = paneData.chatMessages!.allMessages.slice(-paneData.chatMessages!.displayedMessageCount);

          setRootLayoutNode(prev => (prev ? { ...prev } : null));


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

      } catch (err: any) {
          console.error('Error processing files:', err);
          setError(err.message);
          setIsStreaming(false);
      } finally {
          setSelectedFiles(new Set());
          setFileContextMenuPos(null);
      }
  };

  const handleApplyPromptToFilesInInput = async (operationType: string, customPrompt = '') => {
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
          
      } catch (err: any) {
          console.error('Error preparing file prompt for input field:', err);
          setError(err.message);
      } finally {
          setSelectedFiles(new Set());
          setFileContextMenuPos(null);
      }
  };

  const handleFileContextMenu = (e: React.MouseEvent, filePath: string) => {
      e.preventDefault();
      if (!selectedFiles.has(filePath) && selectedFiles.size > 0) {
          setSelectedFiles(prev => new Set([...prev, filePath]));
      } else if (selectedFiles.size === 0) {
          setSelectedFiles(new Set([filePath]));
      }
      setFileContextMenuPos({ x: e.clientX, y: e.clientY, filePath });
  };


  const handleSidebarItemContextMenu = (e: React.MouseEvent, path: string, type: string) => {
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

      } catch (err: any) {
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
      setEditedSidebarItemName(currentName!);
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

          const filesContentPromises = response.files.map(async (filePath: string) => {
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

      } catch (err: any) {
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
          
          const formattedProjectNPCs = projectNPCs.map((npc: any) => ({
              ...npc,
              value: npc.name,
              display_name: `${npc.name} | Project`,
              source: 'project'
          }));
          
          const formattedGlobalNPCs = globalNPCs.map((npc: any) => ({
              ...npc,
              value: npc.name,
              display_name: `${npc.name} | Global`,
              source: 'global'
          }));
          
          const combinedNPCs = [...formattedProjectNPCs, ...formattedGlobalNPCs];
          setAvailableNPCs(combinedNPCs);
          return combinedNPCs;
      } catch (err: any) {
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
      const handleGlobalDismiss = (e: KeyboardEvent) => {
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

  useEffect(() => {
      if (currentPath) {
          loadWebsiteHistory();
      }
  }, [currentPath, loadWebsiteHistory]);

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
  }, [rootLayoutNode]);


  const renderMessageContextMenu = () => (
      messageContextMenuPos && (
          <>
              <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMessageContextMenuPos(null)}
              />
              <div
                  className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                  style={{ top: messageContextMenuPos.y, left: messageContextMenuPos.x }}
                  onMouseLeave={() => setMessageContextMenuPos(null)}
              >
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

  const performSplit = useCallback((targetNodePath: number[], side: 'left' | 'right' | 'top' | 'bottom', newContentType: PaneData['contentType'], newContentId: string | null) => {
      setRootLayoutNode(oldRoot => {
          if (!oldRoot) return oldRoot;

          const newRoot = JSON.parse(JSON.stringify(oldRoot));
          let parentNode: SplitNode | null = null;
          let targetNode: LayoutNode = newRoot;
          let targetIndexInParent = -1;

          for (let i = 0; i < targetNodePath.length; i++) {
              parentNode = targetNode as SplitNode;
              targetIndexInParent = targetNodePath[i];
              targetNode = (targetNode as SplitNode).children[targetIndexInParent];
          }

          const newPaneId = generateId();
          const newPaneNode: ContentNode = { id: newPaneId, type: 'content' };

          contentDataRef.current[newPaneId] = {};
          updateContentPane(newPaneId, newContentType, newContentId);

          const isHorizontalSplit = side === 'left' || side === 'right';
          const newSplitNode: SplitNode = {
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
    
    setRootLayoutNode(oldRoot => {
      contentDataRef.current[newPaneId] = {};
      
      if (!oldRoot) {
        return { id: newPaneId, type: 'content' };
      }

      let newRoot = JSON.parse(JSON.stringify(oldRoot));
      let targetParent: SplitNode | null = null;
      let targetIndex = -1;
      let pathToTarget: number[] = [];

      if (activeContentPaneId) {
        pathToTarget = findNodePath(newRoot, activeContentPaneId) || [];
        if (pathToTarget && pathToTarget.length > 0) {
          targetParent = findNodeByPath(newRoot, pathToTarget.slice(0, -1)) as SplitNode | null;
          targetIndex = pathToTarget[pathToTarget.length - 1];
        }
      }

      if (!targetParent || targetIndex === -1) {
        if (newRoot.type === 'content') {
          const newSplitNode: SplitNode = {
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
          const actualTargetParentInNewRoot = findNodeByPath(newRoot, pathToTarget.slice(0, -1)) as SplitNode | null;
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
  
  
  const closeContentPane = useCallback((paneId: string, nodePath: number[]) => {
      setRootLayoutNode(currentRoot => {
          if (!currentRoot) {
              return null;
          }

          let newRoot = JSON.parse(JSON.stringify(currentRoot));

          if (newRoot.id === paneId) {
              delete contentDataRef.current[paneId];
              setActiveContentPaneId(null);
              return null;
          }

          if (!nodePath || nodePath.length === 0) {
              return newRoot;
          }

          const parentPath = nodePath.slice(0, -1);
          const childIndex = nodePath[nodePath.length - 1];
          const parentNode = findNodeByPath(newRoot, parentPath) as SplitNode;

          if (!parentNode || !parentNode.children) {
              return currentRoot;
          }

          parentNode.children.splice(childIndex, 1);
          parentNode.sizes.splice(childIndex, 1);
          delete contentDataRef.current[paneId];


          if (parentNode.children.length === 1) {
              const remainingChild = parentNode.children[0];

              if (parentPath.length === 0) {
                  newRoot = remainingChild;
              } else {
                  const grandParentNode = findNodeByPath(newRoot, parentPath.slice(0, -1)) as SplitNode;
                  if (grandParentNode) {
                      const parentIndex = parentPath[parentPath.length - 1];
                      grandParentNode.children[parentIndex] = remainingChild;
                  }
              }
          } else if (parentNode.children.length > 1) {
              const equalSize = 100 / parentNode.children.length;
              parentNode.sizes = new Array(parentNode.children.length).fill(equalSize);
          }

          if (activeContentPaneId === paneId) {
              const remainingPaneIds = Object.keys(contentDataRef.current);
              const newActivePaneId = remainingPaneIds.length > 0 ? remainingPaneIds[0] : null;
              setActiveContentPaneId(newActivePaneId);
          }

          return newRoot;
      });
  }, [activeContentPaneId, findNodeByPath, rootLayoutNode]);
     
  const handleConversationSelect = useCallback(async (conversationId: string, skipMessageLoad = false) => {
      setActiveConversation(conversationId);
      setCurrentFile(null);

      if (isLoadingWorkspace) {
          return null;
      }

      const existingPaneId = Object.keys(contentDataRef.current).find(paneId => {
          const paneData = contentDataRef.current[paneId];
          return paneData?.contentType === 'chat' && paneData?.contentId === conversationId;
      });

      if (existingPaneId) {
          setActiveContentPaneId(existingPaneId);
          return existingPaneId;
      }

      let paneIdToUpdate: string;

      if (!rootLayoutNode) {
          const newPaneId = generateId();
          const newLayout: ContentNode = { id: newPaneId, type: 'content' };
          
          // Initialize contentDataRef.current for the new pane
          contentDataRef.current[newPaneId] = {
              contentType: 'chat',
              contentId: conversationId,
              chatMessages: { messages: [], allMessages: [], displayedMessageCount: 20 }
          };
          // Update the rootLayoutNode and clone contentDataRef.current
          setRootLayoutNode(newLayout);
          contentDataRef.current = { ...contentDataRef.current }; // Clone to force update
          setContentDataVersion(prev => prev + 1); // Increment version

          paneIdToUpdate = newPaneId;
      } else {
          paneIdToUpdate = activeContentPaneId || Object.keys(contentDataRef.current)[0];
          
          if (paneIdToUpdate && contentDataRef.current[paneIdToUpdate]) {
              // Pane exists, just update its contentDataRef entry
              const paneData = contentDataRef.current[paneIdToUpdate];
              paneData.contentType = 'chat';
              paneData.contentId = conversationId;
              paneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
              if (skipMessageLoad) {
                  paneData.chatMessages.messages = [];
                  paneData.chatMessages.allMessages = [];
                  paneData.chatStats = getConversationStats([]);
              }
              contentDataRef.current = { ...contentDataRef.current }; // Clone to force update
              setContentDataVersion(prev => prev + 1); // Increment version
          } else {
              // No valid pane to update, create a new one
              const newPaneId = createAndAddPaneNodeToLayout(); // This already updates rootLayoutNode and contentDataRef.current
              paneIdToUpdate = newPaneId;
              // Initialize contentDataRef.current for the new pane created by createAndAddPaneNodeToLayout
              const newPaneData = contentDataRef.current[newPaneId];
              newPaneData.contentType = 'chat';
              newPaneData.contentId = conversationId;
              newPaneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
              if (skipMessageLoad) {
                  newPaneData.chatMessages.messages = [];
                  newPaneData.chatMessages.allMessages = [];
                  newPaneData.chatStats = getConversationStats([]);
              }
              contentDataRef.current = { ...contentDataRef.current }; // Clone to force update
              setContentDataVersion(prev => prev + 1); // Increment version
          }
      }

      // Asynchronously load messages if not skipped
      if (!skipMessageLoad) {
          await updateContentPane(paneIdToUpdate, 'chat', conversationId, false);
      }
      
      // A final setRootLayoutNode is not strictly needed here if updateContentPane already increments version,
      // but keeping it for now to ensure consistency.
      setRootLayoutNode(prev => (prev ? { ...prev } : null));

      setActiveContentPaneId(paneIdToUpdate);
      return paneIdToUpdate;
  }, [isLoadingWorkspace, rootLayoutNode, activeContentPaneId, setActiveConversation, setCurrentFile, findNodePath, findNodeByPath, createAndAddPaneNodeToLayout, updateContentPane, setContentDataVersion]);

  
  const cleanupPhantomPanes = useCallback(() => {
    const validPaneIds = new Set<string>();
    
    const collectPaneIds = (node: LayoutNode | null) => {
      if (!node) return;
      if (node.type === 'content') validPaneIds.add(node.id);
      if (node.type === 'split') {
        node.children.forEach(collectPaneIds);
      }
    };
    
    collectPaneIds(rootLayoutNode);
    
    Object.keys(contentDataRef.current).forEach(paneId => {
      if (!validPaneIds.has(paneId)) {
        delete contentDataRef.current[paneId];
      }
    });
  }, [rootLayoutNode]);

  useEffect(() => {
      if (rootLayoutNode) {
          const synchronizedContentData = { ...contentDataRef.current };
          
          const originalContentDataKeys = Object.keys(contentDataRef.current);
          
          const updatedLayoutNode = syncLayoutWithContentData(rootLayoutNode, synchronizedContentData);
          
          const newContentDataKeys = Object.keys(synchronizedContentData);

          if (originalContentDataKeys.length !== newContentDataKeys.length || 
              !originalContentDataKeys.every(key => synchronizedContentData.hasOwnProperty(key)) ||
              !newContentDataKeys.every(key => contentDataRef.current.hasOwnProperty(key))
          ) {
              contentDataRef.current = synchronizedContentData;
              setRootLayoutNode(prev => (prev ? { ...prev } : null));
          }

          if (updatedLayoutNode !== rootLayoutNode) {
              setRootLayoutNode(updatedLayoutNode);
          }

      } else {
          if (Object.keys(contentDataRef.current).length > 0) {
              contentDataRef.current = {};
              setRootLayoutNode(prev => (prev ? { ...prev } : null));
          }
      }
  }, [rootLayoutNode, syncLayoutWithContentData]);


  const handleFileClick = useCallback(async (filePath: string) => {
      setCurrentFile(filePath);
      setActiveConversation(null);

      const extension = filePath.split('.').pop()?.toLowerCase();
      let contentType: PaneData['contentType'] = 'editor';
      
      if (extension === 'pdf') contentType = 'pdf';
      else if (['csv', 'xlsx', 'xls'].includes(extension)) contentType = 'csv';
      else if (extension === 'pptx') contentType = 'pptx';
      else if (extension === 'tex') contentType = 'latex';
      else if (['docx', 'doc'].includes(extension)) contentType = 'docx';

      const newPaneId = generateId();
      
      setRootLayoutNode(oldRoot => {
          contentDataRef.current[newPaneId] = {};
          
          if (!oldRoot) {
              return { id: newPaneId, type: 'content' };
          }

          let newRoot = JSON.parse(JSON.stringify(oldRoot));
          
          if (activeContentPaneId) {
              const pathToActive = findNodePath(newRoot, activeContentPaneId) || [];
              if (pathToActive && pathToActive.length > 0) {
                  const targetParent = findNodeByPath(newRoot, 
                      pathToActive.slice(0, -1)
                  ) as SplitNode | null;
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
      
      // Execute directly, no setTimeout
      await updateContentPane(newPaneId, contentType, filePath);
      
      setActiveContentPaneId(newPaneId);
  }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, setActiveConversation]);  
  const handleCreateNewFolder = () => {
      setPromptModal({
          isOpen: true,
          title: 'Create New Folder',
          message: 'Enter the name for the new folder.',
          defaultValue: 'new-folder',
          onConfirm: async (folderName: string) => {
              if (!folderName || !folderName.trim()) return;
  
              const newFolderPath = normalizePath(`${currentPath}/${folderName}`);
              
              try {
                  const response = await window.api.createDirectory(newFolderPath);
                  
                  if (response?.error) {
                      throw new Error(response.error);
                  }
  
                  await loadDirectoryStructure(currentPath);
  
              } catch (err: any) {
                  console.error('Error creating new folder:', err);
                  setError(`Failed to create folder: ${err.message}`);
              }
          },
      });
  };
  const createNewTerminal = useCallback(async () => {
      const newTerminalId = `term_${generateId()}`;
      const newPaneId = generateId();
      
      setRootLayoutNode(oldRoot => {
          contentDataRef.current[newPaneId] = {};
          
          if (!oldRoot) {
              return { id: newPaneId, type: 'content' };
          }

          let newRoot = JSON.parse(JSON.stringify(oldRoot));
          
          if (activeContentPaneId) {
              const pathToActive = findNodePath(newRoot, activeContentPaneId) || [];
              if (pathToActive && pathToActive.length > 0) {
                  const targetParent = findNodeByPath(newRoot, pathToActive.slice(0, -1)) as SplitNode | null;
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
      
      // Execute directly, no setTimeout
      await updateContentPane(newPaneId, 'terminal', newTerminalId);
      
      setActiveContentPaneId(newPaneId);
      setActiveConversation(null);
      setCurrentFile(null);
  }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, setActiveConversation]);
  
  
  const handleGlobalDragStart = useCallback((e: React.DragEvent, item: any) => { // TODO: Type item
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
    
  const createNewBrowser = useCallback(async (url: string | null = null) => {
      if (!url) {
          setBrowserUrlDialogOpen(true);
          return;
      }

      const newBrowserId = `browser_${generateId()}`;
      const newPaneId = generateId();
      
      setRootLayoutNode(oldRoot => {
          contentDataRef.current[newPaneId] = {};
          
          if (!oldRoot) {
              return { id: newPaneId, type: 'content' };
          }

          let newRoot = JSON.parse(JSON.stringify(oldRoot));
          
          if (activeContentPaneId) {
              const pathToActive = findNodePath(newRoot, activeContentPaneId) || [];
              if (pathToActive && pathToActive.length > 0) {
                  const targetParent = findNodeByPath(newRoot, pathToActive.slice(0, -1)) as SplitNode | null;
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
      
      // Execute directly, no setTimeout
      await updateContentPane(newPaneId, 'browser', newBrowserId);
      if (contentDataRef.current[newPaneId]) {
          contentDataRef.current[newPaneId].browserUrl = url;
      }
      
      setActiveContentPaneId(newPaneId);
      setActiveConversation(null);
      setCurrentFile(null);
  }, [activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, setActiveConversation]);
  const handleBrowserDialogNavigate = (url: string) => {
        createNewBrowser(url);
        setBrowserUrlDialogOpen(false);
    };
  const moveContentPane = useCallback((draggedId: string, draggedPath: number[], targetPath: number[], dropSide: 'left' | 'right' | 'top' | 'bottom' | 'center') => {
      setRootLayoutNode(oldRoot => {
          if (!oldRoot) return oldRoot;

          let newRoot = JSON.parse(JSON.stringify(oldRoot));

          const draggedNode = findNodeByPath(newRoot, draggedPath);
          if (!draggedNode) {
              return oldRoot;
          }

          const removeNode = (root: LayoutNode, path: number[]): LayoutNode => {
              if (path.length === 1) {
                  (root as SplitNode).children.splice(path[0], 1);
                  (root as SplitNode).sizes.splice(path[0], 1);
                  return root;
              }

              const parent = findNodeByPath(root, path.slice(0, -1)) as SplitNode;
              const childIndex = path[path.length - 1];
              if (parent && parent.children) {
                  parent.children.splice(childIndex, 1);
                  parent.sizes.splice(childIndex, 1);
              }
              return root;
          };
          
          newRoot = removeNode(newRoot, draggedPath);

          const cleanup = (node: LayoutNode | null): LayoutNode | null => {
              if (!node) return null;
              if (node.type === 'split') {
                  if (node.children.length === 1) {
                      return cleanup(node.children[0]);
                  }
                  node.children = node.children.map(cleanup).filter(Boolean) as LayoutNode[];
                  if (node.children.length === 0) return null;
                  const equalSize = 100 / node.children.length;
                  node.sizes = new Array(node.children.length).fill(equalSize);
              }
              return node;
          };

          newRoot = cleanup(newRoot);
          if (!newRoot) return draggedNode;

          const newTargetPath = findNodePath(newRoot, (findNodeByPath(oldRoot, targetPath) as LayoutNode)?.id || '');
          if (!newTargetPath) {
              return oldRoot;
          }

          const insertNode = (root: LayoutNode, path: number[], nodeToInsert: LayoutNode, side: 'left' | 'right' | 'top' | 'bottom' | 'center'): LayoutNode => {
              const targetNode = findNodeByPath(root, path);
              if (!targetNode) return root;

              const isHorizontal = side === 'left' || side === 'right';
              const newSplit: SplitNode = {
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
              
              if (path.length === 0) {
                  return newSplit;
              }

              const parent = findNodeByPath(root, path.slice(0, -1)) as SplitNode;
              const childIndex = path[path.length - 1];
              if (parent && parent.children) {
                  parent.children[childIndex] = newSplit;
              }
              return root;
          };

          newRoot = insertNode(newRoot, newTargetPath, draggedNode, dropSide);

          setActiveContentPaneId(draggedId);
          return newRoot;
      });
  }, [findNodeByPath, findNodePath]);


  const renderBrowserViewer = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData) {
          return <div className="p-4 theme-text-muted">Initializing browser pane...</div>;
      }

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <WebBrowserViewer
                  key={nodeId}
                  initialUrl={paneData.browserUrl}
                  viewId={paneData.contentId}
                  currentPath={currentPath}
              />
          </div>
      );
  }, [contentDataRef, currentPath]);

  useEffect(() => {
         
          const cleanup = window.api.onBrowserShowContextMenu(({ x, y, selectedText, viewId }) => {
              setBrowserContextMenu({ isOpen: true, x, y, selectedText, viewId });
          });
      
          const handleClickOutside = () => {
              setBrowserContextMenu(currentState => {
                 
                  if (currentState.isOpen) {
                     
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
      
  const renderCsvViewer = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData?.contentId) return null;

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <CsvViewer
                  filePath={paneData.contentId}
                  nodeId={nodeId}
              />
          </div>
      );
  }, [contentDataRef]);
  const renderPptxViewer = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData?.contentId) return null;

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <PptxViewer
                  filePath={paneData.contentId}
                  nodeId={nodeId}
              />
          </div>
      );
  }, [contentDataRef]);
  const renderLatexViewer = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData?.contentId) return null;

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <LatexViewer
                  filePath={paneData.contentId}
                  nodeId={nodeId}
              />
          </div>
      );
  }, [contentDataRef]);
  const renderDocxViewer = useCallback(({ nodeId }: { nodeId: string }) => {
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
      
  const handlePdfContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (selectedPdfText?.text && selectedPdfText.text.trim()) {
          setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
      } else {
          setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
      }
  };
  const renderPdfViewer = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData?.contentId) return null;

      const handlePdfContextMenuInternal = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (selectedPdfText?.text) {
              setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
          }
      };

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <div className="flex-1 min-h-0">
                  <PdfViewer
                      filePath={paneData.contentId}
                      highlights={pdfHighlights}
                      onTextSelect={handlePdfTextSelect}
                      onContextMenu={handlePdfContextMenuInternal}
                      onHighlightAddedCallback={loadPdfHighlightsForActivePane}
                  />
              </div>
          </div>
      );
  }, [contentDataRef, selectedPdfText, pdfHighlights, handlePdfTextSelect, loadPdfHighlightsForActivePane, setPdfContextMenuPos]);
  const renderTerminalView = useCallback(({ nodeId }: { nodeId: string }) => {
      const paneData = contentDataRef.current[nodeId];
      if (!paneData) return null;

      const { contentId: terminalId } = paneData;

      return (
          <div className="flex-1 flex flex-col theme-bg-secondary relative">
              <div className="flex-1 overflow-hidden min-h-0">
                  <TerminalView
                      terminalId={terminalId!}
                      currentPath={currentPath}
                      isActive={activeContentPaneId === nodeId}
                  />
              </div>
          </div>
      );
  }, [contentDataRef, currentPath, activeContentPaneId]);

  const renderPaneContextMenu = () => {
    if (!paneContextMenu?.isOpen) return null;
    const { x, y, nodeId, nodePath } = paneContextMenu;

    const closePane = () => {
      closeContentPane(nodeId, nodePath);
      setPaneContextMenu(null);
    };

    const splitPane = (side: 'left' | 'right' | 'top' | 'bottom') => {
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

          const newPaneId = generateId();
          
          let newRootLayout: LayoutNode;
          setRootLayoutNode(oldRoot => {
              // Initialize contentData entry synchronously within the state update
              contentDataRef.current[newPaneId] = {
                  contentType: 'chat', // Set initial content type
                  contentId: conversation.id, // Set initial content ID
                  chatMessages: { messages: [], allMessages: [], displayedMessageCount: 20 },
                  fileChanged: false, // Default
              };
              if (skipMessageLoad) {
                  // If skipping message load, ensure chatMessages are empty initially
                  contentDataRef.current[newPaneId].chatMessages = {
                      messages: [], allMessages: [], displayedMessageCount: 20
                  };
                  contentDataRef.current[newPaneId].chatStats = getConversationStats([]);
              }

              if (!oldRoot) {
                  newRootLayout = { id: newPaneId, type: 'content' };
              } else {
                  let tempNewRoot = JSON.parse(JSON.stringify(oldRoot)); // Deep copy to modify
                  let targetParent: SplitNode | null = null;
                  let targetIndex = -1;
                  let pathToActive: number[] = [];

                  if (activeContentPaneId) {
                      pathToActive = findNodePath(tempNewRoot, activeContentPaneId) || [];
                      if (pathToActive && pathToActive.length > 0) {
                          targetParent = findNodeByPath(tempNewRoot, pathToActive.slice(0, -1)) as SplitNode | null;
                          targetIndex = pathToActive[pathToActive.length - 1];
                      }
                  }
                  
                  if (targetParent && targetParent.type === 'split') {
                      const newChildren = [...targetParent.children];
                      newChildren.splice(targetIndex + 1, 0, { id: newPaneId, type: 'content' });
                      const newSizes = new Array(newChildren.length).fill(100 / newChildren.length);
                      const actualTargetParentInNewRoot = findNodeByPath(tempNewRoot, pathToActive.slice(0, -1)) as SplitNode;
                      if (actualTargetParentInNewRoot) {
                          actualTargetParentInNewRoot.children = newChildren;
                          actualTargetParentInNewRoot.sizes = newSizes;
                      }
                      newRootLayout = tempNewRoot;
                  } else if (tempNewRoot.type === 'content') {
                      newRootLayout = {
                          id: generateId(), // This ID is for the new split node
                          type: 'split',
                          direction: 'horizontal',
                          children: [tempNewRoot, { id: newPaneId, type: 'content' }],
                          sizes: [50, 50],
                      };
                  } else if (tempNewRoot.type === 'split') {
                      tempNewRoot.children.push({ id: newPaneId, type: 'content' });
                      const equalSize = 100 / tempNewRoot.children.length;
                      tempNewRoot.sizes = new Array(tempNewRoot.children.length).fill(equalSize);
                      newRootLayout = tempNewRoot;
                  } else {
                      newRootLayout = { id: newPaneId, type: 'content' };
                  }
              }
              
              // CRITICAL: Update contentDataRef.current with a new object reference
              // to ensure any consuming components re-render.
              contentDataRef.current = { ...contentDataRef.current };
              setContentDataVersion(prev => prev + 1); // Increment version to force re-render

              return newRootLayout;
          });

          if (!skipMessageLoad) {
              // This will call updateContentPane, which will update contentDataRef.current and increment contentDataVersion again.
              // That's fine, it just means two increments for initial load, but ensures data is loaded.
              await updateContentPane(newPaneId, 'chat', conversation.id, false);
          }
          
          setActiveContentPaneId(newPaneId);
          setActiveConversation(conversation.id);
          setCurrentFile(null);

          return { conversation, paneId: newPaneId };

      } catch (err: any) {
          console.error("Error creating new conversation:", err);
          setError(err.message);
          return { conversation: null, paneId: null };
      }
  }, [currentPath, activeContentPaneId, findNodePath, findNodeByPath, updateContentPane, setActiveConversation, setContentDataVersion]);

  const createNewTextFile = async () => {
          try {
              const filename = `untitled-${Date.now()}.txt`;
              const filepath = normalizePath(`${currentPath}/${filename}`);
              await window.api.writeFileContent(filepath, '');
              await loadDirectoryStructure(currentPath);
              await handleFileClick(filepath);
          } catch (err: any) {
              setError(err.message);
          }
      };


  const [contextHash, setContextHash] = useState('');

  const hashContext = (contexts: any[]) => { // TODO: Type contexts
      const contentString = contexts
          .map(ctx => `${ctx.type}:${ctx.path || ctx.url}:${ctx.content?.substring(0, 100)}`)
          .join('|');
      return btoa(contentString);
  };

  const gatherWorkspaceContext = useCallback(() => {
      const contexts: any[] = []; // TODO: Type contexts
      
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
  }, []); // No dependencies needed as contentDataRef.current is a ref

  const handleInputSubmit = async (e: React.FormEvent | React.KeyboardEvent, promptOverride?: string, targetPaneId?: string, targetConversationId?: string) => {
      e.preventDefault();

      const isJinxMode = executionMode !== 'chat' && selectedJinx;
      const currentJinxInputs = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};
      const hasJinxContent = isJinxMode && Object.values(currentJinxInputs).some(val => val !== null && String(val).trim());

      const hasContent = input.trim() || uploadedFiles.length > 0 || hasJinxContent || promptOverride;

      if (isStreaming || !hasContent || (!activeContentPaneId && !isJinxMode && !targetPaneId)) {
          if (!isJinxMode && !activeContentPaneId && !targetPaneId) {
              console.error("No active chat pane to send message to.");
          }
          return;
      }

      const currentTargetPaneId = targetPaneId || activeContentPaneId;
      if (!currentTargetPaneId) {
          console.error("No target pane ID available.");
          return;
      }

      const paneData = contentDataRef.current[currentTargetPaneId];
      if (!paneData || paneData.contentType !== 'chat' || !paneData.contentId) {
          console.error("No active chat pane to send message to.");
          return;
      }

      const conversationId = targetConversationId || paneData.contentId;
      const newStreamId = generateId();

      streamToPaneRef.current[newStreamId] = currentTargetPaneId;
      setIsStreaming(true);

      let finalPromptForUserMessage = promptOverride || input;
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
                  finalPromptForUserMessage = `${finalPromptForUserMessage}

Available context:
${contextPrompt}

IMPORTANT: Propose changes as unified diffs, NOT full file contents.`;
              } else {
                  finalPromptForUserMessage = `${finalPromptForUserMessage}

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

      setRootLayoutNode(prev => (prev ? { ...prev } : null));
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
                  jinxName: jinxName!,
                  jinxArgs: jinxArgsForApi,
                  currentPath,
                  conversationId: conversationId!,
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
                  conversationId: conversationId!,
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
                  mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
                  selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
              });
          }
      } catch (err: any) {
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
          
      } catch (err: any) {
          console.error('Error saving file:', err);
          setError(err.message);
      } finally {
          setIsSaving(false);
      }
  };
  const handleFileContentChange = useCallback((value: string) => {
      setFileContent(value);
      setFileChanged(true);
  }, []);

  const handleTextSelection = useCallback((from: number, to: number) => {
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

  const switchToPath = useCallback(async (newPath: string) => {
      if (newPath === currentPath) {
          return;
      }
      
      if (currentPath && rootLayoutNode) {
          const workspaceData = serializeWorkspace();
          if (workspaceData) {
              saveWorkspaceToStorage(currentPath, workspaceData);
          }
      }
      
      setRootLayoutNode(null);
      setActiveContentPaneId(null);
      contentDataRef.current = {};
      setActiveConversation(null);
      setCurrentFile(null);
      
      setCurrentPath(newPath);
  }, [currentPath, rootLayoutNode, serializeWorkspace, saveWorkspaceToStorage, setActiveConversation]);

  const renderActiveWindowsIndicator = () => {
      const [otherWindows, setOtherWindows] = useState<any[]>([]); // TODO: Type this
      
      useEffect(() => {
          const checkOtherWindows = () => {
              try {
                  const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                  const now = Date.now();
                  const others = Object.entries(activeWindows)
                      .filter(([wId]) => wId !== windowId)
                      .filter(([, data]: any) => !data.closing)
                      .filter(([, data]: any) => (now - data.lastActive) < 30000)
                      .map(([wId, data]: any) => ({
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
          const interval = setInterval(checkOtherWindows, 5000);
          return () => clearInterval(interval);
      }, [windowId]);
      
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
      const allWorkspaces = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
      const workspaceData = allWorkspaces[currentPath];
      const hasWorkspace = !!workspaceData;
      
      const countPanesInLayout = (node: LayoutNode | null): number => {
          if (!node) return 0;
          if (node.type === 'content') return 1;
          if (node.type === 'split') {
              return node.children.reduce((count, child) => count + countPanesInLayout(child), 0);
          }
          return 0;
      };
      const layoutPaneCount = countPanesInLayout(rootLayoutNode);
      
      const workspaceInfo = workspaceData ? {
          paneCount: layoutPaneCount,
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
                          Layout panes: {layoutPaneCount} | ContentData panes: {Object.keys(contentDataRef.current).length}
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
                                              setRootLayoutNode(p => (p ? { ...p } : null));
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
                                          const stored = JSON.parse(localStorage.getItem(WORKSPACES_STORAGE_KEY) || '{}');
                                          if (stored[currentPath]) {
                                              delete stored[currentPath];
                                              localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(stored));
                                          }
                                          
                                          const validPaneIds = new Set<string>();
                                          const collectPaneIds = (node: LayoutNode | null) => {
                                              if (!node) return;
                                              if (node.type === 'content') validPaneIds.add(node.id);
                                              if (node.type === 'split') {
                                                  node.children.forEach(collectPaneIds);
                                              }
                                          };
                                          collectPaneIds(rootLayoutNode);
                                          
                                          Object.keys(contentDataRef.current).forEach(paneId => {
                                              if (!validPaneIds.has(paneId)) {
                                                  delete contentDataRef.current[paneId];
                                              }
                                          });
                                          
                                          setRootLayoutNode(p => (p ? { ...p } : null));
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
                                      setRootLayoutNode(p => (p ? { ...p } : null));
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

  const startAgenticEdit = async (instruction: string) => {
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

Only show the lines that change, with a few lines of context. Multiple files = multiple FILE blocks.`;

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
                  executionMode: executionMode,
                  mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
                  selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined
              });
      } catch (err: any) {
          console.error('Error starting agentic edit:', err);
          setError(err.message);
          setAiEditModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
      }
  };

  const parseAgenticResponse = useCallback((response: string, contexts: any[]) => { // TODO: Type contexts
      const changes: any[] = []; // TODO: Type changes
      const fileRegex = /FILE:\s*(.+?)\s*\nREASONING:\s*(.+?)\s*\n```diff\n([\s\S]*?)```/gi;
      
      let match;
      while ((match = fileRegex.exec(response)) !== null) {
          const filePath = match[1].trim();
          const reasoning = match[2].trim();
          const rawUnifiedDiffText = match[3].trim();
          
          const context = contexts.find(c => 
              c.path.includes(filePath) || filePath.includes(c.path.split('/').pop()!)
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
      
      return changes;
  }, []); // No dependencies needed as applyUnifiedDiff and generateInlineDiff are external or stable

  const deleteSelectedConversations = async () => {
     const selectedConversationIds = Array.from(selectedConvos);
     const selectedFilePaths = Array.from(selectedFiles);
     
     if (selectedConversationIds.length === 0 && selectedFilePaths.length === 0) {
         return;
     }
     
     try {
        
         if (selectedConversationIds.length > 0) {
             await Promise.all(selectedConversationIds.map(id => window.api.deleteConversation(id)));
         }
         
         if (selectedFilePaths.length > 0) {
             await Promise.all(selectedFilePaths.map(filePath => window.api.deleteFile(filePath)));
         }

        
         await loadDirectoryStructure(currentPath);

     } catch (err: any) {
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
      
      const handleAIStreamData = (_: any, { streamId, chunk }: { streamId: string, chunk: any }) => {
          if (streamId !== currentStreamId) return;
          
          try {
              let content = '';
              if (typeof chunk === 'string') {
                  if (chunk.startsWith('data:')) {
                      const dataContent = chunk.replace(/^data:\s*/, '').trim();
                      if (dataContent === '[DONE]') {
                          const idx = contentDataRef.current[activeContentPaneId!]?.chatMessages?.allMessages.findIndex(m => m.id === streamId);
                          if (idx !== -1) {
                              const msg = contentDataRef.current[activeContentPaneId!]?.chatMessages?.allMessages[idx];
                              if (msg) {
                                  msg.isStreaming = false;
                                  msg.streamId = null;
                                  contentDataRef.current[activeContentPaneId!]!.chatMessages!.messages = contentDataRef.current[activeContentPaneId!]!.chatMessages!.allMessages.slice(-(contentDataRef.current[activeContentPaneId!]!.chatMessages!.displayedMessageCount || 20));
                                  setRootLayoutNode(prev => (prev ? { ...prev } : null));
                              }
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
              console.error('Error processing AI edit stream chunk:', err, 'Raw chunk:', chunk);
          }
      };


  const handleAIStreamComplete = async (_: any, { streamId }: { streamId: string }) => {
      if (streamId !== currentStreamId) return;
      
      setAiEditModal(prev => ({
          ...prev,
          isLoading: false,
      }));

      const latestAiEditModal = aiEditModal;
      if (latestAiEditModal.type === 'agentic' && latestAiEditModal.aiResponse) {
          const contexts = gatherWorkspaceContext().filter(c => c.type === 'file');
          const proposedChanges = parseAgenticResponse(latestAiEditModal.aiResponse, contexts);
          
          setAiEditModal(prev => ({
              ...prev,
              proposedChanges: proposedChanges,
              showDiff: proposedChanges.length > 0,
          }));
      }
  };

      const handleAIStreamError = (_: any, { streamId, error }: { streamId: string, error: any }) => {
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
  }, [aiEditModal.isOpen, aiEditModal.isLoading, aiEditModal.streamId, aiEditModal.aiResponse, activeContentPaneId]);


  useEffect(() => {
      if (activeConversationId) {
          localStorage.setItem(LAST_ACTIVE_CONVO_ID_KEY, activeConversationId);
      } else {
          localStorage.removeItem(LAST_ACTIVE_CONVO_ID_KEY);
      }
  }, [activeConversationId]);    


  const startNewConversationWithNpc = async (npc: any) => { // TODO: Type npc
      try {
          const { conversation, paneId } = await createNewConversation();
          if (conversation) {
             
              setCurrentNPC(npc.name);
              
             
              const newMessages = [{ 
                  role: 'assistant', 
                  content: `Hello, I'm ${npc.name}. ${npc.primary_directive}`, 
                  timestamp: new Date().toISOString(), 
                  npc: npc.name,
                  model: npc.model || currentModel
              }];

              if (contentDataRef.current[paneId!]) {
                contentDataRef.current[paneId!]!.chatMessages = {
                  messages: newMessages,
                  allMessages: newMessages,
                  displayedMessageCount: 10
                };
                contentDataRef.current[paneId!]!.chatStats = getConversationStats(newMessages);
                setRootLayoutNode(prev => (prev ? { ...prev } : null));
              }
          }
      } catch (error: any) {
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

  const handleMemoryDecision = async (memoryId: string, decision: string, finalMemory: string | null = null) => {
      try {
          await window.api.approveMemory({
              memory_id: memoryId,
              decision: decision,
              final_memory: finalMemory
          });
          
          setPendingMemories(prev => prev.filter(m => m.memory_id !== memoryId));
      } catch (err: any) {
          console.error('Error processing memory decision:', err);
          setError(err.message);
      }
  };
  
  const handleBatchMemoryProcess = (memories: any[], decisions: any) => { // TODO: Type memories, decisions
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

  const loadDefaultPath = async (callback?: (path: string) => void) => {
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
              return {};
          }
          const structureResult = await window.api.readDirectoryStructure(currentPath);
          if (structureResult && !structureResult.error) {
              setFolderStructure(structureResult);
          } else {
              setFolderStructure({ error: structureResult?.error || 'Failed' });
          }
          
          return structureResult;
      } catch (err: any) {
          setError(err.message);
          setFolderStructure({ error: err.message });
          return { error: err.message };
      }
  };
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
  }, [currentPath]); // Dependency: currentPath
  const loadConversations = async (dirPath: string) => {
      let currentActiveId = activeConversationId;
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

          formattedConversations.sort((a: any, b: any) => 
              new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
          );
          
          setDirectoryConversations(formattedConversations);

          const hasOpenConversation = Object.values(contentDataRef.current).some(
              paneData => paneData?.contentType === 'chat' && paneData?.contentId
          );

          const activeExists = formattedConversations.some((c: any) => c.id === currentActiveId);

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
          }

      } catch (err: any) {
          setError(err.message);
          setDirectoryConversations([]);
          
          const hasOpenConversation = Object.values(contentDataRef.current).some(
              paneData => paneData?.contentType === 'chat' && paneData?.contentId
          );
          
          if (!activeConversationId && !hasOpenConversation && initialLoadComplete.current) {
              await createNewConversation();
          }
      }
  };
  const loadDirectoryStructure = async (dirPath: string) => {
      try {
          if (!dirPath) {
              return {};
          }
          const structureResult = await window.api.readDirectoryStructure(dirPath);
          if (structureResult && !structureResult.error) {
              setFolderStructure(structureResult);
          } else {
              setFolderStructure({ error: structureResult?.error || 'Failed' });
          }
          await loadConversations(dirPath);
          return structureResult;
      } catch (err: any) {
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
      } catch (err: any) {
          console.error('Error fetching models:', err);
          setModelsError(err.message);
          setAvailableModels([]);
          return [];
      } finally {
          setModelsLoading(false);
      }
  };
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
      
      const activityInterval = setInterval(updateActivity, 30000);
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

  useEffect(() => {
      const handleBeforeUnload = () => {
          if (currentPath && rootLayoutNode) {
              const workspaceData = serializeWorkspace();
              if (workspaceData) {
                  saveWorkspaceToStorage(currentPath, workspaceData);
              }
          }
          
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
        const initApplicationData = useCallback(async () => {
      setLoading(true);
      setError(null);

      if (!config) {
          try {
              const loadedConfig = await window.api.getDefaultConfig();
              if (!loadedConfig || !loadedConfig.baseDir) throw new Error('Invalid config');
              setConfig(loadedConfig);
              setBaseDir(loadedConfig.baseDir);
              return;
          } catch (err: any) {
              console.error('Initial config load error:', err);
              setError(err.message);
              setLoading(false);
              return;
          }
      }
      const globalSettings = await window.api.loadGlobalSettings();
      if (globalSettings) {
          setIsPredictiveTextEnabled(globalSettings.global_settings?.is_predictive_text_enabled || false);
          setPredictiveTextModel(globalSettings.global_settings?.predictive_text_model || 'llama3.2');
          setPredictiveTextProvider(globalSettings.global_settings?.predictive_text_provider || 'ollama');
      }
      let initialPathToLoad = config.baseDir;
      const storedPath = localStorage.getItem(LAST_ACTIVE_PATH_KEY);
      if (storedPath) {
          const pathExistsResponse = await window.api.readDirectoryStructure(storedPath);
          if (!pathExistsResponse?.error) {
              initialPathToLoad = storedPath;
          } else {
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

      setIsLoadingWorkspace(true);
      
      let workspaceRestored = false;
      try {
          const savedWorkspace = loadWorkspaceFromStorage(currentPath);
          if (savedWorkspace) {
              await loadDirectoryStructureWithoutConversationLoad(currentPath);
              
              workspaceRestored = await deserializeWorkspace(savedWorkspace);
          }
      } catch (error) {
          console.error(`[INIT] Error loading workspace:`, error);
      } finally {
          setIsLoadingWorkspace(false);
      }

      const workspaceAlreadyLoaded = workspaceRestored && rootLayoutNode && Object.keys(contentDataRef.current).length > 0;
      
      if (!workspaceAlreadyLoaded) {
          await loadDirectoryStructure(currentPath);
      } else {
          await loadConversationsWithoutAutoSelect(currentPath);
      }

      const fetchedModels = await fetchModels();
      const fetchedNPCs = await loadAvailableNPCs();

      let modelToSet = config.model || 'llama3.2';
      let providerToSet = config.provider || 'ollama';
      let npcToSet = config.npc || 'sibiji';

      const storedConvoId = localStorage.getItem(LAST_ACTIVE_CONVO_ID_KEY);
      let targetConvoId: string | null = null;

      const currentConversations = directoryConversationsRef.current;
      
      if (storedConvoId) {
          const convoInCurrentDir = currentConversations.find((conv: any) => conv.id === storedConvoId);
          if (convoInCurrentDir) {
              targetConvoId = storedConvoId;
              const lastUsedInConvo = await window.api.getLastUsedInConversation(targetConvoId);
              if (lastUsedInConvo?.model) {
                  const validModel = fetchedModels.find((m: any) => m.value === lastUsedInConvo.model);
                  if (validModel) { 
                      modelToSet = validModel.value; 
                      providerToSet = validModel.provider; 
                  }
              }
              if (lastUsedInConvo?.npc) {
                  const validNpc = fetchedNPCs.find((n: any) => n.value === lastUsedInConvo.npc);
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
              const validModel = fetchedModels.find((m: any) => m.value === lastUsedInDir.model);
              if (validModel) { 
                  modelToSet = validModel.value; 
                  providerToSet = validModel.provider; 
              }
          }
          if (lastUsedInDir?.npc) {
              const validNpc = fetchedNPCs.find((n: any) => n.value === lastUsedInDir.npc);
              if (validNpc) { 
                  npcToSet = validNpc.value; 
              }
          }
      }
      
      if (!fetchedModels.some((m: any) => m.value === modelToSet) && fetchedModels.length > 0) {
          modelToSet = fetchedModels[0].value;
          providerToSet = fetchedModels[0].provider;
      } else if (fetchedModels.length === 0) {
          modelToSet = 'llama3.2';
          providerToSet = 'ollama';
      }

      if (!fetchedNPCs.some((n: any) => n.value === npcToSet) && fetchedNPCs.length > 0) {
          npcToSet = fetchedNPCs[0].value;
      } else if (fetchedNPCs.length === 0) {
          npcToSet = 'sibiji';
      }

      setCurrentModel(modelToSet);
      setCurrentProvider(providerToSet);
      setCurrentNPC(npcToSet);

      if (!workspaceAlreadyLoaded && targetConvoId && currentConversations.find((c: any) => c.id === targetConvoId)) {
          await handleConversationSelect(targetConvoId, false);
      } else if (workspaceAlreadyLoaded && targetConvoId) {
          setActiveConversation(targetConvoId);
          const existingPaneId = Object.keys(contentDataRef.current).find(paneId => {
              const paneData = contentDataRef.current[paneId];
              return paneData?.contentType === 'chat' && paneData?.contentId === targetConvoId;
          });
          if (existingPaneId) {
              setActiveContentPaneId(existingPaneId);
          }
      }
      
      setLoading(false);
  }, [currentPath, config, deserializeWorkspace, loadDirectoryStructureWithoutConversationLoad, loadConversationsWithoutAutoSelect, fetchModels, loadAvailableNPCs, loadWorkspaceFromStorage, serializeWorkspace, saveWorkspaceToStorage, setActiveConversation, setConfig, setBaseDir, setError, setLoading, setIsPredictiveTextEnabled, setPredictiveTextModel, setPredictiveTextProvider, initialLoadComplete, rootLayoutNode, contentDataRef, setContentDataVersion, directoryConversationsRef, handleConversationSelect, activeConversationId]);

  useEffect(() => {

      initApplicationData();

  }, [currentPath, config, activeConversationId]);


  const handleOpenFolderAsWorkspace = useCallback(async (folderPath: string) => {
      if (folderPath === currentPath) {
          setSidebarItemContextMenuPos(null);
          return;
      }
      await switchToPath(folderPath);
      setSidebarItemContextMenuPos(null);
  }, [currentPath, switchToPath]);


  const goUpDirectory = async () => {
      try {
          if (!currentPath || currentPath === baseDir) return;
          const newPath = await window.api.goUpDirectory(currentPath);
          await switchToPath(newPath);
      } catch (err: any) {
          console.error('Error going up directory:', err);
          setError(err.message);
      }
  };

  const handleDrop = async (e: React.DragEvent) => {
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

  const handleFileUpload = async (files: File[]) => {
      const existingFileNames = new Set(uploadedFiles.map(f => f.name));
      const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));
      
      const attachmentData: any[] = [];
      
      for (const file of newFiles) {
          try {
              if ((file as any).path) { // Electron File object might have a path
                 
                  attachmentData.push({
                      id: generateId(), 
                      name: file.name, 
                      type: file.type, 
                      path: (file as any).path,
                      size: file.size, 
                      preview: file.type.startsWith('image/') ? `file://${(file as any).path}` : null
                  });
              } else {
                 
                  const base64Data = await convertFileToBase64(file);
                  attachmentData.push({
                      id: generateId(),
                      name: file.name,
                      type: file.type,
                      data: base64Data.base64,
                      size: file.size,
                      preview: file.type.startsWith('image/') ? base64Data.dataUrl : null
                  });
              }
          } catch (error: any) {
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
          setUploadedFiles(prev => [...prev, ...attachmentData]);
      }
  };


  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      if (event && event.target) {
          event.target.value = '';
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
      // Only attach if config.stream is true
      if (!config?.stream) {
          console.log('[STREAM_LISTENERS] Not attaching stream listeners: config.stream is false or config is null.');
          return;
      }

      console.log('[STREAM_LISTENERS] Attaching PANE-AWARE stream listeners.');

      const handleStreamData = (_: any, { streamId: incomingStreamId, chunk }: { streamId: string, chunk: any }) => {
          console.log(`[STREAM_DATA] Received chunk for streamId: ${incomingStreamId}, chunk type: ${typeof chunk}`);
         
          const targetPaneId = streamToPaneRef.current[incomingStreamId];
          if (!targetPaneId) {
              console.warn(`[STREAM_DATA] No targetPaneId found for incomingStreamId: ${incomingStreamId}. Skipping chunk.`);
              return;
          }
          console.log(`[STREAM_DATA] Target pane ID: ${targetPaneId}`);

         
          const paneData = contentDataRef.current[targetPaneId];
          if (!paneData || !paneData.chatMessages) {
              console.warn(`[STREAM_DATA] No chatMessages data for targetPaneId: ${targetPaneId}. Skipping chunk.`);
              return;
          }
          console.log(`[STREAM_DATA] PaneData found for targetPaneId: ${targetPaneId}.`);

              try {
                 
              let content = '', reasoningContent = '', toolCalls: any[] | null = null, isDecision = false;
              if (typeof chunk === 'string') {
                  if (chunk.startsWith('data:')) {
                      const dataContent = chunk.replace(/^data:\s*/, '').trim();
                      if (dataContent === '[DONE]') {
                          return; // Handled by handleStreamComplete
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
                          reasoningContent = parsed.choices?.[0]?.delta?.reasoning_content || ''; // Ensure reasoning content is also parsed
                          toolCalls = parsed.tool_calls || null; // Capture tool calls from delta
                      }
                  } else {
                      content = chunk;
                  }
              } else if (chunk && chunk.choices) {
                  isDecision = chunk.choices[0]?.delta?.role === 'decision';
                  content = chunk.choices[0]?.delta?.content || '';
                  reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
                  toolCalls = chunk.tool_calls || null;
              } else if (chunk?.type) {
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

              if (!content && !reasoningContent && !toolCalls) {
                  console.log(`[STREAM_DATA] No content, reasoning, or tool calls in chunk for ${incomingStreamId}.`);
                  return;
              }
             
              const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === incomingStreamId);
              if (msgIndex !== -1) {
                  const currentMessage = paneData.chatMessages.allMessages[msgIndex];
                  
                  // 1. Create a new message object with updated properties
                  const updatedMessage = { ...currentMessage };
                  updatedMessage.role = isDecision ? 'decision' : 'assistant';
                  updatedMessage.content = (updatedMessage.content || '') + content;
                  updatedMessage.reasoningContent = (updatedMessage.reasoningContent || '') + reasoningContent;

                  if (toolCalls) {
                      const normalizedCalls = (Array.isArray(toolCalls) ? toolCalls : []).map((tc: any) => ({
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
                      const existing = updatedMessage.toolCalls || [];
                      const merged = [...existing];
                      normalizedCalls.forEach((tc: any) => {
                          const idx = merged.findIndex((mtc: any) => mtc.id === tc.id || mtc.function.name === tc.function.name);
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
                      updatedMessage.toolCalls = merged;
                  }

                  // 2. Create a new allMessages array with the updated message
                  const newAllMessages = [...paneData.chatMessages.allMessages];
                  newAllMessages[msgIndex] = updatedMessage;

                  // 3. Create a new chatMessages object
                  const newChatMessages = {
                      ...paneData.chatMessages,
                      allMessages: newAllMessages,
                      messages: newAllMessages.slice(-(paneData.chatMessages.displayedMessageCount || 20)),
                      // chatStats will be updated on stream complete
                  };

                  // 4. Create a new paneData object
                  const newPaneData = {
                      ...paneData,
                      chatMessages: newChatMessages,
                  };

                  // 5. Update contentDataRef.current with a new object reference
                  // This is crucial for components consuming contentDataRef to re-render.
                  contentDataRef.current = {
                      ...contentDataRef.current,
                      [targetPaneId]: newPaneData,
                  };

                  // 6. Increment contentDataVersion to force re-render in LayoutNode and renderChatView
                  setContentDataVersion(prev => prev + 1);
              } else {
                  console.warn(`[STREAM_DATA] Message with streamId ${incomingStreamId} not found in allMessages array for pane ${targetPaneId}.`);
              }
          } catch (err) {
              console.error('[REACT] Error processing stream chunk:', err, 'Raw chunk:', chunk);
          }
      };     
      const handleStreamComplete = async (_: any, { streamId: completedStreamId }: { streamId: string }) => {
          console.log(`[STREAM_COMPLETE] Stream ${completedStreamId} completed.`);
          const targetPaneId = streamToPaneRef.current[completedStreamId];
          if (targetPaneId) {
              const paneData = contentDataRef.current[targetPaneId];
              if (paneData?.chatMessages) {
                  const msgIndex = paneData.chatMessages.allMessages.findIndex(m => m.id === completedStreamId);
                  if (msgIndex !== -1) {
                      const msg = paneData.chatMessages.allMessages[msgIndex];
                      msg.isStreaming = false;
                      msg.streamId = null;
                      
                      const recentUserMsgs = paneData.chatMessages.allMessages.filter(m => m.role === 'user').slice(-3);
                      const wasAgentMode = recentUserMsgs.some(m => m.executionMode === 'agent');
                      
                      if (wasAgentMode) {
                          const contexts = gatherWorkspaceContext().filter(c => c.type === 'file');
                          const proposedChanges = parseAgenticResponse(msg.content, contexts);
                          
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
                          }
                      }
                  }
                  paneData.chatMessages.chatStats = getConversationStats(paneData.chatMessages.allMessages);
              }
              delete streamToPaneRef.current[completedStreamId];
          }

          if (Object.keys(streamToPaneRef.current).length === 0) {
              setIsStreaming(false);
          }

          setRootLayoutNode(prev => (prev ? { ...prev } : null));
          await refreshConversations();
      };


      const handleStreamError = (_: any, { streamId: errorStreamId, error }: { streamId: string, error: any }) => {
          console.error(`[STREAM_ERROR] Stream ${errorStreamId} encountered an error:`, error);
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
          setRootLayoutNode(prev => (prev ? { ...prev } : null));
      };

      const cleanupStreamData = window.api.onStreamData(handleStreamData);
      const cleanupStreamComplete = window.api.onStreamComplete(handleStreamComplete);
      const cleanupStreamError = window.api.onStreamError(handleStreamError);
      
      return () => {
          console.log('[STREAM_LISTENERS] Cleaning up stream listeners.');
          cleanupStreamData();
          cleanupStreamComplete();
          cleanupStreamError();
      };
  }, [config, activeContentPaneId, setPendingMemories, setMemoryApprovalModal, setAiEditModal, setIsStreaming, refreshConversations, gatherWorkspaceContext, parseAgenticResponse, setContentDataVersion]);
  useEffect(() => {
      if (activeContentPaneId) {
          const paneData = contentDataRef.current[activeContentPaneId];
          if (paneData && paneData.contentType === 'chat') {
              setLastActiveChatPaneId(activeContentPaneId);
          }
      }
  }, [activeContentPaneId]);
  const handleInterruptStream = async () => {
     
      const activePaneData = contentDataRef.current[activeContentPaneId!];
      if (!activePaneData || !activePaneData.chatMessages) {
          return;
      }

     
      const streamingMessage = activePaneData.chatMessages.allMessages.find(m => m.isStreaming);
      if (!streamingMessage || !streamingMessage.streamId) {
         
          if (isStreaming) {
              const anyStreamId = Object.keys(streamToPaneRef.current)[0];
              if (anyStreamId) {
                  await window.api.interruptStream(anyStreamId);
              }
              setIsStreaming(false);
          }
          return;
      }
      
      const streamIdToInterrupt = streamingMessage.streamId;

     
      streamingMessage.content = (streamingMessage.content || '') + `\n\n[Stream Interrupted by User]`;
      streamingMessage.isStreaming = false;
      streamingMessage.streamId = null;
      
     
      delete streamToPaneRef.current[streamIdToInterrupt];
      if (Object.keys(streamToPaneRef.current).length === 0) {
          setIsStreaming(false);
      }
      
     
      setRootLayoutNode(prev => (prev ? { ...prev } : null));
     

     
      try {
          await window.api.interruptStream(streamIdToInterrupt);
      } catch (error) {
          console.error(`[REACT] handleInterruptStream: API call to interrupt stream ${streamIdToInterrupt} failed:`, error);
         
          streamingMessage.content += " [Interruption API call failed]";
          setRootLayoutNode(prev => (prev ? { ...prev } : null));
      }
  };

  const handleDeleteSelectedMessages = async () => {
      const selectedIds = Array.from(selectedMessages);
      if (selectedIds.length === 0) return;
      
      const activePaneData = contentDataRef.current[activeContentPaneId!];
      if (!activePaneData || !activePaneData.chatMessages) {
          console.error("No active chat pane data found for message deletion.");
          return;
      }
      
      const conversationId = activePaneData.contentId;
      
      try {
          const messagesToDelete = activePaneData.chatMessages.allMessages.filter(
              msg => selectedIds.includes(msg.id || msg.timestamp)
          );
          
          const deleteResults = await Promise.all(
              messagesToDelete.map(async (msg: any) => {
                  const idToUse = msg.message_id || msg.id || msg.timestamp;
                  const result = await window.api.deleteMessage({ 
                      conversationId: conversationId!, 
                      messageId: idToUse 
                  });
                  return { ...result, frontendId: msg.id };
              })
          );
          
          const successfulDeletes = deleteResults.filter(r => r.success && r.rowsAffected > 0);
          if (successfulDeletes.length === 0) {
              setError("Failed to delete messages from database");
              return;
          }
          
          activePaneData.chatMessages.allMessages = activePaneData.chatMessages.allMessages.filter(
              msg => !selectedIds.includes(msg.id || msg.timestamp)
          );
          activePaneData.chatMessages.messages = activePaneData.chatMessages.allMessages.slice(
              -activePaneData.chatMessages.displayedMessageCount
          );
          activePaneData.chatMessages.chatStats = getConversationStats(activePaneData.chatMessages.allMessages);
          
          setRootLayoutNode(prev => (prev ? { ...prev } : null));
          setSelectedMessages(new Set());
          setMessageContextMenuPos(null);
          setMessageSelectionMode(false);
          
      } catch (err: any) {
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
                      return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
                  }
                  const messagesText = messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
                  return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
              });
              const convosContent = await Promise.all(convosContentPromises);
              
             
              const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');

             
              const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
              if (!newConversation) {
                  throw new Error('Failed to create a new conversation for the summary.');
              }

             
              setActiveConversation(newConversation.id);
              setCurrentConversation(newConversation);
              // setMessages([]); // This was from old state, now use paneData
              // setAllMessages([]); // This was from old state, now use paneData
              // setDisplayedMessageCount(10); // This was from old state, now use paneData

             
              const newStreamId = generateId();
              streamToPaneRef.current[newStreamId] = newPaneId!; // Store the paneId for streaming
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

              // Update paneData for the new conversation
              if (contentDataRef.current[newPaneId!]) {
                contentDataRef.current[newPaneId!]!.chatMessages = {
                  messages: [userMessage, assistantPlaceholderMessage],
                  allMessages: [userMessage, assistantPlaceholderMessage],
                  displayedMessageCount: 10
                };
                contentDataRef.current[newPaneId!]!.chatStats = getConversationStats([userMessage, assistantPlaceholderMessage]);
                setRootLayoutNode(prev => (prev ? { ...prev } : null));
              }

             
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

          } catch (err: any) {
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
                  return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
              }
              const messagesText = messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
              return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
          });
          const convosContent = await Promise.all(convosContentPromises);
          
          const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');

          if (!activeConversationId) {
              await createNewConversation();
          }

          setInput(fullPrompt);
          
      } catch (err: any) {
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
          onConfirm: async (customPrompt: string) => {
              try {
                  const convosContentPromises = selectedIds.map(async (id, index) => {
                      const messages = await window.api.getConversationMessages(id);
                      if (!Array.isArray(messages)) {
                          return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
                      }
                      const messagesText = messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n');
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

                  paneData.chatMessages!.allMessages.push(userMessage, assistantPlaceholderMessage);
                  paneData.chatMessages!.messages = paneData.chatMessages!.allMessages.slice(-paneData.chatMessages!.displayedMessageCount);
                  setRootLayoutNode(prev => (prev ? { ...prev } : null));

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

              } catch (err: any) {
                  console.error('Error processing custom summary:', err);
                  setError(err.message);
                  setIsStreaming(false);
              } finally {
                  setSelectedConvos(new Set());
              }
          }
      });
  };

  const renderGitPanel = () => {
      if (!gitStatus) return null;
  
      const staged = Array.isArray(gitStatus.staged) ? gitStatus.staged : [];
      const unstaged = Array.isArray(gitStatus.unstaged) ? gitStatus.unstaged : [];
      const untracked = Array.isArray(gitStatus.untracked) ? gitStatus.untracked : [];
  
      return (
          <div className="p-4 border-t theme-border text-xs theme-text-muted">
              <div 
                  className="flex items-center justify-between cursor-pointer py-1"
                  onClick={() => setGitPanelCollapsed(!gitPanelCollapsed)}
              >
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-branch"><circle cx="6" cy="18" r="3"/><path d="M18 6V3"/><path d="M18 18v-4"/><path d="M6 18v-2"/><path d="M6 6v4a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/></svg>
                      Git Status
                      {gitStatus.hasChanges && <span className="text-yellow-400 ml-2">(Changes!)</span>}
                  </div>
                  <ChevronRight 
                      size={14} 
                      className={`transform transition-transform ${gitPanelCollapsed ? "" : "rotate-90"}`}
                  />
              </div>
  
              {!gitPanelCollapsed && (
                  <div className="overflow-auto max-h-64 mt-2">
                      <div className="mb-2 font-semibold">
                          Git Branch: {gitStatus.branch} {gitStatus.ahead > 0 && <span>↑{gitStatus.ahead}</span>} {gitStatus.behind > 0 && <span>↓{gitStatus.behind}</span>}
                      </div>
      
                      <div>
                          <div className="mb-1 font-semibold">Staged Files</div>
                          {(staged.length === 0) ? <div className="text-gray-600">No staged files</div> :
                          staged.map((file: any) => (
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
                          [...unstaged, ...untracked].map((file: any) => (
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

  
const renderWebsiteList = () => {
    const header = (
        <div className="flex items-center justify-between px-4 py-2 mt-4">
            <div className="text-xs text-gray-500 font-medium">Websites</div>
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
                                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
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

                    {websiteHistory.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-600 px-2 py-1 font-medium">
                                Recent History ({websiteHistory.length})
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {websiteHistory.slice(0, 20).map((item: any, idx: number) => (
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
                                            <span className="text-xs truncate">{item.title || item.url}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(item.timestamp).toLocaleDateString()}
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
const renderFolderList = () => {
    // If files are collapsed, and there's no current file selected, don't render the full list.
    // But if there's a current file, we still want to show it.
    if (filesCollapsed && !currentFile) {
        return (
            <div className="px-4 py-2 border-b border-[#1c2f4f]">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setFilesCollapsed(!filesCollapsed)}
                >
                    <div className="text-xs text-gray-500 font-medium">Files</div>
                    <ChevronRight
                        size={12}
                        className={`transform transition-transform ${filesCollapsed ? '' : 'rotate-90'}`}
                    />
                </div>
                <div className="mt-2 space-y-1">
                    <button
                        onClick={createNewTextFile}
                        className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                    >
                        <FilePlus size={14} /> New File
                    </button>
                    <button
                        onClick={handleCreateNewFolder}
                        className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                    >
                        <FolderPlus size={14} /> New Folder
                    </button>
                    <button
                        onClick={refreshDirectoryStructureOnly}
                        className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                    >
                        <RefreshCw size={14} /> Refresh Files
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="px-4 py-2 border-b border-[#1c2f4f]">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setFilesCollapsed(!filesCollapsed)}
                >
                    <div className="text-xs text-gray-500 font-medium">Files</div>
                    <ChevronRight
                        size={12}
                        className={`transform transition-transform ${filesCollapsed ? '' : 'rotate-90'}`}
                    />
                </div>
                {!filesCollapsed && (
                    <div className="mt-2 space-y-1">
                        <button
                            onClick={createNewTextFile}
                            className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                        >
                            <FilePlus size={14} /> New File
                        </button>
                        <button
                            onClick={handleCreateNewFolder}
                            className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                        >
                            <FolderPlus size={14} /> New Folder
                        </button>
                        <button
                            onClick={refreshDirectoryStructureOnly}
                            className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                        >
                            <RefreshCw size={14} /> Refresh Files
                        </button>
                    </div>
                )}
            </div>

            {!filesCollapsed && (
                <div className="p-2">
                    {folderStructure.error ? (
                        <div className="text-red-400 text-xs p-2">{folderStructure.error}</div>
                    ) : (
                        <FolderTreeDisplay
                            structure={folderStructure}
                            currentPath={currentPath}
                            onFileClick={handleFileClick}
                            onFileContextMenu={handleFileContextMenu}
                            onFolderContextMenu={handleSidebarItemContextMenu}
                            selectedFiles={selectedFiles}
                            setSelectedFiles={setSelectedFiles}
                            draggedItem={draggedItem}
                            handleGlobalDragStart={handleGlobalDragStart}
                            handleGlobalDragEnd={handleGlobalDragEnd}
                            renamingPath={renamingPath}
                            setRenamingPath={setRenamingPath}
                            editedFileName={editedSidebarItemName}
                            setEditedFileName={setEditedFileName}
                            expandedFolders={expandedFolders}
                            setExpandedFolders={setExpandedFolders}
                        />
                    )}
                </div>
            )}
        </>
    );
};
const renderFileEditor = useCallback(({ nodeId }: { nodeId: string }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    const filePath = paneData.contentId;
    const fileName = filePath.split('/').pop() || '';

    const handleRenameFile = async (oldPath: string, newName: string) => {
        if (!newName.trim()) return;
        const newPath = normalizePath(`${oldPath.substring(0, oldPath.lastIndexOf('/'))}/${newName}`);
        if (newPath === oldPath) return;

        try {
            await window.api.renameFile(oldPath, newPath);
            paneData.contentId = newPath;
            setRootLayoutNode(prev => (prev ? { ...prev } : null));
            await loadDirectoryStructure(currentPath);
            setRenamingPaneId(null);
        } catch (err: any) {
            setError(`Failed to rename file: ${err.message}`);
        }
    };

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            <CodeEditor
                key={nodeId}
                filePath={filePath}
                initialContent={paneData.fileContent || ''}
                onContentChange={(newContent) => {
                    paneData.fileContent = newContent;
                    paneData.fileChanged = true;
                    setRootLayoutNode(prev => (prev ? { ...prev } : null));
                }}
                onSave={() => {
                    handleFileSave();
                    paneData.fileChanged = false;
                    setRootLayoutNode(prev => (prev ? { ...prev } : null));
                }}
                onTextSelection={handleTextSelection}
                onContextMenu={handleEditorContextMenu}
                isSaving={isSaving}
                fileChanged={paneData.fileChanged}
                onStartRename={() => {
                    setRenamingPaneId(nodeId);
                    setEditedFileName(fileName);
                }}
            />
            {renamingPaneId === nodeId && (
                <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-xl flex flex-col gap-2">
                        <input
                            type="text"
                            value={editedFileName}
                            onChange={(e) => setEditedFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRenameFile(filePath, editedFileName);
                                } else if (e.key === 'Escape') {
                                    setRenamingPaneId(null);
                                }
                            }}
                            className="theme-input text-sm px-3 py-2 rounded"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setRenamingPaneId(null)} className="theme-button px-3 py-1 rounded text-sm">Cancel</button>
                            <button onClick={() => handleRenameFile(filePath, editedFileName)} className="theme-button-primary px-3 py-1 rounded text-sm">Rename</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, [contentDataRef, handleFileSave, handleTextSelection, handleEditorContextMenu, isSaving, currentPath, renamingPaneId, editedFileName, loadDirectoryStructure]);

    const handleConfirmResend = async () => {
        if (!resendModal.message) return;

        const originalMessage = resendModal.message;
        const newModel = resendModal.selectedModel;
        const newNPC = resendModal.selectedNPC;

        setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' });
        setIsStreaming(true);

        const conversationId = paneData.contentId;
        const newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = nodeId;

        const userMessage = {
            id: generateId(),
            role: 'user',
            content: originalMessage.content,
            timestamp: new Date().toISOString(),
            attachments: originalMessage.attachments || [],
            executionMode: originalMessage.executionMode,
            isJinxCall: originalMessage.isJinxCall,
            jinxName: originalMessage.jinxName,
            jinxInputs: originalMessage.jinxInputs
        };

        const assistantPlaceholder = {
            id: newStreamId, role: 'assistant', content: '', timestamp: new Date().toISOString(),
            isStreaming: true, streamId: newStreamId, npc: newNPC, model: newModel
        };

        paneData.chatMessages!.allMessages.push(userMessage, assistantPlaceholder);
        paneData.chatMessages!.messages = paneData.chatMessages!.allMessages.slice(-(paneData.chatMessages!.displayedMessageCount || 20));
        paneData.chatStats = getConversationStats(paneData.chatMessages!.allMessages);
        setRootLayoutNode(prev => (prev ? { ...prev } : null));

        try {
            const selectedNpc = availableNPCs.find(npc => npc.value === newNPC);

            if (originalMessage.isJinxCall) {
                await window.api.executeJinx({
                    jinxName: originalMessage.jinxName!,
                    jinxArgs: originalMessage.jinxInputs || [],
                    currentPath,
                    conversationId: conversationId!,
                    model: newModel,
                    provider: availableModels.find(m => m.value === newModel)?.provider || 'ollama',
                    npc: selectedNpc ? selectedNpc.name : newNPC,
                    npcSource: selectedNpc ? selectedNpc.source : 'global',
                    streamId: newStreamId,
                });
            } else {
                await window.api.executeCommandStream({
                    commandstr: originalMessage.content,
                    currentPath,
                    conversationId: conversationId!,
                    model: newModel,
                    provider: availableModels.find(m => m.value === newModel)?.provider || 'ollama',
                    npc: selectedNpc ? selectedNpc.name : newNPC,
                    npcSource: selectedNpc ? selectedNpc.source : 'global',
                    attachments: originalMessage.attachments || [],
                    streamId: newStreamId,
                    executionMode: originalMessage.executionMode,
                    mcpServerPath: originalMessage.executionMode === 'tool_agent' ? mcpServerPath : undefined,
                    selectedMcpTools: originalMessage.executionMode === 'tool_agent' ? selectedMcpTools : undefined,
                });
            }
        } catch (err: any) {
            setError(err.message);
            setIsStreaming(false);
            delete streamToPaneRef.current[newStreamId];
        }
    };

const renderInputArea = () => {
    const isJinxMode = executionMode !== 'chat' && selectedJinx;
    const jinxInputsForSelected = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};
    const hasJinxContent = isJinxMode && Object.values(jinxInputsForSelected).some(val => val !== null && String(val).trim());
    const hasInputContent = input.trim() || uploadedFiles.length > 0 || hasJinxContent;
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transform rotate-180 group-hover:scale-75 transition-all duration-200">
                                <path d="M18 15l-6-6-6 6"/>
                            </svg>
                            <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                        </div>
                    </button>
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
                style={{ backgroundColor: isResizingInput ? '#3b82f6' : 'transparent' }}
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
                    {uploadedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 border-b theme-border">
                            {uploadedFiles.map(file => (
                                <div key={file.id} className="relative group/thumb">
                                    {file.preview && (
                                        <img src={file.preview} alt={file.name} className="w-16 h-16 object-cover rounded border theme-border" />
                                    )}
                                    <button
                                        onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                                        className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end p-2 gap-2 relative z-0">
                        <div className="flex-grow relative">
                            {isJinxMode ? (
                                <div className="flex flex-col gap-2 w-full">
                                    {selectedJinx.inputs && selectedJinx.inputs.length > 0 && (
                                        <div className="space-y-2">
                                            {selectedJinx.inputs.map((rawInputDef: any, idx: number) => {
                                                const inputDef = (typeof rawInputDef === 'string') ? { [rawInputDef]: "" } : rawInputDef;
                                                const inputName = (inputDef && typeof inputDef === 'object' && Object.keys(inputDef).length > 0) ? Object.keys(inputDef)[0] : `__unnamed_input_${idx}__`;
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
                                                                    [selectedJinx.name]: { ...prev[selectedJinx.name], [inputName]: e.target.value }
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
                                                                    [selectedJinx.name]: { ...prev[selectedJinx.name], [inputName]: e.target.value }
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
                                    onKeyDown={(e) => { 
                                        if (!isStreaming && e.key === 'Enter' && !e.shiftKey) { 
                                            e.preventDefault(); 
                                            handleInputSubmit(e); 
                                        } 
                                    }}
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
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 15l-6-6-6 6"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover flex-shrink-0 self-end ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Attach file"
                            disabled={isStreaming}
                        >
                            <Paperclip size={20} />
                        </button>
                        {isStreaming ? (
                            <button 
                                type="button" 
                                onClick={handleInterruptStream} 
                                className="theme-button-danger text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 w-[76px] h-[40px] self-end"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                                </svg>
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                onClick={handleInputSubmit} 
                                disabled={!canSend} 
                                className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-[76px] h-[40px] self-end"
                            >
                                <Send size={16}/>
                            </button>
                        )}
                    </div>
                </div>

                {/* BOTTOM CONTROLS - execution mode and model selectors */}
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
                                    const grouped = originJinxs.reduce((acc: Record<string, any[]>, j: any) => {
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
                                                            {jinxs.sort((a: any,b: any)=>a.name.localeCompare(b.name)).map((jinx: any) => (
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
                        {!modelsLoading && !modelsError && modelsToDisplay.map(model => (
                            <option key={model.value} value={model.value}>{model.display_name}</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => toggleFavoriteModel(currentModel)} 
                        className={`p-1 rounded ${favoriteModels.has(currentModel) ? 'text-yellow-400' : 'theme-text-muted hover:text-yellow-400'}`}
                        disabled={!currentModel}
                    >
                        <Star size={14}/>
                    </button>

                    <select
                        value={currentNPC || ''}
                        onChange={e => setCurrentNPC(e.target.value)}
                        className="theme-input text-xs rounded px-2 py-1 border flex-grow disabled:cursor-not-allowed"
                        disabled={npcsLoading || !!npcsError || isStreaming}
                    >
                        {!npcsLoading && !npcsError && availableNPCs.map(npc => (
                            <option key={`${npc.source}-${npc.value}`} value={npc.value}>{npc.display_name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

const renderChatView = useCallback(({ nodeId }: { nodeId: string }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData || paneData.contentType !== 'chat' || !paneData.contentId) {
        return <div className="p-4 theme-text-muted">No chat data for this pane.</div>;
    }

    const { chatMessages } = paneData;
    const messages = chatMessages?.messages || [];
    const allMessages = chatMessages?.allMessages || [];
    const displayedCount = chatMessages?.displayedMessageCount || 20;

    const chatContainerRefLocal = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScrollEnabled && chatContainerRefLocal.current) {
            chatContainerRefLocal.current.scrollTop = chatContainerRefLocal.current.scrollHeight;
        }
    }, [messages, autoScrollEnabled]);

    const handleScroll = () => {
        if (chatContainerRefLocal.current && chatContainerRefLocal.current.scrollTop === 0 && !loadingMoreMessages) {
            if (allMessages.length > messages.length) {
                setLoadingMoreMessages(true);
                setTimeout(() => {
                    const newDisplayedCount = Math.min(allMessages.length, displayedCount + 20);
                    paneData.chatMessages!.displayedMessageCount = newDisplayedCount;
                    paneData.chatMessages!.messages = allMessages.slice(-newDisplayedCount);
                    setRootLayoutNode(prev => (prev ? { ...prev } : null));
                    setLoadingMoreMessages(false);
                }, 300);
            }
        }
    };

    const handleResendMessage = useCallback(async (message: any) => {
        setResendModal({
            isOpen: true,
            message: message,
            selectedModel: currentModel,
            selectedNPC: currentNPC
        });
    }, [currentModel, currentNPC]);

    const handleCreateBranch = useCallback((messageIndex: number) => {
        createBranchPoint(messageIndex);
    }, [createBranchPoint]);

    const filteredMessages = messages.filter(msg =>
        msg.content?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
        msg.reasoningContent?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
        msg.toolCalls?.some((tc: any) =>
            tc.function?.name?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
            tc.function?.arguments?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
            tc.result_preview?.toLowerCase().includes(localSearch.term.toLowerCase())
        )
    );

    const searchResultIndices = useMemo(() => {
        if (!localSearch.isActive || !localSearch.term) return [];
        return messages.map((msg, idx) => ({ msg, idx }))
            .filter(({ msg }) =>
                msg.content?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
                msg.reasoningContent?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
                msg.toolCalls?.some((tc: any) =>
                    tc.function?.name?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
                    tc.function?.arguments?.toLowerCase().includes(localSearch.term.toLowerCase()) ||
                    tc.result_preview?.toLowerCase().includes(localSearch.term.toLowerCase())
                )
            )
            .map(({ idx }) => idx);
    }, [messages, localSearch.isActive, localSearch.term]);

    const currentSearchResultMessageId = useMemo(() => {
        if (localSearch.isActive && localSearch.currentIndex !== -1 && searchResultIndices.length > 0) {
            const messageIndex = searchResultIndices[localSearch.currentIndex];
            return messages[messageIndex]?.id || messages[messageIndex]?.timestamp;
        }
        return null;
    }, [localSearch.isActive, localSearch.currentIndex, searchResultIndices, messages]);

    const scrollToMessage = useCallback((messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element && chatContainerRefLocal.current) {
            chatContainerRefLocal.current.scrollTo({
                top: element.offsetTop - chatContainerRefLocal.current.offsetTop - 20,
                behavior: 'smooth'
            });
        }
    }, []);

    useEffect(() => {
        if (currentSearchResultMessageId) {
            scrollToMessage(currentSearchResultMessageId);
        }
    }, [currentSearchResultMessageId, scrollToMessage]);

    const handleLocalSearchTermChange = (term: string) => {
        setLocalSearch(prev => ({ ...prev, term, currentIndex: -1 }));
    };

    const handleLocalSearchNext = () => {
        setLocalSearch(prev => {
            if (searchResultIndices.length === 0) return prev;
            const nextIndex = (prev.currentIndex + 1) % searchResultIndices.length;
            return { ...prev, currentIndex: nextIndex };
        });
    };

    const handleLocalSearchPrevious = () => {
        setLocalSearch(prev => {
            if (searchResultIndices.length === 0) return prev;
            const prevIndex = (prev.currentIndex - 1 + searchResultIndices.length) % searchResultIndices.length;
            return { ...prev, currentIndex: prevIndex };
        });
    };

    const handleLocalSearchClose = () => {
        setLocalSearch({ isActive: false, term: '', paneId: null, results: [], currentIndex: -1 });
    };

    return (
        <div className="flex-1 flex flex-col relative theme-bg-primary overflow-hidden">
            {localSearch.isActive && localSearch.paneId === nodeId && (
                <div className="p-2 border-b theme-border theme-bg-tertiary flex-shrink-0">
                    <InPaneSearchBar
                        searchTerm={localSearch.term}
                        onSearchTermChange={handleLocalSearchTermChange}
                        onNext={handleLocalSearchNext}
                        onPrevious={handleLocalSearchPrevious}
                        onClose={handleLocalSearchClose}
                        resultCount={searchResultIndices.length}
                        currentIndex={localSearch.currentIndex}
                    />
                </div>
            )}
            <div
                ref={chatContainerRefLocal}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                onScroll={handleScroll}
            >
                {loadingMoreMessages && (
                    <div className="text-center theme-text-muted text-sm my-2">Loading more messages...</div>
                )}
                {messages.map((message: any, index: number) => (
                    <ChatMessage
                        key={message.id || message.timestamp}
                        message={message}
                        isSelected={selectedMessages.has(message.id || message.timestamp)}
                        messageSelectionMode={messageSelectionMode}
                        toggleMessageSelection={toggleMessageSelection}
                        handleMessageContextMenu={handleMessageContextMenu}
                        searchTerm={localSearch.term}
                        isCurrentSearchResult={currentSearchResultMessageId === (message.id || message.timestamp)}
                        onResendMessage={handleResendMessage}
                        onCreateBranch={handleCreateBranch}
                        messageIndex={index}
                    />
                ))}
            </div>

            {resendModal.isOpen && (
                <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
                    <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Resend Message</h3>
                        <div className="mb-4">
                            <label className="block text-xs theme-text-muted mb-1">Original Content:</label>
                            <textarea
                                value={resendModal.message?.content}
                                readOnly
                                className="w-full theme-input text-xs p-2 rounded bg-gray-700"
                                rows={4}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="resendModel" className="block text-xs theme-text-muted mb-1">Model:</label>
                            <select
                                id="resendModel"
                                value={resendModal.selectedModel}
                                onChange={(e) => setResendModal(prev => ({ ...prev, selectedModel: e.target.value }))}
                                className="w-full theme-select text-xs p-2 rounded"
                            >
                                {availableModels.map(model => (
                                    <option key={model.value} value={model.value}>
                                        {model.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label htmlFor="resendNPC" className="block text-xs theme-text-muted mb-1">NPC:</label>
                            <select
                                id="resendNPC"
                                value={resendModal.selectedNPC}
                                onChange={(e) => setResendModal(prev => ({ ...prev, selectedNPC: e.target.value }))}
                                className="w-full theme-select text-xs p-2 rounded"
                            >
                                {availableNPCs.map(npc => (
                                    <option key={npc.value} value={npc.value}>
                                        {npc.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setResendModal({ isOpen: false, message: null, selectedModel: '', selectedNPC: '' })}
                                className="theme-button px-4 py-2 rounded text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmResend}
                                className="theme-button-primary px-4 py-2 rounded text-sm"
                            >
                                Resend
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, [contentDataRef, autoScrollEnabled, loadingMoreMessages,
    selectedMessages, messageSelectionMode, toggleMessageSelection,
    handleMessageContextMenu, localSearch, currentModel, currentNPC, availableModels, availableNPCs,
    resendModal, handleConfirmResend, createBranchPoint, currentPath, mcpServerPath, selectedMcpTools, // ADDED handleConfirmResend HERE
    setError, setIsStreaming, setRootLayoutNode, streamToPaneRef,contentDataVersion
]);
const layoutComponentApi: LayoutComponentApi = useMemo(() => ({
    rootLayoutNode,
    setRootLayoutNode,
    findNodeByPath,
    findNodePath,
    activeContentPaneId, setActiveContentPaneId,
    draggedItem, setDraggedItem, dropTarget, setDropTarget,
    contentDataRef, // This is the ref itself, its `current` property changes
    updateContentPane, performSplit,
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
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
    contentDataVersion, // ADD THIS LINE
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
    autoScrollEnabled, setAutoScrollEnabled,
    messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
    conversationBranches, showBranchingUI, setShowBranchingUI,
    contentDataVersion // ADD THIS LINE
]);

if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen theme-bg-primary theme-text-primary">
            <div className="text-lg">Loading NPC Studio...</div>
        </div>
    );
}

return (
    <div
        className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsHovering(true); }}
        onDragLeave={() => setIsHovering(false)}
        onDrop={handleDrop}
        onDragEnd={handleGlobalDragEnd}
    >
        {error && (
            <div className="fixed top-4 right-4 bg-red-600 text-white p-3 rounded-md shadow-lg z-50 flex items-center gap-2">
                <X size={16} />
                <span>Error: {error}</span>
                <button onClick={() => setError(null)} className="ml-2 p-1 rounded-full hover:bg-red-700">
                    <X size={14} />
                </button>
            </div>
        )}

        {isHovering && (
            <div className="absolute inset-0 bg-blue-500/20 z-50 flex items-center justify-center pointer-events-none">
                <div className="text-white text-2xl font-bold">Drop files here to attach</div>
            </div>
        )}
<div
    className="flex-shrink-0 bg-[#0f1f3b] border-r border-[#1c2f4f] flex flex-col transition-all duration-300"
    style={{ width: sidebarCollapsed ? '48px' : `${sidebarWidth}px` }}
>
    <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-20"
        onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingSidebar(true);
        }}
    />
    <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-[#1c2f4f] bg-[#0f1f3b]">
        {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
                <img src="./logo.png" alt="NPC Studio Logo" className="h-6 w-6" />
                <span className="font-bold text-lg text-white">NPC Studio</span>
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 bg-[#132448] hover:bg-[#1a2f57] rounded-full transition-all"
                    title="Open Settings"
                >
                    <Settings size={14} />
                </button>
                            <button
                onClick={toggleTheme}
                className="p-2 bg-[#132448] hover:bg-[#1a2f57] rounded-full transition-all"
                title="Toggle theme"
            >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

                                <div className="relative group">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // CRITICAL: Stop propagation
                            createNewConversation();
                        }}
                        className="p-2 bg-[#2b4a7a] hover:bg-[#365a94] rounded-full flex items-center gap-1 transition-all"
                        title="New Conversation" // Added title for accessibility
                    >
                        <Plus size={14} />
                        <ChevronDown size={10} className="opacity-60" />
                    </button>
                    
                    <div className="absolute left-0 top-full mt-1 bg-[#0f1f3b] border border-[#1c2f4f] rounded shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-all duration-150 min-w-[180px]">
                        <button onClick={() => createNewConversation()} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[#15294d] text-xs">
                            <MessageCircle size={12} />
                            <span>New Conversation</span>
                        </button>
                        <button onClick={handleCreateNewFolder} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[#15294d] text-xs">
                            <Folder size={12} />
                            <span>New Folder</span>
                        </button>
                        <button onClick={() => setBrowserUrlDialogOpen(true)} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[#15294d] text-xs">
                            <Globe size={12} />
                            <span>New Browser</span>
                        </button>
                        <button onClick={createNewTextFile} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[#15294d] text-xs">
                            <FileText size={12} />
                            <span>New Text File</span>
                        </button>
                        <button onClick={createNewTerminal} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[#15294d] text-xs">
                            <Terminal size={12} />
                            <span>New Terminal</span>
                        </button>
                    </div>


                </div>
            </div>
        )}
        
        <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 hover:bg-[#1a2f57] rounded-full"
        >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
    </div>

    {!sidebarCollapsed && (
        <>
            <div className="px-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-[#132448] rounded-md p-2">
                    <Folder size={16} className="text-gray-400" />
                    {isEditingPath ? (
                        <input
                            type="text"
                            value={editedPath}
                            onChange={(e) => setEditedPath(e.target.value)}
                            onBlur={() => {
                                setIsEditingPath(false);
                                handlePathChange(editedPath);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsEditingPath(false);
                                    handlePathChange(editedPath);
                                } else if (e.key === 'Escape') {
                                    setIsEditingPath(false);
                                    setEditedPath(currentPath);
                                }
                            }}
                            className="flex-1 bg-[#0f1f3b] border-[#1f3458] text-xs border-0 bg-transparent focus:ring-0 text-gray-300"
                            autoFocus
                        />
                    ) : (
                        <span
                            className="flex-1 text-xs truncate cursor-pointer hover:underline text-gray-300"
                            onClick={() => {
                                setIsEditingPath(true);
                                setEditedPath(currentPath);
                            }}
                            title={currentPath}
                        >
                            {currentPath.split('/').pop() || currentPath}
                        </span>
                    )}
                    <button onClick={goUpDirectory} className="p-1 hover:bg-[#1a2f57] rounded-full" title="Go up directory">
                        <ArrowUp size={14} />
                    </button>
                </div>
            </div>

            {renderWorkspaceIndicator()}
            <ActiveWindowsIndicator
                windowId={windowId}
                currentPath={currentPath}
                activeWindowsExpanded={activeWindowsExpanded}
                setActiveWindowsExpanded={setActiveWindowsExpanded}
            />
            {renderGitPanel()}

            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-2 border-b border-[#1c2f4f]">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setFilesCollapsed(!filesCollapsed)}
                    >
                        <div className="text-xs text-gray-500 font-medium">Files</div>
                        <ChevronRight
                            size={12}
                            className={`transform transition-transform ${filesCollapsed ? '' : 'rotate-90'}`}
                        />
                    </div>
                    {!filesCollapsed && (
                        <div className="mt-2 space-y-1">
                            <button
                                onClick={createNewTextFile}
                                className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                            >
                                <FilePlus size={14} /> New File
                            </button>
                            <button
                                onClick={handleCreateNewFolder}
                                className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                            >
                                <FolderPlus size={14} /> New Folder
                            </button>
                            <button
                                onClick={refreshDirectoryStructureOnly}
                                className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                            >
                                <RefreshCw size={14} /> Refresh Files
                            </button>
                        </div>
                    )}
                </div>

                {!filesCollapsed && (
                    <div className="p-2">
                        {folderStructure.error ? (
                            <div className="text-red-400 text-xs p-2">{folderStructure.error}</div>
                        ) : (
                            <FolderTreeDisplay
                                structure={folderStructure}
                                currentPath={currentPath}
                                onFileClick={handleFileClick}
                                onFileContextMenu={handleFileContextMenu}
                                onFolderContextMenu={handleSidebarItemContextMenu}
                                selectedFiles={selectedFiles}
                                setSelectedFiles={setSelectedFiles}
                                draggedItem={draggedItem}
                                handleGlobalDragStart={handleGlobalDragStart}
                                handleGlobalDragEnd={handleGlobalDragEnd}
                                renamingPath={renamingPath}
                                setRenamingPath={setRenamingPath}
                                editedFileName={editedSidebarItemName}
                                setEditedFileName={setEditedFileName}
                                expandedFolders={expandedFolders}
                                setExpandedFolders={setExpandedFolders}
                            />
                        )}
                    </div>
                )}

                <div className="px-4 py-2 border-t border-[#1c2f4f]">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setConversationsCollapsed(!conversationsCollapsed)}
                    >
                        <div className="text-xs text-gray-500 font-medium">Conversations</div>
                        <ChevronRight
                            size={12}
                            className={`transform transition-transform ${conversationsCollapsed ? '' : 'rotate-90'}`}
                        />
                    </div>
                    {!conversationsCollapsed && (
                        <div className="mt-2 space-y-1">
                            <button
                                onClick={() => createNewConversation()}
                                className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                            >
                                <MessageCircle size={14} /> New Conversation
                            </button>
                            <button
                                onClick={refreshConversations}
                                className="flex items-center gap-2 px-2 py-1 w-full text-left hover:bg-[#1a2f57] rounded text-xs"
                            >
                                <RefreshCw size={14} /> Refresh Conversations
                            </button>
                        </div>
                    )}
                </div>

                {!conversationsCollapsed && (
                    <div className="p-2">
                        {directoryConversations.length === 0 ? (
                            <div className="text-xs text-gray-400 p-2">No conversations yet.</div>
                        ) : (
                            <div className="space-y-1">
                                {directoryConversations.map((conv: any, index: number) => (
                                    <button
                                        key={conv.id}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'copyMove';
                                            handleGlobalDragStart(e, { type: 'conversation', id: conv.id });
                                        }}
                                        onDragEnd={handleGlobalDragEnd}
                                        onClick={(e) => {
                                            if (e.shiftKey) {
                                                const start = lastClickedIndex !== null ? lastClickedIndex : index;
                                                const end = index;
                                                const newSelection = new Set(selectedConvos);
                                                const [min, max] = [Math.min(start, end), Math.max(start, end)];
                                                for (let i = min; i <= max; i++) {
                                                    newSelection.add(directoryConversations[i].id);
                                                }
                                                setSelectedConvos(newSelection);
                                            } else if (e.ctrlKey || e.metaKey) {
                                                setSelectedConvos(prev => {
                                                    const newSelection = new Set(prev);
                                                    if (newSelection.has(conv.id)) {
                                                        newSelection.delete(conv.id);
                                                    } else {
                                                        newSelection.add(conv.id);
                                                    }
                                                    return newSelection;
                                                });
                                            } else {
                                                setSelectedConvos(new Set([conv.id]));
                                                handleConversationSelect(conv.id);
                                            }
                                            setLastClickedIndex(index);
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setSelectedConvos(prev => {
                                                const newSelection = new Set(prev);
                                                if (!newSelection.has(conv.id)) {
                                                    newSelection.clear();
                                                    newSelection.add(conv.id);
                                                }
                                                return newSelection;
                                            });
                                            setContextMenuPos({ x: e.clientX, y: e.clientY, conversationId: conv.id });
                                        }}
                                        className={`flex flex-col p-2 w-full text-left rounded transition-all ${
                                            activeConversationId === conv.id
                                                ? 'conversation-selected border-l-2 border-blue-500'
                                                : selectedConvos.has(conv.id)
                                                    ? 'bg-blue-900/40 border-l-2 border-blue-700'
                                                    : 'hover:bg-gray-800'
                                        }`}
                                    >
                                        <span className="text-xs font-medium truncate">{conv.title}</span>
                                        <span className="text-xs text-gray-400">{new Date(conv.last_message_timestamp).toLocaleTimeString()}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {renderFolderList(folderStructure)}

                {renderWebsiteList()}
            </div>

            {/* 6-BUTTON GRID AT BOTTOM */}
<div className="p-4 border-t theme-border flex-shrink-0">
    {!sidebarCollapsed && (
        <div className="grid grid-cols-3 grid-rows-2 divide-x divide-y divide-theme-border border theme-border rounded-lg overflow-hidden">
            <button onClick={() => setCronDaemonPanelOpen(true)} className="action-grid-button" aria-label="Open Cron/Daemon Panel"><Clock size={16} /></button>
            <button onClick={() => setPhotoViewerOpen(true)} className="action-grid-button" aria-label="Open Photo Viewer"><Image size={16} /></button>
            <button onClick={() => setDashboardMenuOpen(true)} className="action-grid-button" aria-label="Open Dashboard"><BarChart3 size={16} /></button>
            <button onClick={() => setJinxMenuOpen(true)} className="action-grid-button" aria-label="Open Jinx Menu"><Wrench size={16} /></button>
            <button onClick={() => setCtxEditorOpen(true)} className="action-grid-button" aria-label="Open Context Editor"><FileJson size={16} /></button>
            <button onClick={() => setNpcTeamMenuOpen(true)} className="action-grid-button" aria-label="Open NPC Team Menu"><Users size={16} /></button>
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
        </>
    )}
</div>

        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                {rootLayoutNode ? (
                    <LayoutNode node={rootLayoutNode} path={[]} component={layoutComponentApi} />
                ) : (
                    <div className="flex-1 flex items-center justify-center theme-bg-primary theme-text-muted">
                        <div className="text-center">
                            <div className="text-lg mb-2">No Open Panes</div>
                            <div className="text-sm">Use the sidebar to open files, conversations, or create new panes.</div>
                            <button
                                onClick={createAndAddPaneNodeToLayout}
                                className="mt-4 theme-button-primary px-4 py-2 rounded-md text-sm"
                            >
                                <Plus size={16} className="inline-block mr-2" /> Create First Pane
                            </button>
                        </div>
                    </div>
                )}
            </div>


                    {renderInputArea()}
        </div>

        {contextMenuPos && (
            <>
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                    style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                    onMouseLeave={() => setContextMenuPos(null)}
                >
                    <button
                        onClick={handleSummarizeAndStart}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <MessageCircle size={14} /> Summarize & New Chat ({selectedConvos.size})
                    </button>
                    <button
                        onClick={handleSummarizeAndDraft}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <MessageSquare size={14} /> Summarize & Draft ({selectedConvos.size})
                    </button>
                    <button
                        onClick={handleSummarizeAndPrompt}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <Wand2 size={14} /> Custom Prompt ({selectedConvos.size})
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={handleAnalyzeInDashboard}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <BarChart3 size={14} /> Analyze in Dashboard ({selectedConvos.size})
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={deleteSelectedConversations}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                    >
                        <Trash size={14} /> Delete Conversations ({selectedConvos.size})
                    </button>
                </div>
            </>
        )}

        {fileContextMenuPos && (
            <>
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <MessageCircle size={14} /> Summarize to New Chat ({selectedFiles.size})
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <MessageSquare size={14} /> Summarize to Input ({selectedFiles.size})
                    </button>
                    <button
                        onClick={() => {
                            setPromptModal({
                                isOpen: true,
                                title: 'Custom File Prompt',
                                message: 'Enter a custom prompt for these files:',
                                defaultValue: 'Analyze these files for vulnerabilities',
                                onConfirm: (customPrompt: string) => handleApplyPromptToFiles('custom', customPrompt),
                            });
                            setFileContextMenuPos(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <Wand2 size={14} /> Custom Prompt to New Chat ({selectedFiles.size})
                    </button>
                    <button
                        onClick={() => {
                            setPromptModal({
                                isOpen: true,
                                title: 'Custom File Prompt',
                                message: 'Enter a custom prompt for these files:',
                                defaultValue: 'Analyze these files for vulnerabilities',
                                onConfirm: (customPrompt: string) => handleApplyPromptToFilesInInput('custom', customPrompt),
                            });
                            setFileContextMenuPos(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <Wand2 size={14} /> Custom Prompt to Input ({selectedFiles.size})
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={deleteSelectedConversations}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                    >
                        <Trash size={14} /> Delete Files ({selectedFiles.size})
                    </button>
                </div>
            </>
        )}

        {sidebarItemContextMenuPos && (
            <>
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSidebarItemContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                    style={{ top: sidebarItemContextMenuPos.y, left: sidebarItemContextMenuPos.x }}
                    onMouseLeave={() => setSidebarItemContextMenuPos(null)}
                >
                    {sidebarItemContextMenuPos.type === 'directory' && (
                        <>
                            <button
                                onClick={() => handleOpenFolderAsWorkspace(sidebarItemContextMenuPos.path)}
                                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                            >
                                <FolderTree size={14} /> Open as Workspace
                            </button>
                            <button
                                onClick={handleFolderOverview}
                                className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                            >
                                <BrainCircuit size={14} /> AI Overview
                            </button>
                            <div className="border-t theme-border my-1"></div>
                        </>
                    )}
                    <button
                        onClick={handleSidebarRenameStart}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left"
                    >
                        <Edit size={14} /> Rename
                    </button>
                    <button
                        onClick={handleSidebarItemDelete}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                    >
                        <Trash size={14} /> Delete
                    </button>
                </div>
            </>
        )}

        {renderMessageContextMenu()}
        {renderPdfContextMenu()}
        {renderBrowserContextMenu()}
        {renderPaneContextMenu()}

        {settingsOpen && (
            <SettingsMenu
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                currentPath={currentPath}
                onPathChange={(newPath) => { setCurrentPath(newPath); }}
                isPredictiveTextEnabled={isPredictiveTextEnabled}
                setIsPredictiveTextEnabled={setIsPredictiveTextEnabled}
                predictiveTextModel={predictiveTextModel}
                setPredictiveTextModel={setPredictiveTextModel}
                predictiveTextProvider={predictiveTextProvider}
                setPredictiveTextProvider={setPredictiveTextProvider}
                availableModels={availableModels}
            />
        )}
        {photoViewerOpen && (
            <PhotoViewer
                isOpen={photoViewerOpen}
                onClose={() => setPhotoViewerOpen(false)}
                type={photoViewerType}
                onStartConversation={handleStartConversationFromViewer}
                currentPath={currentPath} // Missing prop
            />
        )}
        {cronDaemonPanelOpen && (
            <CronDaemonPanel
                isOpen={cronDaemonPanelOpen}
                onClose={() => setCronDaemonPanelOpen(false)} // Corrected typo here!
                currentPath={currentPath}
                npcList={availableNPCs.map(npc => ({ name: npc.name, display_name: npc.display_name }))}
                jinxList={availableJinxs.map(jinx => ({ jinx_name: jinx.name, description: jinx.description }))}
                onAddCronJob={window.api.addCronJob}
                onAddDaemon={window.api.addDaemon}
                onRemoveCronJob={window.api.removeCronJob}
                onRemoveDaemon={window.api.removeDaemon}
            />
        )}
        {npcTeamMenuOpen && (
            <NPCTeamMenu
                isOpen={npcTeamMenuOpen}
                onClose={() => setNpcTeamMenuOpen(false)}
                onSelectNPC={setCurrentNPC}
                currentNPC={currentNPC}
                currentPath={currentPath} // Missing prop
                startNewConversation={startNewConversationWithNpc} // Missing prop
            />
        )}
        {jinxMenuOpen && (
            <JinxMenu
                isOpen={jinxMenuOpen}
                onClose={() => setJinxMenuOpen(false)}
                currentPath={currentPath} // Missing prop
            />
        )}
        {ctxEditorOpen && (
            <CtxEditor
                isOpen={ctxEditorOpen}
                onClose={() => setCtxEditorOpen(false)}
                currentPath={currentPath} // Missing prop
            />
        )}
        {dashboardMenuOpen && (
            <DataDashboard
                isOpen={dashboardMenuOpen}
                onClose={() => {
                    setDashboardMenuOpen(false);
                    setAnalysisContext(null);
                }}
                analysisContext={analysisContext}
                currentModel={currentModel} // Missing prop
                currentProvider={currentProvider} // Missing prop
                currentNPC={currentNPC} // Missing prop
            />
        )}
        {browserUrlDialogOpen && (
            <BrowserUrlDialog
                isOpen={browserUrlDialogOpen}
                onClose={() => setBrowserUrlDialogOpen(false)}
                onNavigate={handleBrowserDialogNavigate}
            />
        )}
        {isMacroInputOpen && (
            <MacroInput
                isOpen={isMacroInputOpen}
                onClose={() => setIsMacroInputOpen(false)}
                macroText={macroText}
                setMacroText={setMacroText}
                currentPath={currentPath} // Missing prop
            />
        )}

        {promptModal.isOpen && (
            <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
                <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">{promptModal.title}</h3>
                    <p className="text-sm theme-text-muted mb-4">{promptModal.message}</p>
                    <input
                        type="text"
                        defaultValue={promptModal.defaultValue}
                        onChange={(e) => promptModal.defaultValue = e.target.value}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && promptModal.onConfirm) {
                                promptModal.onConfirm(promptModal.defaultValue);
                                setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                            } else if (e.key === 'Escape') {
                                setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                            }
                        }}
                        className="w-full theme-input text-sm p-2 rounded mb-4"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null })}
                            className="theme-button px-4 py-2 rounded text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (promptModal.onConfirm) {
                                    promptModal.onConfirm(promptModal.defaultValue);
                                }
                                setPromptModal({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
                            }}
                            className="theme-button-primary px-4 py-2 rounded text-sm"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        )}

        {memoryApprovalModal.isOpen && (
            <MemoryApprovalModal
                memories={memoryApprovalModal.memories}
                onClose={() => setMemoryApprovalModal({ isOpen: false, memories: [] })}
                onProcess={handleBatchMemoryProcess}
            />
        )}

        {aiEditModal.isOpen && (
            <AIEditModal
                isOpen={aiEditModal.isOpen}
                onClose={() => setAiEditModal({ isOpen: false, type: '', selectedText: '', selectionStart: 0, selectionEnd: 0, aiResponse: '', showDiff: false, isLoading: false, proposedChanges: [] })}
                type={aiEditModal.type}
                selectedText={aiEditModal.selectedText}
                aiResponse={aiEditModal.aiResponse}
                showDiff={aiEditModal.showDiff}
                isLoading={aiEditModal.isLoading}
                onApply={applyAIEdit}
                originalContent={contentDataRef.current[activeContentPaneId!]?.fileContent || ''}
                selectionStart={aiEditModal.selectionStart}
                selectionEnd={aiEditModal.selectionEnd}
                proposedChanges={aiEditModal.proposedChanges}
                onApplyAgenticChange={(change) => {
                    const paneData = contentDataRef.current[change.paneId];
                    if (paneData && paneData.contentType === 'editor') {
                        paneData.fileContent = change.newCode;
                        paneData.fileChanged = true;
                        setRootLayoutNode(p => (p ? { ...p } : null));
                    }
                }}
            />
        )}
        <BranchingUI />
    </div>
  );
};


interface FolderTreeDisplayProps {
    structure: any;
    currentPath: string;
    onFileClick: (filePath: string) => void;
    onFileContextMenu: (e: React.MouseEvent, filePath: string) => void;
    onFolderContextMenu: (e: React.MouseEvent, folderPath: string, type: string) => void;
    selectedFiles: Set<string>;
    setSelectedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    draggedItem: any;
    handleGlobalDragStart: (e: React.DragEvent, item: any) => void;
    handleGlobalDragEnd: () => void;
    renamingPath: string | null;
    setRenamingPath: React.Dispatch<React.SetStateAction<string | null>>;
    editedFileName: string;
    setEditedFileName: React.Dispatch<React.SetStateAction<string>>;
    expandedFolders: Set<string>;
    setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const FolderTreeDisplay = memo(({
    structure,
    currentPath,
    onFileClick,
    onFileContextMenu,
    onFolderContextMenu,
    selectedFiles,
    setSelectedFiles,
    draggedItem,
    handleGlobalDragStart,
    handleGlobalDragEnd,
    renamingPath,
    setRenamingPath,
    editedFileName,
    setEditedFileName,
    expandedFolders,
    setExpandedFolders,
}: FolderTreeDisplayProps) => {
    const renderNode = (node: any, path: string, depth: number) => {
        if (!node) return null;

        const fullPath = normalizePath(`${path}/${node.name}`);
        const isSelected = selectedFiles.has(fullPath);
        const isExpanded = expandedFolders.has(fullPath);
        const isRenaming = renamingPath === fullPath;

        const handleRenameBlur = async () => {
            if (isRenaming && editedFileName.trim() && editedFileName !== node.name) {
                const oldPath = fullPath;
                const newPath = normalizePath(`${path}/${editedFileName}`);
                try {
                    if (node.type === 'file') {
                        await window.api.renameFile(oldPath, newPath);
                    } else if (node.type === 'directory') {
                        await window.api.renameDirectory(oldPath, newPath);
                    }
                    // Re-trigger directory structure load in parent
                    window.api.readDirectoryStructure(currentPath);
                } catch (err: any) {
                    console.error(`Failed to rename ${node.type}:`, err);
                }
            }
            setRenamingPath(null);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleRenameBlur();
            } else if (e.key === 'Escape') {
                setRenamingPath(null);
            }
        };

        if (node.type === 'directory') {
            return (
                <div key={fullPath}>
                    <div
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 cursor-pointer group"
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={() => setExpandedFolders(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(fullPath)) newSet.delete(fullPath);
                            else newSet.add(fullPath);
                            return newSet;
                        })}
                        onContextMenu={(e) => onFolderContextMenu(e, fullPath, 'directory')}
                        draggable="true"
                        onDragStart={(e) => handleGlobalDragStart(e, { type: 'folder', id: fullPath })}
                        onDragEnd={handleGlobalDragEnd}
                    >
                        <ChevronRight size={12} className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <Folder size={14} className="flex-shrink-0 text-blue-400" />
                        {isRenaming ? (
                            <input
                                type="text"
                                value={editedFileName}
                                onChange={(e) => setEditedFileName(e.target.value)}
                                onBlur={handleRenameBlur}
                                onKeyDown={handleKeyDown}
                                className="flex-1 theme-input text-xs border-0 bg-transparent focus:ring-0"
                                autoFocus
                            />
                        ) : (
                            <span className="text-xs truncate">{node.name}</span>
                        )}
                    </div>
                    {isExpanded && node.children && (
                        <div className="ml-2">
                            {node.children.map((child: any) => renderNode(child, fullPath, depth + 1))}
                        </div>
                    )}
                </div>
            );
        } else if (node.type === 'file') {
            return (
                <div
                    key={fullPath}
                    className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 cursor-pointer group ${isSelected ? 'bg-blue-900/40' : ''}`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                            setSelectedFiles(prev => {
                                const newSelection = new Set(prev);
                                if (newSelection.has(fullPath)) newSelection.delete(fullPath);
                                else newSelection.add(fullPath);
                                return newSelection;
                            });
                        } else {
                            setSelectedFiles(new Set([fullPath]));
                            onFileClick(fullPath);
                        }
                    }}
                    onContextMenu={(e) => onFileContextMenu(e, fullPath)}
                    draggable="true"
                    onDragStart={(e) => handleGlobalDragStart(e, { type: 'file', id: fullPath })}
                    onDragEnd={handleGlobalDragEnd}
                >
                    {getFileIcon(node.name)}
                    {isRenaming ? (
                        <input
                            type="text"
                            value={editedFileName}
                            onChange={(e) => setEditedFileName(e.target.value)}
                            onBlur={handleRenameBlur}
                            onKeyDown={handleKeyDown}
                            className="flex-1 theme-input text-xs border-0 bg-transparent focus:ring-0"
                            autoFocus
                        />
                    ) : (
                        <span className="text-xs truncate">{node.name}</span>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-1">
            {structure.children?.map((node: any) => renderNode(node, currentPath, 0))}
        </div>
    );
});

interface MemoryApprovalModalProps {
    memories: any[]; // TODO: Type Memory
    onClose: () => void;
    onProcess: (memories: any[], decisions: Record<string, { decision: string; final_memory: string | null }>) => void;
}

const MemoryApprovalModal = ({ memories, onClose, onProcess }: MemoryApprovalModalProps) => {
    const [localMemories, setLocalMemories] = useState<any[]>(memories.map(m => ({ ...m, decision: 'approve', editedMemory: m.memory_content })));
    const [showAllDetails, setShowAllDetails] = useState(false);

    const handleDecisionChange = (id: string, decision: string) => {
        setLocalMemories(prev => prev.map(m => m.memory_id === id ? { ...m, decision } : m));
    };

    const handleMemoryEdit = (id: string, newContent: string) => {
        setLocalMemories(prev => prev.map(m => m.memory_id === id ? { ...m, editedMemory: newContent } : m));
    };

    const handleSubmit = () => {
        const decisions: Record<string, { decision: string; final_memory: string | null }> = {};
        localMemories.forEach(m => {
            decisions[m.memory_id] = {
                decision: m.decision,
                final_memory: m.decision === 'approve' ? m.editedMemory : null
            };
        });
        onProcess(memories, decisions);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold">Memory Approval ({memories.length})</h3>
                    <button onClick={onClose} className="p-1 theme-hover rounded-full"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {localMemories.map(memory => (
                        <div key={memory.memory_id} className="border theme-border rounded-md p-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs theme-text-muted">
                                    <span className="font-semibold">{memory.agent_name}</span> proposed at {new Date(memory.timestamp).toLocaleTimeString()}
                                </div>
                                <select
                                    value={memory.decision}
                                    onChange={(e) => handleDecisionChange(memory.memory_id, e.target.value)}
                                    className="theme-select text-xs px-2 py-1 rounded"
                                >
                                    <option value="approve">Approve</option>
                                    <option value="reject">Reject</option>
                                    <option value="edit_and_approve">Edit & Approve</option>
                                </select>
                            </div>
                            <div className="text-sm font-medium mb-1">Proposed Memory:</div>
                            {memory.decision === 'edit_and_approve' ? (
                                <textarea
                                    value={memory.editedMemory}
                                    onChange={(e) => handleMemoryEdit(memory.memory_id, e.target.value)}
                                    className="w-full theme-input text-xs p-2 rounded bg-gray-700"
                                    rows={4}
                                />
                            ) : (
                                <div className="prose prose-sm prose-invert max-w-none text-xs theme-text-primary p-2 theme-bg-tertiary rounded">
                                    <MarkdownRenderer content={memory.memory_content} />
                                </div>
                            )}
                            {showAllDetails && (
                                <div className="mt-2 text-xs theme-text-muted space-y-1">
                                    <div>Source: {memory.source_type} ({memory.source_id})</div>
                                    <div>Importance: {memory.importance}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex-shrink-0 flex justify-between items-center border-t theme-border pt-4">
                    <button
                        onClick={() => setShowAllDetails(!showAllDetails)}
                        className="theme-button px-3 py-1 rounded text-xs"
                    >
                        {showAllDetails ? 'Hide Details' : 'Show Details'}
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="theme-button px-4 py-2 rounded text-sm">Cancel</button>
                        <button onClick={handleSubmit} className="theme-button-primary px-4 py-2 rounded text-sm">Process All</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AIEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'ask' | 'document' | 'edit' | 'agentic';
    selectedText: string;
    aiResponse: string;
    showDiff: boolean;
    isLoading: boolean;
    onApply: () => void;
    originalContent: string;
    selectionStart: number;
    selectionEnd: number;
    proposedChanges: any[]; // TODO: Type AgenticChange
    onApplyAgenticChange: (change: any) => void;
}

const AIEditModal = ({
    isOpen,
    onClose,
    type,
    selectedText,
    aiResponse,
    showDiff,
    isLoading,
    onApply,
    originalContent,
    selectionStart,
    selectionEnd,
    proposedChanges,
    onApplyAgenticChange,
}: AIEditModalProps) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState(type === 'ask' ? 'response' : 'diff');
    const [currentAgenticChangeIndex, setCurrentAgenticChangeIndex] = useState(0);

    const currentAgenticChange = proposedChanges[currentAgenticChangeIndex];

    const renderDiff = (original: string, modified: string) => {
        const diffText = generateInlineDiff(window.api.generateDiff(original, modified));
        return (
            <pre className="text-xs p-2 rounded theme-bg-tertiary overflow-x-auto max-h-60">
                {diffText.map((line, idx) => (
                    <div key={idx} className={`${line.type === 'added' ? 'bg-green-900/30' : line.type === 'removed' ? 'bg-red-900/30' : ''}`}>
                        {line.type === 'added' && '+'}
                        {line.type === 'removed' && '-'}
                        {line.type === 'unchanged' && ' '}
                        {line.content}
                    </div>
                ))}
            </pre>
        );
    };

    const renderAgenticChangeControls = () => {
        if (proposedChanges.length === 0) return null;
        return (
            <div className="flex items-center justify-between mt-4 border-t theme-border pt-3">
                <button
                    onClick={() => setCurrentAgenticChangeIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentAgenticChangeIndex === 0}
                    className="theme-button px-3 py-1 rounded text-xs disabled:opacity-50"
                >
                    <ChevronLeft size={14} className="inline-block mr-1" /> Previous
                </button>
                <span className="text-xs theme-text-muted">
                    Change {currentAgenticChangeIndex + 1} of {proposedChanges.length}
                </span>
                <button
                    onClick={() => setCurrentAgenticChangeIndex(prev => Math.min(proposedChanges.length - 1, prev + 1))}
                    disabled={currentAgenticChangeIndex === proposedChanges.length - 1}
                    className="theme-button px-3 py-1 rounded text-xs disabled:opacity-50"
                >
                    Next <ChevronRight size={14} className="inline-block ml-1" />
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold">AI {type === 'ask' ? 'Analysis' : 'Edit'}</h3>
                    <button onClick={onClose} className="p-1 theme-hover rounded-full"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto mb-4">
                    {type === 'agentic' && proposedChanges.length > 0 ? (
                        <>
                            <div className="text-xs theme-text-muted mb-2">
                                Proposed changes for: <span className="font-semibold">{currentAgenticChange.filePath}</span>
                            </div>
                            <div className="text-sm font-semibold mb-2">Reasoning:</div>
                            <div className="prose prose-sm prose-invert max-w-none theme-text-primary p-2 theme-bg-tertiary rounded mb-4">
                                <MarkdownRenderer content={currentAgenticChange.reasoning} />
                            </div>
                            <div className="text-sm font-semibold mb-2">Diff:</div>
                            {renderDiff(currentAgenticChange.originalCode, currentAgenticChange.newCode)}
                            {renderAgenticChangeControls()}
                        </>
                    ) : (
                        <>
                            <div className="flex border-b theme-border mb-4">
                                <button
                                    onClick={() => setActiveTab('response')}
                                    className={`px-4 py-2 text-sm ${activeTab === 'response' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-muted'}`}
                                >
                                    AI Response
                                </button>
                                {showDiff && (
                                    <button
                                        onClick={() => setActiveTab('diff')}
                                        className={`px-4 py-2 text-sm ${activeTab === 'diff' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-muted'}`}
                                    >
                                        Diff
                                    </button>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="w-4 h-4 theme-text-muted rounded-full animate-bounce"></div>
                                    <div className="w-4 h-4 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                    <div className="w-4 h-4 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    <span className="ml-3 text-sm">Generating response...</span>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'response' && (
                                        <div className="prose prose-sm prose-invert max-w-none theme-text-primary">
                                            <MarkdownRenderer content={aiResponse} />
                                        </div>
                                    )}
                                    {activeTab === 'diff' && showDiff && (
                                        renderDiff(
                                            originalContent.substring(selectionStart, selectionEnd),
                                            aiResponse
                                        )
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="flex-shrink-0 flex justify-end gap-2 border-t theme-border pt-4">
                    <button onClick={onClose} className="theme-button px-4 py-2 rounded text-sm">Cancel</button>
                    {type === 'agentic' && proposedChanges.length > 0 ? (
                        <button
                            onClick={() => onApplyAgenticChange(currentAgenticChange)}
                            className="theme-button-primary px-4 py-2 rounded text-sm"
                            disabled={isLoading}
                        >
                            Apply This Change
                        </button>
                    ) : (
                        <button
                            onClick={onApply}
                            className="theme-button-primary px-4 py-2 rounded text-sm"
                            disabled={isLoading || !aiResponse.trim()}
                        >
                            Apply Changes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function AppWrapper() {
    return (
        <FileSystemProvider>
            <ChatProvider>
                <NpctsFullChat />
            </ChatProvider>
        </FileSystemProvider>
    );
}

