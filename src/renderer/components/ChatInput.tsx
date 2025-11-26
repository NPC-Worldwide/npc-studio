import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Send, Paperclip, X, ChevronRight, ChevronDown, Star, ListFilter,
    MessageCircle, Wrench
} from 'lucide-react';

const ChatInput = (props: any) => {
    // Destructure all props from Enpistu
    const {
        // State
        input, inputRef, inputHeight, isResizingInput, availableModels, modelsLoading,
        modelsError, currentModel, currentProvider, availableNPCs, npcsLoading, npcsError,
        currentNPC, activeContentPaneId, contentDataRef, isStreaming, executionMode,
        rootLayoutNode, attachments, availableJinxs, favoriteModels, showAllModels,
        mcpServerPath, selectedMcpTools, ollamaToolModels,
        // Setters
        setInput, setInputHeight, setIsResizingInput, setCurrentModel, setCurrentProvider,
        setCurrentNPC, setExecutionMode, setAttachments, setFavoriteModels, setShowAllModels,
        setMcpServerPath, setSelectedMcpTools, setOllamaToolModels,
        // Functions
        handleInputSubmit, handleInterruptStream
    } = props;

const handleInputResize = useCallback((e) => {
    if (!isResizingInput) return;
    
    const newHeight = window.innerHeight - e.clientY;
    // Constrain between 100px and 600px
    if (newHeight >= 100 && newHeight <= 600) {
        setInputHeight(newHeight);
    }
}, [isResizingInput]);

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
    useEffect(() => {
        const savedFavorites = localStorage.getItem('npcStudioFavoriteModels');
        if (savedFavorites) {
            setFavoriteModels(new Set(JSON.parse(savedFavorites)));
        }
    }, []);

    useEffect(() => {
        // Fetch tool-capable Ollama models
        if (setOllamaToolModels) {
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
        }
    }, [setOllamaToolModels]);
    
    
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


    // Jinx favorites + filtering
    useEffect(() => {
        const savedJinxFavs = localStorage.getItem('npcStudioFavoriteJinxs');
        if (savedJinxFavs) {
            setFavoriteJinxs(new Set(JSON.parse(savedJinxFavs)));
        }
    }, []);

        const toggleFavoriteJinx = (jinxName) => {
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
                mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
                selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
            });
        }
    } catch (err) {
        setError(err.message);
        setIsStreaming(false);
        delete streamToPaneRef.current[newStreamId];
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

export default ChatInput;

