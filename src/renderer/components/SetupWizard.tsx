import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Package, Check, AlertCircle, RefreshCw, ChevronRight, Sparkles, Cpu, Mic, Zap, Box } from 'lucide-react';

interface PythonInfo {
    name: string;
    cmd: string;
    version: string;
    path: string;
}

interface SetupWizardProps {
    onComplete: () => void;
}

interface InstallOption {
    id: string;
    name: string;
    description: string;
    extras: string;
    icon: React.ReactNode;
    recommended?: boolean;
}

const INSTALL_OPTIONS: InstallOption[] = [
    {
        id: 'lite',
        name: 'Lite',
        description: 'Minimal install - chat and basic features only',
        extras: 'lite',
        icon: <Zap size={20} className="text-yellow-400" />,
    },
    {
        id: 'local',
        name: 'Local AI',
        description: 'Local models with Ollama, image generation with diffusers/torch',
        extras: 'local',
        icon: <Cpu size={20} className="text-blue-400" />,
        recommended: true,
    },
    {
        id: 'yap',
        name: 'Voice (TTS/STT)',
        description: 'Text-to-speech and speech-to-text capabilities',
        extras: 'yap',
        icon: <Mic size={20} className="text-green-400" />,
    },
    {
        id: 'all',
        name: 'Everything',
        description: 'All features including local AI, voice, and extras',
        extras: 'all',
        icon: <Box size={20} className="text-purple-400" />,
    },
];

type SetupStep = 'welcome' | 'choose' | 'extras' | 'creating' | 'installing' | 'complete' | 'error';

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState<SetupStep>('welcome');
    const [detectedPythons, setDetectedPythons] = useState<PythonInfo[]>([]);
    const [selectedPython, setSelectedPython] = useState<PythonInfo | null>(null);
    const [selectedExtras, setSelectedExtras] = useState<string>('local');
    const [pythonPath, setPythonPath] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [installOutput, setInstallOutput] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [useNewVenv, setUseNewVenv] = useState(true);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll log container when new output arrives
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [installOutput]);

    useEffect(() => {
        // Detect available Python installations
        const detect = async () => {
            try {
                const result = await (window as any).api?.setupDetectPython?.();
                if (result?.pythons) {
                    setDetectedPythons(result.pythons);
                    if (result.pythons.length > 0) {
                        setSelectedPython(result.pythons[0]);
                    }
                }
            } catch (err) {
                console.error('Error detecting Python:', err);
            }
        };
        detect();
    }, []);

    // Listen for install progress updates
    useEffect(() => {
        const unsubscribe = (window as any).api?.onSetupInstallProgress?.((data: { type: string; text: string }) => {
            if (data.text) {
                // Filter out empty lines and progress bars that don't add info
                const lines = data.text.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    setInstallOutput(prev => [...prev, ...lines].slice(-100)); // Keep last 100 lines
                }
            }
        });
        return () => unsubscribe?.();
    }, []);

    // After choosing Python, go to extras selection
    const handlePythonChoice = (createNew: boolean, python?: PythonInfo) => {
        setUseNewVenv(createNew);
        if (!createNew && python) {
            setSelectedPython(python);
        }
        setStep('extras');
    };

    // Start installation with selected extras
    const handleStartInstall = async () => {
        setError(null);
        setInstallOutput([]);

        if (useNewVenv) {
            // Create new venv first
            setStep('creating');
            setInstallOutput(['Creating virtual environment at ~/.npcsh/incognide/venv...']);

            try {
                const result = await (window as any).api?.setupCreateVenv?.();
                if (!result?.success) {
                    throw new Error(result?.error || 'Failed to create virtual environment');
                }

                setInstallOutput(prev => [...prev, result.message || 'Virtual environment created']);
                setPythonPath(result.pythonPath);
                await installNpcpy(result.pythonPath);
            } catch (err: any) {
                setError(err.message);
                setStep('error');
            }
        } else if (selectedPython) {
            setPythonPath(selectedPython.path);
            await installNpcpy(selectedPython.path);
        } else {
            setError('No Python selected');
            setStep('error');
        }
    };

    const installNpcpy = async (path: string) => {
        setStep('installing');
        const packageSpec = `npcpy[${selectedExtras}]`;
        setInstallOutput(prev => [...prev, `Installing ${packageSpec}...`]);
        setInstallOutput(prev => [...prev, 'This may take several minutes depending on your selection...']);

        try {
            const result = await (window as any).api?.setupInstallNpcpy?.(path, selectedExtras);
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to install npcpy');
            }

            setInstallOutput(prev => [...prev, `${packageSpec} installed successfully!`]);
            await completeSetup(path);
        } catch (err: any) {
            setError(err.message);
            setStep('error');
        }
    };

    const completeSetup = async (path: string) => {
        setInstallOutput(prev => [...prev, 'Saving configuration...']);

        try {
            const result = await (window as any).api?.setupComplete?.(path);
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to complete setup');
            }

            setInstallOutput(prev => [...prev, 'Starting backend...']);

            // Restart backend with new Python
            const restartResult = await (window as any).api?.setupRestartBackend?.();
            if (!restartResult?.success) {
                // Not fatal - backend might start on next app launch
                setInstallOutput(prev => [...prev, 'Note: Backend will start on next app launch']);
            } else {
                setInstallOutput(prev => [...prev, 'Backend started successfully!']);
            }

            setStep('complete');
        } catch (err: any) {
            setError(err.message);
            setStep('error');
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            await (window as any).api?.setupSkip?.();
            onComplete();
        } catch (err) {
            console.error('Error skipping setup:', err);
            onComplete();
        }
    };

    const renderWelcome = () => (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Welcome to Incognide</h1>
                <p className="text-gray-400">Let's set up your Python environment</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-300">
                    Incognide uses Python for AI features like image generation, chat, and more.
                    We'll help you set up a dedicated Python environment with all the necessary packages.
                </p>
                <div className="flex items-start gap-2 text-sm text-blue-400">
                    <Package size={16} className="mt-0.5 flex-shrink-0" />
                    <span>This will install npcpy and its dependencies</span>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                    Get Started <ChevronRight size={18} />
                </button>
            </div>

            <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-400"
            >
                Skip for now (features will be limited)
            </button>
        </div>
    );

    const renderChoose = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Choose Python Setup</h2>
                <p className="text-gray-400 text-sm">Select how you want to configure Python</p>
            </div>

            {/* Option 1: Create new venv (recommended) */}
            <button
                onClick={() => handlePythonChoice(true)}
                className="w-full p-4 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 rounded-lg text-left"
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Terminal size={20} className="text-white" />
                    </div>
                    <div>
                        <div className="font-medium text-white">Create New Environment (Recommended)</div>
                        <div className="text-sm text-gray-400 mt-1">
                            Creates a dedicated virtual environment at ~/.npcsh/incognide/venv
                        </div>
                    </div>
                </div>
            </button>

            {/* Option 2: Use existing Python */}
            <div className="space-y-3">
                <div className="text-sm text-gray-400">Or use an existing Python installation:</div>

                {detectedPythons.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-800/50 rounded-lg">
                        No Python installations detected
                    </div>
                ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {detectedPythons.map((python, idx) => (
                            <button
                                key={idx}
                                onClick={() => handlePythonChoice(false, python)}
                                className="w-full p-3 rounded-lg text-left border border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-white">{python.name}</div>
                                        <div className="text-xs text-gray-500">{python.version}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => setStep('welcome')}
                className="w-full text-sm text-gray-500 hover:text-gray-400"
            >
                Back
            </button>
        </div>
    );

    const renderExtras = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Choose Features</h2>
                <p className="text-gray-400 text-sm">Select which capabilities to install</p>
            </div>

            <div className="space-y-3">
                {INSTALL_OPTIONS.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedExtras(option.extras)}
                        className={`w-full p-4 rounded-lg text-left border transition-all ${
                            selectedExtras === option.extras
                                ? 'border-blue-500/50 bg-blue-600/20'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{option.name}</span>
                                    {option.recommended && (
                                        <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">Recommended</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                            </div>
                            {selectedExtras === option.extras && (
                                <Check size={20} className="text-blue-400 flex-shrink-0" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                    Back
                </button>
                <button
                    onClick={handleStartInstall}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                    Install <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderInstalling = () => (
        <div className="space-y-4">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-blue-600 rounded-xl flex items-center justify-center">
                    <RefreshCw size={24} className="text-white animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">
                    {step === 'creating' ? 'Creating Environment' : 'Installing Packages'}
                </h2>
                <p className="text-gray-400 text-xs">This may take several minutes for large packages...</p>
            </div>

            <div
                ref={logContainerRef}
                className="bg-gray-900 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs"
            >
                {installOutput.length === 0 ? (
                    <div className="text-gray-500">Waiting for output...</div>
                ) : (
                    installOutput.map((line, idx) => (
                        <div key={idx} className="text-gray-400 whitespace-pre-wrap break-all">{line}</div>
                    ))
                )}
            </div>
        </div>
    );

    const renderComplete = () => (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-2xl flex items-center justify-center">
                    <Check size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Setup Complete!</h2>
                <p className="text-gray-400 text-sm">Your Python environment is ready</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                    <Check size={14} />
                    <span>Virtual environment created</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                    <Check size={14} />
                    <span>npcpy installed</span>
                </div>
                <div className="flex items-center gap-2 text-green-400">
                    <Check size={14} />
                    <span>Backend configured</span>
                </div>
            </div>

            <button
                onClick={onComplete}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
                Start Using Incognide
            </button>
        </div>
    );

    const renderError = () => (
        <div className="space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-600 rounded-2xl flex items-center justify-center">
                    <AlertCircle size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Setup Failed</h2>
                <p className="text-gray-400 text-sm">Something went wrong</p>
            </div>

            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <p className="text-sm text-red-400">{error}</p>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                    Try Again
                </button>
                <button
                    onClick={handleSkip}
                    className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
                >
                    Skip Setup
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-gray-900 flex items-center justify-center p-4 z-[9999] overflow-auto">
            <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl my-auto">
                {step === 'welcome' && renderWelcome()}
                {step === 'choose' && renderChoose()}
                {step === 'extras' && renderExtras()}
                {(step === 'creating' || step === 'installing') && renderInstalling()}
                {step === 'complete' && renderComplete()}
                {step === 'error' && renderError()}
            </div>
        </div>
    );
};

export default SetupWizard;
