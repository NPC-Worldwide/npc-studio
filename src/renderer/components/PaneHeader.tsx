import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Check, Play, Plus, MessageSquare, Terminal, Globe, BookOpen, FileText } from 'lucide-react';

export const PaneHeader = React.memo(({
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
    onStartRename,
    isZenMode,
    onToggleZenMode,
    isRenaming,
    editedFileName,
    setEditedFileName,
    onConfirmRename,
    onCancelRename,
    filePath,
    onRunScript,
    onAddTab,
    hasMultipleTabs
}) => {
    const isPythonFile = filePath?.endsWith('.py');
    const nodePath = findNodePath(rootLayoutNode, nodeId);
    const inputRef = useRef(null);
    const [showAddTabMenu, setShowAddTabMenu] = useState(false);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirmRename?.();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancelRename?.();
        }
    }, [onConfirmRename, onCancelRename]);

    return (
        <div
            draggable={!isRenaming}
            onDragStart={(e) => {
                if (isRenaming) {
                    e.preventDefault();
                    return;
                }
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
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                minHeight: '32px',
                borderBottom: '1px solid var(--border-color, #374151)',
                fontSize: '12px',
                flexShrink: 0,
                cursor: 'move',
                boxSizing: 'border-box'
            }}
            className="theme-bg-secondary theme-border theme-text-muted"
        >
            {/* Content - can shrink */}
            <div style={{ flex: '1 1 0', width: 0, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px' }}>
                <span style={{ flexShrink: 0 }}>{icon}</span>

                {isRenaming && filePath ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={editedFileName}
                            onChange={(e) => setEditedFileName?.(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => onCancelRename?.()}
                            className="px-1 py-0.5 text-xs theme-bg-tertiary theme-border border rounded outline-none focus:ring-1 focus:ring-blue-500"
                            style={{ width: '120px' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); onConfirmRename?.(); }}
                            onMouseDown={(e) => e.preventDefault()}
                            className="p-0.5 theme-hover rounded text-green-400"
                        >
                            <Check size={12} />
                        </button>
                    </div>
                ) : (
                    <span
                        style={{
                            flex: '0 1 auto',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 600
                        }}
                        title={filePath ? `Double-click to rename: ${title}` : title}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onStartRename && filePath) onStartRename();
                        }}
                    >
                        {title}{fileChanged ? ' *' : ''}
                    </span>
                )}

                {/* Buttons area - can shrink and hide */}
                <div style={{ flex: '1 1 0', width: 0, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    {children}

                    {onAddTab && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowAddTabMenu(!showAddTabMenu); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1 theme-hover rounded-full"
                                title="Add new tab"
                            >
                                <Plus size={14} className="text-blue-400" />
                            </button>
                            {showAddTabMenu && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowAddTabMenu(false)} />
                                    <div className="absolute right-0 top-full mt-1 theme-bg-secondary border theme-border rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                                        <button onClick={(e) => { e.stopPropagation(); onAddTab('chat'); setShowAddTabMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left">
                                            <MessageSquare size={12} className="text-blue-400" /> Chat
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onAddTab('terminal'); setShowAddTabMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left">
                                            <Terminal size={12} className="text-green-400" /> Terminal
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onAddTab('browser'); setShowAddTabMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left">
                                            <Globe size={12} className="text-cyan-400" /> Browser
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onAddTab('library'); setShowAddTabMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left">
                                            <BookOpen size={12} className="text-red-400" /> Library
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {isPythonFile && onRunScript && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRunScript(filePath); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-1 theme-hover rounded-full"
                            title="Run Python script"
                            style={{ flexShrink: 0 }}
                        >
                            <Play size={14} className="text-green-400" />
                        </button>
                    )}

                    {onToggleZenMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleZenMode(nodeId); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`p-1 theme-hover rounded-full ${isZenMode ? 'bg-blue-500/30 text-blue-400' : ''}`}
                            title={isZenMode ? "Exit zen mode (Esc)" : "Enter zen mode"}
                            style={{ flexShrink: 0 }}
                        >
                            {isZenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
});

export default PaneHeader;
