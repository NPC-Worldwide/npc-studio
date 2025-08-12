import React, { useState, useEffect } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';
import { selectionModePlugin } from '@react-pdf-viewer/selection-mode';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

const PdfViewer = ({ filePath, highlights, onTextSelect, onContextMenu }) => {
  const [pdfData, setPdfData] = useState(null);
  const [currentSelection, setCurrentSelection] = useState(null);

  console.log('[PDF_VIEWER] Component rendered with props:', {
    filePath,
    highlightsCount: highlights?.length || 0,
    hasOnTextSelect: typeof onTextSelect === 'function',
    hasOnContextMenu: typeof onContextMenu === 'function'
  });

  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin({ highlights });
  const selectionModePluginInstance = selectionModePlugin();

  useEffect(() => {
    console.log('[PDF_VIEWER] useEffect triggered with filePath:', filePath);
    
    if (!filePath) {
      console.log('[PDF_VIEWER] No filePath provided, clearing pdfData');
      setPdfData(null);
      return;
    }
    
    const loadFile = async () => {
      try {
        console.log('[PDF_VIEWER] Loading file:', filePath);
        const buffer = await window.api.readFile(filePath);
        console.log('[PDF_VIEWER] Received buffer:', {
          hasBuffer: !!buffer,
          bufferLength: buffer?.length || 0,
          bufferType: typeof buffer
        });
        
        if (buffer) {
          const blob = new Blob([buffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          console.log('[PDF_VIEWER] Created blob URL:', url);
          setPdfData(url);
        } else {
          throw new Error("Received empty buffer from main process.");
        }
      } catch (err) {
        console.error('[PDF_VIEWER] Error loading PDF blob:', err);
      }
    };
    loadFile();
  }, [filePath]);

  // Try multiple selection event handlers
  const handleSelection = (e) => {
    console.log('[PDF_VIEWER] handleSelection called with event:', e);
    console.log('[PDF_VIEWER] Selection details:', {
      hasEvent: !!e,
      hasSelectedText: !!(e?.selectedText),
      selectedTextLength: e?.selectedText?.length || 0,
      selectedTextPreview: e?.selectedText?.substring(0, 50) || 'none',
      pageIndex: e?.pageIndex,
      eventKeys: e ? Object.keys(e) : []
    });

    if (e && e.selectedText && e.selectedText.trim()) {
      console.log('[PDF_VIEWER] Valid selection detected, storing and calling parent');
      const selectionData = {
        selectedText: e.selectedText,
        pageIndex: e.pageIndex,
        quads: e.selectionRegion?.rects || e.quads || []
      };
      setCurrentSelection(selectionData);
      
      if (onTextSelect) {
        onTextSelect(selectionData);
      }
    } else {
      console.log('[PDF_VIEWER] No valid selection or empty text');
    }
  };

  // Handle document mouse events directly
  useEffect(() => {
    if (!pdfData) return;

    const handleDocumentMouseUp = (e) => {
      console.log('[PDF_VIEWER] Document mouseup detected');
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        console.log('[PDF_VIEWER] Found text selection via window.getSelection:', {
          text: selection.toString().substring(0, 50),
          textLength: selection.toString().length
        });
        
        const selectionData = {
          selectedText: selection.toString(),
          pageIndex: 0, // We don't know the page from this method
          quads: []
        };
        
        setCurrentSelection(selectionData);
        if (onTextSelect) {
          onTextSelect(selectionData);
        }
      }
    };

    // Add a small delay to let the PDF render
    const timer = setTimeout(() => {
      document.addEventListener('mouseup', handleDocumentMouseUp);
    }, 1000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [pdfData, onTextSelect]);

  if (!pdfData) {
    console.log('[PDF_VIEWER] Rendering loading state');
    return <div>Loading PDF...</div>;
  }

  console.log('[PDF_VIEWER] Rendering PDF viewer with data URL');

  return (
    <div 
      style={{ height: '100%', width: '100%' }}
      onContextMenu={(e) => {
        console.log('[PDF_VIEWER] Container context menu triggered');
        console.log('[PDF_VIEWER] Container context menu event:', {
          target: e.target.tagName,
          currentTarget: e.currentTarget.tagName,
          clientX: e.clientX,
          clientY: e.clientY,
          hasCurrentSelection: !!currentSelection
        });
        
        e.preventDefault();
        e.stopPropagation();
        console.log('[PDF_VIEWER] Container prevented default context menu');
        
        // Call the parent's context menu handler
        if (onContextMenu) {
          console.log('[PDF_VIEWER] Calling parent onContextMenu handler');
          onContextMenu(e);
        }
      }}
      onClick={(e) => {
        console.log('[PDF_VIEWER] Container click detected:', {
          target: e.target.tagName,
          currentTarget: e.currentTarget.tagName
        });
      }}
    >
      <Worker workerUrl="/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfData}
          plugins={[
            defaultLayoutPluginInstance,
            highlightPluginInstance,
            selectionModePluginInstance,
          ]}
          onTextSelectionChange={handleSelection}
          onDocumentLoad={(e) => {
            console.log('[PDF_VIEWER] Document loaded:', e);
          }}
        />
      </Worker>
    </div>
  );
};

export default PdfViewer;