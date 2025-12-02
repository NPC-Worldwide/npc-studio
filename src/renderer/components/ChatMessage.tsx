import React, { memo, useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { Paperclip, Tag, Star, ChevronDown, ChevronUp } from 'lucide-react';

const highlightSearchTerm = (content: string, searchTerm: string): string => {
    if (!searchTerm || !content) return content;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return content.replace(regex, '**$1**');
};

// Count approximate lines in content (rough estimate based on newlines and length)
const countLines = (content: string): number => {
    if (!content) return 0;
    const newlineCount = (content.match(/\n/g) || []).length;
    const estimatedWrappedLines = Math.ceil(content.length / 80); // ~80 chars per line
    return Math.max(newlineCount + 1, estimatedWrappedLines);
};

const MAX_COLLAPSED_LINES = 4;

export const ChatMessage = memo(({
    message,
    isSelected,
    messageSelectionMode,
    toggleMessageSelection,
    handleMessageContextMenu,
    searchTerm,
    isCurrentSearchResult,
    onResendMessage,
    onCreateBranch,
    messageIndex,
    onLabelMessage,
    messageLabel,
    conversationId
}) => {
    const showStreamingIndicators = !!message.isStreaming;
    const messageId = message.id || message.timestamp;

    // Collapsible state for long user messages
    const isLongMessage = message.role === 'user' && countLines(message.content) > MAX_COLLAPSED_LINES;
    const [isExpanded, setIsExpanded] = useState(false);

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

            {/* Label button - shown for all messages */}
            {!messageSelectionMode && onLabelMessage && (
                <div className={`absolute ${message.role === 'user' ? 'top-2 right-8' : 'top-2 right-2'} opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1`}>
                    {messageLabel && (
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400" title={`Labeled: ${messageLabel.categories?.join(', ') || 'No categories'}`}>
                            {messageLabel.qualityScore && (
                                <span className="flex items-center">
                                    <Star size={10} fill="currentColor" />
                                    {messageLabel.qualityScore}
                                </span>
                            )}
                            {messageLabel.categories?.length > 0 && (
                                <span className="px-1 bg-blue-600/30 rounded">{messageLabel.categories.length}</span>
                            )}
                        </span>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onLabelMessage({ ...message, conversationId });
                        }}
                        className={`p-1 theme-hover rounded-full transition-all ${messageLabel ? 'text-yellow-400' : ''}`}
                        title={messageLabel ? "Edit labels" : "Add labels"}
                    >
                        <Tag size={14} />
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
                <div className={`prose prose-sm prose-invert max-w-none theme-text-primary ${isLongMessage && !isExpanded ? 'max-h-24 overflow-hidden relative' : ''}`}>
                    {searchTerm && message.content ? (
                        <MarkdownRenderer content={highlightSearchTerm(message.content, searchTerm)} />
                    ) : (
                        <MarkdownRenderer content={message.content || ''} />
                    )}
                    {showStreamingIndicators && message.type !== 'error' && (
                        <span className="ml-1 inline-block w-0.5 h-4 theme-text-primary animate-pulse stream-cursor"></span>
                    )}
                    {/* Fade overlay for collapsed messages */}
                    {isLongMessage && !isExpanded && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-inherit to-transparent pointer-events-none" />
                    )}
                </div>
                {/* Expand/Collapse button for long user messages */}
                {isLongMessage && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="mt-2 flex items-center gap-1 text-xs theme-text-muted hover:theme-text-primary transition-colors"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={14} />
                                <span>Show less</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown size={14} />
                                <span>Show more ({countLines(message.content)} lines)</span>
                            </>
                        )}
                    </button>
                )}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 px-3 py-2 theme-bg-tertiary rounded-md border-l-2 border-blue-500">
                        <div className="text-xs text-blue-400 mb-1 font-semibold">Function Calls:</div>
                        {message.toolCalls.map((tool, idx) => (
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
