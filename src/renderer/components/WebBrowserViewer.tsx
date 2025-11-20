import React, { useEffect, useRef, useState, memo } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Globe, Home, X } from 'lucide-react';

const WebBrowserViewer = memo(({
    initialUrl,
    viewId,
    currentPath
    // Removed these props as they are now handled by the PaneHeader in LayoutNode:
    // nodeId,
    // findNodePath,
    // rootLayoutNode,
    // setDraggedItem,
    // setPaneContextMenu,
    // closeContentPane
}) => {
    const webviewRef = useRef(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('Browser');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const formattedUrl = initialUrl?.startsWith('http')
            ? initialUrl
            : `https://${initialUrl || 'google.com'}`;

        setCurrentUrl(formattedUrl);
        setUrlInput(formattedUrl);
        webview.src = formattedUrl;

        const handleDidStartLoading = () => setLoading(true);
        const handleDidStopLoading = () => {
            setLoading(false);
            if (webview) {
                setCanGoBack(webview.canGoBack());
                setCanGoForward(webview.canGoForward());
            }
        };

        const handleDidNavigate = (e) => {
            const url = e.url;
            setCurrentUrl(url);
            setUrlInput(url);
            setError(null);

            if (url && url !== 'about:blank') {
                window.api?.browserAddToHistory?.({
                    url,
                    title: webview.getTitle() || url,
                    folderPath: currentPath
                }).catch(err => console.error('[Browser] History save error:', err));
            }
        };

        const handlePageTitleUpdated = (e) => setTitle(e.title || 'Browser');
        const handleDidFailLoad = (e) => {
            if (e.errorCode !== -3) { // Ignore aborted loads
                setLoading(false);
                setError(`Failed to load page (Error ${e.errorCode})`);
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('did-navigate-in-page', handleDidNavigate);
        webview.addEventListener('page-title-updated', handlePageTitleUpdated);
        webview.addEventListener('did-fail-load', handleDidFailLoad);

        return () => {
            if (webview) {
                webview.removeEventListener('did-start-loading', handleDidStartLoading);
                webview.removeEventListener('did-stop-loading', handleDidStopLoading);
                webview.removeEventListener('did-navigate', handleDidNavigate);
                webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
                webview.removeEventListener('page-title-updated', handlePageTitleUpdated);
                webview.removeEventListener('did-fail-load', handleDidFailLoad);
            }
        };
    }, [initialUrl, currentPath]);

    const handleNavigate = () => {
        const targetUrl = urlInput;
        if (!targetUrl.trim()) return;
        const finalUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        if (webviewRef.current) webviewRef.current.src = finalUrl;
    };

    const handleBack = () => webviewRef.current?.goBack();
    const handleForward = () => webviewRef.current?.goForward();
    const handleRefresh = () => webviewRef.current?.reload();
    const handleHome = () => handleNavigate(initialUrl || 'https://google.com');

    // REMOVED: Layout-related functions and variables
    // const nodePath = findNodePath(rootLayoutNode, nodeId);
    // const handleDragStart = (e) => {
    //     e.dataTransfer.effectAllowed = 'move';
    //     e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pane', id: nodeId, nodePath }));
    //     setTimeout(() => setDraggedItem({ type: 'pane', id: nodeId, nodePath }), 0);
    // };
    // const handleDragEnd = () => setDraggedItem(null);
    // const handleContextMenu = (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     setPaneContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, nodeId, nodePath });
    // };

    return (
        <div
            className="flex flex-col flex-1 w-full min-h-0 bg-gray-900"
            // REMOVED: Layout-related drag-and-drop and context menu attributes
            // draggable="true"
            // onDragStart={handleDragStart}
            // onDragEnd={handleDragEnd}
            // onContextMenu={handleContextMenu}
        >
            {/* Browser Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <button onClick={handleBack} disabled={!canGoBack} className="p-1.5 theme-hover rounded disabled:opacity-30 flex-shrink-0" title="Back"><ArrowLeft size={16} /></button>
                <button onClick={handleForward} disabled={!canGoForward} className="p-1.5 theme-hover rounded disabled:opacity-30 flex-shrink-0" title="Forward"><ArrowRight size={16} /></button>
                <button onClick={handleRefresh} className="p-1.5 theme-hover rounded flex-shrink-0" title="Refresh"><RotateCcw size={16} className={loading ? 'animate-spin' : ''} /></button>
                <button onClick={handleHome} className="p-1.5 theme-hover rounded flex-shrink-0" title="Home"><Home size={16} /></button>

                <div className="flex-1 flex items-center gap-1.5 min-w-0 bg-gray-700 rounded px-2 py-1">
                    <Globe size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                        placeholder="Enter URL..."
                        className="flex-1 bg-transparent text-sm text-gray-200 outline-none min-w-0"
                    />
                </div>

                {/* REMOVED: The close button, as it's now in PaneHeader */}
                {/* <button onClick={(e) => { e.stopPropagation(); closeContentPane(nodeId, nodePath); }} onMouseDown={(e) => e.stopPropagation()} className="p-1.5 theme-hover rounded-full flex-shrink-0 hover:bg-red-500/20" title="Close pane">
                    <X size={14} className="hover:text-red-400" />
                </button> */}
            </div>

            {/* Webview Container */}
            <div className="flex-1 relative bg-gray-900">
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                        <div className="text-center p-6 max-w-md bg-gray-800 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-medium text-gray-200 mb-2">Failed to Load Page</h3>
                            <p className="text-gray-400 text-sm mb-4">{error}</p>
                            <button onClick={handleRefresh} className="px-4 py-2 bg-blue-600 text-white rounded">Try Again</button>
                        </div>
                    </div>
                )}

                <webview
                    ref={webviewRef}
                    className="w-full h-full"
                    partition={`persist:${viewId}`}
                    style={{ visibility: error ? 'hidden' : 'visible' }}
                />
            </div>
        </div>
    );
});

export default WebBrowserViewer;