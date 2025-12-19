import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FileText, Search, Grid, List, RefreshCw, Folder, Book,
    SortAsc, SortDesc, Home, FolderOpen, Star, StarOff, ChevronRight
} from 'lucide-react';

interface Document {
    name: string;
    path: string;
    type: 'pdf' | 'epub';
    size: number;
    modified: string;
    favorite?: boolean;
}

interface LibraryViewerProps {
    currentPath: string;
    onOpenDocument: (path: string, type: string) => void;
    onClose?: () => void;
}

const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (isoString: string): string => {
    if (!isoString) return '--';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString();
    } catch {
        return '--';
    }
};

const getDocIcon = (type: string) => {
    if (type === 'pdf') {
        return <FileText size={20} className="text-red-400" />;
    }
    return <Book size={20} className="text-green-400" />;
};

const DOC_EXTENSIONS = ['pdf', 'epub'];

const LibraryViewer: React.FC<LibraryViewerProps> = ({ currentPath, onOpenDocument }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'type'>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [activeSource, setActiveSource] = useState<'workspace' | 'library' | 'all'>('all');

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('library_favorites');
        if (saved) {
            setFavorites(new Set(JSON.parse(saved)));
        }
    }, []);

    // Save favorites to localStorage
    const saveFavorites = useCallback((favs: Set<string>) => {
        localStorage.setItem('library_favorites', JSON.stringify([...favs]));
    }, []);

    const toggleFavorite = useCallback((path: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            saveFavorites(next);
            return next;
        });
    }, [saveFavorites]);

    // Scan directory for documents recursively
    const scanDirectory = useCallback(async (dirPath: string, maxDepth: number = 3): Promise<Document[]> => {
        const docs: Document[] = [];

        const scan = async (path: string, depth: number) => {
            if (depth > maxDepth) return;

            try {
                const items = await (window as any).api?.readDirectory?.(path);
                if (!items || !Array.isArray(items)) return;

                for (const item of items) {
                    if (item.isDirectory) {
                        // Skip node_modules, .git, etc.
                        if (!['node_modules', '.git', '__pycache__', '.next', 'dist', 'build'].includes(item.name)) {
                            await scan(item.path, depth + 1);
                        }
                    } else {
                        const ext = item.name.split('.').pop()?.toLowerCase() || '';
                        if (DOC_EXTENSIONS.includes(ext)) {
                            docs.push({
                                name: item.name,
                                path: item.path,
                                type: ext as Document['type'],
                                size: item.size || 0,
                                modified: item.modified || ''
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to scan ${path}:`, e);
            }
        };

        await scan(dirPath, 0);
        return docs;
    }, []);

    // Load documents from both sources
    const loadDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const allDocs: Document[] = [];

            // Scan workspace
            if (activeSource === 'workspace' || activeSource === 'all') {
                const workspaceDocs = await scanDirectory(currentPath);
                allDocs.push(...workspaceDocs);
            }

            // Scan ~/.npcsh/pdfs
            if (activeSource === 'library' || activeSource === 'all') {
                const homeDir = await (window as any).api?.getHomeDir?.();
                if (homeDir) {
                    const libraryPath = `${homeDir}/.npcsh/pdfs`;
                    // Ensure directory exists
                    try {
                        await (window as any).api?.ensureDir?.(libraryPath);
                        const libraryDocs = await scanDirectory(libraryPath);
                        allDocs.push(...libraryDocs);
                    } catch (e) {
                        console.warn('Library directory not accessible:', e);
                    }
                }
            }

            // Deduplicate by path
            const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.path, d])).values());
            setDocuments(uniqueDocs);
        } catch (err: any) {
            setError(err.message || 'Failed to load documents');
        }

        setLoading(false);
    }, [currentPath, activeSource, scanDirectory]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    // Filter and sort documents
    const filteredDocs = useMemo(() => {
        let result = [...documents];

        // Filter by favorites
        if (showFavoritesOnly) {
            result = result.filter(d => favorites.has(d.path));
        }

        // Filter by search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d => d.name.toLowerCase().includes(q));
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case 'name':
                    cmp = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    cmp = (a.size || 0) - (b.size || 0);
                    break;
                case 'modified':
                    cmp = (a.modified || '').localeCompare(b.modified || '');
                    break;
                case 'type':
                    cmp = a.type.localeCompare(b.type);
                    break;
            }
            return sortAsc ? cmp : -cmp;
        });

        return result;
    }, [documents, searchQuery, sortBy, sortAsc, showFavoritesOnly, favorites]);

    const handleOpenDocument = useCallback((doc: Document) => {
        onOpenDocument(doc.path, doc.type);
    }, [onOpenDocument]);

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-primary">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b theme-border theme-bg-secondary">
                {/* Source tabs */}
                <div className="flex border theme-border rounded overflow-hidden mr-2">
                    <button
                        onClick={() => setActiveSource('all')}
                        className={`px-3 py-1.5 text-xs ${activeSource === 'all' ? 'bg-blue-600 text-white' : 'theme-hover'}`}
                        title="All documents"
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveSource('workspace')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 ${activeSource === 'workspace' ? 'bg-blue-600 text-white' : 'theme-hover'}`}
                        title="Workspace documents"
                    >
                        <FolderOpen size={12} /> Workspace
                    </button>
                    <button
                        onClick={() => setActiveSource('library')}
                        className={`px-3 py-1.5 text-xs flex items-center gap-1 ${activeSource === 'library' ? 'bg-blue-600 text-white' : 'theme-hover'}`}
                        title="~/.npcsh/pdfs"
                    >
                        <Home size={12} /> Library
                    </button>
                </div>

                <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`p-1.5 rounded ${showFavoritesOnly ? 'bg-yellow-500/20 text-yellow-400' : 'theme-hover'}`}
                    title="Show favorites only"
                >
                    <Star size={16} />
                </button>

                <button
                    onClick={loadDocuments}
                    className="p-1.5 rounded theme-hover"
                    title="Refresh"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search documents..."
                        className="w-full pl-7 pr-2 py-1.5 text-sm rounded bg-gray-800 border theme-border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2 py-1.5 text-sm bg-gray-800 border theme-border rounded"
                >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="size">Size</option>
                    <option value="modified">Modified</option>
                </select>

                <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="p-1.5 rounded theme-hover"
                    title={sortAsc ? 'Sort ascending' : 'Sort descending'}
                >
                    {sortAsc ? <SortAsc size={16} /> : <SortDesc size={16} />}
                </button>

                {/* View mode */}
                <div className="flex border theme-border rounded overflow-hidden">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 ${viewMode === 'grid' ? 'bg-blue-600' : 'theme-hover'}`}
                        title="Grid view"
                    >
                        <Grid size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-600' : 'theme-hover'}`}
                        title="List view"
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <RefreshCw size={24} className="animate-spin mr-2" />
                        Scanning for documents...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-red-400">
                        {error}
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileText size={48} className="opacity-30 mb-4" />
                        <p>{searchQuery ? 'No matching documents' : 'No documents found'}</p>
                        <p className="text-xs mt-2">
                            Documents in workspace and ~/.npcsh/pdfs will appear here
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                        {filteredDocs.map(doc => (
                            <div
                                key={doc.path}
                                onClick={() => setSelectedDoc(doc.path)}
                                onDoubleClick={() => handleOpenDocument(doc)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer transition-colors ${
                                    selectedDoc === doc.path
                                        ? 'bg-blue-600/30 ring-1 ring-blue-500'
                                        : 'hover:bg-gray-800'
                                }`}
                            >
                                <div className="relative">
                                    <div className={`w-16 h-20 rounded flex items-center justify-center ${
                                        doc.type === 'pdf' ? 'bg-red-900/30' :
                                        doc.type === 'epub' ? 'bg-green-900/30' :
                                        'bg-gray-800'
                                    }`}>
                                        {getDocIcon(doc.type)}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.path); }}
                                        className="absolute -top-1 -right-1 p-0.5"
                                    >
                                        {favorites.has(doc.path) ? (
                                            <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                        ) : (
                                            <Star size={14} className="text-gray-600 hover:text-gray-400" />
                                        )}
                                    </button>
                                </div>
                                <div className="text-center w-full">
                                    <p className="text-xs truncate" title={doc.name}>
                                        {doc.name}
                                    </p>
                                    <p className="text-xs text-gray-500 uppercase">
                                        {doc.type}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {/* List header */}
                        <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 border-b theme-border">
                            <span className="w-6"></span>
                            <span className="flex-1">Name</span>
                            <span className="w-16 text-center">Type</span>
                            <span className="w-20 text-right">Size</span>
                            <span className="w-28 text-right">Modified</span>
                        </div>
                        {filteredDocs.map(doc => (
                            <div
                                key={doc.path}
                                onClick={() => setSelectedDoc(doc.path)}
                                onDoubleClick={() => handleOpenDocument(doc)}
                                className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                                    selectedDoc === doc.path
                                        ? 'bg-blue-600/30 ring-1 ring-blue-500'
                                        : 'hover:bg-gray-800'
                                }`}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.path); }}
                                    className="w-6 flex justify-center"
                                >
                                    {favorites.has(doc.path) ? (
                                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                    ) : (
                                        <Star size={14} className="text-gray-600 hover:text-gray-400" />
                                    )}
                                </button>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {getDocIcon(doc.type)}
                                    <span className="text-sm truncate" title={doc.path}>
                                        {doc.name}
                                    </span>
                                </div>
                                <span className="w-16 text-xs text-gray-500 text-center uppercase">
                                    {doc.type}
                                </span>
                                <span className="w-20 text-xs text-gray-500 text-right">
                                    {formatFileSize(doc.size)}
                                </span>
                                <span className="w-28 text-xs text-gray-500 text-right">
                                    {formatDate(doc.modified)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-500 border-t theme-border theme-bg-secondary">
                <span>{filteredDocs.length} documents</span>
                <span>{favorites.size} favorites</span>
            </div>
        </div>
    );
};

export default LibraryViewer;
