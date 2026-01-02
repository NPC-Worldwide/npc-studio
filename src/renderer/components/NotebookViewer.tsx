import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Save, Play, Plus, Trash2, ChevronDown, ChevronRight, X, Loader, Code2, FileText, Edit3, Circle, Zap, Square, Power, MessageSquare, Bot, BookOpen, Paperclip, Eye, EyeOff, Archive, Sparkles } from 'lucide-react';
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

// Cell types: standard ipynb + incognb extensions
type CellType = 'code' | 'markdown' | 'raw' | 'chat' | 'jinx' | 'latex' | 'data';

// Paper state for incognb format
type PaperState = 'in_paper' | 'exploration' | 'discarded';

interface NotebookCell {
    cell_type: CellType;
    source: string[];
    outputs?: any[];
    execution_count?: number | null;
    metadata?: {
        // Standard metadata
        collapsed?: boolean;
        scrolled?: boolean;
        // Incognb extensions
        paper_state?: PaperState;
        paper_order?: number;
        paper_section?: string;
        decision_note?: string;
        // Chat cell metadata
        chat?: {
            model?: string;
            provider?: string;
            npc?: string;
            temperature?: number;
            maxTokens?: number;
        };
        // Jinx cell metadata
        jinx?: {
            name?: string;
            inputs?: Record<string, any>;
        };
        // Data cell metadata
        data?: {
            files?: Array<{
                name: string;
                hash: string;
                version: number;
                path: string;
                size: number;
                mime_type: string;
            }>;
        };
        // Timestamps
        created_at?: string;
        modified_at?: string;
        // Any other metadata
        [key: string]: any;
    };
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

    // Incognb state - models, NPCs, jinxs for chat/jinx cells
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [availableNPCs, setAvailableNPCs] = useState<any[]>([]);
    const [availableJinxs, setAvailableJinxs] = useState<any[]>([]);
    const [showAddCellMenu, setShowAddCellMenu] = useState<number | null>(null);

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;
    const isIncognb = filePath?.endsWith('.incognb');

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

    // Load models, NPCs, and jinxs for chat/jinx cells (all notebooks)
    useEffect(() => {
        const loadNotebookResources = async () => {
            if (!workspacePath) return;
            try {
                // Load models
                const modelsResult = await (window as any).api.getAvailableModels?.(workspacePath);
                if (modelsResult && !modelsResult.error) {
                    setAvailableModels(modelsResult);
                }

                // Load NPCs
                const npcsResult = await (window as any).api.loadNPCs?.({ currentPath: workspacePath });
                if (npcsResult?.npcs) {
                    setAvailableNPCs(npcsResult.npcs);
                }

                // Load jinxs
                const jinxsResult = await (window as any).api.loadJinxs?.({ currentPath: workspacePath });
                if (jinxsResult?.jinxs) {
                    setAvailableJinxs(jinxsResult.jinxs);
                }
            } catch (e) {
                console.error('Failed to load notebook resources:', e);
            }
        };
        loadNotebookResources();
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
    const addCell = useCallback((afterIndex: number, type: CellType) => {
        if (!notebook) return;

        const defaultModel = availableModels.length > 0 ? availableModels[0].value : '';
        const defaultNPC = availableNPCs.length > 0 ? availableNPCs[0].value : 'agent';

        const newCell: NotebookCell = {
            cell_type: type,
            source: [''],
            outputs: ['code', 'chat', 'jinx'].includes(type) ? [] : undefined,
            execution_count: type === 'code' ? null : undefined,
            metadata: {
                created_at: new Date().toISOString(),
                paper_state: 'exploration',
                // Type-specific metadata
                ...(type === 'chat' && {
                    chat: {
                        model: defaultModel,
                        npc: defaultNPC,
                        temperature: 0.7
                    }
                }),
                ...(type === 'jinx' && {
                    jinx: {
                        name: '',
                        inputs: {}
                    }
                }),
                ...(type === 'data' && {
                    data: {
                        files: []
                    }
                })
            }
        };
        const newCells = [...notebook.cells];
        newCells.splice(afterIndex + 1, 0, newCell);
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
        setShowAddCellMenu(null);
    }, [notebook, availableModels, availableNPCs]);

    // Delete cell
    const deleteCell = useCallback((index: number) => {
        if (!notebook || notebook.cells.length <= 1) return;
        const newCells = notebook.cells.filter((_, i) => i !== index);
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Change cell type
    const changeCellType = useCallback((index: number, newType: CellType) => {
        if (!notebook) return;
        const defaultModel = availableModels.length > 0 ? availableModels[0].value : '';
        const defaultNPC = availableNPCs.length > 0 ? availableNPCs[0].value : 'agent';

        const newCells = [...notebook.cells];
        newCells[index] = {
            ...newCells[index],
            cell_type: newType,
            outputs: ['code', 'chat', 'jinx'].includes(newType) ? (newCells[index].outputs || []) : undefined,
            execution_count: newType === 'code' ? (newCells[index].execution_count || null) : undefined,
            metadata: {
                ...newCells[index].metadata,
                modified_at: new Date().toISOString(),
                ...(newType === 'chat' && !newCells[index].metadata?.chat && {
                    chat: { model: defaultModel, npc: defaultNPC, temperature: 0.7 }
                }),
                ...(newType === 'jinx' && !newCells[index].metadata?.jinx && {
                    jinx: { name: '', inputs: {} }
                }),
                ...(newType === 'data' && !newCells[index].metadata?.data && {
                    data: { files: [] }
                })
            }
        };
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook, availableModels, availableNPCs]);

    // Update cell metadata (for chat/jinx config changes)
    const updateCellMetadata = useCallback((index: number, metadataUpdate: Partial<NotebookCell['metadata']>) => {
        if (!notebook) return;
        const newCells = [...notebook.cells];
        newCells[index] = {
            ...newCells[index],
            metadata: { ...newCells[index].metadata, ...metadataUpdate, modified_at: new Date().toISOString() }
        };
        setNotebook({ ...notebook, cells: newCells });
        setHasChanges(true);
    }, [notebook]);

    // Toggle paper state for incognb
    const togglePaperState = useCallback((index: number) => {
        if (!notebook) return;
        const states: PaperState[] = ['exploration', 'in_paper', 'discarded'];
        const currentState = notebook.cells[index].metadata?.paper_state || 'exploration';
        const nextIndex = (states.indexOf(currentState) + 1) % states.length;
        updateCellMetadata(index, { paper_state: states[nextIndex] });
    }, [notebook, updateCellMetadata]);

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

    // Execute chat cell - send prompt to LLM
    const executeChatCell = useCallback(async (index: number, targetModels?: string[]) => {
        if (!notebook) return;

        const cell = notebook.cells[index];
        if (cell.cell_type !== 'chat') return;

        setIsExecuting(index);
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        const chatMeta = cell.metadata?.chat || {};

        // If targetModels provided, run on multiple models (matrix run)
        const modelsToRun = targetModels || [chatMeta.model];

        try {
            const outputs: any[] = [];

            for (const modelValue of modelsToRun) {
                const selectedModel = availableModels.find((m: any) => m.value === modelValue);
                const selectedNpc = availableNPCs.find((n: any) => n.value === chatMeta.npc);

                // Use the LLM API
                const response = await fetch('http://localhost:5337/api/llm/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: source,
                        model: modelValue,
                        provider: selectedModel?.provider || 'openai',
                        npc: selectedNpc?.name || chatMeta.npc,
                        temperature: chatMeta.temperature || 0.7,
                        stream: false
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    outputs.push({
                        output_type: 'error',
                        ename: 'ChatError',
                        evalue: errText,
                        traceback: [errText],
                        metadata: { model: modelValue, npc: chatMeta.npc }
                    });
                    continue;
                }

                const result = await response.json();
                outputs.push({
                    output_type: 'execute_result',
                    data: {
                        'text/markdown': [result.response || result.content || ''],
                        'text/plain': [result.response || result.content || '']
                    },
                    metadata: {
                        model: modelValue,
                        npc: chatMeta.npc,
                        provider: selectedModel?.provider,
                        execution_time: new Date().toISOString()
                    }
                });
            }

            const newCells = [...notebook.cells];
            newCells[index] = {
                ...newCells[index],
                outputs,
                metadata: {
                    ...newCells[index].metadata,
                    modified_at: new Date().toISOString()
                }
            };
            setNotebook({ ...notebook, cells: newCells });
            setHasChanges(true);
        } catch (e: any) {
            const newCells = [...notebook.cells];
            newCells[index] = {
                ...newCells[index],
                outputs: [{
                    output_type: 'error',
                    ename: 'Error',
                    evalue: e.message || 'Chat execution failed',
                    traceback: [e.message || 'Chat execution failed']
                }]
            };
            setNotebook({ ...notebook, cells: newCells });
        } finally {
            setIsExecuting(null);
        }
    }, [notebook, availableModels, availableNPCs]);

    // Execute jinx cell - run jinx workflow
    const executeJinxCell = useCallback(async (index: number) => {
        if (!notebook) return;

        const cell = notebook.cells[index];
        if (cell.cell_type !== 'jinx') return;

        setIsExecuting(index);
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        const jinxMeta = cell.metadata?.jinx || {};

        try {
            // Execute via jinx API
            const response = await fetch('http://localhost:5337/api/jinx/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jinxContent: source,
                    jinxName: jinxMeta.name,
                    inputs: jinxMeta.inputs || {},
                    workingDir: workspacePath
                })
            });

            const result = await response.json();

            const newCells = [...notebook.cells];
            if (result.success) {
                newCells[index] = {
                    ...newCells[index],
                    outputs: [{
                        output_type: 'execute_result',
                        data: {
                            'text/plain': [typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)],
                            ...(result.html && { 'text/html': [result.html] })
                        },
                        metadata: { execution_time: new Date().toISOString() }
                    }],
                    metadata: { ...newCells[index].metadata, modified_at: new Date().toISOString() }
                };
            } else {
                newCells[index] = {
                    ...newCells[index],
                    outputs: [{
                        output_type: 'error',
                        ename: 'JinxError',
                        evalue: result.error || 'Jinx execution failed',
                        traceback: [result.error || 'Jinx execution failed']
                    }]
                };
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
                    evalue: e.message || 'Jinx execution failed',
                    traceback: [e.message || 'Jinx execution failed']
                }]
            };
            setNotebook({ ...notebook, cells: newCells });
        } finally {
            setIsExecuting(null);
        }
    }, [notebook, workspacePath]);

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
                        <div className="relative">
                            <button
                                onClick={() => setShowAddCellMenu(showAddCellMenu === -1 ? null : -1)}
                                className="p-1 theme-hover rounded flex items-center gap-1"
                                title="Add Cell"
                            >
                                <Plus size={14} />
                                <ChevronDown size={10} />
                            </button>
                            {showAddCellMenu === -1 && (
                                <div className="absolute top-full right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                    {/* Standard cell types for regular .ipynb, extended types for .incognb */}
                                    {(isIncognb ? ['code', 'markdown', 'chat', 'jinx', 'latex', 'data'] : ['code', 'markdown']).map(type => {
                                        const cellTypeStyles: Record<string, { text: string; icon: any; label: string }> = {
                                            code: { text: 'text-blue-400', icon: Code2, label: 'Code' },
                                            markdown: { text: 'text-green-400', icon: FileText, label: 'Markdown' },
                                            chat: { text: 'text-purple-400', icon: MessageSquare, label: 'Chat' },
                                            jinx: { text: 'text-orange-400', icon: Zap, label: 'Jinx' },
                                            latex: { text: 'text-red-400', icon: BookOpen, label: 'LaTeX' },
                                            data: { text: 'text-cyan-400', icon: Paperclip, label: 'Data' }
                                        };
                                        const s = cellTypeStyles[type];
                                        const Icon = s.icon;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => addCell(notebook.cells.length - 1, type as CellType)}
                                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex items-center gap-2 ${s.text}`}
                                            >
                                                <Icon size={12} />
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
                {(notebook.cells || []).map((cell, index) => {
                    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    const isCollapsed = collapsedCells.has(index);
                    const cellType = cell.cell_type;
                    const paperState = cell.metadata?.paper_state || 'exploration';

                    // Cell type styling
                    const cellTypeStyles: Record<string, { bg: string; text: string; icon: any; label: string }> = {
                        code: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Code2, label: 'Code' },
                        markdown: { bg: 'bg-green-500/20', text: 'text-green-400', icon: FileText, label: 'Markdown' },
                        chat: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: MessageSquare, label: 'Chat' },
                        jinx: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: Zap, label: 'Jinx' },
                        latex: { bg: 'bg-red-500/20', text: 'text-red-400', icon: BookOpen, label: 'LaTeX' },
                        data: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: Paperclip, label: 'Data' },
                        raw: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: FileText, label: 'Raw' }
                    };
                    const style = cellTypeStyles[cellType] || cellTypeStyles.raw;
                    const CellIcon = style.icon;

                    // Paper state styling for incognb
                    const paperStateStyles: Record<PaperState, { border: string; opacity: string; icon: any }> = {
                        in_paper: { border: 'border-l-4 border-l-green-500', opacity: '', icon: Eye },
                        exploration: { border: '', opacity: '', icon: Sparkles },
                        discarded: { border: 'border-l-4 border-l-red-500', opacity: 'opacity-50', icon: Archive }
                    };
                    const paperStyle = isIncognb ? paperStateStyles[paperState] : { border: '', opacity: '', icon: null };

                    return (
                        <div key={index} className={`border border-gray-700 rounded-lg overflow-hidden ${paperStyle.border} ${paperStyle.opacity}`}>
                            {/* Cell header */}
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 border-b border-gray-700">
                                <button onClick={() => toggleCollapse(index)} className="text-gray-400 hover:text-gray-200">
                                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {/* Cell type badge */}
                                <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${style.bg} ${style.text}`}>
                                    <CellIcon size={10} />
                                    {style.label}
                                </span>

                                {/* Execution count for code cells */}
                                {cellType === 'code' && cell.execution_count != null && (
                                    <span className="text-xs text-gray-500">[{cell.execution_count}]</span>
                                )}

                                {/* Chat cell config display */}
                                {cellType === 'chat' && cell.metadata?.chat && (
                                    <div className="flex items-center gap-1">
                                        <select
                                            value={cell.metadata.chat.model || ''}
                                            onChange={(e) => updateCellMetadata(index, { chat: { ...cell.metadata?.chat, model: e.target.value } })}
                                            className="text-[10px] bg-gray-700 border-none rounded px-1 py-0.5 text-purple-300"
                                        >
                                            {availableModels.map(m => (
                                                <option key={m.value} value={m.value}>{m.display_name?.slice(0, 20) || m.value}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={cell.metadata.chat.npc || 'agent'}
                                            onChange={(e) => updateCellMetadata(index, { chat: { ...cell.metadata?.chat, npc: e.target.value } })}
                                            className="text-[10px] bg-gray-700 border-none rounded px-1 py-0.5 text-green-300"
                                        >
                                            {availableNPCs.map(n => (
                                                <option key={n.value} value={n.value}>{n.display_name || n.value}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Jinx cell config display */}
                                {cellType === 'jinx' && (
                                    <select
                                        value={cell.metadata?.jinx?.name || ''}
                                        onChange={(e) => updateCellMetadata(index, { jinx: { ...cell.metadata?.jinx, name: e.target.value } })}
                                        className="text-[10px] bg-gray-700 border-none rounded px-1 py-0.5 text-orange-300"
                                    >
                                        <option value="">Select jinx...</option>
                                        {availableJinxs.map(j => (
                                            <option key={j.name} value={j.name}>{j.name}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Paper state toggle for incognb */}
                                {isIncognb && (
                                    <button
                                        onClick={() => togglePaperState(index)}
                                        className={`p-1 rounded text-[10px] flex items-center gap-1 ${
                                            paperState === 'in_paper' ? 'bg-green-600/20 text-green-400' :
                                            paperState === 'discarded' ? 'bg-red-600/20 text-red-400' :
                                            'bg-gray-600/20 text-gray-400'
                                        }`}
                                        title={`State: ${paperState}`}
                                    >
                                        {paperStyle.icon && <paperStyle.icon size={10} />}
                                        <span className="hidden sm:inline">{paperState}</span>
                                    </button>
                                )}

                                <div className="flex-1" />

                                {/* Execute button - varies by cell type */}
                                {(cellType === 'code' || cellType === 'chat' || cellType === 'jinx') && (
                                    <button
                                        onClick={() => {
                                            if (cellType === 'code') executeCell(index);
                                            else if (cellType === 'chat') executeChatCell(index);
                                            else if (cellType === 'jinx') executeJinxCell(index);
                                        }}
                                        disabled={isExecuting === index}
                                        className="p-1 text-green-400 hover:bg-green-500/20 rounded disabled:opacity-50"
                                        title="Run Cell"
                                    >
                                        {isExecuting === index ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                                    </button>
                                )}

                                {/* Markdown/LaTeX edit button */}
                                {(cellType === 'markdown' || cellType === 'latex') && (
                                    <button
                                        onClick={() => setEditingMarkdownCell(editingMarkdownCell === index ? null : index)}
                                        className={`p-1 hover:bg-gray-700 rounded ${editingMarkdownCell === index ? 'text-blue-400' : 'text-gray-400'}`}
                                        title={editingMarkdownCell === index ? "Done Editing" : "Edit"}
                                    >
                                        <Edit3 size={12} />
                                    </button>
                                )}

                                {/* Add cell menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowAddCellMenu(showAddCellMenu === index ? null : index)}
                                        className="p-1 text-gray-400 hover:bg-gray-700 rounded"
                                        title="Add Cell Below"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    {showAddCellMenu === index && (
                                        <div className="absolute top-full right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                            {/* Standard cell types for regular .ipynb, extended types for .incognb */}
                                            {(isIncognb ? ['code', 'markdown', 'chat', 'jinx', 'latex', 'data'] : ['code', 'markdown']).map(type => {
                                                const s = cellTypeStyles[type];
                                                const Icon = s.icon;
                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => addCell(index, type as CellType)}
                                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex items-center gap-2 ${s.text}`}
                                                    >
                                                        <Icon size={12} />
                                                        {s.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

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
                                    {/* Code cell */}
                                    {cellType === 'code' && (
                                        <CodeMirror
                                            value={source}
                                            onChange={(value) => updateCellSource(index, value)}
                                            extensions={pythonExtensions}
                                            basicSetup={false}
                                            className="text-sm"
                                        />
                                    )}

                                    {/* Markdown cell */}
                                    {cellType === 'markdown' && (
                                        editingMarkdownCell === index ? (
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
                                        )
                                    )}

                                    {/* Chat cell */}
                                    {cellType === 'chat' && (
                                        <div className="p-3">
                                            <textarea
                                                value={source}
                                                onChange={(e) => updateCellSource(index, e.target.value)}
                                                placeholder="Enter your prompt here..."
                                                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-200 min-h-[80px] resize-y"
                                            />
                                            {/* Matrix run button */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        // Run on all available models (matrix run)
                                                        const allModelValues = availableModels.slice(0, 4).map(m => m.value);
                                                        executeChatCell(index, allModelValues);
                                                    }}
                                                    className="text-[10px] px-2 py-1 bg-purple-600/20 text-purple-300 rounded hover:bg-purple-600/30 flex items-center gap-1"
                                                    title="Run on multiple models"
                                                >
                                                    <Bot size={10} />
                                                    Matrix Run
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Jinx cell */}
                                    {cellType === 'jinx' && (
                                        <CodeMirror
                                            value={source}
                                            onChange={(value) => updateCellSource(index, value)}
                                            extensions={markdownExtensions}
                                            basicSetup={false}
                                            className="text-sm"
                                            placeholder="Enter jinx YAML or command..."
                                        />
                                    )}

                                    {/* LaTeX cell */}
                                    {cellType === 'latex' && (
                                        editingMarkdownCell === index ? (
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
                                                    <MarkdownRenderer content={`$$${source}$$`} />
                                                ) : (
                                                    <span className="text-gray-500 italic">Click to add LaTeX...</span>
                                                )}
                                            </div>
                                        )
                                    )}

                                    {/* Data cell */}
                                    {cellType === 'data' && (
                                        <div className="p-3">
                                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                                                <Paperclip size={24} className="mx-auto mb-2 text-gray-500" />
                                                <p className="text-sm text-gray-400">Drag files here or click to upload</p>
                                                {cell.metadata?.data?.files?.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        {cell.metadata.data.files.map((file, i) => (
                                                            <div key={i} className="text-xs bg-gray-800 rounded px-2 py-1 flex items-center gap-2">
                                                                <Paperclip size={10} />
                                                                <span>{file.name}</span>
                                                                <span className="text-gray-500">v{file.version}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Raw cell */}
                                    {cellType === 'raw' && (
                                        <CodeMirror
                                            value={source}
                                            onChange={(value) => updateCellSource(index, value)}
                                            basicSetup={false}
                                            className="text-sm"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Cell outputs - for code, chat, jinx cells */}
                            {!isCollapsed && ['code', 'chat', 'jinx'].includes(cellType) && cell.outputs && cell.outputs.length > 0 && (
                                <div className="border-t border-gray-700 p-2 space-y-2 bg-gray-850">
                                    {cell.outputs.map((output, outputIndex) => (
                                        <div key={outputIndex}>
                                            {/* Output metadata (model/npc for chat cells) */}
                                            {output.metadata && (output.metadata.model || output.metadata.npc) && (
                                                <div className="flex items-center gap-1 mb-1">
                                                    {output.metadata.model && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300">
                                                            {output.metadata.model}
                                                        </span>
                                                    )}
                                                    {output.metadata.npc && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-300">
                                                            {output.metadata.npc}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {renderOutput(output, outputIndex)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status bar */}
            <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between theme-bg-secondary">
                <div className="flex items-center gap-3">
                    <span>{(notebook.cells || []).length} cells</span>
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
