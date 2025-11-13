import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Save, 
    Plus, 
    Trash2, 
    ArrowUp,
    ArrowDown,
    X,
    Copy,
    Scissors
} from 'lucide-react';

const CsvViewer = ({ 
    filePath, 
    nodeId, 
    findNodePath, 
    rootLayoutNode, 
    setDraggedItem, 
    setPaneContextMenu, 
    closeContentPane 
}) => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [error, setError] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedRange, setSelectedRange] = useState(null);
    const [clipboard, setClipboard] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const tableRef = useRef(null);

    useEffect(() => {
        loadSpreadsheet();
    }, [filePath]);

    const loadSpreadsheet = async () => {
        if (!filePath) return;
        try {
            const response = await window.api.readCsvContent(filePath);
            if (response.error) throw new Error(response.error);
            
            setHeaders(response.headers || ['Column 1']);
            setData(response.rows || [[]]);
        } catch (err) {
            setError(err.message);
        }
    };

    const saveSpreadsheet = async () => {
        try {
            const csvContent = [
                headers.join(','),
                ...data.map(row => 
                    row.map(cell => {
                        const str = String(cell ?? '');
                        if (str.includes(',') || str.includes('"') || 
                            str.includes('\n')) {
                            return `"${str.replace(/"/g, '""')}"`;
                        }
                        return str;
                    }).join(',')
                )
            ].join('\n');

            await window.api.writeFileContent(filePath, csvContent);
            setHasChanges(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const updateCell = useCallback((rowIndex, colIndex, value) => {
        setData(prevData => {
            const newData = [...prevData];
            if (!newData[rowIndex]) {
                newData[rowIndex] = new Array(headers.length).fill('');
            }
            newData[rowIndex] = [...newData[rowIndex]];
            newData[rowIndex][colIndex] = value;
            return newData;
        });
        setHasChanges(true);
    }, [headers.length]);

    const updateHeader = useCallback((colIndex, value) => {
        setHeaders(prev => {
            const newHeaders = [...prev];
            newHeaders[colIndex] = value;
            return newHeaders;
        });
        setHasChanges(true);
    }, []);

    const addRow = useCallback((index = data.length) => {
        setData(prev => {
            const newData = [...prev];
            newData.splice(index, 0, new Array(headers.length).fill(''));
            return newData;
        });
        setHasChanges(true);
    }, [data.length, headers.length]);

    const deleteRow = useCallback((index) => {
        if (data.length <= 1) return;
        setData(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    }, [data.length]);

    const addColumn = useCallback(() => {
        setHeaders(prev => [...prev, `Column ${prev.length + 1}`]);
        setData(prev => prev.map(row => [...(row || []), '']));
        setHasChanges(true);
    }, []);

    const deleteColumn = useCallback((colIndex) => {
        if (headers.length <= 1) return;
        setHeaders(prev => prev.filter((_, i) => i !== colIndex));
        setData(prev => prev.map(row => row.filter((_, i) => i !== colIndex)));
        setHasChanges(true);
    }, [headers.length]);

    const moveRow = useCallback((fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= data.length) return;
        
        setData(prev => {
            const newData = [...prev];
            [newData[fromIndex], newData[toIndex]] = 
                [newData[toIndex], newData[fromIndex]];
            return newData;
        });
        setHasChanges(true);
    }, [data.length]);

    const copySelection = useCallback(() => {
        if (!selectedCell && !selectedRange) return;
        
        if (selectedRange) {
            const { startRow, endRow, startCol, endCol } = selectedRange;
            const copied = [];
            for (let r = startRow; r <= endRow; r++) {
                const row = [];
                for (let c = startCol; c <= endCol; c++) {
                    row.push(data[r]?.[c] ?? '');
                }
                copied.push(row);
            }
            setClipboard(copied);
        } else if (selectedCell) {
            const { row, col } = selectedCell;
            setClipboard([[data[row]?.[col] ?? '']]);
        }
    }, [selectedCell, selectedRange, data]);

    const cutSelection = useCallback(() => {
        copySelection();
        
        if (selectedRange) {
            const { startRow, endRow, startCol, endCol } = selectedRange;
            setData(prev => {
                const newData = [...prev];
                for (let r = startRow; r <= endRow; r++) {
                    for (let c = startCol; c <= endCol; c++) {
                        if (newData[r]) {
                            newData[r] = [...newData[r]];
                            newData[r][c] = '';
                        }
                    }
                }
                return newData;
            });
        } else if (selectedCell) {
            updateCell(selectedCell.row, selectedCell.col, '');
        }
        setHasChanges(true);
    }, [copySelection, selectedCell, selectedRange, updateCell]);

    const pasteSelection = useCallback(() => {
        if (!clipboard || !selectedCell) return;
        
        const { row: startRow, col: startCol } = selectedCell;
        setData(prev => {
            const newData = [...prev];
            
            clipboard.forEach((clipRow, rOffset) => {
                const targetRow = startRow + rOffset;
                if (targetRow >= newData.length) {
                    newData.push(new Array(headers.length).fill(''));
                }
                
                newData[targetRow] = [...(newData[targetRow] || [])];
                clipRow.forEach((value, cOffset) => {
                    const targetCol = startCol + cOffset;
                    if (targetCol < headers.length) {
                        newData[targetRow][targetCol] = value;
                    }
                });
            });
            
            return newData;
        });
        setHasChanges(true);
    }, [clipboard, selectedCell, headers.length]);

    const handleCellClick = (rowIndex, colIndex, e) => {
        if (e.shiftKey && selectedCell) {
            setSelectedRange({
                startRow: Math.min(selectedCell.row, rowIndex),
                endRow: Math.max(selectedCell.row, rowIndex),
                startCol: Math.min(selectedCell.col, colIndex),
                endCol: Math.max(selectedCell.col, colIndex)
            });
        } else {
            setSelectedCell({ row: rowIndex, col: colIndex });
            setSelectedRange(null);
        }
    };

    const handleCellDoubleClick = (rowIndex, colIndex) => {
        setEditingCell({ row: rowIndex, col: colIndex });
    };

    const handleKeyDown = useCallback((e) => {
        if (!selectedCell) return;

        if (e.key === 'Enter' && !editingCell) {
            e.preventDefault();
            setEditingCell(selectedCell);
            return;
        }

        if (editingCell) return;

        const { row, col } = selectedCell;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (row > 0) setSelectedCell({ row: row - 1, col });
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (row < data.length - 1) setSelectedCell({ row: row + 1, col });
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (col > 0) setSelectedCell({ row, col: col - 1 });
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (col < headers.length - 1) setSelectedCell({ row, col: col + 1 });
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (selectedRange) {
                    const { startRow, endRow, startCol, endCol } = selectedRange;
                    setData(prev => {
                        const newData = [...prev];
                        for (let r = startRow; r <= endRow; r++) {
                            for (let c = startCol; c <= endCol; c++) {
                                if (newData[r]) {
                                    newData[r] = [...newData[r]];
                                    newData[r][c] = '';
                                }
                            }
                        }
                        return newData;
                    });
                } else {
                    updateCell(row, col, '');
                }
                setHasChanges(true);
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    copySelection();
                }
                break;
            case 'x':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    cutSelection();
                }
                break;
            case 'v':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    pasteSelection();
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    saveSpreadsheet();
                }
                break;
        }
    }, [selectedCell, editingCell, data.length, headers.length, selectedRange, 
        copySelection, cutSelection, pasteSelection, updateCell, saveSpreadsheet]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const isCellSelected = (rowIndex, colIndex) => {
        if (selectedRange) {
            const { startRow, endRow, startCol, endCol } = selectedRange;
            return rowIndex >= startRow && rowIndex <= endRow &&
                   colIndex >= startCol && colIndex <= endCol;
        }
        return selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
    };

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary">
            <div 
                draggable="true"
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    const nodePath = findNodePath(rootLayoutNode, nodeId);
                    e.dataTransfer.setData('application/json', 
                        JSON.stringify({ type: 'pane', id: nodeId, nodePath })
                    );
                    setTimeout(() => setDraggedItem({ 
                        type: 'pane', id: nodeId, nodePath 
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
                className="p-2 border-b theme-border text-xs theme-text-muted 
                    flex-shrink-0 theme-bg-secondary cursor-move"
            >
                <div className="flex justify-between items-center">
                    <span className="truncate font-semibold">
                        {filePath.split('/').pop()}{hasChanges ? ' *' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={saveSpreadsheet}
                            disabled={!hasChanges}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Save (Ctrl+S)"
                        >
                            <Save size={14} />
                        </button>
                        <button 
                            onClick={() => addRow()}
                            className="p-1 theme-hover rounded"
                            title="Add row"
                        >
                            <Plus size={14} />
                        </button>
                        <button 
                            onClick={() => setDraggedItem(null)}
                            className="p-1 theme-hover rounded-full"
                        >
                            <X size={14} />
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                closeContentPane(nodeId, 
                                    findNodePath(rootLayoutNode, nodeId)
                                );
                            }}
                            className="p-1 theme-hover rounded-full"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto" ref={tableRef}>
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 theme-bg-tertiary z-10">
                        <tr>
                            <th className="border theme-border p-1 w-12 
                                bg-gray-700 sticky left-0 z-20">
                                #
                            </th>
                            {headers.map((header, colIndex) => (
                                <th key={colIndex} 
                                    className="border theme-border p-1 
                                        min-w-[100px] group relative"
                                >
                                    <input
                                        type="text"
                                        value={header}
                                        onChange={(e) => 
                                            updateHeader(colIndex, e.target.value)
                                        }
                                        className="w-full bg-transparent 
                                            text-center font-semibold 
                                            outline-none"
                                    />
                                    <button
                                        onClick={() => deleteColumn(colIndex)}
                                        className="absolute right-1 top-1 
                                            opacity-0 group-hover:opacity-100 
                                            p-0.5 bg-red-500 rounded"
                                        title="Delete column"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </th>
                            ))}
                            <th className="border theme-border p-1 w-12">
                                <button
                                    onClick={addColumn}
                                    className="w-full h-full flex items-center 
                                        justify-center theme-hover"
                                    title="Add column"
                                >
                                    <Plus size={14} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="group">
                                <td className="border theme-border p-1 
                                    bg-gray-700 sticky left-0 z-10"
                                >
                                    <div className="flex items-center 
                                        justify-between gap-1"
                                    >
                                        <span className="text-xs text-gray-400">
                                            {rowIndex + 1}
                                        </span>
                                        <div className="flex flex-col 
                                            opacity-0 group-hover:opacity-100"
                                        >
                                            <button
                                                onClick={() => moveRow(rowIndex, -1)}
                                                disabled={rowIndex === 0}
                                                className="p-0.5 theme-hover rounded 
                                                    disabled:opacity-30"
                                            >
                                                <ArrowUp size={10} />
                                            </button>
                                            <button
                                                onClick={() => moveRow(rowIndex, 1)}
                                                disabled={rowIndex === data.length - 1}
                                                className="p-0.5 theme-hover rounded 
                                                    disabled:opacity-30"
                                            >
                                                <ArrowDown size={10} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => deleteRow(rowIndex)}
                                            className="p-0.5 bg-red-500 rounded 
                                                opacity-0 group-hover:opacity-100"
                                            title="Delete row"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </td>
                                {headers.map((_, colIndex) => {
                                    const isEditing = editingCell?.row === rowIndex && 
                                                     editingCell?.col === colIndex;
                                    const isSelected = isCellSelected(rowIndex, colIndex);
                                    
                                    return (
                                        <td 
                                            key={colIndex}
                                            className={`border theme-border p-0 
                                                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                                                ${isEditing ? 'ring-2 ring-green-500' : ''}
                                                hover:bg-gray-700 cursor-cell`}
                                            onClick={(e) => 
                                                handleCellClick(rowIndex, colIndex, e)
                                            }
                                            onDoubleClick={() => 
                                                handleCellDoubleClick(rowIndex, colIndex)
                                            }
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={row[colIndex] ?? ''}
                                                    onChange={(e) => 
                                                        updateCell(rowIndex, colIndex, 
                                                            e.target.value)
                                                    }
                                                    onBlur={() => setEditingCell(null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || 
                                                            e.key === 'Escape') {
                                                            setEditingCell(null);
                                                        }
                                                    }}
                                                    className="w-full h-full p-2 
                                                        bg-transparent outline-none"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="p-2 min-h-[32px]">
                                                    {row[colIndex] ?? ''}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="border theme-border p-1">
                                    <button
                                        onClick={() => addRow(rowIndex + 1)}
                                        className="w-full h-full flex items-center 
                                            justify-center theme-hover 
                                            opacity-0 group-hover:opacity-100"
                                        title="Insert row below"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCell && (
                <div className="p-2 border-t theme-border text-xs 
                    theme-text-muted flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <span>
                            Cell: {String.fromCharCode(65 + selectedCell.col)}
                            {selectedCell.row + 1}
                        </span>
                        {selectedRange && (
                            <span>
                                Range: {selectedRange.endRow - selectedRange.startRow + 1}
                                ×{selectedRange.endCol - selectedRange.startCol + 1}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={copySelection}
                            className="p-1 theme-hover rounded"
                            title="Copy (Ctrl+C)"
                        >
                            <Copy size={12} />
                        </button>
                        <button
                            onClick={cutSelection}
                            className="p-1 theme-hover rounded"
                            title="Cut (Ctrl+X)"
                        >
                            <Scissors size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CsvViewer;