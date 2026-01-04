import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, Terminal, Globe, FileText, Zap, Users, Brain, Keyboard, Settings, FolderOpen, GitBranch, Image, Database, BookOpen, Layout, MousePointer, Command } from 'lucide-react';

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border theme-border rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 theme-bg-tertiary hover:bg-opacity-80 transition-colors text-left"
            >
                {isOpen ? <ChevronDown size={18} className="text-blue-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <span className="text-blue-400">{icon}</span>
                <span className="font-medium theme-text-primary">{title}</span>
            </button>
            {isOpen && (
                <div className="px-4 py-3 theme-bg-secondary border-t theme-border">
                    {children}
                </div>
            )}
        </div>
    );
};

const KeyboardShortcut: React.FC<{ keys: string; description: string }> = ({ keys, description }) => (
    <div className="flex items-center justify-between py-1.5">
        <span className="text-sm theme-text-muted">{description}</span>
        <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 rounded border border-gray-600 theme-text-primary">{keys}</kbd>
    </div>
);

const FeatureItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="flex gap-3 py-2">
        <span className="text-blue-400 flex-shrink-0 mt-0.5">{icon}</span>
        <div>
            <div className="font-medium theme-text-primary text-sm">{title}</div>
            <div className="text-xs theme-text-muted mt-0.5">{description}</div>
        </div>
    </div>
);

export const HelpViewer: React.FC = () => {
    return (
        <div className="flex flex-col h-full theme-bg-primary overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b theme-border">
                <h1 className="text-xl font-bold theme-text-primary">NPC Studio</h1>
                <p className="text-sm theme-text-muted mt-1">AI-powered development environment</p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Introduction */}
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <h2 className="text-lg font-semibold theme-text-primary mb-2">Welcome to NPC Studio</h2>
                    <p className="text-sm theme-text-muted leading-relaxed">
                        NPC Studio is an AI-powered development environment that combines intelligent chat assistants,
                        code editing, terminal access, web browsing, and knowledge management into a unified workspace.
                        Create custom AI agents (NPCs), automate workflows with Jinxs, and organize your work with
                        flexible tiling layouts.
                    </p>
                </div>

                {/* Core Features */}
                <CollapsibleSection title="Core Features" icon={<Layout size={18} />} defaultOpen={false}>
                    <div className="space-y-1">
                        <FeatureItem
                            icon={<MessageSquare size={16} />}
                            title="AI Chat"
                            description="Converse with AI assistants. Attach files, images, and context. Branch conversations to explore different approaches."
                        />
                        <FeatureItem
                            icon={<Terminal size={16} />}
                            title="Terminal & NPCSH"
                            description="Integrated terminal with NPCSH shell for AI-enhanced command line. Run Python, bash, and interact with NPCs directly."
                        />
                        <FeatureItem
                            icon={<Globe size={16} />}
                            title="Web Browser"
                            description="Built-in browser with ad blocking, password management, and page content extraction for AI context."
                        />
                        <FeatureItem
                            icon={<FileText size={16} />}
                            title="Code Editor"
                            description="Edit code, markdown, LaTeX, notebooks, and more. Syntax highlighting and integrated file management."
                        />
                        <FeatureItem
                            icon={<Layout size={16} />}
                            title="Flexible Layouts"
                            description="Split panes horizontally or vertically. Drag and drop to rearrange. Use tabs within panes for organization."
                        />
                    </div>
                </CollapsibleSection>

                {/* NPCs & Jinxs */}
                <CollapsibleSection title="NPCs & Jinxs" icon={<Users size={18} />}>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium theme-text-primary text-sm mb-1">NPCs (AI Agents)</h4>
                            <p className="text-xs theme-text-muted">
                                NPCs are customizable AI agents with specific personalities, knowledge, and capabilities.
                                Create project-specific NPCs in your <code className="px-1 py-0.5 bg-gray-700 rounded text-xs">npc_team/</code> folder
                                or global ones in <code className="px-1 py-0.5 bg-gray-700 rounded text-xs">~/.npcsh/npc_team/</code>.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium theme-text-primary text-sm mb-1">Jinxs (Automation Scripts)</h4>
                            <p className="text-xs theme-text-muted">
                                Jinxs are reusable AI workflows. Type <code className="px-1 py-0.5 bg-gray-700 rounded text-xs">/jinx_name</code> in chat
                                to execute. Create custom jinxs with Jinja2 templates for complex multi-step AI operations.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium theme-text-primary text-sm mb-1">Context Files (.ctx)</h4>
                            <p className="text-xs theme-text-muted">
                                Add persistent context to your NPCs with .ctx files. Include documentation, coding standards,
                                or any information the AI should always have access to.
                            </p>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Pane Types */}
                <CollapsibleSection title="Pane Types" icon={<FolderOpen size={18} />}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <MessageSquare size={14} className="text-blue-400" />
                            <span className="theme-text-muted">Chat - AI conversations</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <Terminal size={14} className="text-green-400" />
                            <span className="theme-text-muted">Terminal - Shell access</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <Globe size={14} className="text-cyan-400" />
                            <span className="theme-text-muted">Browser - Web browsing</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <FileText size={14} className="text-yellow-400" />
                            <span className="theme-text-muted">Editor - Code & text</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <Image size={14} className="text-purple-400" />
                            <span className="theme-text-muted">Image - Photo viewer</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <Database size={14} className="text-orange-400" />
                            <span className="theme-text-muted">Database - SQL tools</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <Brain size={14} className="text-pink-400" />
                            <span className="theme-text-muted">Mind Map - Visual notes</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded theme-bg-tertiary">
                            <BookOpen size={14} className="text-red-400" />
                            <span className="theme-text-muted">Library - File browser</span>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Keyboard Shortcuts */}
                <CollapsibleSection title="Keyboard Shortcuts" icon={<Keyboard size={18} />}>
                    <div className="space-y-1">
                        <div className="text-xs font-medium theme-text-muted uppercase tracking-wider mb-2">General</div>
                        <KeyboardShortcut keys="Ctrl+N" description="New chat" />
                        <KeyboardShortcut keys="Ctrl+Shift+N" description="New terminal" />
                        <KeyboardShortcut keys="Ctrl+W" description="Close current pane" />
                        <KeyboardShortcut keys="Ctrl+Tab" description="Next tab" />
                        <KeyboardShortcut keys="Ctrl+Shift+Tab" description="Previous tab" />

                        <div className="text-xs font-medium theme-text-muted uppercase tracking-wider mb-2 mt-4">Chat</div>
                        <KeyboardShortcut keys="Enter" description="Send message" />
                        <KeyboardShortcut keys="Shift+Enter" description="New line in message" />
                        <KeyboardShortcut keys="Ctrl+L" description="Clear chat display" />
                        <KeyboardShortcut keys="Escape" description="Stop generation" />

                        <div className="text-xs font-medium theme-text-muted uppercase tracking-wider mb-2 mt-4">Editor</div>
                        <KeyboardShortcut keys="Ctrl+S" description="Save file" />
                        <KeyboardShortcut keys="Ctrl+Z" description="Undo" />
                        <KeyboardShortcut keys="Ctrl+Shift+Z" description="Redo" />

                        <div className="text-xs font-medium theme-text-muted uppercase tracking-wider mb-2 mt-4">Layout</div>
                        <KeyboardShortcut keys="Ctrl+\\" description="Split pane vertically" />
                        <KeyboardShortcut keys="Ctrl+Shift+\\" description="Split pane horizontally" />
                        <KeyboardShortcut keys="Escape" description="Exit zen mode" />
                    </div>
                </CollapsibleSection>

                {/* Mouse Actions */}
                <CollapsibleSection title="Mouse Actions" icon={<MousePointer size={18} />}>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Drag pane header</span>
                            <span className="theme-text-muted">Move pane to new location</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Right-click pane</span>
                            <span className="theme-text-muted">Context menu (split, close, etc.)</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Middle-click tab</span>
                            <span className="theme-text-muted">Close tab</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Ctrl+click link</span>
                            <span className="theme-text-muted">Open in new browser tab</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Drag sidebar item</span>
                            <span className="theme-text-muted">Create new pane with content</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="font-medium theme-text-primary min-w-[120px]">Drag divider</span>
                            <span className="theme-text-muted">Resize panes</span>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Chat Commands */}
                <CollapsibleSection title="Chat Commands" icon={<Command size={18} />}>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                            <code className="px-2 py-0.5 bg-gray-700 rounded text-xs min-w-[100px]">/jinx_name</code>
                            <span className="theme-text-muted">Execute a jinx workflow</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <code className="px-2 py-0.5 bg-gray-700 rounded text-xs min-w-[100px]">@npc_name</code>
                            <span className="theme-text-muted">Direct message to specific NPC</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <code className="px-2 py-0.5 bg-gray-700 rounded text-xs min-w-[100px]">@file.ext</code>
                            <span className="theme-text-muted">Attach file to message</span>
                        </div>
                        <div className="mt-3 p-2 rounded theme-bg-tertiary">
                            <div className="text-xs theme-text-muted">
                                <span className="font-medium text-blue-400">Tip:</span> Use the attachment button or drag files
                                into the chat to include images, code, and documents as context.
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* File Locations */}
                <CollapsibleSection title="File Locations" icon={<FolderOpen size={18} />}>
                    <div className="space-y-2 text-sm font-mono">
                        <div>
                            <div className="theme-text-primary text-xs">~/.npcsh/</div>
                            <div className="text-xs theme-text-muted pl-3">Global npcsh configuration directory</div>
                        </div>
                        <div>
                            <div className="theme-text-primary text-xs">~/.npcsh/npc_team/</div>
                            <div className="text-xs theme-text-muted pl-3">Global NPCs, jinxs, and context files</div>
                        </div>
                        <div>
                            <div className="theme-text-primary text-xs">~/.npcshrc</div>
                            <div className="text-xs theme-text-muted pl-3">Shell configuration (API keys, settings)</div>
                        </div>
                        <div>
                            <div className="theme-text-primary text-xs">./npc_team/</div>
                            <div className="text-xs theme-text-muted pl-3">Project-specific NPCs and jinxs</div>
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Tips */}
                <CollapsibleSection title="Tips & Tricks" icon={<Zap size={18} />}>
                    <ul className="space-y-2 text-sm theme-text-muted">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Branch conversations to explore different approaches without losing context</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Use zen mode (expand button) to focus on a single pane</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Workspaces are auto-saved per directory - your layout persists</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Drag files from the library directly into chat for context</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Use the browser's "Add to Context" to include web pages in chat</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-400">*</span>
                            <span>Create project-specific NPCs to maintain consistent coding style</span>
                        </li>
                    </ul>
                </CollapsibleSection>

                {/* Version Info */}
                <div className="mt-6 pt-4 border-t theme-border text-center">
                    <p className="text-xs theme-text-muted">
                        NPC Studio v0.0.32 | Built with Electron + React
                    </p>
                    <p className="text-xs theme-text-muted mt-1">
                        <a href="https://github.com/cagostino/npc-studio" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                            GitHub
                        </a>
                        {' | '}
                        <a href="https://npcsh.io" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                            Documentation
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HelpViewer;
