import React, { useCallback, useRef, useState } from 'react';
import { X, Plus, MessageSquare, Terminal, Globe, FileText, Image, Book, File, GripVertical, Folder } from 'lucide-react';

interface Tab {
    id: string;
    contentType: string;
    contentId: string;
    title?: string;
}

interface PaneTabBarProps {
    tabs: Tab[];
    activeTabIndex: number;
    onTabSelect: (index: number) => void;
    onTabClose: (index: number) => void;
    onTabAdd?: () => void;
    onTabReorder?: (fromIndex: number, toIndex: number) => void;
    onReceiveExternalTab?: (tab: Tab, insertIndex: number) => void;
    nodeId: string;
}

const getTabIcon = (contentType: string) => {
    switch (contentType) {
        case 'chat':
            return <MessageSquare size={12} className="text-blue-400" />;
        case 'terminal':
            return <Terminal size={12} className="text-green-400" />;
        case 'browser':
            return <Globe size={12} className="text-cyan-400" />;
        case 'pdf':
            return <FileText size={12} className="text-red-400" />;
        case 'epub':
            return <Book size={12} className="text-green-400" />;
        case 'image':
            return <Image size={12} className="text-purple-400" />;
        case 'editor':
            return <FileText size={12} className="text-gray-400" />;
        case 'folder':
            return <Folder size={12} className="text-yellow-400" />;
        default:
            return <File size={12} className="text-gray-400" />;
    }
};

const getTabTitle = (tab: Tab): string => {
    if (tab.title) return tab.title;

    switch (tab.contentType) {
        case 'chat':
            return `Chat ${tab.contentId?.slice(-6) || ''}`;
        case 'terminal':
            return 'Terminal';
        case 'browser':
            return 'Browser';
        case 'library':
            return 'Library';
        case 'photoviewer':
            return 'Photos';
        default:
            return tab.contentId?.split('/').pop() || 'Tab';
    }
};

export const PaneTabBar: React.FC<PaneTabBarProps> = ({
    tabs,
    activeTabIndex,
    onTabSelect,
    onTabClose,
    onTabAdd,
    onTabReorder,
    nodeId
}) => {
    const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);

    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `tab:${nodeId}:${index}`);
        setDraggedTabIndex(index);
    }, [nodeId]);

    const handleDragEnd = useCallback(() => {
        setDraggedTabIndex(null);
        setDragOverIndex(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedTabIndex !== null && draggedTabIndex !== index) {
            setDragOverIndex(index);
        }
    }, [draggedTabIndex]);

    const handleDrop = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedTabIndex !== null && onTabReorder) {
            onTabReorder(draggedTabIndex, index);
        }
        setDraggedTabIndex(null);
        setDragOverIndex(null);
    }, [draggedTabIndex, onTabReorder]);

    const handleTabClose = useCallback((e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        onTabClose(index);
    }, [onTabClose]);

    return (
        <div
            ref={tabBarRef}
            className="flex items-center gap-0.5 px-1 py-0.5 theme-bg-tertiary border-b theme-border overflow-x-auto"
            style={{ minHeight: '28px' }}
        >
            {tabs.map((tab, index) => (
                <div
                    key={tab.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => onTabSelect(index)}
                    className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-t text-xs cursor-pointer
                        transition-colors group relative flex-shrink-0 max-w-[150px]
                        ${index === activeTabIndex
                            ? 'bg-gray-800 text-white border-t border-l border-r theme-border'
                            : 'hover:bg-gray-700/50 text-gray-400'
                        }
                        ${dragOverIndex === index ? 'border-l-2 border-blue-500' : ''}
                        ${draggedTabIndex === index ? 'opacity-50' : ''}
                    `}
                >
                    {getTabIcon(tab.contentType)}
                    <span className="truncate">{getTabTitle(tab)}</span>
                    <button
                        onClick={(e) => handleTabClose(e, index)}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-opacity ml-auto"
                    >
                        <X size={10} />
                    </button>
                </div>
            ))}

            {onTabAdd && (
                <button
                    onClick={onTabAdd}
                    className="p-1 rounded hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                    title="New tab"
                >
                    <Plus size={14} />
                </button>
            )}
        </div>
    );
};

export default PaneTabBar;
