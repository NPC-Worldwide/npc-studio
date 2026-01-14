import React from 'react';
import {
    MessageSquare, Terminal, Globe, FileText, File as FileIcon,
    BrainCircuit, Database, Clock, Bot, Zap
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
    createGitPane?: () => void;
    // Panes
    paneItems: PaneItem[];
    setActiveContentPaneId: (id: string) => void;
    // Toggles
    isPredictiveTextEnabled: boolean;
    setIsPredictiveTextEnabled: (enabled: boolean) => void;
    // Memory
    pendingMemoryCount?: number;
    createMemoryManagerPane?: () => void;
    // Knowledge Graph
    kgGeneration?: number | null;
    kgScheduleEnabled?: boolean;
    createGraphViewerPane?: () => void;
    // NPCs and Jinxs
    createNPCTeamPane?: () => void;
    createJinxPane?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
    gitBranch,
    gitStatus,
    setGitModalOpen,
    createGitPane,
    paneItems,
    setActiveContentPaneId,
    isPredictiveTextEnabled,
    setIsPredictiveTextEnabled,
    pendingMemoryCount = 0,
    createMemoryManagerPane,
    kgGeneration,
    kgScheduleEnabled = false,
    createGraphViewerPane,
    createNPCTeamPane,
    createJinxPane,
}) => {
    return (
        <div className="h-10 flex-shrink-0 theme-bg-tertiary border-t theme-border flex items-center px-3 text-[12px] theme-text-muted gap-2">
            {/* Left side - 3 buttons */}
            {/* Git button */}
            <button
                onClick={() => createGitPane ? createGitPane() : setGitModalOpen(true)}
                className={`p-1.5 rounded transition-all flex items-center gap-1 ${gitBranch ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' : 'theme-hover'}`}
                title={gitBranch ? `Git: ${gitBranch}` : "Git"}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="6" y1="3" x2="6" y2="15"></line>
                    <circle cx="18" cy="6" r="3"></circle>
                    <circle cx="6" cy="18" r="3"></circle>
                    <path d="M18 9a9 9 0 0 1-9 9"></path>
                </svg>
                {gitStatus?.hasChanges && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>}
            </button>

            {/* Memory button */}
            <button
                onClick={() => createMemoryManagerPane?.()}
                className="p-1.5 rounded flex items-center gap-1 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 transition-all"
                title={pendingMemoryCount > 0 ? `Memory: ${pendingMemoryCount} pending` : "Memory Manager"}
            >
                <Database size={20} />
                {pendingMemoryCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>}
            </button>

            {/* KG button */}
            <button
                onClick={() => createGraphViewerPane?.()}
                className="p-1.5 rounded flex items-center gap-1 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-all"
                title={kgGeneration !== null && kgGeneration !== undefined ? `Knowledge Graph (Gen ${kgGeneration})` : "Knowledge Graph"}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="8" r="2.5" />
                    <circle cx="18" cy="6" r="2" />
                    <circle cx="12" cy="14" r="3" />
                    <circle cx="5" cy="18" r="2" />
                    <circle cx="19" cy="17" r="2.5" />
                    <line x1="8" y1="9" x2="10" y2="12" />
                    <line x1="16" y1="7" x2="14" y2="12" />
                    <line x1="7" y1="17" x2="9.5" y2="15.5" />
                    <line x1="14.5" y1="15.5" x2="17" y2="16" />
                    <line x1="7" y1="10" x2="5" y2="16" />
                </svg>
                {kgScheduleEnabled && <Clock size={16} className="text-emerald-400" />}
            </button>

            <div className="flex-1" />

            {/* Pane Dock - centered */}
            <div className="flex items-center gap-1">
                {paneItems.map((pane) => (
                    <button
                        key={pane.id}
                        onClick={() => setActiveContentPaneId(pane.id)}
                        className={`p-1.5 rounded transition-all ${
                            pane.isActive
                                ? 'bg-blue-600 text-white'
                                : 'theme-hover theme-text-muted hover:text-white'
                        }`}
                        title={pane.title}
                    >
                        {pane.type === 'chat' && <MessageSquare size={20} />}
                        {pane.type === 'editor' && <FileIcon size={20} />}
                        {pane.type === 'terminal' && <Terminal size={20} />}
                        {pane.type === 'browser' && <Globe size={20} />}
                        {pane.type === 'pdf' && <FileText size={20} />}
                        {!['chat', 'editor', 'terminal', 'browser', 'pdf'].includes(pane.type) && <FileIcon size={20} />}
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Right side - 3 buttons */}
            <div className="flex items-center gap-1">
                {/* AI/Predictive Text button */}
                <button
                    onClick={() => setIsPredictiveTextEnabled(!isPredictiveTextEnabled)}
                    className={`p-1.5 rounded ${
                        isPredictiveTextEnabled
                            ? 'bg-purple-600/30 text-purple-400 hover:bg-purple-600/50'
                            : 'theme-hover theme-text-muted'
                    }`}
                    title={isPredictiveTextEnabled ? "Predictive Text: ON" : "Predictive Text: OFF"}
                >
                    <BrainCircuit size={20} />
                </button>

                {/* NPCs button */}
                <button
                    onClick={() => createNPCTeamPane?.()}
                    className="p-1.5 rounded bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/50"
                    title="NPCs"
                >
                    <Bot size={20} />
                </button>

                {/* Jinxs button */}
                <button
                    onClick={() => createJinxPane?.()}
                    className="p-1.5 rounded bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50"
                    title="Jinxs"
                >
                    <Zap size={20} />
                </button>
            </div>
        </div>
    );
};

export default StatusBar;
