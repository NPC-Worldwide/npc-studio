import React, { useState, useEffect, useRef } from 'react';
import { X, Command } from 'lucide-react';

// Cache for models by path
const modelCache = new Map();
const LAST_USED_MODEL_KEY = 'lastUsedModel';

const MacroInput = ({ isOpen, onClose, onSubmit, currentPath }) => {
    const [macro, setMacro] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState(null);
    const inputRef = useRef(null);

    // Debug logging for model selection
    useEffect(() => {
        if (selectedModel) {
            console.log('Selected model:', {
                value: selectedModel.value,
                provider: selectedModel.provider,
                display: selectedModel.display_name
            });
        }
    }, [selectedModel]);

    useEffect(() => {
        if (isOpen && currentPath) {
            const loadModels = async () => {
                let models;
                if (modelCache.has(currentPath)) {
                    models = modelCache.get(currentPath).models;
                } else {
                    const response = await window.api.getAvailableModels(currentPath);
                    if (response.models) {
                        modelCache.set(currentPath, response);
                        models = response.models;
                    }
                }

                if (models) {
                    setAvailableModels(models);
                    
                    // Try to find last used model
                    const lastUsedModel = localStorage.getItem(LAST_USED_MODEL_KEY);
                    if (lastUsedModel) {
                        const foundModel = models.find(m => 
                            m.value === JSON.parse(lastUsedModel).value && 
                            m.provider === JSON.parse(lastUsedModel).provider
                        );
                        if (foundModel) {
                            setSelectedModel(foundModel);
                            return;
                        }
                    }
                    // Fall back to first model if no last used model found
                    setSelectedModel(models[0]);
                }
            };
            loadModels();
        }
    }, [isOpen, currentPath]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!macro.trim() || isSubmitting || !selectedModel) return;

        setIsSubmitting(true);

        try {
            // Save the selected model as last used
            localStorage.setItem(LAST_USED_MODEL_KEY, JSON.stringify({
                value: selectedModel.value,
                provider: selectedModel.provider
            }));

            // Create conversation
            const conversation = await window.api.createConversation({
                title: macro.trim().slice(0, 50),
                type: 'conversation',
                directory_path: currentPath
            });

            // Switch immediately
            onSubmit({
                macro: macro.trim(),
                conversationId: conversation.id,
                result: null
            });

            onClose();

            // Execute command
            const result = await window.api.executeCommand({
                commandstr: macro.trim(),
                currentPath: currentPath,
                conversationId: conversation.id,
                model: selectedModel.value,
                provider: selectedModel.provider
            });

            onSubmit({
                macro: macro.trim(),
                conversationId: conversation.id,
                result
            });

        } catch (err) {
            console.error('Error executing command:', err);
        } finally {
            setIsSubmitting(false);
            setMacro('');
        }
    };


    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
             onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[#111318] rounded w-full max-w-2xl">
                <div className="p-3 flex justify-between items-center border-b border-gray-800/50">
                    <h3 className="text-sm flex items-center gap-2 text-gray-400">
                        <Command size={16} className="text-gray-500" />
                        Command
                    </h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-500">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-3 space-y-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={macro}
                        onChange={(e) => setMacro(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#0b0c0f] text-sm text-gray-300 rounded px-3 py-2
                                 placeholder-gray-600 focus:outline-none border-0"
                        placeholder="Type a command..."
                        disabled={isSubmitting}
                        autoFocus
                    />
                    
                    {/* Model Selection with explicit provider info */}
                    <select
                        value={selectedModel?.value || ''}
                        onChange={(e) => {
                            const model = availableModels.find(m => m.value === e.target.value);
                            console.log('Changing to model:', model);
                            setSelectedModel(model);
                        }}
                        className="w-full bg-[#0b0c0f] text-sm text-gray-300 rounded px-3 py-2
                                 border border-gray-800 focus:outline-none"
                    >
                        {availableModels.map(model => (
                            <option key={model.value} value={model.value}>
                                {model.display_name} ({model.provider})
                            </option>
                        ))}
                    </select>

                    <div className="mt-2 text-xs text-gray-600">
                        Press Enter to execute, Esc to cancel
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MacroInput;