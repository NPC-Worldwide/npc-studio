import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

export const PaneHeader = React.memo(({
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
    onStartRename,
    isZenMode,
    onToggleZenMode
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

                    {onToggleZenMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleZenMode(nodeId);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`p-1 theme-hover rounded-full flex-shrink-0 transition-all ${isZenMode ? 'bg-blue-500/30 text-blue-400' : 'hover:bg-blue-500/20'}`}
                            aria-label={isZenMode ? "Exit zen mode" : "Enter zen mode"}
                            title={isZenMode ? "Exit zen mode (Esc)" : "Enter zen mode"}
                        >
                            {isZenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    )}

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

export default PaneHeader;
