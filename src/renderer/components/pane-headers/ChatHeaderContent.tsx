import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, ListFilter, MessageSquare, ChevronDownIcon } from 'lucide-react';

// Token cost calculator based on model pricing ($ per 1K tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gpt-5': { input: 0.00125, output: 0.01 },
    'gpt-5-mini': { input: 0.00025, output: 0.002 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'o1': { input: 0.015, output: 0.06 },
    'o1-mini': { input: 0.0011, output: 0.0044 },
    'claude-opus-4': { input: 0.015, output: 0.075 },
    'claude-sonnet-4': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
    'gemini-2.0': { input: 0.00015, output: 0.0006 },
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    'llama': { input: 0, output: 0 },
    'mistral': { input: 0, output: 0 },
    'deepseek': { input: 0, output: 0 },
    'qwen': { input: 0, output: 0 },
};

const calculateTokenCost = (tokenCount: number, models: Set<string>): number => {
    if (!tokenCount || tokenCount === 0) return 0;
    let maxCostPer1K = 0;
    models?.forEach(model => {
        const modelLower = model?.toLowerCase() || '';
        for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
            if (modelLower.includes(key)) {
                const avgCost = (pricing.input + pricing.output) / 2;
                if (avgCost > maxCostPer1K) maxCostPer1K = avgCost;
                break;
            }
        }
    });
    return (tokenCount / 1000) * maxCostPer1K;
};

interface ChatStats {
    messageCount: number;
    tokenCount: number;
    models: Set<string>;
    agents: Set<string>;
    providers: Set<string>;
}

interface ChatHeaderContentProps {
    icon: React.ReactNode;
    title: string;
    chatStats?: ChatStats;
    autoScrollEnabled: boolean;
    setAutoScrollEnabled: (enabled: boolean) => void;
    messageSelectionMode: boolean;
    toggleMessageSelectionMode: () => void;
    selectedMessages: Set<string>;
    showBranchingUI: boolean;
    setShowBranchingUI: (show: boolean) => void;
    conversationBranches: Map<string, any>;
    topBarCollapsed?: boolean;
    onExpandTopBar?: () => void;
}

const ChatHeaderContent: React.FC<ChatHeaderContentProps> = ({
    icon,
    title,
    chatStats = { messageCount: 0, tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set() },
    autoScrollEnabled,
    setAutoScrollEnabled,
    messageSelectionMode,
    toggleMessageSelectionMode,
    selectedMessages,
    showBranchingUI,
    setShowBranchingUI,
    conversationBranches,
    topBarCollapsed,
    onExpandTopBar
}) => {
    const [statsExpanded, setStatsExpanded] = useState(false);
    const tokenCost = calculateTokenCost(chatStats.tokenCount, chatStats.models);

    return (
        <div style={{ flex: '1 1 0', width: 0, minWidth: 0, display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px' }}>
            <span style={{ flexShrink: 0 }}>{icon}</span>
            <span
                style={{
                    flex: '0 1 auto',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 600
                }}
                title={title}
            >
                {title}
            </span>

            {/* Expand top bar button - right after title */}
            {topBarCollapsed && onExpandTopBar && (
                <button
                    onClick={(e) => { e.stopPropagation(); onExpandTopBar(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 theme-hover rounded flex-shrink-0 text-gray-400 hover:text-blue-400"
                    title="Show top bar"
                >
                    <ChevronDown size={14} />
                </button>
            )}

            {/* Buttons area */}
            <div style={{ flex: '1 1 0', width: 0, minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', overflow: 'hidden', flexWrap: 'nowrap' }}>
                {/* Stats dropdown */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); setStatsExpanded(!statsExpanded); }}
                        className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-gray-400 hover:text-gray-200 rounded theme-hover"
                        title={`${chatStats.messageCount} messages, ~${chatStats.tokenCount.toLocaleString()} tokens${tokenCost > 0 ? `, $${tokenCost.toFixed(2)}` : ''}`}
                    >
                        <BarChart3 size={12} />
                        <span className="hidden sm:inline">{chatStats.messageCount}m</span>
                        {statsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </button>
                    {statsExpanded && (
                        <div className="absolute top-full left-0 mt-1 p-2 rounded theme-bg-secondary theme-border border shadow-lg z-50 min-w-[180px]">
                            <div className="text-[10px] space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Messages:</span><span>{chatStats.messageCount}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Tokens:</span><span>~{chatStats.tokenCount?.toLocaleString()}</span></div>
                                {tokenCost > 0 && <div className="flex justify-between"><span className="text-gray-500">Est. Cost:</span><span className="text-green-400">${tokenCost.toFixed(4)}</span></div>}
                                {chatStats.agents?.size > 0 && (
                                    <div className="flex justify-between"><span className="text-gray-500">Agents:</span><span className="text-purple-400" title={Array.from(chatStats.agents).join(', ')}>{chatStats.agents.size}</span></div>
                                )}
                                {chatStats.models?.size > 0 && (
                                    <div className="flex justify-between"><span className="text-gray-500">Models:</span><span className="text-blue-400" title={Array.from(chatStats.models).join(', ')}>{chatStats.models.size}</span></div>
                                )}
                                {chatStats.providers?.size > 0 && (
                                    <div className="flex justify-between"><span className="text-gray-500">Providers:</span><span className="text-cyan-400">{chatStats.providers.size}</span></div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Auto-scroll toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); setAutoScrollEnabled(!autoScrollEnabled); }}
                    className={`p-1 rounded text-xs transition-all flex items-center gap-0.5 flex-shrink-0 ${
                        autoScrollEnabled ? 'theme-button-success' : 'theme-button'
                    } theme-hover`}
                    title={autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                </button>

                {/* Selection mode toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleMessageSelectionMode(); }}
                    className={`p-1 rounded text-xs transition-all flex items-center gap-0.5 flex-shrink-0 ${messageSelectionMode ? 'theme-button-primary' : 'theme-button theme-hover'}`}
                    title={messageSelectionMode ? `Exit selection (${selectedMessages.size} selected)` : 'Select messages'}
                >
                    <ListFilter size={12} />
                    {messageSelectionMode && selectedMessages.size > 0 && <span className="text-[10px]">{selectedMessages.size}</span>}
                </button>

                {/* Branching UI toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowBranchingUI(!showBranchingUI); }}
                    className={`p-1 rounded text-xs transition-all flex items-center gap-0.5 flex-shrink-0 ${
                        showBranchingUI ? 'theme-button-primary' : 'theme-button theme-hover'
                    }`}
                    title="Manage conversation branches"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <circle cx="18" cy="6" r="3"></circle>
                        <circle cx="6" cy="18" r="3"></circle>
                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                    {conversationBranches.size > 0 && <span className="text-[10px]">{conversationBranches.size}</span>}
                </button>
            </div>
        </div>
    );
};

export default ChatHeaderContent;
