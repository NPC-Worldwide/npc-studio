import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Loader, FileText, Folder, FolderOpen,
    Grid, List, Search, Book, FileType, ChevronLeft, ChevronRight,
    Star, Clock, Tag, Filter, SortAsc, SortDesc, Home, RefreshCw
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

interface DocumentItem {
    path: string;
    name: string;
    type: 'pdf' | 'epub' | 'folder';
    size?: number;
    modified?: string;
    pages?: number;
    coverUrl?: string;
}

interface LibraryViewerProps {
    currentPath: string;
    onOpenDocument: (path: string, type: 'pdf' | 'epub') => void;
    onClose?: () => void;
}

const LibraryViewer: React.FC<LibraryViewerProps> = ({ currentPath, onOpenDocument, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [libraryPath, setLibraryPath] = useState(currentPath || '~/Documents');
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [folders, setFolders] = useState<DocumentItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(0);
    const [pathHistory, setPathHistory] = useState<string[]>([]);
    const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
    const [showRecent, setShowRecent] = useState(false);

    const pathInputRef = useRef<HTMLInputElement>(null);

    // Load documents from the current path
    const loadDocuments = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        try {
            // Get directory listing
            const result = await (window as any).api?.readDir?.(path);
            if (!result || result.error) {
                setError(result?.error || 'Failed to read directory');
                setLoading(false);
                return;
            }

            const items = result.entries || [];
            const docs: DocumentItem[] = [];
            const dirs: DocumentItem[] = [];

            for (const item of items) {
                if (item.isDirectory) {
                    dirs.push({
                        path: item.path,
                        name: item.name,
                        type: 'folder'
                    });
                } else {
                    const ext = item.name.toLowerCase().split('.').pop();
                    if (ext === 'pdf') {
                        docs.push({
                            path: item.path,
                            name: item.name,
                            type: 'pdf',
                            size: item.size,
                            modified: item.mtime
                        });
                    } else if (ext === 'epub') {
                        docs.push({
                            path: item.path,
                            name: item.name,
                            type: 'epub',
                            size: item.size,
                            modified: item.mtime
                        });
                    }
                }
            }

            // Sort folders and documents
            dirs.sort((a, b) => a.name.localeCompare(b.name));
            setFolders(dirs);
            setDocuments(docs);
            setCurrentPage(0);
        } catch (err: any) {
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load recent documents
    const loadRecentDocuments = useCallback(async () => {
        try {
            const recent = await (window as any).api?.getRecentDocuments?.();
            if (recent && Array.isArray(recent)) {
                setRecentDocuments(recent.filter((r: any) =>
                    r.path.endsWith('.pdf') || r.path.endsWith('.epub')
                ).map((r: any) => ({
                    path: r.path,
                    name: r.path.split('/').pop() || r.path,
                    type: r.path.endsWith('.pdf') ? 'pdf' : 'epub'
                })));
            }
        } catch (e) {
            // No recent docs available
        }
    }, []);

    useEffect(() => {
        loadDocuments(libraryPath);
        loadRecentDocuments();
    }, [libraryPath, loadDocuments, loadRecentDocuments]);

    // Navigate to a folder
    const navigateToFolder = useCallback((path: string) => {
        setPathHistory(prev => [...prev, libraryPath]);
        setLibraryPath(path);
    }, [libraryPath]);

    // Go back in history
    const goBack = useCallback(() => {
        if (pathHistory.length > 0) {
            const prevPath = pathHistory[pathHistory.length - 1];
            setPathHistory(prev => prev.slice(0, -1));
            setLibraryPath(prevPath);
        }
    }, [pathHistory]);

    // Go to home directory
    const goHome = useCallback(() => {
        setPathHistory([]);
        setLibraryPath('~/Documents');
    }, []);

    // Handle document click
    const handleDocumentClick = useCallback((doc: DocumentItem) => {
        if (doc.type === 'folder') {
            navigateToFolder(doc.path);
        } else {
            onOpenDocument(doc.path, doc.type);
        }
    }, [navigateToFolder, onOpenDocument]);

    // Filter and sort documents
    const filteredDocs = documents
        .filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'name') {
                cmp = a.name.localeCompare(b.name);
            } else if (sortBy === 'date') {
                cmp = (a.modified || '').localeCompare(b.modified || '');
            } else if (sortBy === 'size') {
                cmp = (a.size || 0) - (b.size || 0);
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });

    // Pagination
    const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
    const paginatedDocs = filteredDocs.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    // Format file size
    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Toggle sort
    const toggleSort = (field: 'name' | 'date' | 'size') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    return (
        <div className="flex flex-col h-full theme-bg-primary">
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b theme-border theme-bg-secondary">
                <button
                    onClick={goBack}
                    disabled={pathHistory.length === 0}
                    className="p-1.5 theme-hover rounded disabled:opacity-30"
                    title="Go back"
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    onClick={goHome}
                    className="p-1.5 theme-hover rounded"
                    title="Home"
                >
                    <Home size={18} />
                </button>
                <button
                    onClick={() => loadDocuments(libraryPath)}
                    className="p-1.5 theme-hover rounded"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* Path breadcrumb */}
                <div className="flex-1 flex items-center gap-1 px-2 py-1 theme-bg-tertiary rounded text-sm overflow-hidden">
                    <Folder size={14} className="text-yellow-400 flex-shrink-0" />
                    {isEditingPath ? (
                        <input
                            ref={pathInputRef}
                            type="text"
                            value={libraryPath}
                            onChange={(e) => setLibraryPath(e.target.value)}
                            onBlur={() => setIsEditingPath(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsEditingPath(false);
                                    loadDocuments(libraryPath);
                                } else if (e.key === 'Escape') {
                                    setIsEditingPath(false);
                                }
                            }}
                            className="flex-1 bg-transparent outline-none theme-text-primary"
                            autoFocus
                        />
                    ) : (
                        <span
                            onClick={() => setIsEditingPath(true)}
                            className="truncate cursor-pointer hover:underline theme-text-primary"
                        >
                            {libraryPath}
                        </span>
                    )}
                </div>

                {/* Search */}
                <div className="flex items-center gap-1 px-2 py-1 theme-bg-tertiary rounded">
                    <Search size={14} className="opacity-50" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-32 bg-transparent outline-none text-sm theme-text-primary"
                    />
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-1 border-l theme-border pl-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-500/30 text-blue-400' : 'theme-hover'}`}
                        title="Grid view"
                    >
                        <Grid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-500/30 text-blue-400' : 'theme-hover'}`}
                        title="List view"
                    >
                        <List size={16} />
                    </button>
                </div>

                {/* Recent toggle */}
                <button
                    onClick={() => setShowRecent(!showRecent)}
                    className={`p-1.5 rounded ${showRecent ? 'bg-yellow-500/30 text-yellow-400' : 'theme-hover'}`}
                    title="Recent documents"
                >
                    <Clock size={16} />
                </button>

                {onClose && (
                    <button onClick={onClose} className="p-1.5 theme-hover rounded text-red-400">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-3">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader className="animate-spin" size={32} />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <p>{error}</p>
                        <button
                            onClick={() => loadDocuments(libraryPath)}
                            className="mt-2 px-3 py-1 theme-button-secondary rounded"
                        >
                            Retry
                        </button>
                    </div>
                ) : showRecent ? (
                    /* Recent documents view */
                    <div>
                        <h3 className="text-sm font-medium theme-text-muted mb-3 flex items-center gap-2">
                            <Clock size={14} /> Recent Documents
                        </h3>
                        {recentDocuments.length === 0 ? (
                            <p className="text-center theme-text-muted py-8">No recent documents</p>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {recentDocuments.map((doc) => (
                                    <DocumentCard
                                        key={doc.path}
                                        doc={doc}
                                        onClick={() => handleDocumentClick(doc)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentDocuments.map((doc) => (
                                    <DocumentRow
                                        key={doc.path}
                                        doc={doc}
                                        onClick={() => handleDocumentClick(doc)}
                                        formatSize={formatSize}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Main library view */
                    <div>
                        {/* Folders */}
                        {folders.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium theme-text-muted mb-2 flex items-center gap-2">
                                    <FolderOpen size={14} /> Folders
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                    {folders.map((folder) => (
                                        <button
                                            key={folder.path}
                                            onClick={() => navigateToFolder(folder.path)}
                                            className="flex flex-col items-center gap-1 p-2 rounded theme-hover"
                                        >
                                            <Folder size={32} className="text-yellow-400" />
                                            <span className="text-xs truncate w-full text-center">
                                                {folder.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium theme-text-muted flex items-center gap-2">
                                    <Book size={14} /> Documents ({filteredDocs.length})
                                </h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        onClick={() => toggleSort('name')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded ${sortBy === 'name' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'}`}
                                    >
                                        Name
                                        {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                                    </button>
                                    <button
                                        onClick={() => toggleSort('date')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded ${sortBy === 'date' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'}`}
                                    >
                                        Date
                                        {sortBy === 'date' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                                    </button>
                                    <button
                                        onClick={() => toggleSort('size')}
                                        className={`flex items-center gap-1 px-2 py-1 rounded ${sortBy === 'size' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'}`}
                                    >
                                        Size
                                        {sortBy === 'size' && (sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}
                                    </button>
                                </div>
                            </div>

                            {paginatedDocs.length === 0 ? (
                                <p className="text-center theme-text-muted py-8">
                                    {searchTerm ? 'No documents match your search' : 'No PDF or EPUB files in this folder'}
                                </p>
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {paginatedDocs.map((doc) => (
                                        <DocumentCard
                                            key={doc.path}
                                            doc={doc}
                                            onClick={() => handleDocumentClick(doc)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {paginatedDocs.map((doc) => (
                                        <DocumentRow
                                            key={doc.path}
                                            doc={doc}
                                            onClick={() => handleDocumentClick(doc)}
                                            formatSize={formatSize}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                        disabled={currentPage === 0}
                                        className="p-1.5 theme-hover rounded disabled:opacity-30"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-sm theme-text-muted">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage >= totalPages - 1}
                                        className="p-1.5 theme-hover rounded disabled:opacity-30"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Document card for grid view
const DocumentCard: React.FC<{ doc: DocumentItem; onClick: () => void }> = ({ doc, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-1.5 p-2 rounded theme-hover transition-colors group"
    >
        <div className="relative w-16 h-20 flex items-center justify-center">
            {doc.type === 'pdf' ? (
                <div className="w-full h-full bg-red-900/30 border border-red-700/50 rounded flex items-center justify-center">
                    <FileText size={24} className="text-red-400" />
                </div>
            ) : (
                <div className="w-full h-full bg-green-900/30 border border-green-700/50 rounded flex items-center justify-center">
                    <Book size={24} className="text-green-400" />
                </div>
            )}
            <span className={`absolute bottom-0 right-0 px-1 py-0.5 text-[9px] font-bold uppercase rounded-tl ${
                doc.type === 'pdf' ? 'bg-red-600 text-red-100' : 'bg-green-600 text-green-100'
            }`}>
                {doc.type}
            </span>
        </div>
        <span className="text-xs text-center truncate w-full px-1 theme-text-primary group-hover:text-blue-400">
            {doc.name.replace(/\.(pdf|epub)$/i, '')}
        </span>
    </button>
);

// Document row for list view
const DocumentRow: React.FC<{
    doc: DocumentItem;
    onClick: () => void;
    formatSize: (bytes?: number) => string
}> = ({ doc, onClick, formatSize }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-3 w-full px-3 py-2 rounded theme-hover text-left group"
    >
        {doc.type === 'pdf' ? (
            <FileText size={18} className="text-red-400 flex-shrink-0" />
        ) : (
            <Book size={18} className="text-green-400 flex-shrink-0" />
        )}
        <span className="flex-1 truncate theme-text-primary group-hover:text-blue-400">
            {doc.name}
        </span>
        <span className="text-xs theme-text-muted w-20 text-right">{formatSize(doc.size)}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            doc.type === 'pdf' ? 'bg-red-600/30 text-red-400' : 'bg-green-600/30 text-green-400'
        }`}>
            {doc.type.toUpperCase()}
        </span>
    </button>
);

export default LibraryViewer;
