
// Add function to switch branches
const switchToBranch = useCallback((branchId) => {
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) return;

    const branch = conversationBranches.get(branchId);
    if (!branch) return;

    setCurrentBranchId(branchId);
    activePaneData.chatMessages.allMessages = [...branch.messages];
    activePaneData.chatMessages.messages = branch.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
    setRootLayoutNode(prev => ({ ...prev }));
}, [activeContentPaneId, conversationBranches]);



        const createBranchPoint = useCallback((fromMessageIndex) => {
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (!activePaneData || !activePaneData.chatMessages) return;

    const branchId = generateId();
    const branchPoint = {
        id: branchId,
        parentBranch: currentBranchId,
        branchFromIndex: fromMessageIndex,
        messages: [...activePaneData.chatMessages.allMessages.slice(0, fromMessageIndex + 1)],
        createdAt: Date.now(),
        name: `Branch ${conversationBranches.size + 1}`
    };

    setConversationBranches(prev => new Map(prev).set(branchId, branchPoint));
    setCurrentBranchId(branchId);

    activePaneData.chatMessages.allMessages = branchPoint.messages;
    activePaneData.chatMessages.messages = branchPoint.messages.slice(-activePaneData.chatMessages.displayedMessageCount);
    setRootLayoutNode(prev => ({ ...prev }));

}, [activeContentPaneId, currentBranchId, conversationBranches]);


// Add UI component for branching visualization
const BranchingUI = () => {
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

                {/* Other branches */}
                {branches.map(branch => (
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

            <div className="mt-3 pt-3 border-t theme-border text-xs theme-text-muted">
                Current: {currentBranchId === 'main' ? 'Main Branch' : conversationBranches.get(currentBranchId)?.name}
            </div>
        </div>
    );
};
