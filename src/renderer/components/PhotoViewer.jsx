import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Loader, Image as ImageIcon, Folder,
    Camera, Wand2, Sliders, Grid, Upload, Trash2, Edit,
    MessageSquare, Check, List, LayoutGrid, Save, Undo,
    Redo, Search, Sparkles, Info, Tag, Crop, RotateCw, Type,
    Download, PlusCircle, Copy, ExternalLink, ChevronsRight, GitBranch,
    Layers, Eye, EyeOff, GripVertical, FileJson, FolderOpen, 
    Lasso, 
    RectangleHorizontal, Brush, Eraser, 
  } from 'lucide-react';
  
  // --- Constants ---
  const IMAGES_PER_PAGE = 24;
  

  const DARKROOM_LAYER_TYPES = {
    ADJUSTMENTS: { 
        name: 'Adjustments', 
        icon: Sliders, 
        defaultParams: { exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, saturation: 0, warmth: 0, tint: 0, pop: 0, vignette: 0 } 
    },
    TEXT: { 
        name: 'Text', 
        icon: Type, 
        defaultParams: { content: 'Hello World', font: 'Arial', size: 50, color: '#FFFFFF', x: 100, y: 100 } 
    },
    TRANSFORM: { 
        name: 'Transform', 
        icon: RotateCw, 
        defaultParams: { rotation: 0, scaleX: 1, scaleY: 1 } 
    },
    GENERATIVE_FILL: { 
        name: 'Generative Fill', 
        icon: Sparkles, 
        defaultParams: { prompt: '' } 
    },
};

const defaultTransform = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };


// Utils
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const downloadJSON = (data, filename = 'labels.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
const readJSONFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => { try { resolve(JSON.parse(reader.result)); } catch (e) { reject(e); } };
  reader.onerror = reject;
  reader.readAsText(file);
});

const PhotoViewer = ({ isOpen, onClose, currentPath, onStartConversation }) => {
    const [activeTab, setActiveTab] = useState('gallery');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
  
    // --- File & Directory Management ---
    const [projectPath, setProjectPath] = useState(currentPath || '~/Pictures/My_Project');
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [imageSources, setImageSources] = useState([]);
    const [activeSourceId, setActiveSourceId] = useState('project-images');
  
    // --- Image Selection & Gallery State ---
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageGroup, setSelectedImageGroup] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [displayedImagesCount, setDisplayedImagesCount] = useState(IMAGES_PER_PAGE);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [metaSearch, setMetaSearch] = useState('');
  
    // --- Context Menu & Renaming ---
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
    const [renamingImage, setRenamingImage] = useState({ path: null, newName: '' });
    
    // --- Editor: "The DarkRoom" ---
    // Base image adjustments
    const [adjustments, setAdjustments] = useState({ 
        exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
        saturation: 100, warmth: 0, tint: 0,
        pop: 0, vignette: 0, blur: 0
    });
    // Crop state
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 }); // In percentage
    const [isCropping, setIsCropping] = useState(false); // True when crop overlay is active
    
    // Layer-based editing
    const [layers, setLayers] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const [editorTool, setEditorTool] = useState('select'); // 'select', 'crop', 'lasso', 'marquee', 'brush', 'text'
    
    // Interactive state
    const [selectionPath, setSelectionPath] = useState(null); // SVG path for active selection (marquee/lasso)
    const [isDrawing, setIsDrawing] = useState(false); // General flag for mouse-down drawing/dragging actions
    const [textEditState, setTextEditState] = useState({ editing: false, layerId: null });
    const [draggingLayerId, setDraggingLayerId] = useState(null);

    // History for undo/redo
    const [editHistory, setEditHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
  
    // --- Metadata & Labeling ---
    const [metadata, setMetadata] = useState(null);
    const [customTags, setCustomTags] = useState([]);
    const [rating, setRating] = useState(0);
    const [labels, setLabels] = useState([]);
    
    // --- Refs ---
    const fileInputRef = useRef(null);
    const imageRef = useRef(null); // Ref for the main <img> element in the darkroom
    const canvasContainerRef = useRef(null); // Ref for the container of the image and layers

    // --- Derived State ---
    const activeSource = imageSources.find(s => s.id === activeSourceId);
    const sourceImages = (activeSource?.images || []);
    const filteredImages = sourceImages.filter(img => img.toLowerCase().includes(searchTerm.toLowerCase()));
    

    
    
    const [isDrawingSelection, setIsDrawingSelection] = useState(false); // ADD THIS LINE
    
    
    
    const [compareMode, setCompareMode] = useState(false);
  
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [generatedImages, setGeneratedImages] = useState([]);
  
    // --- Generator State (now integrated into DarkRoom layers) ---
    const [generating, setGenerating] = useState(false);
  
    // --- Metadata State ---
    
    const [activeTool, setActiveTool] = useState('rect');
    const [newLabelName, setNewLabelName] = useState('');
    const [drawing, setDrawing] = useState(false);
    const [drawPoints, setDrawPoints] = useState([]);
    const imgContainerRef = useRef(null);
  
    
    
    
  const loadImagesForAllSources = useCallback(async (sourcesToLoad) => {
    setLoading(true); setError(null);
    try {
      const updatedSources = await Promise.all(
        sourcesToLoad.map(async (source) => {
          try {
            // This is the real implementation that reads from your file system via the Electron API
            await window.api?.ensureDirectory?.(source.path);
            const images = await window.api?.readDirectoryImages?.(source.path) || [];
            return { ...source, images };
          } catch (err) {
            console.error('Source load failed:', source, err);
            return { ...source, images: [] };
          }
        })
      );
      setImageSources(updatedSources);
    } catch (err) {
      setError('Failed to load image sources: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      const initialSources = [
        { id: 'project-images', name: 'Project Images', path: projectPath, icon: Folder },
        { id: 'global-images', name: 'Global Images', path: '~/.npcsh/images', icon: ImageIcon },
        { id: 'screenshots', name: 'Screenshots', path: '~/.npcsh/screenshots', icon: Camera },
      ];
      loadImagesForAllSources(initialSources);
    } else {
      // Reset everything on close
      setActiveTab('gallery');
      setSelectedImage(null);
      setSelectedImageGroup(new Set());
      setDisplayedImagesCount(IMAGES_PER_PAGE);
      setLayers([]);
      setLabels([]);
      setMetadata(null);
      setCustomTags([]);
      setRating(0);
    }
  }, [isOpen, projectPath, loadImagesForAllSources]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (contextMenu.visible) setContextMenu({ visible: false });
        else if (renamingImage.path) setRenamingImage({ path: null, newName: '' });
        else if (isEditingPath) setIsEditingPath(false);
        else onClose?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') handleUndo();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') handleRedo();
      if (e.key === 'Enter' && isEditingPath) setIsEditingPath(false);
    };
    const handleClickOutside = () => contextMenu.visible && setContextMenu({ visible: false });
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose, contextMenu.visible, renamingImage.path, isEditingPath]);

  useEffect(() => { setDisplayedImagesCount(IMAGES_PER_PAGE); }, [activeSourceId, searchTerm]);

  useEffect(() => {
    if (!selectedImage) return;
    // Reset all editor/data states for the new image
    setLayers([]); 
    setSelectedLayerId(null);
    setEditHistory([]); setRedoStack([]); setCompareMode(false);
    
    // In a real app, you would load the saved pipeline for this image here.
    // For now, we start fresh.

    // Mock Metadata/Label loading
    setMetadata({ iptc: { title: 'A beautiful landscape' }, exif: { camera: 'SONY ILCE-7RM3' } });
    setCustomTags(['landscape', 'sunset']);
    setLabels([]);
  }, [selectedImage]);
  // --- Handlers (Most are unchanged from original code) ---
  const handleImageClick = (e, imgPath, index) => { /* ... (unchanged) ... */ 
    e.stopPropagation(); setRenamingImage({ path: null, newName: '' });
    const newSelection = new Set(selectedImageGroup);
    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index); const end = Math.max(lastClickedIndex, index);
      for (let i = start; i <= end; i++) newSelection.add(filteredImages[i]);
    } else if (e.ctrlKey || e.metaKey) {
      newSelection.has(imgPath) ? newSelection.delete(imgPath) : newSelection.add(imgPath);
    } else {
      newSelection.clear(); newSelection.add(imgPath);
    }
    setSelectedImage(imgPath); setSelectedImageGroup(newSelection); setLastClickedIndex(index);
  };
  const handleContextMenu = (e, imgPath) => { /* ... (unchanged) ... */ 
    e.preventDefault(); e.stopPropagation();
    if (!selectedImageGroup.has(imgPath)) { setSelectedImage(imgPath); setSelectedImageGroup(new Set([imgPath])); }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };
  const handleRenameStart = () => { /* ... (unchanged) ... */ 
    setRenamingImage({ path: selectedImage, newName: selectedImage.split('/').pop() }); setContextMenu({ visible: false });
  };
  const handleRenameSubmit = async () => { /* ... (unchanged) ... */ };
  const handleDeleteSelected = async () => { /* ... (unchanged) ... */ };
  const handleStartConversation = () => { /* ... (unchanged) ... */ 
      onStartConversation?.(Array.from(selectedImageGroup).map(p => ({ path: p.replace('media://', '') }))); onClose?.();
  };

  
  // History Management
  const pushHistory = (actionName) => { 
      console.log(`Pushing history: ${actionName}`);
      setEditHistory(h => [...h, { layers, adjustments, crop }]); 
      setRedoStack([]); 
  };

  const handleUndo = () => {
    if (activeTab !== 'editor' || editHistory.length === 0) return;
    setEditHistory(h => {
        const previousState = h[h.length - 1];
        setRedoStack(r => [{ layers, selectedLayerId, adjustments }, ...r]);
        setLayers(previousState.layers);
        setSelectedLayerId(previousState.selectedLayerId);
        setAdjustments(previousState.adjustments);
        return h.slice(0, -1);
    });
  };
  const handleRedo = () => {
     if (activeTab !== 'editor' || redoStack.length === 0) return;
     setRedoStack(r => {
        const [nextState, ...rest] = r;
        setEditHistory(h => [...h, { layers, selectedLayerId, adjustments }]);
        setLayers(nextState.layers);
        setSelectedLayerId(nextState.selectedLayerId);
        setAdjustments(nextState.adjustments);
        return rest;
     });
  };

  // --- DarkRoom Editor Handlers ---
  const addDarkroomLayer = (type) => {
    const layerConfig = DARKROOM_LAYER_TYPES[type];
    if (!layerConfig) return;

    // All layers get a transform property for positioning, scaling, and rotation.
    const newLayer = { 
        id: `layer_${Date.now()}`, 
        type, 
        name: layerConfig.name, 
        visible: true, 
        params: { ...layerConfig.defaultParams }, 
        transform: { ...defaultTransform }, 
        mask: null 
    };
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    setSelectedLayerId(newLayer.id);
    pushHistory(`Add ${layerConfig.name} Layer`);
};

const updateLayer = (layerId, newProps, commit = false) => {
    setLayers(currentLayers => 
        currentLayers.map(l => l.id === layerId ? { ...l, ...newProps } : l)
    );
    if(commit) { pushHistory('Update Layer'); }
};

const updateLayerParams = (layerId, newParams, commit = false) => {
    setLayers(currentLayers =>
        currentLayers.map(l => l.id === layerId ? { ...l, params: { ...l.params, ...newParams } } : l)
    );
    if(commit) { pushHistory('Update Layer Params'); }
};

const updateLayerTransform = (layerId, newTransform, commit = false) => {
    setLayers(currentLayers =>
        currentLayers.map(l => l.id === layerId ? { ...l, transform: { ...l.transform, ...newTransform } } : l)
    );
    if(commit) { pushHistory('Transform Layer'); }
};


const getRelativeCoords = (e) => {
    const container = canvasContainerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
        x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((e.clientY - rect.top) / rect.height, 0, 1)
    };
};


const commitLayerParams = () => { pushHistory({ layers, selectedLayerId, adjustments }); };


const executeGenerativeFill = async (layerId, prompt) => { /* ... Unchanged ... */ };

  // --- Hybrid Rendering Logic ---

  const maskCanvasRef = useRef(null); // Ref for the mask drawing canvas

  const calculateCombinedStyle = () => {
    console.log('Calculating combined style with adjustments:', adjustments);
    
    // Start with the base adjustments state
    let combined = { ...adjustments };

    // Aggregate parameters from all active adjustment layers
    layers
        .filter(l => l.type === 'ADJUSTMENTS' && l.visible)
        .forEach(layer => {
            Object.keys(layer.params).forEach(key => {
                combined[key] = (combined[key] || 0) + layer.params[key];
            });
        });

    // Convert aggregated values into a complex CSS filter string
    const brightness = 100 + combined.exposure + (combined.whites / 2.5) + (combined.shadows / -2.5);
    const contrast = 100 + combined.contrast + (combined.pop / 2) + (combined.highlights / 2.5) - (combined.shadows / 2.5);
    const saturate = combined.saturation + (combined.pop);
    const sepia = combined.warmth > 0 ? combined.warmth / 2 : 0;
    const hueRotate = combined.tint;
    
    const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hueRotate}deg) blur(${combined.blur || 0}px)`;
    
    console.log('Generated filter style:', filterStyle);
    
    return {
        filter: filterStyle
    };
};

// Add missing mouse handlers:
const handleCanvasMouseDown = (e) => {
    console.log('Canvas mouse down, tool:', editorTool);
    if (e.target !== canvasContainerRef.current) return;
    
    setIsDrawing(true);
    const startCoords = getRelativeCoords(e);
    if (!startCoords) return;

    console.log('Start coords:', startCoords);

    switch(editorTool) {
        case 'text':
            console.log('Adding text layer');
            addDarkroomLayer('TEXT');
            break;
        // Add other cases
    }
};

const handleCanvasMouseMove = (e) => {
    if (!isDrawing) return;
    // Handle mouse move logic
};

const handleCanvasMouseUp = () => {
    console.log('Canvas mouse up');
    setIsDrawing(false);
};

// Fix the missing handleBaseAdjustmentChange:
const handleBaseAdjustmentChange = (key, value) => {
    console.log(`Adjusting ${key} to ${value}`);
    setAdjustments(prev => ({ ...prev, [key]: value }));
};


const applySelectionAsMask = () => {
    if (!selectionPath || !selectedLayerId) return;
    updateLayer(selectedLayerId, { mask: selectionPath }, true);
    setSelectionPath(null); // Clear selection after applying
};


useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (contextMenu.visible) setContextMenu({ visible: false });
            else if (renamingImage.path) setRenamingImage({ path: null, newName: '' });
            else if (isEditingPath) setIsEditingPath(false);
            else if (selectionPath) setSelectionPath(null);
            else if (isCropping) setIsCropping(false);
            else onClose?.();
        }
        if ((e.ctrlKey || e.metaKey) && !textEditState.editing) {
            if (e.key.toLowerCase() === 'z') handleUndo();
            if (e.key.toLowerCase() === 'y') handleRedo();
        }
        if (e.key === 'Enter' && isEditingPath) setIsEditingPath(false);
    };
    const handleClickOutside = () => contextMenu.visible && setContextMenu({ visible: false });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('click', handleClickOutside);
    };
}, [isOpen, onClose, contextMenu.visible, renamingImage.path, isEditingPath, selectionPath, isCropping, textEditState.editing]);



useEffect(() => { setDisplayedImagesCount(IMAGES_PER_PAGE); }, [activeSourceId, searchTerm]);

useEffect(() => {
    if (!selectedImage) return;
    
    // Reset ALL editor states for the new image
    setAdjustments({ exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0, saturation: 100, warmth: 0, tint: 0, pop: 0, vignette: 0, blur: 0 });
    setCrop({ x: 0, y: 0, width: 100, height: 100 });
    setLayers([]); 
    setSelectedLayerId(null);
    setEditHistory([]); 
    setRedoStack([]);
    setSelectionPath(null);
    setIsCropping(false);
    setEditorTool('select');
    
    // In a real app, you would load saved settings for this image here.
    // For now, we just load metadata.
    const fsPath = selectedImage.replace('media://', '');
    window.api?.getImageMetadata?.(fsPath).then(m => { setMetadata(m || {}); /* ... */ });
    window.api?.loadLabels?.(fsPath).then(ls => setLabels(Array.isArray(ls) ? ls : []));
}, [selectedImage]);

  useEffect(() => {
    // It will only run its logic when the editor is active and an image is selected
    if (activeTab !== 'editor' || !selectedImage) return;

    const canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.src = selectedImage; // In a real app, use the actual file path
    img.onload = () => {
        // Fit canvas to image aspect ratio within the container
        const container = canvas.parentElement;
        const hRatio = container.clientWidth / img.width;
        const vRatio = container.clientHeight / img.height;
        const ratio = Math.min(hRatio, vRatio, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // TODO: Render layers and selection path here
        console.log("Canvas ready for layer rendering.");
    };

  }, [selectedImage, layers, selectionPath, activeTab]);

  
  


  const startDraw = (e) => {
    if (!selectedImage) return;
    const ne = e.nativeEvent.touches?.[0] || e;
    const p = getRelativeCoords(ne.clientX, ne.clientY);
    setDrawing(true);
    if (activeTool === 'rect') setDrawPoints([p, p]);
    if (activeTool === 'point') {
      const point = { id: crypto.randomUUID(), type: 'point', coords: [p], label: newLabelName || 'Point' };
      setLabels((ls) => [...ls, point]);
    }
    if (activeTool === 'polygon') setDrawPoints([p]);
  };

  const moveDraw = (e) => {
    if (!drawing) return;
    const ne = e.nativeEvent.touches?.[0] || e;
    const p = getRelativeCoords(ne.clientX, ne.clientY);
    setDrawPoints((pts) => {
      if (activeTool === 'rect' && pts.length === 2) return [pts[0], p];
      if (activeTool === 'polygon' && pts.length >= 1) return [...pts.slice(0, -1), p];
      return pts;
    });
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    if (activeTool === 'rect' && drawPoints.length === 2) {
      const [a, b] = drawPoints;
      const rect = { id: crypto.randomUUID(), type: 'rect', coords: [a, b], label: newLabelName || 'Box' };
      setLabels((ls) => [...ls, rect]);
    }
    if (activeTool === 'polygon') {
      if (drawPoints.length >= 3) {
        const poly = { id: crypto.randomUUID(), type: 'polygon', coords: drawPoints.slice(0, -1), label: newLabelName || 'Poly' };
        setLabels((ls) => [...ls, poly]);
      }
    }
    setDrawPoints([]);
  };

  const addPolygonVertex = (e) => {
    if (!drawing || activeTool !== 'polygon') return;
    const ne = e.nativeEvent.touches?.[0] || e;
    const p = getRelativeCoords(ne.clientX, ne.clientY);
    setDrawPoints((pts) => [...pts.slice(0, -1), p, p]);
  };

  const removeLabel = (id) => setLabels((ls) => ls.filter(l => l.id !== id));
  const saveLabels = async () => {
    if (!selectedImage) return;
    const fsPath = selectedImage.replace('media://', '');
    try { await window.api?.saveLabels?.(fsPath, labels); }
    catch (e) { console.error('Failed to save labels', e); setError('Failed to save labels'); }
  };
  const exportLabels = () => {
    const payload = { image: selectedImage, labels };
    downloadJSON(payload, `${selectedImage?.split('/').pop() || 'labels'}.labels.json`);
  };
  const importLabels = async (file) => {
    try {
      const json = await readJSONFile(file);
      if (Array.isArray(json)) setLabels(json);
      else if (Array.isArray(json.labels)) setLabels(json.labels);
    } catch (e) { setError('Invalid labels file'); }
  };

  // --- Metadata ---
  const updateMetaField = (path, value) => {
    setMetadata((m) => {
      const clone = { ...(m || {}) };
      const keys = path.split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        ref[k] = ref[k] || {};
        ref = ref[k];
      }
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
  };
  const saveMetadata = async () => {
    if (!selectedImage) return;
    const fsPath = selectedImage.replace('media://', '');
    try {
      await window.api?.updateImageMetadata?.(fsPath, { ...metadata, custom: { ...(metadata?.custom || {}), tags: customTags } });
    } catch (e) {
      console.error('Save metadata failed', e);
      setError('Save metadata failed');
    }
  };
  const applyMetadataToSelection = async () => {
    if (selectedImageGroup.size === 0 || !metadata) return;
    const targets = Array.from(selectedImageGroup).map(p => p.replace('media://', ''));
    try {
      await Promise.all(targets.map(t =>
        window.api?.updateImageMetadata?.(t, { ...metadata, custom: { ...(metadata?.custom || {}), tags: customTags } })
      ));
    } catch (e) { setError('Batch metadata update failed'); }
  };



  
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      await window.api?.saveUploadedFiles?.(files.map(f => ({ name: f.name, blob: f })), activeSource?.path);
      await loadImagesForAllSources(imageSources);
    } catch (err) { setError('Upload failed: ' + err.message); }
  };
  // --- Renderers ---
  const renderSidebar = () => (
    <div className="w-64 border-r theme-border flex flex-col flex-shrink-0 theme-sidebar">

      <div className="p-3 border-b theme-border">
        <h4 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-2">Sources</h4>
        {imageSources.map(source => (
          <button key={source.id} onClick={() => setActiveSourceId(source.id)}
            className={`w-full text-left p-2 rounded text-sm mb-1 flex items-center gap-2 ${activeSourceId === source.id ? 'theme-button-primary' : 'theme-hover'}`}>
            <source.icon size={14} /> <span>{source.name}</span>
            <span className="ml-auto text-xs theme-text-muted">({source.images?.length || 0})</span>
          </button>
        ))}
      </div>
      <div className="p-3 border-b theme-border">
        <h4 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-2">View Options</h4>
        <div className="flex gap-1 mb-2">
          <button onClick={() => setViewMode('grid')}
            className={`flex-1 p-2 rounded flex items-center justify-center gap-2 ${viewMode === 'grid' ? 'theme-button-primary' : 'theme-hover'}`}>
            <LayoutGrid size={14} /></button>
          <button onClick={() => setViewMode('list')}
            className={`flex-1 p-2 rounded flex items-center justify-center gap-2 ${viewMode === 'list' ? 'theme-button-primary' : 'theme-button theme-hover'}`}>
            <List size={14} /></button>
        </div>
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 theme-text-muted" />
          <input type="text" placeholder="Filter by name..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 theme-input text-sm rounded" /></div>
        <div className="relative mt-2"><Search size={14} className="absolute left-2.5 top-2.5 theme-text-muted" />
          <input type="text" placeholder="Filter by metadata (keyword)…" value={metaSearch}
            onChange={e => setMetaSearch(e.target.value)} className="w-full pl-8 theme-input text-sm rounded" /></div>
      </div>
      <div className="p-3 flex-1 overflow-y-auto">
        {selectedImageGroup.size > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">Batch Actions</h4>
            <button className="w-full theme-button flex items-center gap-2 justify-center text-sm py-2 rounded"
              onClick={applyMetadataToSelection}><Save size={14} /> Apply Metadata</button>
            <button className="w-full theme-button flex items-center gap-2 justify-center text-sm py-2 rounded"
              onClick={() => setActiveTab('labeling')}><Tag size={14} /> Label Selected</button>
            <button className="w-full theme-button flex items-center gap-2 justify-center text-sm py-2 rounded"
              onClick={handleDeleteSelected}><Trash2 size={14} /> Delete ({selectedImageGroup.size})</button>
          </div>
        )}
      </div>
      <div className="p-3 border-t theme-border">
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadFiles} />
        <button className="w-full theme-button-primary flex items-center justify-center gap-2 text-sm py-2 rounded"
          onClick={handleUploadClick}><Upload size={16} /> Upload Image</button>
      </div>
    </div>
  );

  const renderGallery = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b theme-border bg-gray-800/40">
        <div className="flex items-center gap-2 text-xs theme-text-muted">
          <span>{filteredImages.length} items</span>
          {selectedImageGroup.size > 0 && <span>• {selectedImageGroup.size} selected</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="theme-button px-3 py-1 text-sm rounded" onClick={() => setActiveTab('metadata')}>
            <Info size={14} /> Edit Metadata</button>
          <button className="theme-button px-3 py-1 text-sm rounded" onClick={() => setActiveTab('labeling')}>
            <Tag size={14} /> Label</button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className={`gap-4 ${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8' : 'space-y-2'}`}>
          {loading ? (
            <div className="col-span-full flex justify-center p-8"><Loader className="animate-spin" /></div>
          ) : filteredImages.length > 0 ? (
            filteredImages.slice(0, displayedImagesCount).map((img, index) => {
              const isSelected = selectedImageGroup.has(img);
              const isRenaming = renamingImage.path === img;
              return isRenaming ? (
                <div key={img} className="relative aspect-square">
                  <input type="text" value={renamingImage.newName}
                    onChange={(e) => setRenamingImage(p => ({ ...p, newName: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                    onBlur={handleRenameSubmit} className="w-full h-full p-2 theme-input text-xs" autoFocus />
                </div>
              ) : (
                <button key={img}
                  onClick={(e) => handleImageClick(e, img, index)}
                  onContextMenu={(e) => handleContextMenu(e, img)}
                  className="group relative block rounded-lg overflow-hidden focus:outline-none aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover bg-gray-800" />
                  <div className={`absolute inset-0 transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-blue-500' : 'group-hover:bg-black/40'}`}></div>
                  {isSelected && <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1"><Check size={12} className="text-white" /></div>}
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center p-8 theme-text-muted">No images found.</div>
          )}
        </div>
      </div>
      {filteredImages.length > displayedImagesCount && (
        <div className="p-4 border-t theme-border text-center">
          <button onClick={() => setDisplayedImagesCount(prev => prev + IMAGES_PER_PAGE)}
            className="theme-button px-4 py-2 text-sm rounded">Load More</button>
        </div>
      )}
    </div>
  );

  
  const renderGenerator = () => (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto relative">
        {generating && <div className="col-span-full row-span-full absolute inset-0 bg-black/50 flex items-center justify-center z-10"><Loader className="animate-spin text-white" /></div>}
        {generatedImages.length > 0 ? generatedImages.map(img => (
          <div key={img} className="relative">
            <img src={img} className="w-full h-full object-cover rounded-lg shadow-md aspect-square" alt="" />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button className="theme-button px-2 py-1 text-xs rounded" onClick={() => setSelectedImage(img)}>Use</button>
              <a className="theme-button px-2 py-1 text-xs rounded" href={img} download><Download size={12} /></a>
            </div>
          </div>
        )) : <div className="col-span-full text-center flex items-center justify-center theme-text-muted">Generated images will appear here.</div>}
      </div>
      <div className="w-96 border-l theme-border theme-bg-secondary p-4 space-y-4 flex flex-col">
        <h4 className="text-lg font-semibold">Image Generation</h4>
        <div className="flex-1 space-y-4">
          <div>
            <label className="text-sm font-medium">Prompt</label>
            <textarea value={generatePrompt} onChange={e => setGeneratePrompt(e.target.value)} rows={6}
              className="w-full theme-input mt-1 text-sm" placeholder="A photorealistic image of..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                if (!generatePrompt) return;
                setGenerating(true);
                try {
                  const imgs = await window.api?.generateImages?.({ prompt: generatePrompt, n: 4 }) || [];
                  setGeneratedImages(imgs.map(p => p.startsWith('media://') ? p : `media://${p}`));
                } catch (e) { setError('Generation failed'); }
                setGenerating(false);
              }}
              className="w-full theme-button-primary py-3 text-base rounded flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={!generatePrompt}
            >
              <Sparkles size={16} />Generate
            </button>
            <button onClick={() => setGeneratedImages([])} className="theme-button py-3 text-base rounded">Clear</button>
          </div>
        </div>
        <div className="text-xs theme-text-muted">Wire to your backend via <code>window.api.generateImages</code>.</div>
      </div>
    </div>
  );






  const renderMetadata = () => (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex items-center justify-center bg-gray-900 relative p-4">{selectedImage ? <img src={selectedImage} alt="Metadata" className="max-w-full max-h-full object-contain rounded shadow" /> : <p className="theme-text-muted">Select an image to view metadata</p>}</div>
      <div className="w-96 border-l theme-border theme-bg-secondary p-4 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between"><h4 className="text-lg font-semibold">Image Details</h4><button onClick={saveMetadata} className="theme-button-primary px-3 py-1 rounded flex items-center gap-2"><Save size={14} />Save</button></div>
        {!metadata ? <p className="theme-text-muted">No metadata loaded.</p> : (
          <>
            <Section title="General">
              <StarRating rating={rating} setRating={setRating} />
              <Field label="Title" value={metadata?.iptc?.title || ''} onChange={v => updateMetaField('iptc.title', v)} />
              <Field label="Description" value={metadata?.iptc?.description || ''} onChange={v => updateMetaField('iptc.description', v)} multiline />
              <TagsEditor tags={customTags} setTags={setCustomTags} />
            </Section>
            
            <details className="theme-border border rounded-lg" open>
                <summary className="p-3 cursor-pointer text-sm font-semibold">Camera Details (EXIF)</summary>
                <div className="p-3 border-t theme-border space-y-2">
                    <Field label="Camera" value={metadata?.exif?.camera || 'N/A'} onChange={v => updateMetaField('exif.camera', v)} />
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="ISO" value={metadata?.exif?.iso || 'N/A'} onChange={v => updateMetaField('exif.iso', v)} />
                        <Field label="Aperture" value={metadata?.exif?.aperture || 'N/A'} onChange={v => updateMetaField('exif.aperture', v)} />
                    </div>
                </div>
            </details>

            <details className="theme-border border rounded-lg">
                <summary className="p-3 cursor-pointer text-sm font-semibold">Rights & Credits</summary>
                <div className="p-3 border-t theme-border space-y-2">
                    <Field label="Creator" value={metadata?.iptc?.creator || ''} onChange={v => updateMetaField('iptc.creator', v)} />
                    <Field label="Copyright" value={metadata?.iptc?.copyright || ''} onChange={(v) => updateMetaField('iptc.copyright', v)} />
                </div>
            </details>
          </>
        )}
      </div>
    </div>
  );


  const renderPathNavigator = () => (
    <div className="flex items-center gap-2 text-sm text-gray-400 p-2 flex-grow min-w-0" onClick={() => setIsEditingPath(true)}>
        <FolderOpen size={16} className="flex-shrink-0 text-gray-500" />
        {isEditingPath ? (
            <input type="text" value={projectPath} onChange={e => setProjectPath(e.target.value)}
                   className="theme-input bg-transparent text-gray-300 w-full" autoFocus onBlur={() => setIsEditingPath(false)} />
        ) : (
            <div className="flex items-center gap-1 truncate">
                {projectPath.split('/').map((part, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="text-gray-600">/</span>}
                        <button className="px-1 rounded hover:bg-gray-700">{part || '/'}</button>
                    </React.Fragment>
                ))}
            </div>
        )}
    </div>
  );
  const renderLabeling = () => (
    <div className="flex-1 flex overflow-hidden">
      <div
        className="flex-1 relative bg-gray-900 flex items-center justify-center select-none"
        ref={imgContainerRef}
        onMouseDown={startDraw} onMouseMove={moveDraw} onMouseUp={endDraw} onDoubleClick={addPolygonVertex}
        onTouchStart={startDraw} onTouchMove={moveDraw} onTouchEnd={endDraw}
      >
        {selectedImage ? (
          <>
            <img src={selectedImage} alt="Labeling" className="max-w-full max-h-full object-contain" />
            {drawing && drawPoints.length > 0 && (
              <OverlayShape points={drawPoints} type={activeTool} containerRef={imgContainerRef} />
            )}
            {labels.map((l) => (
              <PlacedShape key={l.id} shape={l} containerRef={imgContainerRef} onRemove={() => removeLabel(l.id)} />
            ))}
          </>
        ) : (<p className="theme-text-muted">Select an image to label</p>)}
      </div>
      <div className="w-80 border-l theme-border theme-bg-secondary p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Labels</h4>
          <div className="flex gap-2">
            <button className="theme-button" onClick={saveLabels}><Save size={14} /></button>
            <button className="theme-button" onClick={exportLabels}><Download size={14} /></button>
            <label className="theme-button cursor-pointer">
              <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importLabels(e.target.files[0])} />
              <ExternalLink size={14} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['rect', 'polygon', 'point'].map(t => (
            <button key={t} className={`theme-button py-1 rounded ${activeTool === t ? 'theme-button-primary' : ''}`}
              onClick={() => { setActiveTool(t); setDrawing(false); setDrawPoints([]); }}>{t}</button>
          ))}
        </div>
        <div>
          <label className="text-sm">Label Name</label>
          <input className="w-full theme-input mt-1" value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="Person / Car / Tree…" />
        </div>
        <div className="space-y-2">
          {labels.length === 0 ? (
            <div className="theme-text-muted text-sm">No labels yet. Choose a tool and draw on the image.</div>
          ) : labels.map((l) => (
            <div key={l.id} className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span className="truncate text-sm">{l.label} <span className="opacity-60">({l.type})</span></span>
              <button className="theme-button px-2 py-1 text-xs" onClick={() => removeLabel(l.id)}><X size={12} /></button>
            </div>
          ))}
        </div>
        <div className="border-t theme-border pt-3">
          <h5 className="font-semibold mb-2">AI Helpers</h5>
          <button className="theme-button w-full" onClick={async () => {
            if (!selectedImage) return;
            try {
              const fsPath = selectedImage.replace('media://', '');
              const suggestions = await window.api?.suggestLabels?.(fsPath) || [];
              setLabels((ls) => [...ls, ...suggestions]);
            } catch (e) { setError('Auto-labeling failed'); }
          }}><Wand2 size={14} /> Auto-label</button>
        </div>
      </div>
    </div>
  );


  

  const renderDarkRoom = () => {
    // Add this at the start of renderDarkRoom:
console.log('Rendering DarkRoom, selectedImage:', selectedImage);
console.log('Current adjustments:', adjustments);
console.log('Current layers:', layers);
console.log('About to render image with src:', selectedImage);
console.log('Image exists check:', selectedImage ? 'YES' : 'NO');
    return (
        <div className="flex-1 flex overflow-hidden">
            {/* --- Left Toolbar --- */}
            <div className="w-16 border-r theme-border flex flex-col items-center p-2 gap-2 bg-gray-900">
                <h4 className="text-xs font-semibold theme-text-secondary uppercase">Tools</h4>
                <button onClick={() => { setEditorTool('crop'); setIsCropping(true); }} className={`p-2 rounded ${editorTool === 'crop' ? 'theme-button-primary' : 'theme-hover'}`} title="Crop Tool"><Crop size={20}/></button>
                <button onClick={() => { setEditorTool('lasso'); setIsCropping(false); }} className={`p-2 rounded ${editorTool === 'lasso' ? 'theme-button-primary' : 'theme-hover'}`} title="Lasso Select"><Lasso size={20}/></button>
                <button onClick={() => addDarkroomLayer('TEXT')} className={`p-2 rounded`} title="Text Tool"><Type size={20}/></button>

            </div>

            {/* --- Canvas Area --- */}
            <div 
                    ref={canvasContainerRef}
                    className="flex-1 flex items-center justify-center p-4 overflow-hidden relative bg-gray-800/30"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                >



                {selectedImage ? (
                    <div className="relative w-full h-full">
                        <div className="absolute inset-0">
                            <img 
                            ref={imageRef} 
                            src={selectedImage} 
                            style={calculateCombinedStyle()} 
                            className="max-w-full max-h-full object-contain"
                            alt="Main preview"
                            onLoad={() => console.log('Image loaded successfully:', selectedImage)}
                            onError={(e) => console.log('Image failed to load:', selectedImage, e)}
                        />

                            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{boxShadow: `inset 0 0 ${adjustments.vignette * 2.5}px ${adjustments.vignette * 1.5}px rgba(0,0,0,0.9)`}}></div>
                            

                        </div>
                    </div>
                ) : ( <div className="text-center theme-text-muted"><Camera size={48} className="mx-auto mb-4" /><p>Select an image to open</p></div> )}
            </div>

            {/* --- Inspector Panel (Right) --- */}
            <div className="w-80 border-l theme-border theme-bg-secondary flex flex-col">
                <div className="p-4 border-b theme-border"><h4 className="text-lg font-semibold flex items-center gap-2"><Camera size={18}/> DarkRoom</h4></div>
                
                {/* BASE ADJUSTMENTS SECTION */}
                <div className="p-4 border-b theme-border space-y-3 overflow-y-auto">
                    <h5 className="font-semibold text-base">Base Adjustments</h5>
                    <details open><summary className="font-semibold text-sm cursor-pointer">Light</summary>
                        <div className="pt-2 space-y-2">
                            <SliderControl label="Exposure" value={adjustments.exposure} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('exposure', v)} onCommit={pushHistory}/>
                            <SliderControl label="Contrast" value={adjustments.contrast} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('contrast', v)} onCommit={pushHistory}/>
                            <SliderControl label="Highlights" value={adjustments.highlights} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('highlights', v)} onCommit={pushHistory}/>
                            <SliderControl label="Shadows" value={adjustments.shadows} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('shadows', v)} onCommit={pushHistory}/>
                            <SliderControl label="Whites" value={adjustments.whites} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('whites', v)} onCommit={pushHistory}/>
                            <SliderControl label="Blacks" value={adjustments.blacks} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('blacks', v)} onCommit={pushHistory}/>
                        </div>
                    </details>
                    <details open><summary className="font-semibold text-sm cursor-pointer">Color</summary>
                        <div className="pt-2 space-y-2">
                            <SliderControl label="Saturation" value={adjustments.saturation} min={0} max={200} onChange={(v) => handleBaseAdjustmentChange('saturation', v)} onCommit={pushHistory}/>
                            <SliderControl label="Warmth" value={adjustments.warmth} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('warmth', v)} onCommit={pushHistory}/>
                            <SliderControl label="Tint" value={adjustments.tint} min={-100} max={100} onChange={(v) => handleBaseAdjustmentChange('tint', v)} onCommit={pushHistory}/>
                        </div>
                    </details>
                     <details open><summary className="font-semibold text-sm cursor-pointer">Effects</summary>
                        <div className="pt-2 space-y-2">
                            <SliderControl label="Pop" value={adjustments.pop} min={0} max={100} onChange={(v) => handleBaseAdjustmentChange('pop', v)} onCommit={pushHistory}/>
                            <SliderControl label="Vignette" value={adjustments.vignette} min={0} max={100} onChange={(v) => handleBaseAdjustmentChange('vignette', v)} onCommit={pushHistory}/>
                            <SliderControl label="Blur" value={adjustments.blur} min={0} max={20} onChange={(v) => handleBaseAdjustmentChange('blur', v)} onCommit={pushHistory}/>
                        </div>
                    </details>
                </div>

                {/* LAYERS SECTION */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-2 border-b theme-border flex items-center justify-between"><h5 className="font-semibold text-sm flex items-center gap-2"><Layers size={14}/> Layers</h5>
                        <div className="flex gap-1">
                            <button onClick={() => addDarkroomLayer('ADJUSTMENTS')} className="theme-button p-1" title="New Adjustment Layer"><Sliders size={14}/></button>
                            <button onClick={() => addDarkroomLayer('GENERATIVE_FILL')} className="theme-button p-1" title="New Generative Fill Layer"><Sparkles size={14}/></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        <div className={`flex items-center gap-2 p-2 rounded bg-gray-900/50`}><ImageIcon size={14} className="theme-text-muted"/><span className="text-sm font-semibold flex-1">Base Image</span></div>
                        {layers.map(layer => <LayerItem key={layer.id} layer={layer} isSelected={layer.id === selectedLayerId} onSelect={() => setSelectedLayerId(layer.id)} />)}
                    </div>
                    <div className="p-2 border-t theme-border flex-1 overflow-y-auto">
                        <LayerInspector layer={layers.find(l => l.id === selectedLayerId)} onUpdate={updateLayerParams} onCommit={() => pushHistory('Update Layer')} />
                    </div>
                </div>
            </div>
        </div>
    );
};



if (!isOpen) return null;

return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="theme-bg-secondary rounded-lg shadow-xl w-full h-full flex flex-col">
                <header> {/* ... */} </header>
                <div className="flex-1 flex overflow-hidden">
                    {renderSidebar()}
                    <main className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                        <div className="border-b theme-border flex bg-gray-800/50 flex-shrink-0">
                            {[{ id: 'gallery', name: 'Gallery', icon: Grid }, { id: 'editor', name: 'DarkRoom', icon: Sliders }, { id: 'metadata', name: 'Metadata', icon: Info }, { id: 'labeling', name: 'Labeling', icon: Tag }].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 flex items-center gap-2 text-sm border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent theme-text-muted theme-hover'}`}><tab.icon size={16} />{tab.name}</button>
                            ))}
                        </div>
                        {activeTab === 'gallery' && renderGallery()}
                        {activeTab === 'editor' && renderDarkRoom()}
                        {activeTab === 'metadata' && renderMetadata()}
                        {activeTab === 'labeling' && renderLabeling()}
                    </main>
                </div>
            </div>
        </div>
    );
};



// --- Small UI Helpers ---
const Section = ({ title, children }) => (
  <div className="border rounded-lg p-3 theme-border">
    <div className="text-sm font-semibold mb-2">{title}</div>
    {children}
  </div>
);

const Field = ({ label, value, onChange, multiline }) => (
  <div className="mb-2">
    <label className="text-xs uppercase font-semibold theme-text-secondary">{label}</label>
    {multiline ? (
      <textarea className="w-full theme-input mt-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
    ) : (
      <input className="w-full theme-input mt-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

const LayerItem = ({ layer, isSelected, onSelect }) => (
    <div onClick={onSelect} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${isSelected ? 'bg-blue-900/50' : 'hover:bg-gray-700/50'}`}>
        <button className="p-1"><GripVertical size={14} className="theme-text-muted"/></button>
        <button className="p-1">{layer.visible ? <Eye size={14}/> : <EyeOff size={14} className="theme-text-muted"/>}</button>
        <div className="flex items-center gap-2 text-sm flex-1">
            <Layers size={14}/>
            <span>{layer.name}</span>
        </div>
        <button className="p-1"><Trash2 size={14} className="text-red-500/80 hover:text-red-500"/></button>
    </div>
);

const SliderControl = ({ label, value, onChange, onCommit, min = 0, max = 100 }) => (
    <div>
        <label className="text-sm capitalize flex justify-between theme-text-secondary">{label}<span>{value}</span></label>
        <input 
            type="range" 
            min={min} 
            max={max} 
            value={value}
            onChange={e => onChange(parseInt(e.target.value, 10))}
            onMouseUp={onCommit}
            onTouchEnd={onCommit}
            className="w-full mt-1" 
        />
    </div>
);



const LayerInspector = ({ layer, onUpdate, onCommit, onGenerativeFill }) => {
    if (!layer) return <div className="text-center text-sm theme-text-muted p-8">Select a layer to inspect its properties.</div>;
    const { type, params, id, name } = layer;
    const config = DARKROOM_LAYER_TYPES[type];
    if (!config) return null; 
    const LayerIcon = config.icon;

    return (
        <div className="space-y-4">
            <h5 className="font-semibold text-base flex items-center gap-2"><LayerIcon size={16}/> {name}</h5>
            {type === 'ADJUSTMENTS' && (
                <div className="space-y-3">
                    <SliderControl label="Exposure" value={params.exposure} min={-100} max={100} onChange={v => onUpdate(id, { exposure: v })} onCommit={onCommit} />
                    <SliderControl label="Contrast" value={params.contrast} min={-100} max={100} onChange={v => onUpdate(id, { contrast: v })} onCommit={onCommit} />
                    <SliderControl label="Highlights" value={params.highlights} min={-100} max={100} onChange={v => onUpdate(id, { highlights: v })} onCommit={onCommit} />
                    <SliderControl label="Shadows" value={params.shadows} min={-100} max={100} onChange={v => onUpdate(id, { shadows: v })} onCommit={onCommit} />
                    <SliderControl label="Saturation" value={params.saturation} min={-100} max={100} onChange={v => onUpdate(id, { saturation: v })} onCommit={onCommit} />
                    <SliderControl label="Warmth" value={params.warmth} min={-100} max={100} onChange={v => onUpdate(id, { warmth: v })} onCommit={onCommit} />
                    <SliderControl label="Pop" value={params.pop} min={0} max={100} onChange={v => onUpdate(id, { pop: v })} onCommit={onCommit} />
                </div>
            )}
            {type === 'TEXT' && (
                <div className="space-y-3">
                    <Field label="Content" multiline value={params.content} onChange={v => onUpdate(id, { content: v }, true)} />
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Size" value={params.size} onChange={v => onUpdate(id, { size: parseInt(v) || 50 }, true)} />
                        <Field label="Color" value={params.color} onChange={v => onUpdate(id, { color: v }, true)} />
                    </div>
                </div>
            )}
            {type === 'TRANSFORM' && (
                <div className="space-y-3">
                    <SliderControl label="Rotation" value={params.rotation} min={-180} max={180} onChange={v => onUpdate(id, { rotation: v })} onCommit={onCommit} />
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onUpdate(id, { scaleX: params.scaleX * -1 }, true)} className="theme-button text-sm">Flip H</button>
                        <button onClick={() => onUpdate(id, { scaleY: params.scaleY * -1 }, true)} className="theme-button text-sm">Flip V</button>
                    </div>
                </div>
            )}
            {type === 'GENERATIVE_FILL' && (
                <>
                    <Field label="Prompt" multiline value={params.prompt} onChange={v => onUpdate(id, { prompt: v })} />
                    <button onClick={() => onGenerativeFill(id, params.prompt)} className="w-full theme-button-primary flex items-center justify-center gap-2"><Sparkles size={14}/> Fill Selection</button>
                </>
            )}
        </div>
    );
};
const TagsEditor = ({ tags, setTags }) => {
    const [input, setInput] = useState('');
    const add = () => { const t = input.trim(); if (!t || tags.includes(t)) return; setTags([...(tags || []), t]); setInput(''); };
    const remove = (i) => setTags(tags.filter((_, idx) => idx !== i));
    return (
      <div>
        <div className="text-xs uppercase font-semibold theme-text-secondary mb-1">Tags</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {(tags || []).map((t, i) => (
            <span key={`${t}-${i}`} className="px-2 py-0.5 rounded-full text-xs bg-gray-800 flex items-center gap-1">
              {t}<button onClick={() => remove(i)}><X size={10} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 theme-input text-sm" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add tag" />
          <button className="theme-button px-3" onClick={add}><PlusCircle size={14} /></button>
        </div>
      </div>
    );
  };
  
  const OverlayShape = ({ points, type, containerRef }) => {
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return null;
    if (type === 'rect' && points.length === 2) { const [a, b] = points; return <div className="absolute border-2 border-blue-400/80 bg-blue-400/10 pointer-events-none" style={{ left: Math.min(a.x, b.x) * rect.width, top: Math.min(a.y, b.y) * rect.height, width: Math.abs(a.x - b.x) * rect.width, height: Math.abs(a.y - b.y) * rect.height }} />; }
    if (type === 'polygon' && points.length >= 2) return <svg className="absolute inset-0 pointer-events-none"><polyline points={points.map(p => `${p.x * rect.width},${p.y * rect.height}`).join(' ')} fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.8)" strokeWidth={2} /></svg>;
    return null;
  };
  
  const PlacedShape = ({ shape, containerRef, onRemove }) => {
    const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return null;
    const commonLabel = (x, y) => <div style={{ transform: `translate(${x}px, ${y}px)` }} className="absolute"><div className="absolute -top-6 left-0 text-xs bg-black/70 px-1 rounded text-white whitespace-nowrap">{shape.label}</div><button className="absolute -top-3 -right-3 bg-black/70 rounded-full p-0.5 z-10" onClick={onRemove}><X size={10} className="text-white" /></button></div>;
    if (shape.type === 'rect') { const [a, b] = shape.coords; const left = Math.min(a.x, b.x) * rect.width; const top = Math.min(a.y, b.y) * rect.height; return <div className="absolute border-2 border-emerald-400/90 bg-emerald-400/10" style={{ left, top, width: Math.abs(a.x - b.x) * rect.width, height: Math.abs(a.y - b.y) * rect.height }}>{commonLabel(0, 0)}</div>; }
    if (shape.type === 'point') return <div className="absolute" style={{ left: shape.coords[0].x * rect.width, top: shape.coords[0].y * rect.height }}><div className="w-2 h-2 bg-emerald-400 rounded-full -translate-x-1 -translate-y-1"></div>{commonLabel(0, 0)}</div>;
    if (shape.type === 'polygon') return <svg className="absolute inset-0 pointer-events-none"><polygon points={shape.coords.map(p => `${p.x * rect.width},${p.y * rect.height}`).join(' ')} fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.9)" strokeWidth={2} style={{ pointerEvents: 'auto' }} /><foreignObject x={shape.coords[0].x * rect.width} y={shape.coords[0].y * rect.height} width={1} height={1} style={{ overflow: 'visible', pointerEvents: 'auto' }}>{commonLabel(0, 0)}</foreignObject></svg>;
    return null;
  };
  

  const StarRating = ({ rating, setRating }) => (
    <div className="mb-4">
        <label className="text-xs uppercase font-semibold theme-text-secondary">Rating</label>
        <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star === rating ? 0 : star)}>
                    <Star size={22} className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}/>
                </button>
            ))}
        </div>
    </div>
);

export default PhotoViewer;
