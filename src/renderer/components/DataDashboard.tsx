import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3, Loader, X, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart as BarChartIcon,
    Star, Trash2, Play, Copy, Download, Plus, Settings2, Edit,
    GitBranch, Brain, Zap, Clock, Repeat
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import ForceGraph2D from 'react-force-graph-2d';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Import from npcts
import {
    Modal, Tabs, Card,
    SQLQueryEditor, SQLResultsTable, SQLSchemaViewer,
    MemoryList, MemoryFilters,
    KnowledgeGraphViewer, KGControls, KGStats,
    ModelCard
} from 'npcts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale);

const generateId = () => `widget_${Math.random().toString(36).substr(2, 9)}`;
const iconMap = {
    MessageSquare, BrainCircuit, Bot, LineChart, BarChartIcon, Settings2, Edit,
    Database, Table, GitBranch, Brain, Zap, Clock, Repeat,
};

// Keep custom widget components
const WidgetContextMenu = ({ x, y, onSelect, onClose }) => {
    return (
        <>
            <div className="fixed inset-0 z-[69]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}></div>
            <div style={{ top: y, left: x }} className="fixed theme-bg-tertiary shadow-lg rounded-md p-1 z-[70] flex flex-col" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.stopPropagation()}>
                <button onClick={() => onSelect('edit')} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded theme-hover font-medium"><Edit size={14} className="flex-shrink-0" /> Edit Widget</button>
                <div className="border-t theme-border my-1"></div>
                <button onClick={() => onSelect('delete')} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded theme-hover font-medium"><Trash2 size={14} className="flex-shrink-0" /> Delete Widget</button>
            </div>
        </>
    );
};

const DashboardWidget = ({ config, onContextMenu }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeToggle, setActiveToggle] = useState(config.toggleOptions?.[0] || null);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); setError(null);
            try {
                let finalQuery = config.query;
                
                if (activeToggle && activeToggle.modifier) {
                    const baseQuery = config.query.replace(/;$/, '');
                    const regex = /SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)\s*(?:WHERE\s+(.*?))?\s*(?:GROUP BY\s+(.*?))?\s*(?:ORDER BY\s+(.*?))?\s*(?:LIMIT\s+(.*?))?$/is;
                    const match = baseQuery.match(regex);

                    if (match) {
                        const [, select, from, where, groupBy, orderBy, limit] = match;
                        finalQuery = `SELECT ${select} FROM ${from}`;
                        
                        if (where) {
                            finalQuery += ` WHERE ${where} AND (${activeToggle.modifier.replace(/^\s*WHERE\s*/i, '')})`;
                        } else {
                            finalQuery += ` ${activeToggle.modifier}`;
                        }
                        
                        if (groupBy) finalQuery += ` GROUP BY ${groupBy}`;
                        if (orderBy) finalQuery += ` ORDER BY ${orderBy}`;
                        if (limit) finalQuery += ` LIMIT ${limit}`;
                        finalQuery = finalQuery.replace(/\s+/g, ' ').trim();
                    } else {
                        finalQuery = `${baseQuery} ${activeToggle.modifier}`;
                    }
                }
                
                const response = config.apiFn ? await window.api[config.apiFn]() : await window.api.executeSQL({ query: finalQuery });
                const resultData = response.data || response.stats || response.result;
                if (response.error) throw new Error(response.error);
                setData(resultData);
            } catch (err) { setError(err.message); } finally { setLoading(false); }
        };
        fetchData();
    }, [config, activeToggle]);

    const renderContent = () => {
        if (loading) return <div className="flex items-center justify-center h-full"><Loader className="animate-spin text-blue-400"/></div>;
        if (error) return <div className="text-red-400 p-2 text-xs overflow-auto">{error}</div>;
        if (!data) return <div className="theme-text-secondary text-sm">No data</div>;

        switch (config.type) {
            case 'stat':
                const statValue = config.dataKey ? data[config.dataKey] : (data[0] ? Object.values(data[0])[0] : 'N/A');
                return <p className="text-3xl font-bold theme-text-primary">{statValue}</p>;
            
            case 'stat_list':
                const listData = config.dataKey ? data[config.dataKey] : data;
                if (!Array.isArray(listData)) return <div className="text-red-400 text-xs">Data is not an array.</div>;
                return <ul className="space-y-1 text-sm theme-text-secondary">{listData.map((item, i) => <li key={i}>{Object.values(item)[0]}: <span className="font-bold">{Object.values(item)[1]}</span></li>)}</ul>;

            case 'table':
                if (!Array.isArray(data) || data.length === 0) return <div className="theme-text-secondary text-sm">No data.</div>;
                return (
                    <div className="overflow-auto h-full text-xs">
                        <SQLResultsTable results={data} />
                    </div>
                );

            case 'chart':
            case 'line_chart':
            case 'bar_chart':
                if (!Array.isArray(data) || data.length === 0 || !config.chartConfig) return <div className="theme-text-secondary text-sm">Not enough data.</div>;
                
                const chartType = config.chartConfig.type || (config.type.includes('line') ? 'line' : 'bar');
                const yAxisExpressions = config.chartConfig.y ? config.chartConfig.y.split(',').map(s => s.trim()) : [];
                const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
                const xAxisKey = config.chartConfig.x ? (dataKeys.find(key => key.toLowerCase() === config.chartConfig.x.toLowerCase().split(' as ')[1]) || dataKeys.find(key => key.toLowerCase() === config.chartConfig.x.toLowerCase())) : dataKeys[0];

                const chartDatasets = yAxisExpressions.map((yExpr, index) => {
                    const yAxisKey = dataKeys.find(key => key.toLowerCase() === yExpr.toLowerCase().split(' as ')[1]) || dataKeys.find(key => key.toLowerCase() === yExpr.toLowerCase()); 
                    const values = data.map(d => parseFloat(d[yAxisKey]));
                    const colors = ['#8b5cf6', '#3b82f6', '#facc15', '#ef4444', '#22c55e'];

                    return {
                        label: yAxisKey || yExpr,
                        data: values,
                        backgroundColor: chartType === 'bar' ? colors[index % colors.length] : `${colors[index % colors.length]}33`,
                        borderColor: colors[index % colors.length],
                        fill: chartType === 'line',
                        tension: 0.3
                    };
                });
                
                const labels = data.map(d => {
                    const xValue = d[xAxisKey];
                    if (typeof xValue === 'string' && (xValue.includes('-') || xValue.includes(':'))) {
                        return new Date(xValue);
                    }
                    return xValue;
                });

                const chartData = { labels, datasets: chartDatasets };
                const chartOptions = {
                    responsive: true, maintainAspectRatio: false, 
                    plugins: { 
                        legend: { display: chartDatasets.length > 1, position: 'top', labels: { color: '#9ca3af' } },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: (labels.length > 0 && labels[0] instanceof Date) ? {
                            type: 'time', 
                            time: { unit: 'day', tooltipFormat: 'MMM dd, yyyy' },
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151'} 
                        } : { 
                            type: 'category', 
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151'} 
                        },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151'} }
                    }
                };
                const ChartComponent = chartType === 'line' ? Line : Bar;
                return <div className="h-full w-full"><ChartComponent options={chartOptions} data={chartData} /></div>;
            default: return null;
        }
    };
    
    const Icon = iconMap[config.iconName] || Settings2;
    return (
        <div className="theme-bg-tertiary p-4 rounded-lg flex flex-col h-full relative" onContextMenu={(e) => onContextMenu(e, config.id)}>
            <div className="flex justify-between items-start flex-shrink-0">
                <div className="flex items-center gap-3 mb-2 flex-1">
                    <Icon className={config.iconColor || 'text-gray-400'} size={18} />
                    <h4 className="font-semibold theme-text-secondary truncate">{config.title}</h4>
                </div>
                {(config.toggleOptions || []).length > 0 && (
                    <div className="flex items-center gap-1">
                        {config.toggleOptions.map(opt => (
                            <button 
                                key={opt.label} 
                                onClick={() => setActiveToggle(opt)} 
                                className={`px-2 py-0.5 text-xs rounded ${activeToggle?.label === opt.label ? 'theme-button-primary' : 'theme-button theme-hover'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1 mt-1 overflow-hidden">{renderContent()}</div>
        </div>
    );
};

const DataDashboard = ({ isOpen, onClose, currentPath, currentModel, currentProvider, currentNPC }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [widgets, setWidgets] = useState([]);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, widgetId: null });
    
    // SQL state
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM conversation_history LIMIT 10');
    const [sqlResults, setSqlResults] = useState([]);
    const [dbTables, setDbTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableSchema, setTableSchema] = useState([]);
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState(null);
    
    // Memory state
    const [memories, setMemories] = useState([]);
    const [memorySearch, setMemorySearch] = useState('');
    const [memoryStatus, setMemoryStatus] = useState('all');
    const [memoryLoading, setMemoryLoading] = useState(false);
    
    // KG state
    const [kgNodes, setKgNodes] = useState([]);
    const [kgLinks, setKgLinks] = useState([]);
    const [kgGeneration, setKgGeneration] = useState(0);
    const [maxKgGeneration, setMaxKgGeneration] = useState(0);
    const [kgLoading, setKgLoading] = useState(false);
    const [networkStats, setNetworkStats] = useState(null);
    
    // ML Models state
    const [mlModels, setMlModels] = useState([]);
    
    const defaultWidgets = [
        { id: 'total_convos', type: 'stat', title: 'Total Conversations', query: "SELECT COUNT(DISTINCT conversation_id) as total FROM conversation_history;", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'total_msgs', type: 'stat', title: 'Total Messages', query: "SELECT COUNT(*) as total FROM conversation_history WHERE role = 'user' OR role = 'assistant';", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'top_models', type: 'stat_list', title: 'Top 5 Models', query: "SELECT model, COUNT(*) as count FROM conversation_history WHERE model IS NOT NULL AND model != '' GROUP BY model ORDER BY count DESC LIMIT 5;", iconName: 'BrainCircuit', iconColor: 'text-purple-400', span: 1 },
        { id: 'top_npcs', type: 'stat_list', title: 'Top 5 NPCs', query: "SELECT npc, COUNT(*) as count FROM conversation_history WHERE npc IS NOT NULL AND npc != '' GROUP BY npc ORDER BY count DESC LIMIT 5;", iconName: 'Bot', iconColor: 'text-yellow-400', span: 1 },
    ];
    
    const tabs = [
        { id: 'overview', name: 'Overview', icon: BarChart3 },
        { id: 'sql', name: 'SQL Query', icon: Database },
        { id: 'memory', name: 'Memory', icon: Brain },
        { id: 'kg', name: 'Knowledge Graph', icon: GitBranch },
        { id: 'models', name: 'ML Models', icon: BrainCircuit }
    ];
    
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('dataDashWidgets');
            setWidgets(saved ? JSON.parse(saved) : defaultWidgets);
        }
    }, [isOpen]);
    
    // Load SQL tables
    useEffect(() => {
        if (isOpen && activeTab === 'sql') {
            window.api?.listTables?.().then((res) => {
                if (!res.error) setDbTables(res.tables || []);
            });
        }
    }, [isOpen, activeTab]);
    
    // Execute SQL
    const handleExecuteSQL = async () => {
        setSqlLoading(true);
        setSqlError(null);
        try {
            const result = await window.api?.executeSQL?.({ query: sqlQuery });
            if (result?.error) throw new Error(result.error);
            setSqlResults(result?.result || []);
        } catch (err) {
            setSqlError(err.message);
        } finally {
            setSqlLoading(false);
        }
    };
    
    // Load table schema
    const handleTableSelect = async (table) => {
        setSelectedTable(table);
        const result = await window.api?.getTableSchema?.({ tableName: table });
        if (!result?.error) {
            setTableSchema(result?.schema || []);
        }
    };
    
    // Load memories
    const loadMemories = async () => {
        setMemoryLoading(true);
        try {
            const result = await window.api?.executeSQL?.({
                query: `SELECT * FROM memory_lifecycle ORDER BY timestamp DESC LIMIT 100`
            });
            if (!result?.error) {
                setMemories(result?.result || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMemoryLoading(false);
        }
    };
    
    // Load KG
    const loadKG = async () => {
        setKgLoading(true);
        try {
            const result = await window.api?.kg_getGraphData?.({ generation: kgGeneration });
            if (!result?.error) {
                setKgNodes(result?.graph?.nodes || []);
                setKgLinks(result?.graph?.links || []);
            }
            
            const statsRes = await window.api?.kg_getNetworkStats?.({ generation: kgGeneration });
            if (!statsRes?.error) {
                setNetworkStats(statsRes?.stats);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setKgLoading(false);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'memory') loadMemories();
            if (activeTab === 'kg') loadKG();
        }
    }, [isOpen, activeTab, kgGeneration]);
    
    const handleContextMenu = (e, widgetId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, widgetId });
    };
    
    const handleContextMenuSelect = (action) => {
        if (action === 'delete') {
            const newWidgets = widgets.filter(w => w.id !== contextMenu.widgetId);
            setWidgets(newWidgets);
            localStorage.setItem('dataDashWidgets', JSON.stringify(newWidgets));
        }
        setContextMenu({ visible: false, x: 0, y: 0, widgetId: null });
    };
    
    const filteredMemories = memories.filter(m => {
        const matchesStatus = memoryStatus === 'all' || m.status === memoryStatus;
        const matchesSearch = !memorySearch || 
            m.initial_memory?.toLowerCase().includes(memorySearch.toLowerCase()) ||
            m.final_memory?.toLowerCase().includes(memorySearch.toLowerCase());
        return matchesStatus && matchesSearch;
    });
    
    if (!isOpen) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Data Dashboard" size="full">
            <div className="flex flex-col h-full">
                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {widgets.map(widget => (
                                <div key={widget.id} className={`h-56 ${widget.span ? `lg:col-span-${widget.span}` : 'lg:col-span-1'}`}>
                                    <DashboardWidget config={widget} onContextMenu={handleContextMenu} />
                                </div>
                            ))}
                            <div className="flex items-center justify-center h-56 border-2 border-dashed theme-border rounded-lg">
                                <button className="theme-button text-sm flex flex-col items-center gap-2">
                                    <Plus size={16}/> Add Widget
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'sql' && (
                        <div className="space-y-4">
                            <Card title="Database Schema">
                                <SQLSchemaViewer
                                    tables={dbTables}
                                    selectedTable={selectedTable}
                                    schema={tableSchema}
                                    onTableSelect={handleTableSelect}
                                />
                            </Card>
                            
                            <Card title="SQL Query">
                                <SQLQueryEditor
                                    query={sqlQuery}
                                    onQueryChange={setSqlQuery}
                                    onExecute={handleExecuteSQL}
                                    loading={sqlLoading}
                                />
                            </Card>
                            
                            {sqlError && <div className="text-red-400 p-3 rounded theme-bg-tertiary">{sqlError}</div>}
                            
                            {sqlResults.length > 0 && (
                                <Card title="Results">
                                    <SQLResultsTable results={sqlResults} />
                                </Card>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'memory' && (
                        <div className="space-y-4">
                            <Card title="Memory Filters">
                                <MemoryFilters
                                    searchTerm={memorySearch}
                                    onSearchChange={setMemorySearch}
                                    statusFilter={memoryStatus}
                                    onStatusFilterChange={setMemoryStatus}
                                />
                            </Card>
                            
                            <Card title={`Memories (${filteredMemories.length})`}>
                                {memoryLoading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader className="animate-spin" />
                                    </div>
                                ) : (
                                    <MemoryList memories={filteredMemories} />
                                )}
                            </Card>
                        </div>
                    )}
                    
                    {activeTab === 'kg' && (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 space-y-4">
                                <KGControls
                                    currentGeneration={kgGeneration}
                                    maxGeneration={maxKgGeneration}
                                    onGenerationChange={setKgGeneration}
                                    onRollback={() => {}}
                                    onSleep={() => {}}
                                    onDream={() => {}}
                                    loading={kgLoading}
                                />
                                <KGStats
                                    nodeCount={kgNodes.length}
                                    linkCount={kgLinks.length}
                                    networkStats={networkStats}
                                />
                            </div>
                            <div className="col-span-3">
                                {kgLoading ? (
                                    <div className="h-96 flex items-center justify-center">
                                        <Loader className="animate-spin" />
                                    </div>
                                ) : (
                                    <KnowledgeGraphViewer
                                        nodes={kgNodes}
                                        links={kgLinks}
                                        width={800}
                                        height={384}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'models' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mlModels.length > 0 ? (
                                mlModels.map(model => (
                                    <ModelCard key={model.id} model={model} />
                                ))
                            ) : (
                                <div className="col-span-full text-center p-8 text-gray-500">
                                    No models trained yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {contextMenu.visible && (
                <WidgetContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu({ visible: false, x: 0, y: 0, widgetId: null })}
                    onSelect={handleContextMenuSelect}
                />
            )}
        </Modal>
    );
};

export default DataDashboard;