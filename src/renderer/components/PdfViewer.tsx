import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import './PdfViewer.css';

const normalizePath = (p) => (p || '').replace(/\\/g, '/');

// Exported utility function for loading PDF highlights for a specific pane
export const loadPdfHighlightsForActivePane = async (
    activeContentPaneId: string | null,
    contentDataRef: React.MutableRefObject<any>,
    setPdfHighlights: (highlights: any[]) => void
) => {
    if (activeContentPaneId) {
        const currentPaneData = contentDataRef.current[activeContentPaneId];
        if (currentPaneData && currentPaneData.contentType === 'pdf') {
            const response = await window.api.getHighlightsForFile(currentPaneData.contentId);
            if (response.highlights) {
                const transformedHighlights = response.highlights.map((h: any) => {
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
                setPdfHighlights(transformedHighlights);
            } else {
                setPdfHighlights([]);
            }
        } else {
            setPdfHighlights([]);
        }
    } else {
        setPdfHighlights([]);
    }
};

const PdfContextMenu = ({ pdfContextMenuPos, setPdfContextMenuPos, handleCopyPdfText, handleHighlightPdfSelection, handleApplyPromptToPdfText, selectedPdfText, }) => {
    if (!pdfContextMenuPos) return null;

    const copyText = useCallback(() => {
        handleCopyPdfText(selectedPdfText?.text);
        setPdfContextMenuPos(null);
    }, [handleCopyPdfText, selectedPdfText, setPdfContextMenuPos]);

    const highlightText = useCallback(() => {
        handleHighlightPdfSelection(selectedPdfText?.text, selectedPdfText?.position);
        setPdfContextMenuPos(null);
    }, [handleHighlightPdfSelection, selectedPdfText, setPdfContextMenuPos]);

    const summarizeText = useCallback(() => {
        handleApplyPromptToPdfText('summarize', selectedPdfText?.text);
        setPdfContextMenuPos(null);
    }, [handleApplyPromptToPdfText, selectedPdfText, setPdfContextMenuPos]);

    const explainText = useCallback(() => {
        handleApplyPromptToPdfText('explain', selectedPdfText?.text);
        setPdfContextMenuPos(null);
    }, [handleApplyPromptToPdfText, selectedPdfText, setPdfContextMenuPos]);


    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => {
                setPdfContextMenuPos(null);
            }} />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                style={{ top: pdfContextMenuPos.y, left: pdfContextMenuPos.x }}
                onMouseLeave={() => setPdfContextMenuPos(null)}
            >
                {selectedPdfText?.text && (
                    <>
                        <button onClick={copyText} className="block px-4 py-2 w-full text-left theme-hover">Copy</button>
                        <button onClick={highlightText} className="block px-4 py-2 w-full text-left theme-hover">Highlight</button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={summarizeText} className="block px-4 py-2 w-full text-left theme-hover">Summarize Text</button>
                        <button onClick={explainText} className="block px-4 py-2 w-full text-left theme-hover">Explain Text</button>
                    </>
                )}
                {!selectedPdfText?.text && (
                    <div className="px-4 py-2 text-gray-500">No text selected</div>
                )}
            </div>
        </>
    );
};

const PdfViewer = ({
    nodeId,
    contentDataRef,
    currentPath,
    activeContentPaneId,
    pdfContextMenuPos,
    setPdfContextMenuPos,
    handleCopyPdfText,
    handleHighlightPdfSelection,
    handleApplyPromptToPdfText,
    pdfHighlights,
    setPdfHighlights,
    pdfHighlightsTrigger
}) => {
    const [pdfData, setPdfData] = useState(null);
    const [error, setError] = useState(null);
    const viewerWrapperRef = useRef(null);

    const [selectedPdfText, setSelectedPdfText] = useState(null);
    const [pdfSelectionIndicator, setPdfSelectionIndicator] = useState(null);

    const workerUrl = `${window.location.origin}/pdf.worker.min.js`;
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId; // Get filePath from contentDataRef

    const useLoadPdfHighlights = useCallback(async () => {
        if (nodeId) {
            const currentPaneData = contentDataRef.current[nodeId];
            if (currentPaneData && currentPaneData.contentType === 'pdf') {
                // Assuming window.api.getHighlightsForFile exists
                const response = await window.api.getHighlightsForFile(currentPaneData.contentId);
                if (response.highlights) {
                    const transformedHighlights = response.highlights.map((h) => {
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
                    setPdfHighlights(transformedHighlights);
                } else {
                    setPdfHighlights([]);
                }
            } else {
                setPdfHighlights([]);
            }
        } else {
            setPdfHighlights([]);
        }
    }, [nodeId, contentDataRef, setPdfHighlights]);


    const loadPdfHighlightsForActivePane = useLoadPdfHighlights;

    const createPdfTextSelectHandler = useCallback((setSelectedPdfTextFn, setPdfSelectionIndicatorFn, setPdfContextMenuPosFn) => {
        return (selection) => {
            setSelectedPdfTextFn(selection);
            if (selection?.rects) {
                setPdfSelectionIndicatorFn({
                    pageIndex: selection.pageIndex ?? 0,
                    rects: selection.rects,
                });
            } else {
                setPdfSelectionIndicatorFn(null);
            }
            setPdfContextMenuPosFn(null);
        };
    }, []);

    const createPdfContextMenuHandler = useCallback((selectedPdfTextFn, setPdfContextMenuPosFn) => {
        return (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (selectedPdfTextFn?.text && selectedPdfTextFn.text.trim()) {
                setPdfContextMenuPosFn({ x: e.clientX, y: e.clientY });
            } else {
                setPdfContextMenuPosFn({ x: e.clientX, y: e.clientY });
            }
        };
    }, []);


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
                // Assuming window.api.readFile exists
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
        loadPdfHighlightsForActivePane();
    }, [nodeId, pdfHighlightsTrigger, loadPdfHighlightsForActivePane]);

    const handleActualTextSelect = useMemo(
        () => createPdfTextSelectHandler(setSelectedPdfText, setPdfSelectionIndicator, setPdfContextMenuPos),
        [createPdfTextSelectHandler, setSelectedPdfText, setPdfSelectionIndicator, setPdfContextMenuPos]
    );
    const handleActualContextMenu = useMemo(
        () => createPdfContextMenuHandler(selectedPdfText, setPdfContextMenuPos),
        [createPdfContextMenuHandler, selectedPdfText, setPdfContextMenuPos]
    );

    useEffect(() => {
        const wrapper = viewerWrapperRef.current;
        if (!wrapper) return;

        const handleMouseUp = (e) => {
            if (!wrapper.contains(e.target)) return;

            setTimeout(() => {
                const selection = window.getSelection();
                const text = selection?.toString().trim();

                if (text && text.length > 0 && handleActualTextSelect) {
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
                    handleActualTextSelect({
                        text: text,
                        position: position,
                        timestamp: Date.now()
                    });
                }
            }, 50);
        };

        const contextMenuListener = (e) => {
            if (!wrapper.contains(e.target)) return;
            handleActualContextMenu(e);
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('contextmenu', contextMenuListener, true);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('contextmenu', contextMenuListener);
        };
    }, [handleActualTextSelect, handleActualContextMenu]);


    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!pdfData) return <div className="p-4">Loading PDF...</div>;

    return (
        <div
            ref={viewerWrapperRef}
            style={{
                height: '100%',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Worker workerUrl={workerUrl}>
                <Viewer
                    fileUrl={pdfData}
                    plugins={[defaultLayoutPluginInstance]}
                    renderViewer={(viewerProps) => (
                        <div className="pdf-viewer-container">
                            {viewerProps.children}
                            {pdfSelectionIndicator && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {pdfSelectionIndicator.rects.map((rect, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'absolute',
                                                left: `${rect.left}%`,
                                                top: `${rect.top}%`,
                                                width: `${rect.width}%`,
                                                height: `${rect.height}%`,
                                                backgroundColor: 'rgba(255, 255, 0, 0.4)',
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                            {pdfHighlights && pdfHighlights.length > 0 && pdfHighlights.map((highlight, idx) => {
                                const rects = highlight.position?.rects || [];
                                if (rects.length === 0) return null;
                                return rects.map((rect, rectIdx) => (
                                    <div
                                        key={`${idx}-${rectIdx}-highlight`}
                                        style={{
                                            position: 'absolute',
                                            left: `${rect.left}%`,
                                            top: `${rect.top}%`,
                                            width: `${rect.width}%`,
                                            height: `${rect.height}%`,
                                            backgroundColor: 'rgba(0, 255, 0, 0.2)',
                                            border: '1px solid rgba(0, 255, 0, 0.5)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                ));
                            })}
                        </div>
                    )}
                />
            </Worker>

            <PdfContextMenu
                pdfContextMenuPos={pdfContextMenuPos}
                setPdfContextMenuPos={setPdfContextMenuPos}
                handleCopyPdfText={handleCopyPdfText}
                handleHighlightPdfSelection={handleHighlightPdfSelection}
                handleApplyPromptToPdfText={handleApplyPromptToPdfText}
                selectedPdfText={selectedPdfText}
            />
        </div>
    );
};

export default memo(PdfViewer);