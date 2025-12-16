import React, { useEffect, useRef, memo, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalView = ({ nodeId, contentDataRef, currentPath, activeContentPaneId }) => {
    const terminalRef = useRef(null);
    const xtermInstance = useRef(null);
    const fitAddonRef = useRef(null);
    const isSessionReady = useRef(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const paneData = contentDataRef.current[nodeId];
    const terminalId = paneData?.contentId;

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
                if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                    navigator.clipboard.readText().then(text => {
                        if (isSessionReady.current) {
                            window.api.writeToTerminal({ id: terminalId, data: text });
                        }
                    });
                    return false;
                }
                if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                        return false;
                    }
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
                    rows: xtermInstance.current.rows
                });
                if (isEffectCancelled) return;
                if (result.success) {
                    isSessionReady.current = true;
                    if (activeContentPaneId === nodeId) {
                        xtermInstance.current.focus();
                    }
                } else {
                    xtermInstance.current.write(`\r\n[FATAL] Backend failed: ${result.error}\r\n`);
                }
            } catch (err) {
                if (!isEffectCancelled) xtermInstance.current.write(`\r\n[FATAL] IPC Error: ${err.message}\r\n`);
            }
        };

        initBackendSession();

        return () => {
            isEffectCancelled = true;
            inputHandler.dispose();
            removeDataListener();
            removeClosedListener();
            window.api.closeTerminalSession(terminalId);
        };
    }, [terminalId, currentPath]);

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
        >
            <div ref={terminalRef} className="w-full h-full" />

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
                            Copy <span className="float-right text-xs opacity-50">Ctrl+C</span>
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
        </div>
    );
};

export default memo(TerminalView);