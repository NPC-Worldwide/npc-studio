import React, { useState, useEffect } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot
} from 'lucide-react';

const StatCard = ({ icon, title, value, children }) => (
    <div className="theme-bg-tertiary p-4 rounded-lg flex flex-col">
        <div className="flex items-center gap-3 mb-2">
            {icon}
            <h4 className="font-semibold theme-text-secondary">{title}</h4>
        </div>
        {value !== undefined && (
            <p className="text-3xl font-bold theme-text-primary">{value}</p>
        )}
        {children && <div className="mt-2">{children}</div>}
    </div>
);

const DataDash = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await window.api.getUsageStats();
                if (response.error) {
                    throw new Error(response.error);
                }
                
                setStats(response.stats);

            } catch (err) {
                console.error('Error loading usage stats:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadStats();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <Loader className="animate-spin text-blue-400" size={48} />
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-red-400 p-4 text-center">
                    <ServerCrash size={48} className="mx-auto mb-4" />
                    <h3 className="text-lg font-bold">Failed to load stats</h3>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }
        
        if (stats) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    <StatCard 
                        icon={<MessageSquare className="text-green-400" />}
                        title="Total Conversations" 
                        value={stats.totalConversations} 
                    />
                    <StatCard 
                        icon={<MessageSquare className="text-green-400" />}
                        title="Total Messages" 
                        value={stats.totalMessages} 
                    />
                    <StatCard 
                        icon={<BrainCircuit className="text-purple-400" />}
                        title="Top 5 Models"
                    >
                        <ul className="space-y-1 text-sm theme-text-secondary">
                            {stats.topModels.map(m => (
                                <li key={m.model}>
                                    {m.model}: <span className="font-bold">{m.count}</span>
                                </li>
                            ))}
                        </ul>
                    </StatCard>
                    <StatCard 
                        icon={<Bot className="text-yellow-400" />}
                        title="Top 5 NPCs"
                    >
                        <ul className="space-y-1 text-sm theme-text-secondary">
                            {stats.topNPCs.map(n => (
                                <li key={n.npc}>
                                    {n.npc}: <span className="font-bold">{n.count}</span>
                                </li>
                            ))}
                        </ul>
                    </StatCard>
                </div>
            );
        }
        
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-4xl">
                <div className="w-full border-b theme-border p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="text-blue-400" />
                        Usage Dashboard
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default DataDash;