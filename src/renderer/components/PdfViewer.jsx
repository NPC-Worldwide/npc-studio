// src/renderer/components/PdfViewer.jsx

import React, { useEffect, useRef } from 'react';

const PdfViewer = ({ filePath }) => {
    const placeholderRef = useRef(null);

    useEffect(() => {
        const placeholder = placeholderRef.current;
        if (!placeholder) return;

        // Function to calculate and send bounds
        const updateBounds = () => {
            const rect = placeholder.getBoundingClientRect();
            const bounds = {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
            
            // On the initial show, we send the file path.
            // On subsequent updates, we just send the new bounds.
            if (!window.pdfViewerInitialized) {
                 console.log('[PdfViewer] Initial show. Sending path and bounds to main:', filePath, bounds);
                window.api.showPdf({ filePath, bounds });
                window.pdfViewerInitialized = true;
            } else {
                 console.log('[PdfViewer] Resized. Sending new bounds to main:', bounds);
                window.api.updatePdfBounds(bounds);
            }
        };

        // Use a ResizeObserver to detect when the placeholder div is resized by the tiling manager
        const resizeObserver = new ResizeObserver(() => {
            updateBounds();
        });
        
        resizeObserver.observe(placeholder);

        // Initial call
        updateBounds();

        // Cleanup function when the component unmounts (pane is closed or content changes)
        return () => {
            console.log('[PdfViewer] Cleanup. Hiding PDF view.');
            resizeObserver.unobserve(placeholder);
            window.api.hidePdf();
            window.pdfViewerInitialized = false; // Reset for the next PDF
        };
    }, [filePath]); // This effect re-runs ONLY when you open a NEW PDF file

    return (
        <div ref={placeholderRef} className="w-full h-full bg-gray-800 flex items-center justify-center">
            <p className="text-gray-400">Loading PDF Viewer...</p>
        </div>
    );
};

export default PdfViewer;