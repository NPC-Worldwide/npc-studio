import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, FolderOpen, CheckCircle, XCircle, Loader, Trash2, ExternalLink } from 'lucide-react';

interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    savePath: string | null;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    received: number;
    total: number;
    error?: string;
    startTime: number;
}

interface DownloadManagerProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath: string;
}

// Store downloads globally so they persist
let globalDownloads: DownloadItem[] = [];
let downloadListeners: ((downloads: DownloadItem[]) => void)[] = [];

const notifyListeners = () => {
    downloadListeners.forEach(fn => fn([...globalDownloads]));
};

export const addDownload = (url: string, filename: string) => {
    const download: DownloadItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        filename,
        savePath: null,
        status: 'pending',
        progress: 0,
        received: 0,
        total: 0,
        startTime: Date.now()
    };
    globalDownloads.unshift(download);
    notifyListeners();
    return download.id;
};

export const updateDownload = (id: string, updates: Partial<DownloadItem>) => {
    const idx = globalDownloads.findIndex(d => d.id === id);
    if (idx !== -1) {
        globalDownloads[idx] = { ...globalDownloads[idx], ...updates };
        notifyListeners();
    }
};

export const getActiveDownloadsCount = () => {
    return globalDownloads.filter(d => d.status === 'pending' || d.status === 'downloading').length;
};

const DownloadManager: React.FC<DownloadManagerProps> = ({ isOpen, onClose, currentPath }) => {
    const [downloads, setDownloads] = useState<DownloadItem[]>(globalDownloads);
    const [saveDir, setSaveDir] = useState(currentPath);

    useEffect(() => {
        setSaveDir(currentPath);
    }, [currentPath]);

    useEffect(() => {
        const listener = (newDownloads: DownloadItem[]) => setDownloads(newDownloads);
        downloadListeners.push(listener);
        return () => {
            downloadListeners = downloadListeners.filter(l => l !== listener);
        };
    }, []);

    // Listen for download events from main process
    useEffect(() => {
        const api = (window as any).api;

        const handleDownloadRequested = async (data: { url: string; filename: string }) => {
            const id = addDownload(data.url, data.filename);

            // Auto-start download with current path
            try {
                updateDownload(id, { status: 'downloading', savePath: `${saveDir}/${data.filename}` });

                const result = await api?.browserSaveLink?.(data.url, data.filename, saveDir);

                if (result?.success) {
                    updateDownload(id, {
                        status: 'completed',
                        progress: 100,
                        savePath: result.path
                    });
                } else if (result?.canceled) {
                    updateDownload(id, { status: 'cancelled' });
                } else {
                    updateDownload(id, {
                        status: 'failed',
                        error: result?.error || 'Download failed'
                    });
                }
            } catch (err: any) {
                updateDownload(id, {
                    status: 'failed',
                    error: err.message
                });
            }
        };

        const handleProgress = (data: { filename: string; received: number; total: number; percent: number }) => {
            const download = globalDownloads.find(d => d.filename === data.filename && d.status === 'downloading');
            if (download) {
                updateDownload(download.id, {
                    received: data.received,
                    total: data.total,
                    progress: data.percent
                });
            }
        };

        const handleComplete = (data: { filename: string; path: string; state: string; error?: string }) => {
            const download = globalDownloads.find(d => d.filename === data.filename &&
                (d.status === 'downloading' || d.status === 'pending'));
            if (download) {
                updateDownload(download.id, {
                    status: data.state === 'completed' ? 'completed' : 'failed',
                    progress: data.state === 'completed' ? 100 : download.progress,
                    savePath: data.path,
                    error: data.error
                });
            }
        };

        const unsubRequest = api?.onBrowserDownloadRequested?.(handleDownloadRequested);
        const unsubProgress = api?.onDownloadProgress?.(handleProgress);
        const unsubComplete = api?.onDownloadComplete?.(handleComplete);

        return () => {
            unsubRequest?.();
            unsubProgress?.();
            unsubComplete?.();
        };
    }, [saveDir]);

    const clearCompleted = useCallback(() => {
        globalDownloads = globalDownloads.filter(d => d.status === 'downloading' || d.status === 'pending');
        notifyListeners();
    }, []);

    const openFile = useCallback((path: string) => {
        (window as any).api?.openFile?.(path);
    }, []);

    const openFolder = useCallback((path: string) => {
        const dir = path.substring(0, path.lastIndexOf('/'));
        (window as any).api?.openFile?.(dir);
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-[600px] max-h-[80vh] theme-bg-primary rounded-lg shadow-xl border theme-border flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border">
                    <div className="flex items-center gap-2">
                        <Download size={20} className="text-blue-400" />
                        <h2 className="text-lg font-semibold theme-text-primary">Downloads</h2>
                        {getActiveDownloadsCount() > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                                {getActiveDownloadsCount()} active
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {downloads.some(d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled') && (
                            <button
                                onClick={clearCompleted}
                                className="text-xs px-2 py-1 theme-hover rounded flex items-center gap-1"
                            >
                                <Trash2 size={12} />
                                Clear completed
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 theme-hover rounded">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Download directory */}
                <div className="px-4 py-2 border-b theme-border bg-gray-800/30">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <FolderOpen size={12} />
                        <span>Saving to: {saveDir}</span>
                    </div>
                </div>

                {/* Downloads list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {downloads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <Download size={48} className="mb-4 opacity-30" />
                            <p>No downloads yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {downloads.map(download => (
                                <div
                                    key={download.id}
                                    className="p-3 theme-bg-secondary rounded-lg border theme-border"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {download.status === 'completed' && (
                                                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                                                )}
                                                {download.status === 'failed' && (
                                                    <XCircle size={14} className="text-red-400 flex-shrink-0" />
                                                )}
                                                {download.status === 'cancelled' && (
                                                    <XCircle size={14} className="text-gray-400 flex-shrink-0" />
                                                )}
                                                {(download.status === 'downloading' || download.status === 'pending') && (
                                                    <Loader size={14} className="text-blue-400 flex-shrink-0 animate-spin" />
                                                )}
                                                <span className="font-medium theme-text-primary truncate">
                                                    {download.filename}
                                                </span>
                                            </div>

                                            {download.status === 'downloading' && (
                                                <div className="mt-2">
                                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-300"
                                                            style={{ width: `${download.progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                                                        <span>{formatBytes(download.received)} / {formatBytes(download.total)}</span>
                                                        <span>{download.progress}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {download.status === 'failed' && download.error && (
                                                <p className="text-xs text-red-400 mt-1">{download.error}</p>
                                            )}

                                            {download.status === 'completed' && download.savePath && (
                                                <p className="text-xs text-gray-400 mt-1 truncate">{download.savePath}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <span className="text-xs text-gray-500">
                                                {formatTime(Date.now() - download.startTime)}
                                            </span>
                                            {download.status === 'completed' && download.savePath && (
                                                <>
                                                    <button
                                                        onClick={() => openFile(download.savePath!)}
                                                        className="p-1 theme-hover rounded"
                                                        title="Open file"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openFolder(download.savePath!)}
                                                        className="p-1 theme-hover rounded"
                                                        title="Open folder"
                                                    >
                                                        <FolderOpen size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DownloadManager;
