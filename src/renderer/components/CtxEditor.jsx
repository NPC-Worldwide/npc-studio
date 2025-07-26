import React, { useState, useEffect } from 'react';
import { FileJson, X, Save, Plus, Trash2 } from 'lucide-react';

const CtxEditor = ({ isOpen, onClose, currentPath }) => {
    const [activeTab, setActiveTab] = useState('project');
    const [globalCtx, setGlobalCtx] = useState({});
    const [projectCtx, setProjectCtx] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Effect for loading data when the modal opens or currentPath changes
    useEffect(() => {
        if (isOpen) {
            loadContexts();
        }
    }, [isOpen, currentPath]);

    // Effect for Escape key close
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]); // Depend on isOpen and onClose

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
                setProjectCtx({}); // No project path, no project context
            }
        } catch (err) {
            setError(err.message);
            console.error("Error loading contexts:", err);
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
            onClose(); // Close on successful save
        } catch (err) {
            setError(err.message);
            console.error("Error saving context:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFieldChange = (type, field, value) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => ({ ...prev, [field]: value }));
    };
    
    // Handler for dynamic lists that store simple strings (now wrapped in { value: "..." })
    const handleDynamicValueChange = (type, listName, index, value) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => {
            const newList = [...(prev[listName] || [])];
            // Ensure the item exists and is an object
            newList[index] = { ...(newList[index] || {}), value: value };
            return { ...prev, [listName]: newList };
        });
    };
    
    const addDynamicValueItem = (type, listName) => {
        const setCtx = type === 'global' ? setGlobalCtx : setProjectCtx;
        setCtx(prev => ({
            ...prev,
            [listName]: [...(prev[listName] || []), { value: '' }] // Add new item with a 'value' field
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
            <div className="space-y-6 py-2"> {/* Increased vertical spacing */}
                <div className="mb-4">
                    <h4 className="text-sm theme-text-primary border-b border-gray-700 pb-2 mb-3">Core Settings</h4>
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
                            <textarea
                                value={ctx.context || ''}
                                onChange={(e) => handleFieldChange(type, 'context', e.target.value)}
                                className="w-full theme-input h-24 resize-y"
                                placeholder="A brief description of this project or team's purpose."
                            />
                        </div>
                    </div>
                </div>
                
                {/* Dynamic Editor for Databases */}
                <DynamicValueListEditor
                    type={type}
                    listName="databases"
                    title="Databases"
                    placeholder="e.g., ~/npcsh_history.db"
                    items={ctx.databases || []}
                    onValueChange={handleDynamicValueChange}
                    onAddItem={addDynamicValueItem}
                    onRemoveItem={removeDynamicValueItem}
                    inputType="input" // Use input for shorter lines like paths
                />

                {/* Dynamic Editor for MCP Servers */}
                <DynamicValueListEditor
                    type={type}
                    listName="mcp_servers"
                    title="MCP Servers"
                    placeholder="e.g., ~/.npcsh/mcp_server.py"
                    items={ctx.mcp_servers || []}
                    onValueChange={handleDynamicValueChange}
                    onAddItem={addDynamicValueItem}
                    onRemoveItem={removeDynamicValueItem}
                    inputType="input"
                />
                
                {/* Dynamic Editor for Preferences */}
                <DynamicValueListEditor
                    type={type}
                    listName="preferences"
                    title="Preferences"
                    placeholder="e.g., 'Never change function names unless requested.'"
                    items={ctx.preferences || []}
                    onValueChange={handleDynamicValueChange}
                    onAddItem={addDynamicValueItem}
                    onRemoveItem={removeDynamicValueItem}
                    inputType="textarea" // Use textarea for longer text
                />
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <div className="p-4 flex justify-between items-center border-b theme-border flex-shrink-0">
                    <h3 className="text-lg flex items-center gap-2 theme-text-primary">
                        <FileJson className="text-blue-400" />
                        Context Editor (<span className="text-blue-400">.ctx</span>)
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 theme-text-muted hover:theme-text-primary transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="border-b theme-border flex-shrink-0">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('project')}
                            className={`px-4 py-2 text-sm ${activeTab === 'project' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-muted hover:bg-gray-800'}`}
                        >
                            Project Context
                        </button>
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`px-4 py-2 text-sm ${activeTab === 'global' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-muted hover:bg-gray-800'}`}
                        >
                            Global Context
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto flex-grow custom-scrollbar">
                    {isLoading ? <p className="text-center theme-text-muted">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
                        activeTab === 'project' ? renderForm('project') : renderForm('global')
                    )}
                </div>

                <div className="border-t theme-border p-4 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 theme-button theme-hover rounded text-sm">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 theme-button-primary px-4 py-2 rounded text-sm" disabled={isLoading}>
                        <Save size={16} />
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// A helper sub-component for dynamic lists that store simple string values
const DynamicValueListEditor = ({ type, listName, title, placeholder, items, onValueChange, onAddItem, onRemoveItem, inputType = "input" }) => (
    <div className="border border-gray-800 rounded-md p-4 bg-gray-900"> {/* Section styling */}
        <h4 className="text-sm theme-text-primary border-b border-gray-700 pb-2 mb-3">{title}</h4>
        <div className="space-y-3"> {/* Increased spacing between list items */}
            {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center bg-gray-850 p-3 rounded-md border border-gray-700"> {/* Item styling */}
                    {inputType === "textarea" ? (
                        <textarea
                            value={item.value || ''}
                            onChange={(e) => onValueChange(type, listName, index, e.target.value)}
                            className="flex-1 theme-input resize-y min-h-[40px] bg-transparent border-none focus:ring-0 focus:border-transparent"
                            placeholder={placeholder}
                            rows={1}
                        />
                    ) : (
                        <input
                            type="text"
                            value={item.value || ''}
                            onChange={(e) => onValueChange(type, listName, index, e.target.value)}
                            className="flex-1 theme-input bg-transparent border-none focus:ring-0 focus:border-transparent"
                            placeholder={placeholder}
                        />
                    )}
                    <button onClick={() => onRemoveItem(type, listName, index)} className="p-1 rounded-full hover:bg-red-700 text-red-400 hover:text-white transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
        <button onClick={() => onAddItem(type, listName)} className="mt-4 text-sm theme-button theme-hover px-3 py-1 rounded flex items-center gap-1">
            <Plus size={14} /> Add {title.slice(0, -1).replace(/s$/, '')} {/* Basic plural to singular */}
        </button>
    </div>
);

export default CtxEditor;