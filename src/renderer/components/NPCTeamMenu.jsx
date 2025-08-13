import React, { useState, useEffect } from 'react';
import {
    Bot, Loader, ChevronRight, X, Save, MessageSquare
} from 'lucide-react';
import AutosizeTextarea from './AutosizeTextarea';

const NPCTeamMenu = ({ isOpen, onClose, currentPath, startNewConversation }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [npcs, setNpcs] = useState([]);
    const [selectedNpc, setSelectedNpc] = useState(null);
    const [isGlobal, setIsGlobal] = useState(true);
    const [editedNpc, setEditedNpc] = useState(null);

    // MODIFICATION: Added useEffect for Escape key handling
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
    }, [isOpen, onClose]);

    const handleChatWithNpc = () => {
        if (selectedNpc) {
            startNewConversation(selectedNpc);
            onClose();
        }
    };

    useEffect(() => {
        const loadNPCTeam = async () => {
            if (!isOpen) return;
            try {
                setLoading(true);
                setError(null);
                const response = isGlobal
                    ? await window.api.getNPCTeamGlobal()
                    : await window.api.getNPCTeamProject(currentPath);
                setNpcs(response.npcs || []);
            } catch (err) {
                console.error('Error loading NPC team:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadNPCTeam();
    }, [isOpen, isGlobal, currentPath]);

    const handleNPCSelect = (npc) => {
        setSelectedNpc(npc);
        setEditedNpc(npc);
    };

    const handleInputChange = (field, value) => {
        setEditedNpc(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            await window.api.saveNPC({ npc: editedNpc, isGlobal, currentPath });
            const updatedNpcs = await (isGlobal ? window.api.getNPCTeamGlobal() : window.api.getNPCTeamProject(currentPath));
            setNpcs(updatedNpcs.npcs || []);
            setSelectedNpc(editedNpc);
        } catch (err) {
            setError(err.message);
        }
    };

    const toggleNpcType = () => {
        setIsGlobal(prev => !prev);
        setSelectedNpc(null);
        setEditedNpc(null);
    };

    if (!isOpen) return null;

    // The rest of the component's JSX remains the same as provided previously
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                <header className="w-full border-b theme-border p-4 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Bot className="text-blue-400" /> NPC Team Editor
                    </h3>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleNpcType} className="theme-button px-4 py-2 rounded text-sm">
                            {isGlobal ? 'Switch to Project' : 'Switch to Global'}
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full theme-hover" aria-label="Close menu">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 border-r theme-border h-full overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center p-8"><Loader className="animate-spin text-blue-400" /></div>
                        ) : error ? (
                            <div className="text-red-400 p-4 text-center">{error}</div>
                        ) : (
                            <div className="space-y-1 p-2">
                                {npcs.length > 0 ? npcs.map((npc) => (
                                    <button key={npc.name} onClick={() => handleNPCSelect(npc)}
                                        className={`flex items-center gap-3 w-full p-2 rounded text-sm text-left ${selectedNpc?.name === npc.name ? 'theme-button-primary' : 'theme-hover'}`}>
                                        <Bot size={16} />
                                        <span className="flex-1 truncate">{npc.name}</span>
                                        <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
                                    </button>
                                )) : (
                                    <div className="theme-text-secondary text-sm p-4 text-center">No NPCs found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-2/3 p-6 h-full overflow-y-auto custom-scrollbar">
                        {selectedNpc && editedNpc ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-xs theme-text-secondary mb-1">NPC Name</label>
                                        <AutosizeTextarea
                                            className="w-full theme-input text-xl font-bold p-2"
                                            value={editedNpc.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            rows={1}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 pt-6">
                                         <button onClick={handleChatWithNpc} className="theme-button-primary px-4 py-2 rounded text-sm flex items-center gap-2">
                                            <MessageSquare size={16} /> Chat
                                        </button>
                                        <button onClick={handleSave} className="theme-button-success px-4 py-2 rounded text-sm flex items-center gap-2">
                                            <Save size={16} /> Save
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <EditableField label="Primary Directive" value={editedNpc.primary_directive || ''} onChange={(e) => handleInputChange('primary_directive', e.target.value)} />
                                    <EditableField label="Model" value={editedNpc.model || ''} onChange={(e) => handleInputChange('model', e.target.value)} />
                                    <EditableField label="Provider" value={editedNpc.provider || ''} onChange={(e) => handleInputChange('provider', e.target.value)} />
                                    <EditableField label="API URL" value={editedNpc.api_url || ''} onChange={(e) => handleInputChange('api_url', e.target.value)} />
                                    <div>
                                        <label className="block text-sm font-semibold theme-text-secondary mb-1">Use Global Tools</label>
                                        <select
                                            className="w-full theme-input p-2 text-sm"
                                            value={editedNpc.use_global_tools ?? true}
                                            onChange={(e) => handleInputChange('use_global_tools', e.target.value === 'true')}
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full theme-text-secondary">
                                <span>Select an NPC to view or edit details</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

const EditableField = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-semibold theme-text-secondary mb-1">{label}</label>
        <AutosizeTextarea
            className="w-full theme-input p-2 rounded resize-y min-h-[40px] text-sm"
            value={value}
            onChange={onChange}
        />
    </div>
);

export default NPCTeamMenu;
