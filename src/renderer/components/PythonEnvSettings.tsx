import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, AlertCircle, Terminal, Folder, ChevronDown } from 'lucide-react';

interface PythonEnv {
    type: 'system' | 'venv' | 'pyenv' | 'conda' | 'uv' | 'custom';
    name: string;
    path: string | null;
    venvPath?: string;
    pyenvVersion?: string;
    condaEnv?: string;
    condaRoot?: string;
    notInstalled?: boolean;
    hint?: string;
}

interface PythonEnvConfig {
    type: 'system' | 'venv' | 'pyenv' | 'conda' | 'uv' | 'custom';
    venvPath?: string;
    pyenvVersion?: string;
    condaEnv?: string;
    condaRoot?: string;
    customPath?: string;
}

interface PythonEnvSettingsProps {
    currentPath: string;
    onClose?: () => void;
    compact?: boolean;
}

const PythonEnvSettings: React.FC<PythonEnvSettingsProps> = ({ currentPath, onClose, compact = false }) => {
    const [detectedEnvs, setDetectedEnvs] = useState<PythonEnv[]>([]);
    const [currentConfig, setCurrentConfig] = useState<PythonEnvConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customPath, setCustomPath] = useState('');

    const loadConfig = useCallback(async () => {
        if (!currentPath) return;
        try {
            const config = await (window as any).api?.pythonEnvGet?.(currentPath);
            setCurrentConfig(config);
            if (config?.type === 'custom') {
                setShowCustomInput(true);
                setCustomPath(config.customPath || '');
            }
        } catch (err) {
            console.error('Error loading python env config:', err);
        }
    }, [currentPath]);

    const detectEnvs = useCallback(async () => {
        if (!currentPath) return;
        setLoading(true);
        setError(null);
        try {
            const envs = await (window as any).api?.pythonEnvDetect?.(currentPath);
            setDetectedEnvs(envs || []);
        } catch (err) {
            console.error('Error detecting python envs:', err);
            setError('Failed to detect Python environments');
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    useEffect(() => {
        loadConfig();
        detectEnvs();
    }, [loadConfig, detectEnvs]);

    const selectEnv = async (env: PythonEnv) => {
        if (!currentPath || env.notInstalled) return;
        setSaving(true);
        setError(null);
        try {
            const config: PythonEnvConfig = {
                type: env.type,
                venvPath: env.venvPath,
                pyenvVersion: env.pyenvVersion,
                condaEnv: env.condaEnv,
                condaRoot: env.condaRoot
            };
            await (window as any).api?.pythonEnvSave?.(currentPath, config);
            setCurrentConfig(config);
            setShowCustomInput(false);
        } catch (err) {
            console.error('Error saving python env config:', err);
            setError('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const saveCustomPath = async () => {
        if (!currentPath || !customPath.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const config: PythonEnvConfig = {
                type: 'custom',
                customPath: customPath.trim()
            };
            await (window as any).api?.pythonEnvSave?.(currentPath, config);
            setCurrentConfig(config);
        } catch (err) {
            console.error('Error saving custom python path:', err);
            setError('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const clearConfig = async () => {
        if (!currentPath) return;
        setSaving(true);
        try {
            await (window as any).api?.pythonEnvDelete?.(currentPath);
            setCurrentConfig(null);
            setShowCustomInput(false);
            setCustomPath('');
        } catch (err) {
            console.error('Error clearing python env config:', err);
        } finally {
            setSaving(false);
        }
    };

    const getEnvIcon = (type: string) => {
        switch (type) {
            case 'venv': return <span className="text-green-400">venv</span>;
            case 'pyenv': return <span className="text-yellow-400">pyenv</span>;
            case 'conda': return <span className="text-blue-400">conda</span>;
            case 'uv': return <span className="text-purple-400">uv</span>;
            case 'custom': return <span className="text-orange-400">custom</span>;
            default: return <span className="text-gray-400">sys</span>;
        }
    };

    const isSelected = (env: PythonEnv) => {
        if (!currentConfig) return env.type === 'system';
        if (currentConfig.type !== env.type) return false;
        if (env.type === 'venv' || env.type === 'uv') {
            return currentConfig.venvPath === env.venvPath;
        }
        if (env.type === 'pyenv') {
            return currentConfig.pyenvVersion === env.pyenvVersion;
        }
        if (env.type === 'conda') {
            return currentConfig.condaEnv === env.condaEnv;
        }
        return true;
    };

    if (compact) {
        // Compact dropdown version for quick selection
        return (
            <div className="relative">
                <select
                    className="px-2 py-1 text-xs theme-bg-tertiary theme-border border rounded outline-none focus:ring-1 focus:ring-blue-500"
                    value={currentConfig ? `${currentConfig.type}:${currentConfig.venvPath || currentConfig.pyenvVersion || currentConfig.condaEnv || ''}` : 'system:'}
                    onChange={async (e) => {
                        const [type, value] = e.target.value.split(':');
                        const env = detectedEnvs.find(d => d.type === type && (d.venvPath === value || d.pyenvVersion === value || d.condaEnv === value || (type === 'system' && !value)));
                        if (env) {
                            await selectEnv(env);
                        }
                    }}
                    disabled={loading || saving}
                >
                    {detectedEnvs.map((env, idx) => (
                        <option
                            key={idx}
                            value={`${env.type}:${env.venvPath || env.pyenvVersion || env.condaEnv || ''}`}
                            disabled={env.notInstalled}
                        >
                            {env.name}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold theme-text-primary flex items-center gap-2">
                    <Terminal size={16} />
                    Python Environment
                </h3>
                <button
                    onClick={detectEnvs}
                    disabled={loading}
                    className="p-1 theme-hover rounded text-blue-400 disabled:opacity-50"
                    title="Refresh detected environments"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}

            <div className="text-xs text-gray-500 mb-2">
                Workspace: {currentPath || 'None'}
            </div>

            {/* Detected Environments */}
            <div className="space-y-1">
                <div className="text-xs text-gray-400 mb-2">Detected Environments:</div>
                {loading ? (
                    <div className="text-xs text-gray-500">Scanning...</div>
                ) : detectedEnvs.length === 0 ? (
                    <div className="text-xs text-gray-500">No environments detected</div>
                ) : (
                    detectedEnvs.map((env, idx) => (
                        <button
                            key={idx}
                            onClick={() => selectEnv(env)}
                            disabled={env.notInstalled || saving}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left text-xs transition-colors ${
                                isSelected(env)
                                    ? 'bg-blue-500/20 border border-blue-500/50'
                                    : env.notInstalled
                                    ? 'opacity-50 cursor-not-allowed theme-bg-tertiary'
                                    : 'theme-bg-tertiary hover:bg-white/10'
                            }`}
                        >
                            <div className="w-12 font-mono">{getEnvIcon(env.type)}</div>
                            <div className="flex-1 truncate">
                                <div className="font-medium theme-text-primary">{env.name}</div>
                                {env.path && (
                                    <div className="text-gray-500 truncate">{env.path}</div>
                                )}
                                {env.hint && (
                                    <div className="text-yellow-500">{env.hint}</div>
                                )}
                            </div>
                            {isSelected(env) && <Check size={14} className="text-blue-400" />}
                        </button>
                    ))
                )}
            </div>

            {/* Custom Path Option */}
            <div className="pt-2 border-t theme-border">
                <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300"
                >
                    <ChevronDown size={12} className={showCustomInput ? 'rotate-180' : ''} />
                    Custom Python Path
                </button>
                {showCustomInput && (
                    <div className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={customPath}
                            onChange={(e) => setCustomPath(e.target.value)}
                            placeholder="/path/to/python"
                            className="flex-1 px-2 py-1 text-xs theme-bg-tertiary theme-border border rounded outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            onClick={saveCustomPath}
                            disabled={!customPath.trim() || saving}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>

            {/* Current Config Display */}
            {currentConfig && (
                <div className="pt-2 border-t theme-border">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                            Current: <span className="text-green-400">
                                {currentConfig.type === 'custom'
                                    ? currentConfig.customPath
                                    : currentConfig.type === 'venv' || currentConfig.type === 'uv'
                                    ? `${currentConfig.type} (${currentConfig.venvPath})`
                                    : currentConfig.type === 'pyenv'
                                    ? `pyenv (${currentConfig.pyenvVersion})`
                                    : currentConfig.type === 'conda'
                                    ? `conda (${currentConfig.condaEnv})`
                                    : 'System Python'}
                            </span>
                        </div>
                        <button
                            onClick={clearConfig}
                            disabled={saving}
                            className="text-xs text-red-400 hover:text-red-300"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PythonEnvSettings;
