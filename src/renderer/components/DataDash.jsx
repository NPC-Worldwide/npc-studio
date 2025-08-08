import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart,
    Star, Trash2, Play, Copy, Download,
    GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend
} from 'chart.js';
import * as d3 from 'd3';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend
);
const generateId = () => Math.random().toString(36).substr(2, 9); // This was missing and caused previous error

const log = (...args) => console.log('[DataDash]', ...args);
const error = (...args) => console.error('[DataDash]', ...args);

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

const DataDash = ({ isOpen, onClose, initialAnalysisContext, currentModel, currentProvider, currentNPC }) => {
    log('Component rendering. isOpen:', isOpen);

    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const [timePeriod, setTimePeriod] = useState('30d');
    const [activityData, setActivityData] = useState(null);
    const [histogramData, setHistogramData] = useState(null);
    const [loadingCharts, setLoadingCharts] = useState(true);
    const [chartsError, setChartsError] = useState(null);

    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM conversation_history LIMIT 10;');
    const [queryResult, setQueryResult] = useState(null);
    const [loadingQuery, setLoadingQuery] = useState(false);
    const [queryError, setQueryError] = useState(null);
    const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);

    const [dbTables, setDbTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableSchema, setTableSchema] = useState(null);
    const [loadingSchema, setLoadingSchema] = useState(false);

    const [plotConfig, setPlotConfig] = useState(null);
    const [plotXColumn, setPlotXColumn] = useState('');
    const [plotYColumn, setPlotYColumn] = useState('');
    const [plotType, setPlotType] = useState('line');

    const [queryHistory, setQueryHistory] = useState([]);
    const [activeHistoryTab, setActiveHistoryTab] = useState('recent');
    const [showExportSuccess, setShowExportSuccess] = useState('');

    const [sqlInputMode, setSqlInputMode] = useState('sql');
    const [nlQuery, setNlQuery] = useState('');
    const [generatedSql, setGeneratedSql] = useState('');
    const [generatingSql, setGeneratingSql] = useState(false);
    const [nlToSqlStreamId, setNlToSqlStreamId] = useState(null);

    const [kgData, setKgData] = useState({ nodes: [], links: [] });
    const [kgGenerations, setKgGenerations] = useState([]);
    const [currentKgGeneration, setCurrentKgGeneration] = useState(null);
    const [kgLoading, setKgLoading] = useState(true);
    const [kgError, setKgError] = useState(null);
    const graphRef = useRef();


    useEffect(() => {
        if (!window.api) {
            error('CRITICAL: window.api is not defined!');
        } else {
            log('Confirmed: window.api is available.');
        }
    }, []);

    const loadDashboardData = useCallback(async () => {
        if (!isOpen) {
            log('Dashboard not open, skipping stats fetch.');
            return;
        }
        log('Starting to load dashboard stats.');
        setLoadingStats(true);
        setStatsError(null);
        try {
            log('Calling window.api.getUsageStats...');
            const response = await window.api.getUsageStats();
            if (response.error) {
                throw new Error(response.error);
            }
            setStats(response.stats);
        } catch (err) {
            error('Failed to get usage stats:', err);
            setStatsError(err.message);
        } finally {
            log('Finished loading stats.');
            setLoadingStats(false);
        }
    }, [isOpen]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const loadChartData = useCallback(async () => {
        if (!isOpen) {
            log('Dashboard not open, skipping chart data fetch.');
            return;
        }
        log('Starting to load chart data for period:', timePeriod);
        setLoadingCharts(true);
        setChartsError(null);
        try {
            const activityPromise = window.api.getActivityData({ period: timePeriod });
            const histogramPromise = window.api.getHistogramData();
            
            const [activityResponse, histogramResponse] = await Promise.all([activityPromise, histogramPromise]);
            
            if (activityResponse.error) throw new Error(`Activity data error: ${activityResponse.error}`);
            if (histogramResponse.error) throw new Error(`Histogram data error: ${histogramResponse.error}`);

            setActivityData(activityResponse.data);
            setHistogramData(histogramResponse.data);
        } catch (err) {
            error('Failed to load chart data:', err);
            setChartsError(err.message);
        } finally {
            log('Finished loading chart data.');
            setLoadingCharts(false);
        }
    }, [isOpen, timePeriod]);

    useEffect(() => {
        loadChartData();
    }, [loadChartData]);

    useEffect(() => {
        const fetchTables = async () => {
            if (isQueryPanelOpen && dbTables.length === 0) {
                try {
                    const res = await window.api.listTables();
                    if (res.error) throw new Error(res.error);
                    setDbTables(res.tables || []);
                } catch (err) {
                    error("Failed to list DB tables:", err);
                    setQueryError("Could not fetch database tables.");
                }
            }
        };
        fetchTables();
    }, [isQueryPanelOpen, dbTables.length]);

    const handleViewSchema = async (tableName) => {
        if (selectedTable === tableName) {
            setSelectedTable(null);
            setTableSchema(null);
            return;
        }
        setSelectedTable(tableName);
        setLoadingSchema(true);
        setTableSchema(null);
        try {
            const res = await window.api.getTableSchema({ tableName });
            if (res.error) throw new Error(res.error);
            setTableSchema(res.schema);
        } catch (err) {
            error(`Failed to get schema for ${tableName}:`, err);
            setQueryError(`Could not load schema for ${tableName}.`);
        } finally {
            setLoadingSchema(false);
        }
    };
    
    useEffect(() => {
        if (loadingQuery) {
            setPlotConfig(null);
            setPlotXColumn('');
            setPlotYColumn('');
        }
    }, [loadingQuery]);

    const handleExecuteQuery = async () => {
        log('Executing SQL query:', sqlQuery);
        setLoadingQuery(true);
        setQueryError(null);
        setQueryResult(null);
        try {
            const response = await window.api.executeSQL({ query: sqlQuery });
            if (response.error) throw new Error(response.error);
            setQueryResult(response.result);
            if (response.result && response.result.length > 0) {
                const columns = Object.keys(response.result[0]);
                setPlotXColumn(columns[0] || '');
                setPlotYColumn(columns.length > 1 ? columns[1] : '');
            }
            
            const newHistory = [
              { query: sqlQuery, favorited: false, date: new Date().toISOString() },
              ...queryHistory.filter(h => h.query !== sqlQuery)
            ].slice(0, 20);
            setQueryHistory(newHistory);
            localStorage.setItem('dataDashQueryHistory', JSON.stringify(newHistory));

        } catch (err) {
            error('Failed to execute SQL query:', err);
            setQueryError(err.message);
        } finally {
            log('Finished SQL query execution.');
            setLoadingQuery(false);
        }
    };
    
    const handleGeneratePlot = () => {
        if (!plotXColumn || !plotYColumn || !queryResult) return;

        const labels = queryResult.map(row => row[plotXColumn]);
        const data = queryResult.map(row => parseFloat(row[plotYColumn]));

        setPlotConfig({
            labels,
            datasets: [{
                label: `${plotYColumn} by ${plotXColumn}`,
                data,
                borderColor: plotType === 'line' ? '#3b82f6' : undefined,
                backgroundColor: plotType === 'line' ? '#3b82f633' : '#8b5cf6',
                fill: plotType === 'line' ? true : undefined,
                tension: 0.3
            }]
        });
    };

    const handleHistoryAction = (index, action) => {
        const updatedHistory = [...queryHistory];
        const item = updatedHistory[index];

        if (action === 'run') {
            setSqlQuery(item.query);
        } else if (action === 'copy') {
            navigator.clipboard.writeText(item.query);
        } else if (action === 'favorite') {
            item.favorited = !item.favorited;
            updatedHistory.splice(index, 1);
            updatedHistory.unshift(item);
        } else if (action === 'delete') {
            updatedHistory.splice(index, 1);
        }
        
        setQueryHistory(updatedHistory);
        localStorage.setItem('dataDashQueryHistory', JSON.stringify(updatedHistory));
    };

    const handleExportCSV = async () => {
        if (!queryResult || queryResult.length === 0) return;
        setShowExportSuccess('');
        const res = await window.api.exportToCSV(queryResult);
        if (res.success) {
            setShowExportSuccess(`Successfully exported to ${res.path}`);
            setTimeout(() => setShowExportSuccess(''), 5000);
        } else {
            setQueryError(res.error || res.message || 'CSV export failed.');
        }
    };


const handleGenerateSql = async () => {
    if (!nlQuery.trim()) return;

    setGeneratingSql(true);
    setGeneratedSql('');
    setQueryError(null);

    try {
        // Get schema information to include in the prompt
        const schemaInfo = await Promise.all(dbTables.map(async (table) => {
            const schemaRes = await window.api.getTableSchema({ tableName: table });
            if (schemaRes.error) return `/* Could not load schema for ${table} */`;
            const columns = schemaRes.schema.map(col => `  ${col.name} ${col.type}`).join(',\n');
            return `TABLE ${table}(\n${columns}\n);`;
        }));

        // Create a prompt for SQL generation
        const prompt = `Given this database schema:

${schemaInfo.join('\n\n')}

Generate a SQL query for: ${nlQuery}

Please provide only the SQL query without any markdown formatting or explanations.`;

        const newStreamId = generateId();
        setNlToSqlStreamId(newStreamId);

        // Use executeCommandStream like ChatInterface does
        const result = await window.api.executeCommandStream({
            commandstr: prompt,
            currentPath: '/', // or whatever default path you want
            conversationId: null, // No conversation needed for this
            model: currentModel,
            provider: currentProvider,
            npc: currentNPC,
            streamId: newStreamId,
            attachments: []
        });

        if (result && result.error) {
            throw new Error(result.error);
        }
    } catch (err) {
        setQueryError(err.message);
        setGeneratingSql(false);
        setNlToSqlStreamId(null);
    }
};
 
useEffect(() => {
    if (!nlToSqlStreamId) return;

    const handleStreamData = (_, { streamId, chunk }) => {
        if (streamId !== nlToSqlStreamId) return;

        try {
            let content = '';
            if (typeof chunk === 'string') {
                if (chunk.startsWith('data:')) {
                    const dataContent = chunk.replace(/^data:\s*/, '').trim();
                    if (dataContent === '[DONE]') return;
                    if (dataContent) {
                        try {
                            const parsed = JSON.parse(dataContent);
                            content = parsed.choices?.[0]?.delta?.content || '';
                        } catch (e) {
                            console.warn('DataDash: Malformed JSON in stream data, treating as raw:', dataContent, e);
                            content = dataContent;
                        }
                    }
                } else {
                    content = chunk;
                }
            } else if (chunk?.choices) {
                content = chunk.choices[0]?.delta?.content || '';
            }
            
            if (content) {
                setGeneratedSql(prev => prev + content);
            }
        } catch (err) {
            console.error('DataDash: Error processing NL-to-SQL stream chunk:', err, 'Raw chunk:', chunk);
        }
    };

    const handleStreamComplete = (_, { streamId }) => {
        if (streamId !== nlToSqlStreamId) return;
        setGeneratingSql(false);
        // Clean up generated SQL: remove markdown fences and trim
        setGeneratedSql(prev => prev.replace(/```sql|```/g, '').trim());
        setNlToSqlStreamId(null);
    };

    const handleStreamError = (_, { streamId, error }) => {
        if (streamId !== nlToSqlStreamId) return;
        setQueryError(`NL-to-SQL Error: ${error}`);
        setGeneratingSql(false);
        setNlToSqlStreamId(null);
    };

    const cleanupData = window.api.onStreamData(handleStreamData);
    const cleanupComplete = window.api.onStreamComplete(handleStreamComplete);
    const cleanupError = window.api.onStreamError(handleStreamError);

    return () => {
        cleanupData();
        cleanupComplete();
        cleanupError();
    };
}, [nlToSqlStreamId]);

    const handleAcceptGeneratedSql = () => {
        setSqlQuery(generatedSql);
        setSqlInputMode('sql');
    };

    // KG Handlers
    useEffect(() => {
        const fetchKgData = async () => {
            setKgLoading(true);
            setKgError(null);
            try {
                const [generationsRes, graphDataRes] = await Promise.all([
                    window.api.kg_listGenerations(),
                    window.api.kg_getGraphData({ generation: currentKgGeneration })
                ]);

                if (generationsRes.error) throw new Error(`Generations Error: ${generationsRes.error}`);
                if (graphDataRes.error) throw new Error(`Graph Data Error: ${graphDataRes.error}`);
                
                setKgGenerations(generationsRes.generations || []);
                setKgData(graphDataRes.graph || { nodes: [], links: [] });

                if (currentKgGeneration === null && generationsRes.generations?.length > 0) {
                    setCurrentKgGeneration(Math.max(...generationsRes.generations));
                }

            } catch (err) {
                setKgError(err.message);
            } finally {
                setKgLoading(false);
            }
        };

        if (isOpen) {
            fetchKgData();
        }
    }, [isOpen, currentKgGeneration]);

    useEffect(() => {
        if (kgData && graphRef.current) {
          graphRef.current.d3Force('charge').strength(-100);
          graphRef.current.d3Force('link').distance(50);
          graphRef.current.d3Force('center', d3.forceCenter(0, 0));
          graphRef.current.zoomToFit(400);
        }
    }, [kgData]);

    const handleKgProcessTrigger = async (type) => {
        setKgLoading(true);
        setKgError(null);
        try {
            await window.api.kg_triggerProcess({ type });
            setCurrentKgGeneration(null);
        } catch (err) {
            setKgError(err.message);
        } finally {
            setKgLoading(false);
        }
    };

    const handleKgRollback = async () => {
        if (currentKgGeneration > 0) {
            setKgLoading(true);
            setKgError(null);
            const targetGen = currentKgGeneration - 1;
            try {
                await window.api.kg_rollback({ generation: targetGen });
                setCurrentKgGeneration(targetGen);
            } catch (err) {
                setKgError(err.message);
            } finally {
                setKgLoading(false);
            }
        }
    };

    useEffect(() => {
        const runAnalysisQuery = async (query) => {
            setSqlQuery(query);
            setLoadingQuery(true);
            setQueryError(null);
            setQueryResult(null);
            try {
                const response = await window.api.executeSQL({ query });
                if (response.error) throw new Error(response.error);
                setQueryResult(response.result);
                 if (response.result && response.result.length > 0) {
                    const columns = Object.keys(response.result[0]);
                    setPlotXColumn(columns[0] || '');
                    setPlotYColumn(columns.length > 1 ? columns[1] : '');
                }
            } catch (err) {
                setQueryError(err.message);
            } finally {
                setLoadingQuery(false);
            }
        };

        if (isOpen && initialAnalysisContext?.type === 'conversations' && initialAnalysisContext.ids?.length > 0) {
            setIsQueryPanelOpen(true);
            const ids = initialAnalysisContext.ids.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
            const query = `SELECT role, npc, model, LENGTH(content) as content_length, timestamp FROM conversation_history WHERE conversation_id IN (${ids}) ORDER BY timestamp;`;
            runAnalysisQuery(query);
        }
    }, [isOpen, initialAnalysisContext]);

    const renderContent = (type, isLoading, errorState, content) => {
        if (isLoading) {
            log(`Rendering loader for: ${type}`);
            const loaderPlaceholders = type === 'stats' ? 4 : 2;
            const gridCols = type === 'stats' ? 'lg:grid-cols-4' : 'lg:grid-cols-2';
            const height = type === 'stats' ? 'h-36' : 'h-80';

            return (
                <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4`}>
                    {Array(loaderPlaceholders).fill(0).map((_, i) => (
                        <div key={i} className={`theme-bg-tertiary p-4 rounded-lg ${height} flex items-center justify-center`}>
                           <Loader className="animate-spin text-blue-400" size={32} />
                        </div>
                    ))}
                </div>
            );
        }
        if (errorState) {
            log(`Rendering error for: ${type}`);
            return (
                 <div className="text-red-400 p-4 text-center col-span-full theme-bg-tertiary rounded-lg">
                    <ServerCrash size={32} className="mx-auto mb-2" />
                    <h3 className="font-bold">Failed to load {type}</h3>
                    <p className="text-sm">{errorState}</p>
                </div>
            );
        }
        return content();
    };
    
    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151'} },
            y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151'} }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                <header className="w-full border-b theme-border p-4 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="text-blue-400" />
                        Usage Dashboard
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full theme-hover">
                        <X size={20} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-8">
                    <section id="usage-stats">
                        {renderContent('stats', loadingStats, statsError, () => (
                            stats && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard icon={<MessageSquare className="text-green-400" />} title="Total Conversations" value={stats.totalConversations} />
                                    <StatCard icon={<MessageSquare className="text-green-400" />} title="Total Messages" value={stats.totalMessages} />
                                    <StatCard icon={<BrainCircuit className="text-purple-400" />} title="Top 5 Models">
                                        <ul className="space-y-1 text-sm theme-text-secondary">
                                            {stats.topModels.map(m => <li key={m.model}>{m.model}: <span className="font-bold">{m.count}</span></li>)}
                                        </ul>
                                    </StatCard>
                                    <StatCard icon={<Bot className="text-yellow-400" />} title="Top 5 NPCs">
                                        <ul className="space-y-1 text-sm theme-text-secondary">
                                            {stats.topNPCs.map(n => <li key={n.npc}>{n.npc}: <span className="font-bold">{n.count}</span></li>)}
                                        </ul>
                                    </StatCard>
                                </div>
                            )
                        ))}
                    </section>
                    
                    <section id="charts">
                       {renderContent('charts', loadingCharts, chartsError, () => (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="theme-bg-tertiary p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold theme-text-secondary">Activity Over Time</h4>
                                        <div className="flex items-center gap-1">
                                            {['7d', '30d', '90d'].map(period => (
                                                <button key={period} onClick={() => setTimePeriod(period)}
                                                    className={`px-3 py-1 text-xs rounded-md ${timePeriod === period ? 'theme-button-primary' : 'theme-button theme-hover'}`}>
                                                    {period.replace('d', ' Days')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        {activityData && <Line options={chartOptions} data={{
                                            labels: activityData.map(d => d.date),
                                            datasets: [{
                                                label: 'Messages', data: activityData.map(d => d.count),
                                                borderColor: '#3b82f6', backgroundColor: '#3b82f633',
                                                fill: true, tension: 0.3
                                            }]
                                        }} />}
                                    </div>
                                </div>
                                <div className="theme-bg-tertiary p-4 rounded-lg">
                                    <h4 className="font-semibold theme-text-secondary mb-4">Message Length Distribution (chars)</h4>
                                    <div className="h-64">
                                         {histogramData && <Bar options={chartOptions} data={{
                                            labels: histogramData.map(d => d.bin),
                                            datasets: [{
                                                label: 'Message Count', data: histogramData.map(d => d.count),
                                                backgroundColor: '#8b5cf6',
                                            }]
                                        }} />}
                                    </div>
                                </div>
                            </div>
                       ))}
                    </section>

                    <section id="sql-query-panel" className="border theme-border rounded-lg">
                        <button onClick={() => setIsQueryPanelOpen(!isQueryPanelOpen)} className="w-full p-4 flex justify-between items-center theme-hover">
                            <h4 className="text-lg font-semibold flex items-center gap-3">
                                <Database className="text-purple-400"/>
                                Direct Database Query
                            </h4>
                            {isQueryPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                        {isQueryPanelOpen && (
                            <div className="p-4 border-t theme-border">
                                {/* NEW: Schema Viewer & Query History */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                    {/* Schema Viewer */}
                                    <div className="border theme-border rounded-lg p-3 flex flex-col">
                                        <h5 className="font-semibold mb-2 flex items-center gap-2"><Table size={16}/> Database Schema</h5>
                                        <div className="grid grid-cols-2 gap-3 flex-1">
                                            <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                                                {dbTables.length > 0 ? dbTables.map(name => (
                                                    <button key={name} onClick={() => handleViewSchema(name)}
                                                        className={`w-full text-left px-2 py-1 rounded text-sm ${selectedTable === name ? 'theme-button-primary' : 'theme-hover'}`}>
                                                        {name}
                                                    </button>
                                                )) : <p className="text-sm theme-text-secondary">No tables found.</p>}
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                 {loadingSchema ? <div className="flex items-center justify-center h-full"><Loader className="animate-spin" /></div> :
                                                 tableSchema ? (
                                                    <ul className="text-sm font-mono space-y-1">
                                                        {tableSchema.map(col => <li key={col.name}>- {col.name}: <span className="text-yellow-400">{col.type}</span></li>)}
                                                    </ul>
                                                 ) : <p className="text-sm theme-text-secondary">Select a table.</p> }
                                            </div>
                                        </div>
                                    </div>
                                    {/* Query History */}
                                    <div className="border theme-border rounded-lg p-3 flex flex-col">
                                        <div className="flex border-b theme-border mb-2 items-center justify-between">
                                            <h5 className="font-semibold flex items-center gap-2">Query History</h5>
                                            <div className="flex">
                                                {['recent', 'favorites'].map(tab => (
                                                    <button key={tab} onClick={() => setActiveHistoryTab(tab)}
                                                        className={`capitalize pb-1 px-3 text-xs -mb-px ${activeHistoryTab === tab ? 'border-b-2 border-purple-400 theme-text-primary' : 'theme-text-secondary'}`}>
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <ul className="space-y-1 max-h-48 overflow-y-auto text-sm font-mono flex-1">
                                            {queryHistory.filter(h => activeHistoryTab === 'favorites' ? h.favorited : true).map((h, i) => (
                                                <li key={i} className="flex items-center justify-between group p-1 rounded hover:theme-bg-tertiary">
                                                    <span onClick={() => handleHistoryAction(i, 'run')} className="truncate cursor-pointer flex-1 pr-2" title={h.query}>{h.query}</span>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleHistoryAction(i, 'run')} title="Run"><Play size={14}/></button>
                                                        <button onClick={() => handleHistoryAction(i, 'copy')} title="Copy"><Copy size={14}/></button>
                                                        <button onClick={() => handleHistoryAction(i, 'favorite')} title="Favorite"><Star size={14} className={h.favorited ? 'fill-yellow-400 text-yellow-400' : ''}/></button>
                                                        <button onClick={() => handleHistoryAction(i, 'delete')} title="Delete"><Trash2 size={14} className="text-red-400"/></button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                {/* NEW: NL-to-SQL Area */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold">Query Mode:</span>
                                    <button onClick={() => setSqlInputMode('sql')} className={`px-3 py-1 text-xs rounded ${sqlInputMode === 'sql' ? 'theme-button-primary' : 'theme-button'}`}>SQL</button>
                                    <button onClick={() => setSqlInputMode('nl')} className={`px-3 py-1 text-xs rounded ${sqlInputMode === 'nl' ? 'theme-button-primary' : 'theme-button'}`}>Natural Language</button>
                                </div>

                                {sqlInputMode === 'nl' ? (
                                    <div className="grid grid-cols-2 gap-3 items-start">
                                        <div>
                                            <textarea value={nlQuery} onChange={(e) => setNlQuery(e.target.value)} rows={4}
                                                className="w-full p-2 theme-input font-mono text-sm" placeholder="e.g., show me the average message length per model..." />
                                            <button onClick={handleGenerateSql} disabled={generatingSql} className="w-full mt-2 px-4 py-2 theme-button-primary rounded text-sm disabled:opacity-50">
                                                {generatingSql ? 'Generating SQL...' : 'Generate SQL'}
                                            </button>
                                        </div>
                                        <div className="theme-bg-tertiary p-2 rounded-lg h-full flex flex-col">
                                            <pre className="flex-1 text-xs font-mono p-2 overflow-auto">{generatedSql || 'Generated SQL will appear here...'}</pre>
                                            {generatedSql && (
                                                <button onClick={handleAcceptGeneratedSql} className="mt-2 w-full theme-button-success text-sm py-1 rounded">Use this SQL</button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                  <>
                                    <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={5}
                                        className="w-full p-2 theme-input font-mono text-sm" placeholder="Enter your SQL query here..." />
                                    <div className="flex justify-end mt-2">
                                        <button onClick={handleExecuteQuery} disabled={loadingQuery} className="px-4 py-2 theme-button-primary rounded text-sm disabled:opacity-50">
                                            {loadingQuery ? 'Executing...' : 'Execute Query'}
                                        </button>
                                    </div>
                                  </>
                                )}
                                
                                {renderContent('query results', loadingQuery || generatingSql, queryError, () => (
                                    queryResult && (
                                        queryResult.length === 0 ? 
                                        <p className="mt-4 p-3 theme-text-secondary theme-bg-tertiary rounded-lg">Query returned 0 rows.</p> :
                                        <>
                                            <div className="flex justify-between items-center mt-4">
                                                <h5 className="font-semibold">Query Results</h5>
                                                <button onClick={handleExportCSV} disabled={!queryResult || queryResult.length === 0}
                                                    className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2 disabled:opacity-50">
                                                    <Download size={14} /> Export to CSV
                                                </button>
                                            </div>
                                            {showExportSuccess && <p className="text-xs text-green-400 mt-1 text-right">{showExportSuccess}</p>}

                                            <div className="mt-2 overflow-x-auto theme-border border rounded-lg max-h-96">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="theme-bg-tertiary sticky top-0">
                                                        <tr>
                                                            {Object.keys(queryResult[0]).map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="theme-bg-primary divide-y theme-divide">
                                                        {queryResult.map((row, rIndex) => (
                                                            <tr key={rIndex}>
                                                                {Object.keys(row).map(key => <td key={key} className="p-2 font-mono truncate max-w-xs">{String(row[key])}</td>)}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-6 p-4 border theme-border rounded-lg">
                                                <h5 className="font-semibold mb-3">Create Plot from Results</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                                    <div className="flex flex-col">
                                                        <label className="text-xs mb-1 theme-text-secondary">X-Axis</label>
                                                        <select value={plotXColumn} onChange={e => setPlotXColumn(e.target.value)} className="theme-input p-2 text-sm">
                                                            {queryResult.length > 0 && Object.keys(queryResult[0]).map(col => <option key={col} value={col}>{col}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs mb-1 theme-text-secondary">Y-Axis</label>
                                                        <select value={plotYColumn} onChange={e => setPlotYColumn(e.target.value)} className="theme-input p-2 text-sm">
                                                            {queryResult.length > 0 && Object.keys(queryResult[0]).map(col => <option key={col} value={col}>{col}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs mb-1 theme-text-secondary">Chart Type</label>
                                                        <select value={plotType} onChange={e => setPlotType(e.target.value)} className="theme-input p-2 text-sm">
                                                            <option value="line">Line</option>
                                                            <option value="bar">Bar</option>
                                                        </select>
                                                    </div>
                                                    <button onClick={handleGeneratePlot} className="px-4 py-2 theme-button-primary rounded text-sm">Generate Plot</button>
                                                </div>

                                                {plotConfig && (
                                                    <div className="mt-4 h-72">
                                                        {plotType === 'line' ? <Line options={chartOptions} data={plotConfig} /> : <Bar options={chartOptions} data={plotConfig} />}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )
                                ))}
                            </div>
                        )}
                    </section>
                    <section id="knowledge-graph" className="border theme-border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-lg font-semibold flex items-center gap-3">
                                <GitBranch className="text-green-400"/>
                                Knowledge Graph Inspector
                            </h4>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleKgProcessTrigger('sleep')} disabled={kgLoading} className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2"><Zap size={14}/> Sleep</button>
                                <button onClick={() => handleKgProcessTrigger('dream')} disabled={kgLoading} className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2"><Brain size={14}/> Dream</button>
                            </div>
                        </div>
                        
                        {kgError && <div className="text-red-400 text-center p-4">{kgError}</div>}
                        
                        {kgLoading ? (
                            <div className="h-80 flex items-center justify-center theme-bg-tertiary rounded-lg">
                                <Loader className="animate-spin text-green-400" size={32} />
                            </div>
                        ) : (
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 flex flex-col gap-4">
                                <div className="theme-bg-tertiary p-3 rounded-lg">
                                    <h5 className="font-semibold text-sm mb-2">Controls</h5>
                                    <label className="text-xs theme-text-secondary">Active Generation</label>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="0" max={kgGenerations.length > 0 ? Math.max(...kgGenerations) : 0} 
                                               value={currentKgGeneration || 0}
                                               onChange={(e) => setCurrentKgGeneration(parseInt(e.target.value))}
                                               className="w-full" disabled={kgGenerations.length === 0}/>
                                        <span className="font-mono text-sm p-1 theme-bg-primary rounded">{currentKgGeneration}</span>
                                    </div>
                                    <button onClick={handleKgRollback} disabled={currentKgGeneration === 0}
                                            className="w-full mt-3 text-xs py-1 theme-button-danger rounded flex items-center justify-center gap-2 disabled:opacity-50">
                                        <Repeat size={14} /> Rollback One Gen
                                    </button>
                                </div>
                                <div className="theme-bg-tertiary p-3 rounded-lg">
                                    <h5 className="font-semibold text-sm mb-2">Generation Stats</h5>
                                    <p className="text-xs theme-text-secondary"><ChevronsRight size={12} className="inline"/> Facts: <span className="font-bold theme-text-primary">{kgData.nodes.filter(n=>n.type==='fact').length}</span></p>
                                    <p className="text-xs theme-text-secondary"><ChevronsRight size={12} className="inline"/> Concepts: <span className="font-bold theme-text-primary">{kgData.nodes.filter(n=>n.type==='concept').length}</span></p>
                                    <p className="text-xs theme-text-secondary"><ChevronsRight size={12} className="inline"/> Links: <span className="font-bold theme-text-primary">{kgData.links.length}</span></p>
                                </div>
                            </div>
                            <div className="col-span-3 h-96 theme-bg-tertiary rounded-lg relative overflow-hidden">
                                <ForceGraph2D
                                    ref={graphRef}
                                    graphData={kgData}
                                    nodeLabel="id"
                                    nodeVal={node => node.type === 'concept' ? 10 : 3}
                                    nodeColor={node => node.type === 'concept' ? '#a855f7' : '#3b82f6'}
                                    linkDirectionalParticles={1}
                                    linkDirectionalParticleWidth={2}
                                    linkColor={() => 'rgba(255,255,255,0.2)'}
                                    width={800}
                                    height={384}
                                    backgroundColor="transparent"
                                />
                            </div>
                        </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
};

export default DataDash;