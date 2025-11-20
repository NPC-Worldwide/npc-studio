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
import * as XLSX from 'xlsx';

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
    const [editingCell, setEditingCell] = useState(null);
    const [workbook, setWorkbook] = useState(null);
    const [sheetNames, setSheetNames] = useState([]);
    const [activeSheet, setActiveSheet] = useState('');
    const tableRef = useRef(null);

    const isXlsx = filePath?.endsWith('.xlsx') || filePath?.endsWith('.xls');

    useEffect(() => {
        loadSpreadsheet();
    }, [filePath]);

    const loadSheetData = (wb, sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length > 0) {
            setHeaders(jsonData[0] || ['Column 1']);
            setData(jsonData.slice(1) || [[]]);
        } else {
            setHeaders(['Column 1']);
            setData([['']]);
        }
    };
const loadSpreadsheet = async () => {
    if (!filePath) return;
    try {
        if (isXlsx) {
            const buffer = await window.api.readFileBuffer(filePath);
            const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            setWorkbook(wb);
            setSheetNames(wb.SheetNames);
            
            if (wb.SheetNames.length > 0) {
                setActiveSheet(wb.SheetNames[0]);
                loadSheetData(wb, wb.SheetNames[0]);
            }
        } else {
            const response = await window.api.readCsvContent(filePath);
            if (response.error) throw new Error(response.error);
            
            setHeaders(response.headers || ['Column 1']);
            setData(response.rows || [[]]);
        }
    } catch (err) {
        setError(err.message);
    }
};

    const switchSheet = (sheetName) => {
        if (workbook) {
            // Save current sheet data first
            const sheetData = [headers, ...data];
            workbook.Sheets[activeSheet] = XLSX.utils.aoa_to_sheet(sheetData);
            
            setActiveSheet(sheetName);
            loadSheetData(workbook, sheetName);
            setSelectedCell(null);
            setEditingCell(null);
            setSelectedRange(null);
        }
    };

    const addSheet = () => {
        const newName = `Sheet${sheetNames.length + 1}`;
        setSheetNames(prev => [...prev, newName]);
        if (workbook) {
            workbook.SheetNames.push(newName);
            workbook.Sheets[newName] = XLSX.utils.aoa_to_sheet([['Column 1'], ['']]);
        }
        switchSheet(newName);
        setHasChanges(true);
    };

    const saveSpreadsheet = async () => {
        try {
            if (isXlsx && workbook) {
                const sheetData = [headers, ...data];
                workbook.Sheets[activeSheet] = XLSX.utils.aoa_to_sheet(sheetData);
                const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
                await window.api.writeFileContent(filePath, wbout, 'binary');
            } else {
                const csvContent = [
                    headers.join(','),
                    ...data.map(row => 
                        row.map(cell => {
                            const str = String(cell ?? '');
                            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                                return `"${str.replace(/"/g, '""')}"`;
                            }
                            return str;
                        }).join(',')
                    )
                ].join('\n');

                await window.api.writeFileContent(filePath, csvContent);
            }
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
            [newData[fromIndex], newData[toIndex]] = [newData[toIndex], newData[fromIndex]];
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

    const evaluateFormula = useCallback((formula, sheetData, currentRow, currentCol) => {
    if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) {
        return formula;
    }

    try {
        const expr = formula.substring(1).toUpperCase();
        
        // SUM(A1:B3)
        const sumMatch = expr.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        if (sumMatch) {
            const startCol = sumMatch[1].charCodeAt(0) - 65;
            const startRow = parseInt(sumMatch[2]) - 1;
            const endCol = sumMatch[3].charCodeAt(0) - 65;
            const endRow = parseInt(sumMatch[4]) - 1;
            let sum = 0;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const val = parseFloat(sheetData[r]?.[c]) || 0;
                    sum += val;
                }
            }
            return sum;
        }

        // AVERAGE(A1:B3)
        const avgMatch = expr.match(/^AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        if (avgMatch) {
            const startCol = avgMatch[1].charCodeAt(0) - 65;
            const startRow = parseInt(avgMatch[2]) - 1;
            const endCol = avgMatch[3].charCodeAt(0) - 65;
            const endRow = parseInt(avgMatch[4]) - 1;
            let sum = 0;
            let count = 0;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const val = parseFloat(sheetData[r]?.[c]);
                    if (!isNaN(val)) {
                        sum += val;
                        count++;
                    }
                }
            }
            return count > 0 ? (sum / count).toFixed(2) : 0;
        }

        // COUNT(A1:B3)
        const countMatch = expr.match(/^COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        if (countMatch) {
            const startCol = countMatch[1].charCodeAt(0) - 65;
            const startRow = parseInt(countMatch[2]) - 1;
            const endCol = countMatch[3].charCodeAt(0) - 65;
            const endRow = parseInt(countMatch[4]) - 1;
            let count = 0;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (sheetData[r]?.[c] !== '' && sheetData[r]?.[c] != null) {
                        count++;
                    }
                }
            }
            return count;
        }

        // MAX(A1:B3)
        const maxMatch = expr.match(/^MAX\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        if (maxMatch) {
            const startCol = maxMatch[1].charCodeAt(0) - 65;
            const startRow = parseInt(maxMatch[2]) - 1;
            const endCol = maxMatch[3].charCodeAt(0) - 65;
            const endRow = parseInt(maxMatch[4]) - 1;
            let max = -Infinity;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const val = parseFloat(sheetData[r]?.[c]);
                    if (!isNaN(val) && val > max) max = val;
                }
            }
            return max === -Infinity ? 0 : max;
        }

        // MIN(A1:B3)
        const minMatch = expr.match(/^MIN\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/);
        if (minMatch) {
            const startCol = minMatch[1].charCodeAt(0) - 65;
            const startRow = parseInt(minMatch[2]) - 1;
            const endCol = minMatch[3].charCodeAt(0) - 65;
            const endRow = parseInt(minMatch[4]) - 1;
            let min = Infinity;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const val = parseFloat(sheetData[r]?.[c]);
                    if (!isNaN(val) && val < min) min = val;
                }
            }
            return min === Infinity ? 0 : min;
        }

        // Simple cell reference like =A1
        const cellRefMatch = expr.match(/^([A-Z]+)(\d+)$/);
        if (cellRefMatch) {
            const col = cellRefMatch[1].charCodeAt(0) - 65;
            const row = parseInt(cellRefMatch[2]) - 1;
            return sheetData[row]?.[col] ?? '';
        }

        // Basic math: =A1+B1, =A1*2, etc.
        const mathMatch = expr.match(/^([A-Z]+)(\d+)\s*([+\-*/])\s*([A-Z]+)?(\d+)?$/);
        if (mathMatch) {
            const col1 = mathMatch[1].charCodeAt(0) - 65;
            const row1 = parseInt(mathMatch[2]) - 1;
            const op = mathMatch[3];
            const val1 = parseFloat(sheetData[row1]?.[col1]) || 0;
            
            let val2;
            if (mathMatch[4]) {
                const col2 = mathMatch[4].charCodeAt(0) - 65;
                const row2 = parseInt(mathMatch[5]) - 1;
                val2 = parseFloat(sheetData[row2]?.[col2]) || 0;
            } else {
                val2 = parseFloat(mathMatch[5]) || 0;
            }

            switch (op) {
                case '+': return val1 + val2;
                case '-': return val1 - val2;
                case '*': return val1 * val2;
                case '/': return val2 !== 0 ? val1 / val2 : '#DIV/0!';
            }
        }

// Simple numeric math: =5+7, =10*2, etc.
const numericMathMatch = expr.match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/);
if (numericMathMatch) {
    const val1 = parseFloat(numericMathMatch[1]);
    const op = numericMathMatch[2];
    const val2 = parseFloat(numericMathMatch[3]);

    switch (op) {
        case '+': return val1 + val2;
        case '-': return val1 - val2;
        case '*': return val1 * val2;
        case '/': return val2 !== 0 ? val1 / val2 : '#DIV/0!';
    }
}

return '#ERROR!';    } catch (err) {
        return '#ERROR!';
    }
}, []);
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
return (
    <div className="flex-1 flex flex-col theme-bg-secondary" style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Header */}
        <div 
            draggable="true"
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                const nodePath = findNodePath(rootLayoutNode, nodeId);
                e.dataTransfer.setData('application/json', 
                    JSON.stringify({ type: 'pane', id: nodeId, nodePath })
                );
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

        {/* Table - adjusted for bottom tabs */}
        <div 
            ref={tableRef}
            style={{ 
                overflow: 'scroll',
                position: 'absolute',
                top: '45px',
                bottom: isXlsx && sheetNames.length > 0 ? '85px' : '45px',
                left: '0',
                right: '0'
            }}
        >
            <table className="border-collapse text-sm">
                <thead className="sticky top-0 theme-bg-tertiary z-10">
                    <tr>
                        <th className="border theme-border p-1 w-12 bg-gray-700">#</th>
                        {headers.map((header, colIndex) => (
                            <th key={colIndex} className="border theme-border p-1 min-w-[100px] group relative">
                                <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => updateHeader(colIndex, e.target.value)}
                                    className="w-full bg-transparent text-center font-semibold outline-none"
                                />
                                <button
                                    onClick={() => deleteColumn(colIndex)}
                                    className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-0.5 bg-red-500 rounded"
                                    title="Delete column"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </th>
                        ))}
                        <th className="border theme-border p-1 w-12">
                            <button
                                onClick={addColumn}
                                className="w-full h-full flex items-center justify-center theme-hover"
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
                            <td className="border theme-border p-1 bg-gray-700">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs text-gray-400">{rowIndex + 1}</span>
                                    <div className="flex flex-col opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => moveRow(rowIndex, -1)}
                                            disabled={rowIndex === 0}
                                            className="p-0.5 theme-hover rounded disabled:opacity-30"
                                        >
                                            <ArrowUp size={10} />
                                        </button>
                                        <button
                                            onClick={() => moveRow(rowIndex, 1)}
                                            disabled={rowIndex === data.length - 1}
                                            className="p-0.5 theme-hover rounded disabled:opacity-30"
                                        >
                                            <ArrowDown size={10} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => deleteRow(rowIndex)}
                                        className="p-0.5 bg-red-500 rounded opacity-0 group-hover:opacity-100"
                                        title="Delete row"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            </td>
                            {headers.map((_, colIndex) => {
                                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                const isSelected = isCellSelected(rowIndex, colIndex);
                                const cellValue = row[colIndex] ?? '';
                                const displayValue = typeof cellValue === 'string' && cellValue.startsWith('=') 
                                    ? evaluateFormula(cellValue, data, rowIndex, colIndex)
                                    : cellValue;
                                
                                return (
                                    <td 
                                        key={colIndex}
                                        className={`border theme-border p-0 
                                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                                            ${isEditing ? 'ring-2 ring-green-500' : ''}
                                            hover:bg-gray-700 cursor-cell`}
                                        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                                        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                                    >
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={cellValue}
                                                onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                                onBlur={() => setEditingCell(null)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                                        setEditingCell(null);
                                                    }
                                                }}
                                                className="w-full h-full p-2 bg-transparent outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="p-2 min-h-[32px]">{displayValue}</div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="border theme-border p-1">
                                <button
                                    onClick={() => addRow(rowIndex + 1)}
                                    className="w-full h-full flex items-center justify-center theme-hover opacity-0 group-hover:opacity-100"
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

        {/* Sheet Tabs - BOTTOM LEFT */}
        {isXlsx && sheetNames.length > 0 && (
            <div className="absolute bottom-[45px] left-0 right-0 flex items-center gap-1 p-2 border-t theme-border theme-bg-tertiary overflow-x-auto">
                {sheetNames.map(name => (
                    <button
                        key={name}
                        onClick={() => switchSheet(name)}
                        className={`px-3 py-1 text-xs rounded transition-all whitespace-nowrap ${
                            activeSheet === name 
                                ? 'theme-button-primary' 
                                : 'theme-button theme-hover'
                        }`}
                    >
                        {name}
                    </button>
                ))}
                <button
                    onClick={addSheet}
                    className="p-1 theme-hover rounded"
                    title="Add sheet"
                >
                    <Plus size={14} />
                </button>
            </div>
        )}

        {/* Cell Info Bar - BOTTOM */}
        <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between absolute bottom-0 left-0 right-0 theme-bg-secondary">
            <div className="flex items-center gap-4">
                {selectedCell && (
                    <>
                        <span>
                            Cell: {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
                        </span>
                        {selectedRange && (
                            <span>
                                Range: {selectedRange.endRow - selectedRange.startRow + 1}
                                ×{selectedRange.endCol - selectedRange.startCol + 1}
                            </span>
                        )}
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={copySelection} className="p-1 theme-hover rounded" title="Copy (Ctrl+C)">
                    <Copy size={12} />
                </button>
                <button onClick={cutSelection} className="p-1 theme-hover rounded" title="Cut (Ctrl+X)">
                    <Scissors size={12} />
                </button>
            </div>
        </div>
    </div>
);};

export default CsvViewer;


const renderCsvViewer = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData?.contentId) return null;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <CsvViewer
                filePath={paneData.contentId}
                nodeId={nodeId} // This prop is likely for internal use within CsvViewer
            />
        </div>
    );
}, [contentDataRef]);
