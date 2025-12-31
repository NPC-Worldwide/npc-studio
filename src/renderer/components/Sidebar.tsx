import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Folder, File, Globe, ChevronRight, Settings, Edit,
    Terminal, Image, Trash, Users, Plus, ArrowUp, MessageSquare,
    X, Wrench, FileText, FileJson, BarChart3, Code2, HardDrive, ChevronDown, ChevronUp,
    Sun, Moon, FileStack, Share2, Bot, Zap, GitBranch, Tag, KeyRound, Database, Network,
    Star, Clock, Activity, Lock, Archive, BookOpen, Sparkles, Box, GripVertical, Play,
    Search, RefreshCw, Download, Upload, Copy, Check, AlertCircle, Info, Eye, EyeOff,
    Palette, Code, Save, FolderOpen, Home, ArrowLeft, ArrowRight, Menu, MoreVertical,
    Loader2, ExternalLink, Link, Unlink, Filter, SortAsc, SortDesc, Table, Grid,
    List, Maximize2, Minimize2, Move, RotateCcw, ZoomIn, ZoomOut, Layers, Layout,
    Pause, Server, Mail, Cpu, Wifi, WifiOff, Power, PowerOff, Hash, AtSign
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import { Modal, Tabs, Card, Button, Input, Select } from 'npcts';
import DiskUsageAnalyzer from './DiskUsageAnalyzer';
import AutosizeTextarea from './AutosizeTextarea';
import ForceGraph2D from 'react-force-graph-2d';
// ALL components used by tile jinxes - for REAL live preview
import ActivityIntelligence from './ActivityIntelligence';
import BrowserHistoryWeb from './BrowserHistoryWeb';
import CtxEditor from './CtxEditor';
import JinxMenu from './JinxMenu';
import KnowledgeGraphEditor from './KnowledgeGraphEditor';
import LabeledDataManager from './LabeledDataManager';
import McpServerMenu from './McpServerMenu';
import MemoryManagement from './MemoryManagement';
import MessageLabeling from './MessageLabeling';
import NPCTeamMenu from './NPCTeamMenu';
import PythonEnvSettings from './PythonEnvSettings';
import DBTool from './DBTool';
import DataDash from './DataDash';
import LibraryViewer from './LibraryViewer';
import GraphViewer from './GraphViewer';
import PhotoViewer from './PhotoViewer';
import SettingsMenu from './SettingsMenu';
import npcLogo from '../../assets/icon.png';

const Sidebar = (props: any) => {
    // Destructure all props from Enpistu
    const {
        // State
        sidebarCollapsed, sidebarWidth, isResizingSidebar, contentDataRef, isDarkMode,
        currentPath, baseDir, selectedFiles, selectedConvos, windowId, activeWindowsExpanded,
        workspaceIndicatorExpanded, expandedFolders, renamingPath, editedSidebarItemName,
        currentFile, lastClickedIndex, lastClickedFileIndex, activeContentPaneId,
        folderStructure, directoryConversations, gitStatus, gitPanelCollapsed,
        gitCommitMessage, gitLoading, gitError, rootLayoutNode, openBrowsers, commonSites,
        websiteHistory, filesCollapsed, conversationsCollapsed, websitesCollapsed,
        isGlobalSearch, searchTerm, searchInputRef, loading, isSearching,
        contextMenuPos, sidebarItemContextMenuPos, fileContextMenuPos,
        isEditingPath, editedPath, isLoadingWorkspace, activeConversationId,
        // Setters
        setSidebarWidth, setIsResizingSidebar, setSelectedFiles, setFileContextMenuPos,
        setError, setIsStreaming, setRootLayoutNode, setActiveWindowsExpanded,
        setWorkspaceIndicatorExpanded, setGitPanelCollapsed, setExpandedFolders,
        setRenamingPath, setEditedSidebarItemName, setLastClickedIndex, setLastClickedFileIndex,
        setSelectedConvos, setActiveContentPaneId, setCurrentFile, setActiveConversationId,
        setDirectoryConversations, setFolderStructure, setGitCommitMessage, setGitLoading,
        setGitError, setGitStatus, setFilesCollapsed, setConversationsCollapsed, setWebsitesCollapsed,
        setInput, setContextMenuPos, setSidebarItemContextMenuPos, setSearchTerm,
        setIsSearching, setDeepSearchResults, setMessageSearchResults,
        setIsEditingPath, setEditedPath, setSettingsOpen, setProjectEnvEditorOpen, setBrowserUrlDialogOpen,
        setPhotoViewerOpen, setDashboardMenuOpen, setJinxMenuOpen,
        setCtxEditorOpen, setTeamManagementOpen, setNpcTeamMenuOpen, setSidebarCollapsed,
        createGraphViewerPane, createBrowserGraphPane, createDataLabelerPane,
        createDataDashPane, createDBToolPane, createNPCTeamPane, createJinxPane, createTeamManagementPane, createSettingsPane, createPhotoViewerPane, createProjectEnvPane, createDiskUsagePane, createLibraryViewerPane,
        // Functions from Enpistu
        createNewConversation, generateId, streamToPaneRef, availableNPCs, currentNPC, currentModel,
        currentProvider, executionMode, mcpServerPath, selectedMcpTools, updateContentPane,
        loadDirectoryStructure, loadWebsiteHistory, createNewBrowser,
        handleGlobalDragStart, handleGlobalDragEnd, normalizePath, getFileIcon,
        serializeWorkspace, saveWorkspaceToStorage, handleConversationSelect, handleFileClick,
        handleInputSubmit, toggleTheme, goUpDirectory, switchToPath,
        handleCreateNewFolder, createNewTextFile, createNewTerminal, createNewDocument,
        handleOpenNpcTeamMenu, renderSearchResults,
        createAndAddPaneNodeToLayout, findNodePath, findNodeByPath
    } = props;

    const WINDOW_WORKSPACES_KEY = 'npcStudioWorkspaces';
    const ACTIVE_WINDOWS_KEY = 'npcStudioActiveWindows';

    // Local state for disk usage panel
    const [diskUsageCollapsed, setDiskUsageCollapsed] = useState(true);
    // Local state for header actions expanded/collapsed (persisted)
    const [headerActionsExpanded, setHeaderActionsExpanded] = useState(() => {
        const saved = localStorage.getItem('npcStudio_headerActionsExpanded');
        return saved !== null ? JSON.parse(saved) : true;
    });
    // Persist headerActionsExpanded to localStorage
    useEffect(() => {
        localStorage.setItem('npcStudio_headerActionsExpanded', JSON.stringify(headerActionsExpanded));
    }, [headerActionsExpanded]);

    // Doc dropdown state (click-based instead of hover)
    const [docDropdownOpen, setDocDropdownOpen] = useState(false);
    // Terminal dropdown state (click-based)
    const [terminalDropdownOpen, setTerminalDropdownOpen] = useState(false);
    // Chat+ dropdown state (click-based)
    const [chatPlusDropdownOpen, setChatPlusDropdownOpen] = useState(false);
    // Website context menu state
    const [websiteContextMenu, setWebsiteContextMenu] = useState<{ x: number; y: number; url: string; title: string } | null>(null);
    // Zip modal state
    const [zipModal, setZipModal] = useState<{ items: string[]; defaultName: string } | null>(null);
    const [zipName, setZipName] = useState('');
    const [isZipping, setIsZipping] = useState(false);
    // Bookmarks state (from database, path-specific)
    const [bookmarks, setBookmarks] = useState<Array<{ id: number; url: string; title: string; folder_path: string; is_global: number }>>([]);
    // Default new pane type from global settings
    const [defaultNewPaneType, setDefaultNewPaneType] = useState<string>('chat');
    // Default new terminal type (system/bash, npcsh, guac)
    const [defaultNewTerminalType, setDefaultNewTerminalType] = useState<string>(() =>
        localStorage.getItem('npcStudio_defaultNewTerminalType') || 'system'
    );
    // Default new document type (docx, xlsx, pptx, mapx)
    const [defaultNewDocumentType, setDefaultNewDocumentType] = useState<string>(() =>
        localStorage.getItem('npcStudio_defaultNewDocumentType') || 'docx'
    );

    // Load default terminal/document types from global settings and listen for changes
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                const data = await (window as any).api.loadGlobalSettings();
                if (data?.global_settings?.default_new_terminal_type) {
                    setDefaultNewTerminalType(data.global_settings.default_new_terminal_type);
                    localStorage.setItem('npcStudio_defaultNewTerminalType', data.global_settings.default_new_terminal_type);
                }
                if (data?.global_settings?.default_new_document_type) {
                    setDefaultNewDocumentType(data.global_settings.default_new_document_type);
                    localStorage.setItem('npcStudio_defaultNewDocumentType', data.global_settings.default_new_document_type);
                }
            } catch (err) {
                console.error('Failed to load default types:', err);
            }
        };
        loadDefaults();

        const handleTerminalTypeChanged = (e: CustomEvent) => {
            if (e.detail) setDefaultNewTerminalType(e.detail);
        };
        const handleDocumentTypeChanged = (e: CustomEvent) => {
            if (e.detail) setDefaultNewDocumentType(e.detail);
        };
        window.addEventListener('defaultTerminalTypeChanged', handleTerminalTypeChanged as EventListener);
        window.addEventListener('defaultDocumentTypeChanged', handleDocumentTypeChanged as EventListener);
        return () => {
            window.removeEventListener('defaultTerminalTypeChanged', handleTerminalTypeChanged as EventListener);
            window.removeEventListener('defaultDocumentTypeChanged', handleDocumentTypeChanged as EventListener);
        };
    }, []);

    // Load bookmarks from database
    const loadBookmarks = useCallback(async () => {
        if (!currentPath) return;
        try {
            const result = await (window as any).api.browserGetBookmarks({ folderPath: currentPath });
            if (result?.success) {
                setBookmarks(result.bookmarks || []);
            }
        } catch (err) {
            console.error('Error loading bookmarks:', err);
        }
    }, [currentPath]);

    useEffect(() => {
        loadBookmarks();
    }, [loadBookmarks]);

    // Website subsection collapse states (persisted to localStorage)
    const [bookmarksCollapsed, setBookmarksCollapsed] = useState(() => localStorage.getItem('sidebar_bookmarksCollapsed') === 'true');
    const [openBrowsersCollapsed, setOpenBrowsersCollapsed] = useState(() => localStorage.getItem('sidebar_openBrowsersCollapsed') === 'true');
    const [commonSitesCollapsed, setCommonSitesCollapsed] = useState(() => localStorage.getItem('sidebar_commonSitesCollapsed') === 'true');
    const [recentHistoryCollapsed, setRecentHistoryCollapsed] = useState(() => localStorage.getItem('sidebar_recentHistoryCollapsed') === 'true');

    // Persist collapse states
    useEffect(() => { localStorage.setItem('sidebar_bookmarksCollapsed', String(bookmarksCollapsed)); }, [bookmarksCollapsed]);
    useEffect(() => { localStorage.setItem('sidebar_openBrowsersCollapsed', String(openBrowsersCollapsed)); }, [openBrowsersCollapsed]);
    useEffect(() => { localStorage.setItem('sidebar_commonSitesCollapsed', String(commonSitesCollapsed)); }, [commonSitesCollapsed]);
    useEffect(() => { localStorage.setItem('sidebar_recentHistoryCollapsed', String(recentHistoryCollapsed)); }, [recentHistoryCollapsed]);

    // Load default new pane type from global settings
    useEffect(() => {
        const loadDefaultPaneType = async () => {
            // First check localStorage for immediate value
            const cached = localStorage.getItem('npcStudio_defaultNewPaneType');
            if (cached) {
                setDefaultNewPaneType(cached);
            }
            // Then load from settings file
            try {
                const data = await (window as any).api.loadGlobalSettings();
                if (data?.global_settings?.default_new_pane_type) {
                    setDefaultNewPaneType(data.global_settings.default_new_pane_type);
                    localStorage.setItem('npcStudio_defaultNewPaneType', data.global_settings.default_new_pane_type);
                }
            } catch (err) {
                console.error('Failed to load default pane type:', err);
            }
        };
        loadDefaultPaneType();

        // Listen for storage changes (when settings are saved from other tabs)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'npcStudio_defaultNewPaneType' && e.newValue) {
                setDefaultNewPaneType(e.newValue);
            }
        };
        // Listen for custom event (same window updates)
        const handleCustomEvent = (e: CustomEvent) => {
            if (e.detail) {
                setDefaultNewPaneType(e.detail);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('defaultPaneTypeChanged', handleCustomEvent as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('defaultPaneTypeChanged', handleCustomEvent as EventListener);
        };
    }, []);

    // Limit input dialog state
    const [limitDialog, setLimitDialog] = useState<{ domain: string; hourlyTime: string; dailyTime: string; hourlyVisits: string; dailyVisits: string } | null>(null);

    // Permission dialog state (chmod/chown)
    const [permissionDialog, setPermissionDialog] = useState<{ path: string; type: 'chmod' | 'chown'; mode?: string; owner?: string; group?: string; recursive?: boolean; useSudo?: boolean } | null>(null);

    // Tile configuration state
    interface TileConfig {
        id: string;
        label: string;
        icon: string;
        enabled: boolean;
        order: number;
        subTypes?: string[];
    }
    const [tilesConfig, setTilesConfig] = useState<{ tiles: TileConfig[]; customTiles: TileConfig[] }>({
        tiles: [
            { id: 'theme', label: 'Theme', icon: 'theme', enabled: true, order: 0 },
            { id: 'chat', label: 'Chat', icon: 'plus', enabled: true, order: 1 },
            { id: 'folder', label: 'Folder', icon: 'folder', enabled: true, order: 2 },
            { id: 'browser', label: 'Browser', icon: 'globe', enabled: true, order: 3 },
            { id: 'terminal', label: 'Terminal', icon: 'terminal', enabled: true, order: 4, subTypes: ['system', 'npcsh', 'guac'] },
            { id: 'code', label: 'Code', icon: 'code', enabled: true, order: 5 },
            { id: 'document', label: 'Doc', icon: 'file-text', enabled: true, order: 6, subTypes: ['docx', 'xlsx', 'pptx', 'mapx'] },
            { id: 'workspace', label: 'Incognide', icon: 'incognide', enabled: true, order: 7 }
        ],
        customTiles: []
    });
    const [tileEditMode, setTileEditMode] = useState(false);
    const [bottomGridEditMode, setBottomGridEditMode] = useState(false);
    // Tile jinx state - loaded from ~/.npcsh/incognide/tiles/*.jinx
    const [tileJinxes, setTileJinxes] = useState<Array<{
        filename: string;
        jinx_name: string;
        label: string;
        icon: string;
        order: number;
        enabled: boolean;
        action?: string;
        rawContent: string;
    }>>([]);
    const [tileJinxesLoaded, setTileJinxesLoaded] = useState(false);
    const [editingTileJinx, setEditingTileJinx] = useState<string | null>(null);
    const [draggedTileIdx, setDraggedTileIdx] = useState<number | null>(null);
    const [tileJinxEditContent, setTileJinxEditContent] = useState('');
    const [showLivePreview, setShowLivePreview] = useState(false);
    const [livePreviewCode, setLivePreviewCode] = useState('');

    // Fallback config (used until jinxes load)
    const [bottomGridConfig, setBottomGridConfig] = useState([
        { id: 'db', label: 'DB Tool', icon: 'Database', enabled: true, order: 0 },
        { id: 'photo', label: 'Photo', icon: 'Image', enabled: true, order: 1 },
        { id: 'library', label: 'Library', icon: 'BookOpen', enabled: true, order: 2 },
        { id: 'datadash', label: 'Data Dash', icon: 'BarChart3', enabled: true, order: 3 },
        { id: 'graph', label: 'Graph', icon: 'GitBranch', enabled: true, order: 4 },
        { id: 'browsergraph', label: 'Browser Graph', icon: 'Network', enabled: true, order: 5 },
        { id: 'team', label: 'Team', icon: 'Users', enabled: true, order: 6 },
        { id: 'npc', label: 'NPCs', icon: 'Bot', enabled: true, order: 7 },
        { id: 'jinx', label: 'Jinxs', icon: 'Zap', enabled: true, order: 8 },
        { id: 'settings', label: 'Settings', icon: 'Settings', enabled: true, order: 9 },
        { id: 'env', label: 'Env', icon: 'KeyRound', enabled: true, order: 10 },
        { id: 'disk', label: 'Disk', icon: 'HardDrive', enabled: true, order: 11 },
    ]);
    const [draggedBottomTileId, setDraggedBottomTileId] = useState<string | null>(null);
    const [draggedTileId, setDraggedTileId] = useState<string | null>(null);

    // Load tile configuration on mount
    useEffect(() => {
        const loadTilesConfig = async () => {
            try {
                const config = await (window as any).api?.tilesConfigGet?.();
                if (config) {
                    setTilesConfig(config);
                }
            } catch (err) {
                console.error('Failed to load tiles config:', err);
            }
        };
        loadTilesConfig();
    }, []);

    // Load tile jinxes on mount
    useEffect(() => {
        const loadTileJinxes = async () => {
            try {
                const result = await (window as any).api?.tileJinxList?.();
                if (result?.success && result.tiles) {
                    const parsed = result.tiles.map((tile: { filename: string; content: string }) => {
                        const content = tile.content;
                        let jinx_name = '', label = '', icon = '', order = 0, enabled = true;

                        // Try JSDoc format first: @key value
                        let jinxMatch = content.match(/@jinx\s+(\S+)/);
                        let labelMatch = content.match(/@label\s+(.+)/);
                        let iconMatch = content.match(/@icon\s+(\S+)/);
                        let orderMatch = content.match(/@order\s+(\d+)/);
                        let enabledMatch = content.match(/@enabled\s+(\S+)/);

                        // Fallback to old # comment format: # key: value
                        if (!labelMatch) {
                            const oldLabel = content.match(/^#\s*label:\s*(.+)/m);
                            if (oldLabel) label = oldLabel[1].trim();
                        }
                        if (!iconMatch) {
                            const oldIcon = content.match(/^#\s*icon:\s*(\S+)/m);
                            if (oldIcon) icon = oldIcon[1].trim();
                        }
                        if (!orderMatch) {
                            const oldOrder = content.match(/^#\s*order:\s*(\d+)/m);
                            if (oldOrder) order = parseInt(oldOrder[1]) || 0;
                        }
                        if (!enabledMatch) {
                            const oldEnabled = content.match(/^#\s*enabled:\s*(\S+)/m);
                            if (oldEnabled) enabled = oldEnabled[1].trim() !== 'false';
                        }
                        if (!jinxMatch) {
                            const oldJinx = content.match(/^#\s*jinx_name:\s*(\S+)/m);
                            if (oldJinx) jinx_name = oldJinx[1].trim();
                        }

                        if (jinxMatch) jinx_name = jinxMatch[1].trim();
                        if (labelMatch) label = labelMatch[1].trim();
                        if (iconMatch) icon = iconMatch[1].trim();
                        if (orderMatch) order = parseInt(orderMatch[1]) || 0;
                        if (enabledMatch) enabled = enabledMatch[1].trim() !== 'false';

                        // Derive action from filename (db.jinx -> db)
                        const action = tile.filename.replace('.jinx', '');

                        return {
                            filename: tile.filename,
                            jinx_name,
                            label: label || action,
                            icon: icon || 'Box',
                            order,
                            enabled,
                            action,
                            rawContent: tile.content
                        };
                    });

                    // Filter out example/disabled and sort
                    setTileJinxes(parsed.filter((t: any) => !t.filename.startsWith('_')).sort((a: any, b: any) => a.order - b.order));
                    setTileJinxesLoaded(true);
                }
            } catch (err) {
                console.error('Failed to load tile jinxes:', err);
            }
        };
        loadTileJinxes();
    }, []);

    // Save a tile jinx after editing
    const saveTileJinx = useCallback(async (filename: string, content: string) => {
        try {
            await (window as any).api?.tileJinxWrite?.(filename, content);
            // Reload jinxes
            const result = await (window as any).api?.tileJinxList?.();
            if (result?.success && result.tiles) {
                const parsed = result.tiles.map((tile: { filename: string; content: string }) => {
                    const content = tile.content;
                    let jinx_name = '', label = '', icon = '', order = 0, enabled = true;

                    // Try JSDoc format: @key value
                    let m = content.match(/@jinx\s+(\S+)/); if (m) jinx_name = m[1].trim();
                    m = content.match(/@label\s+(.+)/); if (m) label = m[1].trim();
                    m = content.match(/@icon\s+(\S+)/); if (m) icon = m[1].trim();
                    m = content.match(/@order\s+(\d+)/); if (m) order = parseInt(m[1]) || 0;
                    m = content.match(/@enabled\s+(\S+)/); if (m) enabled = m[1].trim() !== 'false';

                    // Fallback to old # format
                    if (!label) { m = content.match(/^#\s*label:\s*(.+)/m); if (m) label = m[1].trim(); }
                    if (!icon) { m = content.match(/^#\s*icon:\s*(\S+)/m); if (m) icon = m[1].trim(); }
                    if (!order) { m = content.match(/^#\s*order:\s*(\d+)/m); if (m) order = parseInt(m[1]) || 0; }
                    if (!jinx_name) { m = content.match(/^#\s*jinx_name:\s*(\S+)/m); if (m) jinx_name = m[1].trim(); }

                    const action = tile.filename.replace('.jinx', '');
                    return { filename: tile.filename, jinx_name, label: label || action, icon: icon || 'Box', order, enabled, action, rawContent: tile.content };
                });
                setTileJinxes(parsed.filter((t: any) => !t.filename.startsWith('_')).sort((a: any, b: any) => a.order - b.order));
            }
            setEditingTileJinx(null);
            setTileJinxEditContent('');
            setBottomGridEditMode(false);
        } catch (err) {
            console.error('Failed to save tile jinx:', err);
        }
    }, []);

    // Reorder tiles via drag and drop
    const handleTileReorder = useCallback(async (fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        const newTiles = [...tileJinxes];
        const [moved] = newTiles.splice(fromIdx, 1);
        newTiles.splice(toIdx, 0, moved);

        // Update order values in each tile's metadata and save
        for (let i = 0; i < newTiles.length; i++) {
            const tile = newTiles[i];
            // Update order in the rawContent header
            // Update order - try JSDoc format first, then old # format
            let updatedContent = tile.rawContent;
            if (/@order\s+\d+/.test(updatedContent)) {
                updatedContent = updatedContent.replace(/(@order\s+)\d+/, `$1${i}`);
            } else {
                updatedContent = updatedContent.replace(/^(#\s*order:\s*)\d+/m, `$1${i}`);
            }
            tile.order = i;
            tile.rawContent = updatedContent;
            await (window as any).api?.tileJinxWrite?.(tile.filename, updatedContent);
        }
        setTileJinxes(newTiles);
        setDraggedTileIdx(null);
    }, [tileJinxes]);

    // Compile TSX and prepare for react-live preview
    const compileForPreview = useCallback(async (code: string): Promise<string> => {
        try {
            // Find the EXPORTED component name BEFORE stripping exports
            // Look for "export default ComponentName" at end of file
            const exportDefaultMatch = code.match(/export\s+default\s+(\w+)\s*;?\s*$/m);
            // Or "export default function/const ComponentName"
            const exportDefaultFuncMatch = code.match(/export\s+default\s+(?:function|const)\s+(\w+)/);

            let componentName = exportDefaultMatch?.[1] || exportDefaultFuncMatch?.[1];

            // Fallback: find first component definition
            if (!componentName) {
                const funcMatch = code.match(/(?:const|function)\s+(\w+)\s*(?::\s*React\.FC)?[=(:]/);
                componentName = funcMatch?.[1] || 'Component';
            }

            console.log('[PREVIEW] Detected component:', componentName);

            // Remove JSDoc metadata and imports
            let cleaned = code.replace(/\/\*\*[\s\S]*?\*\/\s*\n?/, '');
            cleaned = cleaned.replace(/^#[^\n]*\n/gm, '');
            cleaned = cleaned.replace(/^import\s+.*?['"];?\s*$/gm, '');
            cleaned = cleaned.replace(/^export\s+(default\s+)?/gm, '');

            // Compile TypeScript to JavaScript via IPC
            const result = await (window as any).api?.transformTsx?.(cleaned);
            if (!result?.success) {
                return `render(<div className="p-4 text-red-400">Compile Error: ${result?.error || 'Unknown error'}</div>)`;
            }

            let compiled = result.output || '';
            if (!compiled) {
                return `render(<div className="p-4 text-red-400">No output from compiler</div>)`;
            }
            // Remove module system artifacts
            compiled = compiled.replace(/["']use strict["'];?\n?/g, '');
            compiled = compiled.replace(/Object\.defineProperty\(exports[\s\S]*?\);/g, '');
            compiled = compiled.replace(/exports\.\w+\s*=\s*/g, '');
            compiled = compiled.replace(/exports\.default\s*=\s*\w+;?/g, '');
            // Remove require() calls - dependencies come from scope
            compiled = compiled.replace(/(?:var|const|let)\s+\w+\s*=\s*require\([^)]+\);?\n?/g, '');
            compiled = compiled.replace(/require\([^)]+\)/g, '{}');
            // Replace module prefixes like lucide_react_1.Play with just Play
            compiled = compiled.replace(/\w+_\d+\.(\w+)/g, '$1');
            // Also handle react_1.useState etc
            compiled = compiled.replace(/react_1\.(\w+)/g, '$1');

            // Add render call with realistic props - embedded:true to prevent modal wrapper
            const mockProps = `{
                onClose: () => console.log('Preview: onClose called'),
                isPane: true,
                isOpen: true,
                isModal: false,
                embedded: true,
                projectPath: '/mock',
                currentPath: '/mock',
                theme: { bg: '#1a1a2e', fg: '#fff', accent: '#4a9eff' }
            }`;
            const finalCode = `${compiled}\n\nrender(<${componentName} {...${mockProps}} />)`;
            console.log('[PREVIEW] Compiled code (first 500 chars):', finalCode.slice(0, 500));
            return finalCode;
        } catch (err: any) {
            return `render(<div className="p-4 text-red-400">Error: ${err.message}</div>)`;
        }
    }, []);

    // Toggle live preview
    const toggleLivePreview = useCallback(async () => {
        if (!showLivePreview) {
            setLivePreviewCode('render(<div className="p-4 text-gray-400">Compiling...</div>)');
            setShowLivePreview(true);
            const compiled = await compileForPreview(tileJinxEditContent);
            setLivePreviewCode(compiled);
        } else {
            setShowLivePreview(false);
        }
    }, [showLivePreview, tileJinxEditContent, compileForPreview]);

    // Update preview when code changes (debounced)
    useEffect(() => {
        if (showLivePreview && tileJinxEditContent) {
            const timeoutId = setTimeout(async () => {
                const compiled = await compileForPreview(tileJinxEditContent);
                setLivePreviewCode(compiled);
            }, 800); // debounce
            return () => clearTimeout(timeoutId);
        }
    }, [tileJinxEditContent, showLivePreview, compileForPreview]);

    // Live preview scope - REAL components and REAL window.api
    const liveScope = useMemo(() => ({
        // React
        React,
        useState,
        useEffect,
        useCallback,
        useRef,
        useMemo,
        useLayoutEffect: React.useLayoutEffect,
        useContext: React.useContext,
        createContext: React.createContext,
        forwardRef: React.forwardRef,
        memo: React.memo,
        Fragment: React.Fragment,
        // REAL npcts components
        Modal, Tabs, Card, Button, Input, Select,
        // ALL REAL tile components - exactly what gets rendered
        DiskUsageAnalyzer,
        AutosizeTextarea,
        ForceGraph2D,
        ActivityIntelligence,
        BrowserHistoryWeb,
        CtxEditor,
        JinxMenu,
        KnowledgeGraphEditor,
        LabeledDataManager,
        McpServerMenu,
        MemoryManagement,
        MessageLabeling,
        NPCTeamMenu,
        PythonEnvSettings,
        DBTool,
        DataDash,
        LibraryViewer,
        GraphViewer,
        PhotoViewer,
        SettingsMenu,
        SettingsPanel: SettingsMenu, // alias
        // ALL lucide icons
        Database, Image, BookOpen, BarChart3, GitBranch, Network, Users, Bot, Zap,
        Settings, KeyRound, HardDrive, Box, Folder, File, Globe, ChevronRight, Edit,
        Terminal, Trash, Plus, X, Star, Clock, Activity, Lock, Archive, Sparkles,
        ChevronDown, ChevronUp, Play, GripVertical, Search, RefreshCw, Download,
        Upload, Copy, Check, AlertCircle, Info, Eye, EyeOff, Moon, Sun, Palette,
        Code, Save, FolderOpen, FileText, Home, ArrowLeft, ArrowRight, Menu, MoreVertical,
        Loader2, ExternalLink, Link, Unlink, Filter, SortAsc, SortDesc, Table, Grid,
        List, Maximize2, Minimize2, Move, RotateCcw, ZoomIn, ZoomOut, Layers, Layout,
        Pause, Server, Mail, Cpu, Wifi, WifiOff, Power, PowerOff, Hash, AtSign,
        FileJson, Wrench, Code2, FileStack, Share2, Tag, MessageSquare, ArrowUp,
        // Icon aliases
        DownloadCloud: Download, Trash2: Trash, Square: Box, Volume2: Activity, Mic: Activity, Keyboard: Settings,
        // REAL window with REAL api
        window,
        // Console
        console,
    }), []);

    // Save tile configuration
    const saveTilesConfig = useCallback(async (newConfig: typeof tilesConfig) => {
        try {
            await (window as any).api?.tilesConfigSave?.(newConfig);
            setTilesConfig(newConfig);
        } catch (err) {
            console.error('Failed to save tiles config:', err);
        }
    }, []);

    // Toggle tile enabled/disabled
    const toggleTileEnabled = useCallback((tileId: string) => {
        const newConfig = { ...tilesConfig };
        const tile = newConfig.tiles.find(t => t.id === tileId);
        if (tile) {
            tile.enabled = !tile.enabled;
            saveTilesConfig(newConfig);
        }
    }, [tilesConfig, saveTilesConfig]);

    // Reorder tiles via drag and drop
    const handleTileDragStart = useCallback((e: React.DragEvent, tileId: string) => {
        setDraggedTileId(tileId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleTileDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleTileDrop = useCallback((e: React.DragEvent, targetTileId: string) => {
        e.preventDefault();
        if (!draggedTileId || draggedTileId === targetTileId) return;

        const newConfig = { ...tilesConfig };
        const allTiles = [...newConfig.tiles];
        const draggedIndex = allTiles.findIndex(t => t.id === draggedTileId);
        const targetIndex = allTiles.findIndex(t => t.id === targetTileId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedTile] = allTiles.splice(draggedIndex, 1);
            allTiles.splice(targetIndex, 0, draggedTile);
            // Update order values
            allTiles.forEach((tile, idx) => { tile.order = idx; });
            newConfig.tiles = allTiles;
            saveTilesConfig(newConfig);
        }
        setDraggedTileId(null);
    }, [draggedTileId, tilesConfig, saveTilesConfig]);

    // Get sorted enabled tiles
    const enabledTiles = useMemo(() => {
        return [...tilesConfig.tiles, ...tilesConfig.customTiles]
            .filter(t => t.enabled)
            .sort((a, b) => a.order - b.order);
    }, [tilesConfig]);

// ===== ALL THE SIDEBAR FUNCTIONS BELOW =====

const handleSidebarResize = useCallback((e) => {
    if (!isResizingSidebar) return;

    const newWidth = e.clientX;
    // Constrain between 150px and 500px
    if (newWidth >= 150 && newWidth <= 500) {
        setSidebarWidth(newWidth);
    }
}, [isResizingSidebar, setSidebarWidth]);

const handleApplyPromptToFiles = async (operationType, customPrompt = '') => {
    const selectedFilePaths = Array.from(selectedFiles);
    if (selectedFilePaths.length === 0) return;

    try {
       
        const filesContentPromises = selectedFilePaths.map(async (filePath) => {
            const response = await window.api.readFileContent(filePath);
            if (response.error) {
                console.warn(`Could not read file ${filePath}:`, response.error);
                return `File (${filePath.split('/').pop()}): [Error reading content]`;
            }
            const fileName = filePath.split('/').pop();
            return `File (${fileName}):\n---\n${response.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);

        let prompt = '';
        switch (operationType) {
            case 'summarize':
                prompt = `Summarize the content of these ${selectedFilePaths.length} file(s):\n\n`;
                break;
           
            default:
                 prompt = customPrompt + `\n\nApply this to these ${selectedFilePaths.length} file(s):\n\n`;
                 break;
        }
        const fullPrompt = prompt + filesContent.join('\n\n');

        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();

        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create and retrieve new conversation pane details.');
        }

        const paneData = contentDataRef.current[newPaneId];
        if (!paneData || paneData.contentType !== 'chat') {
            throw new Error("Target pane is not a chat pane.");
        }

        const newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = newPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        const userMessage = { id: generateId(), role: 'user', content: fullPrompt, timestamp: new Date().toISOString() };
        const assistantPlaceholderMessage = { id: newStreamId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString(), streamId: newStreamId, model: currentModel, npc: currentNPC };

        paneData.chatMessages.allMessages.push(userMessage, assistantPlaceholderMessage);
        paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-paneData.chatMessages.displayedMessageCount);

        setRootLayoutNode(prev => ({ ...prev }));


        await window.api.executeCommandStream({
            commandstr: fullPrompt,
            currentPath,
            conversationId: newConversation.id,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId,
            executionMode,
            mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
            selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
        });

    } catch (err) {
        console.error('Error processing files:', err);
        setError(err.message);
        setIsStreaming(false);
    } finally {
        setSelectedFiles(new Set());
        setFileContextMenuPos(null);
    }
};

const handleApplyPromptToFilesInInput = async (operationType, customPrompt = '') => {
    const selectedFilePaths = Array.from(selectedFiles);
    if (selectedFilePaths.length === 0) return;
    
    try {
        const filesContentPromises = selectedFilePaths.map(async (filePath, index) => {
            const response = await window.api.readFileContent(filePath);
            if (response.error) {
                console.warn(`Could not read file ${filePath}:`, response.error);
                return `File ${index + 1} (${filePath}): [Error reading content: ${response.error}]`;
            }
            const fileName = filePath.split('/').pop();
            return `File ${index + 1} (${fileName}):\n---\n${response.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);
        
        let prompt = '';
        switch (operationType) {
            case 'summarize':
                prompt = `Summarize the content of these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'analyze':
                prompt = `Analyze the content of these ${selectedFilePaths.length} file(s) for key insights:\n\n`;
                break;
            case 'refactor':
                prompt = `Refactor and improve the code in these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'document':
                prompt = `Generate documentation for these ${selectedFilePaths.length} file(s):\n\n`;
                break;
            case 'custom':
                prompt = customPrompt + `\n\nApply this to these ${selectedFilePaths.length} file(s):\n\n`;
                break;
        }

        const fullPrompt = prompt + filesContent.join('\n\n');

        if (!activeConversationId) {
            await createNewConversation();
        }

        setInput(fullPrompt);
        
    } catch (err) {
        console.error('Error preparing file prompt for input field:', err);
        setError(err.message);
    } finally {
        setSelectedFiles(new Set());
        setFileContextMenuPos(null);
    }
};

const handleFileContextMenu = (e, filePath) => {
    e.preventDefault();
    if (!selectedFiles.has(filePath) && selectedFiles.size > 0) {
        setSelectedFiles(prev => new Set([...prev, filePath]));
    } else if (selectedFiles.size === 0) {
        setSelectedFiles(new Set([filePath]));
    }
    setFileContextMenuPos({ x: e.clientX, y: e.clientY, filePath });
};

const handleOpenFolderAsWorkspace = useCallback(async (folderPath) => {
    console.log(`[handleOpenFolderAsWorkspace] Received folderPath: "${folderPath}", currentPath: "${currentPath}"`);
    if (folderPath === currentPath) {
        console.log("Already in this workspace, no need to switch!");
        setSidebarItemContextMenuPos(null);
        return;
    }
    // If folderPath doesn't start with /, it's a relative path - make it absolute
    let fullPath = folderPath;
    if (!folderPath.startsWith('/') && currentPath) {
        fullPath = `${currentPath}/${folderPath}`;
        console.log(`[handleOpenFolderAsWorkspace] Converted relative path to absolute: "${fullPath}"`);
    }
    console.log(`Opening folder as workspace: ${fullPath}`);
    await switchToPath(fullPath);
    setSidebarItemContextMenuPos(null);
}, [currentPath, switchToPath]);

const handleSidebarItemContextMenu = (e, path, type, isInaccessible = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'file' && !selectedFiles.has(path)) {
        setSelectedFiles(new Set([path]));
    }
    setSidebarItemContextMenuPos({ x: e.clientX, y: e.clientY, path, type, isInaccessible });
};

const handleAnalyzeInDashboard = () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    console.log(`Analyzing ${selectedIds.length} conversations in dashboard.`);
    setDashboardMenuOpen(true);
    setContextMenuPos(null);
};

const handleSummarizeAndStart = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create new conversation');
        }

        const paneData = contentDataRef.current[newPaneId];
        if (!paneData || paneData.contentType !== 'chat') {
            throw new Error("Target pane is not a chat pane.");
        }

        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                console.warn(`Could not fetch messages for conversation ${id}`);
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');

        const newStreamId = generateId();
        streamToPaneRef.current[newStreamId] = newPaneId;
        setIsStreaming(true);

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        const userMessage = { id: generateId(), role: 'user', content: fullPrompt, timestamp: new Date().toISOString() };
        const assistantPlaceholderMessage = { id: newStreamId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date().toISOString(), streamId: newStreamId, model: currentModel, npc: currentNPC };

        paneData.chatMessages.allMessages.push(userMessage, assistantPlaceholderMessage);
        paneData.chatMessages.messages = paneData.chatMessages.allMessages.slice(-paneData.chatMessages.displayedMessageCount);
        setRootLayoutNode(prev => ({ ...prev }));

        await window.api.executeCommandStream({
            commandstr: fullPrompt,
            currentPath,
            conversationId: newConversation.id,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId,
            executionMode,
            mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
            selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
        });
    } catch (err) {
        console.error('Error summarizing:', err);
        setError(err.message);
        setIsStreaming(false);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSummarizeAndDraft = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                console.warn(`Could not fetch messages for conversation ${id}`);
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const fullPrompt = `Please provide a concise summary of the following ${selectedIds.length} conversation(s):\n\n` + convosContent.join('\n\n');
        setInput(fullPrompt);
    } catch (err) {
        console.error('Error summarizing for draft:', err);
        setError(err.message);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSummarizeAndPrompt = async () => {
    const selectedIds = Array.from(selectedConvos);
    if (selectedIds.length === 0) return;
    setContextMenuPos(null);

    try {
        const { conversation: newConversation, paneId: newPaneId } = await createNewConversation();
        if (!newConversation || !newPaneId) {
            throw new Error('Failed to create new conversation');
        }

        const paneData = contentDataRef.current[newPaneId];
        const convosContentPromises = selectedIds.map(async (id, index) => {
            const messages = await window.api.getConversationMessages(id);
            if (!Array.isArray(messages)) {
                return `Conversation ${index + 1} (ID: ${id}): [Error fetching content]`;
            }
            const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            return `Conversation ${index + 1} (ID: ${id}):\n---\n${messagesText}\n---`;
        });
        const convosContent = await Promise.all(convosContentPromises);
        const customPrompt = 'Provide a detailed analysis of the key themes and insights from these conversations';
        const fullPrompt = `${customPrompt}\n\nConversations to analyze:\n\n` + convosContent.join('\n\n');
        setInput(fullPrompt);
    } catch (err) {
        console.error('Error:', err);
        setError(err.message);
    } finally {
        setSelectedConvos(new Set());
    }
};

const handleSidebarItemDelete = async () => {
    if (!sidebarItemContextMenuPos) return;
    const { path, type } = sidebarItemContextMenuPos;
    
   
    const confirmation = window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`);
    if (!confirmation) {
        setSidebarItemContextMenuPos(null);
        return;
    }

    try {
        let response;
        if (type === 'file') {
            response = await window.api.deleteFile(path);
        } else if (type === 'directory') {
            response = await window.api.deleteDirectory(path);
        }

        if (response?.error) throw new Error(response.error);
        
        await loadDirectoryStructure(currentPath);

    } catch (err) {
        setError(`Failed to delete: ${err.message}`);
    } finally {
        setSidebarItemContextMenuPos(null);
    }
};

const handleSidebarRenameStart = () => {
    if (!sidebarItemContextMenuPos) return;
    const { path } = sidebarItemContextMenuPos;
    const currentName = path.split('/').pop();

    setRenamingPath(path);
    setEditedSidebarItemName(currentName);
    setSidebarItemContextMenuPos(null);
};

const handleZipItems = () => {
    if (!sidebarItemContextMenuPos) return;
    const { path: itemPath } = sidebarItemContextMenuPos;

    // Get all selected items or just the right-clicked one
    const selectedFilePaths = Array.from(selectedFiles);
    const itemsToZip = selectedFilePaths.length > 0 ? selectedFilePaths : [itemPath];

    // Generate default name
    const defaultName = itemsToZip.length === 1
        ? itemsToZip[0].split('/').pop()?.replace(/\.[^/.]+$/, '') || 'archive'
        : 'archive';

    // Show modal
    setZipName(defaultName);
    setZipModal({ items: itemsToZip, defaultName });
    setSidebarItemContextMenuPos(null);
};

const executeZip = async () => {
    if (!zipModal) return;

    const itemsToZip = zipModal.items;
    const name = zipName;

    setIsZipping(true);

    try {
        const response = await (window as any).api.zipItems(itemsToZip, name);
        if (response?.error) throw new Error(response.error);

        // Refresh to show the new zip file
        await refreshDirectoryStructureOnly();
    } catch (err: any) {
        setError(`Failed to create zip: ${err.message}`);
    } finally {
        setIsZipping(false);
        setZipModal(null);
        setZipName('');
    }
};

const handleFolderOverview = async () => {
    if (!sidebarItemContextMenuPos || sidebarItemContextMenuPos.type !== 'directory') return;
    const { path } = sidebarItemContextMenuPos;
    setSidebarItemContextMenuPos(null);

    try {
       
        const response = await window.api.getDirectoryContentsRecursive(path);
        if (response.error) throw new Error(response.error);
        if (response.files.length === 0) {
            setError("This folder contains no files to analyze.");
            return;
        }

       
        const filesContentPromises = response.files.map(async (filePath) => {
            const fileResponse = await window.api.readFileContent(filePath);
            const fileName = filePath.split('/').pop();
            return fileResponse.error 
                ? `File (${fileName}): [Error reading content]`
                : `File (${fileName}):\n---\n${fileResponse.content}\n---`;
        });
        const filesContent = await Promise.all(filesContentPromises);
        
        const fullPrompt = `Provide a high-level overview of the following ${response.files.length} file(s) from the '${path.split('/').pop()}' folder:\n\n` + filesContent.join('\n\n');

        const { conversation, paneId } = await createNewConversation();
        if (!conversation) throw new Error("Failed to create conversation for overview.");

       
        handleInputSubmit(new Event('submit'), fullPrompt, paneId, conversation.id);

    } catch (err) {
        setError(`Failed to get folder overview: ${err.message}`);
    }
};

const renderActiveWindowsIndicator = () => {
    const [otherWindows, setOtherWindows] = useState([]);
    
    useEffect(() => {
        const checkOtherWindows = () => {
            try {
                const activeWindows = JSON.parse(localStorage.getItem(ACTIVE_WINDOWS_KEY) || '{}');
                const now = Date.now();
                const others = Object.entries(activeWindows)
                    .filter(([wId]) => wId !== windowId) // Not this window
                    .filter(([, data]) => !data.closing) // Not marked as closing
                    .filter(([, data]) => (now - data.lastActive) < 30000) // Active in last 30 seconds
                    .map(([wId, data]) => ({
                        id: wId,
                        path: data.currentPath,
                        lastActive: data.lastActive
                    }));
                setOtherWindows(others);
            } catch (error) {
                console.error('Error checking other windows:', error);
                setOtherWindows([]);
            }
        };
        
        checkOtherWindows();
        const interval = setInterval(checkOtherWindows, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, [windowId]);
    
    // Don't render if no other windows - this prevents the "Other Windows (1)" issue
    if (otherWindows.length === 0) return null;
    
    return (
        <div className="px-4 py-2 border-b theme-border">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setActiveWindowsExpanded(!activeWindowsExpanded)}
            >
                <div className="text-xs theme-text-muted">
                    Other Windows ({otherWindows.length})
                </div>
                <ChevronRight 
                    size={12} 
                    className={`transform transition-transform ${activeWindowsExpanded ? 'rotate-90' : ''}`} 
                />
            </div>
            
            {activeWindowsExpanded && (
                <div className="mt-1 pl-2 space-y-1">
                    {otherWindows.map(window => (
                        <div key={window.id} className="text-xs theme-text-muted truncate">
                            📁 {window.path?.split('/').pop() || 'No folder'}
                            <span className="text-gray-600 ml-2">
                                ({Math.round((Date.now() - window.lastActive) / 1000)}s ago)
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const renderWorkspaceIndicator = () => {
    // Debug logging
    console.log('contentDataRef.current:', contentDataRef.current);
    console.log('Object.keys(contentDataRef.current):', Object.keys(contentDataRef.current));
    console.log('rootLayoutNode:', rootLayoutNode);
    
    // Check if current path has a saved workspace
    const allWorkspaces = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
    const windowWorkspaces = allWorkspaces[windowId] || {};
    const hasWorkspace = !!windowWorkspaces[currentPath];
    
    // Count ONLY currently active panes
    const activePaneCount = Object.keys(contentDataRef.current).length;
    
    // Let's also count from the layout tree to double-check
    const countPanesInLayout = (node) => {
        if (!node) return 0;
        if (node.type === 'content') return 1;
        if (node.type === 'split') {
            return node.children.reduce((count, child) => count + countPanesInLayout(child), 0);
        }
        return 0;
    };
    const layoutPaneCount = countPanesInLayout(rootLayoutNode);
    
    console.log('activePaneCount from contentDataRef:', activePaneCount);
    console.log('layoutPaneCount from rootLayoutNode:', layoutPaneCount);
    
    const workspaceData = windowWorkspaces[currentPath];
    const workspaceInfo = workspaceData ? {
        paneCount: layoutPaneCount, // Use the layout count instead
        lastSaved: new Date(workspaceData.lastAccessed).toLocaleTimeString(),
        timestamp: workspaceData.timestamp
    } : null;
    
    return (
        <div className="px-4 py-2 border-b theme-border">
            <div 
                className="flex items-center justify-between cursor-pointer" 
                onClick={() => setWorkspaceIndicatorExpanded(!workspaceIndicatorExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hasWorkspace ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-xs theme-text-muted">
                        {hasWorkspace ? `Workspace (${layoutPaneCount} panes)` : 'No Workspace'}
                    </span>
                </div>
                <ChevronRight 
                    size={12} 
                    className={`transform transition-transform ${workspaceIndicatorExpanded ? 'rotate-90' : ''}`} 
                />
            </div>
            
            {workspaceIndicatorExpanded && (
                <div className="mt-2 pl-4 space-y-2">
                    <div className="text-xs theme-text-muted">
                        Layout panes: {layoutPaneCount} | ContentData panes: {activePaneCount}
                    </div>
                    {hasWorkspace ? (
                        <>
                            <div className="text-xs theme-text-muted">
                                Last saved: {workspaceInfo?.lastSaved}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const workspaceData = serializeWorkspace();
                                        if (workspaceData) {
                                            saveWorkspaceToStorage(currentPath, workspaceData);
                                            setRootLayoutNode(p => ({ ...p }));
                                        }
                                    }}
                                    className="text-xs theme-button theme-hover px-2 py-1 rounded"
                                    title="Save current workspace"
                                >
                                    Save Now
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Clear workspace AND clean up contentDataRef
                                        const stored = JSON.parse(localStorage.getItem(WINDOW_WORKSPACES_KEY) || '{}');
                                        if (stored[windowId] && stored[windowId][currentPath]) {
                                            delete stored[windowId][currentPath];
                                            localStorage.setItem(WINDOW_WORKSPACES_KEY, JSON.stringify(stored));
                                        }
                                        
                                        // Clean up phantom panes in contentDataRef
                                        const validPaneIds = new Set();
                                        const collectPaneIds = (node) => {
                                            if (!node) return;
                                            if (node.type === 'content') validPaneIds.add(node.id);
                                            if (node.type === 'split') {
                                                node.children.forEach(collectPaneIds);
                                            }
                                        };
                                        collectPaneIds(rootLayoutNode);
                                        
                                        // Remove any contentDataRef entries that don't exist in the layout
                                        Object.keys(contentDataRef.current).forEach(paneId => {
                                            if (!validPaneIds.has(paneId)) {
                                                delete contentDataRef.current[paneId];
                                            }
                                        });
                                        
                                        setRootLayoutNode(p => ({ ...p }));
                                    }}
                                    className="text-xs theme-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded"
                                    title="Clear saved workspace and clean up phantom panes"
                                >
                                    Clear & Clean
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const workspaceData = serializeWorkspace();
                                if (workspaceData) {
                                    saveWorkspaceToStorage(currentPath, workspaceData);
                                    setRootLayoutNode(p => ({ ...p }));
                                }
                            }}
                            className="text-xs theme-button theme-hover px-2 py-1 rounded"
                            title="Save current layout as workspace"
                        >
                            Save Current Layout
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
    const deleteSelectedConversations = async () => {
    const selectedConversationIds = Array.from(selectedConvos);
    const selectedFilePaths = Array.from(selectedFiles);
    
    if (selectedConversationIds.length === 0 && selectedFilePaths.length === 0) {
        return;
    }
    
    try {
        
        if (selectedConversationIds.length > 0) {
            console.log('Deleting conversations from database:', selectedConversationIds);
            await Promise.all(selectedConversationIds.map(id => window.api.deleteConversation(id)));
        }
        
        if (selectedFilePaths.length > 0) {
            console.log('Deleting files from filesystem:', selectedFilePaths);
            await Promise.all(selectedFilePaths.map(filePath => window.api.deleteFile(filePath)));
        }

        
        await loadDirectoryStructure(currentPath);

    } catch (err) {
        console.error('Error deleting items:', err);
        setError(err.message);
    } finally {
        
        setSelectedConvos(new Set());
        setSelectedFiles(new Set());
    }
    };

const handleRefreshFilesAndFolders = () => {
    if (currentPath) {
        refreshDirectoryStructureOnly();
    }
};

const refreshDirectoryStructureOnly = async () => {
    try {
        if (!currentPath) {
            console.error('No directory path provided');
            return {};
        }
        const structureResult = await window.api.readDirectoryStructure(currentPath);
        if (structureResult && !structureResult.error) {
            setFolderStructure(structureResult);
        } else {
            console.error('Error loading structure:', structureResult?.error);
            setFolderStructure({ error: structureResult?.error || 'Failed' });
        }
        
        // DON'T load conversations - just refresh the file structure
        console.log('[REFRESH_STRUCTURE] Refreshed folder structure only');
        return structureResult;
    } catch (err) {
        console.error('Error loading structure:', err);
        setError(err.message);
        setFolderStructure({ error: err.message });
        return { error: err.message };
    }
};
const refreshConversations = async () => {
    if (currentPath) {
        console.log('[REFRESH] Starting conversation refresh for path:', currentPath);
        try {
            const normalizedPath = normalizePath(currentPath);
            const response = await window.api.getConversations(normalizedPath);
            console.log('[REFRESH] Got response:', response);
            
            if (response?.conversations) {
                const formattedConversations = response.conversations.map(conv => ({
                    id: conv.id,
                    title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                    preview: conv.preview || 'No content',
                    timestamp: conv.timestamp || Date.now(),
                    last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
                }));
                
                formattedConversations.sort((a, b) => 
                    new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
                );
                
                console.log('[REFRESH] Setting conversations:', formattedConversations.length);
                setDirectoryConversations([...formattedConversations]);
                
                // ADD THIS: Don't auto-select anything - just update the list
                console.log('[REFRESH] Refresh complete, preserving current selection');
            } else {
                console.error('[REFRESH] No conversations in response');
                setDirectoryConversations([]);
            }
        } catch (err) {
            console.error('[REFRESH] Error:', err);
            setDirectoryConversations([]);
        }
    }
};


const renderWebsiteList = () => {
    const header = (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
            <div className="text-xs text-gray-400 font-medium">Websites</div>
                    <div className="flex items-center gap-1 w-[66%]">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        loadWebsiteHistory();
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title="Refresh website history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5"/>
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setWebsitesCollapsed(!websitesCollapsed);
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title={websitesCollapsed ? "Expand websites" : "Collapse websites"}
                >
                    <ChevronRight
                        size={16}
                        className={`transform transition-transform ${websitesCollapsed ? "" : "rotate-90"}`}
                    />
                </button>
            </div>
        </div>
    );

    if (websitesCollapsed && openBrowsers.length === 0) {
        return <div className="mt-4">{header}</div>;
    }

    return (
        <div className="mt-4">
            {header}
            
            {!websitesCollapsed && (
                <div className="px-1 space-y-2">
                    {/* Currently Open Browsers */}
                    {openBrowsers.length > 0 && (
                        <div>
                            <div
                                className="text-xs text-gray-600 px-2 py-1 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-800 rounded"
                                onClick={() => setOpenBrowsersCollapsed(!openBrowsersCollapsed)}
                            >
                                <span>Open Now ({openBrowsers.length})</span>
                                <ChevronRight size={12} className={`transform transition-transform ${openBrowsersCollapsed ? '' : 'rotate-90'}`} />
                            </div>
                            {!openBrowsersCollapsed && openBrowsers.map(browser => (
                                <button
                                    key={browser.paneId}
                                    onClick={() => setActiveContentPaneId(browser.paneId)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setWebsiteContextMenu({
                                            x: e.clientX,
                                            y: e.clientY,
                                            url: browser.url,
                                            title: browser.title || new URL(browser.url).hostname
                                        });
                                    }}
                                    className={`flex items-center gap-2 px-2 py-1 w-full text-left rounded transition-all ${
                                        activeContentPaneId === browser.paneId
                                            ? 'conversation-selected border-l-2 border-blue-500'
                                            : 'hover:bg-gray-800'
                                    }`}
                                >
                                    <Globe size={14} className="text-blue-400 flex-shrink-0" />
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                        <span className="text-xs truncate font-medium">
                                            {browser.title}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate">
                                            {browser.url}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Bookmarks */}
                    {bookmarks.length > 0 && (
                        <div>
                            <div
                                className="text-xs text-gray-600 px-2 py-1 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-800 rounded"
                                onClick={() => setBookmarksCollapsed(!bookmarksCollapsed)}
                            >
                                <span>Bookmarks ({bookmarks.length})</span>
                                <ChevronRight size={12} className={`transform transition-transform ${bookmarksCollapsed ? '' : 'rotate-90'}`} />
                            </div>
                            {!bookmarksCollapsed && bookmarks.map((bookmark, idx) => (
                                <button
                                    key={`${bookmark.url}-${idx}`}
                                    onClick={() => createNewBrowser(bookmark.url)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setWebsiteContextMenu({
                                            x: e.clientX,
                                            y: e.clientY,
                                            url: bookmark.url,
                                            title: bookmark.title
                                        });
                                    }}
                                    className="flex items-center gap-2 px-2 py-1 w-full text-left rounded hover:bg-gray-800 transition-all group"
                                >
                                    <Star size={14} className="text-yellow-400 flex-shrink-0" />
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                        <span className="text-xs truncate">{bookmark.title}</span>
                                        <span className="text-xs text-gray-500 truncate">{bookmark.url}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Common Sites */}
                    {commonSites.length > 0 && (
                        <div>
                            <div
                                className="text-xs text-gray-600 px-2 py-1 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-800 rounded"
                                onClick={() => setCommonSitesCollapsed(!commonSitesCollapsed)}
                            >
                                <span>Common Sites ({commonSites.length})</span>
                                <ChevronRight size={12} className={`transform transition-transform ${commonSitesCollapsed ? '' : 'rotate-90'}`} />
                            </div>
                            {!commonSitesCollapsed && commonSites.map(site => (
                                <button
                                    key={site.domain}
                                    draggable="true"
                                    onDragStart={(e) => {
                                        e.dataTransfer.effectAllowed = 'copyMove';
                                        handleGlobalDragStart(e, {
                                            type: 'browser',
                                            id: `browser_${generateId()}`,
                                            url: `https://${site.domain}`
                                        });
                                    }}
                                    onDragEnd={handleGlobalDragEnd}
                                    onClick={() => createNewBrowser(`https://${site.domain}`)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setWebsiteContextMenu({
                                            x: e.clientX,
                                            y: e.clientY,
                                            url: `https://${site.domain}`,
                                            title: site.domain
                                        });
                                    }}
                                    className="flex items-center gap-2 px-2 py-1 w-full text-left rounded hover:bg-gray-800 transition-all group"
                                >
                                    <img 
                                        src={site.favicon} 
                                        alt="" 
                                        className="w-4 h-4 flex-shrink-0"
                                        onError={(e) => {
                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
                                        }}
                                    />
                                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                        <span className="text-xs truncate">{site.domain}</span>
                                        <span className="text-xs text-gray-500">
                                            {site.count} visits
                                        </span>
                                    </div>
                                    <Plus 
                                        size={12} 
                                        className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent History */}
                    {websiteHistory.length > 0 && (
                        <div>
                            <div
                                className="text-xs text-gray-600 px-2 py-1 font-medium flex items-center justify-between cursor-pointer hover:bg-gray-800 rounded"
                                onClick={() => setRecentHistoryCollapsed(!recentHistoryCollapsed)}
                            >
                                <span>Recent History ({websiteHistory.length})</span>
                                <ChevronRight size={12} className={`transform transition-transform ${recentHistoryCollapsed ? '' : 'rotate-90'}`} />
                            </div>
                            {!recentHistoryCollapsed && <div className="max-h-48 overflow-y-auto">
                                {websiteHistory.slice(0, 20).map((item, idx) => (
                                    <button
                                        key={`${item.url}-${idx}`}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = 'copyMove';
                                            handleGlobalDragStart(e, {
                                                type: 'browser',
                                                id: `browser_${generateId()}`,
                                                url: item.url
                                            });
                                        }}
                                        onDragEnd={handleGlobalDragEnd}
                                        onClick={() => createNewBrowser(item.url)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setWebsiteContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                url: item.url,
                                                title: item.title || new URL(item.url).hostname
                                            });
                                        }}
                                        className="flex items-center gap-2 px-2 py-1 w-full text-left rounded hover:bg-gray-800 transition-all"
                                    >
                                        <Globe size={12} className="text-gray-400 flex-shrink-0" />
                                        <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                                            <span className="text-xs truncate">
                                                {item.title || new URL(item.url).hostname}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const loadGitStatus = useCallback(async () => {
    setGitLoading(true);
    setGitError(null);
    try {
    const response = await window.api.gitStatus(currentPath);
    setGitStatus(response); // { staged: [], unstaged: [], untracked: [], branch: "", ahead: 0, behind: 0 }
    } catch (err) {
    setGitError(err.message || 'Failed to get git status');
    } finally {
    setGitLoading(false);
    }
}, [currentPath]);
useEffect(() => {
    if (currentPath) {
        loadGitStatus();
    }
    }, [currentPath, loadGitStatus]);

    const renderDiskUsagePanel = () => {
        console.log('[DiskUsage] renderDiskUsagePanel called, currentPath:', currentPath, 'diskUsageCollapsed:', diskUsageCollapsed);
        if (!currentPath) {
            console.log('[DiskUsage] No currentPath, returning null');
            return null;
        }

        return (
            <div className="mt-4 border-t theme-border pt-2">
                {/* Header with collapse toggle */}
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <HardDrive size={14} />
                        Disk Usage
                    </div>
                    <button
                        onClick={() => setDiskUsageCollapsed(!diskUsageCollapsed)}
                        className="p-1 theme-hover rounded"
                        title={diskUsageCollapsed ? "Expand disk usage" : "Collapse disk usage"}
                    >
                        <ChevronRight
                            size={14}
                            className={`transform transition-transform ${diskUsageCollapsed ? "" : "rotate-90"}`}
                        />
                    </button>
                </div>
                {!diskUsageCollapsed && (
                    <div className="px-2">
                        <DiskUsageAnalyzer path={currentPath} isDarkMode={isDarkMode} />
                    </div>
                )}
            </div>
        );
    };

    const renderGitPanel = () => {
        // Only render the panel if gitStatus is available
        if (!gitStatus) return null;
    
        const staged = Array.isArray(gitStatus.staged) ? gitStatus.staged : [];
        const unstaged = Array.isArray(gitStatus.unstaged) ? gitStatus.unstaged : [];
        const untracked = Array.isArray(gitStatus.untracked) ? gitStatus.untracked : [];
    
        return (
            <div className="p-4 border-t theme-border text-xs theme-text-muted">
                {/* Header for the Git Panel with a toggle */}
                <div 
                    className="flex items-center justify-between cursor-pointer py-1"
                    onClick={() => setGitPanelCollapsed(!gitPanelCollapsed)} // <--- TOGGLE CLICK HANDLER
                >
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-branch"><circle cx="6" cy="18" r="3"/><path d="M18 6V3"/><path d="M18 18v-4"/><path d="M6 18v-2"/><path d="M6 6v4a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/></svg>
                        Git Status
                        {gitStatus.hasChanges && <span className="text-yellow-400 ml-2">(Changes!)</span>} {/* Indicate changes */}
                    </div>
                    <ChevronRight 
                        size={14} 
                        className={`transform transition-transform ${gitPanelCollapsed ? "" : "rotate-90"}`} // <--- ROTATE ICON
                    />
                </div>
    
                {/* Conditional rendering of the Git panel content */}
                {!gitPanelCollapsed && ( // <--- CONDITIONAL RENDERING
                    <div className="overflow-auto max-h-64 mt-2"> {/* Added mt-2 for spacing */}
                        <div className="mb-2 font-semibold">
                            Git Branch: {gitStatus.branch} {gitStatus.ahead > 0 && <span>↑{gitStatus.ahead}</span>} {gitStatus.behind > 0 && <span>↓{gitStatus.behind}</span>}
                        </div>
        
                        <div>
                            <div className="mb-1 font-semibold">Staged Files</div>
                            {(staged.length === 0) ? <div className="text-gray-600">No staged files</div> :
                            staged.map(file => (
                                <div key={file.path} className="flex justify-between items-center text-green-300">
                                <span title={file.path}>{file.path} (<span className="text-green-500 font-medium">{file.status}</span>)</span>
                                <button
                                    onClick={() => gitUnstageFile(file.path)}
                                    className="p-1 text-red-400 hover:bg-red-600"
                                >
                                    Unstage
                                </button>
                                </div>
                            ))
                            }
                        </div>
        
                        <div className="mt-3">
                            <div className="mb-1 font-semibold">Unstaged / Untracked Files</div>
                            {(unstaged.length + untracked.length === 0) ? <div className="text-gray-600">No unstaged or untracked files</div> :
                            [...unstaged, ...untracked].map(file => (
                                <div key={file.path} className="flex justify-between items-center">
                                <span title={file.path} className={file.isUntracked ? "text-gray-400" : "text-yellow-300"}>
                                    {file.path} (<span className="font-medium">{file.status}</span>)
                                </span>
                                <button
                                    onClick={() => gitStageFile(file.path)}
                                    className="p-1 text-green-400 px-1 rounded hover:bg-green-600"
                                >
                                    Stage
                                </button>
                                </div>
                            ))
                            }
                        </div>
        
                        <div className="mt-4">
                            <input
                                type="text"
                                className="w-full theme-input text-xs rounded px-2 py-1 mb-2"
                                placeholder="Commit message"
                                value={gitCommitMessage}
                                onChange={e => setGitCommitMessage(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button
                                disabled={gitLoading || !gitCommitMessage.trim()}
                                onClick={gitCommitChanges}
                                className="theme-button-primary px-3 py-1 rounded text-xs flex-1 disabled:opacity-50"
                                >
                                Commit
                                </button>
                                <button
                                disabled={gitLoading}
                                onClick={gitPullChanges}
                                className="theme-button px-3 py-1 rounded text-xs flex-1"
                                >
                                Pull
                                </button>
                                <button
                                disabled={gitLoading}
                                onClick={gitPushChanges}
                                className="theme-button px-3 py-1 rounded text-xs flex-1"
                                >
                                Push
                                </button>
                            </div>
                            {gitError && <div className="mt-2 text-red-500 text-xs">{gitError}</div>}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const gitStageFile = async (file) => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitStageFile(currentPath, file);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to stage file');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitUnstageFile = async (file) => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitUnstageFile(currentPath, file);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to unstage file');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitCommitChanges = async () => {
        if (!gitCommitMessage.trim()) return;
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitCommit(currentPath, gitCommitMessage.trim());
          setGitCommitMessage('');
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to commit');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitPullChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitPull(currentPath);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to pull');
        } finally {
          setGitLoading(false);
        }
      };
      
      const gitPushChanges = async () => {
        setGitLoading(true);
        setGitError(null);
        try {
          await window.api.gitPush(currentPath);
          await loadGitStatus();
        } catch (err) {
          setGitError(err.message || 'Failed to push');
        } finally {
          setGitLoading(false);
        }
      };



      
      const loadDirectoryStructureWithoutConversationLoad = async (dirPath) => {
          try {
              if (!dirPath) {
                  console.error('No directory path provided');
                  return {};
              }
              const structureResult = await window.api.readDirectoryStructure(dirPath);
              if (structureResult && !structureResult.error) {
                  setFolderStructure(structureResult);
              } else {
                  console.error('Error loading structure:', structureResult?.error);
                  setFolderStructure({ error: structureResult?.error || 'Failed' });
              }
              
              // Load conversations but DON'T auto-select any
              await loadConversationsWithoutAutoSelect(dirPath);
              return structureResult;
          } catch (err) {
              console.error('Error loading structure:', err);
              setError(err.message);
              setFolderStructure({ error: err.message });
              return { error: err.message };
          }
      };
      const loadConversationsWithoutAutoSelect = async (dirPath) => {
          try {
              const normalizedPath = normalizePath(dirPath);
              if (!normalizedPath) return;
              const response = await window.api.getConversations(normalizedPath);
              const formattedConversations = response?.conversations?.map(conv => ({
                  id: conv.id,
                  title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                  preview: conv.preview || 'No content',
                  timestamp: conv.timestamp || Date.now(),
                  last_message_timestamp: conv.last_message_timestamp || conv.timestamp || Date.now()
              })) || [];
      
              formattedConversations.sort((a, b) => 
                  new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
              );
              
              setDirectoryConversations(formattedConversations);
              
              // DON'T auto-select any conversations
              console.log('[loadConversationsWithoutAutoSelect] Loaded conversations without selecting');
      
          } catch (err) {
              console.error('Error loading conversations:', err);
              setError(err.message);
              setDirectoryConversations([]);
          }
      };

          const handleSearchSubmit = async () => {
              if (!isGlobalSearch || !searchTerm.trim()) {
                  setIsSearching(false);
                  setDeepSearchResults([]);
                  return;
              }

              setIsSearching(true);
              setDeepSearchResults([]);
              setError(null);
          
              try {
                  console.log("Performing GLOBAL search for:", searchTerm);
                  const backendResults = await window.api.performSearch({
                      query: searchTerm,
                      path: currentPath,
                      global: true,
                  });
                  
                  if (backendResults && !backendResults.error) {
                      const sortedResults = (backendResults || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                      setDeepSearchResults(sortedResults);
                  } else {
                      throw new Error(backendResults?.error || "Global search failed.");
                  }
              } catch (err) {
                  console.error("Error during global search:", err);
                  setError(err.message);
                  setDeepSearchResults([]);
              } finally {
                  setIsSearching(false);
              }
          };
      
              const handleSearchChange = (e) => {
                  const searchValue = e.target.value;
                  setSearchTerm(searchValue);
          
                 
                  if (!searchValue.trim()) {
                      setIsSearching(false);
                      setDeepSearchResults([]);
                      setMessageSearchResults([]);
                  }
                 
              };
          
          



              // Update handleSidebarRenameSubmit for sidebar file renaming
              const handleSidebarRenameSubmit = async () => {
                  if (!renamingPath || !editedSidebarItemName.trim()) {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                      return;
                  }
                  
                  const oldName = renamingPath.split('/').pop();
                  if (editedSidebarItemName === oldName) {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                      return;
                  }
                  
                  const dir = renamingPath.substring(0, renamingPath.lastIndexOf('/'));
                  const newPath = `${dir}/${editedSidebarItemName}`;
              
                  try {
                      const response = await window.api.renameFile(renamingPath, newPath);
                      if (response?.error) throw new Error(response.error);
              
                      // Update any open panes with this file
                      Object.entries(contentDataRef.current).forEach(([paneId, paneData]) => {
                          if (paneData.contentType === 'editor' && paneData.contentId === renamingPath) {
                              paneData.contentId = newPath;
                          }
                      });
              
                      await loadDirectoryStructure(currentPath);
                      setRootLayoutNode(p => ({ ...p }));
              
                  } catch (err) {
                      setError(`Failed to rename: ${err.message}`);
                  } finally {
                      setRenamingPath(null);
                      setEditedSidebarItemName('');
                  }
              };
              

              const renderSidebarItemContextMenu = () => {
    if (!sidebarItemContextMenuPos) return null;
    const { x, y, path, type, isInaccessible } = sidebarItemContextMenuPos;

    const selectedFilePaths = Array.from(selectedFiles);

    return (
        <>
            <div
                className="fixed inset-0 z-40"
                onClick={() => setSidebarItemContextMenuPos(null)}
            />
            <div
                className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 text-sm"
                style={{ top: y, left: x }}
            >
                {type === 'file' && !isInaccessible && (
                    <>
                        <button
                            onClick={() => {
                                handleApplyPromptToFilesInInput('custom', `Here is the content of the file(s):`);
                                setSidebarItemContextMenuPos(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <MessageSquare size={16} />
                            <span>Add Content to Chat ({selectedFilePaths.length})</span>
                        </button>
                        <button
                            onClick={() => {
                                const fileNames = selectedFilePaths.map(p => p.split('/').pop()).join(', ');
                                setInput(prev => `${prev}${prev ? ' ' : ''}${fileNames}`);
                                setSidebarItemContextMenuPos(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <File size={16} />
                            <span>Add Filename(s) to Chat</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                    </>
                )}

                {type === 'directory' && !isInaccessible && (
                    <>
                        <button
                            onClick={() => handleOpenFolderAsWorkspace(path)}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <Folder size={16} />
                            <span>Open as Workspace</span>
                        </button>
                        <div className="border-t theme-border my-1"></div>
                    </>
                )}

                {/* Permission options - always show for both files and directories */}
                <button
                    onClick={() => {
                        setPermissionDialog({ path, type: 'chmod' });
                        setSidebarItemContextMenuPos(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                >
                    <KeyRound size={16} />
                    <span>Change Permissions (chmod)</span>
                </button>
                <button
                    onClick={() => {
                        setPermissionDialog({ path, type: 'chown' });
                        setSidebarItemContextMenuPos(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                >
                    <Users size={16} />
                    <span>Change Owner (chown)</span>
                </button>
                <div className="border-t theme-border my-1"></div>

                {!isInaccessible && (
                    <>
                        <button
                            onClick={handleSidebarRenameStart}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <Edit size={16} />
                            <span>Rename</span>
                        </button>

                        <button
                            onClick={handleZipItems}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <Archive size={16} />
                            <span>Zip{selectedFiles.size > 1 ? ` (${selectedFiles.size} items)` : ''}</span>
                        </button>

                        <div className="border-t theme-border my-1"></div>
                    </>
                )}

                <button
                    onClick={handleSidebarItemDelete}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                >
                    <Trash size={16} />
                    <span>Delete</span>
                </button>
            </div>
        </>
    );
};
const renderFolderList = (structure) => {
    if (!structure || typeof structure !== 'object' || structure.error) {
        return <div className="p-2 text-xs text-red-500">Error: {structure?.error || 'Failed to load'}</div>;
    }
    if (Object.keys(structure).length === 0) {
        return <div className="p-2 text-xs text-gray-500">Empty directory</div>;
    }

    const header = (
        <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
            <div className="text-xs text-gray-400 font-medium">Files & Folders</div>
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshFilesAndFolders();
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title="Refresh file and folder list"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5" />
                    </svg>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setFilesCollapsed(!filesCollapsed);
                    }}
                    className="p-1 theme-hover rounded-full transition-all"
                    title={filesCollapsed ? "Expand files" : "Collapse files"}
                >
                    <ChevronRight
                        size={16}
                        className={`transform transition-transform ${filesCollapsed ? "" : "rotate-90"}`}
                    />
                </button>
            </div>
        </div>
    );

    if (filesCollapsed) {
        const findCurrentFile = (struct) => {
            for (const [name, content] of Object.entries(struct)) {
                if (content?.path === currentFile && content?.type === 'file') {
                    return { name, content };
                }
            }
            return null;
        };
        const activeFile = currentFile ? findCurrentFile(structure) : null;
        return (
            <div className="mt-4">
                {header}
                {activeFile && (
                    <div className="px-1 mt-1">
                        <button
                            onClick={() => handleFileClick(activeFile.content.path)}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Edit ${activeFile.name}`}
                        >
                            {getFileIcon(activeFile.name)}
                            <span className="text-gray-300 truncate">{activeFile.name}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    const renderFolderContents = (currentStructure, parentPath = '') => {
        if (!currentStructure) return null;

        let items = [];
        if (Array.isArray(currentStructure)) {
            items = currentStructure;
        } else if (typeof currentStructure === 'object') {
            items = Object.values(currentStructure);
        }

        items = items.filter(Boolean).sort((a, b) => {
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        return items.map(content => {
            const name = content.name || content.path?.split('/').pop() || 'Unknown';
            const fullPath = content.path || (parentPath ? `${parentPath}/${name}` : name);
            const isFolder = content.type === 'directory';
            const isFile = content.type === 'file';
            const isRenaming = renamingPath === fullPath;

            if (isFolder) {
                const isInaccessible = content.inaccessible === true;
                return (
                    <div key={fullPath} className="pl-4">
                        <button
                            draggable={!isInaccessible}
                            onDragStart={(e) => { if (isInaccessible) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = 'copyMove'; handleGlobalDragStart(e, { type: 'folder', id: fullPath }); }}
                            onDragEnd={handleGlobalDragEnd}
                            onClick={(e) => {
                                if (isInaccessible) return; // Don't allow expanding inaccessible folders
                                // Check for Ctrl or Meta key (Command on Mac)
                                if (e.ctrlKey || e.metaKey) {
                                    handleOpenFolderAsWorkspace(fullPath);
                                } else {
                                    setExpandedFolders(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(fullPath)) newSet.delete(fullPath);
                                        else newSet.add(fullPath);
                                        return newSet;
                                    });
                                }
                            }}
                            onDoubleClick={() => !isInaccessible && handleOpenFolderAsWorkspace(fullPath)}
                            onContextMenu={(e) => handleSidebarItemContextMenu(e, fullPath, 'directory', isInaccessible)}
                            className={`flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded ${isInaccessible ? 'opacity-60' : ''}`}
                            title={isInaccessible ? `Permission denied: ${fullPath}` : `Drag to open as folder viewer, Click to expand, Ctrl+Click to open as workspace`}
                        >
                            {isInaccessible ? (
                                <div className="relative flex-shrink-0">
                                    <Folder size={16} className="text-gray-500" />
                                    <Lock size={8} className="absolute -bottom-0.5 -right-0.5 text-red-400" />
                                </div>
                            ) : (
                                <Folder size={16} className="text-blue-400 flex-shrink-0" />
                            )}
                            {isRenaming ? (
                                <input
                                    type="text"
                                    value={editedSidebarItemName}
                                    onChange={(e) => setEditedSidebarItemName(e.target.value)}
                                    onBlur={handleSidebarRenameSubmit}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSidebarRenameSubmit();
                                        if (e.key === 'Escape') {
                                            setRenamingPath(null);
                                            setEditedSidebarItemName('');
                                        }
                                    }}
                                    className="theme-input text-xs rounded px-1 py-0.5 border focus:outline-none flex-1"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="text-gray-300 truncate">{name}</span>
                            )}
                            <ChevronRight
                                size={14}
                                className={`ml-auto transition-transform ${expandedFolders.has(fullPath) ? 'rotate-90' : ''}`}
                            />
                        </button>
                        {expandedFolders.has(fullPath) && renderFolderContents(content.children || content.contents || [], fullPath)}
                    </div>
                );
            } else if (isFile) {
                const fileIcon = getFileIcon(name);
                const isActiveFile = currentFile === fullPath;
                const isSelected = selectedFiles.has(fullPath);
                return (
                    <button
                        key={fullPath}
                        draggable="true"
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copyMove'; handleGlobalDragStart(e, { type: 'file', id: fullPath }); }}
                        onDragEnd={handleGlobalDragEnd}
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                const newSelected = new Set(selectedFiles);
                                if (newSelected.has(fullPath)) newSelected.delete(fullPath);
                                else newSelected.add(fullPath);
                                setSelectedFiles(newSelected);
                            } else if (e.shiftKey && lastClickedFileIndex !== null) {
                                const fileEntries = items.filter(item => item.type === 'file');
                                const currentFileIndex = fileEntries.findIndex(item => item.path === fullPath);
                                const newSelected = new Set();
                                const start = Math.min(lastClickedFileIndex, currentFileIndex);
                                const end = Math.max(lastClickedFileIndex, currentFileIndex);
                                for (let i = start; i <= end; i++) {
                                    if (fileEntries[i]) newSelected.add(fileEntries[i].path);
                                }
                                setSelectedFiles(newSelected);
                            } else {
                                setSelectedFiles(new Set([fullPath]));
                                handleFileClick(fullPath);
                                const fileEntries = items.filter(item => item.type === 'file');
                                setLastClickedFileIndex(fileEntries.findIndex(item => item.path === fullPath));
                            }
                        }}
                        onContextMenu={(e) => handleSidebarItemContextMenu(e, fullPath, 'file')}
                        className={`flex items-center gap-2 px-2 py-1 w-full text-left rounded transition-all duration-200
                            ${isActiveFile ? 'conversation-selected border-l-2 border-blue-500' : 
                              isSelected ? 'conversation-selected' : 'hover:bg-gray-800'}`}
                        title={`Edit ${name}`}
                    >
                        {fileIcon}
                        {isRenaming ? (
                            <input
                                type="text"
                                value={editedSidebarItemName}
                                onChange={(e) => setEditedSidebarItemName(e.target.value)}
                                onBlur={handleSidebarRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSidebarRenameSubmit();
                                    if (e.key === 'Escape') {
                                        setRenamingPath(null);
                                        setEditedSidebarItemName('');
                                    }
                                }}
                                className="theme-input text-xs rounded px-1 py-0.5 border focus:outline-none flex-1"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="text-gray-300 truncate">{name}</span>
                        )}
                    </button>
                );
            }
            return null;
        });
    };

    return (
        <div>
            {header}
            <div className="px-1">{renderFolderContents(structure)}</div>
        </div>
    );
};

    const renderConversationList = (conversations) => {
        const sortedConversations = conversations?.length
            ? [...conversations].sort((a, b) => {
                const aTimestamp = new Date(a.last_message_timestamp || a.timestamp).getTime();
                const bTimestamp = new Date(b.last_message_timestamp || b.timestamp).getTime();
                return bTimestamp - aTimestamp;
            })
            : [];

        const header = (
            <div className="flex items-center justify-between px-3 py-2 mt-2 bg-black/20 rounded-lg mx-1">
                <div className="text-xs text-gray-400 font-medium">Conversations ({sortedConversations.length})</div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            refreshConversations();
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title="Refresh conversations"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.44-4.5M22 12.5a10 10 0 0 1-18.44 4.5"/>
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setConversationsCollapsed(!conversationsCollapsed);
                        }}
                        className="p-1 theme-hover rounded-full transition-all"
                        title={conversationsCollapsed ? "Expand conversations" : "Collapse conversations"}
                    >
                        <ChevronRight
                            size={16}
                            className={`transform transition-transform ${conversationsCollapsed ? "" : "rotate-90"}`}
                        />
                    </button>
                </div>
            </div>
        );

        // Always show the header, even when empty
        if (!sortedConversations.length) {
            return (
                <div className="mt-4">
                    {header}
                    <div className="px-3 py-2 text-xs text-gray-500">No conversations yet</div>
                </div>
            );
        }

        if (conversationsCollapsed) {
            const activeConversation = activeConversationId ? sortedConversations.find(conv => conv.id === activeConversationId) : null;

            return (
                <div className="mt-4">
                    {header}
                    {activeConversation && !currentFile && (
                        <div className="px-1 mt-1">
                            <button
                                key={activeConversation.id}
                                onClick={() => handleConversationSelect(activeConversation.id)}
                                className="flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200 conversation-selected border-l-2 border-blue-500"
                            >
                                <File size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm truncate">{activeConversation.title || activeConversation.id}</span>
                                    <span className="text-xs text-gray-500">{new Date(activeConversation.timestamp).toLocaleString()}</span>
                                </div>
                            </button>


                        </div>

                    )}

                </div>
            );
        }

        return (
            <div className="mt-4">
                {header}
                <div className="px-1">
                    {sortedConversations.map((conv, index) => {
    
                        const isSelected = selectedConvos?.has(conv.id);
                        const isActive = conv.id === activeConversationId && !currentFile;
                        const isLastClicked = lastClickedIndex === index;
    
                        
                        return (
                            <button
                            key={conv.id}
                            draggable="true"
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copyMove'; handleGlobalDragStart(e, { type: 'conversation', id: conv.id }); }}
                            onDragEnd={handleGlobalDragEnd}
    
                            onClick={(e) => { 
                                    if (e.ctrlKey || e.metaKey) { 
                                        const newSelected = new Set(selectedConvos || new Set()); 
                                        if (newSelected.has(conv.id)) { 
                                            newSelected.delete(conv.id); 
                                        } else { 
                                            newSelected.add(conv.id); 
                                        } 
                                        setSelectedConvos(newSelected);
                                        setLastClickedIndex(index);
                                    } else if (e.shiftKey && lastClickedIndex !== null) {
                                        const newSelected = new Set();
                                        const start = Math.min(lastClickedIndex, index);
                                        const end = Math.max(lastClickedIndex, index);
                                        for (let i = start; i <= end; i++) {
                                            if (sortedConversations[i]) {
                                                newSelected.add(sortedConversations[i].id);
                                            }
                                        }
                                        setSelectedConvos(newSelected);
                                    } else { 
                                        setSelectedConvos(new Set([conv.id])); 
                                        handleConversationSelect(conv.id);
                                        setLastClickedIndex(index);
                                    } 
                                }}
                                onContextMenu={(e) => { 
                                    e.preventDefault(); 
                                    if (!selectedConvos?.has(conv.id)) { 
                                        setSelectedConvos(new Set([conv.id])); 
                                    } 
                                    setContextMenuPos({ x: e.clientX, y: e.clientY }); 
                                }}
                                className={`flex items-center gap-2 px-4 py-2 w-full theme-hover text-left rounded-lg transition-all duration-200
                                    ${isSelected || isActive ? 'conversation-selected' : 'theme-text-primary'}
                                    ${isActive ? 'border-l-2 border-blue-500' : ''}`}
                            >
                                <File size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm truncate">{conv.title || conv.id}</span>
                                    <span className="text-xs text-gray-500">{new Date(conv.timestamp).toLocaleString()}</span>
                                </div>
    
                            </button>
                            
                        );
    
                
                })}
                
                
                </div>
    
    
    
    
            </div>
        );
    };

        const renderContextMenu = () => (
        contextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                    onMouseLeave={() => setContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleSummarizeAndStart()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize & Start ({selectedConvos?.size || 0})</span>
                    </button>
                    <button
                        onClick={() => handleSummarizeAndDraft()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Summarize & Draft ({selectedConvos?.size || 0})</span>
                    </button>
                    <button
                        onClick={() => handleSummarizeAndPrompt()}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize & Prompt ({selectedConvos?.size || 0})</span>
                    </button>
                <div className="border-t theme-border my-1"></div>
                <button
                    onClick={handleAnalyzeInDashboard}
                    className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                >
                    <BarChart3 size={16} />
                    <span>Analyze in Dashboard ({selectedConvos?.size || 0})</span>
                </button>
                </div>
            </>
        )
    );

    const renderFileContextMenu = () => (
        fileContextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('refactor')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Code2 size={16} />
                        <span>Refactor Code ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFiles('document')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Document Code ({selectedFiles.size})</span>
                    </button>
                </div>
            </>
        )
    );

    const renderWebsiteContextMenu = () => (
        websiteContextMenu && (
            <>
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWebsiteContextMenu(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50 min-w-[200px]"
                    style={{ top: websiteContextMenu.y, left: websiteContextMenu.x }}
                >
                    <div className="px-3 py-2 text-xs text-gray-400 border-b theme-border truncate max-w-[250px]">
                        {websiteContextMenu.title}
                    </div>
                    <button
                        onClick={() => {
                            createNewBrowser(websiteContextMenu.url);
                            setWebsiteContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Globe size={16} />
                        <span>Open</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    {bookmarks.find(b => b.url === websiteContextMenu.url) ? (
                        <button
                            onClick={async () => {
                                const bookmark = bookmarks.find(b => b.url === websiteContextMenu.url);
                                if (bookmark) {
                                    await (window as any).api.browserDeleteBookmark({ bookmarkId: bookmark.id });
                                    loadBookmarks();
                                }
                                setWebsiteContextMenu(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-red-400"
                        >
                            <Star size={16} className="fill-current" />
                            <span>Remove Bookmark</span>
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                await (window as any).api.browserAddBookmark({
                                    url: websiteContextMenu.url,
                                    title: websiteContextMenu.title,
                                    folderPath: currentPath,
                                    isGlobal: false
                                });
                                loadBookmarks();
                                setWebsiteContextMenu(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                        >
                            <Star size={16} />
                            <span>Add to Bookmarks</span>
                        </button>
                    )}
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => {
                            try {
                                const domain = new URL(websiteContextMenu.url).hostname;
                                setLimitDialog({ domain, hourlyTime: '0', dailyTime: '0', hourlyVisits: '0', dailyVisits: '0' });
                            } catch (e) {
                                console.error('Invalid URL:', e);
                            }
                            setWebsiteContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Clock size={16} />
                        <span>Set Limits</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(websiteContextMenu.url);
                            setWebsiteContextMenu(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Copy URL</span>
                    </button>
                </div>
            </>
        )
    );

// Main Sidebar render
const getPlaceholderText = () => {
    if (isGlobalSearch) {
        return "Global search (Ctrl+Shift+F)...";
    }
    const activePaneData = contentDataRef.current[activeContentPaneId];
    if (activePaneData) {
        switch (activePaneData.contentType) {
            case 'editor':
                return "Search in current file (Ctrl+F)...";
            case 'chat':
                return "Search in conversation (Ctrl+F)...";
            default:
                return "Local search (Ctrl+F)...";
        }
    }
    return "Search (Ctrl+F)...";
};

return (
    <>
    <div
        className="border-r theme-border flex flex-col flex-shrink-0 theme-sidebar relative"
        style={{
            width: sidebarCollapsed ? '32px' : `${sidebarWidth}px`,
            transition: sidebarCollapsed ? 'width 0.2s ease' : 'none'
        }}
    >
        {!sidebarCollapsed && (
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingSidebar(true);
                }}
                style={{
                    backgroundColor: isResizingSidebar ? '#3b82f6' : 'transparent'
                }}
            />
        )}

        {/* Header Actions */}
        <div className={`px-4 py-2 border-b theme-border flex-shrink-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
            <div className={`grid grid-cols-2 ${headerActionsExpanded ? 'grid-rows-4' : ''} divide-x divide-y divide-theme-border border theme-border rounded-lg`}>
                <button onClick={toggleTheme} className="action-grid-button-wide" aria-label="Toggle Theme" title="Toggle Theme">
                    {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}<span className="text-[10px] ml-1.5">Theme</span>
                </button>
                {headerActionsExpanded ? (
                    <button onClick={createNewConversation} className="action-grid-button-wide" aria-label="New Chat" title="New Chat (Ctrl+Shift+C)">
                        <Plus size={16} /><span className="text-[10px] ml-1.5">Chat</span>
                    </button>
                ) : (
                    <div className="flex w-full h-full">
                        <button
                            onClick={() => {
                                switch (defaultNewPaneType) {
                                    case 'browser': createNewBrowser?.(); break;
                                    case 'terminal': createNewTerminal?.(); break;
                                    case 'folder': handleCreateNewFolder?.(); break;
                                    case 'code': createNewTextFile?.(); break;
                                    default: createNewConversation?.();
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-1 theme-hover"
                            aria-label={`New ${defaultNewPaneType}`}
                            title={`New ${defaultNewPaneType.charAt(0).toUpperCase() + defaultNewPaneType.slice(1)}`}
                        >
                            {defaultNewPaneType === 'browser' && <><Globe size={14} className="text-cyan-400" /><span className="text-[10px]">Browser</span></>}
                            {defaultNewPaneType === 'terminal' && <><Terminal size={14} className="text-green-400" /><span className="text-[10px]">Terminal</span></>}
                            {defaultNewPaneType === 'folder' && <><Folder size={14} className="text-yellow-400" /><span className="text-[10px]">Folder</span></>}
                            {defaultNewPaneType === 'code' && <><Code2 size={14} className="text-purple-400" /><span className="text-[10px]">Code</span></>}
                            {defaultNewPaneType === 'chat' && <><Plus size={14} /><span className="text-[10px]">Chat</span></>}
                        </button>
                        <button onClick={() => setChatPlusDropdownOpen(!chatPlusDropdownOpen)} className="px-1.5 border-l theme-border theme-hover flex items-center" aria-label="More options" title="More options">
                            <ChevronDown size={10} />
                        </button>
                    </div>
                )}
                {/* Expanded rows - rendered based on tile config order */}
                {headerActionsExpanded && (
                    <>
                        {enabledTiles.filter(t => !['theme', 'chat'].includes(t.id)).map((tile) => {
                            switch (tile.id) {
                                case 'folder':
                                    return (
                                        <button key={tile.id} onClick={handleCreateNewFolder} className="action-grid-button-wide" aria-label="New Folder" title="New Folder (Ctrl+N)">
                                            <Folder size={16} /><span className="text-[10px] ml-1.5">Folder</span>
                                        </button>
                                    );
                                case 'browser':
                                    return (
                                        <button key={tile.id} onClick={() => createNewBrowser?.()} className="action-grid-button-wide" aria-label="New Browser" title="New Browser (Ctrl+Shift+B)">
                                            <Globe size={16} /><span className="text-[10px] ml-1.5">Browser</span>
                                        </button>
                                    );
                                case 'terminal':
                                    return (
                                        <div key={tile.id} className="relative flex">
                                            <button onClick={() => createNewTerminal?.(defaultNewTerminalType)} className="action-grid-button-wide rounded-r-none border-r-0" aria-label="New Terminal" title={`New ${defaultNewTerminalType === 'system' ? 'Bash' : defaultNewTerminalType} Terminal (Ctrl+Shift+T)`}>
                                                {defaultNewTerminalType === 'system' && <Terminal size={16} className="text-green-400" />}
                                                {defaultNewTerminalType === 'npcsh' && <Sparkles size={16} className="text-purple-400" />}
                                                {defaultNewTerminalType === 'guac' && <Code2 size={16} className="text-yellow-400" />}
                                                <span className="text-[10px] ml-1.5">{defaultNewTerminalType === 'system' ? 'Bash' : defaultNewTerminalType}</span>
                                            </button>
                                            <button onClick={() => setTerminalDropdownOpen(!terminalDropdownOpen)} className="px-1 theme-bg-tertiary border theme-border rounded-r-lg hover:bg-gray-700" aria-label="Terminal options">
                                                <ChevronDown size={10} />
                                            </button>
                                            {terminalDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[9999] py-1">
                                                    <button onClick={() => { createNewTerminal?.('system'); setTerminalDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                                                        <Terminal size={14} className="text-green-400" /><span>Bash</span>
                                                    </button>
                                                    <button onClick={() => { createNewTerminal?.('npcsh'); setTerminalDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                                                        <Sparkles size={14} className="text-purple-400" /><span>npcsh</span>
                                                    </button>
                                                    <button onClick={() => { createNewTerminal?.('guac'); setTerminalDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                                                        <Code2 size={14} className="text-yellow-400" /><span>guac</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                case 'code':
                                    return (
                                        <button key={tile.id} onClick={createNewTextFile} className="action-grid-button-wide" aria-label="New Code File" title="New Code File (Ctrl+Shift+F)">
                                            <Code2 size={16} /><span className="text-[10px] ml-1.5">Code</span>
                                        </button>
                                    );
                                case 'document':
                                    return (
                                        <div key={tile.id} className="relative flex">
                                            <button onClick={() => createNewDocument?.(defaultNewDocumentType)} className="action-grid-button-wide rounded-r-none border-r-0" aria-label="New Document" title={`New ${defaultNewDocumentType.toUpperCase()} Document`}>
                                                {defaultNewDocumentType === 'docx' && <FileText size={16} className="text-blue-300" />}
                                                {defaultNewDocumentType === 'xlsx' && <FileJson size={16} className="text-green-300" />}
                                                {defaultNewDocumentType === 'pptx' && <BarChart3 size={16} className="text-orange-300" />}
                                                {defaultNewDocumentType === 'mapx' && <Share2 size={16} className="text-pink-300" />}
                                                <span className="text-[10px] ml-1.5">{defaultNewDocumentType === 'mapx' ? 'Map' : defaultNewDocumentType.slice(0, -1).toUpperCase()}</span>
                                            </button>
                                            <button onClick={() => setDocDropdownOpen(!docDropdownOpen)} className="px-1 theme-bg-tertiary border theme-border rounded-r-lg hover:bg-gray-700" aria-label="Document options">
                                                <ChevronDown size={10} />
                                            </button>
                                        </div>
                                    );
                                case 'workspace':
                                    return (
                                        <button key={tile.id} onClick={() => { if ((window as any).api?.openNewWindow) (window as any).api.openNewWindow(currentPath); else window.open(window.location.href, '_blank'); }} className="action-grid-button-wide" aria-label="New Workspace" title="New Workspace (Ctrl+Shift+N)">
                                            <img src={npcLogo} alt="Incognide" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }} className="rounded-full" />
                                            <span className="text-[10px] ml-1.5">Incognide</span>
                                        </button>
                                    );
                                default:
                                    return null;
                            }
                        })}
                    </>
                )}
            </div>
            {/* Expand/collapse toggle */}
            <div className="flex items-center mt-1">
                <button onClick={() => setHeaderActionsExpanded(!headerActionsExpanded)} className="flex-1 py-1 text-[10px] text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1">
                    {headerActionsExpanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> More</>}
                </button>
            </div>
            {/* Tile edit mode panel */}
            {tileEditMode && (
                <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="text-[10px] text-gray-400 mb-2">Drag to reorder • Click eye to toggle</div>
                    <div className="space-y-1">
                        {[...tilesConfig.tiles].sort((a, b) => a.order - b.order).map((tile) => (
                            <div
                                key={tile.id}
                                draggable
                                onDragStart={(e) => handleTileDragStart(e, tile.id)}
                                onDragOver={handleTileDragOver}
                                onDrop={(e) => handleTileDrop(e, tile.id)}
                                className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-move ${
                                    draggedTileId === tile.id ? 'bg-blue-600/30 border border-blue-500' : 'bg-gray-700/50 hover:bg-gray-700'
                                }`}
                            >
                                <span className="text-gray-500">⋮⋮</span>
                                <span className="flex-1">{tile.label}</span>
                                <button
                                    onClick={() => toggleTileEnabled(tile.id)}
                                    className={`p-0.5 rounded ${tile.enabled ? 'text-green-400' : 'text-gray-600'}`}
                                    title={tile.enabled ? 'Visible' : 'Hidden'}
                                >
                                    {tile.enabled ? '👁' : '👁‍🗨'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={async () => {
                            const result = await (window as any).api?.tilesConfigReset?.();
                            if (result?.config) setTilesConfig(result.config);
                        }}
                        className="w-full mt-2 py-1 text-[10px] text-gray-500 hover:text-red-400"
                    >
                        Reset to defaults
                    </button>
                </div>
            )}
        </div>

        <div className={`flex-1 overflow-y-auto px-2 py-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
            {loading ? (
                <div className="p-4 theme-text-muted">Loading...</div>
            ) : isSearching ? (
                renderSearchResults()
            ) : (
                <>
                    {renderWebsiteList()}
                    {renderFolderList(folderStructure)}
                    {renderConversationList(directoryConversations)}
                </>
            )}
            {contextMenuPos && renderContextMenu()}
            {sidebarItemContextMenuPos && renderSidebarItemContextMenu()}
            {fileContextMenuPos && renderFileContextMenu()}
            {websiteContextMenu && renderWebsiteContextMenu()}
            {/* Limit Input Dialog */}
            {limitDialog && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setLimitDialog(null)} />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 theme-bg-secondary border theme-border rounded-lg shadow-xl p-4 min-w-[320px]">
                        <h3 className="text-sm font-medium mb-1">Set Site Limits</h3>
                        <p className="text-xs text-gray-400 mb-4">{limitDialog.domain}</p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Time Limits (minutes)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={limitDialog.hourlyTime}
                                            onChange={(e) => setLimitDialog({ ...limitDialog, hourlyTime: e.target.value })}
                                            className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">per hour</span>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={limitDialog.dailyTime}
                                            onChange={(e) => setLimitDialog({ ...limitDialog, dailyTime: e.target.value })}
                                            className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">per day</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Visit Limits</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={limitDialog.hourlyVisits}
                                            onChange={(e) => setLimitDialog({ ...limitDialog, hourlyVisits: e.target.value })}
                                            className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">per hour</span>
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={limitDialog.dailyVisits}
                                            onChange={(e) => setLimitDialog({ ...limitDialog, dailyVisits: e.target.value })}
                                            className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">per day</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-3 mb-3">Set to 0 for no limit</p>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setLimitDialog(null)}
                                className="px-3 py-1.5 text-sm rounded theme-hover"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    (window as any).api.browserSetSiteLimit({
                                        domain: limitDialog.domain,
                                        folderPath: currentPath,
                                        hourlyTimeLimit: parseInt(limitDialog.hourlyTime, 10) || 0,
                                        dailyTimeLimit: parseInt(limitDialog.dailyTime, 10) || 0,
                                        hourlyVisitLimit: parseInt(limitDialog.hourlyVisits, 10) || 0,
                                        dailyVisitLimit: parseInt(limitDialog.dailyVisits, 10) || 0,
                                        isGlobal: false
                                    });
                                    setLimitDialog(null);
                                }}
                                className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </>
            )}
            {/* Permission Dialog (chmod/chown) */}
            {permissionDialog && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setPermissionDialog(null)} />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 theme-bg-secondary border theme-border rounded-lg shadow-xl p-4 min-w-[380px]">
                        <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                            {permissionDialog.type === 'chmod' ? (
                                <><KeyRound size={16} className="text-yellow-400" /> Change Permissions</>
                            ) : (
                                <><Users size={16} className="text-blue-400" /> Change Owner</>
                            )}
                        </h3>
                        <p className="text-xs text-gray-400 mb-4 truncate" title={permissionDialog.path}>{permissionDialog.path}</p>

                        {permissionDialog.type === 'chmod' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Quick Presets</label>
                                    <select
                                        value={permissionDialog.mode || ''}
                                        onChange={(e) => setPermissionDialog({ ...permissionDialog, mode: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                    >
                                        <option value="">-- Select preset or enter custom --</option>
                                        <optgroup label="Files">
                                            <option value="644">644 - Read/write owner, read others (rw-r--r--)</option>
                                            <option value="664">664 - Read/write owner+group, read others (rw-rw-r--)</option>
                                            <option value="600">600 - Private file, owner only (rw-------)</option>
                                            <option value="666">666 - Read/write everyone (rw-rw-rw-)</option>
                                        </optgroup>
                                        <optgroup label="Directories / Executables">
                                            <option value="755">755 - Standard directory/executable (rwxr-xr-x)</option>
                                            <option value="775">775 - Group writable directory (rwxrwxr-x)</option>
                                            <option value="700">700 - Private directory, owner only (rwx------)</option>
                                            <option value="777">777 - Full access everyone (rwxrwxrwx)</option>
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Custom Mode (octal)</label>
                                    <input
                                        type="text"
                                        value={permissionDialog.mode || ''}
                                        onChange={(e) => setPermissionDialog({ ...permissionDialog, mode: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm font-mono"
                                        placeholder="755"
                                        maxLength={4}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div className="flex gap-4">
                                        <span><strong>7</strong> = rwx</span>
                                        <span><strong>6</strong> = rw-</span>
                                        <span><strong>5</strong> = r-x</span>
                                        <span><strong>4</strong> = r--</span>
                                    </div>
                                    <div>Format: [owner][group][others]</div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Owner (username or UID)</label>
                                    <input
                                        type="text"
                                        value={permissionDialog.owner || ''}
                                        onChange={(e) => setPermissionDialog({ ...permissionDialog, owner: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                        placeholder="username"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Group (groupname or GID, optional)</label>
                                    <input
                                        type="text"
                                        value={permissionDialog.group || ''}
                                        onChange={(e) => setPermissionDialog({ ...permissionDialog, group: e.target.value })}
                                        className="w-full px-2 py-1.5 rounded border theme-border theme-bg-primary text-sm"
                                        placeholder="groupname"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mt-3">
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissionDialog.recursive || false}
                                    onChange={(e) => setPermissionDialog({ ...permissionDialog, recursive: e.target.checked })}
                                    className="rounded border-gray-600"
                                />
                                Recursive (-R)
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissionDialog.useSudo || false}
                                    onChange={(e) => setPermissionDialog({ ...permissionDialog, useSudo: e.target.checked })}
                                    className="rounded border-gray-600"
                                />
                                Use sudo
                            </label>
                        </div>

                        <div className="flex gap-2 justify-end mt-4">
                            <button
                                onClick={() => setPermissionDialog(null)}
                                className="px-3 py-1.5 text-sm rounded theme-hover"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        if (permissionDialog.type === 'chmod') {
                                            if (!permissionDialog.mode || !/^[0-7]{3,4}$/.test(permissionDialog.mode)) {
                                                setError('Invalid mode. Use octal format (e.g., 755)');
                                                return;
                                            }
                                            const result = await (window as any).api.chmod({
                                                path: permissionDialog.path,
                                                mode: permissionDialog.mode,
                                                recursive: permissionDialog.recursive,
                                                useSudo: permissionDialog.useSudo
                                            });
                                            if (result?.error) throw new Error(result.error);
                                        } else {
                                            if (!permissionDialog.owner) {
                                                setError('Owner is required');
                                                return;
                                            }
                                            const result = await (window as any).api.chown({
                                                path: permissionDialog.path,
                                                owner: permissionDialog.owner,
                                                group: permissionDialog.group,
                                                recursive: permissionDialog.recursive,
                                                useSudo: permissionDialog.useSudo
                                            });
                                            if (result?.error) throw new Error(result.error);
                                        }
                                        setPermissionDialog(null);
                                        // Refresh directory to see updated permissions
                                        await loadDirectoryStructure(currentPath);
                                    } catch (err: any) {
                                        setError(err.message || 'Failed to change permissions');
                                    }
                                }}
                                className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </>
            )}
            {/* Zip Name Modal */}
            {zipModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { if (!isZipping) { setZipModal(null); setZipName(''); } }} />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 theme-bg-secondary border theme-border rounded-lg shadow-xl p-4 min-w-[320px]">
                        <h3 className="text-sm font-medium mb-3">Create Zip Archive</h3>
                        <p className="text-xs text-gray-400 mb-3">{zipModal.items.length} item{zipModal.items.length > 1 ? 's' : ''} selected</p>
                        {isZipping ? (
                            <div className="flex items-center gap-3 py-4">
                                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm">Creating archive...</span>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={zipName}
                                    onChange={(e) => setZipName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && zipName.trim()) executeZip();
                                        if (e.key === 'Escape') { setZipModal(null); setZipName(''); }
                                    }}
                                    autoFocus
                                    className="w-full px-3 py-2 rounded border theme-border theme-bg-primary text-sm mb-4"
                                    placeholder="Archive name"
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => { setZipModal(null); setZipName(''); }}
                                        className="px-3 py-1.5 text-sm rounded theme-hover"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={executeZip}
                                        disabled={!zipName.trim()}
                                        className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Create Zip
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>

        {sidebarCollapsed && <div className="flex-1"></div>}

        {/* Delete button */}
        <div className={`flex justify-center ${sidebarCollapsed ? 'hidden' : ''}`}>
            <button
                onClick={deleteSelectedConversations}
                className="p-2 theme-hover rounded-full text-red-400 transition-all"
                title="Delete selected items"
            >
                <Trash size={24} />
            </button>
        </div>

        <div className="p-4 border-t theme-border flex-shrink-0">
            {/* Bottom Grid Edit Mode - uses jinx tiles when loaded */}
            {!sidebarCollapsed && bottomGridEditMode && (
                <div className="mb-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="text-[10px] text-gray-400 mb-2">Drag to reorder • Click to edit</div>
                    <div className="grid grid-cols-3 gap-1">
                        {(tileJinxesLoaded ? tileJinxes : bottomGridConfig.map(t => ({ ...t, filename: `${t.id}.jinx`, jinx_name: `tile.${t.id}`, action: t.id, rawContent: '' }))).map((tile, idx) => (
                            <div
                                key={tile.filename || tile.id}
                                draggable
                                onDragStart={() => setDraggedTileIdx(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => { if (draggedTileIdx !== null) handleTileReorder(draggedTileIdx, idx); }}
                                onDragEnd={() => setDraggedTileIdx(null)}
                                onClick={() => {
                                    setEditingTileJinx(tile.filename);
                                    setTileJinxEditContent(tile.rawContent);
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-grab active:cursor-grabbing hover:bg-purple-600/30 ${
                                    !tile.enabled ? 'opacity-50' : 'bg-gray-700/50'
                                } ${draggedTileIdx === idx ? 'ring-2 ring-purple-500 opacity-50' : ''}`}
                            >
                                <GripVertical size={10} className="text-gray-500" />
                                <span className="flex-1 truncate">{tile.label}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            // Create new custom tile
                            const newName = `custom_${Date.now()}`;
                            const newContent = `/**
 * @jinx tile.${newName}
 * @label Custom
 * @icon Box
 * @order ${tileJinxes.length}
 * @enabled true
 */

import React from 'react';
import { Box } from 'lucide-react';

export default function CustomTile({ onClose, theme }: { onClose?: () => void; theme?: any }) {
    return (
        <div className="p-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Box size={20} />
                Custom Tile
            </h2>
            <p className="text-gray-400 mt-2">Edit this component to create your custom tile.</p>
        </div>
    );
}
`;
                            setEditingTileJinx(`${newName}.jinx`);
                            setTileJinxEditContent(newContent);
                        }}
                        className="mt-2 w-full px-2 py-1 text-xs bg-purple-600/30 text-purple-300 rounded hover:bg-purple-600/50 flex items-center justify-center gap-1"
                    >
                        <Plus size={12} /> New Custom Tile
                    </button>
                </div>
            )}

            {/* Tile Editor Modal - Full component code editor with live preview */}
            {editingTileJinx && (
                <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg w-[95vw] h-[95vh] flex flex-col">
                        <div className="flex items-center justify-between p-3 border-b border-gray-700">
                            <span className="text-sm font-medium">{editingTileJinx.replace('.jinx', '')} Component</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={toggleLivePreview}
                                    className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${showLivePreview ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    <Play size={12} /> {showLivePreview ? 'Hide Preview' : 'Live Preview'}
                                </button>
                                <button
                                    onClick={() => saveTileJinx(editingTileJinx, tileJinxEditContent)}
                                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => { setEditingTileJinx(null); setTileJinxEditContent(''); setShowLivePreview(false); }}
                                    className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex">
                            {/* Code Editor */}
                            <div className={`${showLivePreview ? 'w-1/2' : 'w-full'} h-full`}>
                                <CodeMirror
                                    value={tileJinxEditContent}
                                    onChange={(val) => setTileJinxEditContent(val)}
                                    extensions={[
                                        javascript({ jsx: true, typescript: true }),
                                        EditorView.theme({
                                            '&': { height: '100%', fontSize: '13px' },
                                            '.cm-scroller': { overflow: 'auto' },
                                            '.cm-content': { fontFamily: '"Fira Code", "JetBrains Mono", monospace' },
                                            '.cm-gutters': { backgroundColor: '#1a1a2e', borderRight: '1px solid #333' },
                                        }),
                                    ]}
                                    theme="dark"
                                    height="100%"
                                    style={{ height: '100%' }}
                                />
                            </div>
                            {/* Live Preview - renders the actual component */}
                            {showLivePreview && (
                                <div className="w-1/2 h-full border-l border-gray-700 flex flex-col">
                                    <div className="p-2 border-b border-gray-700 text-xs text-gray-400 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Play size={12} className="text-green-400" />
                                            Live Preview
                                        </span>
                                        <span className="text-gray-500 text-[10px]">updates as you type</span>
                                    </div>
                                    <div className="flex-1 overflow-auto bg-gray-900 relative" style={{ contain: 'layout paint' }}>
                                        <LiveProvider code={livePreviewCode} scope={liveScope} noInline={true}>
                                            <LiveError className="p-4 text-red-400 text-sm font-mono bg-red-900/30 border-b border-red-800" />
                                            <LivePreview className="h-full w-full" />
                                        </LiveProvider>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-3 py-2 text-[10px] text-gray-500 border-t border-gray-700">
                            ~/.npcsh/incognide/tiles/{editingTileJinx}
                        </div>
                    </div>
                </div>
            )}

            {/* 4x3 Grid - uses jinx tiles when loaded */}
            {!sidebarCollapsed && !bottomGridEditMode && (
                <div className="grid grid-cols-3 divide-x divide-y divide-theme-border border theme-border rounded-lg overflow-hidden mb-2">
                    {(() => {
                        // Action map for tile IDs
                        const actions: Record<string, () => void> = {
                            db: () => createDBToolPane?.(),
                            photo: () => createPhotoViewerPane?.(),
                            library: () => createLibraryViewerPane?.(),
                            datadash: () => createDataDashPane?.(),
                            graph: () => createGraphViewerPane?.(),
                            browsergraph: () => createBrowserGraphPane?.(),
                            team: () => createTeamManagementPane?.(),
                            npc: () => createNPCTeamPane?.(),
                            jinx: () => createJinxPane?.(),
                            settings: () => createSettingsPane?.(),
                            env: () => createProjectEnvPane?.(),
                            disk: () => createDiskUsagePane?.(),
                        };
                        // Icon map
                        const iconMap: Record<string, React.ReactNode> = {
                            Database: <Database size={16} />,
                            Image: <Image size={16} />,
                            BookOpen: <BookOpen size={16} />,
                            BarChart3: <BarChart3 size={16} />,
                            GitBranch: <GitBranch size={16} />,
                            Network: <Network size={16} />,
                            Users: <Users size={16} />,
                            Bot: <Bot size={16} />,
                            Zap: <Zap size={16} />,
                            Settings: <Settings size={16} />,
                            KeyRound: <KeyRound size={16} />,
                            HardDrive: <HardDrive size={16} />,
                            Box: <Box size={16} />,
                        };

                        // Use jinx tiles if loaded, otherwise fallback
                        const tiles = tileJinxesLoaded
                            ? tileJinxes.filter(t => t.enabled)
                            : bottomGridConfig.filter(t => t.enabled).map(t => ({ ...t, action: t.id }));

                        return tiles.map((tile) => (
                            <button
                                key={tile.filename || tile.id}
                                onClick={actions[tile.action] || (() => console.log(`No action for ${tile.action}`))}
                                className="action-grid-button"
                                aria-label={tile.label}
                                title={tile.label}
                            >
                                {iconMap[tile.icon] || <Box size={16} />}
                            </button>
                        ));
                    })()}
                </div>
            )}

            {/* Bottom row: Edit tiles button + Collapse */}
            <div className={`flex items-center gap-2 ${!sidebarCollapsed ? 'mt-2' : ''}`}>
                {!sidebarCollapsed && (
                    <button
                        onClick={() => setBottomGridEditMode(!bottomGridEditMode)}
                        className={`px-2 py-2 text-xs rounded-lg ${bottomGridEditMode ? 'bg-purple-600 text-white' : 'theme-bg-tertiary theme-border border hover:bg-gray-700'}`}
                        title="Edit tiles"
                    >
                        <Edit size={14} />
                    </button>
                )}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="flex-1 p-2 theme-button theme-hover rounded-lg transition-all group"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <div className="flex items-center gap-1 group-hover:gap-0 transition-all duration-200 justify-center">
                        <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                        <ChevronRight size={14} className={`transform ${sidebarCollapsed ? '' : 'rotate-180'} group-hover:scale-75 transition-all duration-200`} />
                        <div className="w-1 h-4 bg-current rounded group-hover:w-0.5 transition-all duration-200"></div>
                    </div>
                </button>
            </div>
        </div>
    </div>

    {/* Chat Plus Dropdown - rendered outside sidebar to avoid clipping */}
    {chatPlusDropdownOpen && (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setChatPlusDropdownOpen(false)} />
            <div className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-2 z-[9999]" style={{ top: '80px', left: '10px', minWidth: '180px' }}>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Create New</div>
                <button onClick={() => { createNewConversation?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <MessageSquare size={16} className="text-blue-400" /><span>Chat</span>
                </button>
                <button onClick={() => { handleCreateNewFolder?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Folder size={16} className="text-yellow-400" /><span>Folder</span>
                </button>
                <button onClick={() => { createNewBrowser?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Globe size={16} className="text-cyan-400" /><span>Browser</span>
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Terminal</div>
                <button onClick={() => { createNewTerminal?.('system'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Terminal size={16} className="text-green-400" /><span>Bash</span>
                </button>
                <button onClick={() => { createNewTerminal?.('npcsh'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Sparkles size={16} className="text-purple-400" /><span>npcsh</span>
                </button>
                <button onClick={() => { createNewTerminal?.('guac'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Code2 size={16} className="text-yellow-400" /><span>guac</span>
                </button>
                <button onClick={() => { createNewTextFile?.(); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Code2 size={16} className="text-purple-400" /><span>Code File</span>
                </button>
                <div className="border-t border-gray-700 my-1"></div>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Documents</div>
                <button onClick={() => { createNewDocument?.('docx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <FileText size={16} className="text-blue-300" /><span>Word (.docx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('xlsx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <FileJson size={16} className="text-green-300" /><span>Excel (.xlsx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('pptx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <BarChart3 size={16} className="text-orange-300" /><span>PowerPoint (.pptx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('mapx'); setChatPlusDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-700 text-sm text-gray-200">
                    <Share2 size={16} className="text-pink-300" /><span>Mind Map (.mapx)</span>
                </button>
            </div>
        </>
    )}

    {/* Doc Dropdown - rendered outside sidebar to avoid clipping from overflow-hidden */}
    {docDropdownOpen && (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setDocDropdownOpen(false)} />
            <div className="fixed theme-bg-secondary border theme-border rounded-lg shadow-2xl py-2 z-[9999]" style={{ top: '160px', left: '10px', minWidth: '150px' }}>
                <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">New Document</div>
                <button onClick={() => { createNewDocument?.('docx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <FileText size={16} className="text-blue-300" /><span>Word (.docx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('xlsx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <FileJson size={16} className="text-green-300" /><span>Excel (.xlsx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('pptx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <BarChart3 size={16} className="text-orange-300" /><span>PowerPoint (.pptx)</span>
                </button>
                <button onClick={() => { createNewDocument?.('mapx'); setDocDropdownOpen(false); }} className="flex items-center gap-2 px-3 py-2 w-full text-left theme-hover text-sm theme-text-primary">
                    <Share2 size={16} className="text-pink-300" /><span>Mind Map (.mapx)</span>
                </button>
            </div>
        </>
    )}
</>
);

};

export default Sidebar;
