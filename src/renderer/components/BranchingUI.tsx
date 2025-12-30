import React, { useCallback } from 'react';
import { X, Network } from 'lucide-react';
import { generateId } from './utils';

interface BranchingUIProps {
    showBranchingUI: boolean;
    setShowBranchingUI: (show: boolean) => void;
    conversationBranches: Map<string, any>;
    currentBranchId: string;
    setCurrentBranchId: (id: string) => void;
    setConversationBranches: (fn: (prev: Map<string, any>) => Map<string, any>) => void;
    activeContentPaneId: string | null;
    contentDataRef: React.MutableRefObject<any>;
    setRootLayoutNode: (fn: (prev: any) => any) => void;
    onOpenVisualizer?: () => void;
}

// Add UI component for branching visualization
export const BranchingUI: React.FC<BranchingUIProps> = ({
    showBranchingUI,
    setShowBranchingUI,
    conversationBranches,
    currentBranchId,
    setCurrentBranchId,
    setConversationBranches,
    activeContentPaneId,
    contentDataRef,
    setRootLayoutNode,
    onOpenVisualizer
}) => {
    // Add function to switch branches
    const switchToBranch = useCallback((branchId: string) => {
        const activePaneData = contentDataRef.current[activeContentPaneId!];
        if (!activePaneData || !activePaneData.chatMessages) return;

        const branch = conversationBranches.get(branchId);
        if (!branch && branchId !== 'main') return;

        // If switching to main, use mainBranchMessages if available
        if (branchId === 'main') {
            const mainBranch = conversationBranches.get('main');
            if (mainBranch) {
                setCurrentBranchId('main');
                activePaneData.chatMessages.allMessages = [...mainBranch.messages];
                activePaneData.chatMessages.messages = mainBranch.messages.slice(-(activePaneData.chatMessages.displayedMessageCount || 50));
                setRootLayoutNode(prev => ({ ...prev }));
            } else {
                // Main not stored yet - just switch the branch ID
                setCurrentBranchId('main');
                setRootLayoutNode(prev => ({ ...prev }));
            }
            return;
        }

        setCurrentBranchId(branchId);
        activePaneData.chatMessages.allMessages = [...branch.messages];
        activePaneData.chatMessages.messages = branch.messages.slice(-(activePaneData.chatMessages.displayedMessageCount || 50));
        setRootLayoutNode(prev => ({ ...prev }));
    }, [activeContentPaneId, conversationBranches, contentDataRef, setCurrentBranchId, setRootLayoutNode]);

    if (!showBranchingUI) return null;

    const branches = Array.from(conversationBranches.values());

    return (
        <div className="fixed top-4 right-4 theme-bg-secondary border theme-border rounded-lg shadow-xl p-4 z-50 max-w-md">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Conversation Branches</h3>
                <button
                    onClick={() => setShowBranchingUI(false)}
                    className="p-1 theme-hover rounded-full"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Main branch */}
                <button
                    onClick={() => switchToBranch('main')}
                    className={`w-full p-2 rounded text-left transition-all ${
                        currentBranchId === 'main'
                            ? 'theme-button-primary'
                            : 'theme-hover'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="font-medium">Main Branch</span>
                    </div>
                </button>

                {/* Other branches (filter out 'main' since it's shown above) */}
                {branches.filter(b => b.id !== 'main').map(branch => (
                    <button
                        key={branch.id}
                        onClick={() => switchToBranch(branch.id)}
                        className={`w-full p-2 rounded text-left transition-all ${
                            currentBranchId === branch.id
                                ? 'theme-button-primary'
                                : 'theme-hover'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="flex-1">
                                <div className="font-medium">{branch.name}</div>
                                <div className="text-xs theme-text-muted">
                                    {branch.messages.length} messages • {new Date(branch.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t theme-border flex items-center justify-between">
                <div className="text-xs theme-text-muted">
                    Current: {currentBranchId === 'main' ? 'Main Branch' : conversationBranches.get(currentBranchId)?.name}
                </div>
                {onOpenVisualizer && (
                    <button
                        onClick={() => {
                            onOpenVisualizer();
                            setShowBranchingUI(false);
                        }}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                    >
                        <Network size={12} />
                        View Map
                    </button>
                )}
            </div>
        </div>
    );
};

// Export helper function for creating branch points
export const createBranchPoint = (
    fromMessageIndex: number,
    activeContentPaneId: string | null,
    currentBranchId: string,
    conversationBranches: Map<string, any>,
    contentDataRef: React.MutableRefObject<any>,
    setConversationBranches: (fn: (prev: Map<string, any>) => Map<string, any>) => void,
    setCurrentBranchId: (id: string) => void,
    setRootLayoutNode: (fn: (prev: any) => any) => void
) => {
    const activePaneData = contentDataRef.current[activeContentPaneId!];
    if (!activePaneData || !activePaneData.chatMessages) return;

    const branchId = generateId();

    // First, save the current branch state (especially important for main branch)
    // This ensures we can switch back and see all messages
    const currentMessages = [...activePaneData.chatMessages.allMessages];

    const branchPoint = {
        id: branchId,
        parentBranch: currentBranchId,
        branchFromIndex: fromMessageIndex,
        messages: [...currentMessages.slice(0, fromMessageIndex + 1)],
        createdAt: Date.now(),
        name: `Branch ${conversationBranches.size + 1}`
    };

    setConversationBranches(prev => {
        const newMap = new Map(prev);
        // Save the current branch state before switching (preserve full conversation)
        if (currentBranchId === 'main' && !newMap.has('main')) {
            newMap.set('main', {
                id: 'main',
                messages: currentMessages,
                createdAt: Date.now(),
                name: 'Main Branch'
            });
        } else if (currentBranchId !== 'main' && newMap.has(currentBranchId)) {
            // Update existing branch with current messages
            const existing = newMap.get(currentBranchId);
            newMap.set(currentBranchId, { ...existing, messages: currentMessages });
        }
        newMap.set(branchId, branchPoint);
        return newMap;
    });
    setCurrentBranchId(branchId);

    activePaneData.chatMessages.allMessages = branchPoint.messages;
    activePaneData.chatMessages.messages = branchPoint.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
    setRootLayoutNode(prev => ({ ...prev }));
};

export default BranchingUI;
