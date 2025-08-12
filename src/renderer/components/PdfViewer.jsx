import React, { useState, useEffect, useRef } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import { selectionModePlugin } from '@react-pdf-viewer/selection-mode';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

const normalizePath = (p) => (p || '').replace(/\\/g, '/');

const PdfViewer = ({ filePath, onTextSelect, onContextMenu }) => {
    // --- All hooks at the top level. No conditions before them. ---
    const [pdfData, setPdfData] = useState(null);
    const [highlights, setHighlights] = useState([]);
    const latestSelectionData = useRef(null);

    // --- Load PDF and Highlights ---
    useEffect(() => {
        if (!filePath) {
            setPdfData(null);
            setHighlights([]);
            return;
        }

        const loadFileAndHighlights = async () => {
            try {
                const buffer = await window.api.readFile(filePath);
                setPdfData(URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' })));

                const resp = await window.api.getHighlightsForFile(normalizePath(filePath));
                const loaded = (resp?.highlights || []).map((h) => ({
                    id: h.id,
                    content: { text: h.highlighted_text },
                    position: h.position,
                }));
                setHighlights(loaded);
            } catch (err) {
                console.error('[PDF_VIEWER] Failed to load file/highlights:', err);
                setPdfData(null);
                setHighlights([]);
            }
        };

        loadFileAndHighlights();
    }, [filePath]);

    // --- Create Plugins (Safely in the render body) ---
    const highlightPluginInstance = highlightPlugin({
        highlights,
        onHighlightAdded: async (highlight) => {
            const text = highlight?.content?.text || '';
            if (!text.trim()) return;

            const position = {
                pageIndex: highlight.pageIndex,
                rects: highlight.position?.rects || [],
                boundingRect: highlight.position?.boundingRect || null,
                quads: highlight.position?.quads || [],
            };

            const saveResult = await window.api.addPdfHighlight({
                filePath: normalizePath(filePath),
                text,
                position,
            });

            if (saveResult && !saveResult.error) {
                setHighlights((prev) => [...prev, { id: saveResult.lastID, content: { text }, position }]);
            }
        },
    });

    const plugins = [defaultLayoutPlugin(), selectionModePlugin(), highlightPluginInstance];

    // --- Restore Your Robust Selection Logic ---
    const handleTextSelectionChange = (e) => {
        // This is the official plugin event. We use it to get the most accurate data.
        if (e?.selectedText?.trim()) {
            const selectionData = {
                selectedText: e.selectedText,
                pageIndex: e.pageIndex,
                quads: e.selectionRegion?.rects || e.quads || [],
            };
            latestSelectionData.current = selectionData;
            // Notify the parent immediately.
            if (onTextSelect) onTextSelect(selectionData);
        }
    };

    const handleContextMenuWrapper = (e) => {
        // This is the aggressive fallback from your working code.
        // It ensures that even if onTextSelectionChange hasn't fired,
        // we capture the selection right before showing the context menu.
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText) {
            latestSelectionData.current = {
                ...latestSelectionData.current, // Keep pageIndex if we have it
                selectedText: selectedText,
            };
            // Forcefully update the parent component. This fixes the bug.
            if (onTextSelect) onTextSelect(latestSelectionData.current);
        }
        
        // Now, call the parent's context menu handler.
        if (onContextMenu) {
            onContextMenu(e);
        }
        
        // Prevent the default browser menu.
        e.preventDefault();
    };

    // --- The only early return, safely after all hooks have been called. ---
    if (!pdfData) {
        return <div>Loading PDF...</div>;
    }

    return (
        <div
            style={{ height: '100vh', width: '100%', overflow: 'hidden' }}
            onContextMenu={handleContextMenuWrapper}
        >
            <Worker workerUrl="/pdf.worker.min.js">
                <Viewer
                    fileUrl={pdfData}
                    plugins={plugins}
                    onTextSelectionChange={handleTextSelectionChange}
                />
            </Worker>
        </div>
    );
};

export default PdfViewer;