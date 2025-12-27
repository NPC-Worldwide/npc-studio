import React, { useCallback, useRef, useState } from 'react';
import {
    X, Plus, MessageSquare, Terminal, Globe, FileText, Image, Book, File, GripVertical, Folder,
    Database, Zap, Users, Settings, Images, BookOpen, FolderCog, HardDrive, Tags, Network,
    LayoutDashboard, Share2, Brain, Table, Bot
} from 'lucide-react';

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
            return <Globe size={12} className="text-blue-400" />;
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
        case 'dbtool':
            return <Database size={12} className="text-cyan-400" />;
        case 'jinx':
            return <Zap size={12} className="text-yellow-400" />;
        case 'npcteam':
            return <Bot size={12} className="text-purple-400" />;
        case 'teammanagement':
            return <Users size={12} className="text-indigo-400" />;
        case 'settings':
            return <Settings size={12} className="text-gray-400" />;
        case 'photoviewer':
            return <Images size={12} className="text-pink-400" />;
        case 'library':
            return <BookOpen size={12} className="text-amber-400" />;
        case 'projectenv':
            return <FolderCog size={12} className="text-orange-400" />;
        case 'diskusage':
            return <HardDrive size={12} className="text-slate-400" />;
        case 'data-labeler':
            return <Tags size={12} className="text-teal-400" />;
        case 'graph-viewer':
            return <Network size={12} className="text-violet-400" />;
        case 'browsergraph':
            return <Share2 size={12} className="text-sky-400" />;
        case 'datadash':
            return <LayoutDashboard size={12} className="text-emerald-400" />;
        case 'mindmap':
            return <Brain size={12} className="text-rose-400" />;
        case 'markdown-preview':
            return <FileText size={12} className="text-blue-400" />;
        case 'csv':
            return <Table size={12} className="text-green-400" />;
        case 'latex':
            return <FileText size={12} className="text-teal-400" />;
        case 'docx':
            return <FileText size={12} className="text-blue-500" />;
        case 'pptx':
            return <FileText size={12} className="text-orange-500" />;
        case 'zip':
            return <File size={12} className="text-yellow-500" />;
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
        case 'dbtool':
            return 'Database Tool';
        case 'jinx':
            return 'Jinx Manager';
        case 'npcteam':
            return 'NPC Team';
        case 'teammanagement':
            return 'Team Management';
        case 'settings':
            return 'Settings';
        case 'photoviewer':
            return 'Photo Gallery';
        case 'library':
            return 'Library';
        case 'projectenv':
            return 'Project Environment';
        case 'diskusage':
            return 'Disk Usage';
        case 'data-labeler':
            return 'Data Labeler';
        case 'graph-viewer':
            return 'Graph Viewer';
        case 'browsergraph':
            return 'Browser Graph';
        case 'datadash':
            return 'Data Dashboard';
        case 'mindmap':
            return 'Mind Map';
        case 'markdown-preview':
            return `Preview: ${tab.contentId?.split('/').pop() || 'Markdown'}`;
        case 'pdf':
            return tab.contentId?.split('/').pop() || 'PDF';
        case 'csv':
            return tab.contentId?.split('/').pop() || 'CSV';
        case 'latex':
            return tab.contentId?.split('/').pop() || 'LaTeX';
        case 'docx':
            return tab.contentId?.split('/').pop() || 'Document';
        case 'pptx':
            return tab.contentId?.split('/').pop() || 'Presentation';
        case 'zip':
            return tab.contentId?.split('/').pop() || 'Archive';
        case 'image':
            return tab.contentId?.split('/').pop() || 'Image';
        case 'folder':
            return tab.contentId?.split('/').pop() || 'Folder';
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
