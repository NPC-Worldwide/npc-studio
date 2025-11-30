import React, { useState, useEffect, useCallback } from 'react';
import { FolderCog, X, Save, RefreshCw, Plus, Trash2, AlertCircle } from 'lucide-react';

interface ProjectEnvEditorProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
}

interface EnvVariable {
    key: string;
    value: string;
    isSecret: boolean;
}

const ProjectEnvEditor: React.FC<ProjectEnvEditorProps> = ({ isOpen, onClose, currentPath }) => {
    const [envContent, setEnvContent] = useState('');
    const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');

    const envPath = currentPath ? `${currentPath}/.env` : null;

    // Parse .env content into variables
    const parseEnvContent = (content: string): EnvVariable[] => {
        const lines = content.split('\n');
        const variables: EnvVariable[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                let value = trimmed.substring(eqIndex + 1).trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                const isSecret = key.toLowerCase().includes('key') ||
                                 key.toLowerCase().includes('secret') ||
                                 key.toLowerCase().includes('token') ||
                                 key.toLowerCase().includes('password');
                variables.push({ key, value, isSecret });
            }
        }
        return variables;
    };

    // Convert variables back to .env format
    const variablesToEnvContent = (variables: EnvVariable[]): string => {
        return variables
            .filter(v => v.key.trim())
            .map(v => {
                const value = v.value.includes(' ') || v.value.includes('#')
                    ? `"${v.value}"`
                    : v.value;
                return `${v.key}=${value}`;
            })
            .join('\n');
    };

    // Load .env file
    const loadEnvFile = useCallback(async () => {
        if (!envPath) return;

        setLoading(true);
        setError(null);

        try {
            const result = await (window as any).api?.readFileContent?.(envPath);
            if (result?.error) {
                // File doesn't exist - that's OK, we'll create it
                setEnvContent('');
                setEnvVariables([]);
            } else {
                const content = result?.content || '';
                setEnvContent(content);
                setEnvVariables(parseEnvContent(content));
            }
            setHasChanges(false);
        } catch (err) {
            console.error('Error loading .env file:', err);
            setError('Failed to load .env file');
        } finally {
            setLoading(false);
        }
    }, [envPath]);

    // Save .env file
    const saveEnvFile = async () => {
        if (!envPath) return;

        setSaving(true);
        setError(null);

        try {
            const content = viewMode === 'table'
                ? variablesToEnvContent(envVariables)
                : envContent;

            await (window as any).api?.writeFile?.(envPath, content);
            setHasChanges(false);

            // Sync the other view
            if (viewMode === 'table') {
                setEnvContent(content);
            } else {
                setEnvVariables(parseEnvContent(content));
            }
        } catch (err) {
            console.error('Error saving .env file:', err);
            setError('Failed to save .env file');
        } finally {
            setSaving(false);
        }
    };

    // Load on open
    useEffect(() => {
        if (isOpen && envPath) {
            loadEnvFile();
        }
    }, [isOpen, envPath, loadEnvFile]);

    // Escape key handler
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveEnvFile();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Add new variable
    const addVariable = () => {
        setEnvVariables([...envVariables, { key: '', value: '', isSecret: false }]);
        setHasChanges(true);
    };

    // Update variable
    const updateVariable = (index: number, field: 'key' | 'value', newValue: string) => {
        const updated = [...envVariables];
        updated[index] = { ...updated[index], [field]: newValue };
        if (field === 'key') {
            updated[index].isSecret = newValue.toLowerCase().includes('key') ||
                                      newValue.toLowerCase().includes('secret') ||
                                      newValue.toLowerCase().includes('token') ||
                                      newValue.toLowerCase().includes('password');
        }
        setEnvVariables(updated);
        setHasChanges(true);
    };

    // Delete variable
    const deleteVariable = (index: number) => {
        setEnvVariables(envVariables.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    // Handle raw content change
    const handleRawContentChange = (content: string) => {
        setEnvContent(content);
        setHasChanges(true);
    };

    // Switch view modes
    const switchViewMode = (mode: 'table' | 'raw') => {
        if (mode === viewMode) return;

        if (viewMode === 'table') {
            // Sync table to raw
            setEnvContent(variablesToEnvContent(envVariables));
        } else {
            // Sync raw to table
            setEnvVariables(parseEnvContent(envContent));
        }
        setViewMode(mode);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="theme-bg-secondary rounded-lg shadow-xl w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border">
                    <div className="flex items-center gap-3">
                        <FolderCog className="text-orange-400" size={20} />
                        <div>
                            <h3 className="text-lg font-semibold">Project Environment</h3>
                            <p className="text-xs theme-text-muted">{envPath || 'No project selected'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <span className="text-xs text-orange-400">Unsaved changes</span>
                        )}
                        <button
                            onClick={loadEnvFile}
                            disabled={loading}
                            className="p-2 hover:bg-gray-700 rounded transition-colors"
                            title="Reload"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={saveEnvFile}
                            disabled={saving || !hasChanges}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded text-sm flex items-center gap-1"
                        >
                            <Save size={14} />
                            Save
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* View mode tabs */}
                <div className="flex border-b theme-border">
                    <button
                        onClick={() => switchViewMode('table')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            viewMode === 'table'
                                ? 'border-orange-500 text-orange-400'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        Variables
                    </button>
                    <button
                        onClick={() => switchViewMode('raw')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            viewMode === 'raw'
                                ? 'border-orange-500 text-orange-400'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        Raw Editor
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="p-3 bg-red-900/30 border-b border-red-800 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="animate-spin text-orange-400" size={24} />
                        </div>
                    ) : viewMode === 'table' ? (
                        <div className="space-y-2">
                            {envVariables.length === 0 ? (
                                <div className="text-center py-8 theme-text-muted">
                                    <p>No environment variables defined.</p>
                                    <p className="text-sm mt-1">Click "Add Variable" to create one.</p>
                                </div>
                            ) : (
                                envVariables.map((variable, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={variable.key}
                                            onChange={(e) => updateVariable(index, 'key', e.target.value)}
                                            placeholder="VARIABLE_NAME"
                                            className="w-1/3 theme-input text-sm font-mono"
                                        />
                                        <span className="text-gray-500">=</span>
                                        <input
                                            type={variable.isSecret ? 'password' : 'text'}
                                            value={variable.value}
                                            onChange={(e) => updateVariable(index, 'value', e.target.value)}
                                            placeholder="value"
                                            className="flex-1 theme-input text-sm font-mono"
                                        />
                                        <button
                                            onClick={() => deleteVariable(index)}
                                            className="p-2 hover:bg-red-900/50 rounded text-red-400 transition-colors"
                                            title="Delete variable"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                            <button
                                onClick={addVariable}
                                className="mt-4 px-3 py-2 border border-dashed theme-border rounded hover:border-orange-500 hover:text-orange-400 transition-colors flex items-center gap-2 text-sm w-full justify-center"
                            >
                                <Plus size={14} />
                                Add Variable
                            </button>
                        </div>
                    ) : (
                        <textarea
                            value={envContent}
                            onChange={(e) => handleRawContentChange(e.target.value)}
                            className="w-full h-[50vh] theme-input font-mono text-sm resize-none"
                            placeholder="# Project environment variables&#10;KEY=value&#10;ANOTHER_KEY=another_value"
                            spellCheck={false}
                        />
                    )}
                </div>

                {/* Footer with tips */}
                <div className="p-3 border-t theme-border text-xs theme-text-muted">
                    <p>These variables are specific to this project and override global settings.</p>
                </div>
            </div>
        </div>
    );
};

export default ProjectEnvEditor;
