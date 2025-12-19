import React, { useEffect, useRef, memo, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as TerminalIcon, Code, Sparkles } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

const SHELL_PROMPT_KEY = 'npc-studio-shell-profile-prompted';

const TerminalView = ({ nodeId, contentDataRef, currentPath, activeContentPaneId }) => {
    const terminalRef = useRef(null);
    const xtermInstance = useRef(null);
    const fitAddonRef = useRef(null);
    const isSessionReady = useRef(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [showShellPrompt, setShowShellPrompt] = useState(false);
    const [activeShell, setActiveShell] = useState<string>('system');
    const [pythonEnv, setPythonEnv] = useState<string | null>(null);

    const paneData = contentDataRef.current[nodeId];
    const terminalId = paneData?.contentId;
    const shellType = paneData?.shellType || 'system';

    const handleCopy = useCallback(() => {
        if (xtermInstance.current) {
            const selection = xtermInstance.current.getSelection();
            if (selection) {
                navigator.clipboard.writeText(selection);
            }
        }
        setContextMenu(null);
    }, []);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (isSessionReady.current && text) {
                window.api.writeToTerminal({ id: terminalId, data: text });
            }
        } catch (err) {
            console.error('Failed to paste:', err);
        }
        setContextMenu(null);
    }, [terminalId]);

    const handleClear = useCallback(() => {
        if (xtermInstance.current) {
            xtermInstance.current.clear();
        }
        setContextMenu(null);
    }, []);

    const handleSelectAll = useCallback(() => {
        if (xtermInstance.current) {
            xtermInstance.current.selectAll();
        }
        setContextMenu(null);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const getShellProfileCommand = useCallback(() => {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('mac')) {
            return 'source ~/.zshrc 2>/dev/null || source ~/.zprofile 2>/dev/null';
        } else {
            return 'source ~/.bashrc 2>/dev/null || source ~/.bash_profile 2>/dev/null';
        }
    }, []);

    const handleSourceProfile = useCallback(() => {
        if (isSessionReady.current && terminalId) {
            const cmd = getShellProfileCommand();
            window.api.writeToTerminal({ id: terminalId, data: cmd + '\n' });
        }
        localStorage.setItem(SHELL_PROMPT_KEY, 'true');
        setShowShellPrompt(false);
    }, [terminalId, getShellProfileCommand]);

    const handleDismissPrompt = useCallback(() => {
        localStorage.setItem(SHELL_PROMPT_KEY, 'true');
        setShowShellPrompt(false);
    }, []);

    useEffect(() => {
        if (!terminalRef.current || !terminalId) return;

        if (!xtermInstance.current) {
            const term = new Terminal({
                cursorBlink: true,
                fontFamily: '"Fira Code", monospace',
                fontSize: 14,
                theme: {
                    background: '#1a1b26',
                    foreground: '#c0caf5',
                    cursor: '#c0caf5'
                },
            });
            const fitAddon = new FitAddon();
            fitAddonRef.current = fitAddon;
            term.loadAddon(fitAddon);
            term.open(terminalRef.current);
            setTimeout(() => fitAddon.fit(), 0);
            xtermInstance.current = term;

            const resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
                if (isSessionReady.current) {
                    window.api.resizeTerminal?.({
                        id: terminalId,
                        cols: term.cols,
                        rows: term.rows
                    });
                }
            });
            resizeObserver.observe(terminalRef.current);

            term.attachCustomKeyEventHandler((event) => {
                // Ctrl+Shift+V or Ctrl+V for paste
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
                    navigator.clipboard.readText().then(text => {
                        if (isSessionReady.current) {
                            window.api.writeToTerminal({ id: terminalId, data: text });
                        }
                    });
                    return false;
                }
                // Ctrl+Shift+C for copy (terminal standard - doesn't interfere with SIGINT)
                if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                    }
                    return false;
                }
                // Ctrl+C without shift - copy only if selection exists, otherwise pass through for SIGINT
                if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'c') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                        return false;
                    }
                    // No selection - let Ctrl+C pass through as SIGINT
                }
                return true;
            });
        }

        let isEffectCancelled = false;
        isSessionReady.current = false;
        xtermInstance.current.clear();
        xtermInstance.current.write('Initializing session...\r\n');

        const dataCallback = (_, { id, data }) => {
            if (id === terminalId && !isEffectCancelled) xtermInstance.current?.write(data);
        };
        const closedCallback = (_, { id }) => {
            if (id === terminalId && !isEffectCancelled) {
                isSessionReady.current = false;
                xtermInstance.current?.write('\r\n[Session Closed]\r\n');
            }
        };

        const removeDataListener = window.api.onTerminalData(dataCallback);
        const removeClosedListener = window.api.onTerminalClosed(closedCallback);
        const inputHandler = xtermInstance.current.onData(input => {
            if (isSessionReady.current && !isEffectCancelled) {
                window.api.writeToTerminal({ id: terminalId, data: input });
            }
        });

        const initBackendSession = async () => {
            try {
                fitAddonRef.current?.fit();
                const result = await window.api.createTerminalSession({
                    id: terminalId,
                    cwd: currentPath,
                    cols: xtermInstance.current.cols,
                    rows: xtermInstance.current.rows,
                    shellType: shellType
                });
                if (isEffectCancelled) return;
                if (result.success) {
                    isSessionReady.current = true;
                    setActiveShell(result.shell || 'system');
                    if (activeContentPaneId === nodeId) {
                        xtermInstance.current.focus();
                    }
                    // Check if this is the first terminal startup
                    const hasBeenPrompted = localStorage.getItem(SHELL_PROMPT_KEY);
                    if (!hasBeenPrompted && result.shell === 'system') {
                        setShowShellPrompt(true);
                    }
                } else {
                    xtermInstance.current.write(`\r\n[FATAL] Backend failed: ${result.error}\r\n`);
                }
            } catch (err) {
                if (!isEffectCancelled) xtermInstance.current.write(`\r\n[FATAL] IPC Error: ${err.message}\r\n`);
            }
        };

        // Load Python environment info for display
        const loadPythonEnv = async () => {
            try {
                const envConfig = await (window as any).api?.pythonEnvGet?.(currentPath);
                if (envConfig) {
                    if (envConfig.type === 'venv' || envConfig.type === 'uv') {
                        setPythonEnv(`${envConfig.type}:${envConfig.venvPath || '.venv'}`);
                    } else if (envConfig.type === 'pyenv') {
                        setPythonEnv(`pyenv:${envConfig.pyenvVersion}`);
                    } else if (envConfig.type === 'conda') {
                        setPythonEnv(`conda:${envConfig.condaEnv}`);
                    } else if (envConfig.type === 'custom') {
                        setPythonEnv('custom');
                    }
                }
            } catch (e) {
                // No Python env configured
            }
        };

        initBackendSession();
        loadPythonEnv();

        return () => {
            isEffectCancelled = true;
            inputHandler.dispose();
            removeDataListener();
            removeClosedListener();
            window.api.closeTerminalSession(terminalId);
        };
    }, [terminalId, currentPath, shellType]);

    useEffect(() => {
        if (activeContentPaneId === nodeId && xtermInstance.current) {
            xtermInstance.current.focus();
        }
    }, [activeContentPaneId, nodeId]);

    if (!paneData) return null;

    return (
        <div
            className="flex-1 flex flex-col theme-bg-secondary relative h-full"
            onContextMenu={handleContextMenu}
            data-terminal="true"
        >
            <div ref={terminalRef} className="w-full h-full" data-terminal="true" />

            {contextMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setContextMenu(null)}
                    />
                    <div
                        className="fixed theme-bg-tertiary shadow-lg rounded-md py-1 z-50 min-w-[140px] border theme-border"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button
                            onClick={handleCopy}
                            className="w-full px-3 py-1.5 text-left text-sm theme-text hover:bg-blue-500/20"
                        >
                            Copy <span className="float-right text-xs opacity-50">Ctrl+Shift+C</span>
                        </button>
                        <button
                            onClick={handlePaste}
                            className="w-full px-3 py-1.5 text-left text-sm theme-text hover:bg-blue-500/20"
                        >
                            Paste <span className="float-right text-xs opacity-50">Ctrl+V</span>
                        </button>
                        <div className="border-t theme-border my-1" />
                        <button
                            onClick={handleSelectAll}
                            className="w-full px-3 py-1.5 text-left text-sm theme-text hover:bg-blue-500/20"
                        >
                            Select All
                        </button>
                        <button
                            onClick={handleClear}
                            className="w-full px-3 py-1.5 text-left text-sm theme-text hover:bg-blue-500/20"
                        >
                            Clear
                        </button>
                    </div>
                </>
            )}

            {showShellPrompt && (
                <div className="absolute top-0 left-0 right-0 bg-blue-900/90 border-b border-blue-700 px-3 py-2 z-30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-100">
                        <span className="text-blue-300">Tip:</span>
                        <span>Source your shell profile to load aliases and environment?</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSourceProfile}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
                        >
                            Source Profile
                        </button>
                        <button
                            onClick={handleDismissPrompt}
                            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Shell/Environment Indicator */}
            <div className="absolute bottom-1 left-1 flex items-center gap-2 z-20 pointer-events-none">
                {/* Shell Type Indicator */}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    activeShell === 'npcsh' ? 'bg-purple-600/80 text-purple-100' :
                    activeShell === 'guac' || activeShell === 'ipython' ? 'bg-yellow-600/80 text-yellow-100' :
                    'bg-gray-700/80 text-gray-300'
                }`}>
                    {activeShell === 'npcsh' ? (
                        <Sparkles size={12} />
                    ) : activeShell === 'guac' || activeShell === 'ipython' ? (
                        <Code size={12} />
                    ) : (
                        <TerminalIcon size={12} />
                    )}
                    <span>
                        {activeShell === 'npcsh' ? 'npcsh' :
                         activeShell === 'guac' || activeShell === 'ipython' ? 'guac' :
                         'shell'}
                    </span>
                </div>

                {/* Python Environment Indicator */}
                {pythonEnv && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-700/80 text-green-100">
                        <span className="opacity-70">py:</span>
                        <span>{pythonEnv}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(TerminalView);