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