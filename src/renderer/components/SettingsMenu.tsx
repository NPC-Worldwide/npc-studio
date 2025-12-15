// SettingsMenu.jsx - NEW FILE
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Save, FolderOpen, Eye, EyeOff, DownloadCloud, Trash2, Keyboard } from 'lucide-react';
import { Modal, Tabs, Card, Button, Input, Select } from 'npcts';

const HOME_DIR = '/home/caug/.npcsh';

const defaultKeyboardShortcuts = {
    newConversation: 'Ctrl+Shift+C',
    newFolder: 'Ctrl+N',
    newBrowser: 'Ctrl+Shift+B',
    newTerminal: 'Ctrl+Shift+T',
    newCodeFile: 'Ctrl+Shift+F',
    newWorkspace: 'Ctrl+Shift+N',
    toggleSidebar: 'Ctrl+B',
    commandPalette: 'Ctrl+Shift+P',
    fileSearch: 'Ctrl+P',
    globalSearch: 'Ctrl+Shift+S',
    save: 'Ctrl+S',
    closePane: 'Ctrl+W',
};

const defaultSettings = {
    model: 'llama3.2',
    provider: 'ollama',
    embedding_model: 'nomic-text-embed',
    embedding_provider: 'ollama',
    search_provider: 'google',
    default_folder: HOME_DIR,
    is_predictive_text_enabled: false,
    predictive_text_model: 'llama3.2',
    predictive_text_provider: 'ollama',
    keyboard_shortcuts: defaultKeyboardShortcuts,
};

// Local provider configuration
const LOCAL_PROVIDERS = {
    ollama: {
        name: 'Ollama',
        description: 'Local LLM server with model management',
        defaultPort: 11434,
        docsUrl: 'https://ollama.ai',
        color: 'text-blue-400',
        bgColor: 'bg-blue-600'
    },
    lmstudio: {
        name: 'LM Studio',
        description: 'Desktop app for running local LLMs',
        defaultPort: 1234,
        docsUrl: 'https://lmstudio.ai',
        color: 'text-purple-400',
        bgColor: 'bg-purple-600'
    },
    llamacpp: {
        name: 'llama.cpp',
        description: 'High-performance C++ inference server',
        defaultPort: 8080,
        docsUrl: 'https://github.com/ggerganov/llama.cpp',
        color: 'text-green-400',
        bgColor: 'bg-green-600'
    },
    gguf: {
        name: 'GGUF/GGML',
        description: 'Direct GGUF/GGML model files (offline, no server)',
        defaultPort: null,
        docsUrl: 'https://huggingface.co/docs/hub/gguf',
        color: 'text-orange-400',
        bgColor: 'bg-orange-600'
    }
};

const ModelManager = () => {
    const [activeProvider, setActiveProvider] = useState('ollama');
    const [providerStatuses, setProviderStatuses] = useState({
        ollama: 'checking',
        lmstudio: 'checking',
        llamacpp: 'checking',
        gguf: 'ready'
    });
    const [providerModels, setProviderModels] = useState({
        ollama: [],
        lmstudio: [],
        llamacpp: [],
        gguf: []
    });
    const [ggufDirectory, setGgufDirectory] = useState('');
    const [pullModelName, setPullModelName] = useState('llama3.1');
    const [pullProgress, setPullProgress] = useState(null);
    const [isPulling, setIsPulling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    // Fetch models for a specific provider
    const fetchModelsForProvider = async (provider) => {
        if (provider === 'ollama') {
            const models = await window.api.getLocalOllamaModels();
            if (models && !models.error) {
                setProviderModels(prev => ({ ...prev, ollama: models }));
            }
        } else if (provider === 'gguf') {
            // Scan for GGUF/GGML files
            const result = await window.api.scanGgufModels?.(ggufDirectory || null);
            if (result && !result.error) {
                setProviderModels(prev => ({ ...prev, gguf: result.models || [] }));
            }
        } else {
            // Use the new scan API for LM Studio and llama.cpp
            const result = await window.api.scanLocalModels?.(provider);
            if (result && !result.error) {
                setProviderModels(prev => ({ ...prev, [provider]: result.models || [] }));
            }
        }
    };

    // Check status for all providers
    const checkAllStatuses = async () => {
        // Check Ollama
        const ollamaStatus = await window.api.checkOllamaStatus();
        setProviderStatuses(prev => ({ ...prev, ollama: ollamaStatus.status }));
        if (ollamaStatus.status === 'running') fetchModelsForProvider('ollama');

        // Check LM Studio and llama.cpp via new API
        for (const provider of ['lmstudio', 'llamacpp']) {
            try {
                const status = await window.api.getLocalModelStatus?.(provider);
                setProviderStatuses(prev => ({
                    ...prev,
                    [provider]: status?.running ? 'running' : 'not_running'
                }));
                if (status?.running) fetchModelsForProvider(provider);
            } catch {
                setProviderStatuses(prev => ({ ...prev, [provider]: 'not_found' }));
            }
        }
    };

    // Scan for models on selected provider
    const handleScanModels = async () => {
        setIsScanning(true);
        await fetchModelsForProvider(activeProvider);
        setIsScanning(false);
    };

    useEffect(() => {
        checkAllStatuses();
        const cleanupProgress = window.api.onOllamaPullProgress((progress) => setPullProgress(progress));
        const cleanupComplete = window.api.onOllamaPullComplete(() => {
            setIsPulling(false);
            setPullProgress({ status: 'Success!', details: 'Model installed.' });
            setTimeout(() => {
                setPullProgress(null);
                setPullModelName('');
                fetchModelsForProvider('ollama');
            }, 2000);
        });
        const cleanupError = window.api.onOllamaPullError((error) => {
            setIsPulling(false);
            setPullProgress({ status: 'Error', details: error });
        });
        return () => {
            cleanupProgress();
            cleanupComplete();
            cleanupError();
        };
    }, []);

    const handlePullModel = async () => {
        if (!pullModelName.trim() || isPulling) return;
        setIsPulling(true);
        setPullProgress({ status: 'Starting download...' });
        await window.api.pullOllamaModel({ model: pullModelName });
    };

    const handleDeleteModel = async (modelName) => {
        if (isDeleting) return;
        setIsDeleting(modelName);
        await window.api.deleteOllamaModel({ model: modelName });
        fetchModelsForProvider('ollama');
        setIsDeleting(null);
    };

    const currentStatus = providerStatuses[activeProvider];
    const currentModels = providerModels[activeProvider] || [];
    const providerInfo = LOCAL_PROVIDERS[activeProvider];

    return (
        <div className="space-y-4">
            {/* Provider Tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-2">
                {Object.entries(LOCAL_PROVIDERS).map(([key, info]) => (
                    <button
                        key={key}
                        onClick={() => setActiveProvider(key)}
                        className={`px-3 py-2 rounded-t text-sm font-medium transition-colors ${
                            activeProvider === key
                                ? `${info.bgColor} text-white`
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            {info.name}
                            <span className={`w-2 h-2 rounded-full ${
                                providerStatuses[key] === 'running' || providerStatuses[key] === 'ready' ? 'bg-green-400' :
                                providerStatuses[key] === 'checking' ? 'bg-yellow-400 animate-pulse' :
                                'bg-red-400'
                            }`} />
                        </span>
                    </button>
                ))}
            </div>

            {/* Provider Info */}
            <Card>
                <div className="p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className={`font-semibold text-lg ${providerInfo.color}`}>{providerInfo.name}</h4>
                            <p className="text-xs text-gray-400">{providerInfo.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                                currentStatus === 'running' || currentStatus === 'ready' ? 'bg-green-900 text-green-300' :
                                currentStatus === 'checking' ? 'bg-yellow-900 text-yellow-300' :
                                'bg-red-900 text-red-300'
                            }`}>
                                {currentStatus === 'running' ? 'Running' :
                                 currentStatus === 'ready' ? 'Ready' :
                                 currentStatus === 'checking' ? 'Checking...' :
                                 currentStatus === 'not_running' ? 'Not Running' : 'Not Found'}
                            </span>
                            <a
                                href={providerInfo.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-400 hover:text-cyan-300"
                            >
                                Docs
                            </a>
                        </div>
                    </div>
                    {providerInfo.defaultPort && (
                        <p className="text-xs text-gray-500 mt-2">Default Port: {providerInfo.defaultPort}</p>
                    )}
                    {activeProvider === 'gguf' && (
                        <p className="text-xs text-gray-500 mt-2">No server required - runs locally via llama-cpp-python</p>
                    )}
                </div>
            </Card>

            {/* Ollama-specific: Pull model */}
            {activeProvider === 'ollama' && currentStatus === 'running' && (
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Pull Model from Ollama Hub</label>
                    <div className="flex gap-2">
                        <Input
                            value={pullModelName}
                            onChange={(e) => setPullModelName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePullModel()}
                            placeholder="e.g., llama3.1, mistral, codellama"
                            disabled={isPulling}
                            className="flex-1"
                        />
                        <Button variant="primary" onClick={handlePullModel} disabled={isPulling || !pullModelName.trim()}>
                            {isPulling ? 'Pulling...' : 'Pull'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Pull Progress */}
            {isPulling && pullProgress && (
                <Card>
                    <div className="p-3">
                        <p className="text-sm font-semibold text-white">{pullProgress.status}</p>
                        {pullProgress.details && <p className="text-xs text-gray-400 mt-1 font-mono">{pullProgress.details}</p>}
                        {pullProgress.percent && (
                            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${pullProgress.percent}%` }} />
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Not Found / Not Running States */}
            {currentStatus === 'not_found' && activeProvider === 'ollama' && (
                <Card>
                    <div className="text-center p-4">
                        <h4 className="font-semibold text-lg text-white">Ollama Not Found</h4>
                        <p className="text-gray-400 my-2">Ollama is required to run local models.</p>
                        <Button variant="primary" onClick={async () => {
                            setProviderStatuses(prev => ({ ...prev, ollama: 'installing' }));
                            await window.api.installOllama();
                            checkAllStatuses();
                        }}>
                            <DownloadCloud size={18}/> Install Ollama
                        </Button>
                    </div>
                </Card>
            )}

            {(currentStatus === 'not_found' || currentStatus === 'not_running') && activeProvider !== 'ollama' && activeProvider !== 'gguf' && (
                <Card>
                    <div className="text-center p-4">
                        <h4 className="font-semibold text-lg text-white">{providerInfo.name} Not Detected</h4>
                        <p className="text-gray-400 my-2">
                            {activeProvider === 'lmstudio'
                                ? 'Start LM Studio and enable the local server (usually on port 1234).'
                                : 'Start llama.cpp server (usually on port 8080).'}
                        </p>
                        <div className="flex gap-2 justify-center mt-3">
                            <Button variant="secondary" onClick={checkAllStatuses}>
                                Refresh Status
                            </Button>
                            <a
                                href={providerInfo.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm"
                            >
                                Get {providerInfo.name}
                            </a>
                        </div>
                    </div>
                </Card>
            )}

            {/* GGUF/GGML Directory Configuration */}
            {activeProvider === 'gguf' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Models Directory (optional)</label>
                        <div className="flex gap-2">
                            <Input
                                value={ggufDirectory}
                                onChange={(e) => setGgufDirectory(e.target.value)}
                                placeholder="~/.npcsh/models/gguf or /path/to/models"
                                className="flex-1"
                            />
                            <Button variant="secondary" onClick={() => fetchModelsForProvider('gguf')} disabled={isScanning}>
                                {isScanning ? 'Scanning...' : 'Scan'}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Leave empty to scan default locations. Set NPCSH_GGUF_DIR env var for persistent config.
                        </p>
                    </div>
                    <Card>
                        <div className="p-3">
                            <p className="text-sm text-gray-300">
                                <strong>Usage:</strong> Set provider to <code className="bg-gray-700 px-1 rounded">gguf</code> or <code className="bg-gray-700 px-1 rounded">ggml</code> and
                                model to the file path (relative to CWD or absolute).
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Example: model=&quot;./models/llama-7b.Q4_K_M.gguf&quot; provider=&quot;gguf&quot;
                            </p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Model List */}
            {(currentStatus === 'running' || activeProvider === 'gguf') && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm text-gray-400">Available Models ({currentModels.length})</h4>
                        <Button variant="secondary" onClick={handleScanModels} disabled={isScanning}>
                            {isScanning ? 'Scanning...' : 'Scan Models'}
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {currentModels.length > 0 ? currentModels.map((model, idx) => (
                            <Card key={model.name || model.id || model.path || idx}>
                                <div className="flex justify-between items-center p-3">
                                    <div className="overflow-hidden">
                                        <p className="font-semibold text-white">{model.name || model.id || model.filename}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {model.size ? `Size: ${(model.size / 1e9).toFixed(2)} GB` : ''}
                                            {model.modified_at && ` | Modified: ${new Date(model.modified_at).toLocaleDateString()}`}
                                            {model.path && <span className="block truncate" title={model.path}>Path: {model.path}</span>}
                                        </p>
                                    </div>
                                    {activeProvider === 'ollama' && (
                                        <button
                                            onClick={() => handleDeleteModel(model.name)}
                                            disabled={isDeleting === model.name}
                                            className="p-2 text-red-500 hover:text-red-400 disabled:text-gray-500"
                                        >
                                            {isDeleting === model.name ? '...' : <Trash2 size={16}/>}
                                        </button>
                                    )}
                                </div>
                            </Card>
                        )) : (
                            <p className="text-gray-500 text-center py-4">
                                {activeProvider === 'ollama' && 'No models found. Pull a model above.'}
                                {activeProvider === 'gguf' && 'No GGUF/GGML files found. Specify a directory or place files in ~/.npcsh/models/gguf'}
                                {activeProvider !== 'ollama' && activeProvider !== 'gguf' && 'No models found. Load models in the app.'}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingsMenu = ({ isOpen, onClose, currentPath, onPathChange, availableModels = [], embedded = false }) => {
    const [activeTab, setActiveTab] = useState('global');
    const [globalSettings, setGlobalSettings] = useState(defaultSettings);
    const [customGlobalVars, setCustomGlobalVars] = useState([{ key: '', value: '' }]);
    const [customEnvVars, setCustomEnvVars] = useState([{ key: '', value: '' }]);
    const [customProviders, setCustomProviders] = useState([{ name: '', baseUrl: '', apiKeyVar: '', headers: '' }]);
    const [visibleFields, setVisibleFields] = useState({});

    const loadGlobalSettings = async () => {
        const data = await window.api.loadGlobalSettings();
        if (data.error) return;
        setGlobalSettings(data.global_settings || defaultSettings);
        
        if (data.global_vars && Object.keys(data.global_vars).length > 0) {
            const parsedCustomVars = Object.entries(data.global_vars)
                .filter(([key]) => !key.startsWith('CUSTOM_PROVIDER_'))
                .map(([key, value]) => ({ key, value }));
            setCustomGlobalVars(parsedCustomVars.length > 0 ? parsedCustomVars : [{ key: '', value: '' }]);
            
            const providers = Object.keys(data.global_vars)
                .filter(key => key.startsWith('CUSTOM_PROVIDER_'))
                .map(key => {
                    const providerName = key.replace('CUSTOM_PROVIDER_', '');
                    try {
                        const config = JSON.parse(data.global_vars[key]);
                        return {
                            name: providerName.toLowerCase(),
                            baseUrl: config.base_url || '',
                            apiKeyVar: config.api_key_var || '',
                            headers: config.headers ? JSON.stringify(config.headers, null, 2) : ''
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
            
            if (providers.length > 0) setCustomProviders(providers);
        }
    };

    const loadProjectSettings = async () => {
        if (!currentPath) return;
        const data = await window.api.loadProjectSettings(currentPath);
        if (data.error) return;
        if (data.env_vars && Object.keys(data.env_vars).length > 0) {
            setCustomEnvVars(Object.entries(data.env_vars).map(([key, value]) => ({ key, value })));
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadGlobalSettings();
            if (currentPath) loadProjectSettings();
        }
    }, [isOpen, currentPath]);

    const handleSave = async () => {
        const globalVars = customGlobalVars.reduce((acc, { key, value }) => {
            if (key && value) acc[key] = value;
            return acc;
        }, {});

        customProviders.forEach(provider => {
            if (provider.name && provider.baseUrl) {
                const config = {
                    base_url: provider.baseUrl,
                    api_key_var: provider.apiKeyVar || `${provider.name.toUpperCase()}_API_KEY`,
                };
                if (provider.headers) {
                    try {
                        config.headers = JSON.parse(provider.headers);
                    } catch (e) {}
                }
                globalVars[`CUSTOM_PROVIDER_${provider.name.toUpperCase()}`] = JSON.stringify(config);
            }
        });

        await window.api.saveGlobalSettings({
            global_settings: globalSettings,
            global_vars: globalVars
        });

        const envVars = customEnvVars.reduce((acc, { key, value }) => {
            if (key && value) acc[key] = value;
            return acc;
        }, {});

        if (currentPath) {
            await window.api.saveProjectSettings({
                path: currentPath,
                env_vars: envVars
            });
        }

        onClose();
    };

    const tabs = [
        { id: 'global', name: 'Global Settings' },
        { id: 'shortcuts', name: 'Keyboard Shortcuts' },
        { id: 'models', name: 'Model Management' },
        { id: 'providers', name: 'Custom Providers' }
    ];

    const isSensitiveField = (key) => {
        const sensitiveWords = ['key', 'token', 'secret', 'password', 'api'];
        return sensitiveWords.some(word => key.toLowerCase().includes(word));
    };

    const content = (
        <div className={`flex flex-col ${embedded ? 'h-full' : 'h-full'}`}>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeTab === 'global' && (
                    <>
                        <Input
                            label="Default Directory"
                            value={globalSettings.default_folder}
                            onChange={(e) => setGlobalSettings({...globalSettings, default_folder: e.target.value})}
                        />
                        <Input
                            label="Model"
                            value={globalSettings.model || ''}
                            onChange={(e) => setGlobalSettings({...globalSettings, model: e.target.value})}
                        />
                        <Input
                            label="Provider"
                            value={globalSettings.provider || ''}
                            onChange={(e) => setGlobalSettings({...globalSettings, provider: e.target.value})}
                        />

                        <div className="border border-gray-700 rounded-lg p-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={globalSettings.is_predictive_text_enabled}
                                    onChange={(e) => setGlobalSettings({...globalSettings, is_predictive_text_enabled: e.target.checked})}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">Predictive Text (Copilot)</span>
                            </label>
                            {globalSettings.is_predictive_text_enabled && (
                                <div className="mt-3">
                                    <Select
                                        label="Model for Predictions"
                                        value={globalSettings.predictive_text_model}
                                        onChange={(e) => setGlobalSettings({...globalSettings, predictive_text_model: e.target.value})}
                                        options={availableModels.map(m => ({ value: m.value, label: m.display_name }))}
                                    />
                                </div>
                            )}
                        </div>

                        <Card title="Custom Global Variables">
                            {customGlobalVars.map((variable, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <Input
                                        value={variable.key}
                                        onChange={(e) => {
                                            const newVars = [...customGlobalVars];
                                            newVars[index].key = e.target.value;
                                            setCustomGlobalVars(newVars);
                                        }}
                                        placeholder="Variable name"
                                        className="flex-1"
                                    />
                                    <div className="flex-1 relative">
                                        <Input
                                            type={visibleFields[`global_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"}
                                            value={variable.value}
                                            onChange={(e) => {
                                                const newVars = [...customGlobalVars];
                                                newVars[index].value = e.target.value;
                                                setCustomGlobalVars(newVars);
                                            }}
                                            placeholder="Value"
                                        />
                                        {isSensitiveField(variable.key) && (
                                            <button
                                                type="button"
                                                onClick={() => setVisibleFields(prev => ({ ...prev, [`global_${index}`]: !prev[`global_${index}`] }))}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                            >
                                                {visibleFields[`global_${index}`] ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newVars = [...customGlobalVars];
                                            newVars.splice(index, 1);
                                            if (newVars.length === 0) newVars.push({ key: '', value: '' });
                                            setCustomGlobalVars(newVars);
                                        }}
                                        className="p-2 text-red-400"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                            <Button variant="secondary" onClick={() => setCustomGlobalVars([...customGlobalVars, { key: '', value: '' }])}>
                                Add Variable
                            </Button>
                        </Card>
                    </>
                )}

                {activeTab === 'shortcuts' && (
                    <Card title="Keyboard Shortcuts">
                        <p className="text-sm text-gray-400 mb-4">
                            Customize keyboard shortcuts for quick actions. Use Ctrl/Cmd, Shift, Alt modifiers.
                        </p>
                        <div className="space-y-3">
                            {Object.entries(globalSettings.keyboard_shortcuts || defaultKeyboardShortcuts).map(([key, value]) => {
                                const labels = {
                                    newConversation: 'New Conversation',
                                    newFolder: 'New Folder',
                                    newBrowser: 'New Browser',
                                    newTerminal: 'New Terminal',
                                    newCodeFile: 'New Code File',
                                    newWorkspace: 'New Workspace',
                                    toggleSidebar: 'Toggle Sidebar',
                                    commandPalette: 'Command Palette',
                                    fileSearch: 'File Search',
                                    globalSearch: 'Global Search',
                                    save: 'Save',
                                    closePane: 'Close Pane',
                                };
                                return (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                        <label className="text-sm text-gray-300 min-w-[150px]">{labels[key] || key}</label>
                                        <Input
                                            value={value}
                                            onChange={(e) => {
                                                setGlobalSettings({
                                                    ...globalSettings,
                                                    keyboard_shortcuts: {
                                                        ...(globalSettings.keyboard_shortcuts || defaultKeyboardShortcuts),
                                                        [key]: e.target.value
                                                    }
                                                });
                                            }}
                                            placeholder="e.g., Ctrl+Shift+N"
                                            className="w-40"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <Button
                                variant="secondary"
                                onClick={() => setGlobalSettings({
                                    ...globalSettings,
                                    keyboard_shortcuts: defaultKeyboardShortcuts
                                })}
                            >
                                Reset to Defaults
                            </Button>
                        </div>
                    </Card>
                )}

                {activeTab === 'models' && <ModelManager />}

                {activeTab === 'providers' && (
                    <Card title="Custom API Providers">
                        <p className="text-sm text-gray-400 mb-4">
                            Define custom API providers for your models.
                        </p>
                        {customProviders.map((provider, index) => (
                            <Card key={index}>
                                <div className="space-y-3">
                                    <Input
                                        label="Provider Name"
                                        value={provider.name}
                                        onChange={(e) => {
                                            const newProviders = [...customProviders];
                                            newProviders[index].name = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                            setCustomProviders(newProviders);
                                        }}
                                        placeholder="mycustomllm"
                                    />
                                    <Input
                                        label="Base URL"
                                        value={provider.baseUrl}
                                        onChange={(e) => {
                                            const newProviders = [...customProviders];
                                            newProviders[index].baseUrl = e.target.value;
                                            setCustomProviders(newProviders);
                                        }}
                                        placeholder="https://api.example.com/v1"
                                    />
                                    <Button
                                        variant="danger"
                                        onClick={() => {
                                            const newProviders = [...customProviders];
                                            newProviders.splice(index, 1);
                                            if (newProviders.length === 0) {
                                                newProviders.push({ name: '', baseUrl: '', apiKeyVar: '', headers: '' });
                                            }
                                            setCustomProviders(newProviders);
                                        }}
                                    >
                                        Remove Provider
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        <Button variant="secondary" onClick={() => setCustomProviders([...customProviders, { name: '', baseUrl: '', apiKeyVar: '', headers: '' }])}>
                            Add Provider
                        </Button>
                    </Card>
                )}
            </div>

            <div className="border-t border-gray-700 p-4 flex justify-end">
                <Button variant="primary" onClick={handleSave}>
                    <Save size={20} /> Save Changes
                </Button>
            </div>
        </div>
    );

    if (embedded) {
        return (
            <div className="flex flex-col h-full theme-bg-primary">
                {content}
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
            {content}
        </Modal>
    );
};

export default SettingsMenu;