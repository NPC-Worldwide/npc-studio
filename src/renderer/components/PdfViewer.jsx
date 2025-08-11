import React, { useState, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

const PdfViewer = ({ filePath }) => {
  const [pdfData, setPdfData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    if (!filePath) {
      setPdfData(null);
      return;
    }
    const loadFile = async () => {
      setLoading(true);
      setError(null);
      try {
        const buffer = await window.api.readFile(filePath);
        if (buffer) {
          const blob = new Blob([buffer], { type: 'application/pdf' });
          setPdfData(URL.createObjectURL(blob));
        } else {
          throw new Error("Received empty buffer from main process.");
        }
      } catch (err) {
        setError(`Failed to load PDF: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [filePath]);

  if (loading) return <div>Loading PDF...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!pdfData) return null;

  return (
    <div style={{ height: '100vh' }}>
        <Worker workerUrl="/pdf.worker.min.js">
        <Viewer fileUrl={pdfData} plugins={[defaultLayoutPluginInstance]} />
      </Worker>
    </div>
  );
};


export default PdfViewer;