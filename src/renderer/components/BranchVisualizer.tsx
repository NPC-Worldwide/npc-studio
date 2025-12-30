import React, { useMemo } from 'react';
import { X, GitBranch, MessageSquare, Clock, ChevronRight } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    parentBranch?: string;
    branchFromIndex?: number;
    messages: any[];
    createdAt: number;
}

interface BranchVisualizerProps {
    isOpen: boolean;
    onClose: () => void;
    conversationBranches: Map<string, Branch>;
    currentBranchId: string;
    onSwitchBranch: (branchId: string) => void;
}

interface TreeNode {
    branch: Branch;
    children: TreeNode[];
    depth: number;
    x: number;
    y: number;
}

export const BranchVisualizer: React.FC<BranchVisualizerProps> = ({
    isOpen,
    onClose,
    conversationBranches,
    currentBranchId,
    onSwitchBranch
}) => {
    // Build tree structure from branches
    const treeData = useMemo(() => {
        const branches = Array.from(conversationBranches.values());

        // Create a map for quick lookup
        const branchMap = new Map<string, TreeNode>();

        // Initialize all nodes
        branches.forEach(branch => {
            branchMap.set(branch.id, {
                branch,
                children: [],
                depth: 0,
                x: 0,
                y: 0
            });
        });

        // Add main branch if not exists
        if (!branchMap.has('main')) {
            branchMap.set('main', {
                branch: {
                    id: 'main',
                    name: 'Main Branch',
                    messages: [],
                    createdAt: Date.now()
                },
                children: [],
                depth: 0,
                x: 0,
                y: 0
            });
        }

        // Build parent-child relationships
        const roots: TreeNode[] = [];
        branchMap.forEach((node, id) => {
            const parentId = node.branch.parentBranch;
            if (parentId && branchMap.has(parentId)) {
                branchMap.get(parentId)!.children.push(node);
            } else if (id === 'main' || !parentId) {
                roots.push(node);
            }
        });

        // Calculate positions
        let yOffset = 0;
        const calculatePositions = (node: TreeNode, depth: number) => {
            node.depth = depth;
            node.x = depth * 180;
            node.y = yOffset;
            yOffset += 80;

            node.children.forEach(child => {
                calculatePositions(child, depth + 1);
            });
        };

        roots.forEach(root => calculatePositions(root, 0));

        return { roots, branchMap, totalHeight: yOffset };
    }, [conversationBranches]);

    if (!isOpen) return null;

    const renderNode = (node: TreeNode): React.ReactNode => {
        const isActive = currentBranchId === node.branch.id;
        const branchFromMsg = node.branch.branchFromIndex !== undefined
            ? `Branched at message ${node.branch.branchFromIndex + 1}`
            : null;

        return (
            <g key={node.branch.id}>
                {/* Connection lines to children */}
                {node.children.map(child => (
                    <g key={`line-${child.branch.id}`}>
                        {/* Horizontal line from parent */}
                        <line
                            x1={node.x + 140}
                            y1={node.y + 30}
                            x2={node.x + 160}
                            y2={node.y + 30}
                            stroke="#6b7280"
                            strokeWidth="2"
                        />
                        {/* Vertical line down */}
                        <line
                            x1={node.x + 160}
                            y1={node.y + 30}
                            x2={node.x + 160}
                            y2={child.y + 30}
                            stroke="#6b7280"
                            strokeWidth="2"
                        />
                        {/* Horizontal line to child */}
                        <line
                            x1={node.x + 160}
                            y1={child.y + 30}
                            x2={child.x}
                            y2={child.y + 30}
                            stroke="#6b7280"
                            strokeWidth="2"
                        />
                    </g>
                ))}

                {/* Branch node */}
                <foreignObject x={node.x} y={node.y} width="140" height="60">
                    <div
                        onClick={() => onSwitchBranch(node.branch.id)}
                        className={`h-full p-2 rounded-lg border-2 cursor-pointer transition-all ${
                            isActive
                                ? 'border-purple-500 bg-purple-500/30'
                                : 'border-gray-600 bg-gray-800/80 hover:border-gray-500 hover:bg-gray-700/80'
                        }`}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <GitBranch size={12} className={isActive ? 'text-purple-400' : 'text-gray-400'} />
                            <span className="text-xs font-medium truncate">
                                {node.branch.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="flex items-center gap-0.5">
                                <MessageSquare size={10} />
                                {node.branch.messages?.length || 0}
                            </span>
                            {branchFromMsg && (
                                <span className="truncate">{branchFromMsg}</span>
                            )}
                        </div>
                    </div>
                </foreignObject>

                {/* Render children */}
                {node.children.map(child => renderNode(child))}
            </g>
        );
    };

    const maxDepth = Math.max(...Array.from(treeData.branchMap.values()).map(n => n.depth));
    const svgWidth = (maxDepth + 1) * 180 + 40;
    const svgHeight = treeData.totalHeight + 40;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="theme-bg-primary border theme-border rounded-xl shadow-2xl w-[800px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <GitBranch size={20} className="text-purple-400" />
                        <h2 className="text-lg font-semibold">Conversation Branches</h2>
                    </div>
                    <button onClick={onClose} className="p-1 theme-hover rounded">
                        <X size={18} />
                    </button>
                </div>

                {/* Branch Tree */}
                <div className="flex-1 overflow-auto p-4">
                    {treeData.roots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <GitBranch size={48} className="mb-3 opacity-50" />
                            <p>No branches yet</p>
                            <p className="text-sm mt-1">Click the branch button on any user message to create a branch</p>
                        </div>
                    ) : (
                        <svg width={svgWidth} height={svgHeight} className="min-w-full">
                            <g transform="translate(20, 20)">
                                {treeData.roots.map(root => renderNode(root))}
                            </g>
                        </svg>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 px-4 py-3 border-t theme-border text-xs text-gray-400 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border-2 border-purple-500 bg-purple-500/30" />
                        <span>Current Branch</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border-2 border-gray-600 bg-gray-800" />
                        <span>Other Branches</span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>Click a branch to switch to it</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchVisualizer;
