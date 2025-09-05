import React, { useState, useEffect } from 'react';
import {
    Wrench, Loader, ChevronRight, X, Save, Plus, Trash2
} from 'lucide-react';
import AutosizeTextarea from './AutosizeTextarea';

const JinxMenu = ({ isOpen, onClose, currentPath }) => {
   
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jinxs, setJinxs] = useState([]);
    const [selectedJinx, setSelectedJinx] = useState(null);
    const [isGlobal, setIsGlobal] = useState(true);
    const [editedJinx, setEditedJinx] = useState(null);

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

    useEffect(() => {
        const loadJinxs = async () => {
            if (!isOpen) return;
            try {
                setLoading(true);
                setError(null);
                const response = isGlobal 
                    ? await window.api.getJinxsGlobal() 
                    : await window.api.getJinxsProject(currentPath);

                if (response.error) throw new Error(response.error);
                
                const sortedJinxs = (response.jinxs || []).sort((a, b) =>
                    (a.jinx_name || '').localeCompare(b.jinx_name || '')
                );
                setJinxs(sortedJinxs);
            } catch (err) {
                console.error('Error loading jinxs:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadJinxs();
    }, [isOpen, isGlobal, currentPath]);

    const handleJinxSelect = (jinx) => {
        setSelectedJinx(jinx);
        setEditedJinx({ ...jinx });
    };

    const handleNewJinx = () => {
        const newJinxTemplate = {
            jinx_name: 'new_tool',
            description: '',
            inputs: [],
            steps: [{ engine: 'natural', code: '' }]
        };
        setSelectedJinx(newJinxTemplate);
        setEditedJinx(newJinxTemplate);
    };

    const handleInputChange = (field, value) => setEditedJinx(prev => ({ ...prev, [field]: value }));
    const handleStepChange = (index, field, value) => {
        setEditedJinx(prev => {
            const newSteps = [...prev.steps];
            newSteps[index] = { ...newSteps[index], [field]: value };
            return { ...prev, steps: newSteps };
        });
    };
    const addStep = () => setEditedJinx(prev => ({ ...prev, steps: [...(prev.steps || []), { engine: 'natural', code: '' }] }));
    const removeStep = (index) => setEditedJinx(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));

    const handleInputValueChange = (index, value) => {
        setEditedJinx(prev => {
            const newInputs = [...(prev.inputs || [])];
            newInputs[index] = value;
            return { ...prev, inputs: newInputs };
        });
    };
    const addInput = () => setEditedJinx(prev => ({ ...prev, inputs: [...(prev.inputs || []), ''] }));
    const removeInput = (index) => setEditedJinx(prev => ({ ...prev, inputs: prev.inputs.filter((_, i) => i !== index) }));

    const handleSave = async () => {
        try {
            await window.api.saveJinx({ jinx: editedJinx, isGlobal, currentPath });
            const response = await (isGlobal ? window.api.getJinxsGlobal() : window.api.getJinxsProject(currentPath));
            setJinxs((response.jinxs || []).sort((a, b) => (a.jinx_name || '').localeCompare(b.jinx_name || '')));
            setSelectedJinx(editedJinx);
        } catch (err) {
            setError(err.message);
        }
    };
    
   
    if (!isOpen) return null;
 
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-6xl max-h-[85vh] flex flex-col">
                <header className="w-full border-b theme-border p-4 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Wrench className="text-blue-400" /> Jinx Editor
                    </h3>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsGlobal(!isGlobal)} className="theme-button px-4 py-2 rounded text-sm">
                            {isGlobal ? 'Switch to Project' : 'Switch to Global'}
                        </button>
                        <button onClick={onClose} className="p-1 rounded-full theme-hover">
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <main className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 border-r theme-border h-full flex flex-col">
                        <div className="p-2 border-b theme-border flex-shrink-0">
                            <button onClick={handleNewJinx} className="theme-button-primary w-full p-2 rounded text-sm flex items-center justify-center gap-2">
                                <Plus size={16} /> New Jinx
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
                            {loading ? <div className="flex items-center justify-center p-8"><Loader className="animate-spin text-blue-400" /></div>
                            : error ? <div className="text-red-400 p-4 text-center">{error}</div>
                            : jinxs.length > 0 ? jinxs.map((tool) => (
                                <button key={tool.jinx_name} onClick={() => handleJinxSelect(tool)}
                                    className={`flex items-center gap-3 w-full p-2 rounded text-sm text-left ${selectedJinx?.jinx_name === tool.jinx_name ? 'bg-blue-600/50' : 'theme-hover'}`}>
                                    <Wrench size={16} className="text-gray-400" />
                                    <span className="flex-1 truncate">{tool.jinx_name}</span>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </button>
                            )) : <div className="theme-text-secondary text-sm p-4 text-center">No jinxs found.</div>}
                        </div>
                    </div>

                    <div className="w-2/3 p-6 h-full overflow-y-auto custom-scrollbar">
                        {selectedJinx && editedJinx ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <label className="block text-xs theme-text-secondary mb-1">Jinx Name</label>
                                        <AutosizeTextarea
                                            className="w-full theme-input text-xl font-bold p-2 resize-none"
                                            value={editedJinx.jinx_name || ''}
                                            onChange={(e) => handleInputChange('jinx_name', e.target.value)}
                                            rows={1}
                                        />
                                    </div>
                                    <button onClick={handleSave} className="theme-button-success px-4 py-2 rounded text-sm flex items-center gap-2 mt-6">
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold theme-text-secondary mb-1">Description</label>
                                    <AutosizeTextarea
                                        className="w-full theme-input p-2 rounded text-sm resize-none min-h-[60px]"
                                        value={editedJinx.description || ''}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        placeholder="Describe what this jinx does..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold theme-text-secondary">Inputs</label>
                                        <button onClick={addInput} className="text-sm theme-button-subtle flex items-center gap-1"><Plus size={14} /> Add Input</button>
                                    </div>
                                    {(editedJinx.inputs || []).map((input, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <AutosizeTextarea
                                                className="flex-1 theme-input p-2 rounded text-sm resize-none"
                                                value={input}
                                                onChange={(e) => handleInputValueChange(index, e.target.value)}
                                                placeholder={`e.g., file_path, user_question`}
                                                rows={1}
                                            />
                                            <button onClick={() => removeInput(index)} className="p-2 theme-button-danger-subtle rounded"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold theme-text-secondary">Steps</h3>
                                        <button onClick={addStep} className="text-sm theme-button-subtle flex items-center gap-1"><Plus size={14} /> Add Step</button>
                                    </div>
                                    {editedJinx.steps?.map((step, index) => (
                                        <div key={index} className="space-y-3 p-4 bg-gray-900/50 rounded border theme-border">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-medium text-gray-300">Step {index + 1}</h4>
                                                <button onClick={() => removeStep(index)} className="p-1 theme-button-danger-subtle rounded"><X size={16} /></button>
                                            </div>
                                            <select
                                                className="w-full theme-input p-2 rounded text-sm"
                                                value={step.engine}
                                                onChange={(e) => handleStepChange(index, 'engine', e.target.value)}
                                            >
                                                <option value="natural">Natural Language</option>
                                                <option value="python">Python</option>
                                                <option value="bash">Bash</option>
                                            </select>
                                            {/* MODIFICATION HERE: Added max-h-64 and overflow-y-auto */}
                                            <AutosizeTextarea
                                                className="w-full theme-input p-2 rounded font-mono text-sm resize-y min-h-[100px] max-h-64 overflow-y-auto"
                                                value={step.code}
                                                onChange={(e) => handleStepChange(index, 'code', e.target.value)}
                                                placeholder={`Enter ${step.engine} logic...`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full theme-text-secondary">
                                <span>Select or create a Jinx to get started</span>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default JinxMenu;