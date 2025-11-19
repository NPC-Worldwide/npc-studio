import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import NpctsFullChat from './components/NpctsFullChat';

const App = () => {
  const [mode, setMode] = useState('new');

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setMode(prev => prev === 'old' ? 'new' : 'old');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <div className="absolute top-2 right-2 z-50 flex gap-2">
        <button
          onClick={() => setMode('old')}
          className={`px-3 py-1 rounded text-xs ${
            mode === 'old' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Old UI
        </button>
        <button
          onClick={() => setMode('new')}
          className={`px-3 py-1 rounded text-xs ${
            mode === 'new' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          New Full
        </button>
        <div className="text-xs text-gray-400 px-2 py-1">
          Ctrl+Shift+M to toggle
        </div>
      </div>

      {mode === 'old' ? <ChatInterface /> : <NpctsFullChat />}
    </div>
  );
};

export default App;
