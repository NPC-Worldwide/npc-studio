import React from 'react';
import {
    Folder, MessageSquare, Terminal, Globe, FileText, File as FileIcon,
    BrainCircuit, ArrowDown
} from 'lucide-react';

interface PaneItem {
    id: string;
    type: string;
    title: string;
    isActive: boolean;
}

interface StatusBarProps {
    // Git
    gitBranch: string | null;
    gitStatus: any;
    setGitModalOpen: (open: boolean) => void;
    // Workspace
    directoryConversations: any[];
    setWorkspaceModalOpen: (open: boolean) => void;
    // Panes
    paneItems: PaneItem[];
    setActiveContentPaneId: (id: string) => void;
    // Toggles
    autoScrollEnabled: boolean;
    setAutoScrollEnabled: (enabled: boolean) => void;
    isPredictiveTextEnabled: boolean;
    setIsPredictiveTextEnabled: (enabled: boolean) => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
    gitBranch,
    gitStatus,
    setGitModalOpen,
    directoryConversations,
    setWorkspaceModalOpen,
    paneItems,
    setActiveContentPaneId,
    autoScrollEnabled,
    setAutoScrollEnabled,
    isPredictiveTextEnabled,
    setIsPredictiveTextEnabled,
}) => {
    return (
        <div className="h-6 flex-shrink-0 theme-bg-tertiary border-t theme-border flex items-center px-2 text-[10px] theme-text-muted gap-2">
            {/* Git button */}
            <button
                onClick={() => setGitModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${gitBranch ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' : 'theme-hover'}`}
                title="Git"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="6" y1="3" x2="6" y2="15"></line>
                    <circle cx="18" cy="6" r="3"></circle>
                    <circle cx="6" cy="18" r="3"></circle>
                    <path d="M18 9a9 9 0 0 1-9 9"></path>
                </svg>
                {gitBranch && <span className="truncate max-w-[80px]">{gitBranch}</span>}
                {gitStatus?.hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>}
            </button>

            {/* Workspace button */}
            <button
                onClick={() => setWorkspaceModalOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded theme-hover"
                title="Workspace Info"
            >
                <Folder size={12} />
                <span className="opacity-60">{directoryConversations.length} convos</span>
            </button>

            <div className="flex-1" />

            {/* Pane Dock - centered */}
            <div className="flex items-center gap-1">
                {paneItems.map((pane) => (
                    <button
                        key={pane.id}
                        onClick={() => setActiveContentPaneId(pane.id)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-all flex items-center gap-1 ${
                            pane.isActive
                                ? 'bg-blue-600 text-white'
                                : 'theme-hover theme-text-muted hover:text-white'
                        }`}
                        title={pane.title}
                    >
                        {pane.type === 'chat' && <MessageSquare size={10} />}
                        {pane.type === 'editor' && <FileIcon size={10} />}
                        {pane.type === 'terminal' && <Terminal size={10} />}
                        {pane.type === 'browser' && <Globe size={10} />}
                        {pane.type === 'pdf' && <FileText size={10} />}
                        {!['chat', 'editor', 'terminal', 'browser', 'pdf'].includes(pane.type) && <FileIcon size={10} />}
                        <span className="truncate max-w-[60px]">{pane.title}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Right side - Auto-scroll and Predictive text toggles */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                    className={`p-1 rounded flex items-center gap-1 text-[10px] ${
                        autoScrollEnabled
                            ? 'bg-blue-600/30 text-blue-400 hover:bg-blue-600/50'
                            : 'theme-hover theme-text-muted'
                    }`}
                    title={autoScrollEnabled ? "Disable Auto-scroll" : "Enable Auto-scroll"}
                >
                    <ArrowDown size={12} />
                    <span className="hidden sm:inline">Scroll</span>
                </button>
                <button
                    onClick={() => setIsPredictiveTextEnabled(!isPredictiveTextEnabled)}
                    className={`p-1 rounded flex items-center gap-1 text-[10px] ${
                        isPredictiveTextEnabled
                            ? 'bg-purple-600/30 text-purple-400 hover:bg-purple-600/50'
                            : 'theme-hover theme-text-muted'
                    }`}
                    title={isPredictiveTextEnabled ? "Disable Predictive Text" : "Enable Predictive Text"}
                >
                    <BrainCircuit size={12} />
                    <span className="hidden sm:inline">AI</span>
                </button>
            </div>
        </div>
    );
};

export default StatusBar;
