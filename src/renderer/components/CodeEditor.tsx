import React, { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { search, searchKeymap } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { BrainCircuit, Edit, FileText, MessageSquare } from 'lucide-react';

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

const CodeMirrorEditor = memo(({ value, onChange, filePath, onSave, onContextMenu, onSelect }) => {
    const editorRef = useRef(null);

    const languageExtension = useMemo(() => {
        const ext = filePath?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js': case 'jsx': return javascript({ jsx: true });
            case 'py': return python();
            default: return [];
        }
    }, [filePath]);

    const customKeymap = useMemo(() => keymap.of([
        { key: 'Mod-s', run: () => { if (onSave) onSave(); return true; } },
    ]), [onSave]);

    const extensions = useMemo(() => [
        languageExtension,
        history(),
        search({ top: true }),
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
        ]),
        customKeymap,
        EditorView.lineWrapping,
        syntaxHighlighting(appHighlightStyle),
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
}) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: filePath, fileContent, fileChanged } = paneData;
    const fileName = filePath?.split('/').pop() || 'Untitled';
    const isRenaming = renamingPaneId === nodeId;

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