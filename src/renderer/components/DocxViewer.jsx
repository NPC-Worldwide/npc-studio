import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo, Redo, X } from 'lucide-react';

const DocxViewer = ({ 
    filePath, 
    nodeId, 
    findNodePath, 
    rootLayoutNode, 
    setDraggedItem, 
    setPaneContextMenu, 
    closeContentPane 
}) => {
    const [content, setContent] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [error, setError] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const editorRef = useRef(null);
    const isUndoRedoRef = useRef(false);

    useEffect(() => {
        const loadDocx = async () => {
            if (!filePath) return;
            try {
                const response = await window.api.readDocxContent(filePath);
                if (response.error) throw new Error(response.error);
                setContent(response.content);
                const htmlified = response.content
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>');
                const initialHtml = `<p>${htmlified}</p>`;
                setHtmlContent(initialHtml);
                setHistory([initialHtml]);
                setHistoryIndex(0);
            } catch (err) {
                setError(err.message);
            }
        };
        loadDocx();
    }, [filePath]);

    const addToHistory = (newContent) => {
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        
        // Limit history to 100 entries
        if (newHistory.length > 100) {
            newHistory.shift();
        } else {
            setHistoryIndex(historyIndex + 1);
        }
        
        setHistory(newHistory);
    };

    const handleInput = (e) => {
        const newContent = e.currentTarget.innerHTML;
        setHtmlContent(newContent);
        setHasChanges(true);
        addToHistory(newContent);
    };

    const undo = () => {
        if (historyIndex > 0) {
            isUndoRedoRef.current = true;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setHtmlContent(history[newIndex]);
            setHasChanges(true);
            
            // Update the editor
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            isUndoRedoRef.current = true;
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setHtmlContent(history[newIndex]);
            setHasChanges(true);
            
            // Update the editor
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
            }
        }
    };

    const saveDocument = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const plainText = tempDiv.innerText;
            
            await window.api.writeFileContent(filePath, plainText);
            setContent(plainText);
            setHasChanges(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const exportAsMarkdown = async () => {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const plainText = tempDiv.innerText;
            
            const newPath = filePath.replace(/\.docx$/, '.md');
            await window.api.writeFileContent(newPath, plainText);
            alert('Exported to ' + newPath);
        } catch (err) {
            setError(err.message);
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        
        // Update content after command
        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    };

    const handleKeyDown = (e) => {
        // Ctrl+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveDocument();
            return;
        }
        // Ctrl+Z for undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }
        // Ctrl+Shift+Z or Ctrl+Y for redo
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Z' || e.key === 'z')) || 
            ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault();
            redo();
            return;
        }
        // Ctrl+B for bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            execCommand('bold');
            return;
        }
        // Ctrl+I for italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            execCommand('italic');
            return;
        }
        // Ctrl+U for underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            execCommand('underline');
            return;
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        
        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    };

    const handleCut = (e) => {
        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    };

    if (error) return (
        <div className="p-4 text-red-500">Error: {error}</div>
    );
    if (!content && !htmlContent) return <div className="p-4">Loading...</div>;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary">
            {/* Header */}
            <div 
                draggable="true"
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    const nodePath = findNodePath(rootLayoutNode, nodeId);
                    e.dataTransfer.setData('application/json', 
                        JSON.stringify({ 
                            type: 'pane', 
                            id: nodeId, 
                            nodePath 
                        })
                    );
                    setTimeout(() => setDraggedItem({ 
                        type: 'pane', 
                        id: nodeId, 
                        nodePath 
                    }), 0);
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
                        {filePath.split('/').pop()}{hasChanges ? ' *' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={saveDocument}
                            disabled={!hasChanges || isSaving}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Save (Ctrl+S)"
                        >
                            <Save size={14} />
                        </button>
                        <button 
                            onClick={exportAsMarkdown}
                            className="p-1 theme-hover rounded"
                            title="Export as Markdown"
                        >
                            <Download size={14} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                closeContentPane(nodeId, findNodePath(rootLayoutNode, nodeId));
                            }}
                            className="p-1 theme-hover rounded-full"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-2 border-b theme-border flex items-center gap-1 flex-wrap theme-bg-tertiary">
                <button 
                    onClick={undo} 
                    disabled={historyIndex <= 0}
                    className="p-2 theme-hover rounded disabled:opacity-50" 
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} />
                </button>
                <button 
                    onClick={redo} 
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 theme-hover rounded disabled:opacity-50" 
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <Redo size={16} />
                </button>
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                
                <select 
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    className="theme-input text-xs rounded px-2 py-1 border"
                    defaultValue="3"
                >
                    <option value="1">Small</option>
                    <option value="3">Normal</option>
                    <option value="5">Large</option>
                    <option value="7">Huge</option>
                </select>
                
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                
                <button onClick={() => execCommand('bold')} className="p-2 theme-hover rounded font-bold" title="Bold (Ctrl+B)">
                    <Bold size={16} />
                </button>
                <button onClick={() => execCommand('italic')} className="p-2 theme-hover rounded italic" title="Italic (Ctrl+I)">
                    <Italic size={16} />
                </button>
                <button onClick={() => execCommand('underline')} className="p-2 theme-hover rounded underline" title="Underline (Ctrl+U)">
                    U
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                
                <button onClick={() => execCommand('justifyLeft')} className="p-2 theme-hover rounded" title="Align Left">
                    <AlignLeft size={16} />
                </button>
                <button onClick={() => execCommand('justifyCenter')} className="p-2 theme-hover rounded" title="Align Center">
                    <AlignCenter size={16} />
                </button>
                <button onClick={() => execCommand('justifyRight')} className="p-2 theme-hover rounded" title="Align Right">
                    <AlignRight size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                
                <button onClick={() => execCommand('insertUnorderedList')} className="p-2 theme-hover rounded" title="Bullet List">
                    <List size={16} />
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-2 theme-hover rounded" title="Numbered List">
                    <ListOrdered size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-600 mx-1"></div>
                
                <select 
                    onChange={(e) => execCommand('formatBlock', e.target.value)}
                    className="theme-input text-xs rounded px-2 py-1 border"
                    defaultValue="p"
                >
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="blockquote">Quote</option>
                </select>
                
                <input 
                    type="color" 
                    onChange={(e) => execCommand('foreColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                    title="Text Color"
                />
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-auto p-6 theme-bg-primary">
                <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onCut={handleCut}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                    className="max-w-4xl mx-auto p-8 theme-bg-secondary rounded-lg shadow-lg outline-none"
                    style={{
                        minHeight: '11in',
                        maxWidth: '8.5in',
                        padding: '1in',
                        lineHeight: '1.6',
                        fontSize: '14px',
                        color: 'var(--theme-text)',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                />
            </div>
        </div>
    );
};

export default DocxViewer;