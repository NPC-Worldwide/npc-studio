import React, { useState, useEffect } from 'react';
import { FileJson, X, Save, Plus, Trash2, Clock } from 'lucide-react';
import AutosizeTextarea from './AutosizeTextarea';
import McpServerMenu from './McpServerMenu';

const CtxEditor = ({ isOpen, onClose, currentPath, npcList = [], jinxList = [], embedded = false }) => {

    const [activeTab, setActiveTab] = useState('project');
    const [globalCtx, setGlobalCtx] = useState({});
    const [projectCtx, setProjectCtx] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mcpMenuOpen, setMcpMenuOpen] = useState(false);

    // Cron/Daemon state
    const [cronJobs, setCronJobs] = useState([]);
    const [daemons, setDaemons] = useState([]);
    const [newJobCommand, setNewJobCommand] = useState('');
    const [newJobSchedule, setNewJobSchedule] = useState('* * * * *');
    const [newJobNPC, setNewJobNPC] = useState('');
    const [newJobJinx, setNewJobJinx] = useState('');
    const [newDaemonName, setNewDaemonName] = useState('');
    const [newDaemonCommand, setNewDaemonCommand] = useState('');
    const [newDaemonNPC, setNewDaemonNPC] = useState('');
    const [newDaemonJinx, setNewDaemonJinx] = useState('');
    const [cronLoading, setCronLoading] = useState(false);
    const [cronError, setCronError] = useState(null);

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

    // Cron/Daemon functions
    const fetchCronAndDaemons = async () => {
        setCronLoading(true);
        setCronError(null);
        try {
            const response = await window.api.getCronDaemons(currentPath);
            if (response.error) throw new Error(response.error);
            setCronJobs(response.cronJobs || []);
            setDaemons(response.daemons || []);
        } catch (err) {
            setCronError(err.message || 'Failed to fetch cron jobs and daemons');
        } finally {
            setCronLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'cron' && currentPath) {
            fetchCronAndDaemons();
        }
    }, [isOpen, activeTab, currentPath]);

    const handleAddCronJob = async () => {
        if (!newJobCommand.trim()) return alert('Please enter command for the cron job');
        setCronLoading(true);
        setCronError(null);
        try {
            const res = await window.api.addCronJob({
                path: currentPath,
                schedule: newJobSchedule,
                command: newJobCommand,
                npc: newJobNPC,
                jinx: newJobJinx,
            });
            if (res.error) throw new Error(res.error);
            await fetchCronAndDaemons();
            setNewJobCommand('');
            setNewJobSchedule('* * * * *');
            setNewJobNPC('');
            setNewJobJinx('');
        } catch (err) {
            setCronError(err.message);
        } finally {
            setCronLoading(false);
        }
    };

    const handleRemoveCronJob = async (jobId) => {
        setCronLoading(true);
        setCronError(null);
        try {
            const res = await window.api.removeCronJob(jobId);
            if (res.error) throw new Error(res.error);
            await fetchCronAndDaemons();
        } catch (err) {
            setCronError(err.message);
        } finally {
            setCronLoading(false);
        }
    };

    const handleAddDaemon = async () => {
        if (!newDaemonName.trim()) return alert('Please enter daemon name');
        if (!newDaemonCommand.trim()) return alert('Please enter daemon command');
        setCronLoading(true);
        setCronError(null);
        try {
            const res = await window.api.addDaemon({
                path: currentPath,
                name: newDaemonName,
                command: newDaemonCommand,
                npc: newDaemonNPC,
                jinx: newDaemonJinx,
            });
            if (res.error) throw new Error(res.error);
            await fetchCronAndDaemons();
            setNewDaemonName('');
            setNewDaemonCommand('');
            setNewDaemonNPC('');
            setNewDaemonJinx('');
        } catch (err) {
            setCronError(err.message);
        } finally {
            setCronLoading(false);
        }
    };

    const handleRemoveDaemon = async (daemonId) => {
        setCronLoading(true);
        setCronError(null);
        try {
            const res = await window.api.removeDaemon(daemonId);
            if (res.error) throw new Error(res.error);
            await fetchCronAndDaemons();
        } catch (err) {
            setCronError(err.message);
        } finally {
            setCronLoading(false);
        }
    };

    const renderCronTab = () => {
        if (!currentPath) {
            return <div className="p-4 theme-text-muted">No project folder selected.</div>;
        }

        return (
            <div className="space-y-6 py-2">
                {cronError && <div className="text-red-500 mb-2">{cronError}</div>}
                {cronLoading && <div className="theme-text-muted mb-2">Loading...</div>}

                {/* Cron Jobs List */}
                <section>
                    <h3 className="font-semibold text-blue-400 mb-2">Cron Jobs</h3>
                    {cronJobs.length === 0 && <p className="theme-text-muted mb-4">No cron jobs defined for this folder.</p>}
                    {cronJobs.map((job, idx) => (
                        <div key={job.id || idx} className="flex justify-between items-center theme-bg-tertiary p-3 rounded mb-2">
                            <div>
                                <div><code className="font-mono text-sm">{job.schedule}</code> - {job.command}</div>
                                <div className="text-xs theme-text-muted">NPC: {job.npc || '—'} | Jinx: {job.jinx || '—'}</div>
                            </div>
                            <button onClick={() => { if (window.confirm(`Remove cron job: "${job.command}" ?`)) handleRemoveCronJob(job.id); }} title="Delete cron job" className="p-1 text-red-500 hover:text-red-400">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </section>

                {/* Add new cron job */}
                <section className="border-t theme-border pt-4">
                    <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2"><Plus size={18} /> Add New Cron Job</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Schedule (* * * * *)" value={newJobSchedule} onChange={e => setNewJobSchedule(e.target.value)} className="col-span-full theme-input text-sm" />
                        <input type="text" placeholder="Command (e.g., /sample 'hello world')" value={newJobCommand} onChange={e => setNewJobCommand(e.target.value)} className="col-span-full theme-input text-sm" />
                        <select value={newJobNPC} onChange={e => setNewJobNPC(e.target.value)} className="theme-input text-sm">
                            <option value=''>Select NPC (Optional)</option>
                            {npcList.map(npc => <option key={npc.name} value={npc.name}>{npc.display_name || npc.name}</option>)}
                        </select>
                        <select value={newJobJinx} onChange={e => setNewJobJinx(e.target.value)} className="theme-input text-sm">
                            <option value=''>Select Jinx (Optional)</option>
                            {jinxList.map(jinx => <option key={jinx.jinx_name} value={jinx.jinx_name}>{jinx.description ? `${jinx.jinx_name} - ${jinx.description.substring(0, 30)}...` : jinx.jinx_name}</option>)}
                        </select>
                        <button onClick={handleAddCronJob} disabled={cronLoading || !newJobCommand.trim()} className="col-span-full mt-2 theme-button-primary rounded px-4 py-2 font-semibold disabled:opacity-50">Add Cron Job</button>
                    </div>
                </section>

                {/* System Daemons List */}
                <section>
                    <h3 className="font-semibold text-blue-400 mb-2 mt-8">System Daemons</h3>
                    {daemons.length === 0 && <p className="theme-text-muted mb-4">No daemons defined for this folder.</p>}
                    {daemons.map((daemon, idx) => (
                        <div key={daemon.id || idx} className="flex justify-between items-center theme-bg-tertiary p-3 rounded mb-2">
                            <div>
                                <div><strong>{daemon.name}</strong>: {daemon.command}</div>
                                <div className="text-xs theme-text-muted">NPC: {daemon.npc || '—'} | Jinx: {daemon.jinx || '—'}</div>
                            </div>
                            <button onClick={() => { if (window.confirm(`Remove daemon: "${daemon.name}" ?`)) handleRemoveDaemon(daemon.id); }} title="Delete daemon" className="p-1 text-red-500 hover:text-red-400">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </section>

                {/* Add new daemon */}
                <section className="border-t theme-border pt-4">
                    <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2"><Plus size={18} /> Add New Daemon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Daemon Name" value={newDaemonName} onChange={e => setNewDaemonName(e.target.value)} className="col-span-full theme-input text-sm" />
                        <input type="text" placeholder="Command (e.g., /breathe)" value={newDaemonCommand} onChange={e => setNewDaemonCommand(e.target.value)} className="col-span-full theme-input text-sm" />
                        <select value={newDaemonNPC} onChange={e => setNewDaemonNPC(e.target.value)} className="theme-input text-sm">
                            <option value=''>Select NPC (Optional)</option>
                            {npcList.map(npc => <option key={npc.name} value={npc.name}>{npc.display_name || npc.name}</option>)}
                        </select>
                        <select value={newDaemonJinx} onChange={e => setNewDaemonJinx(e.target.value)} className="theme-input text-sm">
                            <option value=''>Select Jinx (Optional)</option>
                            {jinxList.map(jinx => <option key={jinx.jinx_name} value={jinx.jinx_name}>{jinx.description ? `${jinx.jinx_name} - ${jinx.description.substring(0, 30)}...` : jinx.jinx_name}</option>)}
                        </select>
                        <button onClick={handleAddDaemon} disabled={cronLoading || !newDaemonName.trim() || !newDaemonCommand.trim()} className="col-span-full mt-2 theme-button-primary rounded px-4 py-2 font-semibold disabled:opacity-50">Add Daemon</button>
                    </div>
                </section>
            </div>
        );
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
                        <AutosizeTextarea
                            value={ctx.context || ''}
                            onChange={(e) => handleFieldChange(type, 'context', e.target.value)}
                            className="w-full theme-input min-h-[96px] resize-y"
                            placeholder="A brief description of this project or team's purpose."
                        />
                    </div>
                </div>
                
                <DynamicValueListEditor type={type} listName="databases" title="Databases" placeholder="e.g., ~/npcsh_history.db" items={ctx.databases || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
                <div className="space-y-2">
                    <DynamicValueListEditor type={type} listName="mcp_servers" title="MCP Servers" placeholder="e.g., ~/.npcsh/mcp_server.py" items={ctx.mcp_servers || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
                    <div className="flex justify-end">
                        <button
                            onClick={() => setMcpMenuOpen(true)}
                            className="text-xs theme-button px-3 py-1 rounded"
                            title="Manage MCP servers and tools"
                        >
                            Open MCP Server Manager
                        </button>
                    </div>
                </div>
                <DynamicValueListEditor type={type} listName="preferences" title="Preferences" placeholder="e.g., 'Never change function names unless requested.'" items={ctx.preferences || []} onValueChange={handleDynamicValueChange} onAddItem={addDynamicValueItem} onRemoveItem={removeDynamicValueItem} />
            </div>
        );
    };

    if (!isOpen && !embedded) return null;

    const content = (
        <>
            {/* Tab Navigation */}
            <div className="border-b theme-border mb-4">
                <div className="flex">
                    <button onClick={() => setActiveTab('project')} className={`px-4 py-2 text-sm ${activeTab === 'project' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-secondary'}`}>Project Context</button>
                    <button onClick={() => setActiveTab('global')} className={`px-4 py-2 text-sm ${activeTab === 'global' ? 'border-b-2 border-blue-500 theme-text-primary' : 'theme-text-secondary'}`}>Global Context</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? <p className="text-center theme-text-muted">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
                    activeTab === 'project' ? renderForm('project') : renderForm('global')
                )}
            </div>

            {/* Save Button */}
            <div className="border-t theme-border pt-4 mt-4 flex justify-end">
                <button onClick={handleSave} className="theme-button-primary flex items-center gap-2 px-4 py-2 rounded text-sm" disabled={isLoading}>
                    <Save size={16} />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <McpServerMenu
                isOpen={mcpMenuOpen}
                onClose={() => setMcpMenuOpen(false)}
                currentPath={activeTab === 'project' ? currentPath : null}
            />
        </>
    );

    // Embedded mode - return just the content
    if (embedded) {
        return <div className="flex flex-col h-full">{content}</div>;
    }

    // Modal mode - wrap in modal container
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-5xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b theme-border flex-shrink-0">
                    <h3 className="text-lg flex items-center gap-2 theme-text-primary">
                        <FileJson className="text-blue-400" />
                        Context Editor (<span className="text-blue-400">.ctx</span>)
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full theme-hover">
                        <X size={20} />
                    </button>
                </header>
                <main className="p-6 flex-grow overflow-hidden">
                    {content}
                </main>
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
