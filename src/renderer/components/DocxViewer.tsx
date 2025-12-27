import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Save, Download, Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo, Redo, X, Image, Table, Type, Link, Minus } from 'lucide-react';

const DocxViewer = ({ 
    nodeId, 
    contentDataRef,
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

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadDocx = async () => {
            if (!filePath) return;
            try {
                // First try to read as plain text to check if it's HTML (saved from this editor)
                const textResponse = await window.api.readFileContent(filePath);
                const textContent = textResponse?.content || '';

                // Check if it looks like HTML (our saved format)
                const isHtml = textContent.trim().startsWith('<') &&
                    (textContent.includes('<p>') || textContent.includes('<div>') || textContent.includes('<br'));

                let initialHtml;
                if (isHtml) {
                    // It's HTML from our editor - use directly
                    initialHtml = textContent;
                } else if (textContent.length === 0) {
                    // Empty file - create blank
                    initialHtml = '<p><br></p>';
                } else {
                    // Try mammoth for real docx files
                    const response = await window.api.readDocxContent(filePath);
                    if (response.error) {
                        // Mammoth failed, treat as plain text
                        const htmlified = textContent
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n\n/g, '</p><p>')
                            .replace(/\n/g, '<br>');
                        initialHtml = `<p>${htmlified}</p>`;
                    } else {
                        // Mammoth succeeded - it's a real docx
                        const htmlified = (response.content || '')
                            .replace(/\n\n/g, '</p><p>')
                            .replace(/\n/g, '<br>');
                        initialHtml = response.content ? `<p>${htmlified}</p>` : '<p><br></p>';
                    }
                }

                setContent(textContent);
                setHtmlContent(initialHtml);
                setHistory([initialHtml]);
                setHistoryIndex(0);
                // Set content directly to avoid React re-render issues
                if (editorRef.current) {
                    editorRef.current.innerHTML = initialHtml;
                }
                setIsLoaded(true);
            } catch (err) {
                setError(err.message);
            }
        };
        loadDocx();
    }, [filePath]);

    const addToHistory = useCallback((newContent) => {
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }
        
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        
        if (newHistory.length > 100) {
            newHistory.shift();
        } else {
            setHistoryIndex(historyIndex + 1);
        }
        
        setHistory(newHistory);
    }, [history, historyIndex]);

    const handleInput = useCallback((e) => {
        const newContent = e.currentTarget.innerHTML;
        setHtmlContent(newContent);
        setHasChanges(true);
        addToHistory(newContent);
    }, [addToHistory]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedoRef.current = true;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setHtmlContent(history[newIndex]);
            setHasChanges(true);
            
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
            }
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoRedoRef.current = true;
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setHtmlContent(history[newIndex]);
            setHasChanges(true);
            
            if (editorRef.current) {
                editorRef.current.innerHTML = history[newIndex];
            }
        }
    }, [history, historyIndex]);

    const saveDocument = useCallback(async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            // Get current content from editor
            const currentHtml = editorRef.current?.innerHTML || htmlContent;
            // Save HTML content to preserve formatting
            await window.api.writeFileContent(filePath, currentHtml);
            setHtmlContent(currentHtml);
            setHasChanges(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, htmlContent, filePath]);

    const exportAsMarkdown = useCallback(async () => {
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
    }, [htmlContent, filePath]);

    const execCommand = useCallback((command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();

        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    }, [addToHistory]);

    const insertAtCursor = useCallback((html: string) => {
        editorRef.current?.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const fragment = range.createContextualFragment(html);
            range.insertNode(fragment);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    }, [addToHistory]);

    const insertImage = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    insertAtCursor(`<img src="${dataUrl}" style="max-width: 100%; height: auto; margin: 8px 0;" />`);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }, [insertAtCursor]);

    const insertTable = useCallback((rows = 3, cols = 3) => {
        let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 8px 0;">';
        for (let r = 0; r < rows; r++) {
            tableHtml += '<tr>';
            for (let c = 0; c < cols; c++) {
                tableHtml += `<td style="border: 1px solid #555; padding: 8px; min-width: 50px;">${r === 0 ? `Col ${c + 1}` : ''}</td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</table><p><br></p>';
        insertAtCursor(tableHtml);
    }, [insertAtCursor]);

    const insertTextBox = useCallback(() => {
        const textboxHtml = `<div style="border: 2px solid #666; padding: 12px; margin: 8px 0; border-radius: 4px; background: rgba(255,255,255,0.05); min-height: 50px;" contenteditable="true">Text box - click to edit</div><p><br></p>`;
        insertAtCursor(textboxHtml);
    }, [insertAtCursor]);

    const insertHorizontalRule = useCallback(() => {
        insertAtCursor('<hr style="border: none; border-top: 2px solid #555; margin: 16px 0;" /><p><br></p>');
    }, [insertAtCursor]);

    const insertLink = useCallback(() => {
        const url = prompt('Enter URL:');
        if (url) {
            const text = window.getSelection()?.toString() || url;
            execCommand('createLink', url);
        }
    }, [execCommand]);

    const [showTablePicker, setShowTablePicker] = useState(false);
    const [tablePickerSize, setTablePickerSize] = useState({ rows: 3, cols: 3 });

    const handleKeyDown = useCallback((e) => {
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && e.key === 's') {
            e.preventDefault();
            e.stopPropagation();
            saveDocument();
            return;
        }
        if (isCtrl && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            undo();
            return;
        }
        if ((isCtrl && e.shiftKey && (e.key === 'Z' || e.key === 'z')) || (isCtrl && e.key === 'y')) {
            e.preventDefault();
            e.stopPropagation();
            redo();
            return;
        }
        if (isCtrl && e.key === 'b') {
            e.preventDefault();
            e.stopPropagation();
            execCommand('bold');
            return;
        }
        if (isCtrl && e.key === 'i') {
            e.preventDefault();
            e.stopPropagation();
            execCommand('italic');
            return;
        }
        if (isCtrl && e.key === 'u') {
            e.preventDefault();
            e.stopPropagation();
            execCommand('underline');
            return;
        }
        // Strikethrough
        if (isCtrl && e.shiftKey && e.key === 'x') {
            e.preventDefault();
            e.stopPropagation();
            execCommand('strikeThrough');
            return;
        }
        // Select all
        if (isCtrl && e.key === 'a') {
            e.stopPropagation();
            // Let default select all work
            return;
        }
        // Copy/Cut/Paste - let default work but stop propagation
        if (isCtrl && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
            e.stopPropagation();
            return;
        }
    }, [saveDocument, undo, redo, execCommand]);

    const handlePaste = useCallback((e) => {
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
    }, [addToHistory]);

    const handleCut = useCallback((e) => {
        setTimeout(() => {
            if (editorRef.current) {
                const newContent = editorRef.current.innerHTML;
                setHtmlContent(newContent);
                setHasChanges(true);
                addToHistory(newContent);
            }
        }, 0);
    }, [addToHistory]);

    if (error) return (
        <div className="p-4 text-red-500">Error: {error}</div>
    );
    if (!isLoaded) return <div className="p-4">Loading...</div>;

    return (
    <div className="h-full flex flex-col theme-bg-secondary overflow-hidden">
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
                        {filePath ? filePath.split('/').pop() : 'Untitled'}{hasChanges ? ' *' : ''}
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

                <div className="w-px h-6 bg-gray-600 mx-1"></div>

                {/* Insert buttons */}
                <button onClick={insertImage} className="p-2 theme-hover rounded" title="Insert Image">
                    <Image size={16} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowTablePicker(!showTablePicker)}
                        className="p-2 theme-hover rounded"
                        title="Insert Table"
                    >
                        <Table size={16} />
                    </button>
                    {showTablePicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 theme-bg-secondary border theme-border rounded shadow-lg z-50">
                            <div className="text-xs theme-text-muted mb-2">Select size: {tablePickerSize.rows}x{tablePickerSize.cols}</div>
                            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                                {Array.from({ length: 36 }).map((_, i) => {
                                    const row = Math.floor(i / 6) + 1;
                                    const col = (i % 6) + 1;
                                    return (
                                        <div
                                            key={i}
                                            className={`w-4 h-4 border cursor-pointer ${
                                                row <= tablePickerSize.rows && col <= tablePickerSize.cols
                                                    ? 'bg-blue-500 border-blue-600'
                                                    : 'theme-bg-tertiary border-gray-600'
                                            }`}
                                            onMouseEnter={() => setTablePickerSize({ rows: row, cols: col })}
                                            onClick={() => {
                                                insertTable(row, col);
                                                setShowTablePicker(false);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={insertTextBox} className="p-2 theme-hover rounded" title="Insert Text Box">
                    <Type size={16} />
                </button>
                <button onClick={insertLink} className="p-2 theme-hover rounded" title="Insert Link">
                    <Link size={16} />
                </button>
                <button onClick={insertHorizontalRule} className="p-2 theme-hover rounded" title="Insert Horizontal Line">
                    <Minus size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6 theme-bg-primary">
                <div className="max-w-4xl mx-auto">
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        onCut={handleCut}
                        className="p-8 theme-bg-secondary rounded-lg shadow-lg outline-none"
                        style={{
                            maxWidth: '8.5in',
                            padding: '1in',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            color: 'var(--theme-text)',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            minHeight: '100vh',
                            direction: 'ltr',
                            textAlign: 'left'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(DocxViewer);