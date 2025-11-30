import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Paperclip, Maximize2, ChevronDown, Star, ListFilter, FolderTree, Minimize2
} from 'lucide-react';
import ContextFilesPanel from './ContextFilesPanel';

interface ChatInputProps {
    paneId: string;
    // Input state
    input: string;
    setInput: (val: string) => void;
    inputHeight: number;
    setInputHeight: (val: number) => void;
    isInputMinimized: boolean;
    setIsInputMinimized: (val: boolean) => void;
    isInputExpanded: boolean;
    setIsInputExpanded: (val: boolean) => void;
    isResizingInput: boolean;
    setIsResizingInput: (val: boolean) => void;
    // Streaming
    isStreaming: boolean;
    handleInputSubmit: (e: any) => void;
    handleInterruptStream: () => void;
    // Files
    uploadedFiles: any[];
    setUploadedFiles: (fn: any) => void;
    contextFiles: any[];
    setContextFiles: (fn: any) => void;
    contextFilesCollapsed: boolean;
    setContextFilesCollapsed: (val: boolean) => void;
    currentPath: string;
    // Execution mode
    executionMode: string;
    setExecutionMode: (val: string) => void;
    selectedJinx: any;
    setSelectedJinx: (val: any) => void;
    jinxInputValues: any;
    setJinxInputValues: (fn: any) => void;
    jinxsToDisplay: any[];
    showJinxDropdown: boolean;
    setShowJinxDropdown: (val: boolean) => void;
    // Models
    availableModels: any[];
    modelsLoading: boolean;
    modelsError: any;
    currentModel: string;
    setCurrentModel: (val: string) => void;
    currentProvider: string;
    setCurrentProvider: (val: string) => void;
    favoriteModels: Set<string>;
    toggleFavoriteModel: (val: string) => void;
    showAllModels: boolean;
    setShowAllModels: (val: boolean) => void;
    modelsToDisplay: any[];
    ollamaToolModels: Set<string>;
    setError: (val: string) => void;
    // NPCs
    availableNPCs: any[];
    npcsLoading: boolean;
    npcsError: any;
    currentNPC: string;
    setCurrentNPC: (val: string) => void;
    // MCP
    availableMcpServers: any[];
    mcpServerPath: string;
    setMcpServerPath: (val: string) => void;
    selectedMcpTools: string[];
    setSelectedMcpTools: (fn: any) => void;
    availableMcpTools: any[];
    setAvailableMcpTools: (val: any[]) => void;
    mcpToolsLoading: boolean;
    setMcpToolsLoading: (val: boolean) => void;
    mcpToolsError: any;
    setMcpToolsError: (val: any) => void;
    showMcpServersDropdown: boolean;
    setShowMcpServersDropdown: (fn: any) => void;
    // Conversation
    activeConversationId: string | null;
    // Pane activation
    onFocus?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = (props) => {
    const {
        paneId,
        input, setInput, inputHeight, setInputHeight,
        isInputMinimized, setIsInputMinimized, isInputExpanded, setIsInputExpanded,
        isResizingInput, setIsResizingInput,
        isStreaming, handleInputSubmit, handleInterruptStream,
        uploadedFiles, setUploadedFiles, contextFiles, setContextFiles,
        contextFilesCollapsed, setContextFilesCollapsed, currentPath,
        executionMode, setExecutionMode, selectedJinx, setSelectedJinx,
        jinxInputValues, setJinxInputValues, jinxsToDisplay,
        showJinxDropdown, setShowJinxDropdown,
        availableModels, modelsLoading, modelsError, currentModel, setCurrentModel,
        currentProvider, setCurrentProvider, favoriteModels, toggleFavoriteModel,
        showAllModels, setShowAllModels, modelsToDisplay, ollamaToolModels, setError,
        availableNPCs, npcsLoading, npcsError, currentNPC, setCurrentNPC,
        availableMcpServers, mcpServerPath, setMcpServerPath,
        selectedMcpTools, setSelectedMcpTools, availableMcpTools, setAvailableMcpTools,
        mcpToolsLoading, setMcpToolsLoading, mcpToolsError, setMcpToolsError,
        showMcpServersDropdown, setShowMcpServersDropdown,
        activeConversationId, onFocus
    } = props;

    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isJinxMode = executionMode !== 'chat' && selectedJinx;
    const jinxInputsForSelected = isJinxMode ? (jinxInputValues[selectedJinx.name] || {}) : {};
    const hasJinxContent = isJinxMode && Object.values(jinxInputsForSelected).some((val: any) => val !== null && String(val).trim());
    const inputStr = typeof input === 'string' ? input : '';
    const hasContextFiles = contextFiles.length > 0;
    const hasInputContent = inputStr.trim() || uploadedFiles.length > 0 || hasJinxContent || hasContextFiles;
    const canSend = !isStreaming && hasInputContent && (activeConversationId || isJinxMode);

    // Resizing handler for input height within pane
    useEffect(() => {
        if (!isResizingInput) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.parentElement?.getBoundingClientRect();
            if (!containerRect) return;
            const newHeight = containerRect.bottom - e.clientY;
            if (newHeight >= 80 && newHeight <= 400) {
                setInputHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizingInput(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingInput, setInputHeight, setIsResizingInput]);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        const files = Array.from(e.dataTransfer.files);
        const existingNames = new Set(uploadedFiles.map((f: any) => f.name));
        const newFiles = files.filter(f => !existingNames.has(f.name));

        const attachments = await Promise.all(newFiles.map(async (file) => {
            return {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type,
                size: file.size,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
            };
        }));

        if (attachments.length > 0) {
            setUploadedFiles((prev: any[]) => [...prev, ...attachments]);
        }
    };

    const handleAttachFileClick = async () => {
        try {
            const fileData = await (window as any).api.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
            });
            if (fileData && fileData.length > 0) {
                const existingNames = new Set(uploadedFiles.map((f: any) => f.name));
                const newFiles = fileData.filter((file: any) => !existingNames.has(file.name));
                const attachments = newFiles.map((file: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.type,
                    path: file.path,
                    size: file.size,
                    preview: file.type?.startsWith('image/') ? `file://${file.path}` : null
                }));
                if (attachments.length > 0) {
                    setUploadedFiles((prev: any[]) => [...prev, ...attachments]);
                }
            }
        } catch (err) {
            console.error('Error selecting files:', err);
        }
    };

    const renderAttachmentThumbnails = () => {
        if (uploadedFiles.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 p-2 border-b theme-border">
                {uploadedFiles.map((file: any) => (
                    <div key={file.id} className="relative group">
                        {file.preview ? (
                            <img src={file.preview} alt={file.name} className="w-16 h-16 object-cover rounded border theme-border" />
                        ) : (
                            <div className="w-16 h-16 rounded border theme-border bg-gray-700 flex items-center justify-center text-xs text-gray-400 text-center p-1">
                                {file.name.split('.').pop()?.toUpperCase()}
                            </div>
                        )}
                        <button
                            onClick={() => setUploadedFiles((prev: any[]) => prev.filter((f: any) => f.id !== file.id))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 truncate rounded-b">
                            {file.name.length > 10 ? file.name.slice(0, 8) + '...' : file.name}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (isInputMinimized) {
        return (
            <div className="px-2 py-1 border-t theme-border theme-bg-secondary flex-shrink-0">
                <button
                    onClick={() => setIsInputMinimized(false)}
                    className="p-1 w-full theme-button theme-hover rounded transition-all group"
                    title="Expand input"
                >
                    <div className="flex items-center gap-1 justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rotate-180">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </div>
                </button>
            </div>
        );
    }

    if (isInputExpanded) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4">
                <div className="flex-1 flex flex-col theme-bg-primary theme-border border rounded-lg">
                    <div className="p-2 border-b theme-border flex justify-end">
                        <button onClick={() => setIsInputExpanded(false)} className="p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover">
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
                            placeholder={isStreaming ? "Streaming..." : "Type a message... (Ctrl+Enter to send)"}
                            className="w-full h-full theme-input text-base rounded-lg p-4 focus:outline-none border-0 resize-none bg-transparent"
                            disabled={isStreaming}
                            autoFocus
                        />
                    </div>
                    <div className="p-2 border-t theme-border flex items-center justify-end gap-2">
                        {isStreaming ? (
                            <button onClick={handleInterruptStream} className="theme-button-danger text-white rounded-lg px-4 py-2 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                                Stop
                            </button>
                        ) : (
                            <button onClick={(e) => { handleInputSubmit(e); setIsInputExpanded(false); }} disabled={!canSend} className="theme-button-success text-white rounded-lg px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-50">
                                <Send size={16}/> Send
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="border-t theme-border theme-bg-secondary flex-shrink-0 relative"
            style={{ height: `${inputHeight}px`, minHeight: '80px', maxHeight: '400px' }}
            onFocus={onFocus}
        >
            {/* Resize handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-10"
                onMouseDown={(e) => { e.preventDefault(); setIsResizingInput(true); }}
                style={{ backgroundColor: isResizingInput ? '#3b82f6' : 'transparent' }}
            />

            <div
                className="relative theme-bg-primary theme-border border rounded-lg group h-full flex flex-col m-2"
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
                    <ContextFilesPanel
                        isCollapsed={contextFilesCollapsed}
                        onToggleCollapse={() => setContextFilesCollapsed(!contextFilesCollapsed)}
                        contextFiles={contextFiles}
                        setContextFiles={setContextFiles}
                        currentPath={currentPath}
                    />
                    {renderAttachmentThumbnails()}

                    <div className="flex items-end p-2 gap-2">
                        <div className="flex-grow relative">
                            {isJinxMode ? (
                                <div className="flex flex-col gap-2 w-full">
                                    {selectedJinx.inputs?.map((rawInputDef: any, idx: number) => {
                                        const inputDef = typeof rawInputDef === 'string' ? { [rawInputDef]: "" } : rawInputDef;
                                        const inputName = Object.keys(inputDef)[0] || `input_${idx}`;
                                        const inputPlaceholder = inputDef[inputName] || '';
                                        const isTextArea = ['code', 'prompt', 'query', 'content', 'text', 'command'].includes(inputName.toLowerCase());

                                        return (
                                            <div key={`${selectedJinx.name}-${inputName}`} className="flex flex-col">
                                                <label className="text-xs theme-text-muted mb-1 capitalize">{inputName}:</label>
                                                {isTextArea ? (
                                                    <textarea
                                                        value={jinxInputValues[selectedJinx.name]?.[inputName] || ''}
                                                        onChange={(e) => setJinxInputValues((prev: any) => ({
                                                            ...prev,
                                                            [selectedJinx.name]: { ...prev[selectedJinx.name], [inputName]: e.target.value }
                                                        }))}
                                                        placeholder={inputPlaceholder || `Enter ${inputName}...`}
                                                        className="theme-input text-sm rounded px-2 py-1 border min-h-[40px] resize-vertical"
                                                        rows={2}
                                                        disabled={isStreaming}
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={jinxInputValues[selectedJinx.name]?.[inputName] || ''}
                                                        onChange={(e) => setJinxInputValues((prev: any) => ({
                                                            ...prev,
                                                            [selectedJinx.name]: { ...prev[selectedJinx.name], [inputName]: e.target.value }
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
                                    placeholder={isStreaming ? "Streaming..." : "Type a message..."}
                                    className={`w-full theme-input text-sm rounded-lg pl-3 pr-16 py-2 focus:outline-none border-0 resize-none ${isStreaming ? 'opacity-70' : ''}`}
                                    style={{ height: `${Math.max(40, inputHeight - 100)}px` }}
                                    disabled={isStreaming}
                                />
                            )}

                            <div className="absolute top-1 right-1 flex gap-1">
                                <button onClick={() => setIsInputMinimized(true)} className="p-1 theme-text-muted hover:theme-text-primary rounded theme-hover opacity-50 group-hover:opacity-100" title="Minimize">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                                </button>
                                <button onClick={() => setIsInputExpanded(true)} className="p-1 theme-text-muted hover:theme-text-primary rounded theme-hover opacity-50 group-hover:opacity-100" title="Expand">
                                    <Maximize2 size={12} />
                                </button>
                            </div>
                        </div>

                        <button onClick={handleAttachFileClick} disabled={isStreaming} className={`p-2 theme-text-muted hover:theme-text-primary rounded-lg theme-hover flex-shrink-0 ${isStreaming ? 'opacity-50' : ''}`}>
                            <Paperclip size={18} />
                        </button>

                        {isStreaming ? (
                            <button onClick={handleInterruptStream} className="theme-button-danger text-white rounded-lg px-3 py-2 text-sm flex items-center gap-1 flex-shrink-0">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>
                            </button>
                        ) : (
                            <button onClick={handleInputSubmit} disabled={!canSend} className="theme-button-success text-white rounded-lg px-3 py-2 text-sm flex items-center gap-1 flex-shrink-0 disabled:opacity-50">
                                <Send size={16}/>
                            </button>
                        )}
                    </div>
                </div>

                {/* MCP tools for tool_agent mode */}
                {executionMode === 'tool_agent' && (
                    <div className="px-2 pb-1 border-t theme-border">
                        <div className="relative w-1/2">
                            <button
                                className="theme-input text-xs w-full text-left px-2 py-1 flex items-center justify-between rounded border"
                                disabled={isStreaming || availableMcpServers.length === 0}
                                onClick={() => setShowMcpServersDropdown((p: boolean) => !p)}
                            >
                                <span className="truncate">{availableMcpServers.find((s: any) => s.serverPath === mcpServerPath)?.serverPath || 'Select MCP server'}</span>
                                <ChevronDown size={12} />
                            </button>
                            {showMcpServersDropdown && (
                                <div className="absolute z-50 w-full bottom-full mb-1 bg-black/90 border theme-border rounded shadow-lg max-h-56 overflow-y-auto">
                                    {availableMcpServers.map((srv: any) => (
                                        <div key={srv.serverPath} className="border-b theme-border last:border-b-0">
                                            <div
                                                className="px-2 py-1 text-xs theme-hover cursor-pointer"
                                                onClick={() => {
                                                    setMcpServerPath(srv.serverPath);
                                                    setSelectedMcpTools([]);
                                                    setMcpToolsLoading(true);
                                                    (window as any).api.listMcpTools({ serverPath: srv.serverPath, currentPath }).then((res: any) => {
                                                        setMcpToolsLoading(false);
                                                        if (res.error) {
                                                            setMcpToolsError(res.error);
                                                            setAvailableMcpTools([]);
                                                        } else {
                                                            setMcpToolsError(null);
                                                            setAvailableMcpTools(res.tools || []);
                                                        }
                                                    });
                                                }}
                                            >
                                                {srv.serverPath}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom controls */}
                <div className={`flex items-center gap-2 px-2 pb-2 border-t theme-border ${isStreaming ? 'opacity-50' : ''}`}>
                    {/* Mode selector */}
                    <div className="relative min-w-[140px]">
                        <button
                            className="theme-input text-xs rounded px-2 py-1 border w-full flex items-center justify-between"
                            disabled={isStreaming}
                            onClick={() => setShowJinxDropdown(!showJinxDropdown)}
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
                                <div className="px-2 py-1 text-xs theme-hover cursor-pointer" onClick={() => { setExecutionMode('chat'); setSelectedJinx(null); setShowJinxDropdown(false); }}>
                                    💬 Chat
                                </div>
                                <div className="px-2 py-1 text-xs theme-hover cursor-pointer" onClick={() => {
                                    const modelObj = availableModels.find((m: any) => m.value === currentModel);
                                    const provider = modelObj?.provider || currentProvider;
                                    const toolCapable = provider !== 'ollama' || ollamaToolModels.has(currentModel);
                                    if (!toolCapable) { setError('Model does not support tools'); setShowJinxDropdown(false); return; }
                                    setExecutionMode('tool_agent'); setSelectedJinx(null); setShowJinxDropdown(false);
                                }}>
                                    🛠 Agent
                                </div>
                                {['project', 'global'].map(origin => {
                                    const originJinxs = jinxsToDisplay.filter((j: any) => (j.origin || 'unknown') === origin);
                                    if (!originJinxs.length) return null;
                                    const grouped = originJinxs.reduce((acc: any, j: any) => {
                                        const g = j.group || 'root';
                                        if (!acc[g]) acc[g] = [];
                                        acc[g].push(j);
                                        return acc;
                                    }, {});
                                    return (
                                        <div key={origin} className="border-t theme-border">
                                            <div className="px-2 py-1 text-[10px] uppercase theme-text-muted">{origin === 'project' ? 'Project' : 'Global'}</div>
                                            {Object.entries(grouped).filter(([g]) => g.toLowerCase() !== 'modes').map(([gName, jinxs]: [string, any]) => (
                                                <details key={`${origin}-${gName}`} className="px-2">
                                                    <summary className="text-xs theme-text-primary cursor-pointer py-1 flex items-center gap-1">
                                                        <FolderTree size={10}/> {gName}
                                                    </summary>
                                                    <div className="pl-3 pb-1 flex flex-col gap-1">
                                                        {jinxs.map((jinx: any) => (
                                                            <div key={jinx.name} className="text-xs theme-hover cursor-pointer" onClick={() => { setExecutionMode(jinx.name); setSelectedJinx(jinx); setShowJinxDropdown(false); }}>
                                                                {jinx.name}
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

                    {/* Model selector */}
                    <div className="flex-grow flex items-center gap-1">
                        <select
                            value={currentModel || ''}
                            onChange={(e) => {
                                const model = availableModels.find((m: any) => m.value === e.target.value);
                                setCurrentModel(e.target.value);
                                if (model?.provider) setCurrentProvider(model.provider);
                            }}
                            className="theme-input text-xs rounded px-2 py-1 border flex-grow"
                            disabled={modelsLoading || !!modelsError || isStreaming}
                        >
                            {modelsLoading && <option value="">Loading...</option>}
                            {modelsError && <option value="">Error</option>}
                            {!modelsLoading && !modelsError && modelsToDisplay.map((m: any) => (
                                <option key={m.value} value={m.value}>{m.display_name}</option>
                            ))}
                        </select>
                        <button onClick={() => toggleFavoriteModel(currentModel)} className={`p-1 rounded ${favoriteModels.has(currentModel) ? 'text-yellow-400' : 'theme-text-muted hover:text-yellow-400'}`} disabled={!currentModel}>
                            <Star size={12}/>
                        </button>
                        <button onClick={() => setShowAllModels(!showAllModels)} className="p-1 theme-hover rounded theme-text-muted" disabled={favoriteModels.size === 0}>
                            <ListFilter size={12} className={favoriteModels.size === 0 ? 'opacity-30' : ''} />
                        </button>
                    </div>

                    {/* NPC selector */}
                    <select
                        value={currentNPC || ''}
                        onChange={e => setCurrentNPC(e.target.value)}
                        className="theme-input text-xs rounded px-2 py-1 border flex-grow"
                        disabled={npcsLoading || !!npcsError || isStreaming}
                    >
                        {npcsLoading && <option value="">Loading...</option>}
                        {npcsError && <option value="">Error</option>}
                        {!npcsLoading && !npcsError && availableNPCs.map((npc: any) => (
                            <option key={`${npc.source}-${npc.value}`} value={npc.value}>{npc.display_name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default ChatInput;
