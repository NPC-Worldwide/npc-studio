import React, { useEffect, useRef, memo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalView = ({ terminalId, currentPath }) => {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const isSessionReady = useRef(false);

  useEffect(() => {
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
      
      // Fit after opening
      setTimeout(() => fitAddon.fit(), 0);
      
      xtermInstance.current = term;
      
      term.attachCustomKeyEventHandler((event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
          navigator.clipboard.readText().then(text => {
            if (isSessionReady.current) {
              window.api.writeToTerminal({ 
                id: terminalId, 
                data: text 
              });
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
      
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        // Send new dimensions to backend
        if (isSessionReady.current) {
          window.api.resizeTerminal?.({
            id: terminalId,
            cols: term.cols,
            rows: term.rows
          });
        }
      });
      resizeObserver.observe(terminalRef.current);
    }

    let isEffectCancelled = false;
    isSessionReady.current = false;
    xtermInstance.current.clear();
    xtermInstance.current.write('Initializing session...\r\n');

    const dataCallback = (_, { id, data }) => {
      if (id === terminalId && !isEffectCancelled) {
        xtermInstance.current?.write(data);
      }
    };
    const closedCallback = (_, { id }) => {
      if (id === terminalId && !isEffectCancelled) {
        console.log(`[Frontend] EVENT: Backend confirmed session ${id} closed.`);
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
        console.log(`[Frontend] API: Requesting backend to create session ${terminalId}`);
        
        // Ensure terminal is properly sized before creating session
        fitAddonRef.current?.fit();
        
        const result = await window.api.createTerminalSession({ 
          id: terminalId, 
          cwd: currentPath,
          cols: xtermInstance.current.cols,
          rows: xtermInstance.current.rows
        });
        
        if (isEffectCancelled) {
            console.log(`[Frontend] Ignoring response for cancelled effect ${terminalId}`);
            return;
        }

        if (result.success) {
          console.log(`[Frontend] READY: Backend session for ${terminalId} is active.`);
          isSessionReady.current = true;
          xtermInstance.current.focus();
        } else {
          xtermInstance.current.write(`\r\n[FATAL] Backend failed: ${result.error}\r\n`);
        }
      } catch (err) {
        if (!isEffectCancelled) {
          xtermInstance.current.write(`\r\n[FATAL] IPC Error: ${err.message}\r\n`);
        }
      }
    };

    initBackendSession();

    return () => {
      console.log(`[Frontend] CLEANUP: Running for effect instance of ${terminalId}`);
      isEffectCancelled = true;
      
      inputHandler.dispose();
      removeDataListener();
      removeClosedListener();
      
      window.api.closeTerminalSession(terminalId);
    };
  }, [terminalId, currentPath]);

  return <div ref={terminalRef} className="w-full h-full" />;
};

export default memo(TerminalView);


const renderTerminalView = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: terminalId } = paneData;

    return (
        <div className="flex-1 flex flex-col theme-bg-secondary relative">
            {/* PaneHeader removed */}
            <div className="flex-1 overflow-hidden min-h-0">
                <TerminalView
                    terminalId={terminalId}
                    currentPath={currentPath}
                    isActive={activeContentPaneId === nodeId}
                />
            </div>
        </div>
    );
}, [contentDataRef, currentPath, activeContentPaneId]);
    const InPaneSearchBar = ({
        searchTerm,       
        onSearchTermChange,
        onNext,
        onPrevious,
        onClose,
        resultCount,
        currentIndex
    }) => {
        const inputRef = useRef(null);
       
        const [localInputTerm, setLocalInputTerm] = useState(searchTerm);
    
       
        useEffect(() => {
            if (inputRef.current) {
                inputRef.current.focus();
               
                inputRef.current.setSelectionRange(localInputTerm.length, localInputTerm.length);
            }
        }, [localInputTerm]);
    
       
        useEffect(() => {
            if (localInputTerm !== searchTerm) {
                setLocalInputTerm(searchTerm);
            }
        }, [searchTerm]);
    
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                    onPrevious();
                } else {
                    onNext();
                }
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };
    
        return (
            <div className="flex items-center gap-2 w-full theme-bg-tertiary p-2 rounded-lg">
                <input
                    ref={inputRef}
                    type="text"
                    value={localInputTerm}
                    onChange={(e) => {
                        setLocalInputTerm(e.target.value);
                        onSearchTermChange(e.target.value);
                    }}
                    className="flex-1 theme-input text-xs rounded px-3 py-2 border-0 focus:ring-1 focus:ring-blue-500"
                    placeholder="Search messages..."
                    onKeyDown={handleKeyDown}
                />
                <span className="text-xs theme-text-muted min-w-[60px] text-center">
                    {resultCount > 0 ? `${currentIndex + 1} of ${resultCount}` : 'No results'}
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={onPrevious} disabled={resultCount === 0} className="p-2 theme-hover rounded disabled:opacity-50" title="Previous (Shift+Enter)">
                        <ChevronLeft size={14} />
                    </button>
                    <button onClick={onNext} disabled={resultCount === 0} className="p-2 theme-hover rounded disabled:opacity-50" title="Next (Enter)">
                        <ChevronRight size={14} />
                    </button>
                    <button onClick={onClose} className="p-2 theme-hover rounded text-red-400" title="Close search (Escape)">
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    };    