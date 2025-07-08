import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
    Folder, File, ChevronRight, Settings, Edit, Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare, ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, Send
} from 'lucide-react';
import MacroInput from './MacroInput';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import JinxMenu from './JinxMenu';
import '../../index.css';
import MarkdownRenderer from './MarkdownRenderer';
const generateId = () => Math.random().toString(36).substr(2, 9);

const normalizePath = (path) => {
    if (!path) return '';
    let normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    return normalizedPath;
};

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
        default: return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
    }
};

const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

// Helper function to highlight search terms in text, returning a string with <mark> tags.
// Your MarkdownRenderer must be configured to handle raw HTML for this to work.
const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    try {
        // Escape special characters in the term for the regex
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, `<mark class="bg-yellow-500 text-black rounded px-1">$1</mark>`);
    } catch (e) {
        console.error("Error highlighting search term:", e);
        return text;
    }
};

const ChatMessage = memo(({ message, isSelected, messageSelectionMode, toggleMessageSelection, handleMessageContextMenu, searchTerm, activeSearchResult }) => {
    const showStreamingIndicators = !!message.isStreaming;
    const messageId = message.id || message.timestamp;

    return (
        <div
            id={`message-${messageId}`}
            className={`max-w-[85%] rounded-lg p-3 relative ${
                message.role === 'user' ? 'theme-message-user' : 'theme-message-assistant'
            } ${message.type === 'error' ? 'theme-message-error theme-border' : ''} ${
                isSelected ? 'ring-2 ring-blue-500' : ''
            } ${activeSearchResult === messageId ? 'ring-2 ring-yellow-500' : ''} ${messageSelectionMode ? 'cursor-pointer' : ''}`}
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
            <div className="text-xs theme-text-muted mb-1 opacity-80">
                {message.role === 'user' ? 'You' : (message.npc || message.model || 'Assistant')}
                <span className="ml-2">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
                        {message.attachments.map((attachment, idx) => (
                            <div key={idx} className="text-xs theme-bg-tertiary rounded px-2 py-1 flex items-center gap-1">
                                <Paperclip size={12} className="flex-shrink-0" />
                                <span className="truncate" title={attachment.name}>{attachment.name}</span>
                                {attachment.data && attachment.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                    <img src={attachment.data} alt={attachment.name} className="mt-1 max-w-[100px] max-h-[100px] rounded-md object-cover"/>
                                )}
                            </div>
                        ))}
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
    // --- NEW: File selection and context menu states ---
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [lastClickedFileIndex, setLastClickedFileIndex] = useState(null);
    const [fileContextMenuPos, setFileContextMenuPos] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [folderStructure, setFolderStructure] = useState({});
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
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

    const [availableNPCs, setAvailableNPCs] = useState([]);
    const [npcsLoading, setNpcsLoading] = useState(false);
    const [npcsError, setNpcsError] = useState(null);

    const [allMessages, setAllMessages] = useState([]);
    const [displayedMessageCount, setDisplayedMessageCount] = useState(10);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

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

    // --- NEW: Collapsible section states ---
    const [filesCollapsed, setFilesCollapsed] = useState(true); // Set to true by default
    const [conversationsCollapsed, setConversationsCollapsed] = useState(true); // Set to true by default

    // --- NEW/ADJUSTED SEARCH STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isGlobalSearch, setIsGlobalSearch] = useState(false); // Checkbox state
    const [searchLoading, setSearchLoading] = useState(false); // For deep search spinner
    const [deepSearchResults, setDeepSearchResults] = useState([]); // Stores results from backend
    const [messageSearchResults, setMessageSearchResults] = useState([]); // Stores in-chat match locations
    const [activeSearchResult, setActiveSearchResult] = useState(null); // ID of highlighted message
    const searchInputRef = useRef(null); // Ref to focus the search input

    // --- NEW: useEffect for Ctrl+F shortcut ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);


    // --- NEW: Handler for deep search submission ---
    const handleSearchSubmit = async () => {
        if (!searchTerm.trim()) {
            setIsSearching(false);
            setDeepSearchResults([]);
            return;
        }

        setSearchLoading(true);
        setIsSearching(true);
        setDeepSearchResults([]);
        setError(null);

        const lowerCaseQuery = searchTerm.toLowerCase();

        try {
            let results = [];

            if (isGlobalSearch) {
                // --- GLOBAL SEARCH: Uses the backend to search the filesystem ---
                console.log("Performing GLOBAL search for:", searchTerm);
                const backendResults = await window.api.performSearch({
                    query: searchTerm,
                    path: currentPath, // The backend can use this to find the root
                    global: true,
                });
                
                if (backendResults && !backendResults.error) {
                    results = backendResults;
                } else {
                    throw new Error(backendResults?.error || "Global search failed.");
                }

            } else {
                // --- LOCAL SEARCH: Searches through loaded conversations in the current path ---
                console.log("Performing LOCAL search for:", searchTerm);
                
                // We iterate through the conversations already in the sidebar state.
                for (const conv of directoryConversations) {
                    // Fetch the messages for each conversation.
                    const messages = await window.api.getConversationMessages(conv.id);
                    if (!Array.isArray(messages)) continue;

                    const matches = [];
                    for (const message of messages) {
                        if (message.content && message.content.toLowerCase().includes(lowerCaseQuery)) {
                            // Create a snippet for the search result display
                            const index = message.content.toLowerCase().indexOf(lowerCaseQuery);
                            const start = Math.max(0, index - 25);
                            const end = Math.min(message.content.length, index + searchTerm.length + 25);
                            
                            matches.push({
                                messageId: message.id || message.timestamp,
                                snippet: message.content.substring(start, end).trim(),
                            });
                        }
                    }

                    // If we found any matches in this conversation, add it to our results.
                    if (matches.length > 0) {
                        results.push({
                            conversationId: conv.id,
                            conversationTitle: conv.title,
                            timestamp: conv.timestamp,
                            matches: matches,
                        });
                    }
                }
            }

            // Sort and set the final results, regardless of search type
            const sortedResults = results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setDeepSearchResults(sortedResults);

        } catch (err) {
            console.error("Error during search:", err);
            setError(err.message);
            setDeepSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    // --- ADJUSTED: Search input change handler ---
    const handleSearchChange = (e) => {
        const searchValue = e.target.value;
        setSearchTerm(searchValue);

        // If the user clears the input, reset the search state and go back to normal view
        if (!searchValue.trim()) {
            setIsSearching(false);
            setDeepSearchResults([]);
            setMessageSearchResults([]);
        }
        // The actual search is now triggered by the Enter key in the input field
    };

    // Message selection handlers
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
    }, [messageSelectionMode]); // Dependency: only re-create if messageSelectionMode changes


const toggleMessageSelectionMode = () => {
    setMessageSelectionMode(!messageSelectionMode);
    setSelectedMessages(new Set());
    setMessageContextMenuPos(null);
};
const handleMessageContextMenu = useCallback((e, messageId) => {
    e.preventDefault();
    setSelectedMessages(prev => {
        if (!prev.has(messageId) && prev.size > 0) {
            return new Set([...prev, messageId]);
        } else if (prev.size === 0) {
            return new Set([messageId]);
        }
        return prev;
    });
    setMessageContextMenuPos({ x: e.clientX, y: e.clientY, messageId });
}, []); 

const handleApplyPromptToMessages = async (operationType, customPrompt = '') => {
    const selectedIds = Array.from(selectedMessages);
    if (selectedIds.length === 0) return;
    
    const selectedMsgs = allMessages.filter(msg => selectedIds.includes(msg.id || msg.timestamp));
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

    try {
        // For batch operations, always create a new conversation
        console.log('Creating new conversation for message operation:', operationType);
        const newConversation = await createNewConversation();
        
        if (!newConversation) {
            throw new Error('Failed to create new conversation');
        }

        // Set the new conversation as active
        setActiveConversationId(newConversation.id);
        setCurrentConversation(newConversation);
        
        // Clear current messages and prepare for new conversation
        setMessages([]);
        setAllMessages([]);
        setDisplayedMessageCount(10);

        // Generate a new stream ID for this operation
        const newStreamId = generateId();
        streamIdRef.current = newStreamId;
        setIsStreaming(true);

        // Find the full NPC object to get its source (project or global)
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);

        // Create user message and assistant placeholder for the new conversation
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

        // Update both message arrays
        setMessages([userMessage, assistantPlaceholderMessage]);
        setAllMessages([userMessage, assistantPlaceholderMessage]);

        console.log('Sending message operation to backend with streamId:', newStreamId);

        // Execute the command with the new conversation ID
        const result = await window.api.executeCommandStream({
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

        if (result && result.error) {
            throw new Error(result.error);
        }

        console.log('Message operation initiated successfully in new conversation:', newConversation.id);
        
    } catch (err) {
        console.error('Error processing messages:', err);
        setError(err.message);
        
        // Reset streaming state on error
        setIsStreaming(false);
        streamIdRef.current = null;
        
        // Fallback: put the prompt in the input field of the current conversation
        if (activeConversationId) {
            setInput(fullPrompt);
        }
    } finally {
        // Clear selection
        setSelectedMessages(new Set());
        setMessageContextMenuPos(null);
        setMessageOperationModal({ ...messageOperationModal, isOpen: false });
    }
};

const handleApplyPromptToCurrentConversation = async (operationType, customPrompt = '') => {
    const selectedIds = Array.from(selectedMessages);
    if (selectedIds.length === 0) return;
    
    const selectedMsgs = allMessages.filter(msg => selectedIds.includes(msg.id || msg.timestamp));
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

    try {
        // For input field operations, just populate the input field
        // Make sure we have an active conversation
        if (!activeConversationId) {
            console.log('No active conversation, creating new one for input field operation');
            await createNewConversation();
        }

        // Put the prompt in the input field for the user to review and potentially modify
        setInput(fullPrompt);
        
        console.log('Message operation prompt added to input field');
        
    } catch (err) {
        console.error('Error preparing prompt for input field:', err);
        setError(err.message);
    } finally {
        // Clear selection
        setSelectedMessages(new Set());
        setMessageContextMenuPos(null);
        setMessageOperationModal({ ...messageOperationModal, isOpen: false });
    }
};

// --- NEW: File operation handlers ---
const handleApplyPromptToFiles = async (operationType, customPrompt = '') => {
    const selectedFilePaths = Array.from(selectedFiles);
    if (selectedFilePaths.length === 0) return;
    
    try {
        // Read content from all selected files
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

        // Create a new conversation for this operation
        const newConversation = await createNewConversation();
        if (!newConversation) {
            throw new Error('Failed to create new conversation');
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
        console.error('Error processing files:', err);
        setError(err.message);
        setIsStreaming(false);
        streamIdRef.current = null;
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

    const loadAvailableNPCs = async () => {
        if (!currentPath) return;
        
        setNpcsLoading(true);
        setNpcsError(null);
        
        try {
            // First load project NPCs
            const projectResponse = await window.api.getNPCTeamProject(currentPath);
            const projectNPCs = projectResponse.npcs || [];
            
            // Then load global NPCs
            const globalResponse = await window.api.getNPCTeamGlobal();
            const globalNPCs = globalResponse.npcs || [];
            
            // Format and combine both sets
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
            
            // Combine with project NPCs first, then global NPCs
            const combinedNPCs = [...formattedProjectNPCs, ...formattedGlobalNPCs];
            setAvailableNPCs(combinedNPCs);
            
            // Check if current NPC is valid, otherwise select first NPC if available
            const currentValid = combinedNPCs.some(npc => npc.value === currentNPC);
            if (!currentNPC || !currentValid) {
                if (combinedNPCs.length > 0) {
                    setCurrentNPC(combinedNPCs[0].value);
                }
            }
        } catch (err) {
            console.error('Error fetching NPCs:', err);
            setNpcsError(err.message);
            setAvailableNPCs([]);
        } finally {
            setNpcsLoading(false);
        }
    };

    // Add this useEffect to load NPCs when the path changes
    useEffect(() => {
        if (currentPath) {
            loadAvailableNPCs();
        }
    }, [currentPath]);


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



    const handleFileClick = async (filePath) => {
        try {
            const response = await window.api.readFileContent(filePath);
            if (response.error) throw new Error(response.error);
            setCurrentFile(filePath);
            setFileContent(response.content);
            setIsEditing(true);
            setFileChanged(false);
            setActiveConversationId(null);
        } catch (err) {
            console.error('Error opening file:', err);
            setError(err.message);
        }
    };

    // Add isSaving state
    const [isSaving, setIsSaving] = useState(false);

    const handleFileSave = async () => {
        if (!currentFile || !fileChanged || isSaving) return;
        try {
            setIsSaving(true);
            const response = await window.api.writeFileContent(currentFile, fileContent);
            if (response.error) throw new Error(response.error);
            setFileChanged(false);
            
            // Only refresh the directory structure WITHOUT affecting conversations
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

    const handleFileContentChange = (newContent) => {
        setFileContent(newContent);
        setFileChanged(true);
    };

    // --- NEW: File renaming state and handlers ---
    const [isRenamingFile, setIsRenamingFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    const handleRenameFile = async () => {
        try {
            if (!currentFile || !newFileName.trim()) return;
            
            const lastSlashIndex = currentFile.lastIndexOf('/');
            const dirPath = currentFile.substring(0, lastSlashIndex + 1);
            const newPath = dirPath + newFileName;
            
            const response = await window.api.renameFile(currentFile, newPath);
            if (response?.error) throw new Error(response.error);
            
            // Update the current file path to the new path
            setCurrentFile(newPath);
            setIsRenamingFile(false);
            
            // Only refresh the directory structure WITHOUT affecting conversations
            const structureResult = await window.api.readDirectoryStructure(currentPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
            }
            
            console.log('File renamed successfully from', currentFile, 'to', newPath);
        } catch (err) {
            console.error('Error renaming file:', err);
            setError(err.message);
        }
    };

    const deleteSelectedConversations = async () => {
        const selectedConversationIds = Array.from(selectedConvos);
        const selectedFilePaths = Array.from(selectedFiles);
        
        if (selectedConversationIds.length === 0 && selectedFilePaths.length === 0) return;
        
        try {
            // Delete selected conversations
            if (selectedConversationIds.length > 0) {
                await Promise.all(selectedConversationIds.map(id => window.api.deleteConversation(id)));
                await loadConversations(currentPath);
            }
            
            // Delete selected files
            if (selectedFilePaths.length > 0) {
                await Promise.all(selectedFilePaths.map(filePath => window.api.deleteFile(filePath)));
                
                // If current file is being deleted, close the editor
                if (selectedFilePaths.includes(currentFile)) {
                    setCurrentFile(null);
                    setIsEditing(false);
                    setFileContent('');
                    setFileChanged(false);
                }
                
                // Refresh folder structure
                const structureResult = await window.api.readDirectoryStructure(currentPath);
                if (structureResult && !structureResult.error) {
                    setFolderStructure(structureResult);
                }
            }
        } catch (err) {
            console.error('Error deleting items:', err);
            setError(err.message);
        }
        
        // Clear selections
        setSelectedConvos(new Set());
        setSelectedFiles(new Set());
    };

    useEffect(() => {
        const loadData = async () => {
            if (currentPath) {
                setLoading(true);
                await loadDirectoryStructure(currentPath); // Includes loadConversations -> setDirectoryConversations
                setLoading(false); // Loading done for this path

                const currentConvos = directoryConversationsRef.current;

                if (!activeConversationId) { // Only act if NO conversation is currently active
                    const needsNewConvo = currentConvos.length === 0;
                    const needsSelectConvo = currentConvos.length > 0;

                     //console.log(`Post-Load Decision: needsNew=${needsNewConvo}, needsSelect=${needsSelectConvo}, activeId=${activeConversationId}, convoCount=${currentConvos.length}`);

                    if (needsNewConvo) {
                        //console.log("No active convo, none loaded: Creating new conversation.");
                        // No await needed if createNewConversation doesn't need to block anything *here*
                        createNewConversation();
                    } else if (needsSelectConvo) {
                        //console.log(`No active convo, selecting first loaded: ${currentConvos[0].id}`);
                        // No await needed if handleConversationSelect doesn't need to block anything *here*
                        handleConversationSelect(currentConvos[0].id);
                    }
                } else {
                    //  console.log(`Post-Load: Conversation ${activeConversationId} is already active.`);
                }
            }
        };

        loadData();
    }, [currentPath]);



    const handleConversationSelect = async (conversationId) => {
        try {
          setIsEditing(false);
          setCurrentFile(null);
          //console.log('Selecting conversation:', conversationId);
          setActiveConversationId(conversationId);
          //console.log('Active conversation ID set to:', conversationId);

          const selectedConv = directoryConversations.find(conv => conv.id === conversationId);
          //console.log('Found conversation object:', selectedConv);
          if (selectedConv) {
            setCurrentConversation(selectedConv);
          } else {
             setCurrentConversation(null);
          }

          setMessages([]); // Clear messages initially
          setAllMessages([]); // Clear all messages too
          setDisplayedMessageCount(10); // Reset pagination

          //console.log('Fetching messages for conversation:', conversationId);
          const response = await window.api.getConversationMessages(conversationId);
          //console.log('Raw message response from API:', response);

          // Check if the response *itself* is the array of messages
          if (response && Array.isArray(response)) {
             const formattedMessages = response.map(msg => ({
                role: msg.role || 'assistant',
                content: msg.content || '',
                timestamp: msg.timestamp || new Date().toISOString(),
                type: msg.content?.startsWith('/') ? 'command' : 'message',
                model: msg.model,
                npc: msg.npc,
                attachments: msg.attachment_data ? [{
                  name: msg.attachment_name,
                  data: `data:image/png;base64,${msg.attachment_data}`, // Assuming base64 image data
                }] : (msg.attachments || []) // Preserve if already formatted
              }));
              //console.log('Setting messages:', formattedMessages);
              setAllMessages(formattedMessages); // Store all messages
              setMessages(formattedMessages); // Keep for backward compatibility
          } else if (response?.error) {
               console.error("Error fetching messages:", response.error);
               setError(response.error);
               setMessages([]);
               setAllMessages([]);
          }
           else {
            //console.log("No messages found or invalid response format for conversation:", conversationId);
            setMessages([]);
            setAllMessages([]);
          }
        } catch (err) {
          console.error('Error in handleConversationSelect:', err);
          setError(err.message);
          setMessages([]);
          setAllMessages([]);
        }
      };


    const startNewConversationWithNpc = async (npc) => {
        try {
            const newConversation = await createNewConversation();
            if (newConversation) {
                // Set the selected NPC as the current NPC
                setCurrentNPC(npc.name);
                
                // Create a welcome message from the NPC
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
                        timestamp: conv.timestamp || Date.now()
                    }));
                    
                    // Sort conversations by timestamp, newest first
                    formattedConversations.sort((a, b) => b.timestamp - a.timestamp);
                    
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
        let currentActiveId = activeConversationId; // Capture current active ID
        try {
            const normalizedPath = normalizePath(dirPath);
            if (!normalizedPath) return;
            const response = await window.api.getConversations(normalizedPath);
            const formattedConversations = response?.conversations?.map(conv => ({
                id: conv.id,
                title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                preview: conv.preview || 'No content',
                timestamp: conv.timestamp || Date.now()
            })) || [];

            // Sort conversations by timestamp, newest first
            formattedConversations.sort((a, b) => b.timestamp - a.timestamp);
            
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
                 await createNewConversation(); // Attempt to create if load fails
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


    // Initialization Effect (runs once)
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const loadedConfig = await window.api.getDefaultConfig();
                if (!loadedConfig || !loadedConfig.baseDir) throw new Error('Invalid config');
                setConfig(loadedConfig);
                setBaseDir(loadedConfig.baseDir);
                const defaultPath = await loadDefaultPath();
                const pathToUse = defaultPath || loadedConfig.baseDir;
                setCurrentPath(pathToUse); // This will trigger the next effect
            } catch (err) {
                console.error('Initialization error:', err);
                setError(err.message);
            }        };
        init();
    }, []); // Empty dependency array - runs once

    useEffect(() => {
        const loadData = async () => {
            if (currentPath) {
                setLoading(true);
                await loadDirectoryStructure(currentPath); // This now also calls loadConversations
                setLoading(false);
                initialLoadComplete.current = true;
                 // Ensure a conversation is active after initial load if none was selected
                if (!activeConversationId && directoryConversations.length === 0) {
                    await createNewConversation();
                } else if (!activeConversationId && directoryConversations.length > 0) {
                    // Select first convo if none active after load
                     await handleConversationSelect(directoryConversations[0].id);
                }
            }
        };
        loadData();
    }, [currentPath]);

    useEffect(() => {
        const fetchModels = async () => {
            if (!currentPath) return;
            setModelsLoading(true);
            setModelsError(null);
            try {
                const response = await window.api.getAvailableModels(currentPath);
                if (response?.models && Array.isArray(response.models)) {
                    setAvailableModels(response.models);
                    const currentValid = response.models.some(m => m.value === currentModel);
                    const configValid = response.models.some(m => m.value === config?.model);
                    if (!currentModel || !currentValid) {
                        if (config?.model && configValid) {
                            setCurrentModel(config.model);
                            setCurrentProvider(config.provider);
                        } else if (response.models.length > 0) {
                            setCurrentModel(response.models[0].value);
                            console.log('response models', response.models)
                        } else {
                            setCurrentModel(null);
                            setCurrentProvider(null);
                        }
                    }
                } else {
                    throw new Error(response?.error || "Invalid models response");
                }
            } catch (err) {
                console.error('Error fetching models:', err);
                setModelsError(err.message);
                setAvailableModels([]);
                setCurrentModel(config?.model || 'llama3.2');
                setCurrentProvider(config?.provider || 'ollama');
            } finally {
                setModelsLoading(false);
            }
        };
        if (currentPath) {
             fetchModels();
        }
    }, [currentPath, config]);

    const goUpDirectory = async () => {
        try {
            if (!currentPath || currentPath === baseDir) return;
            const newPath = await window.api.goUpDirectory(currentPath);
            setCurrentPath(newPath);
        } catch (err) {
            console.error('Error going up directory:', err);
            setError(err.message);
        }
    };


    const createNewConversation = async () => {
        try {
            setIsEditing(false);
            setCurrentFile(null);
            const conversation = await window.api.createConversation({
                title: 'New Conversation',
                model: currentModel || config?.model || 'llama3.2',
                provider: currentProvider || config?.provider || 'ollama', 
                directory_path: currentPath
            });
            
            // Insert the new conversation at the beginning of the array (newest first)
            setDirectoryConversations(prev => [{
                 id: conversation.id,
                 title: 'New Conversation',
                 preview: 'No content',
                 timestamp: Date.now()
            }, ...prev]);
            
            setActiveConversationId(conversation.id); // Set it active
            setCurrentConversation(conversation);
            setMessages([]); // Clear messages
            setAllMessages([]); // Also clear allMessages
            setDisplayedMessageCount(10); // Reset pagination count
            return conversation; // Return the created conversation
        } catch (err) {
            console.error('Error creating conversation:', err);
            setError(err.message);
            throw err;
        }
    };

    const createNewTextFile = async () => {
        try {
            // Generate a unique filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `untitled-${timestamp}.txt`;
            
            // Fix the double slash issue by ensuring proper path joining
            const filepath = currentPath.endsWith('/') 
                ? `${currentPath}${filename}` 
                : `${currentPath}/${filename}`;
            
            // Create an empty text file
            const response = await window.api.writeFileContent(filepath, '');
            if (response.error) throw new Error(response.error);
            
            
            // Refresh the folder structure to include the new file
            const structureResult = await window.api.readDirectoryStructure(currentPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
                
                // Wait for React to process the folder structure update, THEN set current file
                setTimeout(() => {
                    setCurrentFile(filepath);
                    setFileContent('');
                    setIsEditing(true);
                    setFileChanged(false);
                    setActiveConversationId(null);
                }, 0);
            }
            
            console.log('Created new text file:', filepath);
        } catch (err) {
            console.error('Error creating new text file:', err);
            setError(err.message);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsHovering(false);
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    };

    const handleFileUpload = async (files) => {
        const existingFileNames = new Set(uploadedFiles.map(f => f.name));
        const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));
        const attachmentData = [];
        for (const file of newFiles) {
            try {
                const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
                attachmentData.push({
                    id: generateId(), name: file.name, type: file.type, path: file.path, size: file.size, preview
                });
            } catch (err) {
                console.error("Error processing file:", file.name, err);
            }
        }
        if (attachmentData.length > 0) {
            setUploadedFiles(prev => [...prev, ...attachmentData]);
        }
    };

    const handleFileInput = (event) => {
        if (event.target.files.length) {
            handleFileUpload(event.target.files);
            event.target.value = null;
        }
    };

useEffect(() => {
    console.log('[REACT] Stream listener useEffect: Checking conditions. Config loaded:', !!config, 'Config stream enabled:', config?.stream, 'Listeners already attached:', listenersAttached.current);

    if (config && config.stream && !listenersAttached.current) {
        console.log('[REACT] Stream listener useEffect: ATTACHING listeners.');

        const handleStreamData = (_, { streamId: incomingStreamId, chunk }) => {
            console.log(`[REACT] RAW handleStreamData: incomingStreamId=${incomingStreamId}, currentStreamIdRef=${streamIdRef.current}, chunk PRESENT: ${!!chunk}`);
            
            // Initialize stream ID if not set
            if (!streamIdRef.current) {
                streamIdRef.current = incomingStreamId;
            }

            if (streamIdRef.current !== incomingStreamId) {
                console.warn(`[REACT] Stream mismatch: ${streamIdRef.current} vs ${incomingStreamId}`);
                return;
            }
            
            try {
                let content = '';
                let reasoningContent = '';
                let toolCalls = null;
                let isDecision = false;
                
                if (typeof chunk === 'string') {
                    if (chunk.startsWith('data:')) {
                        const dataContent = chunk.replace(/^data:\s*/, '').trim();
                        if (dataContent === '[DONE]') {
                            console.log('[REACT] handleStreamData: Received [DONE] signal for stream:', incomingStreamId);
                            return;
                        }
                        if (dataContent) {
                            const parsed = JSON.parse(dataContent);
                            isDecision = parsed.choices?.[0]?.delta?.role === 'decision';
                            content = parsed.choices?.[0]?.delta?.content || '';
                            reasoningContent = parsed.choices?.[0]?.delta?.reasoning_content || '';
                            toolCalls = parsed.tool_calls || null;
                        }
                    } else {
                        content = chunk;
                    }
                } else if (chunk && chunk.choices) {
                    isDecision = chunk.choices[0]?.delta?.role === 'decision';
                    content = chunk.choices[0]?.delta?.content || '';
                    reasoningContent = chunk.choices[0]?.delta?.reasoning_content || '';
                    toolCalls = chunk.tool_calls || null;
                }

                if (content || reasoningContent || toolCalls) {
                    console.log('[REACT] handleStreamData:', 
                        isDecision ? 'Decision content:' : 'Regular content:', 
                        content.substring(0, 50) + "..."
                    );
                    
                    setMessages(prev => {
                        const msgIndex = prev.findIndex(m => m.id === incomingStreamId && 
                            (m.role === 'assistant' || m.role === 'decision'));
                        if (msgIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[msgIndex] = {
                                ...newMessages[msgIndex],
                                role: isDecision ? 'decision' : 'assistant',
                                content: (newMessages[msgIndex].content || '') + content,
                                reasoningContent: (newMessages[msgIndex].reasoningContent || '') + reasoningContent,
                                toolCalls: toolCalls ? 
                                    (newMessages[msgIndex].toolCalls || []).concat(toolCalls) : 
                                    newMessages[msgIndex].toolCalls,
                                npc: newMessages[msgIndex].npc || currentNPC
                            };
                            return newMessages;
                        }
                        return [...prev, {
                            id: incomingStreamId,
                            role: isDecision ? 'decision' : 'assistant',
                            content: content,
                            reasoningContent: reasoningContent,
                            toolCalls: toolCalls ? [toolCalls] : [],
                            npc: currentNPC,
                            timestamp: Date.now()
                        }];
                    });

                    setAllMessages(prev => {
                        const msgIndex = prev.findIndex(m => m.id === incomingStreamId && 
                            (m.role === 'assistant' || m.role === 'decision'));
                        if (msgIndex !== -1) {
                            const newMessages = [...prev];
                            newMessages[msgIndex] = {
                                ...newMessages[msgIndex],
                                role: isDecision ? 'decision' : 'assistant',
                                content: (newMessages[msgIndex].content || '') + content,
                                reasoningContent: (newMessages[msgIndex].reasoningContent || '') + reasoningContent,
                                toolCalls: toolCalls ? 
                                    (newMessages[msgIndex].toolCalls || []).concat(toolCalls) : 
                                    newMessages[msgIndex].toolCalls,
                                npc: newMessages[msgIndex].npc || currentNPC
                            };
                            return newMessages;
                        }
                        return prev;
                    });
                }
            } catch (err) {
                console.error('[REACT] handleStreamData: Error processing stream chunk:', err, 'Raw chunk:', chunk);
            }
        };

        const handleStreamComplete = async (_, { streamId: completedStreamId } = {}) => {
            console.log(`[REACT] handleStreamComplete: streamId=${completedStreamId}, currentStreamIdRef=${streamIdRef.current}`);
            
            setMessages(prev => prev.map(msg => 
                msg.streamId ? { ...msg, streamId: null } : msg
            ));
            
            setAllMessages(prev => prev.map(msg => 
                msg.streamId ? { ...msg, streamId: null } : msg
            ));

            if (streamIdRef.current === completedStreamId || !completedStreamId) {
                console.log(`[REACT] handleStreamComplete: Resetting streaming state`);
                setIsStreaming(false);
                streamIdRef.current = null;
                
                try {
                    console.log(`[REACT] handleStreamComplete: Forcing conversation refresh`);
                    if (currentPath) {
                        const response = await window.api.getConversations(normalizePath(currentPath));
                        
                        if (response?.conversations) {
                            const formattedConversations = response.conversations.map(conv => ({
                                id: conv.id,
                                title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                                preview: conv.preview || 'No content',
                                timestamp: conv.timestamp || Date.now()
                            }));
                            
                            formattedConversations.sort((a, b) => b.timestamp - a.timestamp);
                            
                            console.log(`[REACT] handleStreamComplete: Setting ${formattedConversations.length} conversations`);
                            setDirectoryConversations([...formattedConversations]);
                        } else {
                            console.error('[REACT] handleStreamComplete: No conversations in response:', response);
                        }
                    }
                } catch (err) {
                    console.error('[REACT] handleStreamComplete: Error refreshing conversations:', err);
                }
            }
        };

        const handleStreamError = (_, { streamId: errorStreamId, error } = {}) => {
            console.error(`[REACT] handleStreamError: streamId=${errorStreamId}, currentStreamIdRef=${streamIdRef.current}, error=${error}`);
            if (streamIdRef.current === errorStreamId) {
                setIsStreaming(false);
                streamIdRef.current = null;
            }
            setMessages(prev => {
                const msgIndex = prev.findIndex(m => m.id === errorStreamId && m.role === 'assistant');
                if (msgIndex !== -1) {
                    const updatedMessages = [...prev];
                    updatedMessages[msgIndex] = {
                        ...updatedMessages[msgIndex],
                        content: (updatedMessages[msgIndex].content || '') + `\n[STREAM ERROR: ${error}]`,
                        type: 'error',
                        streamId: null
                    };
                    return updatedMessages;
                }
                return [...prev, { 
                    id: generateId(), 
                    role: 'assistant', 
                    content: `[STREAM ERROR (streamId ${errorStreamId || 'unknown'}): ${error}]`, 
                    timestamp: new Date().toISOString(), 
                    type: 'error' 
                }];
            });
        };

        const cleanupStreamData = window.api.onStreamData(handleStreamData);
        const cleanupStreamComplete = window.api.onStreamComplete(handleStreamComplete);
        const cleanupStreamError = window.api.onStreamError(handleStreamError);
        
        listenersAttached.current = true;
        console.log('[REACT] Stream listener useEffect: Stream listeners ATTACHED.');

        return () => {
            console.log('[REACT] Stream listener useEffect: CLEANING UP listeners.');
            cleanupStreamData();
            cleanupStreamComplete();
            cleanupStreamError();
            listenersAttached.current = false;
        };
    } else {
        if (!config) console.log('[REACT] Stream listener useEffect: Not attaching, config is null.');
        else if (!config.stream) console.log('[REACT] Stream listener useEffect: Not attaching, config.stream is false.');
        else if (listenersAttached.current) console.log('[REACT] Stream listener useEffect: Not attaching, listeners already attached (this should not happen if logic is correct).');
    }
}, [config]);


    // Update the handleInputSubmit function to pass the complete NPC object to the backend instead of just the name
    const handleInputSubmit = async (e) => {
        e.preventDefault();
        console.log(`[REACT] handleInputSubmit: Entry. isStreaming=${isStreaming}, input="${input.trim().substring(0,20)}...", activeConversationId=${activeConversationId}, uploadedFiles=${uploadedFiles.length}`);

        if (isStreaming || (!input.trim() && uploadedFiles.length === 0) || !activeConversationId) {
            console.warn('[REACT] handleInputSubmit: Submission blocked.');
            return;
        }
    
        const currentInputVal = input; 
        const currentAttachmentsVal = [...uploadedFiles]; 
        const newStreamId = generateId();
        
        // Find the full NPC object to get its source (project or global)
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        console.log(`[REACT] Selected NPC:`, selectedNpc);
        
        console.log(`[REACT] handleInputSubmit: Setting streamIdRef.current to ${newStreamId}`);
        streamIdRef.current = newStreamId;
        
        console.log(`[REACT] handleInputSubmit: Calling setIsStreaming(true). Current isStreaming state before call: ${isStreaming}`);
        setIsStreaming(true);
    
        console.log(`[REACT] handleInputSubmit: Preparing to send stream ${newStreamId} for input: "${currentInputVal.substring(0,50)}..."`);
    
        try {
            const userMessage = {
                id: generateId(),
                role: 'user',
                content: currentInputVal,
                timestamp: new Date().toISOString(),
                attachments: currentAttachmentsVal.map(f => ({ name: f.name, type: f.type, size: f.size }))
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
                provider: currentProvider, 
                npc: currentNPC
            };
            
            // Update both message arrays for pagination
            setMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
            setAllMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
            setInput(''); 
            setUploadedFiles([]); 

            console.log(`[REACT] handleInputSubmit: Calling window.api.executeCommandStream with streamId ${newStreamId}. State updated for UI.`);
            
            // Send the NPC name and information about where it's stored (project or global)
            // This is what the backend needs to properly load the NPC file
            console.log('current model', currentModel, 'current provider', currentProvider)
            const result = await window.api.executeCommandStream({
                commandstr: currentInputVal,
                currentPath,
                conversationId: activeConversationId,
                model: currentModel,
                provider: currentProvider,
                npc: selectedNpc ? selectedNpc.name : currentNPC,
                npcSource: selectedNpc ? selectedNpc.source : 'global', // Either 'project' or 'global'
                attachments: currentAttachmentsVal.map(file => ({
                    name: file.name, path: file.path, size: file.size, type: file.type
                })),
                streamId: newStreamId
            });
    
            if (result && result.error) {
                console.error(`[REACT] handleInputSubmit: executeCommandStream returned an error immediately for streamId ${result.streamId || newStreamId}: ${result.error}`);
                throw new Error(result.error);
            } else if (result && result.streamId === newStreamId) {
                console.log(`[REACT] handleInputSubmit: executeCommandStream call acknowledged for streamId ${newStreamId}. Waiting for data...`);
            } else {
                console.warn(`[REACT] handleInputSubmit: executeCommandStream call returned unexpected result:`, result);
            }
    
        } catch (err) {
            console.error('[REACT] handleInputSubmit: CATCH block. Error:', err.message);
            if (streamIdRef.current === newStreamId) {
                 console.log(`[REACT] handleInputSubmit: CATCH block. Clearing streamIdRef for ${newStreamId}.`);
                 streamIdRef.current = null;
            }
            setIsStreaming(false); 
            
            setMessages(prev => {
                const msgIndex = prev.findIndex(m => m.id === newStreamId && m.role === 'assistant');
                if (msgIndex !== -1) {
                    const updatedMessages = [...prev];
                    updatedMessages[msgIndex] = {
                        ...updatedMessages[msgIndex],
                        content: (updatedMessages[msgIndex].content || '') + `\n[Error during submission: ${err.message}]`,
                        type: 'error',
                        streamId: null
                    };
                    return updatedMessages;
                }
                return [...prev, {
                    id: generateId(), role: 'assistant',
                    content: `[Error during submission: ${err.message}]`,
                    timestamp: new Date().toISOString(), type: 'error'
                }];
            });
        }
    };

    const handleInterruptStream = async () => {
        // Only proceed if currently streaming and have a stream ID
        if (isStreaming && streamIdRef.current) {
            const streamIdToInterrupt = streamIdRef.current; // Capture ID before clearing
            console.log(`[REACT] handleInterruptStream: Attempting to interrupt stream: ${streamIdToInterrupt}`);

            // --- IMMEDIATE UI UPDATE ---
            // Stop global streaming state FIRST for instant feedback
            setIsStreaming(false);
            // Clear the ref so new data for this ID is ignored even before API call finishes
            streamIdRef.current = null;
            // Update the specific message to indicate interruption
            setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === streamIdToInterrupt && m.role === 'assistant');
                if (msgIndex !== -1) {
                    newMessages[msgIndex] = {
                        ...newMessages[msgIndex],
                        content: (newMessages[msgIndex].content || '') + `\n\n[Stream Interrupted by User]`,
                        isStreaming: false, // Mark message as not streaming
                        streamId: null      // Clear streamId from message
                    };
                    console.log(`[REACT] handleInterruptStream: Updated message ${streamIdToInterrupt} UI for interruption.`);
                } else {
                    console.warn(`[REACT] handleInterruptStream: Placeholder message not found for interrupted stream ${streamIdToInterrupt}.`);
                }
                return newMessages;
            });
            // --- END IMMEDIATE UI UPDATE ---

            // --- Call Backend API ---
            try {
                await window.api.interruptStream(streamIdToInterrupt);
                console.log(`[REACT] handleInterruptStream: API call to interrupt stream ${streamIdToInterrupt} successful.`);
            } catch (error) {
                console.error(`[REACT] handleInterruptStream: API call to interrupt stream ${streamIdToInterrupt} failed:`, error);
                // Optionally update the message again to show interruption attempt failed
                setMessages(prev => prev.map(msg =>
                    msg.id === streamIdToInterrupt
                        ? { ...msg, content: msg.content + " [Interruption Attempt Failed]" }
                        : msg
                ));
            }
        } else {
            console.warn(`[REACT] handleInterruptStream: Called when not streaming or streamIdRef is null. isStreaming=${isStreaming}, streamIdRef=${streamIdRef.current}`);
        }
    };

    const handleSummarizeAndStart = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0) return;
        setContextMenuPos(null); // Close context menu

        try {
            // 1. Fetch and format conversation content
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
            
            // 2. Create the full prompt for the LLM
            const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');

            // 3. Create a new conversation for this operation
            const newConversation = await createNewConversation();
            if (!newConversation) {
                throw new Error('Failed to create a new conversation for the summary.');
            }

            // Set the new conversation as active
            setActiveConversationId(newConversation.id);
            setCurrentConversation(newConversation);
            setMessages([]);
            setAllMessages([]);
            setDisplayedMessageCount(10);

            // 4. Prepare for the streaming response
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
            
            // 5. Execute the streaming command
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
            setIsStreaming(false); // Reset streaming state on error
            streamIdRef.current = null;
        } finally {
            setSelectedConvos(new Set()); // Clear selection
        }
    };

    // --- Internal Render Functions ---
    const renderSidebar = () => (
        <div className="w-64 border-r theme-border flex flex-col flex-shrink-0 theme-sidebar">
            <div className="p-4 border-b theme-border flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold theme-text-primary">NPC Studio</span>
                <div className="flex gap-2">
                    <button onClick={() => setSettingsOpen(true)} className="p-2 theme-button theme-hover rounded-full transition-all" aria-label="Settings"><Settings size={14} /></button>
                    <button onClick={deleteSelectedConversations} className="p-2 theme-hover rounded-full transition-all" aria-label="Delete Selected Items"><Trash size={14} /></button>
                    
                    {/* New dropdown for creating various file types - matching the screenshot design */}
                    <div className="relative group">
                        <div className="flex">
                            <button onClick={createNewConversation} className="p-2 theme-button-primary rounded-full flex items-center gap-1 transition-all" aria-label="New Conversation">
                                <Plus size={14} />
                                <ChevronRight size={10} className="transform rotate-90 opacity-60" />
                            </button>
                        </div>
                        
                        {/* Dropdown menu - with hover persistence */}
                        <div className="absolute left-0 top-full mt-1 theme-bg-secondary border theme-border rounded shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible transition-all duration-150">
                            <button 
                                onClick={createNewConversation} 
                                className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs"
                            >
                                <MessageSquare size={12} />
                                <span>New Conversation</span>
                            </button>
                            <button 
                                onClick={createNewTextFile} 
                                className="flex items-center gap-2 px-3 py-1 w-full text-left theme-hover text-xs"
                            >
                                <FileText size={12} />
                                <span>New Text File</span>
                            </button>
                        </div>
                    </div>
                    
                    <button className="theme-toggle-btn p-1" onClick={toggleTheme}>{isDarkMode ? '🌙' : '☀️'}</button>
                </div>
            </div>
            <div className="p-2 border-b theme-border flex items-center gap-2 flex-shrink-0">
                <button onClick={goUpDirectory} className="p-2 theme-hover rounded-full transition-all" title="Go Up" aria-label="Go Up Directory"><ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "theme-text-secondary"}/></button>
                {isEditingPath ? (
                    <input type="text" value={editedPath} onChange={(e) => setEditedPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingPath(false); setCurrentPath(editedPath); loadDirectoryStructure(editedPath); } else if (e.key === 'Escape') { setIsEditingPath(false); } }} onBlur={() => setIsEditingPath(false)} autoFocus className="text-xs theme-text-muted theme-input border rounded px-2 py-1 flex-1"/>
                 ) : (
                    <div onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }} className="text-xs theme-text-muted overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer theme-hover px-2 py-1 rounded flex-1" title={currentPath}>
                        {currentPath || '...'}
                    </div>
                )}
            </div>
            
            {/* --- UPDATED SEARCH AREA --- */}
            <div className="p-2 border-b theme-border flex flex-col gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSearchSubmit();
                            }
                        }}
                        placeholder="Search messages (Ctrl+F)..."
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
                {/*
                <div className="flex items-center gap-2 px-1">
                    <input
                        type="checkbox"
                        id="global-search-checkbox"
                        checked={isGlobalSearch}
                        onChange={(e) => setIsGlobalSearch(e.target.checked)}
                        className="w-4 h-4 theme-checkbox"
                    />
                <label htmlFor="global-search-checkbox" className="text-xs theme-text-muted cursor-pointer select-none">
                        Search globally
                    </label>
                    
                </div>*/}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
                {loading ? (
                    <div className="p-4 theme-text-muted">Loading...</div>
                ) : isSearching ? (
                    // In search mode, ONLY show search results or the "no results" message
                    renderSearchResults()
                ) : (
                    // In normal mode, show the files and conversations
                    <>
                        {renderFolderList(folderStructure)}
                        {renderConversationList(directoryConversations)}
                    </>
                )}
                {/* The context menu can live outside the conditional rendering if needed */}
                {contextMenuPos && renderContextMenu()}
                {fileContextMenuPos && renderFileContextMenu()}
            </div>
            
            <div className="p-4 border-t theme-border flex-shrink-0">
                <div className="flex gap-2 justify-center">
                    <button onClick={handleImagesClick} className="p-2 theme-hover rounded-full transition-all" aria-label="View Images"><Image size={16} /></button>
                    <button onClick={handleScreenshotsClick} className="p-2 theme-hover rounded-full transition-all" aria-label="View Screenshots"><Camera size={16} /></button>
                    <button onClick={() => setJinxMenuOpen(true)} className="p-2 theme-hover rounded-full transition-all" aria-label="Open Jinx Menu"><Wrench size={16} /></button>
                    <button onClick={handleOpenNpcTeamMenu} className="p-2 theme-hover rounded-full transition-all" aria-label="Open NPC Team Menu"><Users size={16} /></button>
                </div>
            </div>
        </div>
    );

    const renderFolderList = (structure) => {
        if (!structure || typeof structure !== 'object' || structure.error) { return <div className="p-2 text-xs text-red-500">Error: {structure?.error || 'Failed to load'}</div>; }
        if (Object.keys(structure).length === 0) { return <div className="p-2 text-xs text-gray-500">Empty directory</div>; }
        
        // Section header with collapse toggle
        const header = (
            <div className="flex items-center justify-between px-4 py-2 mt-4">
                <div className="text-xs text-gray-500 font-medium">Files and Folders</div>
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
        );
        
        // If collapsed, we still show the active file (if any)
        if (filesCollapsed) {
            // Find the currently open file in the structure
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
                                className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded" title={`Edit ${activeFile.name}`}
                            >
                                {getFileIcon(activeFile.name)}
                                <span className="text-gray-300 truncate">{activeFile.name}</span>
                            </button>
                        </div>
                    )}
                </div>
            );
        }
 
        
        const entries = [];
        const sortedEntries = Object.entries(structure).sort(([nameA, contentA], [nameB, contentB]) => { 
            const typeA = contentA?.type; 
            const typeB = contentB?.type; 
            if (typeA === 'directory' && typeB !== 'directory') return -1; 
            if (typeA !== 'directory' && typeB === 'directory') return 1; 
            return nameA.localeCompare(nameB); 
        });
        
        sortedEntries.forEach(([name, content], index) => {
            const fullPath = content?.path; 
            const isFolder = content?.type === 'directory'; 
            const isFile = content?.type === 'file'; 
            if (!fullPath) return;
            if (isFolder) { entries.push(
                <div key={`folder-${fullPath}`}>
                    <button onDoubleClick={() => setCurrentPath(fullPath)} className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded" title={`Double-click to open ${name}`}>
                        <Folder size={16} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{name}</span>
                    </button>
                </div>
            );
            } else if (isFile) { 
                const fileIcon = getFileIcon(name); 
                const isActiveFile = currentFile === fullPath; // Highlight if this file is open
                const isSelected = selectedFiles.has(fullPath);
                
                // Get the actual file index (only counting files, not folders)
                const fileEntries = sortedEntries.filter(([, content]) => content?.type === 'file');
                const currentFileIndex = fileEntries.findIndex(([, content]) => content?.path === fullPath);
               
                entries.push(
                    <div key={`file-${fullPath}`}>
                        <button 
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                    // Ctrl+Click for multi-select
                                    const newSelected = new Set(selectedFiles);
                                    if (newSelected.has(fullPath)) {
                                        newSelected.delete(fullPath);
                                    } else {
                                        newSelected.add(fullPath);
                                    }
                                    setSelectedFiles(newSelected);
                                    setLastClickedFileIndex(currentFileIndex);
                                } else if (e.shiftKey && lastClickedFileIndex !== null) {
                                    // Shift+Click for range selection
                                    const newSelected = new Set();
                                    
                                    const start = Math.min(lastClickedFileIndex, currentFileIndex);
                                    const end = Math.max(lastClickedFileIndex, currentFileIndex);
                                    
                                    for (let i = start; i <= end; i++) {
                                        if (fileEntries[i]) {
                                            newSelected.add(fileEntries[i][1].path);
                                        }
                                    }
                                    setSelectedFiles(newSelected);
                                } else {
                                    // Regular click - clear other selections and open file
                                    setSelectedFiles(new Set([fullPath]));
                                    handleFileClick(fullPath);
                                    setLastClickedFileIndex(currentFileIndex);
                                }
                            }}
                            onContextMenu={(e) => handleFileContextMenu(e, fullPath)}
                            className={`flex items-center gap-2 px-2 py-1 w-full text-left rounded transition-all duration-200
                                ${isActiveFile ? 'conversation-selected border-l-2 border-blue-500' : 
                                  isSelected ? 'conversation-selected' : 'hover:bg-gray-800'}`} 
                            title={`Edit ${name}`}
                        >
                            {fileIcon}
                            <span className="text-gray-300 truncate">{name}</span>
                        </button>
                    </div>
                ); }
        });
        
        return (
            <div>
                {header}
                <div className="px-1">{entries}</div>
            </div>
        );
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
                                title={result.matches[0].snippet} // Show full snippet on hover
                            >
                                ...{result.matches[0].snippet}...
                                                       </div>
                        )}
                    </button>
                ))}
            </div>
        );
    };


    const renderConversationList = (conversations) => {
        if (!conversations?.length) return null;
        
        // Section header with collapse toggle and refresh button
        const header = (
            <div className="flex items-center justify-between px-4 py-2 mt-4">
                <div className="text-xs text-gray-500 font-medium">Conversations ({conversations.length})</div>
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
        
        // If collapsed, we still show the active conversation (if any)
        if (conversationsCollapsed) {
            const activeConversation = activeConversationId ? conversations.find(conv => conv.id === activeConversationId) : null;
            
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
        
        // Regular full list when not collapsed
        return (
            <div className="mt-4">
                {header}
                <div className="px-1">
                    {conversations.map((conv, index) => {
                        const isSelected = selectedConvos?.has(conv.id);
                        const isActive = conv.id === activeConversationId && !currentFile; // Only highlight if no file is open
                        const isLastClicked = lastClickedIndex === index;
                        
                        return (
                            <button
                                key={conv.id}
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
                                        // Shift + Click range selection
                                        const newSelected = new Set();
                                        const start = Math.min(lastClickedIndex, index);
                                        const end = Math.max(lastClickedIndex, index);
                                        for (let i = start; i <= end; i++) {
                                            if (conversations[i]) {
                                                newSelected.add(conversations[i].id);
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
            </div>
        )
    );

    const renderFileContextMenu = () => (
        fileContextMenuPos && (
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
        )
    );

    const renderFileEditor = () => {
        const fileName = currentFile ? currentFile.split('/').pop() : '';
        return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <div className="p-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                {isRenamingFile ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameFile();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setIsRenamingFile(false);
                                }
                            }}
                            className="text-sm bg-gray-900 text-gray-300 px-2 py-1 rounded border border-gray-700"
                            autoFocus
                        />
                        <button 
                            onClick={handleRenameFile}
                            className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
                        >
                            Save
                        </button>
                        <button 
                            onClick={() => setIsRenamingFile(false)}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300 truncate">{fileName}</span>
                        <button
                            onClick={() => {
                                setNewFileName(fileName);
                                setIsRenamingFile(true);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Rename file"
                        >
                            <Edit size={12} className="text-gray-400" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button 
                        onClick={handleFileSave} 
                        disabled={!fileChanged || isSaving} 
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                            !fileChanged || isSaving 
                            ? 'bg-gray-600 opacity-50 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-500'
                        }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">Close</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <textarea value={fileContent} onChange={(e) => handleFileContentChange(e.target.value)} className="w-full h-full bg-gray-900 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none"/>
            </div>
        </div>
        );
    };
    const renderChatView = () => (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary">
                <div>Active Conversation: {activeConversationId || 'None'}</div>
                <div>Messages Count: {messages.length}</div>
                <div>Current Path: {currentPath}</div>
    
                <div className="flex items-center gap-2">
                {messageSelectionMode && selectedMessages.size > 0 && (
                    <span className="text-blue-400 text-xs">
                        {selectedMessages.size} message{selectedMessages.size === 1 ? '' : 's'} selected
                    </span>
                )}
                <button
                    onClick={toggleMessageSelectionMode}
                    className={`px-3 py-1 rounded text-xs transition-all ${
                        messageSelectionMode
                            ? 'theme-button-primary'
                            : 'theme-button theme-hover'
                    }`}
                    title={messageSelectionMode ? 'Exit selection mode' : 'Enter selection mode'}
                >
                    <ListFilter size={14} className="inline mr-1" />
                    {messageSelectionMode ? 'Exit Select' : 'Select Messages'}
                </button>
            </div>
    
            </div>
    
            <div className="flex-1 overflow-y-auto space-y-4 p-4 theme-bg-primary">
                {/* Search Results Display */}
                {messageSearchResults.length > 0 && (
                    <div className="sticky top-0 z-10 theme-bg-secondary p-2 rounded-md border theme-border shadow-md mb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm theme-text-primary">
                                Found {messageSearchResults.length} result{messageSearchResults.length === 1 ? '' : 's'} for "{searchTerm}"
                            </span>
                            <button 
                                onClick={() => {
                                    setMessageSearchResults([]);
                                    setActiveSearchResult(null);
                                }}
                                className="theme-hover rounded-full p-1"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {messageSearchResults.map((result, index) => (
                                <button
                                    key={result.messageId}
                                    onClick={() => {
                                        setActiveSearchResult(result.messageId);
                                        const messageElement = document.getElementById(`message-${result.messageId}`);
                                        if (messageElement) {
                                            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }}
                                    className={`text-xs px-2 py-1 rounded ${
                                        activeSearchResult === result.messageId
                                            ? 'theme-button-primary'
                                            : 'theme-button theme-hover'
                                    }`}
                                >
                                    Result {index + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Prompt Modal Rendering */}
                {promptModal.isOpen && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
                        <div className="theme-bg-secondary p-6 theme-border border rounded-lg shadow-xl max-w-lg w-full">
                            <h3 className="text-lg font-medium mb-3 theme-text-primary">{promptModal.title}</h3>
                            <p className="theme-text-muted mb-4 text-sm">{promptModal.message}</p>
                            <textarea
                                className="w-full h-48 theme-input border rounded p-2 mb-4 font-mono text-sm"
                                defaultValue={promptModal.defaultValue}
                                id="promptInputModal"
                                autoFocus
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
                                        const value = document.getElementById('promptInputModal').value;
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
    
                {/* Message List with Lazy Loading */}
                {!activeConversationId ? (
                    <div className="flex items-center justify-center h-full theme-text-muted">
                        Select or create a conversation
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="text-center theme-text-muted pt-10">
                        No messages in this conversation
                    </div>
                ) : (
                    <>
                        {/* Load More Button - only shown if more than 10 messages */}
                        {allMessages.length > displayedMessageCount && (
                            <div className="flex justify-center mb-4">
                                <button
                                    onClick={async () => {
                                        setLoadingMoreMessages(true);
                                        try {
                                            // Simulate loading more messages
                                            await new Promise(resolve => setTimeout(resolve, 500));
    
                                            // Increase the count of displayed messages
                                            setDisplayedMessageCount(prev => prev + 10);
                                        } catch (err) {
                                            console.error('Error loading more messages:', err);
                                        } finally {
                                            setLoadingMoreMessages(false);
                                        }
                                    }} // This would be replaced with actual pagination logic
                                    className="px-4 py-2 theme-button theme-hover rounded-md text-sm"
                                >
                                    {loadingMoreMessages ? 'Loading...' : `Load Previous Messages (${allMessages.length - displayedMessageCount} more)`}
                                </button>
                            </div>
                        )}
    
                        {/* Only show the number of messages specified by displayedMessageCount */}
                        {allMessages.slice(-displayedMessageCount).map((message) => {
                            const messageId = message.id || message.timestamp;
                            return (
                                <ChatMessage
                                    key={messageId}
                                    message={message}
                                    isSelected={selectedMessages.has(messageId)}
                                    messageSelectionMode={messageSelectionMode}
                                    toggleMessageSelection={toggleMessageSelection}
                                    handleMessageContextMenu={handleMessageContextMenu}
                                    searchTerm={searchTerm}
                                    activeSearchResult={activeSearchResult}
                                />
                            );
                        })}

                    </>
                )}
            </div>
    
    
    
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
                 <div className="px-4 pt-2 flex gap-2 flex-wrap border-t theme-border max-h-28 overflow-y-auto theme-bg-secondary flex-shrink-0">
                    {uploadedFiles.map(file => (
                        <div key={file.id} className="relative flex-shrink-0 mb-2">
                            <img
                                src={file.preview || `file://${file.path}`} // Use file protocol for local paths if no preview
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded theme-border border"
                                // Add error handling for broken images if needed
                                onError={(e) => { e.target.style.display = 'none'; /* Hide broken image icon */ }}
                            />
                            <button
                                onClick={() => {
                                    setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                                    if (file.preview) URL.revokeObjectURL(file.preview);
                                }}
                                className="absolute -top-1 -right-1 theme-button-danger text-white rounded-full p-0.5 leading-none flex items-center justify-center w-4 h-4"
                                aria-label="Remove file"
                            >
                                <X size={10} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
    
            {renderInputArea()}
    
            {/* Message Context Menu */}
            {messageContextMenuPos && (
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: messageContextMenuPos.y, left: messageContextMenuPos.x }}
                    onMouseLeave={() => setMessageContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToMessages('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in New Conversation ({selectedMessages.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToCurrentConversation('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedMessages.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToMessages('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in New Conversation ({selectedMessages.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToCurrentConversation('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedMessages.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToMessages('extract')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Extract in New Conversation ({selectedMessages.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToCurrentConversation('extract')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Extract in Input Field ({selectedMessages.size})</span>
                    </button>
                </div>
            )}
            {/* File Context Menu */}
            {fileContextMenuPos && (
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
            )}
        </div>
    );


    const renderInputArea = () => (
        <div className="px-4 pt-2 pb-3 border-t theme-border theme-bg-secondary flex-shrink-0">
            <div
                className="relative theme-bg-primary theme-border border rounded-lg group"
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragEnter={() => setIsHovering(true)}
                onDragLeave={() => setIsHovering(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsHovering(false);
                    handleDrop(e);
                }}
            >
                {isHovering && (
                    <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-blue-300 font-semibold">Drop files here</span>
                    </div>
                )}

                {/* Form is still used for structure, but submit button is conditional */}
                <div className="flex items-end p-2 gap-2 relative z-0"> {/* Changed from form to div to avoid accidental submission while streaming */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                        multiple
                        accept="image/*, text/*, application/pdf, .py, .js, .jsx, .ts, .tsx, .html, .css, .json, .md"
                    />
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (!isStreaming && e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleInputSubmit(e); // Use form handler logic
                            }
                        }}
                        placeholder={isStreaming ? "Streaming response..." : "Type a message or drop files..."}
                        className={`flex-grow theme-input text-sm rounded-lg px-4 py-3 focus:outline-none border-0 min-h-[56px] max-h-[200px] resize-none ${isStreaming ? 'opacity-70 cursor-not-allowed' : ''}`}
                        rows={1}
                        style={{ overflowY: 'auto' }}
                        disabled={isStreaming} // Disable input while streaming
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover flex-shrink-0 ${isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Attach file"
                        disabled={isStreaming} // Disable attach while streaming
                    >
                        <Paperclip size={20} />
                    </button>

                    {/* Conditional Stop/Send Button */}
                    {isStreaming ? (
                        <button
                            type="button"
                            onClick={handleInterruptStream} // Call the interrupt handler
                            className="theme-button-danger text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 w-[76px] h-[40px]" // Fixed width/height for consistency
                            aria-label="Stop generating"
                            title="Stop generating"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                            </svg>
                        </button>
                    ) : (
                        <button
                            type="button" // Changed from submit since we handle via handleInputSubmit on Enter/Click
                            onClick={handleInputSubmit} // Call submit handler on click too
                            disabled={(!input.trim() && uploadedFiles.length === 0) || !activeConversationId}
                            className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-[76px] h-[40px]" // Fixed width/height
                        >
                            <Send size={16}/>
                        </button>
                    )}
                </div>

                {/* Model/NPC Selectors */}
                <div className={`flex items-center gap-2 px-2 pb-2 ${isStreaming ? 'opacity-50' : ''}`}>
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
                        disabled={modelsLoading || !!modelsError || isStreaming} // Disable while streaming
                    >
                        {modelsLoading && <option value="">Loading...</option>}
                        {modelsError && <option value="">Error</option>}
                        {!modelsLoading && !modelsError && availableModels.length === 0 && (<option value="">No models</option> )}
                        {!modelsLoading && !modelsError && availableModels.map(model => (<option key={model.value} value={model.value}>{model.display_name}</option>))}
                    </select>
                    <select
                        value={currentNPC || ''}
                        onChange={e => setCurrentNPC(e.target.value)}
                        className="theme-input text-xs rounded px-2 py-1 border flex-grow disabled:cursor-not-allowed"
                        disabled={npcsLoading || !!npcsError || isStreaming} // Disable while streaming
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
            </div>
        </div>
    );

    const renderMainContent = () => (
        <main className={`flex-1 flex flex-col bg-gray-900 ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}>
            {isEditing ? renderFileEditor() : renderChatView()}
        </main>
    );

    const renderModals = () => (
        <>
            <NPCTeamMenu isOpen={npcTeamMenuOpen} onClose={handleCloseNpcTeamMenu} currentPath={currentPath} startNewConversation={startNewConversationWithNpc}/>
            <JinxMenu isOpen={jinxMenuOpen} onClose={() => setJinxMenuOpen(false)} currentPath={currentPath}/>
            <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentPath={currentPath} onPathChange={(newPath) => { setCurrentPath(newPath); }}/>
            {isMacroInputOpen && (<MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({ macro, conversationId, result }) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }}/> )}
            <PhotoViewer isOpen={photoViewerOpen} onClose={() => setPhotoViewerOpen(false)} type={photoViewerType}/>
        </>
    );

    // --- NEW: Missing handler functions ---
    const handleOpenNpcTeamMenu = () => {
        setNpcTeamMenuOpen(true);
    };

    const handleCloseNpcTeamMenu = () => {
        setNpcTeamMenuOpen(false);
    };

    const handleSearchResultSelect = async (conversationId, searchTerm) => {
        // First, select the conversation. This will load its messages.
        await handleConversationSelect(conversationId);
        
        // After messages are loaded (handleConversationSelect is async),
        // we need to wait for the state to update. We use a short timeout
        // to allow React to re-render with the new messages.
        setTimeout(() => {
            // Access the latest messages from the state `allMessages`
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
                    
                    // Scroll to the first result
                    setTimeout(() => {
                        const messageElement = document.getElementById(`message-${firstResultId}`);
                        if (messageElement) {
                            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
                return currentMessages; // Return original messages, no change needed here
            });
        }, 100); // Small delay to ensure messages are in state
    };

    // --- Main Return uses the Render Functions ---
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
