import React, { useEffect, useRef, memo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TerminalView = ({ terminalId, currentPath }) => {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
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
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
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
    
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
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