import React, { useState, useEffect } from 'react';
import {
    Server, Loader, ChevronRight, X, Save, Plus, Trash2,
    CheckCircle, XCircle, SlidersHorizontal
} from 'lucide-react';

const McpServerMenu = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [servers, setServers] = useState([]);
    const [selectedServer, setSelectedServer] = useState(null);
    const [editedServer, setEditedServer] = useState(null);
    const [testStatus, setTestStatus] = useState({});

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        const loadServers = async () => {
            if (!isOpen) return;
            setLoading(true);
            setError(null);

            //  window.api.getMcpServers is a placeholder
            const response = await window.api.getMcpServers();

            if (response.error) {
                setError(response.error);
                setLoading(false);
                return;
            }

            setServers(response.servers || []);
            setLoading(false);
        };
        loadServers();
    }, [isOpen]);

    const handleServerSelect = (server) => {
        setSelectedServer(server);
        setEditedServer({ ...server });
    };

    const handleNewServer = () => {
        const newServer = {
            name: 'New Server',
            url: 'http://localhost:8080',
            tools: {}
        };
        setSelectedServer(newServer);
        setEditedServer(newServer);
    };

    const handleInputChange = (field, value) => {
        setEditedServer(prev => ({ ...prev, [field]: value }));
    };

    const handleToolToggle = (toolName) => {
        setEditedServer(prev => {
            const newTools = { ...prev.tools };
            newTools[toolName] = !newTools[toolName];
            return { ...prev, tools: newTools };
        });
    };

    const handleSave = async () => {
        //  window.api.saveMcpServer is a placeholder
        const response = await window.api.saveMcpServer(editedServer);

        if (response.error) {
            setError(response.error);
            return;
        }

        //  window.api.getMcpServers is a placeholder
        const refreshed = await window.api.getMcpServers();
        setServers(refreshed.servers || []);
        setSelectedServer(editedServer);
    };

    const handleTestServer = async (server) => {
        setTestStatus(prev => ({ ...prev, [server.name]: 'testing' }));
        //  window.api.testMcpServer is a placeholder
        const response = await window.api.testMcpServer(server);
        setTestStatus(prev => ({ ...prev, [server.name]: response.status }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center 
            justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl 
                w-full max-w-4xl h-[70vh] flex flex-col">
                <header className="w-full border-b theme-border p-4 
                    flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold flex 
                        items-center gap-2">
                        <SlidersHorizontal className="text-blue-400" /> MCP Server Management
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full theme-hover">
                        <X size={20} />
                    </button>
                </header>

                <main className="flex flex-1 min-h-0">
                    <div className="w-1/3 border-r theme-border 
                        flex flex-col min-h-0">
                        <div className="p-2 border-b theme-border flex-shrink-0">
                            <button
                                onClick={handleNewServer}
                                className="theme-button-primary w-full p-2 
                                    rounded text-sm flex items-center 
                                    justify-center gap-2">
                                <Plus size={16} /> New Server
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loading ? (
                                <div className="flex items-center 
                                    justify-center p-8">
                                    <Loader className="animate-spin 
                                        text-blue-400" />
                                </div>
                            ) : error ? (
                                <div className="text-red-400 p-4 text-center">
                                    {error}
                                </div>
                            ) : servers.length > 0 ? (
                                servers.map(server => (
                                    <button
                                        key={server.name}
                                        onClick={() => handleServerSelect(server)}
                                        className={`flex items-center gap-2 w-full p-2 
                                            rounded text-sm text-left 
                                            ${selectedServer?.name === server.name
                                                ? 'bg-blue-600/50'
                                                : 'theme-hover'}`}>
                                        <Server size={14} className="text-gray-400" />
                                        <span className="flex-1 truncate">{server.name}</span>
                                        {testStatus[server.name] === 'testing' && <Loader size={14} className="animate-spin" />}
                                        {testStatus[server.name] === 'success' && <CheckCircle size={14} className="text-green-500" />}
                                        {testStatus[server.name] === 'error' && <XCircle size={14} className="text-red-500" />}
                                    </button>
                                ))
                            ) : (
                                <div className="theme-text-secondary text-sm 
                                    p-4 text-center">
                                    No MCP servers found.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-2/3 flex flex-col min-h-0">
                        {selectedServer && editedServer ? (
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="flex justify-between 
                                        items-start gap-4">
                                        <div className="flex-grow space-y-2">
                                            <div>
                                                <label className="block text-xs 
                                                    theme-text-secondary mb-1">
                                                    Server Name
                                                </label>
                                                <input
                                                    className="w-full theme-input 
                                                        text-xl font-bold p-2"
                                                    value={editedServer.name || ''}
                                                    onChange={(e) => handleInputChange(
                                                        'name',
                                                        e.target.value
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs 
                                                    theme-text-secondary mb-1">
                                                    Server URL
                                                </label>
                                                <input
                                                    className="w-full theme-input 
                                                        p-2 text-sm font-mono"
                                                    value={editedServer.url || ''}
                                                    onChange={(e) => handleInputChange(
                                                        'url',
                                                        e.target.value
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-6">
                                            <button
                                                onClick={() => handleTestServer(editedServer)}
                                                className="theme-button px-3 
                                                    py-2 rounded text-sm flex 
                                                    items-center gap-2">
                                                Test
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="theme-button-success px-4 
                                                    py-2 rounded text-sm flex 
                                                    items-center gap-2">
                                                <Save size={16} /> Save
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold 
                                            theme-text-secondary">
                                            Tools
                                        </h3>
                                        {Object.keys(editedServer.tools).length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.keys(editedServer.tools).map(toolName => (
                                                    <label key={toolName} className="flex items-center gap-2 p-2 rounded theme-hover">
                                                        <input
                                                            type="checkbox"
                                                            checked={editedServer.tools[toolName]}
                                                            onChange={() => handleToolToggle(toolName)}
                                                        />
                                                        <span className="text-sm">{toolName}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="theme-text-secondary text-sm p-4 text-center">
                                                No tools found on this server.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center 
                                h-full theme-text-secondary">
                                Select or create an MCP server
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default McpServerMenu;