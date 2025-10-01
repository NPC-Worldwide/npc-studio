import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart as BarChartIcon,
    Star, Trash2, Play, Copy, Download, Plus, Settings2, Edit,
    GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import ForceGraph2D from 'react-force-graph-2d';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale
  } from 'chart.js';
  
import 'chartjs-adapter-date-fns'; 

import * as d3 from 'd3';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale);

const generateId = () => `widget_${Math.random().toString(36).substr(2, 9)}`;
const iconMap = {
    MessageSquare, BrainCircuit, Bot, LineChart, BarChartIcon, Settings2, Edit,
    Database, Table, GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat,
};

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



const AddCustomWidgetModal = ({ isOpen, onClose, context, onAddWidget, dbTables, fetchSchema }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('table');
    const [query, setQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState('');
    const [availableColumns, setAvailableColumns] = useState([]);
    const [xCol, setXCol] = useState('');
    const [yCol, setYCol] = useState('');
    const [chartType, setChartType] = useState('bar');

    useEffect(() => {
        if (context?.result?.[0]) {
            const columns = Object.keys(context.result[0]);
            setAvailableColumns(columns.map(name => ({ name, type: 'RESULT_COL' })));
            setXCol(columns[0] || '');
            setYCol(columns.length > 1 ? columns[1] : '');
            setQuery(context.query || '');
            setType('chart');
        }
    }, [context]);

    useEffect(() => {
        if (selectedTable && fetchSchema && !context?.result) {
            fetchSchema(selectedTable).then(schema => {
                setAvailableColumns(schema || []);
            });
        }
    }, [selectedTable, fetchSchema, context]);

    if (!isOpen) return null;

    const handleAdd = () => {
        let finalQuery = query;
        
        if (!query && selectedTable) {
            finalQuery = `SELECT * FROM ${selectedTable} LIMIT 100`;
        }

        const newWidget = {
            id: generateId(),
            title: title || 'Custom Widget',
            type: type,
            query: finalQuery,
            iconName: 'Settings2',
            iconColor: 'text-blue-400',
            chartConfig: type === 'chart' ? {
                x: xCol,
                y: yCol,
                type: chartType
            } : null,
            span: type === 'chart' ? 2 : 1
        };

        onAddWidget(newWidget);
        onClose();
        
        setTitle('');
        setQuery('');
        setSelectedTable('');
        setXCol('');
        setYCol('');
        setType('table');
        setChartType('bar');
        setAvailableColumns([]);
    };

    const chartTypeOptions = [
        { value: 'bar', label: 'Bar Chart' },
        { value: 'line', label: 'Line Chart' },
        { value: 'scatter', label: 'Scatter Plot' }
    ];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Create New Widget</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm theme-text-secondary">Widget Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            className="w-full theme-input mt-1" 
                            placeholder="e.g., Daily Active Users"
                        />
                    </div>

                    <div>
                        <label className="text-sm theme-text-secondary">Display As</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full theme-input mt-1">
                            <option value="table">Table</option>
                            <option value="chart">Chart</option>
                            <option value="stat">Single Stat</option>
                            <option value="stat_list">Stat List</option>
                        </select>
                    </div>

                    {!context?.result && (
                        <div>
                            <label className="text-sm theme-text-secondary">Quick Start - Select Table</label>
                            <select 
                                value={selectedTable} 
                                onChange={e => {
                                    setSelectedTable(e.target.value);
                                    if (e.target.value) {
                                        setQuery(`SELECT * FROM ${e.target.value} LIMIT 100`);
                                    }
                                }} 
                                className="w-full theme-input mt-1"
                            >
                                <option value="">Choose a table...</option>
                                {(dbTables || []).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-sm theme-text-secondary">SQL Query</label>
                        <textarea 
                            value={query} 
                            onChange={e => setQuery(e.target.value)} 
                            rows={4} 
                            className="w-full theme-input mt-1 font-mono text-sm" 
                            placeholder="SELECT * FROM table_name LIMIT 100"
                        />
                    </div>

                    {type === 'chart' && availableColumns.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm theme-text-secondary">X-Axis Column</label>
                                    <select value={xCol} onChange={e => setXCol(e.target.value)} className="w-full theme-input mt-1">
                                        <option value="">Select column...</option>
                                        {availableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm theme-text-secondary">Y-Axis Column</label>
                                    <select value={yCol} onChange={e => setYCol(e.target.value)} className="w-full theme-input mt-1">
                                        <option value="">Select column...</option>
                                        {availableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm theme-text-secondary">Chart Type</label>
                                <select value={chartType} onChange={e => setChartType(e.target.value)} className="w-full theme-input mt-1">
                                    {chartTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="theme-button px-4 py-2 text-sm rounded">Cancel</button>
                    <button onClick={handleAdd} className="theme-button-primary px-4 py-2 text-sm rounded">Create Widget</button>
                </div>
            </div>
        </div>
    );
};
const EditWidgetModal = ({ isOpen, onClose, widget, onSave, dbTables, tableSchemaCache, fetchSchema }) => {
   
    const parseQueryForBuilder = (query) => {
        if (!query) {
            return { isComplex: false, builderConfig: {} };
        }

       
        const complexityPattern = /\bJOIN\b|\bUNION\b|\bWITH\b/i;
        const isComplex = complexityPattern.test(query);
        
        if (isComplex) {
            return { isComplex: true, builderConfig: {} };
        }

       
        const fromMatch = query.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
        if (!fromMatch) {
            return { isComplex: true, builderConfig: {} };
        }
        const table = fromMatch[1];
        
       
        const selectMatch = query.match(/\bSELECT\s+(.*?)(?=\bFROM)/is);
        let selectExpressions = selectMatch ? 
            selectMatch[1].split(',').map(s => s.trim()) : 
            ['*']; 

       
        const groupByMatch = query.match(/\bGROUP BY\s+(.*?)(?:\bHAVING|\bORDER BY|\bLIMIT|$)/is);
        const groupByExpression = groupByMatch ? groupByMatch[1].trim() : '';

       
        const extractedBaseColumns = new Set();
        selectExpressions.forEach(expr => {
            const columnCandidates = expr.matchAll(/\b([a-zA-Z0-9_]+)\b/g);
            for (const match of columnCandidates) {
               
                const keywordBlacklist = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'LIMIT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'IN', 'LIKE', 'IS', 'BETWEEN', 'AND', 'OR', 'NOT', 'NULL', 'STRFTIME', 'LENGTH']);
                if (match[1] && !keywordBlacklist.has(match[1].toUpperCase())) {
                    extractedBaseColumns.add(match[1]);
                }
            }
        });
       
        const whereMatch = query.match(/\bWHERE\s+(.*?)(?:\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$)/is);
        if (whereMatch) {
            const whereClause = whereMatch[1];
           
            const columnInWhere = whereClause.match(/\b[a-zA-Z0-9_]+\b/g);
            if(columnInWhere) {
                columnInWhere.forEach(col => {
                    const keywordBlacklist = new Set(['AND', 'OR', 'NOT', 'NULL', 'LIKE', 'IN', 'IS', 'BETWEEN', 'EXISTS', 'DATE', 'NOW']);
                    if (!keywordBlacklist.has(col.toUpperCase())) {
                        extractedBaseColumns.add(col);
                    }
                });
            }
        }
        

        return { 
            isComplex: isComplex, 
            builderConfig: { 
                table, 
                selectExpressions,
                groupByExpression,
                selectedBaseColumns: Array.from(extractedBaseColumns)
            } 
        };
    };

    const parsedData = parseQueryForBuilder(widget.query);
    
   
    const [isComplexQuery, setIsComplexQuery] = useState(parsedData.isComplex);
    const [mode, setMode] = useState(parsedData.isComplex ? 'advanced' : 'builder');

   
    const [config, setConfig] = useState({ 
        ...widget, 
        builder: {
            table: parsedData.builderConfig.table || '',
            selectedColumns: parsedData.builderConfig.selectedBaseColumns || [],
            selectExpressions: parsedData.builderConfig.selectExpressions || []
        },
        chartConfig: {
            ...widget.chartConfig,
            x: widget.chartConfig?.x || parsedData.builderConfig.selectExpressions[0] || '',
            y: widget.chartConfig?.y || parsedData.builderConfig.selectExpressions[1] || '',
            type: widget.chartConfig?.type || (widget.type.includes('line') ? 'line' : 'bar'),
            groupBy: widget.chartConfig?.groupBy || parsedData.builderConfig.groupByExpression || ''
        }
    });

    const [availableSchemaColumns, setAvailableSchemaColumns] = useState([]);
    const [selectableOutputExpressions, setSelectableOutputExpressions] = useState([]);
    const [testQueryStatus, setTestQueryStatus] = useState({ loading: false, error: null });

    const updateColumnsFromQuery = useCallback(async (query) => {
        if (!query) { setSelectableOutputExpressions([]); return; }
        setTestQueryStatus({ loading: true, error: null });
        try {
           
            const response = await window.api.executeSQL({ query: `${query.replace(/;$/, '')} LIMIT 1` });
            if (response.error) throw new Error(response.error);
            if (response.result && response.result.length > 0) {
                const newCols = Object.keys(response.result[0]);
               
                setSelectableOutputExpressions(newCols.map(c => ({ name: c, type: 'RESULT_COL' })));
            } else { 
                setSelectableOutputExpressions([]); 
            }
        } catch (err) { setTestQueryStatus({ loading: false, error: err.message }); } finally { setTestQueryStatus({ loading: false, error: null }); }
    }, []);

    useEffect(() => {
       
        if (mode === 'builder' && !config.type.includes('chart')) {
            const { table, selectedColumns = [] } = config.builder || {};
            if (table) {
                const newQuery = selectedColumns.length > 0 ? 
                                 `SELECT ${selectedColumns.join(', ')} FROM ${table}` : 
                                 `SELECT * FROM ${table}`;
                if (newQuery !== config.query) { 
                    setConfig(c => ({ ...c, query: newQuery })); 
                }
            }
        }
       
    }, [config.builder?.table, config.builder?.selectedColumns, config.type, mode]);

    useEffect(() => {
        const table = config.builder?.table;
        if (mode === 'builder' && table) {
           
            fetchSchema(table).then(schema => {
                setAvailableSchemaColumns(schema || []);
               
                if (config.type.includes('chart')) {
                   
                    const initialChartOptions = new Set();
                    (config.builder.selectExpressions || []).forEach(expr => {
                       
                        const baseColMatch = expr.match(/\b([a-zA-Z0-9_]+)\b(?:\s+AS\s+|$)/i);
                        initialChartOptions.add(baseColMatch ? baseColMatch[1] : expr);
                    });
                    (schema || []).forEach(col => initialChartOptions.add(col.name));
                    setSelectableOutputExpressions(Array.from(initialChartOptions).map(name => ({name, type: 'EXPR'})));
                } else {
                    setSelectableOutputExpressions((schema || []).map(c => ({name: c.name, type: c.type})));
                }
            });
        } else if (mode === 'advanced' && config.query) {
           
            updateColumnsFromQuery(config.query);
        }
    }, [mode, config.builder?.table, config.query, config.type, fetchSchema, updateColumnsFromQuery, config.builder.selectExpressions]);
    
    if (!isOpen) return null;

    const handleSave = () => {
        let finalQuery = config.query;
        let newConfig = { ...config };

        if (mode === 'builder') {
            const { table, selectedColumns = [] } = config.builder || {};
            
            if (newConfig.type.includes('chart')) {
               
                let selectParts = [];
                if (newConfig.chartConfig.x) selectParts.push(newConfig.chartConfig.x);
               
                if (newConfig.chartConfig.y) {
                    newConfig.chartConfig.y.split(',').forEach(yExpr => {
                        yExpr = yExpr.trim();
                        if (yExpr && !selectParts.includes(yExpr)) selectParts.push(yExpr);
                    });
                }
                
                if (table && selectParts.length > 0) {
                    finalQuery = `SELECT ${selectParts.join(', ')} FROM ${table}`;
                    if (newConfig.chartConfig.groupBy) {
                        finalQuery += ` GROUP BY ${newConfig.chartConfig.groupBy}`;
                    } else if (newConfig.chartConfig.x && selectParts.length > 1) {
                       
                        const xBaseForGroupBy = newConfig.chartConfig.x.split(/\s+AS\s+/i)[0].trim();
                        finalQuery += ` GROUP BY ${xBaseForGroupBy}`;
                    }
                    if (newConfig.chartConfig.x) {
                        
                         const xBaseForOrderBy = newConfig.chartConfig.x.split(/\s+AS\s+/i)[0].trim();
                         finalQuery += ` ORDER BY ${xBaseForOrderBy}`;
                    }
                } else if (table) {
                    finalQuery = `SELECT * FROM ${table}`;
                }
                
            } else {
                if (table) {
                    finalQuery = selectedColumns.length > 0 ? 
                                 `SELECT ${selectedColumns.join(', ')} FROM ${table}` : 
                                 `SELECT * FROM ${table}`;
                }
            }
        }
        
        if (finalQuery) {
            newConfig.query = finalQuery;
            delete newConfig.apiFn;
            delete newConfig.dataKey;
        }
        onSave(newConfig);
        onClose();
    };
    
    const handleToggleChange = (index, field, value) => { 
        const newToggles = [...(config.toggleOptions || [])]; 
        newToggles[index][field] = value; 
        setConfig({...config, toggleOptions: newToggles}); 
    };
    
    const addToggle = () => setConfig({...config, toggleOptions: [...(config.toggleOptions || []), {label: 'New', modifier: ''}]});
    const removeToggle = (index) => setConfig({...config, toggleOptions: (config.toggleOptions || []).filter((_, i) => i !== index)});

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold">{widget.id ? 'Edit Widget' : 'Create Widget'}</h3>
                    <button onClick={onClose} className="p-1 rounded-full theme-hover"><X size={20}/></button>
                </div>
                
                <div className="flex border-b theme-border mb-4 flex-shrink-0">
                    <button 
                        onClick={() => { if (!isComplexQuery) setMode('builder') }} 
                        className={`px-4 py-2 text-sm ${mode === 'builder' ? 'border-b-2 border-blue-500' : 'theme-text-secondary'} ${isComplexQuery ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        title={isComplexQuery ? "Cannot use builder for complex queries" : ""}
                    >
                        Builder
                    </button>
                    <button 
                        onClick={() => setMode('advanced')} 
                        className={`px-4 py-2 text-sm ${mode === 'advanced' ? 'border-b-2 border-blue-500' : 'theme-text-secondary'}`}
                    >
                        Advanced SQL
                    </button>
                </div>
                                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">General</h4>
                        <div>
                            <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Title</label>
                            <input 
                                type="text" 
                                value={config.title} 
                                onChange={e => setConfig({...config, title: e.target.value})} 
                                className="w-full theme-input mt-1"
                            />
                        </div>
                    </div>

                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">Data Source</h4>
                        {mode === 'builder' ? (
                            <>
                                <div>
                                    <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Table</label>
                                    <select 
                                        value={config.builder?.table || ''} 
                                        onChange={e => setConfig({...config, builder: {...config.builder, table: e.target.value, selectedColumns: []}})} 
                                        className="w-full theme-input mt-1"
                                    >
                                        <option value="">Select a table...</option>
                                        {(dbTables || []).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                {config.builder?.table && !config.type.includes('chart') && (
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Columns</label>
                                        <div className="max-h-32 overflow-y-auto theme-bg-primary p-2 rounded mt-1">
                                            {availableSchemaColumns.map(col => (
                                                <div key={col.name} className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        id={col.name}
                                                        checked={config.builder?.selectedColumns?.includes(col.name) || false}
                                                        onChange={e => {
                                                            const newCols = e.target.checked 
                                                                ? [...(config.builder?.selectedColumns || []), col.name]
                                                                : (config.builder?.selectedColumns || []).filter(c => c !== col.name);
                                                            setConfig({...config, builder: {...config.builder, selectedColumns: newCols}});
                                                        }}
                                                        className="w-4 h-4 theme-checkbox"
                                                    />
                                                    <label htmlFor={col.name} className="ml-2 text-sm">
                                                        {col.name} <span className="text-yellow-400">({col.type})</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">SQL Query</label>
                                <textarea 
                                    value={config.query || ''} 
                                    onChange={e => setConfig({...config, query: e.target.value})} 
                                    rows={6} 
                                    className="w-full theme-input mt-1 font-mono text-sm"
                                />
                                <button 
                                    onClick={() => updateColumnsFromQuery(config.query)} 
                                    className="text-xs theme-button-subtle mt-2" 
                                    disabled={testQueryStatus.loading}
                                >
                                    {testQueryStatus.loading ? 'Testing...' : 'Test Query & Get Columns'}
                                </button>
                                {testQueryStatus.error && <p className="text-red-400 text-xs mt-1">{testQueryStatus.error}</p>}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">Visualization</h4>
                        <div>
                            <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Display As</label>
                            <select 
                                value={config.type} 
                                onChange={e => setConfig({...config, type: e.target.value})} 
                                className="w-full theme-input mt-1"
                            >
                                <option value="table">Table</option>
                                <option value="chart">Chart</option>
                                <option value="stat">Stat (Single Value)</option>
                                <option value="stat_list">Stat List</option>
                            </select>
                        </div>
                        {config.type.includes('chart') && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">X-Axis Expression</label>
                                        <textarea 
                                            value={config.chartConfig?.x || ''} 
                                            onChange={e => setConfig({...config, chartConfig: {...config.chartConfig, x: e.target.value}})} 
                                            className="w-full theme-input mt-1 font-mono text-sm"
                                            rows={2}
                                            placeholder="e.g., strftime('%Y-%m-%d', timestamp) as date"
                                        />
                                        <div className="text-xs theme-text-secondary mt-1">
                                            Available: {selectableOutputExpressions.map(c => c.name).join(', ')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Y-Axis Expression(s)</label>
                                        <textarea 
                                            value={config.chartConfig?.y || ''} 
                                            onChange={e => setConfig({...config, chartConfig: {...config.chartConfig, y: e.target.value}})} 
                                            className="w-full theme-input mt-1 font-mono text-sm"
                                            rows={2}
                                            placeholder="e.g., COUNT(*) as count, AVG(cost) as avg_cost (comma separated for multi-series)"
                                        />
                                        <div className="text-xs theme-text-secondary mt-1">
                                            Available: {selectableOutputExpressions.map(c => c.name).join(', ')}
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">GROUP BY (optional, use for aggregations)</label>
                                    <input 
                                        type="text"
                                        value={config.chartConfig?.groupBy || ''} 
                                        onChange={e => setConfig({...config, chartConfig: {...config.chartConfig, groupBy: e.target.value}})} 
                                        className="w-full theme-input mt-1 font-mono text-sm"
                                        placeholder="e.g., strftime('%Y-%m-%d', timestamp) or column_name"
                                    />
                                    <div className="text-xs theme-text-secondary mt-1">
                                        Usually matches X-Axis expression for single series.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-3 border theme-border rounded-lg theme-bg-tertiary space-y-3">
                        <h4 className="text-sm font-semibold theme-text-primary">Toggleable Views (Filters)</h4>
                        <div className="space-y-2 mt-1">
                            {(config.toggleOptions || []).map((toggle, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Label (e.g., 7d)" 
                                        value={toggle.label} 
                                        onChange={e => handleToggleChange(index, 'label', e.target.value)} 
                                        className="theme-input text-sm p-1 w-24 flex-shrink-0"
                                    />
                                    <textarea 
                                        placeholder="WHERE clause modifier (e.g., WHERE timestamp >= date('now', '-7 days'))" 
                                        value={toggle.modifier} 
                                        onChange={e => handleToggleChange(index, 'modifier', e.target.value)} 
                                        className="theme-input text-sm p-1 flex-1 font-mono"
                                        rows={1}
                                    />
                                    <button 
                                        onClick={() => removeToggle(index)} 
                                        className="p-1 theme-button-danger-subtle rounded flex-shrink-0"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                            <button onClick={addToggle} className="text-xs theme-button-subtle mt-2">Add Toggle</button>
                            <div className="text-xs theme-text-secondary mt-2">
                                Toggles add a `WHERE` clause to the query. Ensure your base query includes necessary `GROUP BY` and `ORDER BY`.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button onClick={onClose} className="theme-button px-4 py-2 text-sm rounded">Cancel</button>
                    <button onClick={handleSave} className="theme-button-primary px-4 py-2 text-sm rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const DashboardWidget = ({ config, onContextMenu }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeToggle, setActiveToggle] = useState(config.toggleOptions?.[0] || null);
    
    useEffect(() => {
        const fetchData = async () => {
            console.log(`[Widget: ${config.title}] Fetching data...`);
            setLoading(true); setError(null);
            try {
                let finalQuery = config.query;
                
               
                if (activeToggle && activeToggle.modifier) {
                    const baseQuery = config.query.replace(/;$/, '');
                    let parts = {
                        select: '',
                        from: '',
                        where: '',
                        groupBy: '',
                        orderBy: '',
                        limit: ''
                    };

                   
                    const regex = /SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)\s*(?:WHERE\s+(.*?))?\s*(?:GROUP BY\s+(.*?))?\s*(?:ORDER BY\s+(.*?))?\s*(?:LIMIT\s+(.*?))?$/is;
                    const match = baseQuery.match(regex);

                    if (match) {
                        parts.select = match[1];
                        parts.from = match[2];
                        parts.where = match[3] ? `WHERE ${match[3]}` : '';
                        parts.groupBy = match[4] ? `GROUP BY ${match[4]}` : '';
                        parts.orderBy = match[5] ? `ORDER BY ${match[5]}` : '';
                        parts.limit = match[6] ? `LIMIT ${match[6]}` : '';
                    } else {
                       
                        console.warn("Could not fully parse base query for modifier insertion. Appending modifier.");
                        finalQuery = `${baseQuery} ${activeToggle.modifier}`;
                    }

                    if (match) {
                       
                        finalQuery = `SELECT ${parts.select} FROM ${parts.from}`;
                        
                       
                        if (parts.where) {
                            finalQuery += ` ${parts.where} AND (${activeToggle.modifier.replace(/^\s*WHERE\s*/i, '')})`;
                        } else {
                            finalQuery += ` ${activeToggle.modifier}`;
                        }
                        
                        finalQuery += ` ${parts.groupBy}`;
                        finalQuery += ` ${parts.orderBy}`;
                        finalQuery += ` ${parts.limit}`;
                        finalQuery = finalQuery.replace(/\s+/g, ' ').trim();
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
                if (!Array.isArray(listData)) return <div className="text-red-400 text-xs">Data for stat_list is not an array.</div>;
                return <ul className="space-y-1 text-sm theme-text-secondary">{listData.map((item, i) => <li key={i}>{Object.values(item)[0]}: <span className="font-bold">{Object.values(item)[1]}</span></li>)}</ul>;

            case 'table':
                if (!Array.isArray(data) || data.length === 0) return <div className="theme-text-secondary text-sm">Query returned 0 rows.</div>;
                return <div className="overflow-auto h-full text-xs"><table className="w-full"><thead className="sticky top-0 theme-bg-tertiary"><tr className="text-left">{Object.keys(data[0] || {}).map(h => <th key={h} className="p-1 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y theme-divide">{data.map((row, i) => <tr key={i}>{Object.values(row).map((val, j) => <td key={j} className="p-1 font-mono truncate max-w-[100px]">{String(val)}</td>)}</tr>)}</tbody></table></div>;

            case 'chart':
            case 'line_chart':
            case 'bar_chart':
                if (!Array.isArray(data) || data.length === 0 || !config.chartConfig) return <div className="theme-text-secondary text-sm">Not enough data or chart is misconfigured.</div>;
                
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

                const chartData = { 
                    labels, 
                    datasets: chartDatasets 
                };

                const chartOptions = {
                    responsive: true, maintainAspectRatio: false, 
                    plugins: { 
                        legend: { display: chartDatasets.length > 1, position: 'top', labels: { color: '#9ca3af' } },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: (labels.length > 0 && labels[0] instanceof Date && !isNaN(labels[0])) ? {
                            type: 'time', 
                            time: { unit: 'day', tooltipFormat: 'MMM dd, yyyy' },
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151'} 
                        } : { 
                            type: 'category', 
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151'} 
                        },
                        y: { 
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151'} 
                        }
                    }
                };
                const ChartComponent = chartType === 'line' ? Line : Bar;
                return <div className="h-full w-full"><ChartComponent options={chartOptions} data={chartData} /></div>;
            default: return null;
        }
    };
    const Icon = iconMap[config.iconName] || Settings2;
    return (<div className="theme-bg-tertiary p-4 rounded-lg flex flex-col h-full relative" onContextMenu={(e) => onContextMenu(e, config.id)}><div className="flex justify-between items-start flex-shrink-0"><div className="flex items-center gap-3 mb-2 flex-1"><Icon className={config.iconColor || 'text-gray-400'} size={18} /><h4 className="font-semibold theme-text-secondary truncate">{config.title}</h4></div>{(config.toggleOptions || []).length > 0 && (<div className="flex items-center gap-1">{(config.toggleOptions).map(opt => <button key={opt.label} onClick={() => setActiveToggle(opt)} className={`px-2 py-0.5 text-xs rounded ${activeToggle?.label === opt.label ? 'theme-button-primary' : 'theme-button theme-hover'}`}>{opt.label}</button>)}</div>)}</div><div className="flex-1 mt-1 overflow-hidden">{renderContent()}</div></div>);
};

const DataDash = ({ isOpen, onClose, initialAnalysisContext, currentModel, currentProvider, currentNPC }) => {
    const [chartExplorer, setChartExplorer] = useState({
        xCol: '',
        yCol: '',
        chartType: 'bar',
        showChart: false
    });
    const defaultWidgets = [
        { id: 'total_convos', type: 'stat', title: 'Total Conversations', query: "SELECT COUNT(DISTINCT conversation_id) as total FROM conversation_history;", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'total_msgs', type: 'stat', title: 'Total Messages', query: "SELECT COUNT(*) as total FROM conversation_history WHERE role = 'user' OR role = 'assistant';", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'top_models', type: 'stat_list', title: 'Top 5 Models', query: "SELECT model, COUNT(*) as count FROM conversation_history WHERE model IS NOT NULL AND model != '' GROUP BY model ORDER BY count DESC LIMIT 5;", iconName: 'BrainCircuit', iconColor: 'text-purple-400', span: 1 },
        { id: 'top_npcs', type: 'stat_list', title: 'Top 5 NPCs', query: "SELECT npc, COUNT(*) as count FROM conversation_history WHERE npc IS NOT NULL AND npc != '' GROUP BY npc ORDER BY count DESC LIMIT 5;", iconName: 'Bot', iconColor: 'text-yellow-400', span: 1 },
        { 
            id: 'activity_chart', 
            type: 'line_chart', 
            title: 'Activity Over Time', 
            query: "SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count FROM conversation_history GROUP BY strftime('%Y-%m-%d', timestamp) ORDER BY date ASC",
            iconName: 'LineChart', 
            iconColor: 'text-blue-400', 
            chartConfig: { 
                x: "strftime('%Y-%m-%d', timestamp) as date",
                y: "COUNT(*) as count",
                type: 'line',
                groupBy: "strftime('%Y-%m-%d', timestamp)"
            }, 
            span: 2,
            toggleOptions: [
                { label: '7d', modifier: "WHERE timestamp >= date('now', '-7 days')" },
                { label: '30d', modifier: "WHERE timestamp >= date('now', '-30 days')" },
                { label: '90d', modifier: "WHERE timestamp >= date('now', '-90 days')" }
            ]
        },
        { 
            id: 'length_dist', 
            type: 'bar_chart', 
            title: 'Message Length Distribution', 
            query: "SELECT CASE WHEN LENGTH(content) BETWEEN 0 AND 50 THEN '0-50' WHEN LENGTH(content) BETWEEN 51 AND 200 THEN '51-200' WHEN LENGTH(content) BETWEEN 201 AND 500 THEN '201-500' WHEN LENGTH(content) BETWEEN 501 AND 1000 THEN '501-1000' ELSE '1000+' END as bin, COUNT(*) as count FROM conversation_history WHERE role IN ('user', 'assistant') GROUP BY bin ORDER BY MIN(LENGTH(content));", 
            iconName: 'BarChartIcon', 
            iconColor: 'text-indigo-400', 
            chartConfig: { 
                x: "CASE WHEN LENGTH(content) BETWEEN 0 AND 50 THEN '0-50' WHEN LENGTH(content) BETWEEN 51 AND 200 THEN '51-200' WHEN LENGTH(content) BETWEEN 201 AND 500 THEN '201-500' WHEN LENGTH(content) BETWEEN 501 AND 1000 THEN '501-1000' ELSE '1000+' END as bin", 
                y: "COUNT(*) as count", 
                type: 'bar',
                groupBy: "CASE WHEN LENGTH(content) BETWEEN 0 AND 50 THEN '0-50' WHEN LENGTH(content) BETWEEN 51 AND 200 THEN '51-200' WHEN LENGTH(content) BETWEEN 201 AND 500 THEN '201-500' WHEN LENGTH(content) BETWEEN 501 AND 1000 THEN '501-1000' ELSE '1000+' END"
            }, 
            span: 2 
        },
    ];
    
    const [widgets, setWidgets] = useState([]);
    const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
    const [isAddCustomWidgetModalOpen, setIsAddCustomWidgetModalOpen] = useState(false);
    const [customWidgetContext, setCustomWidgetContext] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, widgetId: null });
    const [isEditWidgetModalOpen, setIsEditWidgetModalOpen] = useState(false);
    const [widgetToEdit, setWidgetToEdit] = useState(null);

    const [tableSchemaCache, setTableSchemaCache] = useState({});
    
   
    const [sqlQuery, setSqlQuery] = useState('SELECT * FROM conversation_history LIMIT 10;');
    const [queryResult, setQueryResult] = useState(null);
    const [loadingQuery, setLoadingQuery] = useState(false);
    const [queryError, setQueryError] = useState(null);
    const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);
    const [dbTables, setDbTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableSchema, setTableSchema] = useState(null);
    const [loadingSchema, setLoadingSchema] = useState(false);
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

   const [csvExportSettings, setCsvExportSettings] = useState({
    alwaysPrompt: true
});
    const [kgViewMode, setKgViewMode] = useState('full');
    const [kgNodeFilter, setKgNodeFilter] = useState('all');
    const [networkStats, setNetworkStats] = useState(null);
    const [cooccurrenceData, setCooccurrenceData] = useState(null);
    const [centralityData, setCentralityData] = useState(null);


    useEffect(() => { const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); }; if (isOpen) document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }, [isOpen, onClose]);
    useEffect(() => {
        if (isOpen) {
            const savedWidgets = localStorage.getItem('dataDashWidgets');
            if (savedWidgets) {
                try {
                    setWidgets(JSON.parse(savedWidgets));
                } catch (err) {
                    setWidgets(defaultWidgets);
                    saveWidgets(defaultWidgets);
                }
            } else {
                setWidgets(defaultWidgets);
                saveWidgets(defaultWidgets);
            }
            fetchKgData(currentKgGeneration);
        }
    }, [isOpen, currentKgGeneration]);

    const saveWidgets = (newWidgets) => { setWidgets(newWidgets); localStorage.setItem('dataDashWidgets', JSON.stringify(newWidgets)); };
    const handleAddWidget = (widgetConfig) => saveWidgets([...widgets, widgetConfig]);
    const handleRemoveWidget = (idToRemove) => saveWidgets(widgets.filter(w => w.id !== idToRemove));
    

    const [memories, setMemories] = useState([]);
    const [memoryLoading, setMemoryLoading] = useState(false);
    const [memoryFilter, setMemoryFilter] = useState('all');
    const [memorySearchTerm, setMemorySearchTerm] = useState('');
    const loadMemories = async () => {
        setMemoryLoading(true);
        try {
            const response = await window.api.executeSQL({
                query: `
                    SELECT id, message_id, conversation_id, npc, team, directory_path, 
                           initial_memory, final_memory, status, timestamp, model, provider
                    FROM memory_lifecycle 
                    ORDER BY timestamp DESC 
                    LIMIT 500
                `
            });
            console.log('FART', response);
            if (response.error) throw new Error(response.error);
            setMemories(response.result || []);
        } catch (err) {
            console.error('Error loading memories:', err);
            setMemories([]);
        } finally {
            setMemoryLoading(false);
        }
    };

    
    // Load memories when panel opens
    useEffect(() => {
        if (isMemoryPanelOpen && memories.length === 0) {
            loadMemories();
        }
    }, [isMemoryPanelOpen]);
    
    // Filter memories based on search and status
    const filteredMemories = memories.filter(memory => {
        const matchesStatus = memoryFilter === 'all' || memory.status === memoryFilter;
        const matchesSearch = !memorySearchTerm || 
            memory.initial_memory?.toLowerCase().includes(memorySearchTerm.toLowerCase()) ||
            memory.final_memory?.toLowerCase().includes(memorySearchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });
      
    const handleEditWidgetSave = (updatedWidget) => {
        console.log("[DataDash] Saving updated widget:", updatedWidget);
        saveWidgets(widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w));
        setIsEditWidgetModalOpen(false);
        setWidgetToEdit(null);
    };

    const handleContextMenu = (e, widgetId) => {
        e.preventDefault(); e.stopPropagation();
        console.log(`[DataDash] handleContextMenu: Right-click detected on widget ID: ${widgetId}`);
        const widgetConfig = widgets.find(w => w.id === widgetId);
        if (widgetConfig) {
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, widgetId });
        } else {
            console.error("[DataDash] handleContextMenu: Widget config not found for ID:", widgetId);
        }
    };

    const handleContextMenuSelect = async (action) => {
        console.log(`[DataDash] handleContextMenuSelect: Action received: '${action}' for widget ID ${contextMenu.widgetId}`);
        const selectedWidget = widgets.find(w => w.id === contextMenu.widgetId);
        
        if (selectedWidget) {
            if (action === 'delete') {
                handleRemoveWidget(contextMenu.widgetId);
                console.log(`[DataDash] Deleted widget with ID: ${contextMenu.widgetId}`);
            } else if (action === 'edit') {
               
                if (dbTables.length === 0) {
                    try {
                        console.log("[DataDash] Edit clicked, fetching DB tables for the first time...");
                        const res = await window.api.listTables();
                        if (res.error) throw new Error(res.error);
                        setDbTables(res.tables || []);
                    } catch (err) {
                        setQueryError("Could not fetch database tables for editor.");
                    }
                }
                setWidgetToEdit(selectedWidget);
                setIsEditWidgetModalOpen(true);
            }
        } else {
            console.error("[DataDash] handleContextMenuSelect: Widget config not found for contextMenu.widgetId:", contextMenu.widgetId);
        }
        setContextMenu({ visible: false, x: 0, y: 0, widgetId: null });
    };
    const fetchSchemaForTable = useCallback(async (tableName) => {
        if (tableSchemaCache[tableName]) return tableSchemaCache[tableName];
        try {
            const res = await window.api.getTableSchema({ tableName });
            if (res.error) throw new Error(res.error);
            setTableSchemaCache(prev => ({ ...prev, [tableName]: res.schema }));
            return res.schema;
        } catch (err) { console.error(`Failed to get schema for ${tableName}:`, err); return null; }
    }, [tableSchemaCache]);

   
    useEffect(() => {
        const fetchTables = async () => {
            if (isQueryPanelOpen && dbTables.length === 0) {
                try {
                    const res = await window.api.listTables();
                    if (res.error) throw new Error(res.error);
                    setDbTables(res.tables || []);
                } catch (err) {
                    setQueryError("Could not fetch database tables.");
                }
            }
        };
        fetchTables();
    }, [isQueryPanelOpen, dbTables.length]);

   
    const fetchKgData = useCallback(async (generation) => {
        setKgLoading(true); setKgError(null);
       
        const genToFetch = generation !== undefined ? generation : (currentKgGeneration !== null ? currentKgGeneration : null);
        
        try {
            const [generationsRes, graphDataRes, statsRes, cooccurRes, centralityRes] = await Promise.all([
                window.api.kg_listGenerations(),
                window.api.kg_getGraphData({ generation: genToFetch }),
                window.api.kg_getNetworkStats({ generation: genToFetch }),
                window.api.kg_getCooccurrenceNetwork({ generation: genToFetch }),
                window.api.kg_getCentralityData({ generation: genToFetch }),
            ]);

            if (generationsRes.error) throw new Error(`Generations Error: ${generationsRes.error}`);
            setKgGenerations(generationsRes.generations || []);
            const gens = generationsRes.generations || [];
           
            if (currentKgGeneration === null && gens.length > 0) {
                setCurrentKgGeneration(Math.max(...gens));
            }

            if (graphDataRes.error) throw new Error(`Graph Data Error: ${graphDataRes.error}`);
            setKgData(graphDataRes.graph || { nodes: [], links: [] });

            if (statsRes.error) console.warn("Stats Error:", statsRes.error); else setNetworkStats(statsRes.stats);
            if (cooccurRes.error) console.warn("Co-occurrence Error:", cooccurRes.error); else setCooccurrenceData(cooccurRes.network);
            if (centralityRes.error) console.warn("Centrality Error:", centralityRes.error); else setCentralityData(centralityRes.centrality);

        } catch (err) {
            setKgError(err.message);
        } finally {
            setKgLoading(false);
        }
    }, [currentKgGeneration]);

    useEffect(() => { if (isOpen) { fetchKgData(); } }, [isOpen, fetchKgData]);

   const generateCSVFilename = (query) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    let description = 'query_results';
    if (query) {
        const tableMatch = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch) {
            description = tableMatch[1];
        }
        
        if (query.toLowerCase().includes('count')) description += '_counts';
        if (query.toLowerCase().includes('group by')) description += '_grouped';
        if (query.toLowerCase().includes('where')) description += '_filtered';
    }
    
    return `${description}_${timestamp}.csv`;
};


    const exportToCSV = (data, query) => {
    if (!data || data.length === 0) return;
    
    const suggestedFilename = generateCSVFilename(query);
    
    if (csvExportSettings.alwaysPrompt) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-[80]';
        modal.innerHTML = `
            <div class="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 class="text-lg font-semibold mb-4">Export CSV</h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-sm theme-text-secondary">Filename</label>
                        <input type="text" id="csv-filename" value="${suggestedFilename}" class="w-full theme-input mt-1" />
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="dont-ask-again" class="theme-checkbox" />
                        <label for="dont-ask-again" class="text-sm">Don't ask again, just save with auto-generated names</label>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button id="csv-cancel" class="theme-button px-4 py-2 text-sm rounded">Cancel</button>
                    <button id="csv-save" class="theme-button-primary px-4 py-2 text-sm rounded">Save CSV</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const filenameInput = modal.querySelector('#csv-filename');
        const dontAskAgain = modal.querySelector('#dont-ask-again');
        const cancelBtn = modal.querySelector('#csv-cancel');
        const saveBtn = modal.querySelector('#csv-save');
        
        const cleanup = () => document.body.removeChild(modal);
        
        cancelBtn.onclick = cleanup;
        
        saveBtn.onclick = () => {
            const filename = filenameInput.value || suggestedFilename;
            
            if (dontAskAgain.checked) {
                setCsvExportSettings({ alwaysPrompt: false });
            }
            
            downloadCSV(data, filename);
            cleanup();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) cleanup();
        };
    } else {
        downloadCSV(data, suggestedFilename);
    }
};

    const downloadCSV = (data, filename) => {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    const stringValue = String(value || '');
                    return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') 
                        ? `"${stringValue.replace(/"/g, '""')}"` 
                        : stringValue;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExecuteQuery = async () => {
        setLoadingQuery(true); setQueryError(null); setQueryResult(null);
        try {
            const response = await window.api.executeSQL({ query: sqlQuery });
            if (response.error) throw new Error(response.error);
            setQueryResult(response.result);
            const newHistory = [{ query: sqlQuery, favorited: false, date: new Date().toISOString() }, ...queryHistory.filter(h => h.query !== sqlQuery)].slice(0, 20);
            setQueryHistory(newHistory); localStorage.setItem('dataDashQueryHistory', JSON.stringify(newHistory));
        } catch (err) { setQueryError(err.message); } finally { setLoadingQuery(false); }
    };
    
const handleGenerateSql = async () => {
    if (!nlQuery.trim()) return;
    setGeneratingSql(true);
    setGeneratedSql('');
    setQueryError(null);
    try {
        const schemaInfo = await Promise.all(
            dbTables.map(async (table) => {
                const schemaRes = await window.api.getTableSchema(
                    { tableName: table }
                );
                if (schemaRes.error) 
                    return `/* Could not load schema for ${table} */`;
                const columns = schemaRes.schema
                    .map(col => `  ${col.name} ${col.type}`)
                    .join(',\n');
                return `TABLE ${table}(\n${columns}\n);`;
            })
        );
        const prompt = `Given this database schema:

${schemaInfo.join('\n\n')}

Generate a SQL query for: ${nlQuery}

Please provide only the SQL query without any markdown formatting or explanations.`;

        const newStreamId = generateId();
        setNlToSqlStreamId(newStreamId);
        const result = await window.api.executeCommandStream({
            commandstr: prompt,
            currentPath: '/',
            conversationId: null,
            model: currentModel,
            provider: currentProvider,
            npc: currentNPC,
            streamId: newStreamId,
            attachments: []
        });
        if (result && result.error) throw new Error(result.error);
    } catch (err) {
        setQueryError(err.message);
        setGeneratingSql(false);
        setNlToSqlStreamId(null);
    }
};

const handleAcceptGeneratedSql = () => {
    setSqlQuery(generatedSql);
    setSqlInputMode('sql');
};

    useEffect(() => {
    if (!nlToSqlStreamId) return;
    const handleStreamData = (_, { streamId, chunk }) => {
        if (streamId !== nlToSqlStreamId) return;
        try {
            let content = '';
            if (typeof chunk === 'string') {
                if (chunk.startsWith('data:')) {
                    const dataContent = chunk
                        .replace(/^data:\s*/, '')
                        .trim();
                    if (dataContent === '[DONE]') return;
                    if (dataContent) {
                        try {
                            const parsed = JSON.parse(dataContent);
                            content = parsed.choices?.[0]
                                ?.delta?.content || '';
                        } catch (e) {
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
            console.error(
                'DataDash NL-to-SQL stream error:', 
                err
            );
        }
    };
    const handleStreamComplete = (_, { streamId }) => {
        if (streamId !== nlToSqlStreamId) return;
        setGeneratingSql(false);
        setGeneratedSql(prev => 
            prev.replace(/```sql|```/g, '').trim()
        );
        setNlToSqlStreamId(null);
    };
    const handleStreamError = (_, { streamId, error }) => {
        if (streamId !== nlToSqlStreamId) return;
        setQueryError(`NL-to-SQL Error: ${error}`);
        setGeneratingSql(false);
        setNlToSqlStreamId(null);
    };
    const cleanupData = window.api.onStreamData(handleStreamData);
    const cleanupComplete = window.api.onStreamComplete(
        handleStreamComplete
    );
    const cleanupError = window.api.onStreamError(handleStreamError);
    return () => {
        cleanupData();
        cleanupComplete();
        cleanupError();
    };
}, [nlToSqlStreamId]);

    const processedGraphData = React.useMemo(() => {
        let sourceNodes = [];
        let sourceLinks = [];

        if (kgViewMode === 'cooccurrence' && cooccurrenceData) {
            sourceNodes = cooccurrenceData.nodes || [];
            sourceLinks = cooccurrenceData.links || [];
        } else if (kgData && kgData.nodes) {
            sourceNodes = kgData.nodes;
            sourceLinks = kgData.links;
        }

        if (kgNodeFilter === 'high-degree' && networkStats?.node_degrees) {
          const avgDegree = networkStats.avg_degree || 0;
          const degreeThreshold = avgDegree > 1 ? avgDegree * 1.2 : 2;
          const highDegreeNodeIds = new Set(Object.keys(networkStats.node_degrees).filter(id => networkStats.node_degrees[id] >= degreeThreshold));
          const filteredNodes = sourceNodes.filter(n => highDegreeNodeIds.has(n.id));
          const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
          const filteredLinks = sourceLinks.filter(l => filteredNodeIds.has(l.source?.id || l.source) && filteredNodeIds.has(l.target?.id || l.target));
          return { nodes: filteredNodes, links: filteredLinks };
        }
        
        return { nodes: sourceNodes, links: sourceLinks };
    }, [kgData, kgViewMode, kgNodeFilter, networkStats, cooccurrenceData]);
    
    const getNodeColor = React.useCallback((node) => {
        if (kgViewMode === 'cooccurrence') {
          const community = node.community || 0;
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];
          return colors[community % colors.length];
        }
        return node.type === 'concept' ? '#a855f7' : '#3b82f6';
    }, [kgViewMode]);

    const getNodeSize = React.useCallback((node) => {
        if (networkStats?.node_degrees?.[node.id]) {
          const degree = networkStats.node_degrees[node.id];
          const maxDegree = Math.max(1, ...Object.values(networkStats.node_degrees));
          return 4 + (degree / maxDegree) * 12;
        }
        return node.type === 'concept' ? 6 : 4;
    }, [networkStats]);

    const getLinkWidth = React.useCallback((link) => (link.weight ? Math.min(5, link.weight / 2) : 1), []);


    const handleKgProcessTrigger = async (type) => { setKgLoading(true); setKgError(null); try { await window.api.kg_triggerProcess({ type }); setCurrentKgGeneration(null); } catch (err) { setKgError(err.message); } finally { setKgLoading(false); } };
    const handleKgRollback = async () => {
        if (currentKgGeneration > 0) {
            const targetGen = currentKgGeneration - 1;
            setKgLoading(true);
            try {
               
                await window.api.kg_rollback({ generation: targetGen });
               
               
                setCurrentKgGeneration(targetGen); 
            } catch (err) {
                setKgError(err.message);
                setKgLoading(false);
            }
        }
    };

    
    if (!isOpen) return null;
    
       
        const filteredWidgets = widgets.filter(widget => widget && widget.id);

        
    return (
        <div> 

            <AddCustomWidgetModal 
                isOpen={isAddCustomWidgetModalOpen} 
                onClose={() => setIsAddCustomWidgetModalOpen(false)} 
                context={customWidgetContext} 
                onAddWidget={handleAddWidget}
                dbTables={dbTables}
                fetchSchema={fetchSchemaForTable}
            />


            {isEditWidgetModalOpen && widgetToEdit && (
                <EditWidgetModal 
                    isOpen={isEditWidgetModalOpen} 
                    onClose={() => setIsEditWidgetModalOpen(false)} 
                    widget={widgetToEdit} 
                    onSave={handleEditWidgetSave}
                    dbTables={dbTables}
                    tableSchemaCache={tableSchemaCache}
                    fetchSchema={fetchSchemaForTable}
                />
            )}

            {contextMenu.visible && <WidgetContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu({visible: false})} onSelect={handleContextMenuSelect} />}

            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="theme-bg-secondary rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                    <header className="w-full border-b theme-border p-4 flex justify-between items-center flex-shrink-0">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart3 className="text-blue-400" />
                            Usage Dashboard
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => saveWidgets(defaultWidgets)} className="p-1 rounded-full theme-hover" title="Reset to default layout">
                                <Repeat size={20} />
                            </button>
                            <button onClick={onClose} className="p-1 rounded-full theme-hover">
                                <X size={20} />
                            </button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* The new widget display section, populated by `widgets` state */}
                        <section id="widgets">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredWidgets.map(widget => (
                                    <div key={widget.id} className={`h-56 ${widget.span ? `lg:col-span-${widget.span}` : 'lg:col-span-1'} md:col-span-2 col-span-4`}>
                                        <DashboardWidget config={widget} onContextMenu={handleContextMenu}/>
                                    </div>
                                ))}
                                <div className="flex items-center justify-center h-56 border-2 border-dashed theme-border rounded-lg hover:bg-gray-800/50 transition-colors">
                                    <button onClick={
                                            () => setIsAddCustomWidgetModalOpen(true)
                                            } 
                                            className="theme-button text-sm flex flex-col items-center gap-2">
                                                <Plus size={16}/>
                                                 Add Widget
                                                
                                                </button>


                                </div>
                             </div>
                        </section>
                        
                        {/* Original SQL Query Panel - Preserved as is */}
                        <section id="sql-query-panel" className="border theme-border rounded-lg">
                            <button onClick={() => setIsQueryPanelOpen(!isQueryPanelOpen)} className="w-full p-4 flex justify-between items-center theme-hover"><h4 className="text-lg font-semibold flex items-center gap-3"><Database className="text-purple-400"/>Direct Database Query</h4>{isQueryPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</button>
                            {isQueryPanelOpen && (
                                <div className="p-4 border-t theme-border">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                        <div className="border theme-border rounded-lg p-3 flex flex-col">
                                            <h5 className="font-semibold mb-2 flex items-center gap-2">
                                                <Table size={16}/> 
                                                Database Schema
                                                </h5>
                                                <div className="grid grid-cols-2 gap-3 flex-1">
                                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                        {dbTables.length > 0 ? dbTables.map(name => (
                            <button key={name} onClick={() => handleViewSchema(name)} 
                            className={`w-full text-left px-2 py-1 rounded text-sm ${selectedTable === name ? 'theme-button-primary' : 'theme-hover'}`
                        }>{name}</button>)
                        ) 
                            : <p className="text-sm theme-text-secondary">No tables found.</p>}
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {loadingSchema ? <div className="flex items-center justify-center h-full">
                                    <Loader className="animate-spin" /></div> : tableSchema ? <ul className="text-sm font-mono space-y-1">{tableSchema.map(col => <li key={col.name}>- {col.name}: 
                                        <span className="text-yellow-400">{col.type}</span></li>)}</ul> : <p className="text-sm theme-text-secondary">
                                            Select a table.
                                            </p> }</div></div></div>
                                        <div className="border theme-border rounded-lg p-3 flex flex-col">
                                            <div className="flex border-b theme-border mb-2 items-center justify-between">
                                                <h5 className="font-semibold flex items-center gap-2">
                                                    Query History
                                                    </h5>
                                                    </div>
                                                    <ul className="space-y-1 max-h-48 overflow-y-auto text-sm font-mono flex-1">
                                                        {queryHistory.map(
                                                            (h, i) => 
                                                            (<li key={i} className="flex items-center justify-between group p-1 rounded hover:theme-bg-tertiary">
                                                                <span onClick={
                                                                    () => handleHistoryAction(i, 'run')
                                                                    } 
                                                                    className="truncate cursor-pointer flex-1 pr-2" 
                                                                    title={h.query}>{h.query}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => handleHistoryAction(i, 'run')

                                                                        } 
                                                                        title="Run">
                                                                            <Play size={14}/>
                                                                            </button>
                                                                            
                                                                            <button onClick={
                                                                                () => handleHistoryAction(i, 'copy')
                                                                                } title="Copy">
                                                                                    <Copy size={14}/>
                                                                            </button>
                                                                            <button onClick={
                                                                                () => handleHistoryAction(i, 'favorite')
                                                                                } 
                                                                                title="Favorite">
                                                                                    <Star size={14} 
                                                                                className={h.favorited ? 'fill-yellow-400 text-yellow-400' : ''}/>
                                                                                </button><button onClick={() => handleHistoryAction(i, 'delete')

                                                                                } title="Delete">
                                                                                    <Trash2 size={14} className="text-red-400"/>
                                                                                    </button></div></li>
                                                                                )
                                                                                )
                                                                                }
                                                                                </ul>
                                                                                </div>
                                    </div>
<div className="flex items-center gap-2 mb-2">
    <span className="text-sm font-semibold">Query Mode:</span>
    <button 
        onClick={() => setSqlInputMode('sql')} 
        className={`px-3 py-1 text-xs rounded ${
            sqlInputMode === 'sql' 
                ? 'theme-button-primary' 
                : 'theme-button'
        }`}
    >
        SQL
    </button>
    <button 
        onClick={() => setSqlInputMode('nl')} 
        className={`px-3 py-1 text-xs rounded ${
            sqlInputMode === 'nl' 
                ? 'theme-button-primary' 
                : 'theme-button'
        }`}
    >
        Natural Language
    </button>
</div>

{sqlInputMode === 'nl' ? (
    <div className="grid grid-cols-2 gap-3 items-start">
        <div>
            <textarea 
                value={nlQuery} 
                onChange={(e) => setNlQuery(e.target.value)} 
                rows={4}
                className="w-full p-2 theme-input font-mono text-sm" 
                placeholder="e.g., show me average message length per model..." 
            />
            <button 
                onClick={handleGenerateSql} 
                disabled={generatingSql} 
                className="w-full mt-2 px-4 py-2 
                    theme-button-primary rounded text-sm 
                    disabled:opacity-50"
            >
                {generatingSql 
                    ? 'Generating SQL...' 
                    : 'Generate SQL'}
            </button>
        </div>
        <div className="theme-bg-tertiary p-2 rounded-lg h-full 
            flex flex-col">
            <pre className="flex-1 text-xs font-mono p-2 
                overflow-auto">
                {generatedSql || 
                    'Generated SQL will appear here...'}
            </pre>
            {generatedSql && (
                <button 
                    onClick={handleAcceptGeneratedSql} 
                    className="mt-2 w-full theme-button-success 
                        text-sm py-1 rounded"
                >
                    Use this SQL
                </button>
            )}
        </div>
    </div>
) : (
    <>
        <textarea 
            value={sqlQuery} 
            onChange={(e) => setSqlQuery(e.target.value)} 
            rows={5}
            className="w-full p-2 theme-input font-mono text-sm" 
            placeholder="Enter your SQL query here..." 
        />
        <div className="flex justify-end mt-2">
            <button 
                onClick={handleExecuteQuery} 
                disabled={loadingQuery} 
                className="px-4 py-2 theme-button-primary rounded 
                    text-sm disabled:opacity-50"
            >
                {loadingQuery ? 'Executing...' : 'Execute Query'}
            </button>
        </div>
    </>
)}


                                    {loadingQuery && <div className="flex justify-center p-4"><Loader className="animate-spin"/></div>}
                                    {queryError && <div className="text-red-400 p-3 mt-2 rounded theme-bg-tertiary">{queryError}</div>}
                                    {queryResult && queryResult.length > 0 && (
                                        <div className="mt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="font-semibold">Query Results</h5>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => { 
                                                        setCustomWidgetContext({ query: sqlQuery, result: queryResult }); 
                                                        setIsAddCustomWidgetModalOpen(true); 
                                                    }} className="px-3 py-1 text-xs theme-button-primary rounded flex items-center gap-2">
                                                        <Plus size={14} /> Add to Dashboard
                                                    </button>
                                                    <button 
                                                        onClick={() => exportToCSV(queryResult, sqlQuery)}
                                                        disabled={!queryResult || queryResult.length === 0} 
                                                        className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Download size={14} /> Export to CSV
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="border theme-border rounded-lg p-3 mb-4 theme-bg-tertiary">
                                                <h6 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                    <BarChartIcon size={16} /> Chart Explorer
                                                </h6>
                                                <div className="grid grid-cols-4 gap-3 items-end">
                                                    <div>
                                                        <label className="text-xs theme-text-secondary">X-Axis</label>
                                                        <select 
                                                            value={chartExplorer.xCol}
                                                            onChange={e => setChartExplorer({...chartExplorer, xCol: e.target.value})}
                                                            className="w-full theme-input mt-1 text-sm"
                                                        >
                                                            <option value="">Select column...</option>
                                                            {Object.keys(queryResult[0]).map(col => 
                                                                <option key={col} value={col}>{col}</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs theme-text-secondary">Y-Axis</label>
                                                        <select 
                                                            value={chartExplorer.yCol}
                                                            onChange={e => setChartExplorer({...chartExplorer, yCol: e.target.value})}
                                                            className="w-full theme-input mt-1 text-sm"
                                                        >
                                                            <option value="">Select column...</option>
                                                            {Object.keys(queryResult[0]).map(col => 
                                                                <option key={col} value={col}>{col}</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs theme-text-secondary">Chart Type</label>
                                                        <select 
                                                            value={chartExplorer.chartType}
                                                            onChange={e => setChartExplorer({...chartExplorer, chartType: e.target.value})}
                                                            className="w-full theme-input mt-1 text-sm"
                                                        >
                                                            <option value="bar">Bar Chart</option>
                                                            <option value="line">Line Chart</option>
                                                            <option value="scatter">Scatter Plot</option>
                                                        </select>
                                                    </div>
                                                    <button 
                                                        onClick={() => setChartExplorer({...chartExplorer, showChart: !chartExplorer.showChart})}
                                                        disabled={!chartExplorer.xCol || !chartExplorer.yCol}
                                                        className="px-3 py-2 theme-button-primary rounded text-sm disabled:opacity-50"
                                                    >
                                                        {chartExplorer.showChart ? 'Hide Chart' : 'Plot Chart'}
                                                    </button>
                                                </div>
                                            </div>

                                            {chartExplorer.showChart && chartExplorer.xCol && chartExplorer.yCol && (
                                                <div className="border theme-border rounded-lg p-3 mb-4 h-80">
                                                    <div className="h-full w-full">
                                                        {(() => {
                                                            const chartData = {
                                                                labels: queryResult.map(d => d[chartExplorer.xCol]),
                                                                datasets: [{
                                                                    label: chartExplorer.yCol,
                                                                    data: queryResult.map(d => parseFloat(d[chartExplorer.yCol]) || 0),
                                                                    backgroundColor: chartExplorer.chartType === 'bar' ? '#8b5cf6' : '#8b5cf633',
                                                                    borderColor: '#8b5cf6',
                                                                    fill: chartExplorer.chartType === 'line',
                                                                    tension: 0.3,
                                                                    pointRadius: chartExplorer.chartType === 'scatter' ? 4 : 2
                                                                }]
                                                            };

                                                            const chartOptions = {
                                                                responsive: true, 
                                                                maintainAspectRatio: false,
                                                                plugins: { 
                                                                    legend: { display: true, position: 'top', labels: { color: '#9ca3af' } },
                                                                    tooltip: { mode: 'index', intersect: false }
                                                                },
                                                                scales: {
                                                                    x: { 
                                                                        type: chartExplorer.chartType === 'scatter' ? 'linear' : 'category',
                                                                        ticks: { color: '#9ca3af' }, 
                                                                        grid: { color: '#374151'} 
                                                                    },
                                                                    y: { 
                                                                        ticks: { color: '#9ca3af' }, 
                                                                        grid: { color: '#374151'} 
                                                                    }
                                                                }
                                                            };

                                                            if (chartExplorer.chartType === 'scatter') {
                                                                chartOptions.scales.x.type = 'linear';
                                                                chartData.datasets[0].showLine = false;
                                                                chartData.datasets[0].pointRadius = 4;
                                                            }

                                                            const ChartComponent = chartExplorer.chartType === 'line' || chartExplorer.chartType === 'scatter' ? Line : Bar;
                                                            return <ChartComponent options={chartOptions} data={chartData} />;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-2 overflow-x-auto theme-border border rounded-lg max-h-96">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="theme-bg-tertiary sticky top-0">
                                                        <tr>{Object.keys(queryResult[0]).map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr>
                                                    </thead>
                                                    <tbody className="theme-bg-primary divide-y theme-divide">
                                                        {queryResult.map((row, rIndex) => (
                                                            <tr key={rIndex}>
                                                                {Object.keys(row).map(key => 
                                                                    <td key={key} className="p-2 font-mono truncate max-w-xs">{String(row[key])}</td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                            )}
                        </section>

                        <section id="memory-management" className="border theme-border rounded-lg">
    <button 
        onClick={() => setIsMemoryPanelOpen(!isMemoryPanelOpen)} 
        className="w-full p-4 flex justify-between items-center theme-hover"
    >
        <h4 className="text-lg font-semibold flex items-center gap-3">
            <Brain className="text-orange-400"/>
            Memory Management ({memories.length} memories)
        </h4>
        {isMemoryPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
    </button>
    {isMemoryPanelOpen && (
        <div className="p-4 border-t theme-border">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="text-sm font-medium mb-2 block">Search Memories</label>
                    <input 
                        type="text"
                        value={memorySearchTerm}
                        onChange={(e) => setMemorySearchTerm(e.target.value)}
                        placeholder="Search memory content..." 
                        className="w-full theme-input text-sm" 
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-2 block">Filter by Status</label>
                    <select 
                        value={memoryFilter}
                        onChange={(e) => setMemoryFilter(e.target.value)}
                        className="w-full theme-input text-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="human-approved">Approved</option>
                        <option value="human-edited">Edited</option>
                        <option value="human-rejected">Rejected</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={loadMemories}
                        disabled={memoryLoading}
                        className="px-4 py-2 theme-button rounded text-sm disabled:opacity-50"
                    >
                        {memoryLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {memoryLoading ? (
                <div className="flex items-center justify-center p-8">
                    <Loader className="animate-spin text-orange-400" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="theme-bg-tertiary sticky top-0">
                            <tr>
                                <th className="p-2 text-left font-semibold">Memory Content</th>
                                <th className="p-2 text-left font-semibold">Status</th>
                                <th className="p-2 text-left font-semibold">NPC</th>
                                <th className="p-2 text-left font-semibold">Date</th>
                                <th className="p-2 text-left font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y theme-divide">
                            {filteredMemories.map(memory => (
                                <tr key={memory.memory_id} className="theme-hover">
                                    <td className="p-2">
                                        <div className="max-w-md">
                                            <div className="truncate font-medium">
                                                {memory.final_memory || memory.initial_memory}
                                            </div>
                                            {memory.final_memory && memory.final_memory !== memory.initial_memory && (
                                                <div className="text-xs theme-text-muted mt-1">
                                                    Original: {memory.initial_memory}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            memory.status === 'human-approved' ? 'bg-green-900 text-green-300' :
                                            memory.status === 'human-edited' ? 'bg-blue-900 text-blue-300' :
                                            memory.status === 'human-rejected' ? 'bg-red-900 text-red-300' :
                                            'bg-yellow-900 text-yellow-300'
                                        }`}>
                                            {memory.status}
                                        </span>
                                    </td>
                                    <td className="p-2 text-xs">{memory.npc || 'N/A'}</td>
                                    <td className="p-2 text-xs">
                                        {memory.timestamp ? new Date(memory.timestamp.replace(' ', 'T')).toLocaleString() : 'N/A'}
                                    </td>
                                    <td className="p-2">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    const edited = prompt('Edit memory:', memory.final_memory || memory.initial_memory);
                                                    if (edited && edited !== (memory.final_memory || memory.initial_memory)) {
                                                        // Update memory in database
                                                        window.api.executeSQL({
                                                            query: `UPDATE memory_lifecycle SET final_memory = ?, status = 'human-edited' WHERE id = ?`,
                                                            params: [edited, memory.id]
                                                        }).then(() => loadMemories());

                                                        }
                                                }}
                                                className="p-1 theme-hover rounded"
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this memory?')) {
                                                        window.api.executeSQL({
                                                            query: `DELETE FROM memory_lifecycle WHERE id = ?`,
                                                            params: [memory.id]
                                                        }).then(() => loadMemories());
                                                    }
                                                }}
                                                className="p-1 theme-hover rounded text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredMemories.length === 0 && (
                        <div className="text-center p-8 theme-text-muted">
                            No memories found matching the current filters.
                        </div>
                    )}
                </div>
            )}
        </div>
    )}
</section>

                        {/* Original Knowledge Graph Section - Preserved as is */}
<section id="knowledge-graph" className="border theme-border rounded-lg p-4">
    <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg font-semibold flex items-center gap-3">
            <GitBranch className="text-green-400"/>Knowledge Graph Inspector
        </h4>
        <div className="flex items-center gap-2">
            <button onClick={() => handleKgProcessTrigger('sleep')} disabled={kgLoading} className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2"><Zap size={14}/> Sleep</button>
            <button onClick={() => handleKgProcessTrigger('dream')} disabled={kgLoading} className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2"><Brain size={14}/> Dream</button>
        </div>
    </div>

    {/* --- NEW: Enhanced Controls --- */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
            <label className="text-xs theme-text-secondary mb-1 block">View Mode</label>
            <select value={kgViewMode} onChange={(e) => setKgViewMode(e.target.value)} className="w-full px-2 py-1 text-xs theme-input rounded">
              <option value="full">Full Network</option>
              <option value="cooccurrence">Concept Co-occurrence</option>
            </select>
        </div>
        <div>
            <label className="text-xs theme-text-secondary mb-1 block">Node Filter</label>
            <select value={kgNodeFilter} onChange={(e) => setKgNodeFilter(e.target.value)} className="w-full px-2 py-1 text-xs theme-input rounded">
              <option value="all">Show All Nodes</option>
              <option value="high-degree">Show High-Degree Nodes</option>
            </select>
        </div>
    </div>
    
    {kgError && <div className="text-red-400 text-center p-4">{kgError}</div>}

    {kgLoading ? (<div className="h-96 flex items-center justify-center theme-bg-tertiary rounded-lg"><Loader className="animate-spin text-green-400" size={32} /></div>) : (
    <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 flex flex-col gap-4">
            <div className="theme-bg-tertiary p-3 rounded-lg">
                <h5 className="font-semibold text-sm mb-2">Controls</h5>
                <label className="text-xs theme-text-secondary">Active Generation</label>
                <div className="flex items-center gap-2">
                    <input type="range" min="0" max={kgGenerations.length > 0 ? Math.max(...kgGenerations) : 0} value={currentKgGeneration || 0} onChange={(e) => setCurrentKgGeneration(parseInt(e.target.value))} className="w-full" disabled={kgGenerations.length === 0}/>
                    <span className="font-mono text-sm p-1 theme-bg-primary rounded">{currentKgGeneration}</span>
                </div>
                <button onClick={handleKgRollback} disabled={currentKgGeneration === 0 || kgLoading} className="w-full mt-3 text-xs py-1 theme-button-danger rounded flex items-center justify-center gap-2 disabled:opacity-50"><Repeat size={14} /> Rollback One Gen</button>
            </div>
            
            {/* --- NEW: Enhanced Stats Panel --- */}
            <div className="theme-bg-tertiary p-3 rounded-lg">
                <h5 className="font-semibold text-sm mb-2">Current View Stats</h5>
                <p className="text-xs theme-text-secondary">Nodes: <span className="font-bold theme-text-primary">{processedGraphData.nodes.length}</span></p>
                <p className="text-xs theme-text-secondary">Links: <span className="font-bold theme-text-primary">{processedGraphData.links.length}</span></p>
                {networkStats && kgViewMode === 'full' && (
                    <>
                    <p className="text-xs theme-text-secondary">Density: <span className="font-bold theme-text-primary">{networkStats.density?.toFixed(4)}</span></p>
                    <p className="text-xs theme-text-secondary">Avg Degree: <span className="font-bold theme-text-primary">{networkStats.avg_degree?.toFixed(2)}</span></p>
                    </>
                )}
            </div>

            {/* --- NEW: Centrality Panel --- */}
            {centralityData?.degree && (
                <div className="theme-bg-tertiary p-3 rounded-lg">
                    <h5 className="font-semibold text-sm mb-2">Top Central Concepts</h5>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {Object.entries(centralityData.degree).sort(([,a], [,b]) => b - a).slice(0, 10).map(([node, score]) => (
                            <div key={node} className="text-xs" title={node}>
                                <div className="truncate font-mono">{node}</div>
                                <div className="text-green-400 font-semibold">{score.toFixed(3)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="col-span-3 h-96 theme-bg-tertiary rounded-lg relative overflow-hidden">
            <ForceGraph2D 
                ref={graphRef} 
                graphData={processedGraphData} 
                nodeLabel="id" 
                nodeVal={getNodeSize} 
                nodeColor={getNodeColor} 
                linkWidth={getLinkWidth}
                linkDirectionalParticles={kgViewMode === 'full' ? 1 : 0} 
                linkDirectionalParticleWidth={2} 
                linkColor={() => 'rgba(255,255,255,0.2)'} 
                width={800} 
                height={384} 
                backgroundColor="transparent"
            />
        </div>
    </div>)}
</section>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default DataDash;