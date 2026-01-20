import { useState, useEffect, useCallback, useRef } from 'react';

// API base URL for incognide backend
const API_BASE_URL = 'https://app.incognide.com';

// Local storage keys
const AUTH_TOKEN_KEY = 'incognide-auth-token';
const LAST_SYNC_KEY = 'incognide-last-sync';
const PENDING_CHANGES_KEY = 'incognide-pending-changes';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error';

interface PendingChange {
    id: string;
    type: 'conversation' | 'message' | 'bookmark' | 'history';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: string;
}

interface SyncState {
    syncStatus: SyncStatus;
    isOnline: boolean;
    lastSyncTime: Date | null;
    pendingChanges: number;
    syncError: string | null;
}

interface UseSyncReturn extends SyncState {
    triggerSync: () => Promise<void>;
    addPendingChange: (change: Omit<PendingChange, 'id' | 'timestamp'>) => void;
    clearPendingChanges: () => void;
}

export const useSync = (): UseSyncReturn => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
        const stored = localStorage.getItem(LAST_SYNC_KEY);
        return stored ? new Date(stored) : null;
    });
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
        try {
            const stored = localStorage.getItem(PENDING_CHANGES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [syncError, setSyncError] = useState<string | null>(null);

    const syncInProgressRef = useRef(false);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Persist pending changes to localStorage
    useEffect(() => {
        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
        if (pendingChanges.length > 0) {
            setSyncStatus('pending');
        }
    }, [pendingChanges]);

    // Add a pending change
    const addPendingChange = useCallback((change: Omit<PendingChange, 'id' | 'timestamp'>) => {
        const newChange: PendingChange = {
            ...change,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
        };
        setPendingChanges(prev => [...prev, newChange]);
    }, []);

    // Clear all pending changes
    const clearPendingChanges = useCallback(() => {
        setPendingChanges([]);
        localStorage.removeItem(PENDING_CHANGES_KEY);
    }, []);

    // Pull changes from server
    const pullChanges = useCallback(async (): Promise<boolean> => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return false;

        try {
            const lastSync = lastSyncTime?.toISOString() || '1970-01-01T00:00:00.000Z';
            const deviceId = await (window as any).api?.getDeviceId?.();

            const response = await fetch(
                `${API_BASE_URL}/api/sync/pull?since=${encodeURIComponent(lastSync)}&device_id=${deviceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Pull failed: ${response.status}`);
            }

            const changes = await response.json();

            // Apply changes locally
            if (changes.conversations?.length) {
                await applyConversationChanges(changes.conversations);
            }
            if (changes.messages?.length) {
                await applyMessageChanges(changes.messages);
            }
            if (changes.bookmarks?.length) {
                await applyBookmarkChanges(changes.bookmarks);
            }

            return true;
        } catch (e: any) {
            console.error('[SYNC] Pull error:', e);
            throw e;
        }
    }, [lastSyncTime]);

    // Push changes to server
    const pushChanges = useCallback(async (): Promise<boolean> => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token || pendingChanges.length === 0) return true;

        try {
            const deviceId = await (window as any).api?.getDeviceId?.();

            const response = await fetch(`${API_BASE_URL}/api/sync/push`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device_id: deviceId,
                    changes: pendingChanges
                })
            });

            if (!response.ok) {
                throw new Error(`Push failed: ${response.status}`);
            }

            // Clear pending changes on success
            clearPendingChanges();
            return true;
        } catch (e: any) {
            console.error('[SYNC] Push error:', e);
            throw e;
        }
    }, [pendingChanges, clearPendingChanges]);

    // Apply conversation changes from server
    const applyConversationChanges = async (conversations: any[]) => {
        // For now, store in localStorage - will integrate with existing conversation storage
        const existingConvos = JSON.parse(localStorage.getItem('synced-conversations') || '{}');

        for (const convo of conversations) {
            existingConvos[convo.id] = convo;
        }

        localStorage.setItem('synced-conversations', JSON.stringify(existingConvos));
        console.log(`[SYNC] Applied ${conversations.length} conversation changes`);
    };

    // Apply message changes from server
    const applyMessageChanges = async (messages: any[]) => {
        // For now, store in localStorage - will integrate with existing message storage
        const existingMessages = JSON.parse(localStorage.getItem('synced-messages') || '{}');

        for (const msg of messages) {
            if (!existingMessages[msg.conversation_id]) {
                existingMessages[msg.conversation_id] = [];
            }
            // Merge or add message
            const idx = existingMessages[msg.conversation_id].findIndex((m: any) => m.id === msg.id);
            if (idx >= 0) {
                existingMessages[msg.conversation_id][idx] = msg;
            } else {
                existingMessages[msg.conversation_id].push(msg);
            }
        }

        localStorage.setItem('synced-messages', JSON.stringify(existingMessages));
        console.log(`[SYNC] Applied ${messages.length} message changes`);
    };

    // Apply bookmark changes from server
    const applyBookmarkChanges = async (bookmarks: any[]) => {
        // Will integrate with existing bookmark storage in database
        console.log(`[SYNC] Would apply ${bookmarks.length} bookmark changes`);
    };

    // Main sync function
    const triggerSync = useCallback(async () => {
        if (syncInProgressRef.current) {
            console.log('[SYNC] Sync already in progress');
            return;
        }

        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            console.log('[SYNC] No auth token, skipping sync');
            return;
        }

        if (!isOnline) {
            console.log('[SYNC] Offline, skipping sync');
            setSyncError('Offline - sync will resume when online');
            return;
        }

        syncInProgressRef.current = true;
        setSyncStatus('syncing');
        setSyncError(null);

        try {
            // Push local changes first
            await pushChanges();

            // Then pull remote changes
            await pullChanges();

            // Update last sync time
            const now = new Date();
            setLastSyncTime(now);
            localStorage.setItem(LAST_SYNC_KEY, now.toISOString());

            setSyncStatus('synced');
            console.log('[SYNC] Sync completed successfully');
        } catch (e: any) {
            console.error('[SYNC] Sync failed:', e);
            setSyncError(e.message || 'Sync failed');
            setSyncStatus('error');
        } finally {
            syncInProgressRef.current = false;
        }
    }, [isOnline, pushChanges, pullChanges]);

    // Auto-sync every 30 seconds when online and authenticated
    useEffect(() => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token || !isOnline) {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
            return;
        }

        // Initial sync
        triggerSync();

        // Set up interval
        syncIntervalRef.current = setInterval(() => {
            triggerSync();
        }, 30000); // 30 seconds

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [isOnline, triggerSync]);

    // Trigger sync when coming back online
    useEffect(() => {
        if (isOnline && pendingChanges.length > 0) {
            triggerSync();
        }
    }, [isOnline]);

    return {
        syncStatus,
        isOnline,
        lastSyncTime,
        pendingChanges: pendingChanges.length,
        syncError,
        triggerSync,
        addPendingChange,
        clearPendingChanges
    };
};

export default useSync;
