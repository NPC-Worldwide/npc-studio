import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Save, Play, Plus, Trash2, ChevronDown, ChevronRight, X, Loader, Code2, FileText, Edit3, Circle, Zap, Square, Power } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import MarkdownRenderer from './MarkdownRenderer';

// Syntax highlighting style
const highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: '#c678dd' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e06c75' },
    { tag: [t.function(t.variableName), t.labelName], color: '#61afef' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#d19a66' },
    { tag: [t.definition(t.name)], color: '#e5c07b' },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#d19a66' },
    { tag: [t.operator, t.operatorKeyword], color: '#56b6c2' },
    { tag: [t.meta, t.comment], color: '#7f848e', fontStyle: 'italic' },
    { tag: [t.string, t.inserted], color: '#98c379' },
    { tag: t.invalid, color: '#ff5555' },
]);

const editorTheme = EditorView.theme({
    '&': { fontSize: '13px', backgroundColor: '#1e1e2e' },
    '.cm-content': { fontFamily: '"Fira Code", monospace', padding: '8px 0' },
    '.cm-gutters': { backgroundColor: '#181825', color: '#6c7086', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(137, 180, 250, 0.08)' },
});

interface NotebookCell {
    cell_type: 'code' | 'markdown' | 'raw';
    source: string[];
    outputs?: any[];
    execution_count?: number | null;
    metadata?: any;
}

interface Notebook {
    cells: NotebookCell[];
    metadata: any;
    nbformat: number;
    nbformat_minor: number;
}

const NotebookViewer = ({
    nodeId,
    contentDataRef,
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane,
    performSplit
}: any) => {
    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExecuting, setIsExecuting] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());
    const [editingMarkdownCell, setEditingMarkdownCell] = useState<number | null>(null);

    // Kernel state
    const [availableKernels, setAvailableKernels] = useState<Array<{name: string, displayName: string, language: string}>>([]);
    const [selectedKernel, setSelectedKernel] = useState<string>('python3');
    const [kernelId, setKernelId] = useState<string | null>(null);
    const [kernelStatus, setKernelStatus] = useState<'disconnected' | 'starting' | 'connected' | 'busy'>('disconnected');
    const [showKernelMenu, setShowKernelMenu] = useState(false);
    const [jupyterInstalled, setJupyterInstalled] = useState<boolean | null>(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [pythonPath, setPythonPath] = useState<string>('python3');

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;

    // Get workspace path from file path
    const workspacePath = filePath ? filePath.substring(0, filePath.lastIndexOf('/')) : null;

    // CodeMirror extensions for Python
    const pythonExtensions = useMemo(() => [
        python(),
        syntaxHighlighting(highlightStyle),
        editorTheme,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
    ], []);

    // CodeMirror extensions for Markdown
    const markdownExtensions = useMemo(() => [
        markdown(),
        syntaxHighlighting(highlightStyle),
        editorTheme,
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.lineWrapping,
    ], []);

    // Check if Jupyter is installed and load kernels on mount
    useEffect(() => {
        const checkAndLoadKernels = async () => {
            if (!workspacePath) return;

            try {
                // First check if Jupyter is installed
                const checkResult = await (window as any).api.jupyterCheckInstalled({ workspacePath });
                setJupyterInstalled(checkResult?.installed ?? false);
                if (checkResult?.pythonPath) {
                    setPythonPath(checkResult.pythonPath);
                }

                if (checkResult?.installed) {
                    // Load available kernels
                    const result = await (window as any).api.jupyterListKernels({ workspacePath });
                    if (result?.success && result.kernels) {
                        setAvailableKernels(result.kernels);
                        if (result.kernels.length > 0 && !selectedKernel) {
                            setSelectedKernel(result.kernels[0].name);
                        }
                    }
                    if (result?.pythonPath) {
                        setPythonPath(result.pythonPath);
                    }
                }
            } catch (e) {
                console.error('Failed to check/load kernels:', e);
                setJupyterInstalled(false);
            }
        };
        checkAndLoadKernels();
    }, [workspacePath]);

    // Install Jupyter
    const installJupyter = useCallback(async () => {
        if (!workspacePath) return;
        setIsInstalling(true);
        setError(null);

        try {
            const result = await (window as any).api.jupyterInstall({ workspacePath });
            if (result?.success) {
                // Register the kernel
                await (window as any).api.jupyterRegisterKernel({ workspacePath });
                setJupyterInstalled(true);

                // Load kernels
                const kernelResult = await (window as any).api.jupyterListKernels({ workspacePath });
                if (kernelResult?.success && kernelResult.kernels) {
                    setAvailableKernels(kernelResult.kernels);
                }
            } else {
                setError(result?.error || 'Failed to install Jupyter');
            }
        } catch (e: any) {
            setError(e.message || 'Installation failed');
        } finally {
            setIsInstalling(false);
        }
    }, [workspacePath]);

    // Start kernel
    const startKernel = useCallback(async () => {
        if (kernelStatus === 'connected' || kernelStatus === 'starting') return;
        if (!jupyterInstalled) {
            setError('Jupyter is not installed. Click "Install Jupyter" first.');
            return;
        }

        setKernelStatus('starting');
        setError(null);
        const newKernelId = `kernel_${nodeId}_${Date.now()}`;

        try {
            const result = await (window as any).api.jupyterStartKernel({
                kernelId: newKernelId,
                kernelName: selectedKernel,
                workspacePath
            });

            if (result?.success) {
                setKernelId(newKernelId);
                setKernelStatus('connected');
                if (result?.pythonPath) {
                    setPythonPath(result.pythonPath);
                }
            } else {
                setError(result?.error || 'Failed to start kernel');
                setKernelStatus('disconnected');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to start kernel');
            setKernelStatus('disconnected');
        }
    }, [selectedKernel, kernelStatus, nodeId, workspacePath, jupyterInstalled]);

    // Stop kernel
    const stopKernel = useCallback(async () => {
        if (!kernelId) return;

        try {
            await (window as any).api.jupyterStopKernel({ kernelId });
        } catch (e) {
            console.error('Error stopping kernel:', e);
        } finally {
            setKernelId(null);
            setKernelStatus('disconnected');
        }
    }, [kernelId]);

    // Clean up kernel on unmount
    useEffect(() => {
        return () => {
            if (kernelId) {
                (window as any).api.jupyterStopKernel({ kernelId }).catch(() => {});
            }
        };
    }, [kernelId]);

    // Listen for kernel stopped events
    useEffect(() => {
        const unsubscribe = (window as any).api.onJupyterKernelStopped?.((data: any) => {
            if (data.kernelId === kernelId) {
                setKernelId(null);
                setKernelStatus('disconnected');
            }
        });
        return () => unsubscribe?.();
    }, [kernelId]);

    // Load notebook
    useEffect(() => {
        const load = async () => {
            if (!filePath) return;
            try {
                const text = await (window as any).api.readFileContent(filePath);
                if (text?.error) throw new Error(text.error);
                const content = typeof text === 'string' ? text : text?.content ?? '';
                const parsed = JSON.parse(content);
                setNotebook(parsed);
                setHasChanges(false);
            } catch (e: any) {
                setError(e.message || String(e));
            }
        };
        load();
    }, [filePath]);

    // Save notebook
    const save = useCallback(async () => {
        if (!hasChanges || !notebook) return;
        setIsSaving(true);
        setError(null);
        try {
            await (window as any).api.writeFileContent(filePath, JSON.stringify(notebook, null, 2));
            setHasChanges(false);
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, notebook, filePath]);

    // Update cell source
    const updateCellSource = useCallback((index: number, newSource: string) => {
        if (!notebook) return;
        const newCells = [...notebook.cells];
        newCells[index] = { ...newCells[index], source: newSource.split('\n').map((line, i, arr) =>
            i < arr.length - 1 ? line + '\n' : line
        )};
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Add new cell
    const addCell = useCallback((afterIndex: number, type: 'code' | 'markdown') => {
        if (!notebook) return;
        const newCell: NotebookCell = {
            cell_type: type,
            source: [''],
            outputs: type === 'code' ? [] : undefined,
            execution_count: type === 'code' ? null : undefined,
            metadata: {}
        };
        const newCells = [...notebook.cells];
        newCells.splice(afterIndex + 1, 0, newCell);
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Delete cell
    const deleteCell = useCallback((index: number) => {
        if (!notebook || notebook.cells.length <= 1) return;
        const newCells = notebook.cells.filter((_, i) => i !== index);
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Change cell type
    const changeCellType = useCallback((index: number, newType: 'code' | 'markdown') => {
        if (!notebook) return;
        const newCells = [...notebook.cells];
        newCells[index] = {
            ...newCells[index],
            cell_type: newType,
            outputs: newType === 'code' ? [] : undefined,
            execution_count: newType === 'code' ? null : undefined
        };
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Toggle cell collapse
    const toggleCollapse = useCallback((index: number) => {
        setCollapsedCells(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) newSet.delete(index);
            else newSet.add(index);
            return newSet;
        });
    }, []);

    // Execute cell with real kernel
    const executeCell = useCallback(async (index: number) => {
        if (!notebook) return;

        const cell = notebook.cells[index];
        if (cell.cell_type !== 'code') return;

        // Auto-start kernel if not connected
        if (kernelStatus !== 'connected' && kernelStatus !== 'busy') {
            await startKernel();
            // Wait a bit for kernel to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!kernelId) {
            setError('No kernel connected. Click "Start Kernel" first.');
            return;
        }

        setIsExecuting(index);
        setKernelStatus('busy');

        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

        try {
            const result = await (window as any).api.jupyterExecuteCode({
                kernelId,
                code: source,
                cellIndex: index
            });

            const newCells = [...notebook.cells];
            newCells[index] = {
                ...newCells[index],
                execution_count: result.executionCount || (newCells[index].execution_count || 0) + 1,
                outputs: result.outputs || []
            };

            if (!result.success && result.error) {
                // Add error to outputs if not already there
                if (!result.outputs?.length) {
                    newCells[index].outputs = [{
                        output_type: 'error',
                        ename: 'ExecutionError',
                        evalue: result.error,
                        traceback: [result.error]
                    }];
                }
            }

            setNotebook({ ...notebook, cells: newCells });
            setHasChanges(true);
        } catch (e: any) {
            const newCells = [...notebook.cells];
            newCells[index] = {
                ...newCells[index],
                outputs: [{
                    output_type: 'error',
                    ename: 'Error',
                    evalue: e.message || 'Execution failed',
                    traceback: [e.message || 'Execution failed']
                }]
            };
            setNotebook({ ...notebook, cells: newCells });
        } finally {
            setIsExecuting(null);
            setKernelStatus('connected');
        }
    }, [notebook, kernelId, kernelStatus, startKernel]);

    // Keyboard shortcuts
    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (hasChanges) save();
        }
    }, [hasChanges, save]);

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onKeyDown]);

    // Render cell output
    const renderOutput = (output: any, outputIndex: number) => {
        if (!output) return null;

        if (output.output_type === 'stream') {
            return (
                <pre key={outputIndex} className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-2 rounded">
                    {Array.isArray(output.text) ? output.text.join('') : output.text}
                </pre>
            );
        }

        if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
            const data = output.data;
            if (data?.['text/html']) {
                return (
                    <div key={outputIndex} className="text-xs bg-gray-900 p-2 rounded"
                         dangerouslySetInnerHTML={{ __html: Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html'] }} />
                );
            }
            if (data?.['image/png']) {
                return (
                    <img key={outputIndex} src={`data:image/png;base64,${data['image/png']}`}
                         alt="Output" className="max-w-full rounded" />
                );
            }
            if (data?.['text/plain']) {
                return (
                    <pre key={outputIndex} className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-2 rounded">
                        {Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain']}
                    </pre>
                );
            }
        }

        if (output.output_type === 'error') {
            return (
                <pre key={outputIndex} className="text-xs text-red-400 whitespace-pre-wrap font-mono bg-gray-900 p-2 rounded">
                    {output.ename}: {output.evalue}
                    {output.traceback && '\n' + output.traceback.join('\n')}
                </pre>
            );
        }

        return null;
    };

    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!notebook) return <div className="p-4">Loading notebook...</div>;

    return (
        <div className="h-full flex flex-col theme-bg-secondary overflow-hidden">
            {/* Header */}
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
                    <span className="truncate font-semibold text-orange-400">
                        {filePath ? filePath.split('/').pop() : 'Untitled.ipynb'}{hasChanges ? ' *' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Kernel controls */}
                        <div className="relative flex items-center gap-1">
                            <button
                                onClick={() => setShowKernelMenu(!showKernelMenu)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border ${
                                    kernelStatus === 'connected' ? 'border-green-500/50 bg-green-500/10 text-green-400' :
                                    kernelStatus === 'starting' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' :
                                    kernelStatus === 'busy' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' :
                                    'border-gray-600 bg-gray-700/50 text-gray-400'
                                }`}
                                title="Kernel status"
                            >
                                {kernelStatus === 'connected' && <Circle size={8} className="fill-green-400" />}
                                {kernelStatus === 'starting' && <Loader size={10} className="animate-spin" />}
                                {kernelStatus === 'busy' && <Loader size={10} className="animate-spin" />}
                                {kernelStatus === 'disconnected' && <Circle size={8} className="text-gray-500" />}
                                <span>{selectedKernel}</span>
                                <ChevronDown size={10} />
                            </button>

                            {showKernelMenu && (
                                <div className="absolute top-full right-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                    {/* Python path info */}
                                    <div className="px-3 py-1.5 text-[10px] text-gray-500 border-b border-gray-700">
                                        <span className="uppercase">Python:</span>
                                        <div className="text-gray-400 truncate" title={pythonPath}>{pythonPath.split('/').slice(-3).join('/')}</div>
                                    </div>

                                    {jupyterInstalled === false ? (
                                        <>
                                            <div className="px-3 py-2 text-xs text-yellow-400">
                                                Jupyter not installed in this environment
                                            </div>
                                            <button
                                                onClick={() => { installJupyter(); setShowKernelMenu(false); }}
                                                disabled={isInstalling}
                                                className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isInstalling ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                                                {isInstalling ? 'Installing...' : 'Install Jupyter'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="px-3 py-1 text-[10px] text-gray-500 uppercase">Select Kernel</div>
                                            {availableKernels.map(k => (
                                                <button
                                                    key={k.name}
                                                    onClick={() => { setSelectedKernel(k.name); setShowKernelMenu(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 ${selectedKernel === k.name ? 'text-green-400' : 'text-gray-300'}`}
                                                >
                                                    <Zap size={12} />
                                                    {k.displayName}
                                                </button>
                                            ))}
                                            <div className="border-t border-gray-700 my-1" />
                                            {kernelStatus === 'disconnected' ? (
                                                <button
                                                    onClick={() => { startKernel(); setShowKernelMenu(false); }}
                                                    className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    <Power size={12} />
                                                    Start Kernel
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => { stopKernel(); setShowKernelMenu(false); }}
                                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <Square size={12} />
                                                        Stop Kernel
                                                    </button>
                                                    <button
                                                        onClick={async () => { await stopKernel(); await startKernel(); setShowKernelMenu(false); }}
                                                        className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-gray-700 flex items-center gap-2"
                                                    >
                                                        <Power size={12} />
                                                        Restart Kernel
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={save}
                            disabled={!hasChanges || isSaving}
                            className="p-1 theme-hover rounded disabled:opacity-50"
                            title="Save (Ctrl+S)"
                        >
                            <Save size={14} />
                        </button>
                        <button
                            onClick={() => addCell(notebook.cells.length - 1, 'code')}
                            className="p-1 theme-hover rounded"
                            title="Add Code Cell"
                        >
                            <Plus size={14} />
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

            {/* Cells */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {notebook.cells.map((cell, index) => {
                    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    const isCollapsed = collapsedCells.has(index);
                    const isCode = cell.cell_type === 'code';

                    return (
                        <div key={index} className="border border-gray-700 rounded-lg overflow-hidden">
                            {/* Cell header */}
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 border-b border-gray-700">
                                <button onClick={() => toggleCollapse(index)} className="text-gray-400">
                                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <span className={`text-xs px-2 py-0.5 rounded ${isCode ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {isCode ? 'Code' : 'Markdown'}
                                </span>
                                {isCode && cell.execution_count != null && (
                                    <span className="text-xs text-gray-500">[{cell.execution_count}]</span>
                                )}
                                <div className="flex-1" />
                                {isCode ? (
                                    <button
                                        onClick={() => executeCell(index)}
                                        disabled={isExecuting === index}
                                        className="p-1 text-green-400 hover:bg-green-500/20 rounded disabled:opacity-50"
                                        title="Run Cell"
                                    >
                                        {isExecuting === index ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setEditingMarkdownCell(editingMarkdownCell === index ? null : index)}
                                        className={`p-1 hover:bg-gray-700 rounded ${editingMarkdownCell === index ? 'text-blue-400' : 'text-gray-400'}`}
                                        title={editingMarkdownCell === index ? "Done Editing" : "Edit Markdown"}
                                    >
                                        <Edit3 size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => changeCellType(index, isCode ? 'markdown' : 'code')}
                                    className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                                    title={`Convert to ${isCode ? 'Markdown' : 'Code'}`}
                                >
                                    {isCode ? <FileText size={12} /> : <Code2 size={12} />}
                                </button>
                                <button
                                    onClick={() => addCell(index, 'code')}
                                    className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                                    title="Add Cell Below"
                                >
                                    <Plus size={12} />
                                </button>
                                <button
                                    onClick={() => deleteCell(index)}
                                    disabled={notebook.cells.length <= 1}
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-50"
                                    title="Delete Cell"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>

                            {/* Cell content */}
                            {!isCollapsed && (
                                <div className="bg-gray-900">
                                    {isCode ? (
                                        <CodeMirror
                                            value={source}
                                            onChange={(value) => updateCellSource(index, value)}
                                            extensions={pythonExtensions}
                                            basicSetup={false}
                                            className="text-sm"
                                        />
                                    ) : editingMarkdownCell === index ? (
                                        <div onBlur={() => setEditingMarkdownCell(null)}>
                                            <CodeMirror
                                                value={source}
                                                onChange={(value) => updateCellSource(index, value)}
                                                extensions={markdownExtensions}
                                                basicSetup={false}
                                                className="text-sm"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="p-4 cursor-pointer hover:bg-gray-800/50 min-h-[40px] prose prose-invert prose-sm max-w-none"
                                            onClick={() => setEditingMarkdownCell(index)}
                                            title="Click to edit"
                                        >
                                            {source.trim() ? (
                                                <MarkdownRenderer content={source} />
                                            ) : (
                                                <span className="text-gray-500 italic">Click to add markdown...</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cell outputs */}
                            {!isCollapsed && isCode && cell.outputs && cell.outputs.length > 0 && (
                                <div className="border-t border-gray-700 p-2 space-y-2 bg-gray-850">
                                    {cell.outputs.map((output, outputIndex) => renderOutput(output, outputIndex))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status bar */}
            <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between theme-bg-secondary">
                <div className="flex items-center gap-3">
                    <span>{notebook.cells.length} cells</span>
                    <span className="text-gray-600">|</span>
                    <span className="flex items-center gap-1">
                        {kernelStatus === 'connected' && <Circle size={6} className="fill-green-400 text-green-400" />}
                        {kernelStatus === 'starting' && <Loader size={10} className="animate-spin text-yellow-400" />}
                        {kernelStatus === 'busy' && <Loader size={10} className="animate-spin text-blue-400" />}
                        {kernelStatus === 'disconnected' && <Circle size={6} className="text-gray-500" />}
                        <span className={
                            kernelStatus === 'connected' ? 'text-green-400' :
                            kernelStatus === 'starting' ? 'text-yellow-400' :
                            kernelStatus === 'busy' ? 'text-blue-400' :
                            'text-gray-500'
                        }>
                            {kernelStatus === 'connected' ? 'Kernel ready' :
                             kernelStatus === 'starting' ? 'Starting kernel...' :
                             kernelStatus === 'busy' ? 'Running...' :
                             'No kernel'}
                        </span>
                    </span>
                </div>
                <div className="text-gray-500">
                    {hasChanges ? 'Unsaved changes' : 'Saved'}
                </div>
            </div>
        </div>
    );
};

export default memo(NotebookViewer);
