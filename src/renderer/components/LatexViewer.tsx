import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { Save, Play, ExternalLink, X, SplitSquareHorizontal } from 'lucide-react';

const LatexViewer = ({
    nodeId,
    contentDataRef,
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane,
    performSplit
}) => {
    const [content, setContent] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompiling, setIsCompiling] = useState(false);
    const [compileLog, setCompileLog] = useState('');
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;

    useEffect(() => {
        const load = async () => {
            if (!filePath) return;
            try {
                const text = await window.api.readFileContent(filePath);
                if (text?.error) throw new Error(text.error);
                setContent(typeof text === 'string' ? text : text?.content ?? '');
                setHasChanges(false);
            } catch (e) {
                setError(e.message || String(e));
            }
        };
        load();
    }, [filePath]);

    const save = useCallback(async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        setError(null);
        try {
            await window.api.writeFileContent(filePath, content);
            setHasChanges(false);
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, content, filePath]);

    const openPdfInSplit = useCallback((pdfPath) => {
        // Check if a PDF pane with this path already exists
        const existingPaneId = Object.keys(contentDataRef.current).find(
            (id) => contentDataRef.current[id]?.contentType === 'pdf' &&
                   contentDataRef.current[id]?.contentId === pdfPath
        );

        if (existingPaneId) {
            // Dispatch event to refresh existing PDF pane
            window.dispatchEvent(new CustomEvent('pdf-refresh', { detail: { pdfPath } }));
            return;
        }

        // No existing pane - open new split
        if (!performSplit) return;
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        performSplit(nodePath, 'right', 'pdf', pdfPath);
    }, [performSplit, findNodePath, rootLayoutNode, nodeId, contentDataRef]);

    const compile = useCallback(async (openInSplit = true) => {
        setIsCompiling(true);
        setCompileLog('');
        setError(null);
        try {
            const res = await window.api.compileLatex(filePath);
            // Show compilation output (stderr contains LaTeX errors)
            if (res?.error) setCompileLog(res.error);
            else if (res?.log) setCompileLog(res.log);

            const pdfPath = res?.pdfPath || filePath.replace(/\.tex$/i, '.pdf');

            // Check if PDF exists - pdflatex may return non-zero even when PDF is generated
            const pdfExists = await window.api.fileExists?.(pdfPath);
            if (!pdfExists) {
                setError('Compilation failed - no PDF generated');
                return;
            }

            if (openInSplit && performSplit) {
                openPdfInSplit(pdfPath);
            } else {
                await window.api.openFile(pdfPath);
            }
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setIsCompiling(false);
        }
    }, [filePath, performSplit, openPdfInSplit]);

    const onKeyDown = useCallback(
        (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (hasChanges) save();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                compile(true); // Open in split pane
                return;
            }
        },
        [hasChanges, save, compile]
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!content && hasChanges === false) return <div className="p-4">Loading…</div>;

    return (
        <div className="h-full flex flex-col theme-bg-secondary overflow-hidden">
            <div
                draggable="true"
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    const nodePath = findNodePath(rootLayoutNode, nodeId);
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pane', id: nodeId, nodePath }));
                    setTimeout(() => setDraggedItem({ type: 'pane', id: nodeId, nodePath }), 0);
                }}
                onDragEnd={() => setDraggedItem(null)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPaneContextMenu({
                        isOpen: true,
                        x: e.clientX,
                        y: e.clientY,
                        nodeId,
                        nodePath: findNodePath(rootLayoutNode, nodeId)
                    });
                }}
                className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary cursor-move"
            >
                <div className="flex justify-between items-center">
                    <span className="truncate font-semibold">
                        {filePath ? filePath.split('/').pop() : 'Untitled'}{hasChanges ? ' *' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={save}
                            disabled={!hasChanges || isSaving}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Save (Ctrl+S)"
                        >
                            <Save size={14} />
                        </button>
                        <button
                            onClick={() => compile(true)}
                            disabled={isCompiling}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Compile & Preview (Ctrl+Enter)"
                        >
                            <Play size={14} />
                        </button>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const pdfPath = filePath.replace(/\.tex$/i, '.pdf');
                                try {
                                    // Check if PDF exists before opening split
                                    const exists = await window.api.fileExists?.(pdfPath);
                                    if (exists === false) {
                                        setError('PDF not found - compile first');
                                        return;
                                    }
                                    openPdfInSplit(pdfPath);
                                } catch (_) {
                                    openPdfInSplit(pdfPath); // Try anyway if check fails
                                }
                            }}
                            className="p-1 theme-hover rounded"
                            title="Open PDF in split view"
                        >
                            <SplitSquareHorizontal size={14} />
                        </button>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const pdfPath = filePath.replace(/\.tex$/i, '.pdf');
                                try {
                                    await window.api.openFile(pdfPath);
                                } catch (_) {
                                    // ignore: maybe not compiled yet
                                }
                            }}
                            className="p-1 theme-hover rounded"
                            title="Open PDF externally"
                        >
                            <ExternalLink size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeContentPane(nodeId, findNodePath(rootLayoutNode, nodeId));
                            }}
                            className="p-1 theme-hover rounded-full"
                            title="Close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 theme-bg-primary">
                <div className="max-w-5xl mx-auto">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            setContent(e.target.value);
                            setHasChanges(true);
                        }}
                        spellCheck={false}
                        className="w-full min-h-[80vh] p-4 theme-bg-secondary rounded-lg shadow-lg outline-none font-mono text-sm"
                        style={{ lineHeight: '1.5' }}
                        placeholder={`\documentclass{article}\n\begin{document}\nHello, LaTeX!\n\end{document}`}
                    />
                </div>
            </div>

            <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between theme-bg-secondary">
                <div className="truncate">
                    {isCompiling ? 'Compiling…' : hasChanges ? 'Unsaved changes' : 'Up to date'}
                </div>
            </div>

            {compileLog ? (
                <div className="border-t theme-border max-h-48 overflow-auto text-xs font-mono p-2 theme-bg-tertiary">
                    <div className="opacity-70 mb-1">Build log</div>
                    <pre className="whitespace-pre-wrap">{compileLog}</pre>
                </div>
            ) : null}
        </div>
    );
};

export default memo(LatexViewer);