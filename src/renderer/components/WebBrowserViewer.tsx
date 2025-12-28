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
    const lastHistorySaveRef = useRef<string | null>(null);
    const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitializedRef = useRef(false);

    const paneData = contentDataRef.current[nodeId];
    // Capture initial URL only once using a ref to prevent reload loops
    const initialUrlRef = useRef(paneData?.browserUrl || 'about:blank');
    // Use 'default' as the shared session to persist cookies across all browser panes
    // This ensures users stay logged into sites when opening new browser tabs
    const viewId = 'default-browser-session';

    // Expose getPageContent method through contentDataRef for context gathering
    useEffect(() => {
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].getPageContent = async () => {
                const webview = webviewRef.current;
                if (!webview) return { success: false, content: '', url: '', title: '' };

                try {
                    const content = await webview.executeJavaScript(`
                        (function() {
                            const main = document.querySelector('main, article, .content, #content') || document.body;
                            const clone = main.cloneNode(true);
                            clone.querySelectorAll('script, style, nav, footer, aside, .nav, .footer, .ads').forEach(el => el.remove());
                            let text = clone.innerText || clone.textContent;
                            text = text.replace(/\\s+/g, ' ').trim();
                            return text.substring(0, 8000);
                        })();
                    `);
                    return {
                        success: true,
                        content: content,
                        url: webview.getURL(),
                        title: webview.getTitle()
                    };
                } catch (err) {
                    console.error('[WebBrowser] Failed to get page content:', err);
                    return { success: false, content: '', url: currentUrl, title: title };
                }
            };
        }
    }, [nodeId, currentUrl, title]);

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        // Only set the URL on first initialization to prevent reload loops
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            const initialUrl = initialUrlRef.current;
            let urlToLoad = initialUrl;
            if (!initialUrl.startsWith('http')) {
                if (initialUrl === 'about:blank') {
                    urlToLoad = 'https://google.com';
                } else {
                    const isLocalhost = initialUrl.startsWith('localhost') || initialUrl.startsWith('127.0.0.1');
                    urlToLoad = isLocalhost ? `http://${initialUrl}` : `https://${initialUrl}`;
                }
            }

            setCurrentUrl(urlToLoad);
            setUrlInput(urlToLoad);
            webview.src = urlToLoad;
        }
        webview.setAttribute('partition', `persist:${viewId}`); // Ensure persistence per pane

        const handleDidStartLoading = () => setLoading(true);
        const handleDidStopLoading = () => {
            setLoading(false);
            if (webview) {
                setCanGoBack(webview.canGoBack());
                setCanGoForward(webview.canGoForward());
                // Update title in contentDataRef for PaneHeader (use ref to avoid closure issues)
                if (contentDataRef.current[nodeId]) {
                    contentDataRef.current[nodeId].browserTitle = webview.getTitle();
                }
            }
        };

        const handleDidNavigate = (e) => {
            const url = e.url;

            // Skip if this is the same URL we just processed (prevents loops)
            if (url === previousUrlRef.current) {
                return;
            }

            const fromUrl = previousUrlRef.current;
            const navigationType = isManualNavigationRef.current ? 'manual' : 'click';

            setCurrentUrl(url);
            setUrlInput(url);
            setError(null);
            setIsSecure(url.startsWith('https://'));

            // Debounce history saves to prevent rapid-fire saves during redirects
            if (url && url !== 'about:blank' && url !== lastHistorySaveRef.current) {
                // Clear any pending history save
                if (historyDebounceRef.current) {
                    clearTimeout(historyDebounceRef.current);
                }

                // Debounce the history save by 2 seconds to let redirects fully settle
                historyDebounceRef.current = setTimeout(() => {
                    // Only save if URL hasn't changed since the timeout was set
                    const currentWebviewUrl = webview?.getURL?.();
                    if (currentWebviewUrl && url === currentWebviewUrl) {
                        lastHistorySaveRef.current = url;
                        (window as any).api?.browserAddToHistory?.({
                            url,
                            title: webview.getTitle() || url,
                            folderPath: currentPath,
                            paneId: nodeId,
                            navigationType,
                            fromUrl
                        }).catch((err: any) => console.error('[Browser] History save error:', err));
                    }
                }, 2000);
            }

            // Update tracking refs
            previousUrlRef.current = url;
            isManualNavigationRef.current = false; // Reset after navigation

            // Update paneData url to reflect navigation (but don't trigger re-renders)
            if (contentDataRef.current[nodeId]) {
                contentDataRef.current[nodeId].browserUrl = url;
            }
        };

        const handlePageTitleUpdated = (e) => {
            const newTitle = e.title || 'Browser';
            setTitle(newTitle);

            // Update paneData title without triggering layout re-renders
            // The title state update above handles the local display
            if (contentDataRef.current[nodeId]) {
                contentDataRef.current[nodeId].browserTitle = newTitle;
            }
            // NOTE: Removed setRootLayoutNode call - it was causing render loops
            // The pane header will get the title from local state instead
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
            // Clear debounce timeouts
            if (historyDebounceRef.current) {
                clearTimeout(historyDebounceRef.current);
            }

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
    // Note: initialUrl and paneData removed from deps to prevent reload loops
    // The initial URL is captured in a ref and only used once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath, viewId, nodeId, setBrowserContextMenuPos, setRootLayoutNode]);

    const handleNavigate = useCallback(() => {
        const targetUrl = urlInput;
        if (!targetUrl.trim()) return;
        // Use http:// for localhost/127.0.0.1, https:// for everything else
        let finalUrl = targetUrl;
        if (!targetUrl.startsWith('http')) {
            const isLocalhost = targetUrl.startsWith('localhost') || targetUrl.startsWith('127.0.0.1');
            finalUrl = isLocalhost ? `http://${targetUrl}` : `https://${targetUrl}`;
        }
        // Mark this as manual navigation (user typed URL)
        isManualNavigationRef.current = true;
        if (webviewRef.current) webviewRef.current.src = finalUrl;
    }, [urlInput]);

    const handleBack = useCallback(() => webviewRef.current?.goBack(), []);
    const handleForward = useCallback(() => webviewRef.current?.goForward(), []);
    const handleRefresh = useCallback(() => webviewRef.current?.reload(), []);
    const handleHome = useCallback(() => {
        const initial = initialUrlRef.current;
        let homeUrl = initial;
        if (!initial.startsWith('http')) {
            if (initial === 'about:blank') {
                homeUrl = 'https://google.com';
            } else {
                const isLocalhost = initial.startsWith('localhost') || initial.startsWith('127.0.0.1');
                homeUrl = isLocalhost ? `http://${initial}` : `https://${initial}`;
            }
        }
        if (webviewRef.current) webviewRef.current.src = homeUrl;
    }, []);

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