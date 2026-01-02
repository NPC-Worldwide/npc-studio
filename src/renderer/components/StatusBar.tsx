import React, { useState } from 'react';
import {
    Folder, MessageSquare, Terminal, Globe, FileText, File as FileIcon,
    BrainCircuit, ArrowDown, HelpCircle, Keyboard, X
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

            {/* Right side - Auto-scroll, Predictive text, and Help */}
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
                <HelpButton />
            </div>
        </div>
    );
};

// Help button with popup
const HelpButton: React.FC = () => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setShowHelp(!showHelp)}
                className={`p-1 rounded flex items-center gap-1 text-[10px] ${
                    showHelp
                        ? 'bg-cyan-600/30 text-cyan-400 hover:bg-cyan-600/50'
                        : 'theme-hover theme-text-muted'
                }`}
                title="Help & Shortcuts"
            >
                <HelpCircle size={12} />
            </button>
            {showHelp && (
                <div className="absolute z-50 right-0 bottom-full mb-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden w-[420px]">
                    <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
                        <span className="text-xs font-medium text-cyan-300 flex items-center gap-1.5"><HelpCircle size={12} /> NPC Studio Help</span>
                        <button onClick={() => setShowHelp(false)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
                    </div>
                    <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
                        {/* Shortcuts */}
                        <div>
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5 flex items-center gap-1"><Keyboard size={10} /> Keyboard Shortcuts</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400">
                                <div className="flex justify-between"><span>Send message</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Enter</kbd></div>
                                <div className="flex justify-between"><span>New line</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Shift+Enter</kbd></div>
                                <div className="flex justify-between"><span>New conversation</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+N</kbd></div>
                                <div className="flex justify-between"><span>New terminal</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+`</kbd></div>
                                <div className="flex justify-between"><span>Toggle sidebar</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+B</kbd></div>
                                <div className="flex justify-between"><span>Command palette</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+Shift+P</kbd></div>
                                <div className="flex justify-between"><span>Split pane</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+\\</kbd></div>
                                <div className="flex justify-between"><span>Close pane</span><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Ctrl+W</kbd></div>
                            </div>
                        </div>

                        {/* Modes */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Execution Modes</div>
                            <div className="space-y-1.5 text-gray-400">
                                <div><span className="text-cyan-400 font-medium">💬 Chat</span> - Standard AI conversation with your selected model & NPC</div>
                                <div><span className="text-amber-400 font-medium">🛠 Agent</span> - AI with MCP tool access for code execution, file ops, web browsing</div>
                                <div><span className="text-purple-400 font-medium">⚡ Jinx</span> - Run predefined YAML workflows with custom inputs</div>
                            </div>
                        </div>

                        {/* Panes & Layout */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Panes & Layout</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-blue-400">Split panes</span> horizontally/vertically for multi-tasking</div>
                                <div>• <span className="text-blue-400">Pane types:</span> Chat, Terminal, File Editor, Browser, Notebook, PDF, Images</div>
                                <div>• Drag pane headers to rearrange, click X to close</div>
                                <div>• Use status bar tabs to quickly switch between panes</div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Sidebar Sections</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-green-400">Conversations</span> - Chat history, searchable, click to open</div>
                                <div>• <span className="text-yellow-400">Files</span> - Project file browser, open any file type</div>
                                <div>• <span className="text-purple-400">Websites</span> - Saved web pages and bookmarks</div>
                            </div>
                        </div>

                        {/* NPCs & Teams */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">NPCs & Teams</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-green-400">NPCs</span> are AI personalities with custom system prompts</div>
                                <div>• Create/edit NPCs in the Team Management menu</div>
                                <div>• <span className="text-blue-400">Multi-select</span> models & NPCs to broadcast to multiple</div>
                                <div>• NPCs can be project-local (📁) or global (🌐)</div>
                            </div>
                        </div>

                        {/* Jinxs */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Jinxs (Workflows)</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• YAML-defined workflows with inputs and steps</div>
                                <div>• Type <code className="px-1 bg-white/10 rounded">/name</code> to quick-load any jinx</div>
                                <div>• Inputs with defaults appear in Settings dropdown</div>
                                <div>• Required inputs appear in the form below</div>
                                <div>• Create jinxs in <code className="px-1 bg-white/10 rounded">~/.npcsh/npc_team/jinxs/</code></div>
                            </div>
                        </div>

                        {/* Context & Files */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Context & Attachments</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-blue-400">Context files</span> - Include file contents in every message</div>
                                <div>• <span className="text-purple-400">Attachments</span> - Drag & drop or paste images/files</div>
                                <div>• Right-click files in sidebar → "Add to Context"</div>
                            </div>
                        </div>

                        {/* Models */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Models & Providers</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• Supports <span className="text-blue-400">Ollama</span>, <span className="text-green-400">OpenAI</span>, <span className="text-orange-400">Anthropic</span>, <span className="text-purple-400">Gemini</span>, and more</div>
                                <div>• Star ⭐ favorite models for quick access</div>
                                <div>• Configure API keys in Settings</div>
                                <div>• Adjust T/P/K generation params in the Params tile</div>
                            </div>
                        </div>

                        {/* Tools & Features */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Special Features</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-purple-400">Knowledge Graph</span> - Visualize entity relationships</div>
                                <div>• <span className="text-blue-400">Memory Management</span> - View/edit AI memory</div>
                                <div>• <span className="text-green-400">Notebooks</span> - Jupyter notebook support</div>
                                <div>• <span className="text-yellow-400">Terminal</span> - Integrated shell with npcsh</div>
                                <div>• <span className="text-cyan-400">Browser</span> - Built-in web browser pane</div>
                                <div>• <span className="text-pink-400">Voice</span> - Speech-to-text input (mic button)</div>
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="border-t border-white/5 pt-2">
                            <div className="text-[10px] uppercase text-gray-500 mb-1.5">Status Bar</div>
                            <div className="space-y-1 text-gray-400">
                                <div>• <span className="text-purple-400">Git</span> - Branch info, click for git operations</div>
                                <div>• <span className="text-blue-400">Scroll</span> - Toggle auto-scroll on new messages</div>
                                <div>• <span className="text-purple-400">AI</span> - Toggle predictive text suggestions</div>
                                <div>• Pane tabs for quick switching</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusBar;
