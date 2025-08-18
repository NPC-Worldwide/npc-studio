import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3, Loader, X, ServerCrash, MessageSquare, BrainCircuit, Bot,
    ChevronDown, ChevronRight, Database, Table, LineChart, BarChart as BarChartIcon,
    Star, Trash2, Play, Copy, Download, Plus, Settings2, Edit, // Import Edit icon
    GitBranch, Brain, Zap, Clock, ChevronsRight, Repeat
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import ForceGraph2D from 'react-force-graph-2d';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale // Import TimeScale for date handling
  } from 'chart.js';
  
import 'chartjs-adapter-date-fns'; 

import * as d3 from 'd3';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, TimeScale, TimeSeriesScale);

const generateId = () => `widget_${Math.random().toString(36).substr(2, 9)}`;

// --- Sub-components for Widget System (Encapsulated) ---

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

const AddDefaultWidgetModal = ({ isOpen, onClose, availableWidgets, onAddWidget }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold">Add a Widget</h3><button onClick={onClose} className="p-1 rounded-full theme-hover"><X size={20}/></button></div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableWidgets.length > 0 ? availableWidgets.map(widget => { const Icon = iconMap[widget.iconName]; return (<button key={widget.id} onClick={() => { onAddWidget(widget); onClose(); }} className="w-full theme-hover p-3 rounded flex items-center gap-3 text-left">{Icon && <Icon className={widget.iconColor || 'text-gray-400'}/>}<span>{widget.title}</span></button>)}) : (<p className="theme-text-secondary text-center p-4">All default widgets are on the dashboard.</p>)}
                </div>
            </div>
        </div>
    );
};

const AddCustomWidgetModal = ({ isOpen, onClose, context, onAddWidget }) => {
    const [title, setTitle] = useState(''); const [type, setType] = useState('table'); const [xCol, setXCol] = useState(''); const [yCol, setYCol] = useState(''); const [chartType, setChartType] = useState('bar');
    useEffect(() => { if (context?.result?.[0]) { const columns = Object.keys(context.result[0]); setXCol(columns[0] || ''); setYCol(columns.length > 1 ? columns[1] : ''); } }, [context]);
    if (!isOpen) return null;
    const handleAdd = () => { const newWidget = { id: generateId(), title: title || 'Custom Widget', type: type, query: context.query, iconName: 'Settings2', chartConfig: type === 'chart' ? { x: xCol, y: yCol, type: chartType } : null, span: 1 }; onAddWidget(newWidget); onClose(); };
    return (<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"><div className="theme-bg-secondary p-6 rounded-lg shadow-xl w-full max-w-md"><h3 className="text-lg font-semibold mb-4">Add Custom Widget</h3><div className="space-y-4"><div><label className="text-sm theme-text-secondary">Widget Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full theme-input mt-1" placeholder="e.g., Daily Active Users"/></div><div><label className="text-sm theme-text-secondary">Display As</label><select value={type} onChange={e => setType(e.target.value)} className="w-full theme-input mt-1"><option value="table">Table</option><option value="chart">Chart</option></select></div>{type === 'chart' && (<><div className="grid grid-cols-2 gap-3"><div><label className="text-sm theme-text-secondary">X-Axis</label><select value={xCol} onChange={e => setXCol(e.target.value)} className="w-full theme-input mt-1">{Object.keys(context.result[0] || {}).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label className="text-sm theme-text-secondary">Y-Axis</label><select value={yCol} onChange={e => setYCol(e.target.value)} className="w-full theme-input mt-1">{Object.keys(context.result[0] || {}).map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><div><label className="text-sm theme-text-secondary">Chart Type</label><select value={chartType} onChange={e => setChartType(e.target.value)} className="w-full theme-input mt-1"><option value="bar">Bar</option><option value="line">Line</option></select></div></>)}</div><div className="flex justify-end gap-3 mt-6"><button onClick={onClose} className="theme-button px-4 py-2 text-sm rounded">Cancel</button><button onClick={handleAdd} className="theme-button-primary px-4 py-2 text-sm rounded">Add Widget</button></div></div></div>);
};
const EditWidgetModal = ({ isOpen, onClose, widget, onSave, dbTables, tableSchemaCache, fetchSchema }) => {
    // --- ENHANCED: Better query parsing to extract actual columns/expressions being used ---
    const parseQueryForBuilder = (query) => {
        if (!query) {
            return { isComplex: false, builderConfig: {} };
        }

        // Only mark as complex for multi-table operations
        const complexityPattern = /\bJOIN\b|\bUNION\b|\bWITH\b/i;
        const isComplex = complexityPattern.test(query);
        
        if (isComplex) {
            return { isComplex: true, builderConfig: {} };
        }

        // Extract table name
        const fromMatch = query.match(/\bFROM\s+([a-zA-Z0-9_]+)/i);
        if (!fromMatch) {
            return { isComplex: true, builderConfig: {} };
        }
        const table = fromMatch[1];
        
        // Extract SELECT clause expressions
        const selectMatch = query.match(/\bSELECT\s+(.*?)(?=\bFROM)/is);
        let selectExpressions = selectMatch ? 
            selectMatch[1].split(',').map(s => s.trim()) : 
            ['*']; 

        // Extract GROUP BY clause
        const groupByMatch = query.match(/\bGROUP BY\s+(.*?)(?:\bHAVING|\bORDER BY|\bLIMIT|$)/is);
        const groupByExpression = groupByMatch ? groupByMatch[1].trim() : '';

        // Extract base column names for initial checkbox selection (best effort)
        const extractedBaseColumns = new Set();
        selectExpressions.forEach(expr => {
            const columnCandidates = expr.matchAll(/\b([a-zA-Z0-9_]+)\b/g);
            for (const match of columnCandidates) {
                // Filter out common SQL keywords/functions that are not actual columns
                const keywordBlacklist = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'LIMIT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'IN', 'LIKE', 'IS', 'BETWEEN', 'AND', 'OR', 'NOT', 'NULL', 'STRFTIME', 'LENGTH']);
                if (match[1] && !keywordBlacklist.has(match[1].toUpperCase())) {
                    extractedBaseColumns.add(match[1]);
                }
            }
        });
        // Also extract columns from WHERE clause if present
        const whereMatch = query.match(/\bWHERE\s+(.*?)(?:\bGROUP BY\b|\bORDER BY\b|\bLIMIT\b|$)/is);
        if (whereMatch) {
            const whereClause = whereMatch[1];
            // Look for standalone column names potentially used in conditions
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
                selectExpressions, // Full expressions from SELECT
                groupByExpression,
                selectedBaseColumns: Array.from(extractedBaseColumns) // Only actual base columns for checkboxes
            } 
        };
    };

    const parsedData = parseQueryForBuilder(widget.query);
    
    // **CRITICAL FIX: Declare mode and isComplexQuery BEFORE config**
    const [isComplexQuery, setIsComplexQuery] = useState(parsedData.isComplex);
    const [mode, setMode] = useState(parsedData.isComplex ? 'advanced' : 'builder');

    // Initialize config state now that mode and isComplexQuery are defined
    const [config, setConfig] = useState({ 
        ...widget, 
        builder: {
            table: parsedData.builderConfig.table || '',
            selectedColumns: parsedData.builderConfig.selectedBaseColumns || [], // For checkboxes
            selectExpressions: parsedData.builderConfig.selectExpressions || [] // For chart axis options
        },
        chartConfig: { // Pre-fill chart config with parsed data
            ...widget.chartConfig,
            x: widget.chartConfig?.x || parsedData.builderConfig.selectExpressions[0] || '',
            y: widget.chartConfig?.y || parsedData.builderConfig.selectExpressions[1] || '',
            type: widget.chartConfig?.type || (widget.type.includes('line') ? 'line' : 'bar'),
            groupBy: widget.chartConfig?.groupBy || parsedData.builderConfig.groupByExpression || ''
        }
    });

    const [availableSchemaColumns, setAvailableSchemaColumns] = useState([]); // Columns from table schema
    const [selectableOutputExpressions, setSelectableOutputExpressions] = useState([]); // Columns/expressions that are output of query (for chart axes)
    const [testQueryStatus, setTestQueryStatus] = useState({ loading: false, error: null });

    const updateColumnsFromQuery = useCallback(async (query) => {
        if (!query) { setSelectableOutputExpressions([]); return; }
        setTestQueryStatus({ loading: true, error: null });
        try {
            // Execute a LIMIT 1 query to get the actual output column names
            const response = await window.api.executeSQL({ query: `${query.replace(/;$/, '')} LIMIT 1` });
            if (response.error) throw new Error(response.error);
            if (response.result && response.result.length > 0) {
                const newCols = Object.keys(response.result[0]);
                // These are the *result* column names, useful for chart axis dropdowns
                setSelectableOutputExpressions(newCols.map(c => ({ name: c, type: 'RESULT_COL' })));
            } else { 
                setSelectableOutputExpressions([]); 
            }
        } catch (err) { setTestQueryStatus({ loading: false, error: err.message }); } finally { setTestQueryStatus({ loading: false, error: null }); }
    }, []);

    useEffect(() => {
        // Builder -> SQL Sync for non-chart types (simple SELECT col1, col2)
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
        // For charts, query is built in handleSave using chartConfig fields
    }, [config.builder?.table, config.builder?.selectedColumns, config.type, mode]);

    useEffect(() => {
        const table = config.builder?.table;
        if (mode === 'builder' && table) {
            // When in builder mode and a table is selected, fetch its schema
            fetchSchema(table).then(schema => {
                setAvailableSchemaColumns(schema || []);
                // Also, initialize selectable output expressions from schema for charts
                if (config.type.includes('chart')) {
                    // Combine initial selectExpressions with schema columns for dropdown options
                    const initialChartOptions = new Set();
                    (config.builder.selectExpressions || []).forEach(expr => {
                        // Attempt to extract base column name from expression for better dropdown options
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
            // In advanced mode, get output columns from the current query
            updateColumnsFromQuery(config.query);
        }
    }, [mode, config.builder?.table, config.query, config.type, fetchSchema, updateColumnsFromQuery, config.builder.selectExpressions]);
    
    if (!isOpen) return null;

    const handleSave = () => {
        let finalQuery = config.query; // Default to existing query for advanced mode
        let newConfig = { ...config };

        if (mode === 'builder') {
            const { table, selectedColumns = [] } = config.builder || {};
            
            if (newConfig.type.includes('chart')) {
                // For charts, construct query using X, Y expressions and Group By
                let selectParts = [];
                if (newConfig.chartConfig.x) selectParts.push(newConfig.chartConfig.x);
                // Support multiple Y-axis expressions if comma-separated
                if (newConfig.chartConfig.y) {
                    newConfig.chartConfig.y.split(',').forEach(yExpr => {
                        yExpr = yExpr.trim();
                        if (yExpr && !selectParts.includes(yExpr)) selectParts.push(yExpr); // Avoid duplicates
                    });
                }
                
                if (table && selectParts.length > 0) {
                    finalQuery = `SELECT ${selectParts.join(', ')} FROM ${table}`;
                    if (newConfig.chartConfig.groupBy) {
                        finalQuery += ` GROUP BY ${newConfig.chartConfig.groupBy}`;
                    } else if (newConfig.chartConfig.x && selectParts.length > 1) { // If X is used and there are other select parts, group by X
                        // Attempt to extract the "base" expression for GROUP BY from X-Axis expression
                        const xBaseForGroupBy = newConfig.chartConfig.x.split(/\s+AS\s+/i)[0].trim();
                        finalQuery += ` GROUP BY ${xBaseForGroupBy}`;
                    }
                    if (newConfig.chartConfig.x) { // Always order by X-axis for charts
                         // Attempt to extract the "base" expression for ORDER BY from X-Axis expression
                         const xBaseForOrderBy = newConfig.chartConfig.x.split(/\s+AS\s+/i)[0].trim();
                         finalQuery += ` ORDER BY ${xBaseForOrderBy}`;
                    }
                } else if (table) { // Fallback for charts if no expressions are chosen
                    finalQuery = `SELECT * FROM ${table}`;
                }
                
            } else { // Non-chart types (table, stat, stat_list) use simple selectedColumns
                if (table) {
                    finalQuery = selectedColumns.length > 0 ? 
                                 `SELECT ${selectedColumns.join(', ')} FROM ${table}` : 
                                 `SELECT * FROM ${table}`;
                }
            }
        }
        
        if (finalQuery) {
            newConfig.query = finalQuery;
            delete newConfig.apiFn; // Clear apiFn as query is now custom SQL
            delete newConfig.dataKey; // Clear dataKey as result structure might change
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
                                {config.builder?.table && !config.type.includes('chart') && ( // Only show basic column checkboxes for non-chart types
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
                
                // If there's an active toggle modifier, insert it into the base query
                if (activeToggle && activeToggle.modifier) {
                    const baseQuery = config.query.replace(/;$/, ''); // Remove trailing semicolon
                    let parts = {
                        select: '',
                        from: '',
                        where: '',
                        groupBy: '',
                        orderBy: '',
                        limit: ''
                    };

                    // Simple regex-based parsing to insert WHERE clause
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
                        // Fallback if parsing fails, just append (less safe but keeps current behavior)
                        console.warn("Could not fully parse base query for modifier insertion. Appending modifier.");
                        finalQuery = `${baseQuery} ${activeToggle.modifier}`;
                    }

                    if (match) {
                        // Reconstruct query with the new WHERE clause
                        finalQuery = `SELECT ${parts.select} FROM ${parts.from}`;
                        
                        // Add existing WHERE or new modifier
                        if (parts.where) {
                            finalQuery += ` ${parts.where} AND (${activeToggle.modifier.replace(/^\s*WHERE\s*/i, '')})`; // Append with AND if existing WHERE
                        } else {
                            finalQuery += ` ${activeToggle.modifier}`; // Just add new WHERE
                        }
                        
                        finalQuery += ` ${parts.groupBy}`;
                        finalQuery += ` ${parts.orderBy}`;
                        finalQuery += ` ${parts.limit}`;
                        finalQuery = finalQuery.replace(/\s+/g, ' ').trim(); // Clean up extra spaces
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
                // The X and Y axis values are now the column names returned by the query
                // We assume the query for charts will return columns named 'x' and 'y', or the user will specify aliases in their expression
                // To support multiple series, we need to map the output column names from the data
                const yAxisExpressions = config.chartConfig.y ? config.chartConfig.y.split(',').map(s => s.trim()) : [];
                
                // Extract actual column names from the data for labels and values
                const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
                const xAxisKey = config.chartConfig.x ? (dataKeys.find(key => key.toLowerCase() === config.chartConfig.x.toLowerCase().split(' as ')[1]) || dataKeys.find(key => key.toLowerCase() === config.chartConfig.x.toLowerCase())) : dataKeys[0];

                const chartDatasets = yAxisExpressions.map((yExpr, index) => {
                    const yAxisKey = dataKeys.find(key => key.toLowerCase() === yExpr.toLowerCase().split(' as ')[1]) || dataKeys.find(key => key.toLowerCase() === yExpr.toLowerCase()); 
                    const values = data.map(d => parseFloat(d[yAxisKey]));
                    const colors = ['#8b5cf6', '#3b82f6', '#facc15', '#ef4444', '#22c55e']; // Some default colors

                    return {
                        label: yAxisKey || yExpr, // Use the alias for the label
                        data: values,
                        backgroundColor: chartType === 'bar' ? colors[index % colors.length] : `${colors[index % colors.length]}33`, // Add opacity for line fills
                        borderColor: colors[index % colors.length],
                        fill: chartType === 'line',
                        tension: 0.3
                    };
                });
                
                const labels = data.map(d => {
                    // Check if the x-axis key looks like a date/time string, and parse it
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
                        legend: { display: chartDatasets.length > 1, position: 'top', labels: { color: '#9ca3af' } }, // Show legend if multiple series
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: (labels.length > 0 && labels[0] instanceof Date && !isNaN(labels[0])) ? { // Auto-detect time series
                            type: 'time', 
                            time: { unit: 'day', tooltipFormat: 'MMM dd, yyyy' }, // Default unit, user can refine
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

    const defaultWidgets = [
        { id: 'total_convos', type: 'stat', title: 'Total Conversations', query: "SELECT COUNT(DISTINCT conversation_id) as total FROM conversation_history;", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'total_msgs', type: 'stat', title: 'Total Messages', query: "SELECT COUNT(*) as total FROM conversation_history WHERE role = 'user' OR role = 'assistant';", iconName: 'MessageSquare', iconColor: 'text-green-400', span: 1 },
        { id: 'top_models', type: 'stat_list', title: 'Top 5 Models', query: "SELECT model, COUNT(*) as count FROM conversation_history WHERE model IS NOT NULL AND model != '' GROUP BY model ORDER BY count DESC LIMIT 5;", iconName: 'BrainCircuit', iconColor: 'text-purple-400', span: 1 },
        { id: 'top_npcs', type: 'stat_list', title: 'Top 5 NPCs', query: "SELECT npc, COUNT(*) as count FROM conversation_history WHERE npc IS NOT NULL AND npc != '' GROUP BY npc ORDER BY count DESC LIMIT 5;", iconName: 'Bot', iconColor: 'text-yellow-400', span: 1 },
        { 
            id: 'activity_chart', 
            type: 'line_chart', 
            title: 'Activity Over Time', 
            query: "SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count FROM conversation_history GROUP BY strftime('%Y-%m-%d', timestamp) ORDER BY date ASC", // Base query now includes GROUP BY
            iconName: 'LineChart', 
            iconColor: 'text-blue-400', 
            chartConfig: { 
                x: "strftime('%Y-%m-%d', timestamp) as date", // Full expression with alias
                y: "COUNT(*) as count", // Full expression with alias
                type: 'line',
                groupBy: "strftime('%Y-%m-%d', timestamp)" // Explicitly set groupBy to the base expression
            }, 
            span: 2,
            toggleOptions: [
                { label: '7d', modifier: "WHERE timestamp >= date('now', '-7 days')" }, // Modifier is just the WHERE clause
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
                groupBy: "CASE WHEN LENGTH(content) BETWEEN 0 AND 50 THEN '0-50' WHEN LENGTH(content) BETWEEN 51 AND 200 THEN '51-200' WHEN LENGTH(content) BETWEEN 201 AND 500 THEN '201-500' WHEN LENGTH(content) BETWEEN 501 AND 1000 THEN '501-1000' ELSE '1000+' END" // Explicitly set groupBy
            }, 
            span: 2 
        },
    ];
    
    const [widgets, setWidgets] = useState([]);
    const [isAddDefaultWidgetModalOpen, setIsAddDefaultWidgetModalOpen] = useState(false);
    const [isAddCustomWidgetModalOpen, setIsAddCustomWidgetModalOpen] = useState(false);
    const [customWidgetContext, setCustomWidgetContext] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, widgetId: null });
    const [isEditWidgetModalOpen, setIsEditWidgetModalOpen] = useState(false);
    const [widgetToEdit, setWidgetToEdit] = useState(null);

    const [tableSchemaCache, setTableSchemaCache] = useState({});
    
    // Original states for SQL panel and KG are all preserved
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

    // --- ADD THESE LINES RIGHT AFTER ---
    const [kgViewMode, setKgViewMode] = useState('full'); // 'full', 'cooccurrence'
    const [kgNodeFilter, setKgNodeFilter] = useState('all'); // 'all', 'high-degree'
    const [networkStats, setNetworkStats] = useState(null);
    const [cooccurrenceData, setCooccurrenceData] = useState(null);
    const [centralityData, setCentralityData] = useState(null);


    useEffect(() => { const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); }; if (isOpen) document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }, [isOpen, onClose]);


    useEffect(() => {

        if (isOpen) {

            fetchKgData(currentKgGeneration);
        }
    }, [isOpen, currentKgGeneration]); // Re-run only when isOpen changes or the generation slider value changes.
    const saveWidgets = (newWidgets) => { setWidgets(newWidgets); localStorage.setItem('dataDashWidgets', JSON.stringify(newWidgets)); };
    const handleAddWidget = (widgetConfig) => saveWidgets([...widgets, widgetConfig]);
    const handleRemoveWidget = (idToRemove) => saveWidgets(widgets.filter(w => w.id !== idToRemove));
    
    // Handler for saving changes from the EditWidgetModal
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
                // Check if tables are loaded. If not, load them before opening the modal.
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

    // --- RESTORED: fetchTables hook for SQL Schema ---
    useEffect(() => {
        const fetchTables = async () => {
            if (isQueryPanelOpen && dbTables.length === 0) { // Condition: panel open AND no tables loaded yet
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
    }, [isQueryPanelOpen, dbTables.length]); // Dependencies: panel state, tables array length

    // --- ORIGINAL KG FETCH HOOK ---
    const fetchKgData = useCallback(async (generation) => {
        setKgLoading(true); setKgError(null);
        // Use the passed generation, fallback to current state, finally to null for initial load
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
            // If this is the very first load, set the generation to the latest one
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
    }, [currentKgGeneration]); // Depend on currentKgGeneration to have the correct fallback

    useEffect(() => { if (isOpen) { fetchKgData(); } }, [isOpen, fetchKgData]);

    // --- ORIGINAL SQL EXECUTION HOOKS AND HANDLERS ---
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
    
    const handleViewSchema = async (tableName) => {
        if (selectedTable === tableName) { setSelectedTable(null); setTableSchema(null); return; }
        setSelectedTable(tableName); setLoadingSchema(true); setTableSchema(null);
        try {
            const res = await window.api.getTableSchema({ tableName });
            if (res.error) throw new Error(res.error);
            setTableSchema(res.schema);
        } catch (err) { setQueryError(`Could not load schema for ${tableName}.`); } finally { setLoadingSchema(false); }
    };

    const handleHistoryAction = (index, action) => {
        const updatedHistory = [...queryHistory]; const item = updatedHistory[index];
        if (action === 'run') setSqlQuery(item.query);
        else if (action === 'copy') navigator.clipboard.writeText(item.query);
        else if (action === 'favorite') { item.favorited = !item.favorited; updatedHistory.splice(index, 1); updatedHistory.unshift(item); }
        else if (action === 'delete') updatedHistory.splice(index, 1);
        setQueryHistory(updatedHistory); localStorage.setItem('dataDashQueryHistory', JSON.stringify(updatedHistory));
    };
        const processedGraphData = React.useMemo(() => {
        let sourceNodes = [];
        let sourceLinks = [];

        if (kgViewMode === 'cooccurrence' && cooccurrenceData) {
            sourceNodes = cooccurrenceData.nodes || [];
            sourceLinks = cooccurrenceData.links || [];
        } else if (kgData && kgData.nodes) { // 'full' view
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
                // The actual rollback happens in the main process
                await window.api.kg_rollback({ generation: targetGen });
                // We just need to update the state. The useEffect above will automatically
                // trigger a full data refetch for the new target generation.
                setCurrentKgGeneration(targetGen); 
            } catch (err) {
                setKgError(err.message);
                setKgLoading(false);
            }
        }
    };

    
    if (!isOpen) return null;
    
        // Filter out any null/undefined widgets to prevent rendering errors
        const filteredWidgets = widgets.filter(widget => widget && widget.id);
        const availableWidgetsToAdd = defaultWidgets.filter(dw => !filteredWidgets.some(w => w.id === dw.id));

    return (
        <div> 
            <AddDefaultWidgetModal isOpen={isAddDefaultWidgetModalOpen} onClose={() => setIsAddDefaultWidgetModalOpen(false)} availableWidgets={availableWidgetsToAdd} onAddWidget={handleAddWidget} />
            <AddCustomWidgetModal isOpen={isAddCustomWidgetModalOpen} onClose={() => setIsAddCustomWidgetModalOpen(false)} context={customWidgetContext} onAddWidget={handleAddWidget} />
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
                                    <button onClick={() => setIsAddDefaultWidgetModalOpen(true)} className="theme-button text-sm flex flex-col items-center gap-2"><Plus size={16}/> Add Widget</button>
                                </div>
                             </div>
                        </section>
                        
                        {/* Original SQL Query Panel - Preserved as is */}
                        <section id="sql-query-panel" className="border theme-border rounded-lg">
                            <button onClick={() => setIsQueryPanelOpen(!isQueryPanelOpen)} className="w-full p-4 flex justify-between items-center theme-hover"><h4 className="text-lg font-semibold flex items-center gap-3"><Database className="text-purple-400"/>Direct Database Query</h4>{isQueryPanelOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</button>
                            {isQueryPanelOpen && (
                                <div className="p-4 border-t theme-border">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                        <div className="border theme-border rounded-lg p-3 flex flex-col"><h5 className="font-semibold mb-2 flex items-center gap-2"><Table size={16}/> Database Schema</h5><div className="grid grid-cols-2 gap-3 flex-1"><div className="space-y-1 max-h-48 overflow-y-auto pr-2">{dbTables.length > 0 ? dbTables.map(name => (<button key={name} onClick={() => handleViewSchema(name)} className={`w-full text-left px-2 py-1 rounded text-sm ${selectedTable === name ? 'theme-button-primary' : 'theme-hover'}`}>{name}</button>)) : <p className="text-sm theme-text-secondary">No tables found.</p>}</div><div className="max-h-48 overflow-y-auto">{loadingSchema ? <div className="flex items-center justify-center h-full"><Loader className="animate-spin" /></div> : tableSchema ? <ul className="text-sm font-mono space-y-1">{tableSchema.map(col => <li key={col.name}>- {col.name}: <span className="text-yellow-400">{col.type}</span></li>)}</ul> : <p className="text-sm theme-text-secondary">Select a table.</p> }</div></div></div>
                                        <div className="border theme-border rounded-lg p-3 flex flex-col"><div className="flex border-b theme-border mb-2 items-center justify-between"><h5 className="font-semibold flex items-center gap-2">Query History</h5></div><ul className="space-y-1 max-h-48 overflow-y-auto text-sm font-mono flex-1">{queryHistory.map((h, i) => (<li key={i} className="flex items-center justify-between group p-1 rounded hover:theme-bg-tertiary"><span onClick={() => handleHistoryAction(i, 'run')} className="truncate cursor-pointer flex-1 pr-2" title={h.query}>{h.query}</span><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleHistoryAction(i, 'run')} title="Run"><Play size={14}/></button><button onClick={() => handleHistoryAction(i, 'copy')} title="Copy"><Copy size={14}/></button><button onClick={() => handleHistoryAction(i, 'favorite')} title="Favorite"><Star size={14} className={h.favorited ? 'fill-yellow-400 text-yellow-400' : ''}/></button><button onClick={() => handleHistoryAction(i, 'delete')} title="Delete"><Trash2 size={14} className="text-red-400"/></button></div></li>))}</ul></div>
                                    </div>
                                    <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)} rows={5} className="w-full p-2 theme-input font-mono text-sm" placeholder="Enter your SQL query here..." />
                                    <div className="flex justify-end mt-2"><button onClick={handleExecuteQuery} disabled={loadingQuery} className="px-4 py-2 theme-button-primary rounded text-sm disabled:opacity-50">{loadingQuery ? 'Executing...' : 'Execute Query'}</button></div>
                                    {loadingQuery && <div className="flex justify-center p-4"><Loader className="animate-spin"/></div>}
                                    {queryError && <div className="text-red-400 p-3 mt-2 rounded theme-bg-tertiary">{queryError}</div>}
                                    {queryResult && (queryResult.length > 0 && 
                                        <div className="mt-4"><div className="flex justify-between items-center"><h5 className="font-semibold">Query Results</h5><div className="flex items-center gap-2"><button onClick={() => { setCustomWidgetContext({ query: sqlQuery, result: queryResult }); setIsAddCustomWidgetModalOpen(true); }} className="px-3 py-1 text-xs theme-button-primary rounded flex items-center gap-2"><Plus size={14} /> Add to Dashboard</button><button disabled={!queryResult || queryResult.length === 0} className="px-3 py-1 text-xs theme-button rounded flex items-center gap-2 disabled:opacity-50"><Download size={14} /> Export to CSV</button></div></div><div className="mt-2 overflow-x-auto theme-border border rounded-lg max-h-96"><table className="w-full text-sm text-left"><thead className="theme-bg-tertiary sticky top-0"><tr>{Object.keys(queryResult[0]).map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead><tbody className="theme-bg-primary divide-y theme-divide">{queryResult.map((row, rIndex) => (<tr key={rIndex}>{Object.keys(row).map(key => <td key={key} className="p-2 font-mono truncate max-w-xs">{String(row[key])}</td>)}</tr>))}</tbody></table></div></div>
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