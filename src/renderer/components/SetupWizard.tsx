import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Package, Check, AlertCircle, RefreshCw, ChevronRight, Sparkles, Cpu, Mic, Zap, Box, Wand2, Bot, ChevronLeft, Info, Server, HardDrive, X } from 'lucide-react';

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

interface NPCAgent {
    id: string;
    name: string;
    description: string;
    color: string;
    imagePath: string;
    jinxs: string[];
}

// NPC team agents with their descriptions
const NPC_AGENTS: NPCAgent[] = [
    {
        id: 'sibiji',
        name: 'Sibiji',
        description: 'The orchestrator and general manager. Delegates tasks to specialist agents based on their expertise.',
        color: 'rgb(148,0,211)',
        imagePath: 'sibiji.png',
        jinxs: ['delegate', 'convene', 'sh', 'python', 'search']
    },
    {
        id: 'corca',
        name: 'Corca',
        description: 'Software development specialist. Expert in writing, reviewing, and debugging code with focus on simplicity and clarity.',
        color: 'rgb(64,224,208)',
        imagePath: 'corca.png',
        jinxs: ['sh', 'python', 'edit_file', 'load_file', 'search']
    },
    {
        id: 'plonk',
        name: 'Plonk',
        description: 'Browser and GUI automation specialist. Controls browsers, takes screenshots, and automates desktop interactions.',
        color: 'rgb(34,139,34)',
        imagePath: 'plonk.png',
        jinxs: ['browser', 'computer_use', 'sh', 'python']
    },
    {
        id: 'guac',
        name: 'Guac',
        description: 'Data analysis and visualization specialist. Creates charts, processes data, and generates insights.',
        color: 'rgb(50,205,50)',
        imagePath: 'guac.png',
        jinxs: ['data', 'charts', 'python']
    },
    {
        id: 'alicanto',
        name: 'Alicanto',
        description: 'Research and information gathering specialist. Searches the web and compiles comprehensive research.',
        color: 'rgb(255,215,0)',
        imagePath: 'alicanto.png',
        jinxs: ['search', 'web', 'summarize']
    },
    {
        id: 'yap',
        name: 'Yap',
        description: 'Voice and audio specialist. Handles text-to-speech, speech-to-text, and audio processing.',
        color: 'rgb(255,105,180)',
        imagePath: 'yap.png',
        jinxs: ['tts', 'stt', 'audio']
    }
];

interface ModelInfo {
    provider: string;
    models: string[];
    available: boolean;
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

type SetupStep = 'welcome' | 'concepts' | 'agents' | 'choose' | 'extras' | 'models' | 'creating' | 'installing' | 'complete' | 'error';

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
    const [selectedAgent, setSelectedAgent] = useState<NPCAgent | null>(null);
    const [npcImagesPath, setNpcImagesPath] = useState<string>('');
    const [detectedModels, setDetectedModels] = useState<ModelInfo[]>([]);
    const [checkingModels, setCheckingModels] = useState(false);
    const [platform, setPlatform] = useState<string>('');
    const [homebrewAvailable, setHomebrewAvailable] = useState(false);
    const [xcodeAvailable, setXcodeAvailable] = useState(false);
    const [installingOllama, setInstallingOllama] = useState(false);
    const [installingHomebrew, setInstallingHomebrew] = useState(false);
    const [installingXcode, setInstallingXcode] = useState(false);
    const [installError, setInstallError] = useState<string | null>(null);
    const [installMessage, setInstallMessage] = useState<string | null>(null);

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

    // Get NPC images path
    useEffect(() => {
        const getPath = async () => {
            try {
                const path = await (window as any).api?.getNpcImagesPath?.();
                if (path) {
                    setNpcImagesPath(path);
                }
            } catch (err) {
                console.error('Error getting NPC images path:', err);
            }
        };
        getPath();
    }, []);

    // Check platform, homebrew, and xcode on mount
    useEffect(() => {
        const checkPlatformAndTools = async () => {
            try {
                const platformResult = await (window as any).api?.getPlatform?.();
                if (platformResult?.platform) {
                    setPlatform(platformResult.platform);
                }
                const brewResult = await (window as any).api?.checkHomebrew?.();
                if (brewResult?.available) {
                    setHomebrewAvailable(true);
                }
                const xcodeResult = await (window as any).api?.checkXcode?.();
                if (xcodeResult?.available) {
                    setXcodeAvailable(true);
                }
            } catch (err) {
                console.error('Error checking platform/tools:', err);
            }
        };
        checkPlatformAndTools();
    }, []);

    // Check for available local models
    const checkLocalModels = async () => {
        setCheckingModels(true);
        setInstallError(null);
        try {
            const result = await (window as any).api?.detectLocalModels?.();
            if (result?.models) {
                setDetectedModels(result.models);
            }
        } catch (err) {
            console.error('Error detecting models:', err);
        }
        setCheckingModels(false);
    };

    // Install Ollama (opens download page on Mac/Windows, auto-installs on Linux)
    const handleInstallOllama = async (method?: string) => {
        setInstallingOllama(true);
        setInstallError(null);
        setInstallMessage(null);
        try {
            const result = await (window as any).api?.installOllama?.(method);
            if (result?.success) {
                // Refresh model detection
                await checkLocalModels();
                setInstallMessage(result.message);
            } else if (result?.openDownload) {
                // Open download page (Mac/Windows)
                (window as any).api?.openExternal?.(result.downloadUrl);
                setInstallMessage(result.message || 'Download page opened. Install Ollama, then click Refresh.');
            } else if (result?.needsBrew) {
                setInstallError('Homebrew is required for brew install. Use the download option instead.');
            } else {
                setInstallError(result?.error || 'Failed to install Ollama');
            }
        } catch (err: any) {
            setInstallError(err.message || 'Failed to install Ollama');
        }
        setInstallingOllama(false);
    };

    // Install Xcode CLT (Mac only)
    const handleInstallXcode = async () => {
        setInstallingXcode(true);
        setInstallError(null);
        try {
            const result = await (window as any).api?.installXcode?.();
            if (result?.success) {
                setInstallMessage(result.message);
            } else {
                setInstallError(result?.error || 'Failed to open Xcode installer');
            }
        } catch (err: any) {
            setInstallError(err.message || 'Failed to install Xcode');
        }
        setInstallingXcode(false);
    };

    // Install Homebrew (Mac only)
    const handleInstallHomebrew = async () => {
        setInstallingHomebrew(true);
        setInstallError(null);
        try {
            const result = await (window as any).api?.installHomebrew?.();
            if (result?.success) {
                setHomebrewAvailable(true);
            } else {
                setInstallError(result?.error || 'Failed to install Homebrew');
            }
        } catch (err: any) {
            setInstallError(err.message || 'Failed to install Homebrew');
        }
        setInstallingHomebrew(false);
    };

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

    // Go to models step (check local models before install)
    const handleGoToModels = async () => {
        setStep('models');
        await checkLocalModels();
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
                <p className="text-gray-400">Let's set up your environment</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-300">
                    Incognide uses Python for features like image generation, chat, and more.
                    We'll help you set up a dedicated Python environment with all the necessary packages.
                </p>
                <div className="flex items-start gap-2 text-sm text-blue-400">
                    <Package size={16} className="mt-0.5 flex-shrink-0" />
                    <span>This will install npcpy and its dependencies</span>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('concepts')}
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

    const renderConcepts = () => (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Core Concepts</h2>
                <p className="text-gray-400 text-sm">NPCs and Jinxs</p>
            </div>

            {/* NPCs explanation */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Bot size={20} className="text-purple-400" />
                    <h3 className="font-semibold text-white">NPCs (Personas)</h3>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                    NPCs are agent personas - each with a specific role, personality, and set of jinxs they can execute.
                </p>
                <ul className="text-sm text-gray-400 space-y-1 ml-4">
                    <li>• Use NPCs in chats or as autonomous agents</li>
                    <li>• Each NPC has different jinxs available</li>
                    <li>• Create your own custom NPCs</li>
                </ul>
            </div>

            {/* Jinxs explanation */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Wand2 size={20} className="text-green-400" />
                    <h3 className="font-semibold text-white">Jinxs (Execution Templates)</h3>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                    Jinxs are execution templates that define what actions NPCs can perform:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 ml-4">
                    <li>• <span className="text-green-300">sh</span> - run shell commands</li>
                    <li>• <span className="text-green-300">python</span> - execute Python code</li>
                    <li>• <span className="text-green-300">browser</span> - control a web browser</li>
                    <li>• <span className="text-green-300">search</span> - search the web</li>
                </ul>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('welcome')}
                    className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <button
                    onClick={() => setStep('agents')}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                    Meet the NPCs <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderAgents = () => (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Available NPCs</h2>
                <p className="text-gray-400 text-sm">Click to learn more about each</p>
            </div>

            {/* Agent modal */}
            {selectedAgent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgent(null)}>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {npcImagesPath ? (
                                    <img
                                        src={`file://${npcImagesPath}/${selectedAgent.imagePath}`}
                                        alt={selectedAgent.name}
                                        className="w-14 h-14 rounded-xl object-cover"
                                        style={{ borderColor: selectedAgent.color, borderWidth: 2 }}
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedAgent.color }}>
                                        <Bot size={28} className="text-white" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-white text-lg">{selectedAgent.name}</h3>
                                    <p className="text-xs text-gray-400">NPC</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAgent(null)} className="text-gray-500 hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-300 mb-4">{selectedAgent.description}</p>
                        <div>
                            <div className="text-xs text-gray-500 mb-2 font-medium">Available Jinxs:</div>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedAgent.jinxs.map(jinx => (
                                    <span key={jinx} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                        {jinx}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Agent grid */}
            <div className="grid grid-cols-3 gap-3">
                {NPC_AGENTS.map(agent => (
                    <button
                        key={agent.id}
                        onClick={() => setSelectedAgent(agent)}
                        className="p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 transition-all text-center"
                    >
                        {npcImagesPath ? (
                            <img
                                src={`file://${npcImagesPath}/${agent.imagePath}`}
                                alt={agent.name}
                                className="w-12 h-12 mx-auto rounded-lg object-cover mb-2"
                                style={{ borderColor: agent.color, borderWidth: 2 }}
                            />
                        ) : (
                            <div
                                className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2"
                                style={{ backgroundColor: agent.color }}
                            >
                                <Bot size={24} className="text-white" />
                            </div>
                        )}
                        <div className="text-sm font-medium text-white">{agent.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{agent.jinxs.slice(0, 2).join(', ')}</div>
                    </button>
                ))}
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400">
                <Info size={12} className="inline mr-1" />
                Select an NPC in a chat pane to use their persona and jinxs.
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('concepts')}
                    className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                    Setup Python <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderModels = () => (
        <div className="space-y-5">
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Local Models</h2>
                <p className="text-gray-400 text-sm">Run AI models on your machine</p>
            </div>

            {checkingModels ? (
                <div className="text-center py-8">
                    <RefreshCw size={24} className="animate-spin mx-auto text-blue-400 mb-3" />
                    <p className="text-sm text-gray-400">Checking for local model providers...</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {/* Ollama */}
                        <div className={`p-3 rounded-lg border ${detectedModels.find(m => m.provider === 'ollama')?.available ? 'border-green-500/50 bg-green-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Server size={18} className={detectedModels.find(m => m.provider === 'ollama')?.available ? 'text-green-400' : 'text-gray-500'} />
                                    <span className="font-medium text-white">Ollama</span>
                                </div>
                                {detectedModels.find(m => m.provider === 'ollama')?.available ? (
                                    <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">Detected</span>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleInstallOllama()}
                                            disabled={installingOllama}
                                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-0.5 rounded flex items-center gap-1"
                                        >
                                            {installingOllama ? (
                                                <><RefreshCw size={10} className="animate-spin" /> ...</>
                                            ) : (
                                                'Download'
                                            )}
                                        </button>
                                        {platform === 'darwin' && homebrewAvailable && (
                                            <button
                                                onClick={() => handleInstallOllama('brew')}
                                                disabled={installingOllama}
                                                className="text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-2 py-0.5 rounded"
                                                title="Install via Homebrew"
                                            >
                                                brew
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">Easy-to-use local model server</p>
                            {detectedModels.find(m => m.provider === 'ollama')?.models?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {detectedModels.find(m => m.provider === 'ollama')?.models.slice(0, 4).map(model => (
                                        <span key={model} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{model}</span>
                                    ))}
                                    {(detectedModels.find(m => m.provider === 'ollama')?.models.length || 0) > 4 && (
                                        <span className="text-[10px] text-gray-500">+{(detectedModels.find(m => m.provider === 'ollama')?.models.length || 0) - 4} more</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* LM Studio */}
                        <div className={`p-3 rounded-lg border ${detectedModels.find(m => m.provider === 'lmstudio')?.available ? 'border-green-500/50 bg-green-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <HardDrive size={18} className={detectedModels.find(m => m.provider === 'lmstudio')?.available ? 'text-green-400' : 'text-gray-500'} />
                                    <span className="font-medium text-white">LM Studio</span>
                                </div>
                                {detectedModels.find(m => m.provider === 'lmstudio')?.available ? (
                                    <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">Detected</span>
                                ) : (
                                    <span className="text-xs text-gray-500">Not found</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">GUI for running GGUF models</p>
                        </div>

                        {/* llama.cpp */}
                        <div className={`p-3 rounded-lg border ${detectedModels.find(m => m.provider === 'llamacpp')?.available ? 'border-green-500/50 bg-green-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Cpu size={18} className={detectedModels.find(m => m.provider === 'llamacpp')?.available ? 'text-green-400' : 'text-gray-500'} />
                                    <span className="font-medium text-white">llama.cpp</span>
                                </div>
                                {detectedModels.find(m => m.provider === 'llamacpp')?.available ? (
                                    <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">Detected</span>
                                ) : (
                                    <span className="text-xs text-gray-500">Not found</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">Efficient C++ inference engine</p>
                        </div>
                    </div>

                    {/* Xcode CLT recommendation for Mac */}
                    {platform === 'darwin' && !xcodeAvailable && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-blue-300 font-medium">Xcode Command Line Tools</p>
                                <button
                                    onClick={handleInstallXcode}
                                    disabled={installingXcode}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-2 py-0.5 rounded flex items-center gap-1"
                                >
                                    {installingXcode ? 'Opening...' : 'Install'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                Recommended for development tools and compiling packages.
                            </p>
                        </div>
                    )}

                    {/* Homebrew notice for Mac */}
                    {platform === 'darwin' && !homebrewAvailable && (
                        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-gray-300 font-medium">Homebrew (optional)</p>
                                <button
                                    onClick={handleInstallHomebrew}
                                    disabled={installingHomebrew}
                                    className="text-xs bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-2 py-0.5 rounded flex items-center gap-1"
                                >
                                    {installingHomebrew ? (
                                        <><RefreshCw size={10} className="animate-spin" /> Installing...</>
                                    ) : (
                                        'Install'
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Package manager for macOS. Enables "brew" install option.
                            </p>
                        </div>
                    )}

                    {/* Install message */}
                    {installMessage && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-300">{installMessage}</p>
                        </div>
                    )}

                    {/* Install error */}
                    {installError && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                            <p className="text-xs text-red-300">{installError}</p>
                        </div>
                    )}

                    {!detectedModels.some(m => m.available) && !installError && !installMessage && (
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-xs text-yellow-300 mb-2">No local model providers detected.</p>
                            <p className="text-xs text-gray-400">
                                Click "Download" to get Ollama, or use cloud APIs (OpenAI, Anthropic, etc.).
                            </p>
                        </div>
                    )}

                    <button
                        onClick={checkLocalModels}
                        className="w-full py-2 text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} /> Refresh detection
                    </button>
                </>
            )}

            <div className="flex gap-3">
                <button
                    onClick={() => setStep('extras')}
                    className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> Back
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
                onClick={() => setStep('agents')}
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
                    onClick={handleGoToModels}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                    Next <ChevronRight size={18} />
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
                {step === 'concepts' && renderConcepts()}
                {step === 'agents' && renderAgents()}
                {step === 'choose' && renderChoose()}
                {step === 'extras' && renderExtras()}
                {step === 'models' && renderModels()}
                {(step === 'creating' || step === 'installing') && renderInstalling()}
                {step === 'complete' && renderComplete()}
                {step === 'error' && renderError()}
            </div>
        </div>
    );
};

export default SetupWizard;
