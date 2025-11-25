import React, { useCallback, memo } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart as BarChartIcon,
    Star, Trash2, Play, Copy, Download, Plus, Settings2, Edit, Terminal, Globe,
    GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat, ListFilter, File as FileIcon,
    Image as ImageIcon
} from 'lucide-react';
import PaneHeader from './PaneHeader';
import { getFileIcon } from './utils';

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
            renderPptxViewer, renderLatexViewer, renderPicViewer,
            moveContentPane,
            findNodePath, rootLayoutNode, setPaneContextMenu, closeContentPane,
            // Destructure the new chat-specific props from component:
            autoScrollEnabled, setAutoScrollEnabled,
            messageSelectionMode, toggleMessageSelectionMode, selectedMessages,
            conversationBranches, showBranchingUI, setShowBranchingUI,
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
                else if (ext === 'pptx') contentType = 'pptx'; // Added
                else if (ext === 'tex') contentType = 'latex'; // Added
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

        // Conditionally construct children for PaneHeader (chat-specific buttons)
        let paneHeaderChildren = null;
        if (contentType === 'chat') {
            paneHeaderChildren = (
                <>
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
                    return renderChatView({ nodeId: node.id });
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