import React, { useEffect, useRef, memo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalView = ({ terminalId, currentPath }) => {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null); // The xterm.js object
  const isSessionReady = useRef(false); // Flag for allowing input

  useEffect(() => {
    // --- SETUP: Create xterm.js UI instance ---
    // This part runs only once when the component first mounts.
    if (!xtermInstance.current) {
      console.log(`[Frontend] UI: Creating new xterm.js instance for ${terminalId}`);
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"Fira Code", monospace',
        fontSize: 14,
        theme: { background: '#1a1b26', foreground: '#c0caf5', cursor: '#c0caf5' },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      xtermInstance.current = term; // Store it
      
      // Attach a single, permanent resize observer
      const resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(terminalRef.current);
    }
    
    // --- LOGIC FOR A SINGLE SESSION LIFECYCLE ---
    let isEffectCancelled = false;
    isSessionReady.current = false; // Reset ready state on each effect run
    xtermInstance.current.clear(); // Clear the terminal for the new session
    xtermInstance.current.write('Initializing session...\r\n');

    // --- THIS IS THE KEY FIX ---
    // Listeners are now inside the effect and use the 'isEffectCancelled' flag.
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
    
    // Attach the "local" listeners
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
        const result = await window.api.createTerminalSession({ id: terminalId, cwd: currentPath });
        
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

    // The cleanup function for THIS specific effect run
    return () => {
      console.log(`[Frontend] CLEANUP: Running for effect instance of ${terminalId}`);
      isEffectCancelled = true;
      
      // Dispose of listeners created in this effect run
      inputHandler.dispose();
      removeDataListener();
      removeClosedListener();
      
      // Tell the backend to kill the PTY process tied to this effect run
      window.api.closeTerminalSession(terminalId);
    };
  }, [terminalId, currentPath]);

  return <div ref={terminalRef} className="w-full h-full" />;
};

export default memo(TerminalView);