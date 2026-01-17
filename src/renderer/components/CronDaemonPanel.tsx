import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Trash2, Settings, Edit2, X, Clock, Play, Pause, RotateCcw,
    RefreshCw, Calendar, Terminal, Check, AlertCircle, ChevronDown,
    ChevronRight, Save, Copy, Eye, EyeOff, Zap, Server, FileText,
    Code, Hash, Bot, Sparkles, TestTube, FolderCode, FileCode, Database,
    Wrench, Table, Layers
} from 'lucide-react';

interface CronJob {
    id: string;
    schedule: string;
    command: string;
    commandType: 'bash' | 'python' | 'npc' | 'sql-model' | 'custom';
    npc?: string;
    jinx?: string;
    sqlModelId?: string;
    sqlModelName?: string;
    targetDb?: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    description?: string;
    isExample?: boolean;
}

interface Daemon {
    id: string;
    name: string;
    command: string;
    commandType: 'bash' | 'python' | 'npc' | 'custom';
    npc?: string;
    jinx?: string;
    status: 'running' | 'stopped' | 'error';
    pid?: number;
    uptime?: string;
    restarts?: number;
    isExample?: boolean;
}

interface SystemCronJob {
    schedule: string;
    command: string;
    user?: string;
}

interface SqlModel {
    id: string;
    name: string;
    description?: string;
    sql: string;
    schedule?: string;
    materialization: 'view' | 'table' | 'incremental';
    npc?: string;
    jinx?: string;
    lastRunAt?: string;
    filePath?: string;
}

// NQL Functions reference
const NQL_FUNCTIONS = [
    { name: 'get_llm_response', category: 'llm', description: 'Get LLM response for text', color: 'text-blue-400' },
    { name: 'extract_facts', category: 'llm', description: 'Extract facts from text', color: 'text-blue-400' },
    { name: 'get_facts', category: 'llm', description: 'Get stored facts', color: 'text-blue-400' },
    { name: 'synthesize', category: 'analysis', description: 'Synthesize information', color: 'text-green-400' },
    { name: 'criticize', category: 'analysis', description: 'Critical analysis', color: 'text-green-400' },
    { name: 'harmonize', category: 'analysis', description: 'Harmonize perspectives', color: 'text-green-400' },
    { name: 'breathe', category: 'workflow', description: 'Async NPC breathing', color: 'text-purple-400' },
    { name: 'orchestrate', category: 'workflow', description: 'Multi-NPC orchestration', color: 'text-purple-400' },
    { name: 'identify_groups', category: 'clustering', description: 'Identify groups in data', color: 'text-orange-400' },
    { name: 'generate_groups', category: 'clustering', description: 'Generate group labels', color: 'text-orange-400' },
    { name: 'bootstrap', category: 'sampling', description: 'Bootstrap sampling', color: 'text-cyan-400' },
    { name: 'zoom_in', category: 'sampling', description: 'Zoom into detail', color: 'text-cyan-400' },
];

// Schedule presets
const SCHEDULE_PRESETS = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every 15 minutes', value: '*/15 * * * *' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Every 12 hours', value: '0 */12 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Daily at 9am', value: '0 9 * * *' },
    { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
    { label: 'Monthly (1st)', value: '0 0 1 * *' },
];

// Example cron jobs - disabled by default
const EXAMPLE_CRON_JOBS: CronJob[] = [
    {
        id: 'example-backup',
        schedule: '0 2 * * *',
        command: 'tar -czf ~/backups/project-$(date +%Y%m%d).tar.gz ~/projects/myapp',
        commandType: 'bash',
        enabled: false,
        description: 'Daily backup at 2am - compresses project folder',
        isExample: true
    },
    {
        id: 'example-cleanup',
        schedule: '0 3 * * 0',
        command: 'find /tmp -type f -mtime +7 -delete',
        commandType: 'bash',
        enabled: false,
        description: 'Weekly cleanup - removes temp files older than 7 days',
        isExample: true
    },
    {
        id: 'example-python-report',
        schedule: '0 8 * * 1-5',
        command: 'python3 ~/scripts/daily_report.py --email user@example.com',
        commandType: 'python',
        enabled: false,
        description: 'Weekday morning report - runs Python script at 8am',
        isExample: true
    },
    {
        id: 'example-npc-digest',
        schedule: '0 18 * * *',
        command: '/digest --summarize-day',
        commandType: 'npc',
        npc: 'simon',
        enabled: false,
        description: 'NPC daily digest - AI summarizes the day at 6pm',
        isExample: true
    },
    {
        id: 'example-npc-check',
        schedule: '*/30 * * * *',
        command: '/check "Are there any critical issues in the logs?"',
        commandType: 'npc',
        npc: 'simon',
        enabled: false,
        description: 'NPC log monitor - AI checks logs every 30 minutes',
        isExample: true
    },
    {
        id: 'example-health-check',
        schedule: '*/5 * * * *',
        command: 'curl -sf http://localhost:3000/health || echo "Service down!" | mail -s "Alert" admin@example.com',
        commandType: 'bash',
        enabled: false,
        description: 'Health check - pings service every 5 minutes',
        isExample: true
    },
    {
        id: 'example-sql-model-daily',
        schedule: '0 1 * * *',
        command: 'run:daily_facts',
        commandType: 'sql-model',
        sqlModelId: 'daily_facts',
        sqlModelName: 'daily_facts',
        targetDb: '~/npcsh_history.db',
        enabled: false,
        description: 'SQL Model - Run daily_facts model at 1am to extract facts',
        isExample: true
    },
    {
        id: 'example-sql-model-weekly',
        schedule: '0 2 * * 0',
        command: 'run:knowledge_base',
        commandType: 'sql-model',
        sqlModelId: 'knowledge_base',
        sqlModelName: 'knowledge_base',
        targetDb: '~/npcsh_history.db',
        enabled: false,
        description: 'SQL Model - Weekly knowledge synthesis on Sundays',
        isExample: true
    },
];

// Example daemons - disabled by default
const EXAMPLE_DAEMONS: Daemon[] = [
    {
        id: 'example-watcher',
        name: 'file-watcher',
        command: 'fswatch -o ~/projects | xargs -n1 -I{} echo "File changed"',
        commandType: 'bash',
        status: 'stopped',
        enabled: false,
        isExample: true
    },
    {
        id: 'example-server',
        name: 'dev-server',
        command: 'python3 -m http.server 8080 --directory ~/public',
        commandType: 'python',
        status: 'stopped',
        enabled: false,
        isExample: true
    },
    {
        id: 'example-npc-breathe',
        name: 'npc-breathe',
        command: '/breathe --interval 300',
        commandType: 'npc',
        npc: 'simon',
        status: 'stopped',
        enabled: false,
        isExample: true
    },
];

// Example SQL Models - templates for NQL/npcsql
const EXAMPLE_SQL_MODELS: SqlModel[] = [
    {
        id: 'example-conversation-summary',
        name: 'conversation_summaries',
        description: 'AI-powered conversation summarization using NPC',
        sql: `-- npcsql model: Summarize conversations with AI
{{ config(materialized='table') }}

SELECT
    id,
    user_input,
    nql.get_llm_response(
        CONCAT('Summarize this conversation: ', user_input),
        'sibiji'
    ) as summary,
    nql.extract_facts(user_input, 'sibiji') as facts,
    created_at
FROM {{ ref('conversation_history') }}
WHERE created_at >= DATE('now', '-7 days')
LIMIT 100`,
        materialization: 'table',
        npc: 'sibiji'
    },
    {
        id: 'example-fact-extraction',
        name: 'daily_facts',
        description: 'Extract and store facts from daily interactions',
        sql: `-- npcsql model: Extract facts from conversations
{{ config(materialized='incremental') }}

SELECT
    DATE(created_at) as fact_date,
    nql.extract_facts(
        GROUP_CONCAT(user_input, ' '),
        'sibiji'
    ) as daily_facts,
    COUNT(*) as interaction_count
FROM {{ ref('conversation_history') }}
{% if is_incremental() %}
WHERE created_at > (SELECT MAX(fact_date) FROM {{ this }})
{% endif %}
GROUP BY DATE(created_at)`,
        materialization: 'incremental',
        schedule: '0 0 * * *',
        npc: 'sibiji'
    },
    {
        id: 'example-sentiment-analysis',
        name: 'sentiment_analysis',
        description: 'Analyze sentiment of user messages',
        sql: `-- npcsql model: Sentiment analysis
{{ config(materialized='view') }}

SELECT
    id,
    user_input,
    nql.get_llm_response(
        CONCAT('Rate the sentiment of this text from -1 (negative) to 1 (positive), return only the number: ', user_input),
        'sibiji'
    ) as sentiment_score,
    nql.get_llm_response(
        CONCAT('What emotion is expressed here? One word: ', user_input),
        'sibiji'
    ) as emotion,
    created_at
FROM {{ ref('conversation_history') }}`,
        materialization: 'view',
        npc: 'sibiji'
    },
    {
        id: 'example-topic-clustering',
        name: 'topic_clusters',
        description: 'Group conversations by topic using AI clustering',
        sql: `-- npcsql model: Topic clustering
{{ config(materialized='table') }}

SELECT
    id,
    user_input,
    nql.identify_groups(user_input, 'sibiji', 5) as topic_id,
    nql.generate_groups(
        user_input,
        'sibiji',
        'Generate a short topic label for this text'
    ) as topic_label
FROM {{ ref('conversation_history') }}
WHERE LENGTH(user_input) > 50`,
        materialization: 'table',
        npc: 'sibiji'
    },
    {
        id: 'example-knowledge-synthesis',
        name: 'knowledge_base',
        description: 'Synthesize knowledge from multiple sources',
        sql: `-- npcsql model: Knowledge synthesis
{{ config(materialized='table') }}

WITH facts AS (
    SELECT * FROM {{ ref('daily_facts') }}
),
summaries AS (
    SELECT * FROM {{ ref('conversation_summaries') }}
)

SELECT
    DATE('now') as synthesis_date,
    nql.synthesize(
        GROUP_CONCAT(f.daily_facts, '\\n'),
        'sibiji',
        'Create a unified knowledge summary from these facts'
    ) as synthesized_knowledge,
    nql.harmonize(
        GROUP_CONCAT(s.summary, '\\n'),
        'sibiji'
    ) as harmonized_view
FROM facts f, summaries s
WHERE f.fact_date >= DATE('now', '-30 days')`,
        materialization: 'table',
        schedule: '0 0 * * 0',
        npc: 'sibiji'
    },
];

const CronDaemonPanel = ({
    isOpen = true,
    onClose,
    currentPath,
    npcList = [],
    jinxList = [],
    isPane = false,
    isGlobal = false
}) => {
    // State
    const [activeTab, setActiveTab] = useState<'cron' | 'daemons' | 'models' | 'examples' | 'system'>('cron');
    const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
    const [daemons, setDaemons] = useState<Daemon[]>([]);
    const [systemCron, setSystemCron] = useState<SystemCronJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [testOutput, setTestOutput] = useState<string | null>(null);
    const [testRunning, setTestRunning] = useState(false);

    // SQL Models state
    const [sqlModels, setSqlModels] = useState<SqlModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<SqlModel | null>(null);
    const [isEditingModel, setIsEditingModel] = useState(false);
    const [modelName, setModelName] = useState('');
    const [modelDescription, setModelDescription] = useState('');
    const [modelSql, setModelSql] = useState('');
    const [modelSchedule, setModelSchedule] = useState('');
    const [modelMaterialization, setModelMaterialization] = useState<'view' | 'table' | 'incremental'>('table');
    const [modelNpc, setModelNpc] = useState('');
    const [selectedDatabase, setSelectedDatabase] = useState<string>('~/npcsh_history.db');
    const [availableDatabases, setAvailableDatabases] = useState<{ name: string; path: string }[]>([
        { name: 'Global History (npcsh_history.db)', path: '~/npcsh_history.db' }
    ]);
    const [modelRunResult, setModelRunResult] = useState<any>(null);

    // Edit states
    const [editingCronId, setEditingCronId] = useState<string | null>(null);
    const [editingDaemonId, setEditingDaemonId] = useState<string | null>(null);
    const [editedCron, setEditedCron] = useState<CronJob | null>(null);

    // New job form
    const [showAddCron, setShowAddCron] = useState(false);
    const [showAddDaemon, setShowAddDaemon] = useState(false);
    const [newCron, setNewCron] = useState({
        schedule: '* * * * *',
        command: '',
        commandType: 'bash' as 'bash' | 'python' | 'npc' | 'sql-model' | 'custom',
        npc: '',
        jinx: '',
        sqlModelId: '',
        sqlModelName: '',
        targetDb: '~/npcsh_history.db',
        description: ''
    });
    const [newDaemon, setNewDaemon] = useState({
        name: '',
        command: '',
        commandType: 'bash' as 'bash' | 'python' | 'npc' | 'custom',
        npc: '',
        jinx: ''
    });

    // Available SQL Models for scheduling
    const [availableSqlModels, setAvailableSqlModels] = useState<SqlModel[]>([]);

    // Logs
    const [showLogs, setShowLogs] = useState<string | null>(null);
    const [logs, setLogs] = useState<string>('');

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!currentPath) return;
        setLoading(true);
        setError(null);
        try {
            const response = await (window as any).api?.getCronDaemons?.(currentPath);
            if (response?.error) {
                throw new Error(response.error);
            }
            setCronJobs(response?.cronJobs || []);
            setDaemons(response?.daemons || []);

            try {
                const sysResponse = await (window as any).api?.getSystemCrontab?.();
                setSystemCron(sysResponse?.jobs || []);
            } catch {
                // System crontab not available
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch cron jobs and daemons');
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    // Fetch SQL models for scheduling
    const fetchSqlModels = useCallback(async () => {
        try {
            // Fetch both global and project models
            const globalRes = await (window as any).api?.getSqlModelsGlobal?.();
            const projectRes = currentPath ? await (window as any).api?.getSqlModelsProject?.(currentPath) : null;

            const models: SqlModel[] = [];
            if (globalRes?.models) {
                models.push(...globalRes.models.map((m: any) => ({ ...m, isGlobal: true })));
            }
            if (projectRes?.models) {
                models.push(...projectRes.models.map((m: any) => ({ ...m, isGlobal: false })));
            }
            setAvailableSqlModels(models);
        } catch (err) {
            console.error('Failed to fetch SQL models:', err);
        }
    }, [currentPath]);

    useEffect(() => {
        if (isOpen && currentPath) {
            fetchData();
            fetchSqlModels();
        }
    }, [isOpen, currentPath, fetchData, fetchSqlModels]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isPane) onClose?.();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose, isPane]);

    // Test command
    const handleTestCommand = async (command: string, commandType: string) => {
        setTestRunning(true);
        setTestOutput('Running...');
        try {
            const res = await (window as any).api?.testCommand?.({ command, commandType, path: currentPath });
            setTestOutput(res?.output || res?.error || 'No output');
        } catch (err: any) {
            setTestOutput(`Error: ${err.message}`);
        } finally {
            setTestRunning(false);
        }
    };

    // Cron job actions
    const handleAddCronJob = async () => {
        if (!newCron.command.trim()) return;
        setLoading(true);
        try {
            const res = await (window as any).api?.addCronJob?.({
                path: currentPath,
                schedule: newCron.schedule,
                command: newCron.command,
                commandType: newCron.commandType,
                npc: newCron.commandType === 'npc' ? newCron.npc : undefined,
                jinx: newCron.jinx,
                description: newCron.description
            });
            if (res?.error) throw new Error(res.error);
            await fetchData();
            setNewCron({ schedule: '* * * * *', command: '', commandType: 'bash', npc: '', jinx: '', description: '' });
            setShowAddCron(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCronJob = async (job: CronJob) => {
        setLoading(true);
        try {
            const res = await (window as any).api?.updateCronJob?.(job);
            if (res?.error) throw new Error(res.error);
            await fetchData();
            setEditingCronId(null);
            setEditedCron(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCronJob = async (job: CronJob) => {
        await handleUpdateCronJob({ ...job, enabled: !job.enabled });
    };

    const handleRemoveCronJob = async (jobId: string) => {
        if (!window.confirm('Remove this cron job?')) return;
        setLoading(true);
        try {
            const res = await (window as any).api?.removeCronJob?.(jobId);
            if (res?.error) throw new Error(res.error);
            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Copy example to real jobs
    const handleCopyExample = async (example: CronJob | Daemon, type: 'cron' | 'daemon') => {
        if (type === 'cron') {
            const ex = example as CronJob;
            setNewCron({
                schedule: ex.schedule,
                command: ex.command,
                commandType: ex.commandType,
                npc: ex.npc || '',
                jinx: ex.jinx || '',
                description: ex.description || ''
            });
            setActiveTab('cron');
            setShowAddCron(true);
        } else {
            const ex = example as Daemon;
            setNewDaemon({
                name: ex.name,
                command: ex.command,
                commandType: ex.commandType,
                npc: ex.npc || '',
                jinx: ex.jinx || ''
            });
            setActiveTab('daemons');
            setShowAddDaemon(true);
        }
    };

    // Daemon actions
    const handleAddDaemon = async () => {
        if (!newDaemon.name.trim() || !newDaemon.command.trim()) return;
        setLoading(true);
        try {
            const res = await (window as any).api?.addDaemon?.({
                path: currentPath,
                name: newDaemon.name,
                command: newDaemon.command,
                commandType: newDaemon.commandType,
                npc: newDaemon.commandType === 'npc' ? newDaemon.npc : undefined,
                jinx: newDaemon.jinx
            });
            if (res?.error) throw new Error(res.error);
            await fetchData();
            setNewDaemon({ name: '', command: '', commandType: 'bash', npc: '', jinx: '' });
            setShowAddDaemon(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDaemonAction = async (daemonId: string, action: 'start' | 'stop' | 'restart') => {
        setLoading(true);
        try {
            const res = await (window as any).api?.controlDaemon?.({ id: daemonId, action });
            if (res?.error) throw new Error(res.error);
            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveDaemon = async (daemonId: string) => {
        if (!window.confirm('Remove this daemon?')) return;
        setLoading(true);
        try {
            const res = await (window as any).api?.removeDaemon?.(daemonId);
            if (res?.error) throw new Error(res.error);
            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewLogs = async (daemonId: string) => {
        try {
            const res = await (window as any).api?.getDaemonLogs?.(daemonId);
            setLogs(res?.logs || 'No logs available');
            setShowLogs(daemonId);
        } catch {
            setLogs('Failed to fetch logs');
            setShowLogs(daemonId);
        }
    };

    // Parse cron schedule to human readable
    const parseCronSchedule = (schedule: string): string => {
        const preset = SCHEDULE_PRESETS.find(p => p.value === schedule);
        if (preset) return preset.label;
        return schedule;
    };

    // Get command type icon
    const getCommandTypeIcon = (type: string) => {
        switch (type) {
            case 'bash': return <Terminal size={12} className="text-green-400" />;
            case 'python': return <FileCode size={12} className="text-yellow-400" />;
            case 'npc': return <Bot size={12} className="text-purple-400" />;
            case 'sql-model': return <Database size={12} className="text-cyan-400" />;
            default: return <Code size={12} className="text-gray-400" />;
        }
    };

    // Filter items
    const filteredCronJobs = cronJobs.filter(job =>
        job.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDaemons = daemons.filter(daemon =>
        daemon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        daemon.command.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen && !isPane) return null;

    const content = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b theme-border flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Clock size={20} className="text-blue-400" />
                    <h2 className="text-lg font-semibold">Scheduler & Daemons</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {!isPane && onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b theme-border flex-shrink-0 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('cron')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'cron'
                            ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Calendar size={16} />
                    Cron ({cronJobs.length})
                </button>
                <button
                    onClick={() => setActiveTab('daemons')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'daemons'
                            ? 'border-b-2 border-purple-500 text-purple-400 bg-purple-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Server size={16} />
                    Daemons ({daemons.length})
                </button>
                <button
                    onClick={() => setActiveTab('models')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'models'
                            ? 'border-b-2 border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Table size={16} />
                    SQL Models ({sqlModels.length})
                </button>
                <button
                    onClick={() => setActiveTab('examples')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'examples'
                            ? 'border-b-2 border-amber-500 text-amber-400 bg-amber-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Sparkles size={16} />
                    Examples
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                        activeTab === 'system'
                            ? 'border-b-2 border-gray-500 text-gray-300 bg-gray-500/10'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Terminal size={16} />
                    System
                </button>
            </div>

            {/* Search & Add */}
            <div className="p-3 border-b theme-border flex-shrink-0">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-3 pr-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    {activeTab === 'cron' && (
                        <button
                            onClick={() => setShowAddCron(!showAddCron)}
                            className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 ${
                                showAddCron ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                            }`}
                        >
                            <Plus size={16} /> Add Job
                        </button>
                    )}
                    {activeTab === 'daemons' && (
                        <button
                            onClick={() => setShowAddDaemon(!showAddDaemon)}
                            className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 ${
                                showAddDaemon ? 'bg-purple-600 text-white' : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                            }`}
                        >
                            <Plus size={16} /> Add Daemon
                        </button>
                    )}
                    {activeTab === 'models' && (
                        <button
                            onClick={() => setIsEditingModel(!isEditingModel)}
                            className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 ${
                                isEditingModel ? 'bg-emerald-600 text-white' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                            }`}
                        >
                            <Plus size={16} /> New Model
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Add Cron Form */}
                {activeTab === 'cron' && showAddCron && (
                    <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                            <Plus size={16} /> New Scheduled Job
                        </h3>
                        <div className="space-y-3">
                            {/* Command Type */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Command Type</label>
                                <div className="flex gap-2">
                                    {(['bash', 'python', 'npc', 'custom'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNewCron({ ...newCron, commandType: type })}
                                            className={`flex-1 px-3 py-2 text-xs rounded flex items-center justify-center gap-1 ${
                                                newCron.commandType === type
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {getCommandTypeIcon(type)}
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Schedule */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Schedule</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCron.schedule}
                                        onChange={(e) => setNewCron({ ...newCron, schedule: e.target.value })}
                                        placeholder="* * * * *"
                                        className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded font-mono focus:border-blue-500 focus:outline-none"
                                    />
                                    <select
                                        onChange={(e) => e.target.value && setNewCron({ ...newCron, schedule: e.target.value })}
                                        className="px-2 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                                        value=""
                                    >
                                        <option value="">Presets...</option>
                                        {SCHEDULE_PRESETS.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    min hour day month weekday (e.g., "0 9 * * 1-5" = 9am weekdays)
                                </div>
                            </div>
                            {/* Command */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Command</label>
                                <div className="flex gap-2">
                                    <textarea
                                        value={newCron.command}
                                        onChange={(e) => setNewCron({ ...newCron, command: e.target.value })}
                                        placeholder={
                                            newCron.commandType === 'bash' ? 'echo "Hello" >> ~/log.txt' :
                                            newCron.commandType === 'python' ? 'python3 ~/scripts/myscript.py --arg value' :
                                            newCron.commandType === 'npc' ? '/sample "generate a daily report"' :
                                            'your command here'
                                        }
                                        className="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded font-mono focus:border-blue-500 focus:outline-none resize-none"
                                        rows={2}
                                    />
                                    <button
                                        onClick={() => handleTestCommand(newCron.command, newCron.commandType)}
                                        disabled={!newCron.command.trim() || testRunning}
                                        className="px-3 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded flex items-center gap-1 text-xs disabled:opacity-50"
                                        title="Test command"
                                    >
                                        <TestTube size={14} />
                                        Test
                                    </button>
                                </div>
                            </div>
                            {/* Test Output */}
                            {testOutput && (
                                <div className="p-2 bg-black/30 rounded text-xs font-mono max-h-24 overflow-auto">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-500">Output:</span>
                                        <button onClick={() => setTestOutput(null)} className="text-gray-500 hover:text-white">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <pre className="text-gray-300 whitespace-pre-wrap">{testOutput}</pre>
                                </div>
                            )}
                            {/* NPC (only for npc type) */}
                            {newCron.commandType === 'npc' && (
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">NPC</label>
                                    <select
                                        value={newCron.npc}
                                        onChange={(e) => setNewCron({ ...newCron, npc: e.target.value })}
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select NPC...</option>
                                        {npcList.map((npc: any) => (
                                            <option key={npc.name} value={npc.name}>{npc.display_name || npc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/* Description */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                                <input
                                    type="text"
                                    value={newCron.description}
                                    onChange={(e) => setNewCron({ ...newCron, description: e.target.value })}
                                    placeholder="What does this job do?"
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleAddCronJob}
                                    disabled={loading || !newCron.command.trim()}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Create Job
                                </button>
                                <button
                                    onClick={() => { setShowAddCron(false); setTestOutput(null); }}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Daemon Form */}
                {activeTab === 'daemons' && showAddDaemon && (
                    <div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                        <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                            <Plus size={16} /> New Daemon
                        </h3>
                        <div className="space-y-3">
                            {/* Command Type */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Command Type</label>
                                <div className="flex gap-2">
                                    {(['bash', 'python', 'npc', 'custom'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setNewDaemon({ ...newDaemon, commandType: type })}
                                            className={`flex-1 px-3 py-2 text-xs rounded flex items-center justify-center gap-1 ${
                                                newDaemon.commandType === type
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {getCommandTypeIcon(type)}
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Name */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Name</label>
                                <input
                                    type="text"
                                    value={newDaemon.name}
                                    onChange={(e) => setNewDaemon({ ...newDaemon, name: e.target.value })}
                                    placeholder="my-daemon"
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            {/* Command */}
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Command</label>
                                <textarea
                                    value={newDaemon.command}
                                    onChange={(e) => setNewDaemon({ ...newDaemon, command: e.target.value })}
                                    placeholder={
                                        newDaemon.commandType === 'bash' ? 'tail -f /var/log/syslog' :
                                        newDaemon.commandType === 'python' ? 'python3 ~/scripts/server.py' :
                                        newDaemon.commandType === 'npc' ? '/breathe --interval 300' :
                                        'your long-running command'
                                    }
                                    className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded font-mono focus:border-purple-500 focus:outline-none resize-none"
                                    rows={2}
                                />
                            </div>
                            {/* NPC (only for npc type) */}
                            {newDaemon.commandType === 'npc' && (
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">NPC</label>
                                    <select
                                        value={newDaemon.npc}
                                        onChange={(e) => setNewDaemon({ ...newDaemon, npc: e.target.value })}
                                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="">Select NPC...</option>
                                        {npcList.map((npc: any) => (
                                            <option key={npc.name} value={npc.name}>{npc.display_name || npc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleAddDaemon}
                                    disabled={loading || !newDaemon.name.trim() || !newDaemon.command.trim()}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Create Daemon
                                </button>
                                <button
                                    onClick={() => setShowAddDaemon(false)}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cron Jobs List */}
                {activeTab === 'cron' && (
                    <div className="space-y-2">
                        {loading && cronJobs.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                Loading...
                            </div>
                        )}
                        {!loading && filteredCronJobs.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No scheduled jobs</p>
                                <p className="text-xs mt-2">Check the Examples tab for templates to get started</p>
                            </div>
                        )}
                        {filteredCronJobs.map((job) => (
                            <div
                                key={job.id}
                                className={`p-3 rounded-lg border transition-colors ${
                                    job.enabled
                                        ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50'
                                        : 'bg-gray-900/50 border-gray-800 opacity-60'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {getCommandTypeIcon(job.commandType)}
                                            <code className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded font-mono">
                                                {job.schedule}
                                            </code>
                                            <span className="text-[10px] text-gray-500">
                                                {parseCronSchedule(job.schedule)}
                                            </span>
                                            {!job.enabled && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm font-mono truncate" title={job.command}>
                                            {job.command}
                                        </div>
                                        {job.description && (
                                            <div className="text-xs text-gray-500 mt-1">{job.description}</div>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
                                            {job.npc && <span className="flex items-center gap-1"><Bot size={10} /> {job.npc}</span>}
                                            {job.lastRun && <span>Last: {job.lastRun}</span>}
                                            {job.nextRun && <span>Next: {job.nextRun}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleToggleCronJob(job)}
                                            className={`p-1.5 rounded transition-colors ${
                                                job.enabled
                                                    ? 'text-green-400 hover:bg-green-500/20'
                                                    : 'text-gray-500 hover:bg-gray-700'
                                            }`}
                                            title={job.enabled ? 'Disable' : 'Enable'}
                                        >
                                            {job.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveCronJob(job.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Daemons List */}
                {activeTab === 'daemons' && (
                    <div className="space-y-2">
                        {loading && daemons.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                                Loading...
                            </div>
                        )}
                        {!loading && filteredDaemons.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Server size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No daemons</p>
                                <p className="text-xs mt-2">Check the Examples tab for templates to get started</p>
                            </div>
                        )}
                        {filteredDaemons.map((daemon) => (
                            <div
                                key={daemon.id}
                                className={`p-3 rounded-lg border transition-colors ${
                                    daemon.status === 'running'
                                        ? 'bg-green-900/10 border-green-500/30'
                                        : daemon.status === 'error'
                                        ? 'bg-red-900/10 border-red-500/30'
                                        : 'bg-gray-800/50 border-gray-700'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getCommandTypeIcon(daemon.commandType)}
                                            <span className="font-semibold">{daemon.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                daemon.status === 'running'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : daemon.status === 'error'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-gray-700 text-gray-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    daemon.status === 'running' ? 'bg-green-400 animate-pulse' :
                                                    daemon.status === 'error' ? 'bg-red-400' : 'bg-gray-500'
                                                }`} />
                                                {daemon.status}
                                            </span>
                                            {daemon.pid && (
                                                <span className="text-[10px] text-gray-500">PID: {daemon.pid}</span>
                                            )}
                                        </div>
                                        <div className="text-sm font-mono truncate text-gray-400" title={daemon.command}>
                                            {daemon.command}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                            {daemon.npc && <span className="flex items-center gap-1"><Bot size={10} /> {daemon.npc}</span>}
                                            {daemon.uptime && <span>Uptime: {daemon.uptime}</span>}
                                            {daemon.restarts !== undefined && daemon.restarts > 0 && <span>Restarts: {daemon.restarts}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {daemon.status === 'running' ? (
                                            <button
                                                onClick={() => handleDaemonAction(daemon.id, 'stop')}
                                                className="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                                                title="Stop"
                                            >
                                                <Pause size={14} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleDaemonAction(daemon.id, 'start')}
                                                className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                                                title="Start"
                                            >
                                                <Play size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDaemonAction(daemon.id, 'restart')}
                                            className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                            title="Restart"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleViewLogs(daemon.id)}
                                            className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 rounded transition-colors"
                                            title="View Logs"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveDaemon(daemon.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Examples Tab */}
                {activeTab === 'examples' && (
                    <div className="space-y-6">
                        <div className="text-sm text-gray-400 mb-4">
                            Example templates to help you get started. Click "Use This" to copy to the add form.
                        </div>

                        {/* Cron Examples */}
                        <div>
                            <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                                <Calendar size={16} /> Cron Job Examples
                            </h3>
                            <div className="space-y-2">
                                {EXAMPLE_CRON_JOBS.map((example) => (
                                    <div
                                        key={example.id}
                                        className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    {getCommandTypeIcon(example.commandType)}
                                                    <code className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded font-mono">
                                                        {example.schedule}
                                                    </code>
                                                    <span className="text-[10px] text-gray-500">
                                                        {parseCronSchedule(example.schedule)}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                        example.commandType === 'bash' ? 'bg-green-900/30 text-green-400' :
                                                        example.commandType === 'python' ? 'bg-yellow-900/30 text-yellow-400' :
                                                        'bg-purple-900/30 text-purple-400'
                                                    }`}>
                                                        {example.commandType}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-mono truncate text-gray-300" title={example.command}>
                                                    {example.command}
                                                </div>
                                                {example.description && (
                                                    <div className="text-xs text-gray-500 mt-1">{example.description}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleCopyExample(example, 'cron')}
                                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-xs flex items-center gap-1"
                                            >
                                                <Copy size={12} /> Use This
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daemon Examples */}
                        <div>
                            <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                <Server size={16} /> Daemon Examples
                            </h3>
                            <div className="space-y-2">
                                {EXAMPLE_DAEMONS.map((example) => (
                                    <div
                                        key={example.id}
                                        className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getCommandTypeIcon(example.commandType)}
                                                    <span className="font-semibold">{example.name}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                        example.commandType === 'bash' ? 'bg-green-900/30 text-green-400' :
                                                        example.commandType === 'python' ? 'bg-yellow-900/30 text-yellow-400' :
                                                        'bg-purple-900/30 text-purple-400'
                                                    }`}>
                                                        {example.commandType}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-mono truncate text-gray-400" title={example.command}>
                                                    {example.command}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCopyExample(example, 'daemon')}
                                                className="px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded text-xs flex items-center gap-1"
                                            >
                                                <Copy size={12} /> Use This
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tips */}
                        <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-lg">
                            <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                                <Sparkles size={14} /> Tips
                            </h4>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• <strong>Bash:</strong> Run any shell command (ls, grep, curl, etc.)</li>
                                <li>• <strong>Python:</strong> Execute Python scripts with full path</li>
                                <li>• <strong>NPC:</strong> Use /commands like /sample, /check, /breathe with an NPC</li>
                                <li>• <strong>Custom:</strong> Any executable or script</li>
                                <li>• Use the <strong>Test</strong> button to verify your command works before scheduling</li>
                                <li>• Cron format: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* SQL Models Tab */}
                {activeTab === 'models' && (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-400 mb-4">
                            SQL Models use NQL (NPC Query Language) to transform and analyze data with AI-powered functions.
                        </div>

                        {/* NQL Functions Reference */}
                        <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                            <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                <Code size={14} /> NQL Functions
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {NQL_FUNCTIONS.map((fn) => (
                                    <div
                                        key={fn.name}
                                        className="p-2 bg-gray-800/50 rounded text-xs"
                                        title={fn.description}
                                    >
                                        <code className={`font-mono ${fn.color}`}>{fn.name}()</code>
                                        <div className="text-gray-500 text-[10px] mt-0.5">{fn.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SQL Models List */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                <Database size={14} /> Your SQL Models
                            </h4>
                            {sqlModels.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Table size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No SQL models found</p>
                                    <p className="text-xs mt-2">Create models in your project's models/ directory</p>
                                </div>
                            ) : (
                                sqlModels.map((model) => (
                                    <div
                                        key={model.id}
                                        className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-emerald-500/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Table size={14} className="text-emerald-400" />
                                                <span className="font-medium">{model.name}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                    model.materialization === 'table' ? 'bg-blue-500/20 text-blue-400' :
                                                    model.materialization === 'view' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                    {model.materialization}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {model.schedule && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded flex items-center gap-1">
                                                        <Clock size={10} /> {model.schedule}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedModel(model);
                                                        setIsEditingModel(true);
                                                    }}
                                                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                                    title="Edit model"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await (window as any).api?.sqlModelRun?.({ modelName: model.name });
                                                        } catch (err: any) {
                                                            setError(err.message);
                                                        }
                                                    }}
                                                    className="p-1 hover:bg-emerald-700 rounded text-emerald-400 hover:text-white"
                                                    title="Run model"
                                                >
                                                    <Play size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        {model.description && (
                                            <p className="text-xs text-gray-500 mb-2">{model.description}</p>
                                        )}
                                        <pre className="text-xs font-mono text-gray-400 bg-black/30 p-2 rounded overflow-x-auto max-h-24">
                                            {model.sql}
                                        </pre>
                                        {model.lastRunAt && (
                                            <div className="text-[10px] text-gray-600 mt-2 flex items-center gap-1">
                                                <Clock size={10} /> Last run: {new Date(model.lastRunAt).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Example NQL Query */}
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                <Sparkles size={14} /> Example NQL Query
                            </h4>
                            <pre className="text-xs font-mono text-gray-400 bg-black/30 p-3 rounded overflow-x-auto">
{`-- Extract facts from conversation messages
SELECT
    conversation_id,
    message_id,
    extract_facts(content) as facts,
    get_llm_response('summarize this: ' || content) as summary
FROM messages
WHERE timestamp > datetime('now', '-7 days')
LIMIT 100;`}
                            </pre>
                        </div>
                    </div>
                )}

                {/* System Crontab */}
                {activeTab === 'system' && (
                    <div className="space-y-2">
                        <div className="text-xs text-gray-500 mb-3">
                            Read-only view of system crontab entries (requires access)
                        </div>
                        {systemCron.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Terminal size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No system cron jobs found</p>
                                <p className="text-xs mt-2">Run `crontab -l` in terminal to view your crontab</p>
                            </div>
                        ) : (
                            systemCron.map((job, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <code className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded font-mono">
                                            {job.schedule}
                                        </code>
                                        {job.user && (
                                            <span className="text-[10px] text-gray-500">({job.user})</span>
                                        )}
                                    </div>
                                    <div className="text-sm font-mono truncate text-gray-400">
                                        {job.command}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t theme-border text-xs text-gray-500 flex items-center justify-between flex-shrink-0">
                <span className="truncate">Path: {currentPath || 'Not set'}</span>
                <span>
                    {cronJobs.filter(j => j.enabled).length} active, {daemons.filter(d => d.status === 'running').length} running
                </span>
            </div>

            {/* Logs Modal */}
            {showLogs && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]" onClick={() => setShowLogs(null)}>
                    <div
                        className="bg-gray-900 rounded-lg shadow-xl w-[80vw] max-w-3xl max-h-[70vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-3 border-b border-gray-700">
                            <span className="font-semibold flex items-center gap-2">
                                <FileText size={16} /> Daemon Logs
                            </span>
                            <button onClick={() => setShowLogs(null)} className="p-1 hover:bg-gray-700 rounded">
                                <X size={16} />
                            </button>
                        </div>
                        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-300 bg-black/30">
                            {logs}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );

    // Pane mode
    if (isPane) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden theme-bg-secondary">
                {content}
            </div>
        );
    }

    // Modal mode
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="theme-bg-secondary rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {content}
            </div>
        </div>
    );
};

export default CronDaemonPanel;
