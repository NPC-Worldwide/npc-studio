import React, { useState, useEffect } from 'react';
import { Settings, X, Save, FolderOpen, Eye, EyeOff } from 'lucide-react';
//const HOME_DIR = process.env.HOME;
const HOME_DIR = '/home/caug/.npcsh'
const defaultSettings = {
    NPCSH_LICENSE_KEY: '',
    model: 'llama3.2',
    provider: 'ollama',
    embedding_model: 'nomic-text-embed',
    embedding_provider: 'ollama',
    search_provider: 'google',
    default_folder: HOME_DIR,
    darkThemeColor: "#000000",
    lightThemeColor: "#FFFFFF"
};
const [verificationStatus, setVerificationStatus] = useState({
    isVerifying: false,
    status: null,
    message: null
});

// Add this handler function with your other handlers
const handleLicenseValidation = async () => {
    if (!globalSettings.NPCSH_LICENSE_KEY) {
        setVerificationStatus({
            isVerifying: false,
            status: 'error',
            message: 'Please enter a license key'
        });
        return;
    }

    setVerificationStatus({
        isVerifying: true,
        status: null,
        message: 'Verifying license...'
    });

    try {
        const response = await fetch('https://license-verification-120419531021.us-central1.run.app', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: globalSettings.NPCSH_LICENSE_KEY,
                timestamp: Date.now()
            })
        });

        const data = await response.json();

        if (data.valid) {
            // Store the session token
            localStorage.setItem('npc_session_token', data.sessionToken);
            localStorage.setItem('npc_license_expiry', data.expiresAt);
            
            setVerificationStatus({
                isVerifying: false,
                status: 'success',
                message: 'License verified successfully'
            });

            // Update global settings with verified status
            setGlobalSettings({
                ...globalSettings,
                licenseStatus: 'verified'
            });
        } else {
            setVerificationStatus({
                isVerifying: false,
                status: 'error',
                message: data.error || 'License verification failed'
            });
        }
    } catch (error) {
        console.error('License verification error:', error);
        setVerificationStatus({
            isVerifying: false,
            status: 'error',
            message: 'Connection error during verification'
        });
    }
};


const SettingsMenu = ({ isOpen, onClose, currentPath, onPathChange }) => {
    const [activeTab, setActiveTab] = useState('global');
    const [globalSettings, setGlobalSettings] = useState(defaultSettings);
    const [envSettings, setEnvSettings] = useState(defaultSettings);
    const [customGlobalVars, setCustomGlobalVars] = useState([{ key: '', value: '' }]);
    const [customEnvVars, setCustomEnvVars] = useState([{ key: '', value: '' }]);
    const [placeholders, setPlaceholders] = useState(defaultSettings);
    const [visibleFields, setVisibleFields] = useState({});



    useEffect(() => {
        if (isOpen) {
            loadGlobalSettings();
            if (currentPath) {
                loadProjectSettings();
            }
        }
    }, [isOpen, currentPath]);

    const loadGlobalSettings = async () => {
        try {
            const response = await fetch('http://localhost:5337/api/settings/global', {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Set the actual values and placeholders from global settings
            setPlaceholders(data.global_settings || defaultSettings);
            setGlobalSettings(data.global_settings || defaultSettings);
            console.log(data);

            if (data.global_vars && Object.keys(data.global_vars).length > 0) {
                setCustomGlobalVars(Object.entries(data.global_vars).map(([key, value]) => ({ key, value })));
            }
        } catch (err) {
            console.error('Error loading global settings:', err);
            setGlobalSettings(defaultSettings);
            setCustomGlobalVars([{ key: '', value: '' }]);

        }
    };

    const loadProjectSettings = async () => {
        try {
            const response = await fetch(`http://localhost:5337/api/settings/project?path=${encodeURIComponent(currentPath)}`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.env_vars && Object.keys(data.env_vars).length > 0) {
                setCustomEnvVars(Object.entries(data.env_vars).map(([key, value]) => ({ key, value })));
            }
        } catch (err) {
            console.error('Error loading project settings:', err);
            setCustomEnvVars([{ key: '', value: '' }]);
        }
    };
    const isSensitiveField = (key) => {
        const sensitiveWords = ['key', 'token', 'secret', 'password', 'api'];
        return sensitiveWords.some(word => key.toLowerCase().includes(word));
    };

    const handleSave = async () => {
        try {
            const globalVars = customGlobalVars.reduce((acc, { key, value }) => {
                if (key && value) acc[key] = value;
                return acc;
            }, {});

            await fetch('http://localhost:5337/api/settings/global', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    global_settings: globalSettings,
                    global_vars: globalVars,

                })
            });

            const envVars = customEnvVars.reduce((acc, { key, value }) => {
                if (key && value) acc[key] = value;
                return acc;
            }, {});

            if (currentPath) {
                await fetch(`http://localhost:5337/api/settings/project?path=${encodeURIComponent(currentPath)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        env_vars: envVars
                    })
                });
            }

            onClose();
        } catch (err) {
            console.error('Error saving settings:', err);
        }
    };

    const handlePurchase = async () => {
        const url = 'https://checkout.square.site/merchant/ML7E3AYFMJ76Q/checkout/YX35QHHFVWSAHUNNTKMNQBSV';
        try {
            await window.api.openExternal(url);
        } catch (error) {
            console.error('Failed to open external URL:', error);
        }
    };

    const handleFolderPicker = async () => {
        try {
            const selectedPath = await window.api.open_directory_picker();
            if (selectedPath && typeof onPathChange === 'function') {
                onPathChange(selectedPath);
            }
        } catch (err) {
            console.error('Error picking folder:', err);
        }
    };

    const renderSettingsFields = (type) => {
        const settings = type === 'global' ? globalSettings : envSettings;
        const setSettings = type === 'global' ? setGlobalSettings : setEnvSettings;

        return (
            <div className="space-y-4">
                {type === 'global' && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            License Key
                        </label>
                        <div className="space-y-2">
                        <input
                    type={visibleFields.licenseKey ? "text" : "password"}
                    value={settings.NPCSH_LICENSE_KEY || ''}
                    onChange={(e) => setSettings({...settings, NPCSH_LICENSE_KEY: e.target.value})}
                    className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 pr-10"
                    placeholder={placeholders.NPCSH_LICENSE_KEY || "Enter your license key"}
                />
                                <button
                    type="button"
                    onClick={() => toggleFieldVisibility('licenseKey')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                    {visibleFields.licenseKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={handlePurchase}
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
                                >
                                    Purchase a license
                                </button>
                                <button
    onClick={handleLicenseValidation}
    disabled={verificationStatus.isVerifying}
    className={`text-sm px-3 py-2 rounded text-white ${
        verificationStatus.isVerifying 
            ? 'bg-gray-500' 
            : verificationStatus.status === 'success'
                ? 'bg-green-600 hover:bg-green-500'
                : 'bg-blue-600 hover:bg-blue-500'
    }`}
>
    {verificationStatus.isVerifying 
        ? 'Verifying...' 
        : verificationStatus.status === 'success'
            ? 'Verified' 
            : 'Validate License'
    }
</button>
{verificationStatus.message && (
    <span className={`text-sm ${
        verificationStatus.status === 'success' ? 'text-green-400' : 'text-red-400'
    }`}>
        {verificationStatus.message}
    </span>
)}

                            </div>
                        </div>
                    </div>
                )}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Global Shortcut</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={settings.shortcut || 'CommandOrControl+Space'}
                                onKeyDown={(e) => {
                                    e.preventDefault();
                                    const keys = [];
                                    if (e.ctrlKey) keys.push('Control');
                                    if (e.metaKey) keys.push('Command');
                                    if (e.altKey) keys.push('Alt');
                                    if (e.shiftKey) keys.push('Shift');
                                    if (e.key !== 'Control' && e.key !== 'Meta' &&
                                        e.key !== 'Alt' && e.key !== 'Shift') {
                                        keys.push(e.key.toUpperCase());
                                    }
                                    if (keys.length > 0) {
                                        const shortcut = keys.join('+');
                                        setSettings({...settings, shortcut});
                                        window.electron.updateShortcut(shortcut);
                                    }
                                }}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder="Press keys to set shortcut"
                            />
                        </div>
                    </div>

                {type === 'global' && (
                    <>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Default Directory</label>
                            <input
                                type="text"
                                value={settings.default_folder}
                                onChange={(e) => setSettings({...settings, default_folder: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={type === 'global' ? placeholders.default_folder : HOME_DIR}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Model</label>
                            <input
                                type="text"
                                value={settings.model || ''}
                                onChange={(e) => setSettings({...settings, model: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={type === 'global' ? placeholders.model : 'llama3.2'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Provider</label>
                            <input
                                type="text"
                                value={settings.provider || ''}
                                onChange={(e) => setSettings({...settings, provider: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={type === 'global' ? placeholders.provider : 'ollama'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Embedding Model</label>
                            <input
                                type="text"
                                value={settings.embedding_model || ''}
                                onChange={(e) => setSettings({...settings, embedding_model: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={placeholders.embedding_model}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Embedding Provider</label>
                            <input
                                type="text"
                                value={settings.embedding_provider || ''}
                                onChange={(e) => setSettings({...settings, embedding_provider: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={placeholders.embedding_provider}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Search Provider</label>
                            <input
                                type="text"
                                value={settings.search_provider || ''}
                                onChange={(e) => setSettings({...settings, search_provider: e.target.value})}
                                className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                placeholder={placeholders.search_provider}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    };
    const toggleFieldVisibility = (fieldName) => {
        setVisibleFields(prev => ({
            ...prev,
            [fieldName]: !prev[fieldName]
        }));
    };
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
            if (newVars.length === 0) {
                newVars.push({ key: '', value: '' });
            }
            setCustomGlobalVars(newVars);
        } else {
            const newVars = [...customEnvVars];
            newVars.splice(index, 1);
            if (newVars.length === 0) {
                newVars.push({ key: '', value: '' });
            }
            setCustomEnvVars(newVars);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#0b1017] rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 flex justify-between items-center">
                    <h3 className="text-lg flex items-center gap-2">
                        <Settings className="text-blue-400" />
                        Settings
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="border-b border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`px-4 py-2 ${activeTab === 'global' ? 'border-b-2 border-blue-500' : ''}`}
                        >
                            Global Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('env')}
                            className={`px-4 py-2 ${activeTab === 'env' ? 'border-b-2 border-blue-500' : ''}`}
                        >
                            Folder Settings
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">


                    {activeTab === 'global' ? (
                        <>
                            {renderSettingsFields('global')}
                            <div className="mt-6">
                                <h4 className="text-sm text-gray-400 mb-2">Custom Global Variables</h4>
                                {customGlobalVars.map((variable, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={variable.key}
                                        onChange={(e) => {
                                            const newVars = [...customGlobalVars];
                                            newVars[index].key = e.target.value;
                                            setCustomGlobalVars(newVars);
                                        }}
                                        className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                        placeholder="Variable name"
                                    />
                                    <div className="flex-1 relative">
                                        <input
                                            type={visibleFields[`global_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"}
                                            value={variable.value}
                                            onChange={(e) => {
                                                const newVars = [...customGlobalVars];
                                                newVars[index].value = e.target.value;
                                                setCustomGlobalVars(newVars);
                                            }}
                                            className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 pr-10"
                                            placeholder="Value"
                                        />
                                        {isSensitiveField(variable.key) && (
                                            <button
                                                type="button"
                                                onClick={() => toggleFieldVisibility(`global_${index}`)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                {visibleFields[`global_${index}`] ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeVariable('global', index)}
                                        className="p-2 text-gray-400 hover:text-white"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}

                                <button
                                    onClick={() => addVariable('global')}
                                    className="w-full border border-gray-700 rounded py-2 hover:bg-[#1a2634] mt-2"
                                >
                                    Add Global Variable
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <label className="block text-sm text-gray-400 mb-1">
                                    Current Directory
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={currentPath}
                                        readOnly
                                        className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                    />
                                    <button
                                        onClick={handleFolderPicker}
                                        className="p-2 bg-[#1a2634] rounded hover:bg-gray-600"
                                    >
                                        <FolderOpen size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h4 className="text-sm text-gray-400 mb-2">Custom Environment Variables</h4>
                                {customEnvVars.map((variable, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={variable.key}
                                    onChange={(e) => {
                                        const newVars = [...customEnvVars];
                                        newVars[index].key = e.target.value;
                                        setCustomEnvVars(newVars);
                                    }}
                                    className="flex-1 bg-[#1a2634] border border-gray-700 rounded px-3 py-2"
                                    placeholder="Variable name"
                                />
                                <div className="flex-1 relative">
                                    <input
                                        type={visibleFields[`env_${index}`] || !isSensitiveField(variable.key) ? "text" : "password"}
                                        value={variable.value}
                                        onChange={(e) => {
                                            const newVars = [...customEnvVars];
                                            newVars[index].value = e.target.value;
                                            setCustomEnvVars(newVars);
                                        }}
                                        className="w-full bg-[#1a2634] border border-gray-700 rounded px-3 py-2 pr-10"
                                        placeholder="Value"
                                    />
                                    {isSensitiveField(variable.key) && (
                                        <button
                                            type="button"
                                            onClick={() => toggleFieldVisibility(`env_${index}`)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {visibleFields[`env_${index}`] ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeVariable('env', index)}
                                    className="p-2 text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                                <button
                                    onClick={() => addVariable('env')}
                                    className="w-full border border-gray-700 rounded py-2 hover:bg-[#1a2634]"
                                >
                                    Add Environment Variable
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-700 p-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
                    >
                        <Save size={20} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;