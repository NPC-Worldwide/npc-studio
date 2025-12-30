import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Save, Play, ExternalLink, X, SplitSquareHorizontal, Loader } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, StreamLanguage } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';

// Simple LaTeX language mode for StreamLanguage
const latexLanguage = StreamLanguage.define({
    name: 'latex',
    startState: () => ({
        inMath: false,
        inEnvironment: false,
        mathDelimiter: null as string | null,
    }),
    token: (stream, state) => {
        // Skip whitespace
        if (stream.eatSpace()) return null;

        // Comments
        if (stream.match('%')) {
            stream.skipToEnd();
            return 'comment';
        }

        // Math mode delimiters
        if (stream.match('$$')) {
            state.inMath = !state.inMath;
            state.mathDelimiter = state.inMath ? '$$' : null;
            return 'keyword';
        }
        if (stream.match('\\[')) {
            state.inMath = true;
            state.mathDelimiter = '\\]';
            return 'keyword';
        }
        if (stream.match('\\]')) {
            state.inMath = false;
            state.mathDelimiter = null;
            return 'keyword';
        }
        if (stream.match('\\(')) {
            state.inMath = true;
            state.mathDelimiter = '\\)';
            return 'keyword';
        }
        if (stream.match('\\)')) {
            state.inMath = false;
            state.mathDelimiter = null;
            return 'keyword';
        }
        // Single $ for inline math
        if (stream.peek() === '$' && !stream.match('$$')) {
            stream.next();
            if (state.inMath && state.mathDelimiter === '$') {
                state.inMath = false;
                state.mathDelimiter = null;
            } else if (!state.inMath) {
                state.inMath = true;
                state.mathDelimiter = '$';
            }
            return 'keyword';
        }

        // In math mode, color everything as "number" (typically orange/yellow)
        if (state.inMath) {
            // Check for LaTeX commands in math
            if (stream.match(/\\[a-zA-Z@]+/)) {
                return 'function';
            }
            // Subscript/superscript
            if (stream.match(/[_^]/)) {
                return 'operator';
            }
            stream.next();
            return 'number';
        }

        // LaTeX commands
        if (stream.match(/\\[a-zA-Z@]+\*?/)) {
            const cmd = stream.current();
            // Document structure commands
            if (/\\(documentclass|usepackage|begin|end|section|subsection|subsubsection|chapter|part|paragraph|title|author|date|maketitle|tableofcontents|bibliography|bibliographystyle)/.test(cmd)) {
                return 'keyword';
            }
            // Formatting commands
            if (/\\(textbf|textit|emph|underline|texttt|textsf|textrm|textsc|tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)/.test(cmd)) {
                return 'typeName';
            }
            // References
            if (/\\(ref|cite|label|pageref|eqref|footnote|caption)/.test(cmd)) {
                return 'link';
            }
            return 'function';
        }

        // Escaped characters
        if (stream.match(/\\[^a-zA-Z]/)) {
            return 'escape';
        }

        // Curly braces (arguments)
        if (stream.match(/[{}]/)) {
            return 'bracket';
        }

        // Square brackets (optional arguments)
        if (stream.match(/[\[\]]/)) {
            return 'squareBracket';
        }

        // Environment names after \begin{ or \end{
        // This is handled by the command matching above

        // Regular text
        stream.next();
        return null;
    },
    languageData: {
        commentTokens: { line: '%' },
    },
});

// LaTeX-specific highlight style
const latexHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#c678dd', fontWeight: 'bold' }, // \documentclass, \begin, etc.
    { tag: t.function(t.variableName), color: '#61afef' }, // \command
    { tag: t.typeName, color: '#e5c07b' }, // formatting commands
    { tag: t.comment, color: '#7f848e', fontStyle: 'italic' }, // % comments
    { tag: t.number, color: '#d19a66' }, // math content
    { tag: t.operator, color: '#56b6c2' }, // ^ and _
    { tag: t.escape, color: '#98c379' }, // escaped chars like \%
    { tag: t.bracket, color: '#e06c75' }, // { }
    { tag: t.squareBracket, color: '#98c379' }, // [ ]
    { tag: t.link, color: '#61afef', textDecoration: 'underline' }, // \ref, \cite
]);

// Custom theme for the LaTeX editor
const latexEditorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '14px',
        backgroundColor: '#1e1e2e',
    },
    '.cm-content': {
        fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Menlo, Monaco, monospace',
        caretColor: '#89b4fa',
        padding: '8px 0',
    },
    '.cm-cursor': {
        borderLeftColor: '#89b4fa',
        borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(137, 180, 250, 0.3)',
    },
    '.cm-activeLine': {
        backgroundColor: 'rgba(137, 180, 250, 0.08)',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'rgba(137, 180, 250, 0.1)',
    },
    '.cm-gutters': {
        backgroundColor: '#181825',
        color: '#6c7086',
        border: 'none',
        borderRight: '1px solid #313244',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 12px',
        minWidth: '40px',
    },
    '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        cursor: 'pointer',
    },
    '.cm-foldGutter .cm-gutterElement:hover': {
        color: '#89b4fa',
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'rgba(137, 180, 250, 0.3)',
        outline: '1px solid rgba(137, 180, 250, 0.5)',
    },
    '.cm-searchMatch': {
        backgroundColor: 'rgba(229, 192, 123, 0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(229, 192, 123, 0.5)',
    },
});

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

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;

    // CodeMirror extensions
    const extensions = useMemo(() => [
        latexLanguage,
        syntaxHighlighting(latexHighlightStyle),
        latexEditorTheme,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightSelectionMatches(),
        search(),
        autocompletion(),
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            indentWithTab,
        ]),
        EditorView.lineWrapping,
    ], []);

    useEffect(() => {
        const load = async () => {
            if (!filePath) return;
            try {
                const text = await (window as any).api.readFileContent(filePath);
                if (text?.error) throw new Error(text.error);
                setContent(typeof text === 'string' ? text : text?.content ?? '');
                setHasChanges(false);
            } catch (e: any) {
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
            await (window as any).api.writeFileContent(filePath, content);
            setHasChanges(false);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, content, filePath]);

    const openPdfInSplit = useCallback((pdfPath: string) => {
        console.log('[LatexViewer] openPdfInSplit called with:', pdfPath);
        const existingPaneId = Object.keys(contentDataRef.current).find(
            (id) => contentDataRef.current[id]?.contentType === 'pdf' &&
                   contentDataRef.current[id]?.contentId === pdfPath
        );

        if (existingPaneId) {
            console.log('[LatexViewer] Found existing PDF pane:', existingPaneId, '- dispatching refresh');
            window.dispatchEvent(new CustomEvent('pdf-refresh', { detail: { pdfPath } }));
            return;
        }

        if (!performSplit) {
            console.log('[LatexViewer] No performSplit function available!');
            return;
        }
        const nodePath = findNodePath(rootLayoutNode, nodeId);
        console.log('[LatexViewer] Calling performSplit with nodePath:', nodePath, 'direction: right, type: pdf');
        performSplit(nodePath, 'right', 'pdf', pdfPath);
    }, [performSplit, findNodePath, rootLayoutNode, nodeId, contentDataRef]);

    const compile = useCallback(async (openInSplit = true) => {
        // Auto-save before compiling if there are changes
        if (hasChanges) {
            try {
                await (window as any).api.writeFileContent(filePath, content);
                setHasChanges(false);
            } catch (e: any) {
                setError('Failed to save before compile: ' + (e.message || String(e)));
                return;
            }
        }

        setIsCompiling(true);
        setCompileLog('');
        setError(null);
        try {
            const res = await (window as any).api.compileLatex(filePath);
            console.log('[LatexViewer] compileLatex result:', res);
            if (res?.error) setCompileLog(res.error);
            else if (res?.log) setCompileLog(res.log);

            const pdfPath = res?.pdfPath || filePath.replace(/\.tex$/i, '.pdf');
            console.log('[LatexViewer] pdfPath:', pdfPath);

            const pdfExists = await (window as any).api.fileExists?.(pdfPath);
            console.log('[LatexViewer] pdfExists:', pdfExists, 'openInSplit:', openInSplit, 'performSplit:', !!performSplit);
            if (!pdfExists) {
                setError('Compilation failed - no PDF generated');
                return;
            }

            if (openInSplit && performSplit) {
                console.log('[LatexViewer] Opening PDF in split...');
                openPdfInSplit(pdfPath);
            } else {
                console.log('[LatexViewer] Opening PDF externally...');
                await (window as any).api.openFile(pdfPath);
            }
        } catch (e: any) {
            console.error('[LatexViewer] compile error:', e);
            setError(e.message || String(e));
        } finally {
            setIsCompiling(false);
        }
    }, [filePath, content, hasChanges, performSplit, openPdfInSplit]);

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (hasChanges) save();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                compile(true);
                return;
            }
        },
        [hasChanges, save, compile]
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    const handleEditorChange = useCallback((value: string) => {
        setContent(value);
        setHasChanges(true);
    }, []);

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!content && hasChanges === false) return <div className="p-4">Loading...</div>;

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
                            className={`p-1 theme-hover rounded disabled:opacity-50 ${isCompiling ? 'text-yellow-400' : ''}`}
                            title="Compile & Preview (Ctrl+Enter)"
                        >
                            {isCompiling ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                        </button>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const pdfPath = filePath.replace(/\.tex$/i, '.pdf');
                                try {
                                    const exists = await (window as any).api.fileExists?.(pdfPath);
                                    if (exists === false) {
                                        setError('PDF not found - compile first');
                                        return;
                                    }
                                    openPdfInSplit(pdfPath);
                                } catch (_) {
                                    openPdfInSplit(pdfPath);
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
                                    await (window as any).api.openFile(pdfPath);
                                } catch (_) {
                                    // ignore
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

            <div className="flex-1 overflow-hidden relative">
                {isCompiling && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3 shadow-xl border border-gray-700">
                            <Loader size={24} className="animate-spin text-yellow-400" />
                            <span className="text-white font-medium">Compiling LaTeX...</span>
                        </div>
                    </div>
                )}
                <CodeMirror
                    value={content}
                    onChange={handleEditorChange}
                    extensions={extensions}
                    basicSetup={false}
                    className="h-full"
                    style={{ height: '100%' }}
                />
            </div>

            <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between theme-bg-secondary">
                <div className="truncate">
                    {isCompiling ? 'Compiling...' : hasChanges ? 'Unsaved changes' : 'Up to date'}
                </div>
                <div className="text-gray-500">
                    Ctrl+S to save | Ctrl+Enter to compile
                </div>
            </div>

            <div className="border-t theme-border max-h-48 min-h-[60px] overflow-auto text-xs font-mono p-2 theme-bg-tertiary">
                <div className="opacity-70 mb-1 text-yellow-500">Build log</div>
                <pre className="whitespace-pre-wrap text-gray-400">
                    {compileLog || 'No build output yet. Press Ctrl+Enter to compile.'}
                </pre>
            </div>
        </div>
    );
};

export default memo(LatexViewer);
