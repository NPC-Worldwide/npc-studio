import React, { useState, useEffect } from 'react';
import Enpistu from './components/Enpistu';
import SetupWizard from './components/SetupWizard';

const App: React.FC = () => {
  const [showSetup, setShowSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const result = await (window as any).api?.setupCheckNeeded?.();
        setShowSetup(result?.needed ?? false);
      } catch (err) {
        console.error('Error checking setup:', err);
        setShowSetup(false);
      }
    };
    checkSetup();
  }, []);

  // Loading state while checking
  if (showSetup === null) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show setup wizard if needed
  if (showSetup) {
    return <SetupWizard onComplete={() => setShowSetup(false)} />;
  }

  return <Enpistu />;
};

export default App;
