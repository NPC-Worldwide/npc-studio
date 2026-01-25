import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useSync } from '../hooks/useSync';

interface SyncStatusProps {
    showDetails?: boolean;
    compact?: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ showDetails = false, compact = false }) => {
    const {
        syncStatus,
        isOnline,
        lastSyncTime,
        pendingChanges,
        syncError,
        triggerSync
    } = useSync();

    const getStatusIcon = () => {
        if (!isOnline) {
            return <CloudOff size={compact ? 12 : 14} className="text-gray-500" />;
        }

        switch (syncStatus) {
            case 'syncing':
                return <Loader2 size={compact ? 12 : 14} className="text-blue-400 animate-spin" />;
            case 'error':
                return <AlertCircle size={compact ? 12 : 14} className="text-red-400" />;
            case 'synced':
                return <CheckCircle size={compact ? 12 : 14} className="text-green-400" />;
            case 'pending':
                return <Cloud size={compact ? 12 : 14} className="text-yellow-400" />;
            default:
                return <Cloud size={compact ? 12 : 14} className="text-gray-400" />;
        }
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';

        switch (syncStatus) {
            case 'syncing':
                return 'Syncing...';
            case 'error':
                return 'Sync error';
            case 'synced':
                return 'Synced';
            case 'pending':
                return `${pendingChanges} pending`;
            default:
                return 'Ready';
        }
    };

    const formatLastSync = (timestamp: Date | null) => {
        if (!timestamp) return 'Never';

        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return timestamp.toLocaleDateString();
    };

    if (compact) {
        return (
            <button
                onClick={triggerSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-1 p-1 rounded hover:bg-gray-700/50 transition-colors"
                title={getStatusText()}
            >
                {getStatusIcon()}
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-xs text-gray-300">{getStatusText()}</span>
                </div>
                <button
                    onClick={triggerSync}
                    disabled={syncStatus === 'syncing' || !isOnline}
                    className="p-1 rounded hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sync now"
                >
                    <RefreshCw size={12} className={`text-gray-400 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {showDetails && (
                <div className="text-xs text-gray-500">
                    Last sync: {formatLastSync(lastSyncTime)}
                </div>
            )}

            {syncError && (
                <div className="text-xs text-red-400 truncate" title={syncError}>
                    {syncError}
                </div>
            )}
        </div>
    );
};

export default SyncStatus;
