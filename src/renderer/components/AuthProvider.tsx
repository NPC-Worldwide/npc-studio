import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Clerk configuration - keys should be fetched from environment or config
// These are placeholder values - in production, use your actual Clerk keys
const CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsuaW5jb2duaWRlLmNvbSQ'; // Will be configured

// API base URL for incognide backend
const API_BASE_URL = 'https://app.incognide.com';

// Auth types
interface User {
    id: string;
    email: string;
    name: string;
    profilePicture?: string;
    isPremium: boolean;
    storageUsedBytes: number;
    storageLimitBytes: number;
}

interface Device {
    id: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
    lastSeen: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    device: Device | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    device: null,
    isAuthenticated: false,
    isLoading: true,
    signIn: async () => {},
    signOut: async () => {},
    refreshUser: async () => {},
    error: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

// Local storage keys
const AUTH_TOKEN_KEY = 'incognide-auth-token';
const USER_DATA_KEY = 'incognide-user-data';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [device, setDevice] = useState<Device | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load stored user data on mount
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                // Check for stored token
                const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
                const storedUserData = localStorage.getItem(USER_DATA_KEY);

                if (storedToken && storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    setUser(userData);

                    // Validate token with backend
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                            headers: {
                                'Authorization': `Bearer ${storedToken}`
                            }
                        });

                        if (response.ok) {
                            const freshUserData = await response.json();
                            setUser(freshUserData);
                            localStorage.setItem(USER_DATA_KEY, JSON.stringify(freshUserData));
                        } else if (response.status === 401) {
                            // Token expired, clear auth
                            localStorage.removeItem(AUTH_TOKEN_KEY);
                            localStorage.removeItem(USER_DATA_KEY);
                            setUser(null);
                        }
                    } catch (e) {
                        console.warn('[AUTH] Failed to validate token, using cached data:', e);
                        // Continue with cached data if offline
                    }
                }

                // Load device info
                const deviceInfo = await (window as any).api?.getDeviceInfo?.();
                if (deviceInfo) {
                    setDevice({
                        id: deviceInfo.deviceId,
                        deviceId: deviceInfo.deviceId,
                        deviceName: deviceInfo.deviceName,
                        deviceType: deviceInfo.deviceType,
                        lastSeen: new Date().toISOString(),
                        createdAt: deviceInfo.createdAt
                    });
                }
            } catch (e) {
                console.error('[AUTH] Error loading stored auth:', e);
                setError('Failed to load authentication');
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredAuth();
    }, []);

    // Sign in - opens Clerk auth flow
    const signIn = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // For Electron, we'll use a popup window approach for OAuth
            // This is a simplified implementation - in production, use Clerk's SDK
            const authWindow = window.open(
                `${API_BASE_URL}/auth/login?redirect=${encodeURIComponent('incognide://auth/callback')}`,
                'incognide-auth',
                'width=500,height=600,menubar=no,toolbar=no,location=no'
            );

            // Listen for auth callback
            const handleAuthCallback = (event: MessageEvent) => {
                if (event.origin !== API_BASE_URL) return;

                if (event.data?.type === 'AUTH_SUCCESS') {
                    const { token, user: userData } = event.data;
                    localStorage.setItem(AUTH_TOKEN_KEY, token);
                    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
                    setUser(userData);

                    // Register device with backend
                    registerDevice(token);

                    authWindow?.close();
                }

                if (event.data?.type === 'AUTH_ERROR') {
                    setError(event.data.error || 'Authentication failed');
                    authWindow?.close();
                }
            };

            window.addEventListener('message', handleAuthCallback);

            // Clean up listener after timeout or window close
            const cleanup = () => {
                window.removeEventListener('message', handleAuthCallback);
                setIsLoading(false);
            };

            // Poll for window close
            const checkClosed = setInterval(() => {
                if (authWindow?.closed) {
                    clearInterval(checkClosed);
                    cleanup();
                }
            }, 500);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkClosed);
                cleanup();
                authWindow?.close();
            }, 300000);

        } catch (e: any) {
            setError(e.message || 'Failed to sign in');
            setIsLoading(false);
        }
    }, []);

    // Register device with backend
    const registerDevice = useCallback(async (token: string) => {
        try {
            const deviceInfo = await (window as any).api?.getDeviceInfo?.();
            if (!deviceInfo) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/device`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device_id: deviceInfo.deviceId,
                    device_name: deviceInfo.deviceName,
                    device_type: deviceInfo.deviceType
                })
            });

            if (response.ok) {
                const registeredDevice = await response.json();
                setDevice(registeredDevice);
                console.log('[AUTH] Device registered:', registeredDevice);
            }
        } catch (e) {
            console.error('[AUTH] Failed to register device:', e);
        }
    }, []);

    // Sign out
    const signOut = useCallback(async () => {
        setIsLoading(true);

        try {
            // Clear local storage
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_DATA_KEY);
            setUser(null);

            // Note: Device info is preserved - user data stays local even when signed out
        } catch (e: any) {
            setError(e.message || 'Failed to sign out');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh user data
    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            }
        } catch (e) {
            console.error('[AUTH] Failed to refresh user:', e);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                device,
                isAuthenticated: !!user,
                isLoading,
                signIn,
                signOut,
                refreshUser,
                error
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
