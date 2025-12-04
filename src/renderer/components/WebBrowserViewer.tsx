import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Globe, Home, X, Plus, Settings, Trash2, Lock } from 'lucide-react';

const WebBrowserViewer = memo(({
    nodeId,
    contentDataRef,
    currentPath,
    browserContextMenuPos,
    setBrowserContextMenuPos,
    handleNewBrowserTab, // New prop for opening new browser tabs/panes
    setRootLayoutNode, // For triggering re-renders when title changes

    // Props for PaneHeader's drag-and-drop and context menu
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane
}) => {
    const webviewRef = useRef(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('Browser');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [error, setError] = useState(null);
    const [showSessionMenu, setShowSessionMenu] = useState(false);
    const [isSecure, setIsSecure] = useState(false);

    // Track navigation type for history graph
    const isManualNavigationRef = useRef(false);
    const previousUrlRef = useRef<string | null>(null);

    const paneData = contentDataRef.current[nodeId];
    const initialUrl = paneData?.browserUrl || 'about:blank';
    // Use 'default' as the shared session to persist cookies across all browser panes
    // This ensures users stay logged into sites when opening new browser tabs
    const viewId = 'default-browser-session';

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const urlToLoad = initialUrl.startsWith('http')
            ? initialUrl
            : `https://${initialUrl === 'about:blank' ? 'google.com' : initialUrl}`;

        setCurrentUrl(urlToLoad);
        setUrlInput(urlToLoad);
        webview.src = urlToLoad;
        webview.setAttribute('partition', `persist:${viewId}`); // Ensure persistence per pane

        const handleDidStartLoading = () => setLoading(true);
        const handleDidStopLoading = () => {
            setLoading(false);
            if (webview) {
                setCanGoBack(webview.canGoBack());
                setCanGoForward(webview.canGoForward());
                // Update title in contentDataRef for PaneHeader
                if (paneData) {
                    paneData.browserTitle = webview.getTitle();
                    // Force a re-render to update PaneHeader title
                    // This is a bit of a hack, ideally paneData updates would trigger this more gracefully
                    // For now, rely on setRootLayoutNode in Enpistu to do it eventually
                }
            }
        };

        const handleDidNavigate = (e) => {
            const url = e.url;
            const fromUrl = previousUrlRef.current;
            const navigationType = isManualNavigationRef.current ? 'manual' : 'click';

            setCurrentUrl(url);
            setUrlInput(url);
            setError(null);
            setIsSecure(url.startsWith('https://'));

            if (url && url !== 'about:blank') {
                (window as any).api?.browserAddToHistory?.({
                    url,
                    title: webview.getTitle() || url,
                    folderPath: currentPath,
                    paneId: nodeId,
                    navigationType,
                    fromUrl
                }).catch((err: any) => console.error('[Browser] History save error:', err));
            }

            // Update tracking refs
            previousUrlRef.current = url;
            isManualNavigationRef.current = false; // Reset after navigation

            // Update paneData url to reflect navigation
            if (paneData) {
                paneData.browserUrl = url;
            }
        };

        const handlePageTitleUpdated = (e) => {
            setTitle(e.title || 'Browser');
            if (paneData) {
                paneData.browserTitle = e.title;
                // Trigger re-render to update pane header title
                if (setRootLayoutNode) {
                    setRootLayoutNode(prev => ({ ...prev }));
                }
            }
        };
        const handleDidFailLoad = (e) => {
            if (e.errorCode !== -3) { // Ignore aborted loads
                setLoading(false);
                setError(`Failed to load page (Error ${e.errorCode}: ${e.validatedURL})`);
            }
        };

        // Event listener for context menu from webview
        const handleWebviewContextMenu = (e) => {
            e.preventDefault();
            setBrowserContextMenuPos({
                x: e.x,
                y: e.y,
                selectedText: '', // Selection text must come from IPC
                viewId: nodeId // Use nodeId for pane identification
            });
        };
        // NOTE: webview.addEventListener for contextmenu is problematic.
        // IPC from main process is generally more reliable.
        // Assuming window.api.onBrowserShowContextMenu from Enpistu handles this.

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('did-navigate-in-page', handleDidNavigate);
        webview.addEventListener('page-title-updated', handlePageTitleUpdated);
        webview.addEventListener('did-fail-load', handleDidFailLoad);
        // webview.addEventListener('context-menu', handleWebviewContextMenu); // Use IPC instead

        return () => {
            if (webview) {
                webview.removeEventListener('did-start-loading', handleDidStartLoading);
                webview.removeEventListener('did-stop-loading', handleDidStopLoading);
                webview.removeEventListener('did-navigate', handleDidNavigate);
                webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
                webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
                webview.removeEventListener('did-fail-load', handleDidFailLoad);
                // webview.removeEventListener('context-menu', handleWebviewContextMenu);
            }
        };
    }, [initialUrl, currentPath, viewId, paneData, setBrowserContextMenuPos]);

    const handleNavigate = useCallback(() => {
        const targetUrl = urlInput;
        if (!targetUrl.trim()) return;
        const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        // Mark this as manual navigation (user typed URL)
        isManualNavigationRef.current = true;
        if (webviewRef.current) webviewRef.current.src = finalUrl;
    }, [urlInput]);

    const handleBack = useCallback(() => webviewRef.current?.goBack(), []);
    const handleForward = useCallback(() => webviewRef.current?.goForward(), []);
    const handleRefresh = useCallback(() => webviewRef.current?.reload(), []);
    const handleHome = useCallback(() => {
        const homeUrl = initialUrl.startsWith('http') ? initialUrl : `https://${initialUrl === 'about:blank' ? 'google.com' : initialUrl}`;
        if (webviewRef.current) webviewRef.current.src = homeUrl;
    }, [initialUrl]);

    const handleClearSessionData = useCallback(async () => {
        if (!webviewRef.current) return;
        try {
            // Clear session data via the webview's session
            const webContents = webviewRef.current.getWebContents?.();
            if (webContents) {
                await webContents.session.clearStorageData({
                    storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage'],
                });
                // Reload the page after clearing
                webviewRef.current.reload();
            }
            setShowSessionMenu(false);
        } catch (err) {
            console.error('[Browser] Failed to clear session data:', err);
        }
    }, []);

    const handleClearCookies = useCallback(async () => {
        if (!webviewRef.current) return;
        try {
            const webContents = webviewRef.current.getWebContents?.();
            if (webContents) {
                await webContents.session.clearStorageData({
                    storages: ['cookies'],
                });
                webviewRef.current.reload();
            }
            setShowSessionMenu(false);
        } catch (err) {
            console.error('[Browser] Failed to clear cookies:', err);
        }
    }, []);

    const handleClearCache = useCallback(async () => {
        if (!webviewRef.current) return;
        try {
            const webContents = webviewRef.current.getWebContents?.();
            if (webContents) {
                await webContents.session.clearCache();
                webviewRef.current.reload();
            }
            setShowSessionMenu(false);
        } catch (err) {
            console.error('[Browser] Failed to clear cache:', err);
        }
    }, []);

    // Re-introducing drag-and-drop and context menu for the pane itself
    const handleDragStart = useCallback((e) => {
        e.dataTransfer.effectAllowed = 'move';
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        e.dataTransfer.setData('application/json',
            JSON.stringify({ type: 'pane', id: nodeId, nodePath })
        );
        setTimeout(() => setDraggedItem({ type: 'pane', id: nodeId, nodePath }), 0);
    }, [findNodePath, rootLayoutNode, nodeId, setDraggedItem]);

    const handleDragEnd = useCallback(() => setDraggedItem(null), [setDraggedItem]);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setPaneContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            nodeId,
            nodePath: findNodePath(rootLayoutNode, nodeId)
        });
    }, [setPaneContextMenu, findNodePath, rootLayoutNode, nodeId]);


    return (
        <div
            className="flex flex-col flex-1 w-full min-h-0 theme-bg-secondary"
            draggable="true"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
        >
            {/* Browser Toolbar */}
            <div className="flex items-center gap-2 p-2 theme-bg-tertiary border-b theme-border flex-shrink-0">
                <button onClick={handleBack} disabled={!canGoBack} className="p-1.5 theme-hover rounded disabled:opacity-30 flex-shrink-0" title="Back"><ArrowLeft size={16} /></button>
                <button onClick={handleForward} disabled={!canGoForward} className="p-1.5 theme-hover rounded disabled:opacity-30 flex-shrink-0" title="Forward"><ArrowRight size={16} /></button>
                <button onClick={handleRefresh} className="p-1.5 theme-hover rounded flex-shrink-0" title="Refresh"><RotateCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={handleHome} className="p-1.5 theme-hover rounded flex-shrink-0" title="Home"><Home size={16} /></button>

                <div className="flex-1 flex items-center gap-1.5 min-w-0 theme-bg-secondary rounded px-2 py-1">
                    {isSecure ? (
                        <Lock size={14} className="text-green-400 flex-shrink-0" title="Secure connection" />
                    ) : (
                        <Globe size={14} className="text-gray-400 flex-shrink-0" />
                    )}
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder="Enter URL..."
                        className="flex-1 bg-transparent text-sm theme-text-primary outline-none min-w-0"
                    />
                </div>
                <button onClick={() => handleNewBrowserTab(currentUrl)} className="p-1.5 theme-hover rounded flex-shrink-0" title="Open in new tab"><Plus size={16} /></button>

                {/* Session Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowSessionMenu(!showSessionMenu)}
                        className="p-1.5 theme-hover rounded flex-shrink-0"
                        title="Browser settings"
                    >
                        <Settings size={16} />
                    </button>

                    {showSessionMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowSessionMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 theme-bg-secondary border theme-border rounded-lg shadow-lg z-50 min-w-[200px]">
                                <div className="p-2 border-b theme-border">
                                    <span className="text-xs theme-text-muted">Session Management</span>
                                </div>
                                <div className="py-1">
                                    <button
                                        onClick={handleClearCookies}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm theme-text-primary theme-hover text-left"
                                    >
                                        <Trash2 size={14} />
                                        Clear Cookies
                                    </button>
                                    <button
                                        onClick={handleClearCache}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm theme-text-primary theme-hover text-left"
                                    >
                                        <Trash2 size={14} />
                                        Clear Cache
                                    </button>
                                    <button
                                        onClick={handleClearSessionData}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 theme-hover text-left"
                                    >
                                        <Trash2 size={14} />
                                        Clear All Data
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Webview Container */}
            <div className="flex-1 relative theme-bg-secondary min-h-0">
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                        <div className="text-center p-6 max-w-md theme-bg-tertiary rounded-lg border theme-border">
                            <h3 className="text-lg font-medium theme-text-primary mb-2">Failed to Load Page</h3>
                            <p className="theme-text-muted text-sm mb-4">{error}</p>
                            <button onClick={handleRefresh} className="px-4 py-2 theme-button-primary rounded">Try Again</button>
                        </div>
                    </div>
                )}

                <webview
                    ref={webviewRef}
                    className="absolute inset-0 w-full h-full"
                    partition={`persist:${viewId}`}
                    style={{ visibility: error ? 'hidden' : 'visible' }}
                />
            </div>
        </div>
    );
});

export default WebBrowserViewer;