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
   
    const [pdfData, setPdfData] = useState(null);
    const [highlights, setHighlights] = useState([]);
    const latestSelectionData = useRef(null);

   
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

   
    const handleTextSelectionChange = (e) => {
       
        if (e?.selectedText?.trim()) {
            const selectionData = {
                selectedText: e.selectedText,
                pageIndex: e.pageIndex,
                quads: e.selectionRegion?.rects || e.quads || [],
            };
            latestSelectionData.current = selectionData;
           
            if (onTextSelect) onTextSelect(selectionData);
        }
    };

    const handleContextMenuWrapper = (e) => {
       
       
       
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText) {
            latestSelectionData.current = {
                ...latestSelectionData.current,
                selectedText: selectedText,
            };
           
            if (onTextSelect) onTextSelect(latestSelectionData.current);
        }
        
       
        if (onContextMenu) {
            onContextMenu(e);
        }
        
       
        e.preventDefault();
    };

   
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