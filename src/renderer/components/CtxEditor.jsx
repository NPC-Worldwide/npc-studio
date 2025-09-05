import React, { useState, useEffect } from 'react';
import { FileJson, X, Save, Plus, Trash2 } from 'lucide-react';
import AutosizeTextarea from './AutosizeTextarea';

const CtxEditor = ({ isOpen, onClose, currentPath }) => {
   
    const [activeTab, setActiveTab] = useState('project');
    const [globalCtx, setGlobalCtx] = useState({});
    const [projectCtx, setProjectCtx] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadContexts();
        }
    }, [isOpen, currentPath]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const loadContexts = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const globalRes = await window.api.getGlobalContext();
            if (globalRes.error) throw new Error(`Global: ${globalRes.error}`);
            setGlobalCtx(globalRes.context || {});

            if (currentPath) {
                const projectRes = await window.api.getProjectContext(currentPath);
                if (projectRes.error) throw new Error(`Project: ${projectRes.error}`);
                setProjectCtx(projectRes.context || {});
            } else {
                setProjectCtx({});
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
   
    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'global') {
                await window.api.saveGlobalContext(globalCtx);
            } else if (currentPath) {
                await window.api.saveProjectContext({ path: currentPath, contextData: projectCtx });
            }
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFieldChange = (type, field, value) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => ({ ...prev, [field]: value }));
    };
    
    const handleDynamicValueChange = (type, listName, index, value) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => {
            const newList = [...(prev[listName] || [])];
            newList[index] = { ...(newList[index] || {}), value: value };
            return { ...prev, [listName]: newList };
        });
    };
    
    const addDynamicValueItem = (type, listName) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => ({
            ...prev,
            [listName]: [...(prev[listName] || []), { value: '' }]
        }));
    };

    const removeDynamicValueItem = (type, listName, index) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => {
            const newList = [...(prev[listName] || [])];
            newList.splice(index, 1);
            return { ...prev, [listName]: newList };
        });
    };

    const renderForm = (type) => {
        const ctx = type === 'global' ? globalCtx : projectCtx;
        if (type === 'project' && !currentPath) {
            return <div className="p-4 theme-text-muted">No project folder selected.</div>;
        }

        return (
            <div className="space-y-6 py-2">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm theme-text-secondary mb-1">Fore-NPC</label>
                        <input
                            type="text"
                            value={ctx.forenpc || ''}
                            onChange={(e) => handleFieldChange(type, 'forenpc', e.target.value)}
                            className="w-full theme-input"
                            placeholder="e.g., sibiji"
                        />
                    </div>
                    <div>
                        <label className="block text-sm theme-text-secondary mb-1">General Context</label>
                        {/* MODIFICATION: Using AutosizeTextarea */}
                        <AutosizeTextarea
                            value={ctx.context || ''}
                            onChange={(e) => handleFieldChange(type, 'context', e.target.value)}
                            className="w-full theme-input min-h-[96px] resize-y"
                            placeholder="A brief description of this project or team's purpose."
                        />
                    </div>
                </div>
                
                <DynamicValueListEditor type={type} listName="databases" title="Databases" placeholder="e.g., ~/npcsh_history.db" items={ctx.databases || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
                <DynamicValueListEditor type={type} listName="mcp_servers" title="MCP Servers" placeholder="e.g., ~/.npcsh/mcp_server.py" items={ctx.mcp_servers || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
                <DynamicValueListEditor type={type} listName="preferences" title="Preferences" placeholder="e.g., 'Never change function names unless requested.'" items={ctx.preferences || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            {/* Using the larger modal styles from previous request */}
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-5xl flex flex-col">
                <header className="p-4 flex justify-between items-center border-b theme-border flex-shrink-0">
                    <h3 className="text-lg flex items-center gap-2 theme-text-primary">
                        <FileJson className="text-blue-400" />
                        Context Editor (<span className="text-blue-400">.ctx</span>)
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full theme-hover">
                        <X size={20} />
                    </button>
                </header>

                <div className="border-b theme-border flex-shrink-0">
                    <div className="flex">
                        <button onClick={() => setActiveTab('project')} className={`px-4 py-2 text-sm ${activeTab === 'project' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-secondary'}`}>Project Context</button>
                        <button onClick={() => setActiveTab('global')} className={`px-4 py-2 text-sm ${activeTab === 'global' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-secondary'}`}>Global Context</button>
                    </div>
                </div>

                <main className="p-6 space-y-4 max-h-[75vh] overflow-y-auto flex-grow custom-scrollbar">
                    {isLoading ? <p className="text-center theme-text-muted">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
                        activeTab === 'project' ? renderForm('project') : renderForm('global')
                    )}
                </main>

                <footer className="border-t theme-border p-4 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="theme-button px-4 py-2 rounded text-sm">Cancel</button>
                    <button onClick={handleSave} className="theme-button-primary flex items-center gap-2 px-4 py-2 rounded text-sm" disabled={isLoading}>
                        <Save size={16} />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

// MODIFICATION: Updated to use AutosizeTextarea
const DynamicValueListEditor = ({ type, listName, title, placeholder, items, onValueChange, onAddItem, onRemoveItem }) => (
    <div className="space-y-2">
        <h4 className="text-sm theme-text-primary font-semibold mb-2">{title}</h4>
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start bg-gray-900/50 p-2 rounded-md border theme-border">
                    <AutosizeTextarea
                        value={item.value || ''}
                        onChange={(e) => onValueChange(type, listName, index, e.target.value)}
                        className="flex-1 theme-input bg-transparent border-none focus:ring-0 p-1 text-sm resize-none"
                        placeholder={placeholder}
                        rows={1}
                    />
                    <button onClick={() => onRemoveItem(type, listName, index)} className="p-2 rounded-md hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
        <button onClick={() => onAddItem(type, listName)} className="mt-2 text-sm theme-button theme-hover px-3 py-1 rounded flex items-center gap-1">
            <Plus size={14} /> Add
        </button>
    </div>
);

export default CtxEditor;
