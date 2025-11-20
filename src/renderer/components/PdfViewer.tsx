import React, { useState, useEffect, useRef } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import './PdfViewer.css';

const normalizePath = (p) => (p || '').replace(/\\/g, '/');

const PdfViewer = ({ filePath, onTextSelect, onContextMenu, highlights, onHighlightAddedCallback }) => {
    const [pdfData, setPdfData] = useState(null);
    const [error, setError] = useState(null);
    const viewerWrapperRef = useRef(null);

    const workerUrl = `${window.location.origin}/pdf.worker.min.js`;

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        let currentBlobUrl = null;

        if (!filePath) {
            setPdfData(null);
            setError(null);
            return;
        }

        const loadFile = async () => {
            setError(null);
            try {
                const buffer = await window.api.readFile(filePath);
                if (!buffer || buffer.byteLength === 0) {
                    setError('Empty file');
                    return;
                }
                currentBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
                setPdfData(currentBlobUrl);
            } catch (err) {
                setError(err.message);
            }
        };

        loadFile();

        return () => {
            if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        };
    }, [filePath]);

    useEffect(() => {
        const wrapper = viewerWrapperRef.current;
        if (!wrapper) return;

        const handleMouseUp = (e) => {
            if (!wrapper.contains(e.target)) return;
            
            setTimeout(() => {
                const selection = window.getSelection();
                const text = selection?.toString().trim();
                
                console.log('[PDF] mouseup, text:', text ? text.substring(0, 30) : 'NONE');
                
                if (text && text.length > 0 && onTextSelect) {
                    console.log('[PDF] Calling onTextSelect');
                    const range = selection.getRangeAt(0);
                    const rects = Array.from(range.getClientRects());
                    
                    const containerRect = wrapper.getBoundingClientRect();
                    
                    const position = {
                        pageIndex: 0,
                        rects: rects.map(rect => ({
                            pageIndex: 0,
                            left: ((rect.left - containerRect.left) / containerRect.width) * 100,
                            top: ((rect.top - containerRect.top) / containerRect.height) * 100,
                            width: (rect.width / containerRect.width) * 100,
                            height: (rect.height / containerRect.height) * 100
                        }))
                    };
                    
                    onTextSelect({
                        selectedText: text,
                        position: position,
                        timestamp: Date.now()
                    });
                }
            }, 50);
        };

        const handleContextMenu = (e) => {
            if (!wrapper.contains(e.target)) return;
            
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            
            console.log('[PDF] contextmenu, text:', text ? text.substring(0, 30) : 'NONE');
            
            if (text && text.length > 0 && onContextMenu) {
                console.log('[PDF] Calling onContextMenu');
                onContextMenu(e);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', handleContextMenu, true);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [onTextSelect, onContextMenu]);

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!pdfData) return <div className="p-4">Loading PDF...</div>;

    return (
        <div 
            ref={viewerWrapperRef}
            style={{
                height: '100%',
                width: '100%',
                position: 'relative'
            }}
        >
            <Worker workerUrl={workerUrl}>
                <Viewer
                    fileUrl={pdfData}
                    plugins={[defaultLayoutPluginInstance]}
                />
            </Worker>
            
            {highlights && highlights.length > 0 && highlights.map((highlight, idx) => {
                const rects = highlight.position?.rects || [];
                if (rects.length === 0) return null;
                
                return rects.map((rect, rectIdx) => (
                    <div
                        key={`${idx}-${rectIdx}`}
                        style={{
                            position: 'fixed',
                            left: `${rect.left}%`,
                            top: `${rect.top}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: 'rgba(255, 255, 0, 0.4)',
                            pointerEvents: 'none',
                            zIndex: 9999
                        }}
                    />
                ));
            })}
        </div>
    );
};

export default PdfViewer;



    const loadPdfHighlightsForActivePane = useCallback(async () => {
        console.log('[LOAD_HIGHLIGHTS] Starting load for pane:', activeContentPaneId);
        
        if (activeContentPaneId) {
            const paneData = contentDataRef.current[activeContentPaneId];
            console.log('[LOAD_HIGHLIGHTS] Pane data:', paneData);
            
            if (paneData && paneData.contentType === 'pdf') {
                console.log('[LOAD_HIGHLIGHTS] Fetching highlights for:', paneData.contentId);
                
                const response = await window.api.getHighlightsForFile(paneData.contentId);
                console.log('[LOAD_HIGHLIGHTS] Response:', response);
                
                if (response.highlights) {
                    console.log('[LOAD_HIGHLIGHTS] Raw highlights count:', response.highlights.length);
                    
                    const transformedHighlights = response.highlights.map(h => {
                        console.log('[LOAD_HIGHLIGHTS] Transforming highlight:', h);
                        
                        const positionObject = typeof h.position === 'string' 
                            ? JSON.parse(h.position) 
                            : h.position;
    
                        return {
                            id: h.id,
                            position: positionObject,
                            content: {
                                text: h.highlighted_text,
                                annotation: h.annotation || ''
                            }
                        };
                    });
                    
                    console.log('[LOAD_HIGHLIGHTS] Setting highlights:', transformedHighlights);
                    setPdfHighlights(transformedHighlights);
                } else {
                    console.log('[LOAD_HIGHLIGHTS] No highlights in response');
                    setPdfHighlights([]);
                }
            } else {
                console.log('[LOAD_HIGHLIGHTS] Not a PDF pane or no pane data');
                setPdfHighlights([]);
            }
        } else {
            console.log('[LOAD_HIGHLIGHTS] No active content pane');
        }
    }, [activeContentPaneId]);

    
        const renderPdfContextMenu = () => {
           
           
           
           
           
           
        
            return pdfContextMenuPos && (
                <>
    
                    <div className="fixed inset-0 z-40" onClick={() => {
                   
                        setPdfContextMenuPos(null);
                    }} />
                    <div
                        className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                        style={{ top: pdfContextMenuPos.y, left: pdfContextMenuPos.x }}
                    >
                        <button onClick={handleCopyPdfText} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Copy</button>
                        <button onClick={handleHighlightPdfSelection} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Highlight</button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={() => handleApplyPromptToPdfText('summarize')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Summarize Text</button>
                        <button onClick={() => handleApplyPromptToPdfText('explain')} className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left">Explain Text</button>
                    </div>
                </>
            );
        };
        
    const handlePdfContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[PDF_CONTEXT] Context menu handler called');
        
        // The selected text should now be in selectedPdfText from handlePdfTextSelect
        if (selectedPdfText?.text && selectedPdfText.text.trim()) {
            console.log('[PDF_CONTEXT] Showing context menu with text:', selectedPdfText.text.substring(0, 50));
            setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
        } else {
            console.log('[PDF_CONTEXT] No valid text selected, showing menu anyway');
            // Show menu even without text - user might want other options
            setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    };
    const renderPdfViewer = useCallback(({ nodeId }) => {
        const paneData = contentDataRef.current[nodeId];
        if (!paneData?.contentId) return null;
    
        const handlePdfContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (selectedPdfText?.text) {
                setPdfContextMenuPos({ x: e.clientX, y: e.clientY });
            }
        };
    
        return (
            <div className="flex-1 flex flex-col theme-bg-secondary relative">
                {/* PaneHeader removed */}
                <div className="flex-1 min-h-0">
                    <PdfViewer
                        filePath={paneData.contentId}
                        highlights={pdfHighlights}
                        onTextSelect={handlePdfTextSelect}
                        onContextMenu={handlePdfContextMenu}
                        onHighlightAddedCallback={loadPdfHighlightsForActivePane}
                    />
                </div>
            </div>
        );
    }, [contentDataRef, selectedPdfText, pdfHighlights, handlePdfTextSelect, loadPdfHighlightsForActivePane, setPdfContextMenuPos]);
    