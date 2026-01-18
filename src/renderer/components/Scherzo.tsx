import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Music, Play, Pause, Square, Circle, SkipBack, SkipForward,
    Volume2, VolumeX, Upload, Download, Trash2, Plus, Search,
    Mic, Radio, Sliders, Waves, BarChart3, FileAudio, Folder,
    Scissors, Copy, ClipboardPaste, Undo, Redo, ZoomIn, ZoomOut,
    Music2, Music3, Music4, Disc, Disc3, ListMusic, Library,
    Sparkles, Loader, X, ChevronRight, Grid, Settings, Save,
    FastForward, Rewind, RotateCcw, Shuffle, Repeat, Heart,
    PlusCircle, FolderOpen, Clock, Activity, AudioLines, Piano,
    Guitar, ChevronLeft, Star, Package, Layers, FileJson, Tag
} from 'lucide-react';

interface ScherzoProps {
    currentPath?: string;
    onClose?: () => void;
}

// Audio file type
interface AudioFile {
    id: string;
    name: string;
    path: string;
    duration?: number;
    waveform?: number[];
    bpm?: number;
    key?: string;
}

// Track in editor
interface AudioTrack {
    id: string;
    name: string;
    clips: AudioClip[];
    volume: number;
    pan: number;
    muted: boolean;
    solo: boolean;
}

interface AudioClip {
    id: string;
    audioId: string;
    startTime: number;
    duration: number;
    offset: number;
    name: string;
}

// DJ Deck
interface DJDeck {
    audioFile: AudioFile | null;
    playing: boolean;
    currentTime: number;
    volume: number;
    speed: number;
    eq: { low: number; mid: number; high: number };
}

// Audio Training Dataset
interface AudioDatasetExample {
    id: string;
    prompt: string;
    negativePrompt?: string;
    audioPath?: string;
    duration: number;
    model: string;
    qualityScore: number;
    tags: string[];
    createdAt: string;
}

interface AudioDataset {
    id: string;
    name: string;
    description?: string;
    examples: AudioDatasetExample[];
    createdAt: string;
    updatedAt: string;
    targetModel?: string;
    tags: string[];
}

export const Scherzo: React.FC<ScherzoProps> = ({ currentPath, onClose }) => {
    // Mode/tab state
    const [activeMode, setActiveMode] = useState('library');

    // Library state
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [audioSource, setAudioSource] = useState(currentPath || '');

    // Update audio source when currentPath changes
    useEffect(() => {
        if (currentPath && currentPath !== audioSource) {
            setAudioSource(currentPath);
        }
    }, [currentPath]);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Generator state
    const [genPrompt, setGenPrompt] = useState('');
    const [genModel, setGenModel] = useState('');
    const [generating, setGenerating] = useState(false);
    const [genDuration, setGenDuration] = useState(30);
    const [generatedAudio, setGeneratedAudio] = useState<AudioFile[]>([]);

    // Editor state
    const [tracks, setTracks] = useState<AudioTrack[]>([
        { id: 'track-1', name: 'Track 1', clips: [], volume: 1, pan: 0, muted: false, solo: false },
        { id: 'track-2', name: 'Track 2', clips: [], volume: 1, pan: 0, muted: false, solo: false }
    ]);
    const [editorZoom, setEditorZoom] = useState(1);
    const [editorPosition, setEditorPosition] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // DJ state
    const [deckA, setDeckA] = useState<DJDeck>({
        audioFile: null, playing: false, currentTime: 0, volume: 1, speed: 1,
        eq: { low: 0, mid: 0, high: 0 }
    });
    const [deckB, setDeckB] = useState<DJDeck>({
        audioFile: null, playing: false, currentTime: 0, volume: 1, speed: 1,
        eq: { low: 0, mid: 0, high: 0 }
    });
    const [crossfader, setCrossfader] = useState(0.5);
    const deckARef = useRef<HTMLAudioElement>(null);
    const deckBRef = useRef<HTMLAudioElement>(null);

    // Analysis state
    const [analysisData, setAnalysisData] = useState<{ frequencies: number[], waveform: number[] } | null>(null);
    const [analysisMode, setAnalysisMode] = useState<'waveform' | 'spectrum' | 'spectrogram'>('waveform');
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Dataset state
    const [audioDatasets, setAudioDatasets] = useState<AudioDataset[]>(() => {
        try {
            const stored = localStorage.getItem('scherzo_audioDatasets');
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
    const [showCreateDataset, setShowCreateDataset] = useState(false);
    const [showAddToDataset, setShowAddToDataset] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState('');
    const [selectedGeneratedAudio, setSelectedGeneratedAudio] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [datasetExportFormat, setDatasetExportFormat] = useState<'jsonl' | 'json' | 'csv'>('jsonl');

    // Save datasets to localStorage
    useEffect(() => {
        localStorage.setItem('scherzo_audioDatasets', JSON.stringify(audioDatasets));
    }, [audioDatasets]);

    // Get selected dataset
    const selectedDataset = audioDatasets.find(d => d.id === selectedDatasetId);

    // Sidebar collapsed
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('scherzo_sidebarCollapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('scherzo_sidebarCollapsed', String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Load audio files from source
    useEffect(() => {
        if (audioSource) {
            loadAudioFiles(audioSource);
        }
    }, [audioSource]);

    const loadAudioFiles = async (source: string) => {
        try {
            const response = await fetch(`http://localhost:7337/api/files?path=${encodeURIComponent(source)}&extensions=mp3,wav,ogg,flac,m4a,aac,wma,aiff`);
            if (response.ok) {
                const data = await response.json();
                const files = (data.files || []).map((f: any) => ({
                    id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: f.name,
                    path: f.path,
                    duration: 0
                }));
                setAudioFiles(files);
            }
        } catch (err) {
            console.error('Error loading audio files:', err);
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Audio generation models
    const AUDIO_MODELS = [
        { id: 'suno-v4', name: 'Suno v4', provider: 'suno', type: 'music' },
        { id: 'suno-v3.5', name: 'Suno v3.5', provider: 'suno', type: 'music' },
        { id: 'udio-v1.5', name: 'Udio v1.5', provider: 'udio', type: 'music' },
        { id: 'udio-v1', name: 'Udio v1', provider: 'udio', type: 'music' },
        { id: 'stable-audio-2', name: 'Stable Audio 2.0', provider: 'stability', type: 'music' },
        { id: 'musicgen-large', name: 'MusicGen Large', provider: 'meta', type: 'music' },
        { id: 'audiogen', name: 'AudioGen', provider: 'meta', type: 'sfx' },
        { id: 'bark', name: 'Bark', provider: 'suno', type: 'speech' },
        { id: 'eleven-v2', name: 'ElevenLabs v2', provider: 'elevenlabs', type: 'speech' }
    ];

    // Scherzo modes
    const SCHERZO_MODES = [
        { id: 'library', name: 'Library', icon: Library, group: 'browse' },
        { id: 'generator', name: 'Generate', icon: Sparkles, group: 'create' },
        { id: 'editor', name: 'Editor', icon: Waves, group: 'edit' },
        { id: 'dj', name: 'DJ Mixer', icon: Disc3, group: 'edit' },
        { id: 'analysis', name: 'Analysis', icon: Activity, group: 'analyze' },
        { id: 'notation', name: 'Notation', icon: Music2, group: 'analyze' },
        { id: 'datasets', name: 'Datasets', icon: Package, group: 'train' }
    ];

    const currentMode_obj = SCHERZO_MODES.find(m => m.id === activeMode) || SCHERZO_MODES[0];
    const CurrentModeIcon = currentMode_obj.icon;

    // Render sidebar
    const renderSidebar = () => {
        if (sidebarCollapsed) {
            return (
                <div className="w-12 border-r theme-border theme-bg-secondary flex flex-col items-center py-2">
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="p-2 hover:bg-gray-700 rounded mb-2"
                        title="Expand sidebar"
                    >
                        <ChevronRight size={16}/>
                    </button>
                    <Music size={20} className="text-purple-400 mb-4"/>
                    <div className="flex-1"/>
                </div>
            );
        }

        return (
            <div className="w-64 border-r theme-border theme-bg-secondary flex flex-col overflow-hidden">
                <div className="p-3 border-b theme-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Music size={20} className="text-purple-400"/>
                        <span className="font-semibold">Scherzo</span>
                    </div>
                    <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="p-1 hover:bg-gray-700 rounded"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                </div>

                {/* Source selector */}
                <div className="p-3 border-b theme-border">
                    <label className="text-xs text-gray-400 uppercase font-semibold">Source Folder</label>
                    <div className="flex gap-2 mt-1">
                        <input
                            type="text"
                            value={audioSource}
                            onChange={(e) => setAudioSource(e.target.value)}
                            placeholder="/path/to/music"
                            className="flex-1 theme-input text-xs"
                        />
                        <button
                            onClick={async () => {
                                try {
                                    const result = await (window as any).api.showOpenDialog({
                                        properties: ['openDirectory']
                                    });
                                    if (result && result.length > 0) {
                                        setAudioSource(result[0].path);
                                    }
                                } catch (err) {
                                    console.error('Error selecting folder:', err);
                                }
                            }}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"
                        >
                            <FolderOpen size={14}/>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b theme-border">
                    <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"/>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search audio..."
                            className="w-full theme-input text-xs pl-7"
                        />
                    </div>
                </div>

                {/* Audio list */}
                <div className="flex-1 overflow-y-auto p-2">
                    {audioFiles
                        .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(file => (
                            <div
                                key={file.id}
                                onClick={() => setSelectedAudio(file)}
                                onDoubleClick={() => {
                                    setSelectedAudio(file);
                                    if (audioRef.current) {
                                        audioRef.current.src = `file://${file.path}`;
                                        audioRef.current.play();
                                        setIsPlaying(true);
                                    }
                                }}
                                className={`p-2 rounded cursor-pointer flex items-center gap-2 mb-1 ${
                                    selectedAudio?.id === file.id
                                        ? 'bg-purple-600/30 border border-purple-500'
                                        : 'hover:bg-gray-700/50'
                                }`}
                            >
                                <FileAudio size={14} className="text-purple-400 flex-shrink-0"/>
                                <span className="text-xs truncate flex-1">{file.name}</span>
                                {file.duration && (
                                    <span className="text-xs text-gray-500">{formatTime(file.duration)}</span>
                                )}
                            </div>
                        ))}
                    {audioFiles.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Music size={32} className="mx-auto mb-2 opacity-50"/>
                            <p className="text-xs">No audio files</p>
                            <p className="text-xs mt-1">Select a source folder above</p>
                        </div>
                    )}
                </div>

                {/* Mini player */}
                {selectedAudio && (
                    <div className="p-3 border-t theme-border bg-gray-800/50">
                        <div className="flex items-center gap-2 mb-2">
                            <FileAudio size={14} className="text-purple-400"/>
                            <span className="text-xs truncate flex-1">{selectedAudio.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        if (isPlaying) {
                                            audioRef.current.pause();
                                        } else {
                                            audioRef.current.play();
                                        }
                                        setIsPlaying(!isPlaying);
                                    }
                                }}
                                className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded"
                            >
                                {isPlaying ? <Pause size={14}/> : <Play size={14}/>}
                            </button>
                            <div className="flex-1 h-1 bg-gray-700 rounded overflow-hidden">
                                <div
                                    className="h-full bg-purple-500"
                                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                        </div>
                        <audio
                            ref={audioRef}
                            src={selectedAudio ? `file://${selectedAudio.path}` : ''}
                            onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
                            onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
                            onEnded={() => setIsPlaying(false)}
                        />
                    </div>
                )}
            </div>
        );
    };

    // Render Library
    const renderLibrary = () => {
        const filteredFiles = audioFiles.filter(f =>
            !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-4 gap-4">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            onClick={() => setSelectedAudio(file)}
                            onDoubleClick={() => {
                                setSelectedAudio(file);
                                if (audioRef.current) {
                                    audioRef.current.src = `file://${file.path}`;
                                    audioRef.current.play();
                                    setIsPlaying(true);
                                }
                            }}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${
                                selectedAudio?.id === file.id
                                    ? 'bg-purple-600/30 ring-2 ring-purple-500'
                                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                            }`}
                        >
                            <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-lg flex items-center justify-center mb-3">
                                <Music size={32} className="text-purple-400"/>
                            </div>
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            {file.duration && (
                                <p className="text-xs text-gray-500 mt-1">{formatTime(file.duration)}</p>
                            )}
                        </div>
                    ))}
                </div>
                {filteredFiles.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <Music size={64} className="mx-auto text-gray-600 mb-4"/>
                            <p className="text-gray-400 text-lg">No Audio Files</p>
                            <p className="text-gray-600 text-sm mt-2">Select a source folder in the sidebar</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Generator
    const renderGenerator = () => {
        return (
            <div className="flex-1 flex overflow-hidden">
                {/* Controls */}
                <div className="w-96 border-r theme-border p-4 flex flex-col gap-4 overflow-y-auto theme-bg-secondary">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles size={20} className="text-purple-400"/> Audio Generator
                    </h3>

                    <div>
                        <label className="text-xs text-gray-400 font-semibold uppercase">Prompt</label>
                        <textarea
                            value={genPrompt}
                            onChange={(e) => setGenPrompt(e.target.value)}
                            placeholder="Describe the audio you want to create..."
                            className="w-full theme-input mt-2 text-sm"
                            rows={4}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-semibold uppercase">Model</label>
                        <select
                            value={genModel}
                            onChange={(e) => setGenModel(e.target.value)}
                            className="w-full theme-input mt-2 text-sm"
                        >
                            <option value="">Select a model...</option>
                            <optgroup label="Music Generation">
                                {AUDIO_MODELS.filter(m => m.type === 'music').map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Sound Effects">
                                {AUDIO_MODELS.filter(m => m.type === 'sfx').map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Speech/Voice">
                                {AUDIO_MODELS.filter(m => m.type === 'speech').map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-semibold uppercase">Duration (seconds)</label>
                        <div className="flex items-center gap-3 mt-2">
                            <input
                                type="range"
                                min={5}
                                max={180}
                                value={genDuration}
                                onChange={(e) => setGenDuration(parseInt(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-sm w-12">{genDuration}s</span>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (!genPrompt || !genModel) return;
                            setGenerating(true);
                            try {
                                // TODO: Integrate with audio generation API
                                await new Promise(r => setTimeout(r, 3000));
                                setGeneratedAudio(prev => [...prev, {
                                    id: `gen_${Date.now()}`,
                                    name: genPrompt.slice(0, 30) + '...',
                                    path: '',
                                    duration: genDuration
                                }]);
                            } finally {
                                setGenerating(false);
                            }
                        }}
                        disabled={generating || !genPrompt || !genModel}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader size={18} className="animate-spin"/>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18}/>
                                Generate Audio
                            </>
                        )}
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Results toolbar */}
                    {generatedAudio.length > 0 && (
                        <div className="p-3 border-b theme-border flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setSelectionMode(!selectionMode);
                                    if (selectionMode) setSelectedGeneratedAudio(new Set());
                                }}
                                className={`px-3 py-1.5 rounded text-xs flex items-center gap-1 ${
                                    selectionMode ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <Layers size={12} /> Select
                            </button>
                            {selectionMode && selectedGeneratedAudio.size > 0 && (
                                <>
                                    <span className="text-xs text-gray-400">{selectedGeneratedAudio.size} selected</span>
                                    <button
                                        onClick={() => setShowAddToDataset(true)}
                                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add to Dataset
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    <div className="flex-1 p-4 overflow-y-auto">
                    {generatedAudio.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {generatedAudio.map(audio => (
                                <div
                                    key={audio.id}
                                    onClick={() => selectionMode && toggleGeneratedSelection(audio.id)}
                                    className={`bg-gray-800 rounded-xl p-4 ${
                                        selectionMode
                                            ? selectedGeneratedAudio.has(audio.id)
                                                ? 'ring-2 ring-purple-500 bg-purple-900/20 cursor-pointer'
                                                : 'hover:bg-gray-700/50 cursor-pointer'
                                            : ''
                                    }`}
                                >
                                    <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg flex items-center justify-center mb-3">
                                        {selectionMode && (
                                            <input
                                                type="checkbox"
                                                checked={selectedGeneratedAudio.has(audio.id)}
                                                onChange={() => toggleGeneratedSelection(audio.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute top-2 left-2 w-4 h-4"
                                            />
                                        )}
                                        <Music size={32} className="text-purple-400"/>
                                    </div>
                                    <p className="text-sm truncate">{audio.name}</p>
                                    <p className="text-xs text-gray-500">{formatTime(audio.duration || 0)}</p>
                                    <div className="flex gap-2 mt-3">
                                        <button className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 rounded text-purple-400 text-xs">
                                            <Play size={12} className="inline mr-1"/> Play
                                        </button>
                                        <button className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 rounded text-blue-400 text-xs">
                                            <Download size={12} className="inline mr-1"/> Save
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Sparkles size={64} className="mx-auto text-gray-600 mb-4"/>
                                <p className="text-gray-400 text-lg">Generate AI Audio</p>
                                <p className="text-gray-600 text-sm mt-2">Enter a prompt and select a model</p>
                            </div>
                        </div>
                    )}
                    </div>

                    {/* Add to Dataset Modal */}
                    {showAddToDataset && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]" onClick={() => setShowAddToDataset(false)}>
                            <div className="bg-gray-800 rounded-lg shadow-xl w-96 p-6" onClick={e => e.stopPropagation()}>
                                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Plus className="text-purple-400" size={18} />
                                    Add to Dataset
                                </h4>
                                {audioDatasets.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                        <p>No datasets yet</p>
                                        <button
                                            onClick={() => { setShowAddToDataset(false); setActiveMode('datasets'); setShowCreateDataset(true); }}
                                            className="mt-2 text-purple-400 hover:text-purple-300"
                                        >
                                            Create a dataset first
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {audioDatasets.map(dataset => (
                                            <button
                                                key={dataset.id}
                                                onClick={() => addGeneratedToDataset(dataset.id)}
                                                className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded text-left flex items-center justify-between"
                                            >
                                                <div>
                                                    <span className="font-medium">{dataset.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">{dataset.examples.length} samples</span>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-500"/>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={() => setShowAddToDataset(false)}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render Editor (Audacity-style)
    const renderEditor = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="h-12 border-b theme-border flex items-center px-4 gap-2 bg-gray-800/50">
                    <button className="p-2 hover:bg-gray-700 rounded" title="Undo">
                        <Undo size={16}/>
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded" title="Redo">
                        <Redo size={16}/>
                    </button>
                    <div className="w-px h-6 bg-gray-600 mx-2"/>
                    <button className="p-2 hover:bg-gray-700 rounded" title="Cut">
                        <Scissors size={16}/>
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded" title="Copy">
                        <Copy size={16}/>
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded" title="Paste">
                        <ClipboardPaste size={16}/>
                    </button>
                    <div className="w-px h-6 bg-gray-600 mx-2"/>
                    <button
                        onClick={() => setEditorZoom(Math.max(0.25, editorZoom - 0.25))}
                        className="p-2 hover:bg-gray-700 rounded"
                    >
                        <ZoomOut size={16}/>
                    </button>
                    <span className="text-xs text-gray-400 w-12 text-center">{Math.round(editorZoom * 100)}%</span>
                    <button
                        onClick={() => setEditorZoom(Math.min(4, editorZoom + 0.25))}
                        className="p-2 hover:bg-gray-700 rounded"
                    >
                        <ZoomIn size={16}/>
                    </button>
                    <div className="flex-1"/>
                    <button
                        onClick={async () => {
                            if (isRecording) {
                                mediaRecorderRef.current?.stop();
                                setIsRecording(false);
                            } else {
                                try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                    const recorder = new MediaRecorder(stream);
                                    mediaRecorderRef.current = recorder;
                                    const chunks: Blob[] = [];
                                    recorder.ondataavailable = (e) => chunks.push(e.data);
                                    recorder.onstop = () => {
                                        const blob = new Blob(chunks, { type: 'audio/webm' });
                                        // TODO: Save recorded audio
                                        console.log('Recording complete:', blob);
                                    };
                                    recorder.start();
                                    setIsRecording(true);
                                } catch (err) {
                                    console.error('Recording error:', err);
                                }
                            }
                        }}
                        className={`px-3 py-1.5 rounded flex items-center gap-2 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'}`}
                    >
                        <Circle size={14} fill={isRecording ? 'currentColor' : 'none'}/>
                        {isRecording ? 'Stop' : 'Record'}
                    </button>
                </div>

                {/* Tracks area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Track headers */}
                    <div className="w-48 border-r theme-border flex flex-col">
                        {tracks.map(track => (
                            <div key={track.id} className="h-24 border-b theme-border p-2 flex flex-col">
                                <input
                                    type="text"
                                    value={track.name}
                                    onChange={(e) => setTracks(prev => prev.map(t =>
                                        t.id === track.id ? {...t, name: e.target.value} : t
                                    ))}
                                    className="bg-transparent text-sm font-medium border-b border-transparent hover:border-gray-600 focus:border-purple-500 outline-none mb-2"
                                />
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setTracks(prev => prev.map(t =>
                                            t.id === track.id ? {...t, muted: !t.muted} : t
                                        ))}
                                        className={`px-2 py-0.5 text-xs rounded ${track.muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        M
                                    </button>
                                    <button
                                        onClick={() => setTracks(prev => prev.map(t =>
                                            t.id === track.id ? {...t, solo: !t.solo} : t
                                        ))}
                                        className={`px-2 py-0.5 text-xs rounded ${track.solo ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        S
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-auto">
                                    <Volume2 size={12} className="text-gray-500"/>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={track.volume}
                                        onChange={(e) => setTracks(prev => prev.map(t =>
                                            t.id === track.id ? {...t, volume: parseFloat(e.target.value)} : t
                                        ))}
                                        className="flex-1 h-1"
                                    />
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setTracks(prev => [...prev, {
                                id: `track-${Date.now()}`,
                                name: `Track ${prev.length + 1}`,
                                clips: [],
                                volume: 1,
                                pan: 0,
                                muted: false,
                                solo: false
                            }])}
                            className="h-8 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-700/50"
                        >
                            <Plus size={14} className="mr-1"/> Add Track
                        </button>
                    </div>

                    {/* Waveform area */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-900/50">
                        <div style={{ width: `${60 * 50 * editorZoom}px`, minWidth: '100%' }}>
                            {tracks.map(track => (
                                <div
                                    key={track.id}
                                    className="h-24 border-b theme-border relative"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        // Handle drop from library
                                        const audioId = e.dataTransfer.getData('audioId');
                                        if (audioId && selectedAudio) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = (e.clientX - rect.left) / (50 * editorZoom);
                                            setTracks(prev => prev.map(t =>
                                                t.id === track.id ? {
                                                    ...t,
                                                    clips: [...t.clips, {
                                                        id: `clip_${Date.now()}`,
                                                        audioId: selectedAudio.id,
                                                        startTime: x,
                                                        duration: selectedAudio.duration || 10,
                                                        offset: 0,
                                                        name: selectedAudio.name
                                                    }]
                                                } : t
                                            ));
                                        }
                                    }}
                                >
                                    {/* Waveform background lines */}
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full h-px bg-gray-700"/>
                                    </div>

                                    {/* Clips */}
                                    {track.clips.map(clip => (
                                        <div
                                            key={clip.id}
                                            onClick={() => setSelectedClipId(clip.id)}
                                            className={`absolute top-1 bottom-1 rounded bg-purple-600/80 cursor-pointer ${
                                                selectedClipId === clip.id ? 'ring-2 ring-white' : ''
                                            }`}
                                            style={{
                                                left: `${clip.startTime * 50 * editorZoom}px`,
                                                width: `${clip.duration * 50 * editorZoom}px`
                                            }}
                                        >
                                            <div className="px-2 py-1 text-xs truncate">{clip.name}</div>
                                            {/* Fake waveform */}
                                            <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end px-1 gap-px opacity-50">
                                                {Array.from({ length: Math.min(50, Math.floor(clip.duration * 5)) }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex-1 bg-purple-300"
                                                        style={{ height: `${20 + Math.random() * 80}%` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transport */}
                <div className="h-16 border-t theme-border flex items-center justify-center gap-4 bg-gray-800/50">
                    <button className="p-2 hover:bg-gray-700 rounded">
                        <SkipBack size={20}/>
                    </button>
                    <button className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full">
                        <Play size={24}/>
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded">
                        <Square size={20}/>
                    </button>
                    <button className="p-2 hover:bg-gray-700 rounded">
                        <SkipForward size={20}/>
                    </button>
                    <span className="text-sm text-gray-400 ml-4">00:00:00 / 00:00:00</span>
                </div>
            </div>
        );
    };

    // Render DJ Mixer
    const renderDJMixer = () => {
        const renderDeck = (deck: DJDeck, setDeck: React.Dispatch<React.SetStateAction<DJDeck>>, label: string, audioRef: React.RefObject<HTMLAudioElement>) => (
            <div className="flex-1 p-4 flex flex-col">
                <div className="text-center mb-4">
                    <span className="text-2xl font-bold text-purple-400">{label}</span>
                </div>

                {/* Turntable visual */}
                <div className="aspect-square max-w-xs mx-auto bg-gray-800 rounded-full flex items-center justify-center relative mb-4">
                    <div className={`w-3/4 h-3/4 bg-gray-900 rounded-full flex items-center justify-center ${deck.playing ? 'animate-spin' : ''}`} style={{ animationDuration: `${2 / deck.speed}s` }}>
                        <div className="w-8 h-8 bg-gray-700 rounded-full"/>
                    </div>
                    {deck.audioFile && (
                        <div className="absolute bottom-2 left-0 right-0 text-center">
                            <p className="text-xs truncate px-4">{deck.audioFile.name}</p>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                        onClick={() => {
                            if (audioRef.current) {
                                if (deck.playing) {
                                    audioRef.current.pause();
                                } else {
                                    audioRef.current.play();
                                }
                            }
                            setDeck(prev => ({...prev, playing: !prev.playing}));
                        }}
                        className="p-4 bg-purple-600 hover:bg-purple-700 rounded-full"
                    >
                        {deck.playing ? <Pause size={24}/> : <Play size={24}/>}
                    </button>
                </div>

                {/* Speed */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Speed</span>
                        <span>{(deck.speed * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.01}
                        value={deck.speed}
                        onChange={(e) => {
                            const speed = parseFloat(e.target.value);
                            setDeck(prev => ({...prev, speed}));
                            if (audioRef.current) {
                                audioRef.current.playbackRate = speed;
                            }
                        }}
                        className="w-full"
                    />
                </div>

                {/* EQ */}
                <div className="grid grid-cols-3 gap-2">
                    {(['high', 'mid', 'low'] as const).map(band => (
                        <div key={band} className="text-center">
                            <span className="text-xs text-gray-400 uppercase">{band}</span>
                            <input
                                type="range"
                                min={-12}
                                max={12}
                                value={deck.eq[band]}
                                onChange={(e) => setDeck(prev => ({
                                    ...prev,
                                    eq: {...prev.eq, [band]: parseInt(e.target.value)}
                                }))}
                                className="w-full h-24 -rotate-90 origin-center"
                                style={{ marginTop: '2rem', marginBottom: '2rem' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Volume */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Volume</span>
                        <span>{Math.round(deck.volume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={deck.volume}
                        onChange={(e) => {
                            const vol = parseFloat(e.target.value);
                            setDeck(prev => ({...prev, volume: vol}));
                            if (audioRef.current) {
                                audioRef.current.volume = vol * (label === 'A' ? 1 - crossfader : crossfader);
                            }
                        }}
                        className="w-full"
                    />
                </div>

                {/* Load button */}
                <button
                    onClick={() => {
                        if (selectedAudio) {
                            setDeck(prev => ({...prev, audioFile: selectedAudio, currentTime: 0}));
                            if (audioRef.current) {
                                audioRef.current.src = `file://${selectedAudio.path}`;
                            }
                        }
                    }}
                    className="mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                    Load Selected Track
                </button>

                <audio ref={audioRef} />
            </div>
        );

        return (
            <div className="flex-1 flex overflow-hidden">
                {/* Deck A */}
                <div className="flex-1 border-r theme-border bg-gradient-to-b from-gray-800/50 to-gray-900/50">
                    {renderDeck(deckA, setDeckA, 'A', deckARef)}
                </div>

                {/* Center - Crossfader */}
                <div className="w-32 flex flex-col items-center justify-center p-4 bg-gray-800/50">
                    <Disc3 size={32} className="text-purple-400 mb-4"/>
                    <span className="text-xs text-gray-400 mb-2">Crossfader</span>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={crossfader}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setCrossfader(val);
                            if (deckARef.current) deckARef.current.volume = deckA.volume * (1 - val);
                            if (deckBRef.current) deckBRef.current.volume = deckB.volume * val;
                        }}
                        className="w-full"
                    />
                    <div className="flex justify-between w-full text-xs text-gray-500 mt-1">
                        <span>A</span>
                        <span>B</span>
                    </div>
                </div>

                {/* Deck B */}
                <div className="flex-1 border-l theme-border bg-gradient-to-b from-gray-800/50 to-gray-900/50">
                    {renderDeck(deckB, setDeckB, 'B', deckBRef)}
                </div>
            </div>
        );
    };

    // Render Analysis
    const renderAnalysis = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mode selector */}
                <div className="h-12 border-b theme-border flex items-center px-4 gap-2 bg-gray-800/50">
                    {(['waveform', 'spectrum', 'spectrogram'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setAnalysisMode(mode)}
                            className={`px-3 py-1.5 rounded text-sm capitalize ${
                                analysisMode === mode
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                {/* Visualization */}
                <div className="flex-1 p-4">
                    <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
                        {selectedAudio ? (
                            <div className="w-full h-full p-4">
                                {analysisMode === 'waveform' && (
                                    <div className="w-full h-full flex items-center">
                                        <div className="w-full h-32 flex items-center gap-px">
                                            {Array.from({ length: 200 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-purple-500"
                                                    style={{ height: `${20 + Math.sin(i * 0.1) * 50 + Math.random() * 30}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {analysisMode === 'spectrum' && (
                                    <div className="w-full h-full flex items-end justify-center gap-1">
                                        {Array.from({ length: 64 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-3 bg-gradient-to-t from-purple-600 to-pink-500 rounded-t"
                                                style={{ height: `${Math.random() * 100}%` }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {analysisMode === 'spectrogram' && (
                                    <div className="w-full h-full bg-gradient-to-b from-purple-900 via-pink-900 to-orange-900 rounded opacity-75">
                                        <p className="text-center pt-4 text-gray-400">Spectrogram visualization</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center">
                                <Activity size={64} className="mx-auto text-gray-600 mb-4"/>
                                <p className="text-gray-400">Select an audio file to analyze</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info panel */}
                {selectedAudio && (
                    <div className="h-32 border-t theme-border p-4 bg-gray-800/50">
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-400">Duration</p>
                                <p className="text-lg font-mono">{formatTime(selectedAudio.duration || 0)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">BPM (est.)</p>
                                <p className="text-lg font-mono">{selectedAudio.bpm || '---'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Key (est.)</p>
                                <p className="text-lg font-mono">{selectedAudio.key || '---'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Sample Rate</p>
                                <p className="text-lg font-mono">44.1 kHz</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render Notation
    const renderNotation = () => {
        return (
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r theme-border p-4 flex flex-col gap-4 theme-bg-secondary">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Music2 size={18}/> Notation
                    </h4>

                    <div className="space-y-2">
                        <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-2">
                            <Piano size={16}/> Piano Roll
                        </button>
                        <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-2">
                            <Music2 size={16}/> Sheet Music
                        </button>
                        <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-2">
                            <Guitar size={16}/> Guitar Tab
                        </button>
                    </div>

                    <div className="border-t theme-border pt-4">
                        <p className="text-xs text-gray-400 mb-2">Transcription</p>
                        <button
                            disabled={!selectedAudio}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2"
                        >
                            <Sparkles size={14}/> Auto-Transcribe
                        </button>
                    </div>
                </div>

                {/* Main area */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="w-full min-h-full bg-white rounded-lg p-8">
                        {/* Staff lines */}
                        <div className="space-y-16">
                            {[0, 1, 2, 3].map(staff => (
                                <div key={staff} className="relative">
                                    {/* Treble staff */}
                                    <div className="space-y-2">
                                        {[0, 1, 2, 3, 4].map(line => (
                                            <div key={line} className="h-px bg-gray-400"/>
                                        ))}
                                    </div>
                                    {/* Clef placeholder */}
                                    <div className="absolute left-0 top-0 text-4xl text-gray-600" style={{ marginTop: '-8px' }}>
                                        𝄞
                                    </div>
                                    {/* Notes placeholder */}
                                    <p className="text-center text-gray-400 mt-4 text-sm">
                                        {staff === 0 ? 'Load or transcribe audio to view notation' : ''}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Dataset management functions
    const createAudioDataset = () => {
        if (!newDatasetName.trim()) return;
        const newDataset: AudioDataset = {
            id: `audio_dataset_${Date.now()}`,
            name: newDatasetName.trim(),
            examples: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: []
        };
        setAudioDatasets(prev => [...prev, newDataset]);
        setSelectedDatasetId(newDataset.id);
        setNewDatasetName('');
        setShowCreateDataset(false);
    };

    const deleteAudioDataset = (id: string) => {
        setAudioDatasets(prev => prev.filter(d => d.id !== id));
        if (selectedDatasetId === id) setSelectedDatasetId(null);
    };

    const addGeneratedToDataset = (datasetId: string) => {
        const dataset = audioDatasets.find(d => d.id === datasetId);
        if (!dataset) return;

        const selected = generatedAudio.filter(a => selectedGeneratedAudio.has(a.id));
        const newExamples: AudioDatasetExample[] = selected.map(audio => ({
            id: `audio_ex_${Date.now()}_${audio.id}`,
            prompt: audio.name,
            audioPath: audio.path,
            duration: audio.duration || 0,
            model: genModel,
            qualityScore: 4,
            tags: [],
            createdAt: new Date().toISOString()
        }));

        setAudioDatasets(prev => prev.map(d =>
            d.id === datasetId
                ? { ...d, examples: [...d.examples, ...newExamples], updatedAt: new Date().toISOString() }
                : d
        ));

        setSelectedGeneratedAudio(new Set());
        setSelectionMode(false);
        setShowAddToDataset(false);
    };

    const updateAudioExampleQuality = (datasetId: string, exampleId: string, score: number) => {
        setAudioDatasets(prev => prev.map(d =>
            d.id === datasetId
                ? {
                    ...d,
                    examples: d.examples.map(ex =>
                        ex.id === exampleId ? { ...ex, qualityScore: score } : ex
                    ),
                    updatedAt: new Date().toISOString()
                }
                : d
        ));
    };

    const removeAudioExample = (datasetId: string, exampleId: string) => {
        setAudioDatasets(prev => prev.map(d =>
            d.id === datasetId
                ? { ...d, examples: d.examples.filter(ex => ex.id !== exampleId), updatedAt: new Date().toISOString() }
                : d
        ));
    };

    const exportAudioDataset = (dataset: AudioDataset) => {
        let content = '';
        let filename = '';

        if (datasetExportFormat === 'jsonl') {
            content = dataset.examples.map(ex => JSON.stringify({
                prompt: ex.prompt,
                audio_path: ex.audioPath,
                duration: ex.duration,
                model: ex.model,
                quality: ex.qualityScore,
                tags: ex.tags
            })).join('\n');
            filename = `${dataset.name.replace(/\s+/g, '_')}_audio.jsonl`;
        } else if (datasetExportFormat === 'csv') {
            const headers = 'prompt,audio_path,duration,model,quality,tags';
            const rows = dataset.examples.map(ex =>
                `"${ex.prompt.replace(/"/g, '""')}","${ex.audioPath || ''}",${ex.duration},"${ex.model}",${ex.qualityScore},"${ex.tags.join(';')}"`
            );
            content = [headers, ...rows].join('\n');
            filename = `${dataset.name.replace(/\s+/g, '_')}_audio.csv`;
        } else {
            content = JSON.stringify(dataset, null, 2);
            filename = `${dataset.name.replace(/\s+/g, '_')}_audio_full.json`;
        }

        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleGeneratedSelection = (id: string) => {
        setSelectedGeneratedAudio(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Render Datasets
    const renderDatasets = () => (
        <div className="flex h-full overflow-hidden">
            {/* Dataset List Sidebar */}
            <div className="w-64 border-r theme-border flex flex-col theme-bg-secondary">
                <div className="p-3 border-b theme-border">
                    <button
                        onClick={() => setShowCreateDataset(true)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> New Dataset
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {audioDatasets.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            <Package size={32} className="mx-auto mb-2 opacity-50"/>
                            <p>No datasets yet</p>
                            <p className="text-xs mt-1">Create one to start collecting training data</p>
                        </div>
                    ) : (
                        audioDatasets.map(dataset => (
                            <div
                                key={dataset.id}
                                onClick={() => setSelectedDatasetId(dataset.id)}
                                className={`p-3 rounded cursor-pointer ${
                                    selectedDatasetId === dataset.id
                                        ? 'bg-purple-600/20 border border-purple-500/50'
                                        : 'hover:bg-gray-700/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{dataset.name}</span>
                                    <span className="text-xs text-gray-500">{dataset.examples.length}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {new Date(dataset.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Dataset Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedDataset ? (
                    <>
                        {/* Dataset Header */}
                        <div className="p-4 border-b theme-border flex items-center justify-between bg-gray-800/50">
                            <div>
                                <h4 className="font-semibold">{selectedDataset.name}</h4>
                                <p className="text-xs text-gray-500">
                                    {selectedDataset.examples.length} audio samples
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={datasetExportFormat}
                                    onChange={(e) => setDatasetExportFormat(e.target.value as any)}
                                    className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded"
                                >
                                    <option value="jsonl">JSONL</option>
                                    <option value="csv">CSV</option>
                                    <option value="json">Full JSON</option>
                                </select>
                                <button
                                    onClick={() => exportAudioDataset(selectedDataset)}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs flex items-center gap-1"
                                >
                                    <Download size={12} /> Export
                                </button>
                                <button
                                    onClick={() => deleteAudioDataset(selectedDataset.id)}
                                    className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        {/* Examples List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {selectedDataset.examples.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Layers size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>No samples in this dataset</p>
                                    <p className="text-xs mt-1">Generate audio and add it here</p>
                                </div>
                            ) : (
                                selectedDataset.examples.map(ex => (
                                    <div key={ex.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Music size={24} className="text-purple-400"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{ex.prompt}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span>{formatTime(ex.duration)}</span>
                                                    <span className="px-1.5 py-0.5 bg-gray-700 rounded">{ex.model}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Quality:</span>
                                                {[1, 2, 3, 4, 5].map(score => (
                                                    <button
                                                        key={score}
                                                        onClick={() => updateAudioExampleQuality(selectedDataset.id, ex.id, score)}
                                                        className={`p-0.5 ${ex.qualityScore >= score ? 'text-purple-400' : 'text-gray-600'}`}
                                                    >
                                                        <Star size={14} fill={ex.qualityScore >= score ? 'currentColor' : 'none'} />
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="text-purple-400 hover:text-purple-300">
                                                    <Play size={14} />
                                                </button>
                                                <button
                                                    onClick={() => removeAudioExample(selectedDataset.id, ex.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Package size={48} className="mx-auto mb-3 opacity-50" />
                            <p>Select a dataset or create a new one</p>
                            <p className="text-xs mt-2">Use the Generate tab to create audio, then add it to datasets</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Dataset Modal */}
            {showCreateDataset && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]" onClick={() => setShowCreateDataset(false)}>
                    <div className="bg-gray-800 rounded-lg shadow-xl w-96 p-6" onClick={e => e.stopPropagation()}>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Package className="text-purple-400" size={18} />
                            Create Audio Dataset
                        </h4>
                        <input
                            type="text"
                            value={newDatasetName}
                            onChange={(e) => setNewDatasetName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createAudioDataset()}
                            placeholder="Dataset name..."
                            className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded focus:border-purple-500 focus:outline-none mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateDataset(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createAudioDataset}
                                disabled={!newDatasetName.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                {renderSidebar()}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Mode Selector */}
                    <div className="absolute top-2 left-2 z-30">
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 hover:bg-gray-700 rounded-lg border border-gray-600 text-sm backdrop-blur-sm">
                                <CurrentModeIcon size={16} className="text-purple-400"/>
                                <span className="font-medium">{currentMode_obj.name}</span>
                                <ChevronRight size={14} className="text-gray-500 rotate-90"/>
                            </button>
                            <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-600 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                <div className="py-1">
                                    {['browse', 'create', 'edit', 'analyze', 'train'].map(group => (
                                        <React.Fragment key={group}>
                                            <div className="px-3 py-1 text-xs text-gray-500 uppercase">{group}</div>
                                            {SCHERZO_MODES.filter(m => m.group === group).map(mode => {
                                                const ModeIcon = mode.icon;
                                                return (
                                                    <button
                                                        key={mode.id}
                                                        onClick={() => setActiveMode(mode.id)}
                                                        className={`w-full px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-gray-700 ${
                                                            activeMode === mode.id ? 'text-purple-400 bg-purple-600/20' : 'text-gray-300'
                                                        }`}
                                                    >
                                                        <ModeIcon size={14}/>{mode.name}
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {activeMode === 'library' && renderLibrary()}
                    {activeMode === 'generator' && renderGenerator()}
                    {activeMode === 'editor' && renderEditor()}
                    {activeMode === 'dj' && renderDJMixer()}
                    {activeMode === 'analysis' && renderAnalysis()}
                    {activeMode === 'notation' && renderNotation()}
                    {activeMode === 'datasets' && renderDatasets()}
                </main>
            </div>
        </div>
    );
};

export default Scherzo;
