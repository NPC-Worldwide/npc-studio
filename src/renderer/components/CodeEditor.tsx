import React, { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { BrainCircuit, Edit, FileText, MessageSquare, GitBranch, X } from 'lucide-react';

const appHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#c678dd' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e06c75' },
    { tag: [t.function(t.variableName), t.labelName], color: '#61afef' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#d19a66' },
    { tag: [t.definition(t.name), t.function(t.definition(t.name))], color: '#e5c07b' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#d19a66' },
    { tag: [t.operator, t.operatorKeyword], color: '#56b6c2' },
    { tag: [t.meta, t.comment], color: '#7f848e', fontStyle: 'italic' },
    { tag: [t.string, t.inserted], color: '#98c379' },
    { tag: t.invalid, color: '#ff5555' },
]);

// Custom theme for the editor
const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '14px',
    },
    '.cm-content': {
        fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Menlo, Monaco, monospace',
        caretColor: '#89b4fa',
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
        backgroundColor: '#1e1e2e',
        color: '#6c7086',
        border: 'none',
        borderRight: '1px solid #313244',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 4px 0 8px',
        minWidth: '28px',
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
        outline: '1px solid #89b4fa',
    },
    '.cm-searchMatch': {
        backgroundColor: 'rgba(249, 226, 175, 0.3)',
        outline: '1px solid #f9e2af',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'rgba(166, 227, 161, 0.4)',
    },
    '.cm-selectionMatch': {
        backgroundColor: 'rgba(137, 180, 250, 0.2)',
    },
    '.cm-panels': {
        backgroundColor: '#1e1e2e',
        color: '#cdd6f4',
    },
    '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid #313244',
    },
    '.cm-panel.cm-search': {
        padding: '8px 12px',
        backgroundColor: '#181825',
    },
    '.cm-panel.cm-search input, .cm-panel.cm-search button': {
        margin: '0 4px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: '#313244',
        border: '1px solid #45475a',
        color: '#cdd6f4',
    },
    '.cm-panel.cm-search button:hover': {
        backgroundColor: '#45475a',
    },
    '.cm-panel.cm-search label': {
        margin: '0 8px',
        color: '#a6adc8',
    },
    '.cm-tooltip': {
        backgroundColor: '#1e1e2e',
        border: '1px solid #313244',
        borderRadius: '6px',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
        '& > ul': {
            fontFamily: '"Fira Code", monospace',
            maxHeight: '200px',
        },
        '& > ul > li': {
            padding: '4px 8px',
        },
        '& > ul > li[aria-selected]': {
            backgroundColor: '#313244',
            color: '#cdd6f4',
        },
    },
    '.cm-completionIcon': {
        width: '1em',
        marginRight: '0.5em',
    },
}, { dark: true });

const CodeMirrorEditor = memo(({ value, onChange, filePath, onSave, onContextMenu, onSelect }) => {
    const editorRef = useRef(null);

    const languageExtension = useMemo(() => {
        const ext = filePath?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js': case 'mjs': return javascript();
            case 'jsx': return javascript({ jsx: true });
            case 'ts': return javascript({ typescript: true });
            case 'tsx': return javascript({ jsx: true, typescript: true });
            case 'py': case 'pyw': return python();
            case 'json': case 'jsonc': return json();
            case 'html': case 'htm': return html();
            case 'css': case 'scss': case 'less': return css();
            case 'md': case 'markdown': return markdown();
            default: return [];
        }
    }, [filePath]);

    const customKeymap = useMemo(() => keymap.of([
        { key: 'Mod-s', run: () => { if (onSave) onSave(); return true; } },
        indentWithTab,
    ]), [onSave]);

    const extensions = useMemo(() => [
        // Core editor features
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),

        // Language support
        languageExtension,

        // Search with styled panel
        search({ top: true }),

        // Keymaps
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
        ]),
        customKeymap,

        // Styling
        editorTheme,
        syntaxHighlighting(appHighlightStyle),

        // Optional line wrapping (comment out for horizontal scroll)
        EditorView.lineWrapping,
    ], [languageExtension, customKeymap]);

    const handleUpdate = useCallback((viewUpdate) => {
        if (viewUpdate.selectionSet && onSelect) {
            const { from, to } = viewUpdate.state.selection.main;
            onSelect(from, to);
        }
    }, [onSelect]);

    useEffect(() => {
        const editorDOM = editorRef.current?.editor;
        if (editorDOM) {
            const handleContextMenu = (event) => { if (onContextMenu) onContextMenu(event); };
            editorDOM.addEventListener('contextmenu', handleContextMenu);
            return () => editorDOM.removeEventListener('contextmenu', handleContextMenu);
        }
    }, [onContextMenu]);

    return (
        <CodeMirror
            ref={editorRef}
            value={value}
            height="100%"
            style={{ height: '100%' }}
            extensions={extensions}
            onChange={onChange}
            onUpdate={handleUpdate}
        />
    );
});


const CodeEditorPane = ({
    nodeId,
    contentDataRef,
    setRootLayoutNode,
    activeContentPaneId,
    editorContextMenuPos,
    setEditorContextMenuPos,
    aiEditModal,
    renamingPaneId,
    setRenamingPaneId,
    editedFileName,
    setEditedFileName,
    handleTextSelection,
    handleEditorCopy,
    handleEditorPaste,
    handleAddToChat,
    handleAIEdit,
    startAgenticEdit,
    setPromptModal,
    onGitBlame,
    currentPath,
}) => {
    const paneData = contentDataRef.current[nodeId];
    const [showBlame, setShowBlame] = useState(false);
    const [blameData, setBlameData] = useState<any[] | null>(null);
    const [blameLoading, setBlameLoading] = useState(false);

    if (!paneData) return null;

    const { contentId: filePath, fileContent, fileChanged } = paneData;
    const fileName = filePath?.split('/').pop() || 'Untitled';
    const isRenaming = renamingPaneId === nodeId;

    const handleLoadBlame = useCallback(async () => {
        if (!currentPath || !filePath) return;
        setBlameLoading(true);
        try {
            // Get relative path from currentPath
            const relativePath = filePath.startsWith(currentPath)
                ? filePath.slice(currentPath.length + 1)
                : filePath;
            const blame = await (window as any).api.gitBlame(currentPath, relativePath);
            setBlameData(blame);
            setShowBlame(true);
        } catch (err) {
            console.error('Failed to load git blame:', err);
            setBlameData(null);
        } finally {
            setBlameLoading(false);
        }
    }, [currentPath, filePath]);

    const onContentChange = useCallback((value) => {
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].fileContent = value;
            if (!contentDataRef.current[nodeId].fileChanged) {
                contentDataRef.current[nodeId].fileChanged = true;
                setRootLayoutNode(p => ({ ...p }));
            }
        }
    }, [nodeId, contentDataRef, setRootLayoutNode]);

    const onSave = useCallback(async () => {
        const currentPaneData = contentDataRef.current[nodeId];
        if (currentPaneData?.contentId && currentPaneData.fileChanged) {
            await window.api.writeFileContent(currentPaneData.contentId, currentPaneData.fileContent);
            currentPaneData.fileChanged = false;
            setRootLayoutNode(p => ({ ...p }));
        }
    }, [nodeId, contentDataRef, setRootLayoutNode]);

    const onEditorContextMenu = useCallback((e) => {
        if (activeContentPaneId === nodeId) {
            e.preventDefault();
            setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    }, [nodeId, activeContentPaneId, setEditorContextMenuPos]);

    const handleStartRename = useCallback(() => {
        setRenamingPaneId(nodeId);
        setEditedFileName(fileName);
    }, [nodeId, fileName, setRenamingPaneId, setEditedFileName]);

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-secondary relative">
            <div className="flex-1 flex min-h-0">
                {/* Git Blame Panel */}
                {showBlame && blameData && (
                    <div className="w-64 border-r theme-border flex flex-col bg-black/20 overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-1 border-b theme-border bg-black/20">
                            <span className="text-xs font-medium theme-text-muted">Git Blame</span>
                            <button onClick={() => setShowBlame(false)} className="p-0.5 theme-hover rounded">
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto text-xs font-mono">
                            {blameData.map((line: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex items-center px-2 py-0.5 hover:bg-white/5 border-b border-white/5"
                                    style={{ minHeight: '20px' }}
                                >
                                    <div className="flex-1 truncate">
                                        <span className="text-purple-400">{line.hash?.slice(0, 7) || '-------'}</span>
                                        <span className="text-gray-500 mx-1">|</span>
                                        <span className="text-gray-400">{line.author?.slice(0, 12) || 'Unknown'}</span>
                                    </div>
                                    <div className="text-gray-500 text-right w-10">{idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Editor */}
                <div className="flex-1 overflow-auto min-h-0">
                    <CodeMirrorEditor
                        value={fileContent || ''}
                        onChange={onContentChange}
                        onSave={onSave}
                        filePath={filePath}
                        onSelect={handleTextSelection}
                        onContextMenu={onEditorContextMenu}
                    />
                </div>
            </div>

            {editorContextMenuPos && activeContentPaneId === nodeId && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setEditorContextMenuPos(null)}
                    />
                    <div
                        className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                        style={{
                            top: `${editorContextMenuPos.y}px`,
                            left: `${editorContextMenuPos.x}px`
                        }}
                    >
                        <button onClick={handleEditorCopy} disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            Copy
                        </button>
                        <button onClick={handleEditorPaste}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            Paste
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={handleAddToChat} disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            Add to Chat
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={() => { handleAIEdit('ask'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <MessageSquare size={16} />Explain
                        </button>
                        <button onClick={() => { handleAIEdit('document'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <FileText size={16} />Add Comments
                        </button>
                        <button onClick={() => { handleAIEdit('edit'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <Edit size={16} />Refactor
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleLoadBlame();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-purple-400 text-sm">
                            <GitBranch size={16} />Git Blame
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleStartRename();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            <Edit size={16} />Rename File
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                setPromptModal({
                                    isOpen: true,
                                    title: 'Agentic Code Edit',
                                    message: 'What would you like AI to do with all open files?',
                                    defaultValue: 'Add error handling and improve code quality',
                                    onConfirm: (instruction) => startAgenticEdit(instruction)
                                });
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-blue-400 text-sm">
                            <BrainCircuit size={16} />Agentic Edit (All Files)
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CodeEditorPane;




    const renderFileContextMenu = () => (
        fileContextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('refactor')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Code2 size={16} />
                        <span>Refactor Code ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFiles('document')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Document Code ({selectedFiles.size})</span>
                    </button>
                </div>
            </>
        )
    );