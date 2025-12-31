import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Globe, Home, X, Plus, Settings, Trash2, Lock, GripVertical, Puzzle, Download, FolderOpen } from 'lucide-react';

const WebBrowserViewer = memo(({
    nodeId,
    contentDataRef,
    currentPath,
    setBrowserContextMenuPos,
    handleNewBrowserTab,
    setRootLayoutNode,
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
    const [showExtensionsMenu, setShowExtensionsMenu] = useState(false);
    const [extensions, setExtensions] = useState([]);
    const [installedBrowsers, setInstalledBrowsers] = useState([]);
    const [importStatus, setImportStatus] = useState<{ importing: boolean; message?: string } | null>(null);
    const [isSecure, setIsSecure] = useState(false);

    // Search engine configuration
    const SEARCH_ENGINES = {
        duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
        startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=' },
        google: { name: 'Google', url: 'https://www.google.com/search?q=' },
        perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=' },
        brave: { name: 'Brave', url: 'https://search.brave.com/search?q=' },
    };
    const [searchEngine, setSearchEngine] = useState(() => {
        return localStorage.getItem('npc-browser-search-engine') || 'duckduckgo';
    });

    // Track navigation type for history graph
    const isManualNavigationRef = useRef(false);
    const previousUrlRef = useRef<string | null>(null);
    const lastHistorySaveRef = useRef<string | null>(null);
    const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitializedRef = useRef(false);
    const lastKnownPaneUrlRef = useRef<string | null>(null);

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
                // Also update our tracking ref to prevent the tab-switch effect from re-navigating
                lastKnownPaneUrlRef.current = url;

                // Also update the active tab's browserUrl so tabs maintain separate URLs
                const paneData = contentDataRef.current[nodeId];
                if (paneData?.tabs && paneData.activeTabIndex !== undefined) {
                    const activeTab = paneData.tabs[paneData.activeTabIndex];
                    if (activeTab && activeTab.contentType === 'browser') {
                        activeTab.browserUrl = url;
                    }
                }
            }
        };

        const handlePageTitleUpdated = (e) => {
            const newTitle = e.title || 'Browser';
            setTitle(newTitle);

            // Update paneData title without triggering layout re-renders
            // The title state update above handles the local display
            if (contentDataRef.current[nodeId]) {
                contentDataRef.current[nodeId].browserTitle = newTitle;

                // Also update the active tab's browserTitle so tabs maintain separate titles
                const paneData = contentDataRef.current[nodeId];
                if (paneData?.tabs && paneData.activeTabIndex !== undefined) {
                    const activeTab = paneData.tabs[paneData.activeTabIndex];
                    if (activeTab && activeTab.contentType === 'browser') {
                        activeTab.browserTitle = newTitle;
                    }
                }
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

        // Handle links that try to open in new windows (target="_blank", window.open, etc.)
        const handleNewWindow = (e) => {
            e.preventDefault();
            const url = e.url;
            if (url && url !== 'about:blank') {
                // Open in the same webview instead of blocking
                webview.src = url;
            }
        };

        // Handle permission requests (camera, microphone, geolocation, etc.)
        const handlePermissionRequest = (e) => {
            // Allow common permissions, deny others
            const allowedPermissions = ['clipboard-read', 'clipboard-write', 'notifications'];
            if (allowedPermissions.includes(e.permission)) {
                e.request.allow();
            } else {
                // For now, deny other permissions - could add UI to prompt user
                e.request.deny();
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('did-navigate-in-page', handleDidNavigate);
        webview.addEventListener('page-title-updated', handlePageTitleUpdated);
        webview.addEventListener('did-fail-load', handleDidFailLoad);
        webview.addEventListener('new-window', handleNewWindow);
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
                webview.removeEventListener('new-window', handleNewWindow);
                // webview.removeEventListener('context-menu', handleWebviewContextMenu);
            }
        };
    // Note: initialUrl and paneData removed from deps to prevent reload loops
    // The initial URL is captured in a ref and only used once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath, viewId, nodeId, setBrowserContextMenuPos, setRootLayoutNode]);

    // Effect to handle tab switching - navigate when paneData.browserUrl changes externally
    useEffect(() => {
        const webview = webviewRef.current;
        const paneUrl = contentDataRef.current[nodeId]?.browserUrl;

        // Initialize the ref on first run
        if (lastKnownPaneUrlRef.current === null) {
            lastKnownPaneUrlRef.current = paneUrl || null;
            return;
        }

        // Only navigate if the paneUrl changed externally (tab switch) and differs from current
        if (webview && paneUrl && hasInitializedRef.current && paneUrl !== lastKnownPaneUrlRef.current) {
            let urlToLoad = paneUrl;
            if (!paneUrl.startsWith('http')) {
                if (paneUrl === 'about:blank') {
                    urlToLoad = 'https://google.com';
                } else {
                    const isLocalhost = paneUrl.startsWith('localhost') || paneUrl.startsWith('127.0.0.1');
                    urlToLoad = isLocalhost ? `http://${paneUrl}` : `https://${paneUrl}`;
                }
            }
            lastKnownPaneUrlRef.current = paneUrl;
            webview.src = urlToLoad;
        }
    });

    const handleNavigate = useCallback(() => {
        const input = urlInput.trim();
        if (!input) return;

        let finalUrl = input;

        // Check if it's a URL or a search query
        const isUrl = input.startsWith('http://') ||
                      input.startsWith('https://') ||
                      input.startsWith('localhost') ||
                      input.startsWith('127.0.0.1') ||
                      /^[\w-]+\.(com|org|net|io|co|ai|dev|app|me|edu|gov|info|biz|tv|cc|xyz|tech|online|site|store|blog|cloud|wiki|video|news|live|link|page|space|world|today|zone|network|solutions|digital|agency|studio|design|media|software|systems|services|group|team|labs|works)(\/.*)?$/i.test(input);

        if (isUrl) {
            // It's a URL - add protocol if missing
            if (!input.startsWith('http')) {
                const isLocalhost = input.startsWith('localhost') || input.startsWith('127.0.0.1');
                finalUrl = isLocalhost ? `http://${input}` : `https://${input}`;
            }
        } else {
            // It's a search query - use the configured search engine
            const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.duckduckgo;
            finalUrl = engine.url + encodeURIComponent(input);
        }

        // Mark this as manual navigation (user typed URL)
        isManualNavigationRef.current = true;
        if (webviewRef.current) webviewRef.current.src = finalUrl;
    }, [urlInput, searchEngine]);

    const handleBack = useCallback(() => webviewRef.current?.goBack(), []);
    const handleForward = useCallback(() => webviewRef.current?.goForward(), []);
    const handleRefresh = useCallback(() => webviewRef.current?.reload(), []);

    // Backspace to go back in history (when not in a text field)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                // Don't intercept if typing in an input, textarea, or contenteditable
                const target = e.target as HTMLElement;
                const isTextInput = target.tagName === 'INPUT' ||
                                   target.tagName === 'TEXTAREA' ||
                                   target.isContentEditable;
                if (!isTextInput && canGoBack) {
                    e.preventDefault();
                    handleBack();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [canGoBack, handleBack]);
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

    // Extension management
    const loadExtensions = useCallback(async () => {
        const result = await (window as any).api?.browserGetExtensions?.();
        if (result?.success) {
            setExtensions(result.extensions || []);
        }
        const browsersResult = await (window as any).api?.browserGetInstalledBrowsers?.();
        if (browsersResult?.success) {
            setInstalledBrowsers(browsersResult.browsers || []);
        }
    }, []);

    const handleAddExtension = useCallback(async () => {
        const result = await (window as any).api?.browserSelectExtensionFolder?.();
        if (result?.success && result.path) {
            const loadResult = await (window as any).api?.browserLoadExtension?.(result.path);
            if (loadResult?.success) {
                loadExtensions();
            } else {
                console.error('[Extensions] Failed to load:', loadResult?.error);
            }
        }
    }, [loadExtensions]);

    const handleRemoveExtension = useCallback(async (extId: string) => {
        const result = await (window as any).api?.browserRemoveExtension?.(extId);
        if (result?.success) {
            loadExtensions();
        }
    }, [loadExtensions]);

    const handleImportFromBrowser = useCallback(async (browserKey: string) => {
        setImportStatus({ importing: true, message: 'Importing...' });
        const result = await (window as any).api?.browserImportExtensionsFrom?.({ browserKey });
        if (result?.success) {
            const imported = result.imported?.length || 0;
            const skipped = result.skipped?.length || 0;
            let msg = `Imported ${imported} extension${imported !== 1 ? 's' : ''}`;
            if (skipped > 0) {
                msg += `, skipped ${skipped} (MV3)`;
            }
            setImportStatus({ importing: false, message: msg });
            loadExtensions();
            setTimeout(() => setImportStatus(null), 3000);
        } else {
            setImportStatus({ importing: false, message: result?.error || 'Import failed' });
            setTimeout(() => setImportStatus(null), 3000);
        }
    }, [loadExtensions]);

    // Load extensions when menu opens
    useEffect(() => {
        if (showExtensionsMenu) {
            loadExtensions();
        }
    }, [showExtensionsMenu, loadExtensions]);

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
        >
            {/* Browser Header */}
            <div
                className="flex theme-bg-tertiary border-b theme-border flex-shrink-0 cursor-move"
                draggable={true}
                onDragStart={(e) => {
                    const nodePath = findNodePath(rootLayoutNode, nodeId);
                    if (nodePath) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pane', id: nodeId, nodePath }));
                        setTimeout(() => {
                            setDraggedItem({ type: 'pane', id: nodeId, nodePath });
                        }, 0);
                    }
                }}
                onDragEnd={() => setDraggedItem(null)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const nodePath = findNodePath(rootLayoutNode, nodeId);
                    setPaneContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, nodeId, nodePath });
                }}
            >
                {/* Left: Nav buttons */}
                <div className="flex items-center gap-0.5 px-1 border-r theme-border">
                    <button onClick={handleBack} disabled={!canGoBack} className="p-1 theme-hover rounded disabled:opacity-30" title="Back"><ArrowLeft size={16} /></button>
                    <button onClick={handleForward} disabled={!canGoForward} className="p-1 theme-hover rounded disabled:opacity-30" title="Forward"><ArrowRight size={16} /></button>
                    <button onClick={handleRefresh} className="p-1 theme-hover rounded" title="Refresh"><RotateCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
                    <button onClick={handleHome} className="p-1 theme-hover rounded" title="Home"><Home size={16} /></button>
                </div>

                {/* Right: Title row + Address row */}
                <div className="flex-1 flex flex-col min-w-0 py-0.5 gap-0.5">
                    {/* Title row */}
                    <div className="flex items-center gap-1 px-1.5 h-5">
                        <GripVertical size={12} className="flex-shrink-0 theme-text-muted" />
                        <Globe size={12} className="text-blue-400 flex-shrink-0" />
                        <span className="flex-1 text-xs theme-text-primary truncate" title={title}>{title}</span>
                    </div>
                    {/* Address row */}
                    <div className="flex items-center gap-1 px-1.5 h-5">
                        <div className="flex-1 max-w-[50%] flex items-center gap-1 min-w-0 theme-bg-secondary rounded px-1.5 h-full">
                            {isSecure ? <Lock size={12} className="text-green-400 flex-shrink-0" /> : <Globe size={12} className="text-gray-400 flex-shrink-0" />}
                            <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNavigate()} placeholder="Search or enter URL..." className="flex-1 bg-transparent text-xs theme-text-primary outline-none min-w-0" onDragStart={(e) => e.stopPropagation()} draggable={false} />
                        </div>
                        <button onClick={() => handleNewBrowserTab('')} className="p-0.5 theme-hover rounded" title="New browser"><Plus size={12} /></button>
                    </div>
                </div>

                {/* Far right: Extensions + Settings + Close in one row */}
                <div className="flex items-center gap-0.5 px-1 border-l theme-border">
                    {/* Extensions button */}
                    <div className="relative">
                        <button onClick={() => { setShowExtensionsMenu(!showExtensionsMenu); setShowSessionMenu(false); }} className={`p-1 theme-hover rounded ${extensions.length > 0 ? 'text-purple-400' : ''}`} title="Extensions"><Puzzle size={16} /></button>
                        {showExtensionsMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowExtensionsMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 theme-bg-secondary border theme-border rounded-lg shadow-lg z-50 min-w-[280px] max-h-[400px] overflow-auto">
                                    <div className="p-2 border-b theme-border flex items-center justify-between">
                                        <span className="text-xs font-medium theme-text-primary">Extensions</span>
                                        <button onClick={handleAddExtension} className="p-1 theme-hover rounded text-green-400" title="Add extension from folder"><FolderOpen size={14} /></button>
                                    </div>

                                    {/* Installed extensions */}
                                    {extensions.length > 0 ? (
                                        <div className="py-1 border-b theme-border">
                                            {extensions.map((ext: any) => (
                                                <div key={ext.id} className="flex items-center justify-between px-3 py-1.5 theme-hover">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs theme-text-primary truncate">{ext.name}</div>
                                                        <div className="text-[10px] theme-text-muted">v{ext.version}</div>
                                                    </div>
                                                    <button onClick={() => handleRemoveExtension(ext.id)} className="p-1 theme-hover rounded text-red-400" title="Remove"><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-3 py-2 text-xs theme-text-muted text-center border-b theme-border">No extensions installed</div>
                                    )}

                                    {/* Import status */}
                                    {importStatus && (
                                        <div className={`px-3 py-2 text-xs text-center border-b theme-border ${importStatus.importing ? 'text-blue-400' : 'text-green-400'}`}>
                                            {importStatus.message}
                                        </div>
                                    )}

                                    {/* Import from browsers */}
                                    {installedBrowsers.length > 0 && !importStatus?.importing && (
                                        <div className="py-1">
                                            <div className="px-3 py-1 text-[10px] theme-text-muted uppercase">Import from (MV2 only)</div>
                                            {installedBrowsers.filter((b: any) => b.key !== 'firefox').map((browser: any) => (
                                                <button key={browser.key} onClick={() => handleImportFromBrowser(browser.key)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left">
                                                    <Download size={12} />{browser.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Settings button */}
                    <div className="relative">
                        <button onClick={() => { setShowSessionMenu(!showSessionMenu); setShowExtensionsMenu(false); }} className="p-1 theme-hover rounded" title="Settings"><Settings size={16} /></button>
                        {showSessionMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowSessionMenu(false)} />
                                <div className="absolute right-0 top-full mt-1 theme-bg-secondary border theme-border rounded-lg shadow-lg z-50 min-w-[200px]">
                                    <div className="p-2 border-b theme-border">
                                        <span className="text-xs theme-text-muted block mb-1">Search Engine</span>
                                        <select value={searchEngine} onChange={(e) => { setSearchEngine(e.target.value); localStorage.setItem('npc-browser-search-engine', e.target.value); }} className="w-full text-xs theme-input rounded px-2 py-1">
                                            {Object.entries(SEARCH_ENGINES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="py-1">
                                        <button onClick={handleClearCookies} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left"><Trash2 size={12} />Clear Cookies</button>
                                        <button onClick={handleClearCache} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs theme-hover text-left"><Trash2 size={12} />Clear Cache</button>
                                        <button onClick={handleClearSessionData} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 theme-hover text-left"><Trash2 size={12} />Clear All</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); const p = findNodePath(rootLayoutNode, nodeId); if (p) closeContentPane(nodeId, p); }} className="p-1 theme-hover rounded hover:text-red-400" title="Close"><X size={16} /></button>
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