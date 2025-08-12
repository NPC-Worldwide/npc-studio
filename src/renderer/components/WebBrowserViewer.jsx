import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Globe } from 'lucide-react';

const WebBrowserViewer = ({ initialUrl, viewId }) => {
    const containerRef = useRef(null);
    const mountedRef = useRef(false);
    const [currentUrl, setCurrentUrl] = useState(initialUrl || 'https://google.com');
    const [urlInput, setUrlInput] = useState(currentUrl);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('Browser');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    const updateBounds = useCallback(() => {
        if (containerRef.current && mountedRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const bounds = {
                x: Math.round(rect.left),
                y: Math.round(rect.top + 40), // Account for toolbar
                width: Math.round(rect.width),
                height: Math.round(rect.height - 40)
            };
            
            window.api?.updateBrowserBounds?.({ viewId, bounds });
        }
    }, [viewId]);

    // Handle navigation
    const handleNavigate = useCallback(() => {
        if (urlInput.trim()) {
            setCurrentUrl(urlInput);
            window.api?.browserNavigate?.({ viewId, url: urlInput });
        }
    }, [urlInput, viewId]);

    const handleBack = useCallback(() => {
        window.api?.browserBack?.({ viewId });
    }, [viewId]);

    const handleForward = useCallback(() => {
        window.api?.browserForward?.({ viewId });
    }, [viewId]);

    const handleRefresh = useCallback(() => {
        window.api?.browserRefresh?.({ viewId });
    }, [viewId]);

    // Context menu handler
    const handleContextMenu = useCallback(async (e) => {
        e.preventDefault();
        
        // Get selected text from the browser view
        const result = await window.api?.browserGetSelectedText?.({ viewId });
        if (result?.success && result.selectedText) {
            // Show context menu with AI options
            showBrowserContextMenu(e.clientX, e.clientY, result.selectedText);
        }
    }, [viewId]);

    const showBrowserContextMenu = (x, y, selectedText) => {
        // This would integrate with your existing AI context menu system
        // For now, just log it
        console.log('Browser context menu at', x, y, 'with text:', selectedText);
        // You can integrate this with your existing AI edit modal system
    };

    useEffect(() => {
        if (!containerRef.current) return;

        mountedRef.current = true;
        
        const rect = containerRef.current.getBoundingClientRect();
        const bounds = {
            x: Math.round(rect.left),
            y: Math.round(rect.top + 40), // Account for toolbar
            width: Math.round(rect.width),
            height: Math.round(rect.height - 40)
        };
        
        console.log('[WebBrowserViewer] Mounting browser viewer for:', currentUrl);
        window.api?.showBrowser?.({ url: currentUrl, bounds, viewId });

        // Set up event listeners
        const cleanupLoaded = window.api?.onBrowserLoaded?.((data) => {
            if (data.viewId === viewId) {
                setCurrentUrl(data.url);
                setUrlInput(data.url);
                setLoading(false);
                
                // Add to history automatically
                window.api?.browserAddToHistory?.({
                    url: data.url,
                    title: title || data.url,
                    folderPath: currentPath // You'll need to pass this as a prop
                });
            }
        });
        
        const cleanupLoading = window.api?.onBrowserLoading?.((data) => {
            if (data.viewId === viewId) {
                setLoading(data.loading);
            }
        });

        const cleanupTitle = window.api?.onBrowserTitleUpdated?.((data) => {
            if (data.viewId === viewId) {
                setTitle(data.title);
            }
        });

        const cleanupError = window.api?.onBrowserLoadError?.((data) => {
            if (data.viewId === viewId) {
                setLoading(false);
                console.error('Browser load error:', data.error);
            }
        });

        // Set up resize observer
        const resizeObserver = new ResizeObserver(updateBounds);
        resizeObserver.observe(containerRef.current);

        return () => {
            if (mountedRef.current) {
                console.log('[WebBrowserViewer] Unmounting browser viewer');
                window.api?.hideBrowser?.({ viewId });
                mountedRef.current = false;
            }
            
            resizeObserver.disconnect();
            cleanupLoaded?.();
            cleanupLoading?.();
            cleanupTitle?.();
            cleanupError?.();
        };
    }, []); // Empty dependency array - only run once when mounted

    return (
        <div 
            ref={containerRef} 
            className="flex flex-col w-full h-full bg-gray-800"
            >
            {/* Browser Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-700 h-10">
                <button
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className="p-1 theme-hover rounded disabled:opacity-50"
                    title="Back"
                >
                    <ArrowLeft size={16} />
                </button>
                
                <button
                    onClick={handleForward}
                    disabled={!canGoForward}
                    className="p-1 theme-hover rounded disabled:opacity-50"
                    title="Forward"
                >
                    <ArrowRight size={16} />
                </button>
                
                <button
                    onClick={handleRefresh}
                    className="p-1 theme-hover rounded"
                    title="Refresh"
                >
                    <RotateCcw size={16} />
                </button>
                
                <div className="flex-1 flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" />
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleNavigate();
                            }
                        }}
                        placeholder="Enter URL..."
                        className="flex-1 theme-input text-sm rounded px-3 py-1 border focus:outline-none"
                    />
                    <button
                        onClick={handleNavigate}
                        className="px-3 py-1 theme-button-primary rounded text-sm"
                    >
                        Go
                    </button>
                </div>
                
                {loading && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                    </div>
                )}
            </div>

            {/* Browser Content Area - BrowserView will be positioned here */}
            <div className="flex-1 relative bg-white">
                {/* Fallback content - only visible if BrowserView fails */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                    <div className="text-center">
                        <Globe size={48} className="mx-auto mb-2 text-gray-400" />
                        <div>Loading website...</div>
                        <div className="text-sm mt-2">{currentUrl}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebBrowserViewer;