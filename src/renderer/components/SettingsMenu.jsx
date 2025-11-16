import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Save, FolderOpen, Eye, EyeOff, DownloadCloud, Trash2, Check } from 'lucide-react';

const HOME_DIR = '/home/caug/.npcsh';

const defaultSettings = {
    model: 'llama3.2',
    provider: 'ollama',
    embedding_model: 'nomic-text-embed',
    embedding_provider: 'ollama',
    search_provider: 'google',
    default_folder: HOME_DIR,
    darkThemeColor: "#000000",
    lightThemeColor: "#FFFFFF",
    is_predictive_text_enabled: false,
    predictive_text_model: 'llama3.2',
    predictive_text_provider: 'ollama',
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
        } else {
            setLocalModels([]);
            console.error("Error fetching models:", models.error);
        }
    };

    const checkStatus = async () => {
        const status = await window.api.checkOllamaStatus();
        setOllamaStatus(status.status);
        if (status.status === 'running') {
            fetchLocalModels();
        }
    };

    useEffect(() => {
        checkStatus();

    const handleProgress = (progress) => {
        console.log('React received progress:', progress);
        setPullProgress(progress);
    };

    const handleComplete = () => {
        console.log('React received pull complete signal.');
        setIsPulling(false);
        setPullProgress({ status: 'Success!', details: 'Model installed.'});

        setTimeout(() => {
            setPullProgress(null);
            setPullModelName('');
            fetchLocalModels();
        }, 2000);
    };

    const handleError = (error) => {
        console.error('React received pull error:', error);
        setIsPulling(false);
        setPullProgress({ status: 'Error', details: error });
    };

        const cleanupPullProgress = window.api.onOllamaPullProgress(handleProgress);
        const cleanupPullComplete = window.api.onOllamaPullComplete(handleComplete);
        const cleanupPullError = window.api.onOllamaPullError(handleError);

        return () => {
            cleanupPullProgress();
            cleanupPullComplete();
            cleanupPullError();
        };
    }, []);

    const handleInstallOllama = async () => {
        setOllamaStatus('installing');
        await window.api.installOllama();
        checkStatus();
    };

    const handlePullModel = async (e) => {
        if (e) e.preventDefault();
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

    const renderContent = () => {
        switch (ollamaStatus) {
            case 'checking':
                return <p className="text-center text-gray-400 p-4">Checking for Ollama...</p>;
            case 'installing':
                return <p className="text-center text-gray-400 p-4">Installing Ollama, please wait...</p>;
            case 'not_found':
                return (
                    <div className="text-center p-4 bg-[#1a2634] rounded-lg">
                        <h4 className="font-semibold text-lg text-white">Ollama Not Found</h4>
                        <p className="text-gray-400 my-2">Ollama is required to run local models. It's a free, open-source tool.</p>
                        <button
                            onClick={handleInstallOllama}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 mx-auto"
                        >
                            <DownloadCloud size={18}/>
                            Install Ollama
                        </button>
                    </div>
                );
            case 'running':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Pull Model from Ollama Hub</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={pullModelName}
                                    onChange={(e) => setPullModelName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePullModel(e)}
                                    className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2 text-white"
                                    placeholder="e.g., llama3.1"
                                    disabled={isPulling}
                                />
                                <button
                                    onClick={handlePullModel}
                                    disabled={isPulling || !pullModelName.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    {isPulling ? 'Pulling...' : 'Pull'}
                                </button>
                            </div>
                        </div>

                        {isPulling && pullProgress && (
                            <div className="p-3 bg-[#1a2634] rounded-lg border border-gray-700">
                                <p className="text-sm font-semibold text-white">{pullProgress.status}</p>
                                {pullProgress.details && <p className="text-xs text-gray-400 mt-1 font-mono">{pullProgress.details}</p>}
                                {pullProgress.percent && (
                                    <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                                        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${pullProgress.percent}%` }}></div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <h4 className="text-sm text-gray-400 mb-2">Locally Installed Models</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {localModels.length > 0 ? localModels.map(model => (
                                    <div key={model.name} className="flex justify-between items-center bg-[#1a2634] p-3 rounded-md">
                                        <div>
                                            <p className="font-semibold text-white">{model.name}</p>
                                            <p className="text-xs text-gray-500">Size: {(model.size / 1e9).toFixed(2)} GB</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteModel(model.name)}
                                            disabled={isDeleting === model.name}
                                            className="p-2 text-red-500 hover:text-red-400 disabled:text-gray-500 disabled:cursor-wait rounded-md hover:bg-red-500/10"
                                            title={`Delete ${model.name}`}
                                        >
                                           {isDeleting === model.name ? '...' : <Trash2 size={16}/>}
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 text-center py-4">No local models found. Pull a model to get started.</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return <div className="space-y-4">{renderContent()}</div>;
};

const SettingsMenu = ({
    isOpen,
    onClose,
    currentPath,
    onPathChange,
    // NEW PROPS FOR PREDICTIVE TEXT:
    isPredictiveTextEnabled,
    setIsPredictiveTextEnabled,
    predictiveTextModel,
    setPredictiveTextModel,
    predictiveTextProvider,
    setPredictiveTextProvider,
    availableModels, // Pass available models for dropdown
}) => {
    const [activeTab, setActiveTab] = useState('global');
    const [globalSettings, setGlobalSettings] = useState(defaultSettings);
    const [envSettings, setEnvSettings] = useState(defaultSettings);
    const [customGlobalVars, setCustomGlobalVars] = useState([{ key: '', value: '' }]);
    const [customEnvVars, setCustomEnvVars] = useState([{ key: '', value: '' }]);
    const [placeholders, setPlaceholders] = useState(defaultSettings);
    const [visibleFields, setVisibleFields] = useState({});

    const _parseCustomProvidersFromGlobalVars = useCallback((globalVars) => {
        const providers = [];
        if (globalVars) {
            Object.keys(globalVars).forEach(key => {
                if (key.startsWith('CUSTOM_PROVIDER_')) {
                    const providerName = key.replace('CUSTOM_PROVIDER_', '');
                    try {
                        const config = JSON.parse(globalVars[key]);
                        providers.push({
                            name: providerName.toLowerCase(),
                            baseUrl: config.base_url || '',
                            apiKeyVar: config.api_key_var || '',
                            headers: config.headers ? JSON.stringify(config.headers, null, 2) : ''
                        });
                    } catch (e) {
                        console.error(`Failed to parse custom provider ${providerName}:`, e);
                    }
                }
            });
        }
        if (providers.length === 0) {
            providers.push({ name: '', baseUrl: '', apiKeyVar: '', headers: '' });
        }
        return providers;
    }, []);

    const [customProviders, setCustomProviders] = useState(() => _parseCustomProvidersFromGlobalVars(null));

    useEffect(() => {
        if (isOpen) {
            // Ensure setters are available before attempting to load settings
            if (typeof setIsPredictiveTextEnabled === 'function' &&
                typeof setPredictiveTextModel === 'function' &&
                typeof setPredictiveTextProvider === 'function') {
                loadGlobalSettings();
                if (currentPath) {
                    loadProjectSettings();
                }
            } else {
                console.warn("Predictive text setters not yet available in SettingsMenu. Skipping loadGlobalSettings for now.");
            }
        }
    }, [isOpen, currentPath, setIsPredictiveTextEnabled, setPredictiveTextModel, setPredictiveTextProvider]);

    const loadGlobalSettings = async () => {
        const data = await window.api.loadGlobalSettings();
        if (data.error) throw new Error(data.error);

        const loadedSettings = data.global_settings || defaultSettings;

        setPlaceholders(loadedSettings);
        setGlobalSettings(loadedSettings);

        if (data.global_vars && Object.keys(data.global_vars).length > 0) {
            const parsedCustomVars = Object.entries(data.global_vars)
                .filter(([key]) => !key.startsWith('CUSTOM_PROVIDER_'))
                .map(([key, value]) => ({ key, value }));
            setCustomGlobalVars(parsedCustomVars.length > 0 ? parsedCustomVars : [{ key: '', value: '' }]);
        } else {
            setCustomGlobalVars([{ key: '', value: '' }]);
        }

        setCustomProviders(_parseCustomProvidersFromGlobalVars(data.global_vars));

        // Update external states (passed as props) for predictive text
        // Add runtime checks to ensure setters are functions
        if (typeof setIsPredictiveTextEnabled === 'function') {
            setIsPredictiveTextEnabled(loadedSettings.is_predictive_text_enabled);
        }
        if (typeof setPredictiveTextModel === 'function') {
            setPredictiveTextModel(loadedSettings.predictive_text_model);
        }
        if (typeof setPredictiveTextProvider === 'function') {
            setPredictiveTextProvider(loadedSettings.predictive_text_provider);
        }
    };

    const loadProjectSettings = async () => {
        const data = await window.api.loadProjectSettings(currentPath);
        if (data.error) throw new Error(data.error);
        if (data.env_vars && Object.keys(data.env_vars).length > 0) {
            setCustomEnvVars(Object.entries(data.env_vars).map(([key, value]) => ({ key, value })));
        } else {
            setCustomEnvVars([{ key: '', value: '' }]);
        }
    };

    const isSensitiveField = (key) => {
        const sensitiveWords = ['key', 'token', 'secret', 'password', 'api'];
        return sensitiveWords.some(word => key.toLowerCase().includes(word));
    };

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
                    } catch (e) {
                        console.error('Invalid JSON for headers:', e);
                    }
                }
                globalVars[`CUSTOM_PROVIDER_${provider.name.toUpperCase()}`] = JSON.stringify(config);
            }
        });

        const settingsToSave = {
            ...globalSettings,
            is_predictive_text_enabled: isPredictiveTextEnabled,
            predictive_text_model: predictiveTextModel,
            predictive_text_provider: predictiveTextProvider,
        };

        await window.api.saveGlobalSettings({
            global_settings: settingsToSave,
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

    const handleFolderPicker = async () => {
        const selectedPath = await window.api.open_directory_picker();
        if (selectedPath && typeof onPathChange === 'function') onPathChange(selectedPath);
    };

    const toggleFieldVisibility = (fieldName) => setVisibleFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));

    const addVariable = (type) => {
        if (type === 'global') {
            setCustomGlobalVars([...customGlobalVars, { key: '', value: '' }]);
        } else {
            setCustomEnvVars([...customEnvVars, { key: '', value: '' }]);
        }
    };

    const removeVariable = (type, index) => {
        if (type === 'global') {
            const newVars = [...customGlobalVars];
            newVars.splice(index, 1);
            if (newVars.length === 0) newVars.push({ key: '', value: '' });
            setCustomGlobalVars(newVars);
        } else {
            const newVars = [...customEnvVars];
            newVars.splice(index, 1);
            if (newVars.length === 0) newVars.push({ key: '', value: '' });
            setCustomEnvVars(newVars);
        }
    };

    const addCustomProvider = () => {
        setCustomProviders([
            ...customProviders,
            { name: '', baseUrl: '', apiKeyVar: '', headers: '' }
        ]);
    };

    const removeCustomProvider = (index) => {
        const newProviders = [...customProviders];
        newProviders.splice(index, 1);
        if (newProviders.length === 0) {
            newProviders.push({
                name: '', baseUrl: '', apiKeyVar: '', headers: ''
            });
        }
        setCustomProviders(newProviders);
    };

    const renderSettingsFields = (type) => {
        const settings = type === 'global' ? globalSettings : envSettings;
        const setSettings = type === 'global' ? setGlobalSettings : setEnvSettings;

        return (
            <div className="space-y-4">
                {type === 'global' && (
                    <>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Default Directory</label>
                            <input type="text" value={settings.default_folder} onChange={(e) => setSettings({...settings, default_folder: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.default_folder} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Model</label>
                            <input type="text" value={settings.model || ''} onChange={(e) => setSettings({...settings, model: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.model} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Provider</label>
                            <input type="text" value={settings.provider || ''} onChange={(e) => setSettings({...settings, provider: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.provider} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Embedding Model</label>
                            <input type="text" value={settings.embedding_model || ''} onChange={(e) => setSettings({...settings, embedding_model: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.embedding_model} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Embedding Provider</label>
                            <input type="text" value={settings.embedding_provider || ''} onChange={(e) => setSettings({...settings, embedding_provider: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.embedding_provider} />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Search Provider</label>
                            <input type="text" value={settings.search_provider || ''} onChange={(e) => setSettings({...settings, search_provider: e.target.value})} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder={placeholders.search_provider} />
                        </div>
                        {/* NEW: Predictive Text (Copilot) Settings */}
                        <div className="mt-6 border-t border-gray-700 pt-4">
                            <h4 className="text-sm text-blue-400 font-semibold mb-2">Predictive Text (Copilot)</h4>
                            <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPredictiveTextEnabled}
                                    onChange={(e) => {
                                        if (typeof setIsPredictiveTextEnabled === 'function') {
                                            setIsPredictiveTextEnabled(e.target.checked);
                                        } else {
                                            console.error("setIsPredictiveTextEnabled is not a function when handling checkbox change.");
                                        }
                                    }}
                                    className="w-4 h-4 text-blue-600 bg-[#1a2634] border-gray-700 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-300">Enable Predictive Text (Ctrl/Cmd + Space)</span>
                            </label>
                            {isPredictiveTextEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Model for Predictions</label>
                                        <select
                                            value={predictiveTextModel || ''}
                                            onChange={(e) => {
                                                if (typeof setPredictiveTextModel === 'function') {
                                                    const selectedModel = availableModels.find(m => m.value === e.target.value);
                                                    setPredictiveTextModel(e.target.value);
                                                    if (selectedModel?.provider && typeof setPredictiveTextProvider === 'function') {
                                                        setPredictiveTextProvider(selectedModel.provider);
                                                    }
                                                } else {
                                                    console.error("setPredictiveTextModel is not a function when handling select change.");
                                                }
                                            }}
                                            className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 text-white text-sm"
                                        >
                                            {availableModels.length === 0 && (
                                                <option value="">No Models Available</option>
                                            )}
                                            {availableModels.map(model => (
                                                <option key={model.value} value={model.value}>{model.display_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Provider for Predictions</label>
                                        <input
                                            type="text"
                                            value={predictiveTextProvider || ''}
                                            onChange={(e) => {
                                                if (typeof setPredictiveTextProvider === 'function') {
                                                    setPredictiveTextProvider(e.target.value);
                                                } else {
                                                    console.error("setPredictiveTextProvider is not a function when handling input change.");
                                                }
                                            }}
                                            className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 text-white text-sm"
                                            placeholder="e.g., ollama, openai"
                                            readOnly // Provider is typically derived from the model, or set via custom providers
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-[#0b1017] rounded-lg shadow-xl w-full max-w-2xl text-white">
                    <header className="p-4 flex justify-between items-center">
                        <h3 className="text-lg flex items-center gap-2">
                            <Settings className="text-blue-400" />
                            Settings
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </header>

                    <div className="border-b border-gray-700">
                        <div className="flex px-4">
                            <button onClick={() => setActiveTab('global')} className={`px-4 py-2 text-sm ${activeTab === 'global' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>
                                Global Settings
                            </button>
                            <button onClick={() => setActiveTab('env')} className={`px-4 py-2 text-sm ${activeTab === 'env' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>
                                Folder Settings
                            </button>
                            <button onClick={() => setActiveTab('models')} className={`px-4 py-2 text-sm ${activeTab === 'models' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>
                                Model Management
                            </button>
                            <button
                                onClick={() => setActiveTab('providers')}
                                className={`px-4 py-2 text-sm ${
                                    activeTab === 'providers'
                                        ? 'border-b-2 border-blue-500 text-white'
                                        : 'text-gray-400'
                                }`}
                            >
                                Custom Providers
                            </button>
                        </div>
                    </div>

                    <main className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {activeTab === 'global' && (
                            <>
                                {renderSettingsFields('global')}
                                <div className="mt-6 border-t border-gray-700 pt-4">
                                    <h4 className="text-sm text-gray-400 mb-2">Custom Global Variables</h4>
                                    {customGlobalVars.map((variable, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <input type="text" value={variable.key} onChange={(e) => { const newVars = [...customGlobalVars]; newVars[index].key = e.target.value; setCustomGlobalVars(newVars); }} className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder="Variable name" />
                                            <div className="flex-1 relative">
                                                <input type={visibleFields[`global_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"} value={variable.value} onChange={(e) => { const newVars = [...customGlobalVars]; newVars[index].value = e.target.value; setCustomGlobalVars(newVars); }} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 pr-10" placeholder="Value" />
                                                {isSensitiveField(variable.key) && <button type="button" onClick={() => toggleFieldVisibility(`global_${index}`)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{visibleFields[`global_${index}`] ? <EyeOff size={20} /> : <Eye size={20} />}</button>}
                                            </div>
                                            <button onClick={() => removeVariable('global', index)} className="p-2 text-gray-400 hover:text-white"><X size={20} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addVariable('global')} className="w-full border border-gray-700 rounded py-2 hover:bg-[#1a2634] mt-2">Add Global Variable</button>
                                </div>
                            </>
                        )}
                        {activeTab === 'env' && (
                            <div className="space-y-4">
                                <div className="mb-4">
                                    <label className="block text-sm text-gray-400 mb-1">Current Directory</label>
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={currentPath} readOnly className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2" />
                                        <button onClick={handleFolderPicker} className="p-2 bg-[#1a2634] rounded hover:bg-gray-600"><FolderOpen size={20} /></button>
                                    </div>
                                </div>
                                <div className="mt-6 border-t border-gray-700 pt-4">
                                    <h4 className="text-sm text-gray-400 mb-2">Custom Environment Variables</h4>
                                    {customEnvVars.map((variable, index) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <input type="text" value={variable.key} onChange={(e) => { const newVars = [...customEnvVars]; newVars[index].key = e.target.value; setCustomEnvVars(newVars); }} className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2" placeholder="Variable name" />
                                            <div className="flex-1 relative">
                                                <input type={visibleFields[`env_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"} value={variable.value} onChange={(e) => { const newVars = [...customEnvVars]; newVars[index].value = e.target.value; setCustomEnvVars(newVars); }} className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 pr-10" placeholder="Value" />
                                                {isSensitiveField(variable.key) && <button type="button" onClick={() => toggleFieldVisibility(`env_${index}`)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">{visibleFields[`env_${index}`] ? <EyeOff size={20} /> : <Eye size={20} />}</button>}
                                            </div>
                                            <button onClick={() => removeVariable('env', index)} className="p-2 text-gray-400 hover:text-white"><X size={20} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addVariable('env')} className="w-full border border-gray-700 rounded py-2 hover:bg-[#1a2634]">Add Environment Variable</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'models' && <ModelManager />}
                        {activeTab === 'providers' && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400 mb-4">
                                    Define custom API providers. These will be available in your model dropdowns.
                                </p>

                                {customProviders.map((provider, index) => (
                                    <div key={index} className="p-4 border border-gray-700 rounded-lg space-y-3 relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="text-sm font-semibold text-white">Provider Configuration {index + 1}</h5>
                                            <button
                                                onClick={() => removeCustomProvider(index)}
                                                className="p-1 text-red-400 hover:text-red-300 rounded-md hover:bg-red-500/10"
                                                title="Remove provider"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                Provider Name (lowercase, no spaces/special chars)
                                            </label>
                                            <input
                                                type="text"
                                                value={provider.name}
                                                onChange={(e) => {
                                                    const newProviders = [...customProviders];
                                                    newProviders[index].name =
                                                        e.target.value.toLowerCase()
                                                            .replace(/[^a-z0-9_]/g, '');
                                                    setCustomProviders(newProviders);
                                                }}
                                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 font-mono text-sm text-white"
                                                placeholder="e.g., mycustomllm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                Base URL (e.g., https://api.myllm.com/v1)
                                            </label>
                                            <input
                                                type="text"
                                                value={provider.baseUrl}
                                                onChange={(e) => {
                                                    const newProviders = [...customProviders];
                                                    newProviders[index].baseUrl = e.target.value;
                                                    setCustomProviders(newProviders);
                                                }}
                                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 font-mono text-sm text-white"
                                                placeholder="https://api.example.com/v1"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                API Key Environment Variable (e.g., MYCUSTOMLLM_API_KEY)
                                            </label>
                                            <input
                                                type="text"
                                                value={provider.apiKeyVar}
                                                onChange={(e) => {
                                                    const newProviders = [...customProviders];
                                                    newProviders[index].apiKeyVar = e.target.value;
                                                    setCustomProviders(newProviders);
                                                }}
                                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 font-mono text-sm text-white"
                                                placeholder={
                                                    provider.name ?
                                                    `${provider.name.toUpperCase()}_API_KEY` :
                                                    'MYAPI_API_KEY'
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">
                                                Custom Headers (JSON format, optional)
                                            </label>
                                            <textarea
                                                value={provider.headers}
                                                onChange={(e) => {
                                                    const newProviders = [...customProviders];
                                                    newProviders[index].headers = e.target.value;
                                                    setCustomProviders(newProviders);
                                                }}
                                                rows={3}
                                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 font-mono text-xs text-white"
                                                placeholder='{"X-Custom-Header": "value"}'
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addCustomProvider}
                                    className="w-full border border-gray-700 rounded py-2 hover:bg-[#1a2634] text-sm text-white"
                                >
                                    Add Custom Provider
                                </button>
                            </div>
                        )}
                    </main>

                    <footer className="border-t border-gray-700 p-4 flex justify-end">
                        <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm">
                            <Save size={20} />
                            Save Changes
                        </button>
                    </footer>
                </div>
            </div>
        </>
    );
};

export default SettingsMenu;