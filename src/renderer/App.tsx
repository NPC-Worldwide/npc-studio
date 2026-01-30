import React, { useState, useEffect } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import Enpistu from './components/Enpistu';
import SetupWizard from './components/SetupWizard';
import { AuthProvider } from './components/AuthProvider';

// Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ClerkProvider>
  );
};

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
    return (
      <AuthWrapper>
        <SetupWizard onComplete={() => setShowSetup(false)} />
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Enpistu />
    </AuthWrapper>
  );
};

export default App;
