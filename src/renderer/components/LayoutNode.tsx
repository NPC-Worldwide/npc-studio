import React, { useCallback, memo, useState } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart as BarChartIcon,
    Star, Trash2, Play, Copy, Download, Plus, Settings2, Edit, Terminal, Globe,
    GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat, ListFilter, File as FileIcon,
    Image as ImageIcon, Tag
} from 'lucide-react';
import PaneHeader from './PaneHeader';
import { getFileIcon } from './utils';

// Token cost calculator based on model pricing ($ per 1K tokens)
// Source: Helicone LLM API Pricing - Updated Nov 2025
// Prices converted from per 1M to per 1K tokens (divide by 1000)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    // OpenAI models
    'gpt-5': { input: 0.00125, output: 0.01 },
    'gpt-5-mini': { input: 0.00025, output: 0.002 },
    'gpt-5-nano': { input: 0.00005, output: 0.0004 },
    'gpt-5.1': { input: 0.00125, output: 0.01 },
    'gpt-4.1': { input: 0.002, output: 0.008 },
    'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },
    'gpt-4.1-nano': { input: 0.0001, output: 0.0004 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-2024-08-06': { input: 0.0025, output: 0.01 },
    'gpt-4o-2024-11-20': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-32k': { input: 0.06, output: 0.12 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-3.5-turbo-0125': { input: 0.0005, output: 0.0015 },
    'chatgpt-4o-latest': { input: 0.005, output: 0.015 },
    'o1': { input: 0.015, output: 0.06 },
    'o1-preview': { input: 0.015, output: 0.06 },
    'o1-mini': { input: 0.0011, output: 0.0044 },
    'o1-pro': { input: 0.15, output: 0.6 },
    'o3': { input: 0.002, output: 0.008 },
    'o3-mini': { input: 0.0011, output: 0.0044 },
    'o3-pro': { input: 0.02, output: 0.08 },
    'o4-mini': { input: 0.0011, output: 0.0044 },
    'codex-mini': { input: 0.0015, output: 0.006 },
    // Anthropic models
    'claude-opus-4': { input: 0.015, output: 0.075 },
    'claude-opus-4-1': { input: 0.015, output: 0.075 },
    'claude-opus-4-5': { input: 0.005, output: 0.025 },
    'claude-sonnet-4': { input: 0.003, output: 0.015 },
    'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
    'claude-3.7-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-7-sonnet': { input: 0.003, output: 0.015 },
    'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3.5-haiku': { input: 0.0008, output: 0.004 },
    'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
    'claude-haiku-4-5': { input: 0.001, output: 0.005 },
    'claude-2': { input: 0.008, output: 0.024 },
    'claude-instant': { input: 0.00163, output: 0.00551 },
    // Google models
    'gemini-3-pro': { input: 0.002, output: 0.012 },
    'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
    'gemini-2.5-flash': { input: 0.0003, output: 0.0025 },
    'gemini-2.5-flash-lite': { input: 0.0001, output: 0.0004 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-2.0-flash-lite': { input: 0.000075, output: 0.0003 },
    'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
    'gemini-1.5-flash': { input: 0.00035, output: 0.00105 },
    'gemini-flash-1.5-8b': { input: 0.0000375, output: 0.00015 },
    'gemini-pro': { input: 0.000125, output: 0.000375 },
    'gemma-3-27b': { input: 0.00009, output: 0.00016 },
    'gemma-3-12b': { input: 0.00003, output: 0.0001 },
    'gemma-3-4b': { input: 0.000017, output: 0.0000682 },
    'gemma-2-27b': { input: 0.00065, output: 0.00065 },
    'gemma-2-9b': { input: 0.00001, output: 0.00003 },
    // Meta Llama models
    'llama-4-maverick': { input: 0.00015, output: 0.0006 },
    'llama-4-scout': { input: 0.00008, output: 0.0003 },
    'llama-3.3-70b': { input: 0.00013, output: 0.00038 },
    'llama-3.1-405b': { input: 0.0008, output: 0.0008 },
    'llama-3.1-70b': { input: 0.0004, output: 0.0004 },
    'llama-3.1-8b': { input: 0.00002, output: 0.00003 },
    'llama-3-70b': { input: 0.0003, output: 0.0004 },
    'llama-3-8b': { input: 0.00003, output: 0.00006 },
    'llama-3.2-90b': { input: 0.00035, output: 0.0004 },
    'llama-3.2-11b': { input: 0.000049, output: 0.000049 },
    'llama-3.2-3b': { input: 0.00002, output: 0.00002 },
    'llama-3.2-1b': { input: 0.000005, output: 0.00001 },
    // Mistral models
    'mistral-large': { input: 0.002, output: 0.006 },
    'mistral-medium-3': { input: 0.0004, output: 0.002 },
    'mistral-small': { input: 0.0002, output: 0.0006 },
    'mistral-small-3.1': { input: 0.00005, output: 0.0001 },
    'mistral-small-3.2': { input: 0.0001, output: 0.0003 },
    'mistral-nemo': { input: 0.00002, output: 0.00004 },
    'mistral-saba': { input: 0.0002, output: 0.0006 },
    'ministral-8b': { input: 0.0001, output: 0.0001 },
    'ministral-3b': { input: 0.00004, output: 0.00004 },
    'mixtral-8x22b': { input: 0.002, output: 0.006 },
    'mixtral-8x7b': { input: 0.00054, output: 0.00054 },
    'mistral-7b': { input: 0.000028, output: 0.000054 },
    'codestral': { input: 0.0003, output: 0.0009 },
    'devstral-small': { input: 0.00005, output: 0.00022 },
    'devstral-medium': { input: 0.0004, output: 0.002 },
    'magistral-medium': { input: 0.002, output: 0.005 },
    'magistral-small': { input: 0.0005, output: 0.0015 },
    'pixtral-12b': { input: 0.0001, output: 0.0001 },
    'pixtral-large': { input: 0.002, output: 0.006 },
    // DeepSeek
    'deepseek-r1': { input: 0.0004, output: 0.002 },
    'deepseek-r1-0528': { input: 0.0004, output: 0.00175 },
    'deepseek-r1-distill-llama-70b': { input: 0.00003, output: 0.00013 },
    'deepseek-r1-distill-qwen-32b': { input: 0.00027, output: 0.00027 },
    'deepseek-r1-distill-qwen-14b': { input: 0.00015, output: 0.00015 },
    'deepseek-v3': { input: 0.0009, output: 0.0009 },
    'deepseek-v3-0324': { input: 0.00024, output: 0.00084 },
    'deepseek-chat': { input: 0.0003, output: 0.00085 },
    'deepseek-prover-v2': { input: 0.0005, output: 0.00218 },
    // X/Grok
    'grok-4': { input: 0.003, output: 0.015 },
    'grok-4-fast': { input: 0.0002, output: 0.0005 },
    'grok-3': { input: 0.003, output: 0.015 },
    'grok-3-mini': { input: 0.0003, output: 0.0005 },
    'grok-3-fast': { input: 0.005, output: 0.025 },
    'grok-2': { input: 0.002, output: 0.01 },
    'grok-beta': { input: 0.005, output: 0.015 },
    'grok-code-fast-1': { input: 0.0002, output: 0.0015 },
    // Qwen
    'qwen-max': { input: 0.0016, output: 0.0064 },
    'qwen-plus': { input: 0.0004, output: 0.0012 },
    'qwen-turbo': { input: 0.00005, output: 0.0002 },
    'qwen3-235b': { input: 0.00018, output: 0.00054 },
    'qwen3-coder': { input: 0.00022, output: 0.00095 },
    'qwen3-32b': { input: 0.00005, output: 0.0002 },
    'qwen3-30b': { input: 0.00006, output: 0.00022 },
    'qwen3-14b': { input: 0.00005, output: 0.00022 },
    'qwen3-8b': { input: 0.000035, output: 0.000138 },
    'qwen3-4b': { input: 0, output: 0 },
    'qwen2.5-coder-32b': { input: 0.00004, output: 0.00016 },
    'qwen2.5-72b': { input: 0.00007, output: 0.00026 },
    'qwen2.5-vl-72b': { input: 0.00008, output: 0.00033 },
    'qwq-32b': { input: 0.00015, output: 0.0004 },
    // Cohere
    'command-a': { input: 0.0025, output: 0.01 },
    'command-r-plus': { input: 0.0025, output: 0.01 },
    'command-r': { input: 0.00015, output: 0.0006 },
    'command-r7b': { input: 0.0000375, output: 0.00015 },
    // Perplexity
    'sonar': { input: 0.001, output: 0.001 },
    'sonar-pro': { input: 0.003, output: 0.015 },
    'sonar-reasoning': { input: 0.001, output: 0.005 },
    'sonar-reasoning-pro': { input: 0.002, output: 0.008 },
    'sonar-deep-research': { input: 0.002, output: 0.008 },
    // Amazon
    'nova-pro': { input: 0.0008, output: 0.0032 },
    'nova-lite': { input: 0.00006, output: 0.00024 },
    'nova-micro': { input: 0.000035, output: 0.00014 },
    // MiniMax
    'minimax-01': { input: 0.0002, output: 0.0011 },
    'minimax-m1': { input: 0.0004, output: 0.0022 },
    // Moonshot/Kimi
    'kimi-k2': { input: 0.00014, output: 0.00249 },
    'kimi-dev-72b': { input: 0.00029, output: 0.00115 },
    // AI21
    'jamba-mini': { input: 0.0002, output: 0.0004 },
    'jamba-large': { input: 0.002, output: 0.008 },
    // Groq (fast inference - prices vary)
    'groq-llama-3.3-70b': { input: 0.00059, output: 0.00079 },
    'groq-llama-3.1-8b': { input: 0.00005, output: 0.00008 },
    'groq-mixtral-8x7b': { input: 0.00024, output: 0.00024 },
    'groq-gemma2-9b': { input: 0.0002, output: 0.0002 },
    // Inflection
    'inflection-3-productivity': { input: 0.0025, output: 0.01 },
    'inflection-3-pi': { input: 0.0025, output: 0.01 },
    // Microsoft Phi
    'phi-4': { input: 0.00006, output: 0.00014 },
    'phi-4-multimodal': { input: 0.00005, output: 0.0001 },
    'phi-4-reasoning-plus': { input: 0.00007, output: 0.00035 },
    'phi-3.5-mini': { input: 0.0001, output: 0.0001 },
    'phi-3-mini': { input: 0.0001, output: 0.0001 },
    'phi-3-medium': { input: 0.001, output: 0.001 },
    // Nvidia
    'nemotron-70b': { input: 0.0006, output: 0.0006 },
    'nemotron-ultra-253b': { input: 0.0006, output: 0.0018 },
    'nemotron-nano-9b': { input: 0.00004, output: 0.00016 },
    // Morph
    'morph-v3-large': { input: 0.0009, output: 0.0019 },
    'morph-v3-fast': { input: 0.0008, output: 0.0012 },
    // Mercury/Inception
    'mercury': { input: 0.00025, output: 0.001 },
    'mercury-coder': { input: 0.00025, output: 0.001 },
    // Local/self-hosted models (free)
    'ollama': { input: 0, output: 0 },
    'local': { input: 0, output: 0 },
    'localhost': { input: 0, output: 0 },
    'llama': { input: 0, output: 0 },
    'llama3': { input: 0, output: 0 },
    'llama3.1': { input: 0, output: 0 },
    'llama3.2': { input: 0, output: 0 },
    'mistral': { input: 0, output: 0 },
    'codellama': { input: 0, output: 0 },
    'deepseek-coder': { input: 0, output: 0 },
    'qwen2': { input: 0, output: 0 },
    'phi': { input: 0, output: 0 },
    'gemma': { input: 0, output: 0 },
    'nomic': { input: 0, output: 0 },
};

const calculateTokenCost = (tokenCount: number, models: Set<string>): number => {
    if (!tokenCount || tokenCount === 0) return 0;

    // Find the most expensive model used to give upper bound estimate
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

    // If no known model, assume a mid-range cost
    if (maxCostPer1K === 0 && models?.size > 0) {
        maxCostPer1K = 0.002; // Default estimate
    }

    return (tokenCount / 1000) * maxCostPer1K;
};

// Exported utility function for syncing layout with content data
export const syncLayoutWithContentData = (layoutNode: any, contentData: Record<string, any>): any => {
    if (!layoutNode) {
        // If layoutNode is null, ensure contentData is also empty
        if (Object.keys(contentData).length > 0) {
            console.log('[SYNC] Layout node is null, clearing contentData.');
            for (const key in contentData) {
                delete contentData[key];
            }
        }
        return null; // Return null if the layout itself is null
    }

    const collectPaneIds = (node: any): Set<string> => {
        if (!node) return new Set();
        if (node.type === 'content') return new Set([node.id]);
        if (node.type === 'split') {
            return node.children.reduce((acc: Set<string>, child: any) => {
                const childIds = collectPaneIds(child);
                childIds.forEach(id => acc.add(id));
                return acc;
            }, new Set());
        }
        return new Set();
    };

    const paneIdsInLayout = collectPaneIds(layoutNode);
    const contentDataIds = new Set(Object.keys(contentData));

    // 1. Remove orphaned panes from contentData (not in layout)
    contentDataIds.forEach(id => {
        if (!paneIdsInLayout.has(id)) {
            console.warn('[SYNC] Removing orphaned pane from contentData:', id);
            delete contentData[id];
        }
    });

    // 2. Add missing panes to contentData (in layout but not in contentData)
    paneIdsInLayout.forEach(id => {
        if (!contentData.hasOwnProperty(id)) { // Use hasOwnProperty to check for actual property
            console.warn('[SYNC] Adding missing pane to contentData:', id);
            contentData[id] = {}; // Initialize with an empty object
        }
    });

    return layoutNode;
};

// CODE FRAGMENTS BELOW - These are incomplete code snippets meant to be inside Enpistu.tsx
// They reference parent scope variables and can't work as standalone exports
// Commenting out to prevent module-level execution errors

/*
const cleanupPhantomPanes = useCallback(() => {
  const validPaneIds = new Set();

  const collectPaneIds = (node) => {
    if (!node) return;
    if (node.type === 'content') validPaneIds.add(node.id);
    if (node.type === 'split') {
      node.children.forEach(collectPaneIds);
    }
  };

  collectPaneIds(rootLayoutNode);

  // Remove any contentDataRef entries not in the layout
  Object.keys(contentDataRef.current).forEach(paneId => {
    if (!validPaneIds.has(paneId)) {
      console.log(`Removing phantom pane: ${paneId}`);
      delete contentDataRef.current[paneId];
    }
  });
}, [rootLayoutNode]);

const renderPaneContextMenu = () => {
  if (!paneContextMenu?.isOpen) return null;
  const { x, y, nodeId, nodePath } = paneContextMenu;

  const closePane = () => {
    closeContentPane(nodeId, nodePath);
    setPaneContextMenu(null);
  };

  const splitPane = (side) => {
    performSplit(nodePath, side, 'chat', null); // or appropriate contentType and contentId
    setPaneContextMenu(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setPaneContextMenu(null)} />
      <div
        className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
        style={{ top: y, left: x }}
        onMouseLeave={() => setPaneContextMenu(null)}
      >
        <button onClick={closePane} className="block px-4 py-2 w-full text-left theme-hover">
          Close Pane
        </button>
        <div className="border-t theme-border my-1" />
        <button onClick={() => splitPane('left')} className="block px-4 py-2 w-full text-left theme-hover">
          Split Left
        </button>
        <button onClick={() => splitPane('right')} className="block px-4 py-2 w-full text-left theme-hover">
          Split Right
        </button>
        <button onClick={() => splitPane('top')} className="block px-4 py-2 w-full text-left theme-hover">
          Split Top
        </button>
        <button onClick={() => splitPane('bottom')} className="block px-4 py-2 w-full text-left theme-hover">
          Split Bottom
        </button>
      </div>
    </>
  );
};
*/

// End of commented-out fragments

const collectPaneIds = (node) => {
    if (!node) return new Set();
    if (node.type === 'content') return new Set([node.id]);
    if (node.type === 'split') {
        return node.children.reduce((acc, child) => {
            const childIds = collectPaneIds(child);
            childIds.forEach(id => acc.add(id));
            return acc;
        }, new Set());
    }
    return new Set();
};
export const LayoutNode = memo(({ node, path, component }) => {
    if (!node) return null;

    if (node.type === 'split') {
        const handleResize = (e, index) => {
            e.preventDefault();
            const parentNode = component.findNodeByPath(component.rootLayoutNode, path);
            if (!parentNode) return;
            const startSizes = [...parentNode.sizes];
            const isHorizontal = parentNode.direction === 'horizontal';
            const startPos = isHorizontal ? e.clientX : e.clientY;
            const containerSize = isHorizontal ? e.currentTarget.parentElement.offsetWidth : e.currentTarget.parentElement.offsetHeight;

            const onMouseMove = (moveEvent) => {
                const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
                const deltaPercent = ((currentPos - startPos) / containerSize) * 100;
                let newSizes = [...startSizes];
                const amount = Math.min(newSizes[index + 1] - 10, Math.max(-(newSizes[index] - 10), deltaPercent));
                newSizes[index] += amount;
                newSizes[index + 1] -= amount;

                component.setRootLayoutNode(currentRoot => {
                    const newRoot = JSON.parse(JSON.stringify(currentRoot));
                    const target = component.findNodeByPath(newRoot, path);
                    if (target) target.sizes = newSizes;
                    return newRoot;
                });
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        return (
            <div className={`flex flex-1 ${node.direction === 'horizontal' ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden`}>
                {node.children.map((child, index) => (
                    <React.Fragment key={child.id}>
                        <div className="flex overflow-hidden" style={{ flexBasis: `${node.sizes[index]}%` }}>
                            <LayoutNode node={child} path={[...path, index]} component={component} />
                        </div>
                        {index < node.children.length - 1 && (
                            <div
                                className={`flex-shrink-0 ${node.direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-gray-700 hover:bg-blue-500 transition-colors`}
                                onMouseDown={(e) => handleResize(e, index)}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (node.type === 'content') {
        const { activeContentPaneId, setActiveContentPaneId, draggedItem,
            setDraggedItem, dropTarget, setDropTarget, contentDataRef,
            updateContentPane, performSplit,
            renderChatView, renderFileEditor, renderTerminalView,
            renderPdfViewer, renderCsvViewer, renderDocxViewer, renderBrowserViewer,
            renderPptxViewer, renderLatexViewer, renderPicViewer, renderMindMapViewer,
            moveContentPane,
            findNodePath, rootLayoutNode, setPaneContextMenu, closeContentPane,
            // Destructure the new chat-specific props from component:
            autoScrollEnabled, setAutoScrollEnabled,
            messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
            conversationBranches, showBranchingUI, setShowBranchingUI,
            // Input area for chat panes
            renderInputArea,
        } = component;

        const isActive = node.id === activeContentPaneId;
        const isTargeted = dropTarget?.nodePath.join('') === path.join('');

        const onDrop = (e, side) => {
            e.preventDefault();
            e.stopPropagation();
            if (!component.draggedItem) return;

            if (component.draggedItem.type === 'pane') {
                if (component.draggedItem.id === node.id) return;
                component.moveContentPane(component.draggedItem.id, component.draggedItem.nodePath, path, side);
                component.setDraggedItem(null);
                component.setDropTarget(null);
                return;
            }

            let contentType;
            if (draggedItem.type === 'conversation') {
                contentType = 'chat';
            } else if (draggedItem.type === 'file') {
                const ext = draggedItem.id.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') contentType = 'pdf';
                else if (['csv', 'xlsx', 'xls'].includes(ext)) contentType = 'csv';
                else if (['docx', 'doc'].includes(ext)) contentType = 'docx';
                else if (ext === 'pptx') contentType = 'pptx';
                else if (ext === 'tex') contentType = 'latex';
                else if (ext === 'mindmap') contentType = 'mindmap';
                else contentType = 'editor';
            } else if (draggedItem.type === 'browser') {
                contentType = 'browser';
            } else if (draggedItem.type === 'terminal') {
                contentType = 'terminal';
            } else {
                return;
            }

            if (side === 'center') {
                updateContentPane(node.id, contentType, draggedItem.id);
            } else {
                performSplit(path, side, contentType, draggedItem.id);
            }
            setDraggedItem(null);
            setDropTarget(null);
        };

        const paneData = contentDataRef.current[node.id];
        const contentType = paneData?.contentType;
        const contentId = paneData?.contentId;

        let headerIcon = <FileIcon size={14} className="text-gray-400" />;
        let headerTitle = 'Empty Pane';

        if (contentType === 'chat') {
            headerIcon = <MessageSquare size={14} />;
            headerTitle = `Conversation: ${contentId?.slice(-8) || 'None'}`;
        } else if (contentType === 'editor' && contentId) {
            headerIcon = getFileIcon(contentId); 
            headerTitle = contentId.split('/').pop();
        } else if (contentType === 'browser') {
            headerIcon = <Globe size={14} className="text-blue-400" />;
            headerTitle = paneData.browserTitle || paneData.browserUrl || 'Web Browser';
        } else if (contentType === 'terminal') {
            headerIcon = <Terminal size={14} />;
            headerTitle = 'Terminal';
        } else if (contentType === 'image') {
            headerIcon = <ImageIcon size={14} className="text-purple-400" />;
            headerTitle = contentId?.split('/').pop() || 'Image Viewer';
        } else if (contentId) {
            headerIcon = getFileIcon(contentId);
            headerTitle = contentId.split('/').pop();
        }

        // Stats dropdown state
        const [statsExpanded, setStatsExpanded] = useState(false);

        // Conditionally construct children for PaneHeader (chat-specific buttons)
        let paneHeaderChildren = null;
        if (contentType === 'chat') {
            const chatStats = paneData?.chatStats || { messageCount: 0, tokenCount: 0, models: new Set(), agents: new Set(), providers: new Set() };
            const tokenCost = calculateTokenCost(chatStats.tokenCount, chatStats.models);
            paneHeaderChildren = (
                <>
                    {/* Stats dropdown */}
                    <div className="relative mr-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); setStatsExpanded(!statsExpanded); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 rounded theme-hover"
                            title="Toggle stats"
                        >
                            <BarChart3 size={12} />
                            <span>{chatStats.messageCount}m</span>
                            <span>~{(chatStats.tokenCount / 1000).toFixed(1)}k</span>
                            {tokenCost > 0 && <span className="text-green-500">${tokenCost.toFixed(2)}</span>}
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
                    <button
                        onClick={(e) => { e.stopPropagation(); setAutoScrollEnabled(!autoScrollEnabled); }}
                        className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                            autoScrollEnabled ? 'theme-button-success' : 'theme-button'
                        } theme-hover`}
                        title={autoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                        </svg>
                        {autoScrollEnabled ? 'Auto' : 'Manual'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMessageSelectionMode(); }}
                        className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${messageSelectionMode ? 'theme-button-primary' : 'theme-button theme-hover'}`}
                    >
                        <ListFilter size={14} />{messageSelectionMode ? `Exit (${selectedMessages.size})` : 'Select'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowBranchingUI(!showBranchingUI); }}
                        className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                            showBranchingUI ? 'theme-button-primary' : 'theme-button theme-hover'
                        }`}
                        title="Manage conversation branches"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="6" y1="3" x2="6" y2="15"></line>
                            <circle cx="18" cy="6" r="3"></circle>
                            <circle cx="6" cy="18" r="3"></circle>
                            <path d="M18 9a9 9 0 0 1-9 9"></path>
                        </svg>
                        {conversationBranches.size > 0 && `(${conversationBranches.size})`}
                    </button>
                </>
            );
        }
// DUPLICATE/CONFLICTING DECLARATION COMMENTED OUT - closeContentPane is expected to be passed via props
// const closeContentPane = useCallback((paneId, nodePath) => { ... }, [activeContentPaneId, findNodeByPath,rootLayoutNode]);


        const renderPaneContent = () => { // Renamed from renderContent to avoid confusion
            console.log('[RENDER_CONTENT] NodeId:', node.id, 'ContentType:', contentType);

            switch (contentType) {
                case 'chat':
                    return (
                        <>
                            {renderChatView({ nodeId: node.id })}
                            {renderInputArea && renderInputArea({ paneId: node.id })}
                        </>
                    );
                case 'editor':
                    return renderFileEditor({ nodeId: node.id });
                case 'terminal':
                    return renderTerminalView({ nodeId: node.id });
                case 'pdf':
                    return renderPdfViewer({ nodeId: node.id });
                case 'csv':
                    return renderCsvViewer({ nodeId: node.id });
                case 'docx':
                    return renderDocxViewer({ nodeId: node.id });
                case 'browser':
                    return renderBrowserViewer({ nodeId: node.id });
                case 'pptx':
                    return renderPptxViewer({ nodeId: node.id });
                case 'latex':
                    return renderLatexViewer({ nodeId: node.id });
                case 'image':
                    return renderPicViewer({ nodeId: node.id });
                case 'mindmap':
                    return renderMindMapViewer({ nodeId: node.id });
                default:
                    // This is the content for an empty pane
                    return (
                        <div className="flex-1 flex items-center justify-center theme-text-muted">
                            <div className="text-center">
                                <div className="text-lg mb-2">Empty Pane</div>
                                <div className="text-sm">Drag content here or close this pane</div>
                            </div>
                        </div>
                    );
            }
        };

        return (
            <div
                className={`flex-1 flex flex-col relative border ${isActive ? 'border-blue-500 ring-1 ring-blue-500' : 'theme-border'}`}
                onClick={() => setActiveContentPaneId(node.id)}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'center' }); }}
                onDrop={(e) => onDrop(e, 'center')}
            >
                <PaneHeader
                    nodeId={node.id}
                    icon={headerIcon}
                    title={headerTitle}
                    findNodePath={findNodePath}
                    rootLayoutNode={rootLayoutNode}
                    setDraggedItem={setDraggedItem}
                    setPaneContextMenu={setPaneContextMenu}
                    closeContentPane={closeContentPane}
                    fileChanged={paneData?.fileChanged} // Only relevant for editor panes
                    onSave={() => { /* No-op, actual save logic is in renderFileEditor */ }}
                    onStartRename={() => { /* No-op, actual rename logic is in renderFileEditor */ }}
                >
                    {paneHeaderChildren} {/* Pass the conditional children here */}
                </PaneHeader>

                {draggedItem && (
                    <>
                        <div className={`absolute left-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'left' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'left' }); }} onDrop={(e) => onDrop(e, 'left')} />
                        <div className={`absolute right-0 top-0 bottom-0 w-1/4 z-10 ${isTargeted && dropTarget.side === 'right' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'right' }); }} onDrop={(e) => onDrop(e, 'right')} />
                        <div className={`absolute left-0 top-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'top' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'top' }); }} onDrop={(e) => onDrop(e, 'top')} />
                        <div className={`absolute left-0 bottom-0 right-0 h-1/4 z-10 ${isTargeted && dropTarget.side === 'bottom' ? 'bg-blue-500/30' : ''}`} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget({ nodePath: path, side: 'bottom' }); }} onDrop={(e) => onDrop(e, 'bottom')} />
                    </>
                )}
                {renderPaneContent()} {/* Render the actual content below the header */}
            </div>
        );
    }
    return null;
});



// DUPLICATE REMOVED - syncLayoutWithContentData is now exported at the top of the file
// const syncLayoutWithContentData = useCallback((layoutNode, contentData) => { ... }, []);

/*
// CODE FRAGMENTS BELOW - More incomplete code using hooks at module level
// These reference parent scope variables and can't work as standalone exports
// Commenting out to prevent hook errors

    const updateContentPane = useCallback(async (paneId, newContentType, newContentId, skipMessageLoad = false) => {
  // Verify this paneId exists in the layout tree
  const paneExistsInLayout = (node, targetId) => {
    if (!node) return false;
    if (node.type === 'content' && node.id === targetId) return true;
    if (node.type === 'split') {
      return node.children.some(child => paneExistsInLayout(child, targetId));
    }
    return false;
  };

  if (!paneExistsInLayout(rootLayoutNodeRef.current, paneId)) {
    console.warn(`[updateContentPane] Pane ${paneId} not found in layout tree yet, waiting...`);
    // Don't abort - the layout update might be pending
  }

  if (!contentDataRef.current[paneId]) {
    contentDataRef.current[paneId] = {};
  }
  const paneData = contentDataRef.current[paneId];

  paneData.contentType = newContentType;
  paneData.contentId = newContentId;

  if (newContentType === 'editor') {
    try {
      const response = await window.api.readFileContent(newContentId);
      paneData.fileContent = response.error ? `Error: ${response.error}` : response.content;
      paneData.fileChanged = false;
    } catch (err) {
      paneData.fileContent = `Error loading file: ${err.message}`;
    }
  } else if (newContentType === 'browser') {
    paneData.chatMessages = null;
    paneData.fileContent = null;
    paneData.browserUrl = newContentId;
  } else if (newContentType === 'chat') {
    if (!paneData.chatMessages) {
      paneData.chatMessages = { messages: [], allMessages: [], displayedMessageCount: 20 };
    }

    if (skipMessageLoad) {
      paneData.chatMessages.messages = [];
      paneData.chatMessages.allMessages = [];
      paneData.chatStats = getConversationStats([]);
    } else {
      try {
        const msgs = await window.api.getConversationMessages(newContentId);
        const parseMaybeJson = (val) => {
          if (!val || typeof val !== 'string') return val;
          try { return JSON.parse(val); } catch { return val; }
        };
        const formatted = [];
        let lastAssistant = null;
        if (msgs && Array.isArray(msgs)) {
          msgs.forEach(raw => {
            const msg = { ...raw, id: raw.id || generateId() };
            msg.content = parseMaybeJson(msg.content);
            if (msg.role === 'assistant') {
              if (!Array.isArray(msg.toolCalls)) msg.toolCalls = [];
              // If content is a tool_call wrapper, normalize into toolCalls list
              if (msg.content && typeof msg.content === 'object' && msg.content.tool_call) {
                const tc = msg.content.tool_call;
                msg.toolCalls.push({
                  id: tc.id || tc.tool_call_id || generateId(),
                  function: { name: tc.function_name || tc.name || 'tool', arguments: tc.arguments || '' }
                });
                msg.content = '';
              }
              formatted.push(msg);
              lastAssistant = msg;
            } else if (msg.role === 'tool') {
              const toolPayload = msg.content && typeof msg.content === 'object' ? msg.content : { content: msg.content };
              const tcId = toolPayload.tool_call_id || generateId();
              const tcName = toolPayload.tool_name || 'tool';
              const tcContent = toolPayload.content !== undefined ? toolPayload.content : msg.content;
              if (lastAssistant) {
                if (!Array.isArray(lastAssistant.toolCalls)) lastAssistant.toolCalls = [];
                lastAssistant.toolCalls.push({
                  id: tcId,
                  function: { name: tcName, arguments: toolPayload.arguments || '' },
                  result_preview: typeof tcContent === 'string' ? tcContent : JSON.stringify(tcContent)
                });
              } else {
                formatted.push({
                  id: generateId(),
                  role: 'assistant',
                  content: '',
                  toolCalls: [{
                    id: tcId,
                    function: { name: tcName, arguments: toolPayload.arguments || '' },
                    result_preview: typeof tcContent === 'string' ? tcContent : JSON.stringify(tcContent)
                  }]
                });
                lastAssistant = formatted[formatted.length - 1];
              }
            } else {
              formatted.push(msg);
            }
          });
        }

        paneData.chatMessages.allMessages = formatted;
        const count = paneData.chatMessages.displayedMessageCount || 20;
        paneData.chatMessages.messages = formatted.slice(-count);
        paneData.chatStats = getConversationStats(formatted);
      } catch (err) {
        paneData.chatMessages.messages = [];
        paneData.chatMessages.allMessages = [];
        paneData.chatStats = getConversationStats([]);
      }
    }
  } else if (newContentType === 'terminal') {
    paneData.chatMessages = null;
    paneData.fileContent = null;
  } else if (newContentType === 'pdf') {
    paneData.chatMessages = null;
    paneData.fileContent = null;
  }

  setRootLayoutNode(oldRoot => {
    const syncedRoot = syncLayoutWithContentData(oldRoot, contentDataRef.current);
    return syncedRoot;
  });
}, [syncLayoutWithContentData]);


    const findNodeByPath = useCallback((node, path) => {
        if (!node || !path) return null;
        let currentNode = node;
        for (const index of path) {
            if (currentNode && currentNode.children && currentNode.children[index]) {
                currentNode = currentNode.children[index];
            } else {
                return null;
            }
        }
        return currentNode;
    }, []);

    const findNodePath = useCallback((node, id, currentPath = []) => {
        if (!node) return null;
        if (node.id === id) return currentPath;
        if (node.type === 'split') {
            for (let i = 0; i < node.children.length; i++) {
                const result = findNodePath(node.children[i], id, [...currentPath, i]);
                if (result) return result;
            }
        }
        return null;
    }, []);



    const performSplit = useCallback((targetNodePath, side, newContentType, newContentId) => {
        setRootLayoutNode(oldRoot => {
            if (!oldRoot) return oldRoot;
    
            const newRoot = JSON.parse(JSON.stringify(oldRoot));
            let parentNode = null;
            let targetNode = newRoot;
            let targetIndexInParent = -1;
    
            for (let i = 0; i < targetNodePath.length; i++) {
                parentNode = targetNode;
                targetIndexInParent = targetNodePath[i];
                targetNode = targetNode.children[targetIndexInParent];
            }
    
            const newPaneId = generateId();
            const newPaneNode = { id: newPaneId, type: 'content' };
    
            contentDataRef.current[newPaneId] = {};
            updateContentPane(newPaneId, newContentType, newContentId);
    
            const isHorizontalSplit = side === 'left' || side === 'right';
            const newSplitNode = {
                id: generateId(),
                type: 'split',
                direction: isHorizontalSplit ? 'horizontal' : 'vertical',
                children: [],
                sizes: [50, 50]
            };
    
            if (side === 'left' || side === 'top') {
                newSplitNode.children = [newPaneNode, targetNode];
            } else {
                newSplitNode.children = [targetNode, newPaneNode];
            }
    
            if (parentNode) {
                parentNode.children[targetIndexInParent] = newSplitNode;
            } else {
                return newSplitNode;
            }
    
            setActiveContentPaneId(newPaneId);
            return newRoot;
        });
    }, [updateContentPane]);

*/

// End of commented-out fragments with hooks
// LayoutNode component export is at line 137