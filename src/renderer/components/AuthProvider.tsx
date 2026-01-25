import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { deriveKey, setEncryptionKey, clearEncryptionKey, hasEncryptionKey } from '../utils/encryption';

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
    isEncryptionReady: boolean;  // True when encryption key is derived and ready for sync
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    device: null,
    isAuthenticated: false,
    isLoading: true,
    isEncryptionReady: false,
    signIn: async () => ({ success: false }),
    signUp: async () => ({ success: false }),
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
const ENCRYPTION_SALT_KEY = 'incognide-encryption-salt';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [device, setDevice] = useState<Device | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEncryptionReady, setIsEncryptionReady] = useState(false);
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

                    // Validate token with backend (if online)
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

    // Helper to safely parse JSON response
    const safeJsonParse = async (response: Response): Promise<any> => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Auth service unavailable. Please try again later.');
        }
        return response.json();
    };

    // Sign in with email/password
    const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setError(null);
        setIsEncryptionReady(false);

        try {
            const deviceInfo = await (window as any).api?.getDeviceInfo?.();

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    device_id: deviceInfo?.deviceId,
                    device_name: deviceInfo?.deviceName,
                    device_type: deviceInfo?.deviceType
                })
            });

            const data = await safeJsonParse(response);

            if (!response.ok) {
                setError(data.error || 'Sign in failed');
                return { success: false, error: data.error || 'Sign in failed' };
            }

            // Store token and user data
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
            setUser(data.user);

            // Derive and store encryption key for E2E sync
            if (data.encryptionSalt) {
                try {
                    localStorage.setItem(ENCRYPTION_SALT_KEY, data.encryptionSalt);
                    const encryptionKey = await deriveKey(password, data.encryptionSalt);
                    setEncryptionKey(encryptionKey);
                    setIsEncryptionReady(true);
                    console.log('[AUTH] Encryption key derived successfully');
                } catch (encErr) {
                    console.error('[AUTH] Failed to derive encryption key:', encErr);
                    // Sign-in still succeeds, but sync won't work
                }
            }

            console.log('[AUTH] Sign in successful');
            return { success: true };

        } catch (e: any) {
            const errorMsg = e.message || 'Failed to sign in';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Sign up with email/password
    const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setError(null);
        setIsEncryptionReady(false);

        try {
            const deviceInfo = await (window as any).api?.getDeviceInfo?.();

            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    name,
                    device_id: deviceInfo?.deviceId,
                    device_name: deviceInfo?.deviceName,
                    device_type: deviceInfo?.deviceType
                })
            });

            const data = await safeJsonParse(response);

            if (!response.ok) {
                setError(data.error || 'Sign up failed');
                return { success: false, error: data.error || 'Sign up failed' };
            }

            // Store token and user data
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(data.user));
            setUser(data.user);

            // Derive and store encryption key for E2E sync
            if (data.encryptionSalt) {
                try {
                    localStorage.setItem(ENCRYPTION_SALT_KEY, data.encryptionSalt);
                    const encryptionKey = await deriveKey(password, data.encryptionSalt);
                    setEncryptionKey(encryptionKey);
                    setIsEncryptionReady(true);
                    console.log('[AUTH] Encryption key derived successfully');
                } catch (encErr) {
                    console.error('[AUTH] Failed to derive encryption key:', encErr);
                }
            }

            console.log('[AUTH] Sign up successful');
            return { success: true };

        } catch (e: any) {
            const errorMsg = e.message || 'Failed to sign up';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Sign out
    const signOut = useCallback(async () => {
        setIsLoading(true);

        try {
            // Clear local storage
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_DATA_KEY);
            localStorage.removeItem(ENCRYPTION_SALT_KEY);
            setUser(null);

            // Clear encryption key from memory
            clearEncryptionKey();
            setIsEncryptionReady(false);

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
                isEncryptionReady,
                signIn,
                signUp,
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
