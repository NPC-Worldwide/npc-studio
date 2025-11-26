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

const ModelManager = () => {
    const [ollamaStatus, setOllamaStatus] = useState('checking');
    const [localModels, setLocalModels] = useState([]);
    const [pullModelName, setPullModelName] = useState('llama3.1');
    const [pullProgress, setPullProgress] = useState(null);
    const [isPulling, setIsPulling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);

    const fetchLocalModels = async () => {
        const models = await window.api.getLocalOllamaModels();
        if (models && !models.error) {
            setLocalModels(models);
        }
    };

    const checkStatus = async () => {
        const status = await window.api.checkOllamaStatus();
        setOllamaStatus(status.status);
        if (status.status === 'running') fetchLocalModels();
    };

    useEffect(() => {
        checkStatus();
        const cleanupProgress = window.api.onOllamaPullProgress((progress) => setPullProgress(progress));
        const cleanupComplete = window.api.onOllamaPullComplete(() => {
            setIsPulling(false);
            setPullProgress({ status: 'Success!', details: 'Model installed.' });
            setTimeout(() => {
                setPullProgress(null);
                setPullModelName('');
                fetchLocalModels();
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
        fetchLocalModels();
        setIsDeleting(null);
    };

    if (ollamaStatus === 'checking') {
        return <p className="text-center text-gray-400 p-4">Checking for Ollama...</p>;
    }

    if (ollamaStatus === 'not_found') {
        return (
            <Card>
                <div className="text-center p-4">
                    <h4 className="font-semibold text-lg text-white">Ollama Not Found</h4>
                    <p className="text-gray-400 my-2">Ollama is required to run local models.</p>
                    <Button variant="primary" onClick={async () => {
                        setOllamaStatus('installing');
                        await window.api.installOllama();
                        checkStatus();
                    }}>
                        <DownloadCloud size={18}/> Install Ollama
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm text-gray-400 mb-2">Pull Model from Ollama Hub</label>
                <div className="flex gap-2">
                    <Input
                        value={pullModelName}
                        onChange={(e) => setPullModelName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePullModel()}
                        placeholder="e.g., llama3.1"
                        disabled={isPulling}
                        className="flex-1"
                    />
                    <Button variant="primary" onClick={handlePullModel} disabled={isPulling || !pullModelName.trim()}>
                        {isPulling ? 'Pulling...' : 'Pull'}
                    </Button>
                </div>
            </div>

            {isPulling && pullProgress && (
                <Card>
                    <p className="text-sm font-semibold text-white">{pullProgress.status}</p>
                    {pullProgress.details && <p className="text-xs text-gray-400 mt-1 font-mono">{pullProgress.details}</p>}
                    {pullProgress.percent && (
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${pullProgress.percent}%` }}></div>
                        </div>
                    )}
                </Card>
            )}

            <div>
                <h4 className="text-sm text-gray-400 mb-2">Locally Installed Models</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {localModels.length > 0 ? localModels.map(model => (
                        <Card key={model.name}>
                            <div className="flex justify-between items-center p-3">
                                <div>
                                    <p className="font-semibold text-white">{model.name}</p>
                                    <p className="text-xs text-gray-500">Size: {(model.size / 1e9).toFixed(2)} GB</p>
                                </div>
                                <button
                                    onClick={() => handleDeleteModel(model.name)}
                                    disabled={isDeleting === model.name}
                                    className="p-2 text-red-500 hover:text-red-400 disabled:text-gray-500"
                                >
                                    {isDeleting === model.name ? '...' : <Trash2 size={16}/>}
                                </button>
                            </div>
                        </Card>
                    )) : (
                        <p className="text-gray-500 text-center py-4">No local models found.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const SettingsMenu = ({ isOpen, onClose, currentPath, onPathChange, availableModels = [] }) => {
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
        { id: 'env', name: 'Folder Settings' },
        { id: 'models', name: 'Model Management' },
        { id: 'providers', name: 'Custom Providers' }
    ];

    const isSensitiveField = (key) => {
        const sensitiveWords = ['key', 'token', 'secret', 'password', 'api'];
        return sensitiveWords.some(word => key.toLowerCase().includes(word));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
            <div className="flex flex-col h-full">
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
                            
                            <Card title="Predictive Text (Copilot)">
                                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={globalSettings.is_predictive_text_enabled}
                                        onChange={(e) => setGlobalSettings({...globalSettings, is_predictive_text_enabled: e.target.checked})}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">Enable Predictive Text</span>
                                </label>
                                {globalSettings.is_predictive_text_enabled && (
                                    <div className="space-y-3">
                                        <Select
                                            label="Model for Predictions"
                                            value={globalSettings.predictive_text_model}
                                            onChange={(e) => setGlobalSettings({...globalSettings, predictive_text_model: e.target.value})}
                                            options={availableModels.map(m => ({ value: m.value, label: m.display_name }))}
                                        />
                                    </div>
                                )}
                            </Card>
                            
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

                    {activeTab === 'env' && (
                        <>
                            <div className="flex items-center gap-2">
                                <Input
                                    label="Current Directory"
                                    value={currentPath}
                                    readOnly
                                    className="flex-1"
                                />
                                <button
                                    onClick={async () => {
                                        const path = await window.api.open_directory_picker();
                                        if (path && onPathChange) onPathChange(path);
                                    }}
                                    className="p-2 bg-gray-700 rounded hover:bg-gray-600"
                                >
                                    <FolderOpen size={20} />
                                </button>
                            </div>
                            
                            <Card title="Custom Environment Variables">
                                {customEnvVars.map((variable, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <Input
                                            value={variable.key}
                                            onChange={(e) => {
                                                const newVars = [...customEnvVars];
                                                newVars[index].key = e.target.value;
                                                setCustomEnvVars(newVars);
                                            }}
                                            placeholder="Variable name"
                                            className="flex-1"
                                        />
                                        <Input
                                            type={visibleFields[`env_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"}
                                            value={variable.value}
                                            onChange={(e) => {
                                                const newVars = [...customEnvVars];
                                                newVars[index].value = e.target.value;
                                                setCustomEnvVars(newVars);
                                            }}
                                            placeholder="Value"
                                            className="flex-1"
                                        />
                                        <button
                                            onClick={() => {
                                                const newVars = [...customEnvVars];
                                                newVars.splice(index, 1);
                                                if (newVars.length === 0) newVars.push({ key: '', value: '' });
                                                setCustomEnvVars(newVars);
                                            }}
                                            className="p-2 text-red-400"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="secondary" onClick={() => setCustomEnvVars([...customEnvVars, { key: '', value: '' }])}>
                                    Add Variable
                                </Button>
                            </Card>
                        </>
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
        </Modal>
    );
};

export default SettingsMenu;