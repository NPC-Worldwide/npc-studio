import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, LogIn, Settings, Cloud, Monitor, ChevronDown, Loader2, Crown, X, Eye, EyeOff, Edit2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface UserMenuProps {
    onOpenSettings?: () => void;
    compact?: boolean;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings, compact = false }) => {
    const { user, device, isAuthenticated, isLoading, signIn, signUp, signOut, error } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editingDeviceName, setEditingDeviceName] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Initialize device name from device info
    useEffect(() => {
        if (device?.deviceName) {
            setDeviceName(device.deviceName);
        }
    }, [device]);

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
                setShowAuthModal(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const formatStorageUsed = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            // Update device name if changed
            if (deviceName && deviceName !== device?.deviceName) {
                await (window as any).api?.setDeviceName?.(deviceName);
            }

            let result;
            if (isSignUp) {
                result = await signUp(email, password, name);
            } else {
                result = await signIn(email, password);
            }

            if (result.success) {
                setShowAuthModal(false);
                setEmail('');
                setPassword('');
                setName('');
                setFormError(null);
            } else {
                setFormError(result.error || 'Authentication failed');
            }
        } catch (err: any) {
            setFormError(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateDeviceName = async () => {
        if (deviceName && deviceName !== device?.deviceName) {
            await (window as any).api?.setDeviceName?.(deviceName);
        }
        setEditingDeviceName(false);
    };

    const openAuthModal = (signUpMode: boolean = false) => {
        setIsSignUp(signUpMode);
        setShowAuthModal(true);
        setFormError(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-2">
                <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
        );
    }

    // Auth Modal - rendered inline to avoid re-creation on state changes
    const authModalContent = showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
            <div
                ref={modalRef}
                className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h2>
                    <button
                        onClick={() => setShowAuthModal(false)}
                        className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4" onMouseDown={e => e.stopPropagation()}>
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onMouseDown={e => e.stopPropagation()}
                                placeholder="Your name"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                required={isSignUp}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="you@example.com"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onMouseDown={e => e.stopPropagation()}
                                placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                required
                                minLength={isSignUp ? 8 : undefined}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Device Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Device Name
                        </label>
                        <input
                            type="text"
                            value={deviceName}
                            onChange={e => setDeviceName(e.target.value)}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="My MacBook"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            This helps identify this device when syncing
                        </p>
                    </div>

                    {formError && (
                        <div className="px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-400">
                            {formError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {isSignUp ? 'Creating account...' : 'Signing in...'}
                            </>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 text-center">
                    <p className="text-sm text-gray-400">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                            {isSignUp ? 'Sign in' : 'Sign up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <>
                <button
                    onClick={() => openAuthModal(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                    <LogIn size={16} />
                    <span className="text-sm font-medium">Sign In</span>
                </button>
                {authModalContent}
            </>
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

                    {/* Device info - editable */}
                    <div className="px-3 py-2 border-b border-gray-700">
                        {editingDeviceName ? (
                            <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={deviceName}
                                    onChange={e => setDeviceName(e.target.value)}
                                    onBlur={handleUpdateDeviceName}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateDeviceName()}
                                    autoFocus
                                    className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        ) : (
                            <div
                                className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300"
                                onClick={() => setEditingDeviceName(true)}
                            >
                                <Monitor size={14} />
                                <span className="truncate flex-1">{device?.deviceName}</span>
                                <Edit2 size={12} className="opacity-50" />
                            </div>
                        )}
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

            {authModalContent}
        </div>
    );
};

export default UserMenu;
