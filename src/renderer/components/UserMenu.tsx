import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, LogIn, Settings, Cloud, CloudOff, Monitor, ChevronDown, Loader2, Crown } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface UserMenuProps {
    onOpenSettings?: () => void;
    compact?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings, compact = false }) => {
    const { user, device, isAuthenticated, isLoading, signIn, signOut, error } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close menu on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const formatStorageUsed = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-2">
                <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <button
                onClick={signIn}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
                <LogIn size={16} />
                <span className="text-sm font-medium">Sign In</span>
            </button>
        );
    }

    return (
        <div ref={menuRef} className="relative">
            {/* User button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-700/50 transition-colors ${compact ? '' : 'pr-3'}`}
            >
                {user?.profilePicture ? (
                    <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-6 h-6 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <User size={14} className="text-white" />
                    </div>
                )}
                {!compact && (
                    <>
                        <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                                {user?.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                                {device?.deviceName || 'This device'}
                            </div>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-3 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            {user?.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                    <User size={16} className="text-white" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                    {user?.name}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {user?.email}
                                </div>
                            </div>
                            {user?.isPremium && (
                                <Crown size={14} className="text-yellow-400" title="Premium" />
                            )}
                        </div>
                    </div>

                    {/* Sync status */}
                    <div className="px-3 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 text-xs">
                            <Cloud size={14} className="text-green-400" />
                            <span className="text-gray-300">Sync enabled</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                            Storage: {formatStorageUsed(user?.storageUsedBytes || 0)} / {formatStorageUsed(user?.storageLimitBytes || 209715200)}
                        </div>
                    </div>

                    {/* Device info */}
                    <div className="px-3 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Monitor size={14} />
                            <span className="truncate">{device?.deviceName}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                        {onOpenSettings && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onOpenSettings();
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                            >
                                <Settings size={14} />
                                Settings
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut();
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700/50"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="mt-1 px-2 py-1 bg-red-900/50 border border-red-700 rounded text-xs text-red-400">
                    {error}
                </div>
            )}
        </div>
    );
};

export default UserMenu;
