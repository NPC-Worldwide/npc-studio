import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { Save, Play, ExternalLink, X } from 'lucide-react';

const LatexViewer = ({
    nodeId,
    contentDataRef,
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane
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

    const compile = useCallback(async () => {
        setIsCompiling(true);
        setCompileLog('');
        setError(null);
        try {
            const res = await window.api.compileLatex(filePath);
            if (res?.error) throw new Error(res.error);
            if (res?.log) setCompileLog(res.log);
            if (res?.pdfPath) {
                await window.api.openFile(res.pdfPath);
            } else {
                const fallbackPdf = filePath.replace(/\.tex$/i, '.pdf');
                await window.api.openFile(fallbackPdf);
            }
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setIsCompiling(false);
        }
    }, [filePath]);

    const onKeyDown = useCallback(
        (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (hasChanges) save();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                compile();
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
                            onClick={compile}
                            disabled={isCompiling}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Compile to PDF (Ctrl+Enter)"
                        >
                            <Play size={14} />
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
                            title="Open PDF (if available)"
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