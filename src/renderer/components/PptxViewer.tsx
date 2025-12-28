// PptxViewerFull.jsx - FIXED RENDERING
import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import JSZip from 'jszip';
import {
  Save, X, ChevronLeft, ChevronRight, Plus, Copy, Trash2, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, List, IndentIncrease, IndentDecrease, Type,
  Square, Circle
} from 'lucide-react';

const NS = {
  p:  'http://schemas.openxmlformats.org/presentationml/2006/main',
  a:  'http://schemas.openxmlformats.org/drawingml/2006/main',
  r:  'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  pkgRels: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types'
};

// Helper functions (unchanged)
function qNS(doc, nsUri, localName) {
  if (!doc || !nsUri || !localName) return null;
  const elements = doc.getElementsByTagNameNS(nsUri, localName);
  return elements.length > 0 ? elements[0] : null;
}

function qaNS(doc, nsUri, localName) {
  if (!doc || !nsUri || !localName) return [];
  return Array.from(doc.getElementsByTagNameNS(nsUri, localName));
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  if (text.length === 0) return '';
  const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"]|[']/g, (match) => escapeMap[match] || match);
}

// Add this near the top after your NS definitions
async function loadThemeColors(zip) {
  const themeFile = zip.file('ppt/theme/theme1.xml');
  if (!themeFile) return {};
  
  try {
    const themeXml = await themeFile.async('string');
    const themeDoc = new DOMParser().parseFromString(themeXml, 'application/xml');
    
    const colorScheme = qNS(themeDoc, NS.a, 'clrScheme');
    if (!colorScheme) return {};
    
    const colors = {};
    
    // Extract accent1-6, dk1, dk2, lt1, lt2
    const colorNames = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'dk1', 'dk2', 'lt1', 'lt2'];
    
    for (const name of colorNames) {
      const elem = colorScheme.getElementsByTagNameNS(NS.a, name)[0];
      if (elem) {
        const srgbClr = qNS(elem, NS.a, 'srgbClr');
        if (srgbClr) {
          colors[name] = `#${srgbClr.getAttribute('val')}`;
        }
      }
    }
    
    console.log('[PPTX] Theme colors loaded:', colors);
    return colors;
  } catch (e) {
    console.error('[PPTX] Error loading theme colors:', e);
    return {};
  }
}
function htmlForRuns(runs, doc) {
  if (!runs || !Array.isArray(runs)) {
    console.warn('[PPTX] htmlForRuns: invalid runs input');
    return '';
  }
  
  const htmlParts = [];
  const MAX_RUNS = 1000;
  
  try {
    for (let i = 0; i < Math.min(runs.length, MAX_RUNS); i++) {
      const r = runs[i];
      if (!r) continue;
      
      const textNode = qNS(r, NS.a, 't');
      const textContent = textNode ? (textNode.textContent || '') : '';
      
      if (textContent.length === 0 && !textContent.includes('\n')) continue;
      
      const rp = qNS(r, NS.a, 'rPr');
      let html = escapeHtml(textContent).replace(/\n/g, '<br/>');
      
      // THIS IS THE FIX: Declare styles HERE
      let styles = [];
      
      if (rp) {
        console.log('[PPTX] FULL rPr XML:', new XMLSerializer().serializeToString(rp));
        
        // Font size
        const sz = rp.getAttribute('sz');
        if (sz) {
          const fontSize = Math.round(parseInt(sz) / 100);
          styles.push(`font-size: ${fontSize}pt`);
        }
        
        // Text color - handle BOTH srgbClr AND schemeClr
        const solidFill = qNS(rp, NS.a, 'solidFill');
        if (solidFill) {
          console.log('[PPTX] FULL solidFill XML:', new XMLSerializer().serializeToString(solidFill));
          
          // Direct RGB color
          const srgbClr = qNS(solidFill, NS.a, 'srgbClr');
          if (srgbClr) {
            const color = `#${srgbClr.getAttribute('val')}`;
            styles.push(`color: ${color}`);
          }
          
          // Scheme color (Google Slides uses this!)
          const schemeClr = qNS(solidFill, NS.a, 'schemeClr');
          if (schemeClr) {
            const val = schemeClr.getAttribute('val');
            // Map Google Slides theme colors
            const colorMap = {
              'accent1': '#4285F4',  // Google Blue
              'dk1': '#000000',      // Black
              'lt1': '#FFFFFF',      // White  
              'lt2': '#F1F3F4',      // Light Gray
              'accent2': '#EA4335',  // Red
              'accent3': '#FBBC04',  // Yellow
              'accent4': '#34A853',  // Green
            };
            if (colorMap[val]) {
              styles.push(`color: ${colorMap[val]}`);
            }
          }
        }
        
        // Font family
        const latin = qNS(rp, NS.a, 'latin');
        if (latin) {
          const typeface = latin.getAttribute('typeface');
          if (typeface) {
            styles.push(`font-family: "${typeface}", sans-serif`);
          }
        }
        
        // Bold, Italic, Underline
        if (rp.getAttribute('b') === '1') styles.push('font-weight: bold');
        if (rp.getAttribute('i') === '1') styles.push('font-style: italic');
        if (rp.getAttribute('u') && rp.getAttribute('u') !== 'none') styles.push('text-decoration: underline');
      }
      
      if (styles.length > 0) {
        html = `<span style="${styles.join('; ')}">${html}</span>`;
      }
      
      htmlParts.push(html);
    }
  } catch (e) {
    console.error(`[PPTX] htmlForRuns CRITICAL error: ${e.message}`);
    return 'Error rendering text';
  }
  
  return htmlParts.join('');
}
// Force PPTX text rendering styles
const style = document.createElement('style');
style.textContent = `
  .pptx-slide-content {
    color: #000000 !important;
  }
  .pptx-slide-content * {
    color: inherit;
    font-weight: inherit;
    font-family: inherit;
    font-size: inherit;
  }
  .pptx-slide-content [contenteditable] {
    color: #000000 !important;
  }
`;
document.head.appendChild(style);

function runsFromHTML(html, doc) {
  if (!html || !doc) return [];
  const runs = [];
  
  try {
    const container = document.createElement('div');
    container.innerHTML = html;
    const textContent = container.textContent || container.innerText || '';
    if (textContent.trim().length === 0) return [];
    
    const r = doc.createElementNS(NS.a, 'a:r');
    const rPr = doc.createElementNS(NS.a, 'a:rPr');
    const t = doc.createElementNS(NS.a, 'a:t');
    t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    t.textContent = textContent;
    r.appendChild(rPr);
    r.appendChild(t);
    runs.push(r);
  } catch (e) {
    console.error('[PPTX] runsFromHTML error:', e);
  }
  
  return runs;
}

function nextRelationshipId(relsDoc) {
  if (!relsDoc) return 'rId1';
  try {
    const relationships = qaNS(relsDoc, NS.pkgRels, 'Relationship');
    const ids = relationships.map(r => r.getAttribute('Id')).filter(id => id && id.startsWith('rId')).map(id => Number(id.replace('rId','')) || 0);
    return 'rId' + (Math.max(0, ...ids) + 1);
  } catch (e) {
    return 'rId1';
  }
}

function nextShapeId(slideDoc) {
  if (!slideDoc) return 1;
  try {
    const cNvPrs = qaNS(slideDoc, NS.p, 'cNvPr');
    const ids = cNvPrs.map(n => Number(n.getAttribute('id')) || 0).filter(id => id > 0);
    return Math.max(0, ...ids) + 1;
  } catch (e) {
    return 1;
  }
}

function nextMediaName(zip) {
  if (!zip) return 'ppt/media/image1.png';
  try {
    const names = Object.keys(zip.files).filter(n => n.startsWith('ppt/media/'));
    let i = 1;
    while (names.includes(`ppt/media/image${i}.png`)) i++;
    return `ppt/media/image${i}.png`;
  } catch (e) {
    return 'ppt/media/image1.png';
  }
}

const PptxViewer = ({
    nodeId,
    contentDataRef,
    findNodePath,
    rootLayoutNode,
    setDraggedItem,
    setPaneContextMenu,
    closeContentPane
}) => {
    const [zip, setZip] = useState(null);
    const [presDoc, setPresDoc] = useState(null);
    const [presRelsDoc, setPresRelsDoc] = useState(null);
    const [slideOrder, setSlideOrder] = useState([]);
    const [slides, setSlides] = useState([]);
    const [notesBySlide, setNotesBySlide] = useState({});
    const [idx, setIdx] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const activeSlide = slides[idx];

    const paneData = contentDataRef.current[nodeId];
    const filePath = paneData?.contentId;

    const [slideDisplayWidth, setSlideDisplayWidth] = useState(960);
    const [slideDisplayHeight, setSlideDisplayHeight] = useState(540);
    const [pxPerEmu, setPxPerEmu] = useState(0.00010498687664041995);

    const emuToPx = useCallback((emu) => {
        if (typeof emu !== 'number' || isNaN(emu)) return 0;
        return emu * pxPerEmu;
    }, [pxPerEmu]);

    // Load PPTX (your existing code - unchanged, it works)
    useEffect(() => {
        let isCancelled = false;

        const loadPptx = async () => {
            if (!filePath) return;

            console.log('[PPTX] Starting load for:', filePath);
            setLoading(true);
            setErr(null);

            try {
                const buffer = await window.api.readFileBuffer(filePath);
                if (isCancelled) return;

                console.log('[PPTX] Buffer loaded, size:', buffer?.length || buffer?.byteLength);

                // Handle empty/new pptx files
                if (!buffer || buffer.length === 0) {
                    // Create a blank presentation state with proper structure
                    setSlides([{
                        index: 0,
                        name: 'ppt/slides/slide1.xml',
                        shapes: [],
                        background: '#ffffff',
                        doc: null,
                        relsDoc: null,
                        isNew: true
                    }]);
                    setIdx(0);
                    setLoading(false);
                    return;
                }

                const z = await JSZip.loadAsync(buffer);
                if (isCancelled) return;

                // Load theme colors
                const themeColors = await loadThemeColors(z);
                if (isCancelled) return;
                console.log('[PPTX] Zip loaded, files:', Object.keys(z.files).length);
                
                const presFile = z.file('ppt/presentation.xml');
                if (!presFile) throw new Error('No ppt/presentation.xml found in file');
                
                const presXml = await presFile.async('string');
                if (isCancelled) return;
                
                const pres = new DOMParser().parseFromString(presXml, 'application/xml');
                const parserError = pres.querySelector('parsererror');
                if (parserError) throw new Error('Invalid XML in presentation.xml: ' + parserError.textContent);
                
                console.log('[PPTX] Parsed presentation.xml successfully');
                
                const presRelsFile = z.file('ppt/_rels/presentation.xml.rels');
                if (!presRelsFile) throw new Error('No ppt/_rels/presentation.xml.rels found in file');
                
                const presRelsXml = await presRelsFile.async('string');
                if (isCancelled) return;
                
                const presRels = new DOMParser().parseFromString(presRelsXml, 'application/xml');
                
                const sldSz = qNS(pres, NS.p, 'sldSz');
                let slideWidthEmu = 9144000;
                let slideHeightEmu = 6858000;

                if (sldSz) {
                  slideWidthEmu = Number(sldSz.getAttribute('cx')) || slideWidthEmu;
                  slideHeightEmu = Number(sldSz.getAttribute('cy')) || slideHeightEmu;
                }

                const MAX_CANVAS_WIDTH = 960;
                const calculatedPxPerEmu = MAX_CANVAS_WIDTH / slideWidthEmu;

                setSlideDisplayWidth(MAX_CANVAS_WIDTH);
                setSlideDisplayHeight(slideHeightEmu * calculatedPxPerEmu);
                setPxPerEmu(calculatedPxPerEmu);

                const sldIdLst = qNS(pres, NS.p, 'sldIdLst');
                const sldIds = sldIdLst ? qaNS(sldIdLst, NS.p, 'sldId') : [];
                
                console.log(`[PPTX] Found ${sldIds.length} slides in presentation`);
                
                const order = [];
                const relationships = qaNS(presRels, NS.pkgRels, 'Relationship');
                
                for (const sldId of sldIds) {
                  if (isCancelled) return;
                  
                  const rId = sldId.getAttributeNS(NS.r, 'id');
                  if (!rId) continue;
                  
                  const rel = relationships.find(r => r.getAttribute('Id') === rId);
                  if (!rel) continue;
                  
                  const target = rel.getAttribute('Target');
                  if (!target) continue;
                  
                  const name = `ppt/${target}`;
                  order.push({ rId, target, name });
                }
                
                console.log(`[PPTX] Processing ${order.length} slides`);
                
                const loadedSlides = [];
                const MAX_SLIDES = 100;
                
                for (let i = 0; i < Math.min(order.length, MAX_SLIDES); i++) {
                  if (isCancelled) return;
                  
                  const s = order[i];
                  console.log(`[PPTX] Loading slide ${i + 1}: ${s.name}`);
                  
                  try {
                    const slideFile = z.file(s.name);
                    if (!slideFile) {
                      console.warn(`[PPTX] Slide file not found: ${s.name}`);
                      continue;
                    }
                    
                    const xml = await slideFile.async('string');
                    const doc = new DOMParser().parseFromString(xml, 'application/xml');
                    
                    const relsName = `ppt/slides/_rels/${s.name.split('/').pop()}.rels`;
                    let rels;
                    const relsFile = z.file(relsName);
                    if (relsFile) {
                      const relsXml = await relsFile.async('string');
                      rels = new DOMParser().parseFromString(relsXml, 'application/xml');
                    } else {
                      rels = new DOMParser().parseFromString('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>', 'application/xml');
                    }
                    
                    const shapes = [];
                    const MAX_SHAPES = 50;
                    
                    // Text shapes
                    const spNodes = qaNS(doc, NS.p, 'sp').filter(sp => qNS(sp, NS.p, 'txBody'));
                    console.log(`[PPTX] Found ${spNodes.length} text shapes`);
                    
                    for (let j = 0; j < Math.min(spNodes.length, MAX_SHAPES); j++) {
                      if (isCancelled) return;
                      
                      const sp = spNodes[j];
                      const txBody = qNS(sp, NS.p, 'txBody');
                      if (!txBody) continue;

                      const spPr = qNS(sp, NS.p, 'spPr');
                      let xfrmData = { x: 0, y: 0, cx: 1000000, cy: 500000 };
                      
                      if (spPr) {
                        const xfrm = qNS(spPr, NS.a, 'xfrm');
                        if (xfrm) {
                          const off = qNS(xfrm, NS.a, 'off');
                          const ext = qNS(xfrm, NS.a, 'ext');
                          if (off && ext) {
                            xfrmData = {
                              x: Number(off.getAttribute('x')) || 0,
                              y: Number(off.getAttribute('y')) || 0,
                              cx: Number(ext.getAttribute('cx')) || 1000000,
                              cy: Number(ext.getAttribute('cy')) || 500000,
                            };
                          }
                        }
                      }
                      
                      const paraNodes = qaNS(txBody, NS.a, 'p');
                      const MAX_PARAS = 20;
                      const paras = [];
                      
                      for (let k = 0; k < Math.min(paraNodes.length, MAX_PARAS); k++) {
                        if (isCancelled) return;
                        
                        const p = paraNodes[k];
                        const runs = qaNS(p, NS.a, 'r');
                        
                        console.log(`[PPTX] Processing paragraph ${k} with ${runs.length} runs`);
                        
                        let html = '';
                        try {
                          html = htmlForRuns(runs, doc);
                        } catch (e) {
                          console.error(`[PPTX] Error processing runs for paragraph ${k}:`, e);
                          html = 'Text processing error';
                        }
                        
                        const pPr = qNS(p, NS.a, 'pPr');
                        const align = pPr ? (pPr.getAttribute('algn') || 'l') : 'l';
                        const level = pPr?.getAttribute('lvl') ? Number(pPr.getAttribute('lvl')) : 0;
                        const hasBullet = !!(pPr && (qNS(pPr, NS.a, 'buChar') || qNS(pPr, NS.a, 'buAutoNum')));
                        
                        paras.push({ 
                          level: Math.max(0, Math.min(8, level)),
                          align, 
                          html: html || '', 
                          bullet: hasBullet 
                        });
                      }
                      
                      shapes.push({ 
                        spNode: sp, 
                        paras, 
                        xfrm: xfrmData, 
                        type: 'text' 
                      });
                    }

                    // Picture shapes
                    const picNodes = qaNS(doc, NS.p, 'pic');
                    console.log(`[PPTX] Found ${picNodes.length} picture shapes`);
                    
                    for (let j = 0; j < Math.min(picNodes.length, MAX_SHAPES); j++) {
                      if (isCancelled) return;
                      
                      const pic = picNodes[j];
                      
                      try {
                        const nvPicPr = qNS(pic, NS.p, 'nvPicPr');
                        const cNvPr = qNS(nvPicPr, NS.p, 'cNvPr');
                        const name = cNvPr?.getAttribute('name') || 'Picture';

                        const blipFill = qNS(pic, NS.p, 'blipFill');
                        const blip = qNS(blipFill, NS.a, 'blip');
                        const embedRId = blip?.getAttributeNS(NS.r, 'embed');

                        let imgDataUrl = '';
                        if (embedRId) {
                          const slideRelationships = qaNS(rels, NS.pkgRels, 'Relationship');
                          const imgRel = slideRelationships.find(r => r.getAttribute('Id') === embedRId);
                          if (imgRel) {
                            const target = imgRel.getAttribute('Target');
                            const mediaPath = `ppt/${target.replace(/^..\//, '')}`;
                            const imgFile = z.file(mediaPath);
                            if (imgFile) {
                              const imgBuf = await imgFile.async('uint8array');
                              const fileExtension = mediaPath.split('.').pop().toLowerCase();
                              let mimeType = `image/${fileExtension}`;
                              if (fileExtension === 'jpg') mimeType = 'image/jpeg';
                              else if (fileExtension === 'svg') mimeType = 'image/svg+xml';

                              const base64Image = btoa(
                                Array.from(new Uint8Array(imgBuf))
                                  .map(byte => String.fromCharCode(byte))
                                  .join('')
                              );
                              imgDataUrl = `data:${mimeType};base64,${base64Image}`;
                            }
                          }
                        }

                        const spPr = qNS(pic, NS.p, 'spPr');
                        let xfrmData = { x: 0, y: 0, cx: 1000000, cy: 1000000 };
                        
                        if (spPr) {
                          const xfrm = qNS(spPr, NS.a, 'xfrm');
                          if (xfrm) {
                            const off = qNS(xfrm, NS.a, 'off');
                            const ext = qNS(xfrm, NS.a, 'ext');
                            if (off && ext) {
                              xfrmData = {
                                x: Number(off.getAttribute('x')) || 0,
                                y: Number(off.getAttribute('y')) || 0,
                                cx: Number(ext.getAttribute('cx')) || 1000000,
                                cy: Number(ext.getAttribute('cy')) || 1000000,
                              };
                            }
                          }
                        }
                        
                        shapes.push({ 
                          name, 
                          imgDataUrl, 
                          xfrm: xfrmData, 
                          type: 'image' 
                        });
                      } catch (e) {
                        console.error(`[PPTX] Error processing picture ${j}:`, e);
                      }
                    }
                    // Background shapes
                    const cSld = qNS(doc, NS.p, 'cSld');
                    const spTree = cSld ? qNS(cSld, NS.p, 'spTree') : null;

                    if (spTree) {
                      const allSpElements = qaNS(spTree, NS.p, 'sp');
                      
                      for (const el of allSpElements) {
                        if (isCancelled) return;
                        
                        const txBody = qNS(el, NS.p, 'txBody');
                        if (txBody && shapes.some(s => s.spNode === el)) continue;
                        
                        const spPr = qNS(el, NS.p, 'spPr');
                        if (!spPr) continue;
                        
                        const xfrm = qNS(spPr, NS.a, 'xfrm');
                        if (!xfrm) continue;
                        
                        const off = qNS(xfrm, NS.a, 'off');
                        const ext = qNS(xfrm, NS.a, 'ext');
                        if (!off || !ext) continue;
                        
                        const xfrmData = {
                          x: Number(off.getAttribute('x')) || 0,
                          y: Number(off.getAttribute('y')) || 0,
                          cx: Number(ext.getAttribute('cx')) || 1000000,
                          cy: Number(ext.getAttribute('cy')) || 500000,
                        };
                        
                        const solidFill = qNS(spPr, NS.a, 'solidFill');
                        if (solidFill) {
                          const srgbClr = qNS(solidFill, NS.a, 'srgbClr');
                          if (srgbClr) {
                            const fillColor = `#${srgbClr.getAttribute('val')}`;
                            shapes.push({
                              spNode: el,
                              xfrm: xfrmData,
                              fillColor,
                              type: 'shape'
                            });
                          }
                        }
                      }
                    }

                    shapes.sort((a, b) => {
                      const order = { 'shape': 0, 'image': 1, 'text': 2 };
                      return (order[a.type] || 999) - (order[b.type] || 999);
                    });
                    loadedSlides.push({ 
                      name: s.name, 
                      doc, 
                      relsDoc: rels, 
                      shapes 
                    });
                    
                  } catch (e) {
                    console.error(`[PPTX] Error loading slide ${s.name}:`, e);
                  }
                }

                if (isCancelled) return;

                console.log(`[PPTX] Successfully loaded ${loadedSlides.length} slides`);
                
                setZip(z);
                setPresDoc(pres);
                setPresRelsDoc(presRels);
                setSlideOrder(order);
                setSlides(loadedSlides);
                setNotesBySlide({});
                setIdx(0);
                setHasChanges(false);
                
              } catch (e) {
                if (!isCancelled) {
                  console.error('[PPTX] Load error:', e);
                  setErr(e.message || String(e));
                }
              } finally {
                if (!isCancelled) {
                  setLoading(false);
                }
              }
            };

            loadPptx();
            
            return () => {
              isCancelled = true;
            };
          }, [filePath]);

          const markDirty = useCallback(() => setHasChanges(true), []);

          const updateParaHTML = useCallback((shapeIdx, paraIdx, newHTML) => {
            if (!activeSlide || shapeIdx >= activeSlide.shapes.length) return;
            
            setSlides(prev => {
              const next = [...prev];
              const s = { ...next[idx] };
              const shapes = [...s.shapes];
              const sh = { ...shapes[shapeIdx] };
              const paras = [...sh.paras];
              
              if (paraIdx < paras.length) {
                paras[paraIdx] = { ...paras[paraIdx], html: newHTML };
                sh.paras = paras;
                shapes[shapeIdx] = sh;
                s.shapes = shapes;
                next[idx] = s;
              }
              
              return next;
            });
            markDirty();
          }, [idx, activeSlide, markDirty]);

          const setParaProp = useCallback((shapeIdx, paraIdx, prop, value) => {
            if (!activeSlide || shapeIdx >= activeSlide.shapes.length) return;
            
            setSlides(prev => {
              const next = [...prev];
              const s = { ...next[idx] };
              const shapes = [...s.shapes];
              const sh = { ...shapes[shapeIdx] };
              const paras = [...sh.paras];
              
              if (paraIdx < paras.length) {
                paras[paraIdx] = { ...paras[paraIdx], [prop]: value };
                sh.paras = paras;
                shapes[shapeIdx] = sh;
                s.shapes = shapes;
                next[idx] = s;
              }
              
              return next;
            });
            markDirty();
          }, [idx, activeSlide, markDirty]);

          const addTextBox = useCallback(() => {
            if (!activeSlide) return;

            try {
              // For slides with XML doc, add to XML
              if (activeSlide.doc) {
                const doc = activeSlide.doc;
                const cSld = qNS(doc, NS.p, 'cSld');
                const spTree = cSld ? qNS(cSld, NS.p, 'spTree') : null;

                if (!spTree) {
                  console.error('[PPTX] Cannot add text box: p:spTree not found');
                  return;
                }

                const shapeId = nextShapeId(doc);

                const sp = doc.createElementNS(NS.p, 'p:sp');

                const nvSpPr = doc.createElementNS(NS.p, 'p:nvSpPr');
                const cNvPr = doc.createElementNS(NS.p, 'p:cNvPr');
                cNvPr.setAttribute('id', String(shapeId));
                cNvPr.setAttribute('name', `TextBox ${shapeId}`);
                const cNvSpPr = doc.createElementNS(NS.p, 'p:cNvSpPr');
                const nvPr = doc.createElementNS(NS.p, 'p:nvPr');
                nvSpPr.appendChild(cNvPr);
                nvSpPr.appendChild(cNvSpPr);
                nvSpPr.appendChild(nvPr);

                const spPr = doc.createElementNS(NS.p, 'p:spPr');
                const xfrm = doc.createElementNS(NS.a, 'a:xfrm');
                const off = doc.createElementNS(NS.a, 'a:off');
                off.setAttribute('x','1524000');
                off.setAttribute('y','1524000');
                const ext = doc.createElementNS(NS.a, 'a:ext');
                ext.setAttribute('cx','4000000');
                ext.setAttribute('cy','1000000');
                xfrm.appendChild(off);
                xfrm.appendChild(ext);

                const prstGeom = doc.createElementNS(NS.a, 'a:prstGeom');
                prstGeom.setAttribute('prst','rect');
                prstGeom.appendChild(doc.createElementNS(NS.a,'a:avLst'));

                spPr.appendChild(xfrm);
                spPr.appendChild(prstGeom);

                const txBody = doc.createElementNS(NS.p, 'p:txBody');
                const bodyPr = doc.createElementNS(NS.a, 'a:bodyPr');
                const lstStyle = doc.createElementNS(NS.a, 'a:lstStyle');
                const p = doc.createElementNS(NS.a, 'a:p');
                const r = doc.createElementNS(NS.a, 'a:r');
                const rPr = doc.createElementNS(NS.a, 'a:rPr');
                const t = doc.createElementNS(NS.a, 'a:t');
                t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
                t.textContent = 'New text';

                r.appendChild(rPr);
                r.appendChild(t);
                p.appendChild(r);
                txBody.appendChild(bodyPr);
                txBody.appendChild(lstStyle);
                txBody.appendChild(p);

                sp.appendChild(nvSpPr);
                sp.appendChild(spPr);
                sp.appendChild(txBody);
                spTree.appendChild(sp);
              }

              // Add to shapes for display
              setSlides(prev => {
                const next = [...prev];
                const s = { ...next[idx] };
                const shapes = [...(s.shapes || [])];
                shapes.push({
                  spNode: null,
                  paras: [{ level: 0, align: 'l', bullet: false, html: 'Click to edit text' }],
                  xfrm: { x: 1524000, y: 1524000, cx: 4000000, cy: 1000000 },
                  type: 'text'
                });
                s.shapes = shapes;
                next[idx] = s;
                return next;
              });

              markDirty();
            } catch (e) {
              console.error('[PPTX] Error adding text box:', e);
            }
          }, [activeSlide, idx, markDirty]);

          const addImage = useCallback(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;

                setSlides(prev => {
                  const next = [...prev];
                  const s = { ...next[idx] };
                  const shapes = [...(s.shapes || [])];
                  shapes.push({
                    type: 'image',
                    imgDataUrl: dataUrl,
                    name: file.name,
                    xfrm: { x: 1000000, y: 1000000, cx: 3000000, cy: 2000000 }
                  });
                  s.shapes = shapes;
                  next[idx] = s;
                  return next;
                });

                markDirty();
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }, [idx, markDirty]);

          const addShape = useCallback((shapeType: 'rect' | 'ellipse') => {
            setSlides(prev => {
              const next = [...prev];
              const s = { ...next[idx] };
              const shapes = [...(s.shapes || [])];
              shapes.push({
                type: 'shape',
                shapeType,
                fillColor: shapeType === 'rect' ? '#3b82f6' : '#10b981',
                xfrm: { x: 2000000, y: 2000000, cx: 2000000, cy: 1500000 }
              });
              s.shapes = shapes;
              next[idx] = s;
              return next;
            });
            markDirty();
          }, [idx, markDirty]);

          const applyToolbar = useCallback((cmd) => {
            try {
              document.execCommand(cmd, false, null);
            } catch (e) {
              console.error('[PPTX] Toolbar command error:', e);
            }
          }, []);

          const saveDeck = useCallback(async () => {
            if (!zip || !presDoc || !presRelsDoc || !hasChanges) return;
            
            try {
              console.log('[PPTX] Starting save...');
              
              for (const slide of slides) {
                if (!slide.doc || !slide.relsDoc) continue;
                
                try {
                  const slideXml = new XMLSerializer().serializeToString(slide.doc);
                  const relsXml = new XMLSerializer().serializeToString(slide.relsDoc);
                  const relsName = `ppt/slides/_rels/${slide.name.split('/').pop()}.rels`;
                  
                  zip.file(slide.name, slideXml);
                  zip.file(relsName, relsXml);
                } catch (e) {
                  console.error(`[PPTX] Error saving slide ${slide.name}:`, e);
                }
              }

              zip.file('ppt/presentation.xml', new XMLSerializer().serializeToString(presDoc));
              zip.file('ppt/_rels/presentation.xml.rels', new XMLSerializer().serializeToString(presRelsDoc));

              const output = await zip.generateAsync({
                type: 'uint8array',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
              });
              
              await window.api.writeFileBuffer(filePath, output);
              setHasChanges(false);
              console.log('[PPTX] Save completed successfully');
              
            } catch (e) {
              console.error('[PPTX] Save error:', e);
              setErr(`Save failed: ${e.message}`);
            }
          }, [zip, presDoc, presRelsDoc, slides, filePath, hasChanges]);

          const addSlide = useCallback(() => {
            if (!slides.length || !zip || !presDoc || !presRelsDoc) return;
            
            try {
              const base = slides[idx];
              const nextNum = 1 + Math.max(0, ...Object.keys(zip.files)
                .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
                .map(n => Number(n.match(/slide(\d+)\.xml$/)?.[1]) || 0));

              const newSlideName = `ppt/slides/slide${nextNum}.xml`;
              const newRelsName = `ppt/slides/_rels/slide${nextNum}.xml.rels`;

              const cloned = base.doc.cloneNode(true);
              const textNodes = qaNS(cloned, NS.a, 't');
              textNodes.forEach(t => { t.textContent = ''; });

              zip.file(newSlideName, new XMLSerializer().serializeToString(cloned));
              zip.file(newRelsName, new XMLSerializer().serializeToString(base.relsDoc));

              const rid = nextRelationshipId(presRelsDoc);
              const rel = presRelsDoc.createElementNS(NS.pkgRels, 'Relationship');
              rel.setAttribute('Id', rid);
              rel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide');
              rel.setAttribute('Target', `slides/slide${nextNum}.xml`);
              presRelsDoc.documentElement.appendChild(rel);

              const sldIdLst = qNS(presDoc, NS.p, 'sldIdLst');
              if (sldIdLst) {
                const sldId = presDoc.createElementNS(NS.p, 'p:sldId');
                const usedIds = qaNS(sldIdLst, NS.p, 'sldId').map(s => Number(s.getAttribute('id')) || 256);
                sldId.setAttribute('id', String(Math.max(255, ...usedIds) + 1));
                sldId.setAttributeNS(NS.r, 'r:id', rid);
                sldIdLst.appendChild(sldId);
              }

              const newSlide = {
                name: newSlideName,
                doc: cloned,
                relsDoc: base.relsDoc.cloneNode(true),
                shapes: base.shapes.map(sh => ({
                  ...sh,
                  spNode: null,
                  paras: sh.type === 'text' ? [{ level: 0, align: 'l', bullet: false, html: '' }] : sh.paras
                }))
              };
              
              setSlideOrder(prev => [...prev, { rId: rid, target: `slides/slide${nextNum}.xml`, name: newSlideName }]);
              setSlides(prev => [...prev, newSlide]);
              setIdx(slides.length);
              markDirty();
              
            } catch (e) {
              console.error('[PPTX] Error adding slide:', e);
            }
          }, [slides, idx, zip, presDoc, presRelsDoc, markDirty]);

          const deleteSlide = useCallback(() => {
            if (slides.length <= 1 || !slideOrder[idx] || !presDoc || !presRelsDoc) return;
            
            try {
              const toRemove = slideOrder[idx];
              
              const sldIdLst = qNS(presDoc, NS.p, 'sldIdLst');
              if (sldIdLst) {
                const sldIds = qaNS(sldIdLst, NS.p, 'sldId');
                const sldId = sldIds.find(s => s.getAttributeNS(NS.r, 'id') === toRemove.rId);
                if (sldId) sldId.parentNode.removeChild(sldId);
              }

              const relationships = qaNS(presRelsDoc, NS.pkgRels, 'Relationship');
              const rel = relationships.find(r => r.getAttribute('Id') === toRemove.rId);
              if (rel) rel.parentNode.removeChild(rel);

              if (zip) {
                zip.remove(toRemove.name);
                zip.remove(`ppt/slides/_rels/${toRemove.name.split('/').pop()}.rels`);
              }

              setSlides(prev => prev.filter((_, i) => i !== idx));
              setSlideOrder(prev => prev.filter((_, i) => i !== idx));
              setIdx(Math.max(0, idx - 1));
              markDirty();
              
            } catch (e) {
              console.error('[PPTX] Error deleting slide:', e);
            }
          }, [slides.length, slideOrder, idx, presDoc, presRelsDoc, zip, markDirty]);

          useEffect(() => {
            const handleKeyDown = (e) => {
              const isCtrl = e.ctrlKey || e.metaKey;
              if (isCtrl && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (hasChanges) saveDeck();
              }
              // Block browser shortcuts when in presentation
              if (isCtrl && (e.key === 'b' || e.key === 'i' || e.key === 'u')) {
                e.preventDefault();
                e.stopPropagation();
              }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
          }, [hasChanges, saveDeck]);

          console.log('[PPTX] Render, slides:', slides.length, 'activeIdx:', idx, 'hasChanges:', hasChanges);
          console.log('[PPTX] Active slide shapes:', activeSlide?.shapes?.length || 0);
          console.log('[PPTX] Zip files:', zip ? Object.keys(zip.files).length : 'n/a');

          if (err) {
            return (
              <div className="h-full flex flex-col theme-bg-secondary">
                <div className="p-4 text-red-500">
                  <h3 className="font-bold mb-2">PPTX Error</h3>
                  <p className="text-sm">{err}</p>
                  <button 
                    onClick={() => { setErr(null); setLoading(true); }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            );
          }

          if (loading) {
            return (
              <div className="h-full flex items-center justify-center theme-bg-secondary">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm theme-text-muted">Loading presentation...</p>
                </div>
              </div>
            );
          }

          if (!slides || slides.length === 0) {
            return (
              <div className="h-full flex items-center justify-center theme-bg-secondary">
                <div className="text-center theme-text-muted">
                  <p>No slides found in presentation.</p>
                </div>
              </div>
            );
          }

          if (!activeSlide) {
            return (
              <div className="h-full flex items-center justify-center theme-bg-secondary">
                <div className="text-center theme-text-muted">
                  <p>No active slide.</p>
                </div>
              </div>
            );
          }

          return (
            <div className="h-full flex flex-col theme-bg-secondary overflow-hidden">
              {/* Header */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  const nodePath = findNodePath?.(rootLayoutNode, nodeId) || [];
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'pane',
                    id: nodeId,
                    nodePath
                  }));
                  setTimeout(() => setDraggedItem?.({ type: 'pane', id: nodeId, nodePath }), 0);
                }}
                onDragEnd={() => setDraggedItem?.(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const nodePath = findNodePath?.(rootLayoutNode, nodeId) || [];
                  setPaneContextMenu?.({
                    isOpen: true,
                    x: e.clientX,
                    y: e.clientY,
                    nodeId,
                    nodePath
                  });
                }}
                className="p-2 border-b theme-border text-xs theme-text-muted flex-shrink-0 theme-bg-secondary cursor-move"
              >
                <div className="flex justify-between items-center">
                  <span className="truncate font-semibold">
                    {filePath?.split('/').pop() || 'Presentation'}{hasChanges ? ' *' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={addSlide} 
                      className="p-1 theme-hover rounded" 
                      title="Add slide"
                    >
                      <Plus size={14}/>
                    </button>
                    <button 
                      onClick={deleteSlide} 
                      disabled={slides.length <= 1} 
                      className="p-1 theme-hover rounded disabled:opacity-50"
                      title="Delete slide"
                    >
                      <Trash2 size={14}/>
                    </button>
                    <button 
                      onClick={saveDeck} 
                      disabled={!hasChanges} 
                      className="p-1 theme-hover rounded disabled:opacity-50"
                      title="Save (Ctrl+S)"
                    >
                      <Save size={14}/>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nodePath = findNodePath?.(rootLayoutNode, nodeId) || [];
                        closeContentPane?.(nodeId, nodePath);
                      }}
                      className="p-1 theme-hover rounded-full"
                      title="Close"
                    >
                      <X size={14}/>
                    </button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="p-2 border-b theme-border flex items-center gap-2 flex-wrap theme-bg-tertiary">
                <button 
                  onClick={() => applyToolbar('bold')} 
                  className="p-2 theme-hover rounded"
                  title="Bold"
                >
                  <Type size={16} style={{fontWeight: 700}}/>
                </button>
                <button 
                  onClick={() => applyToolbar('italic')} 
                  className="p-2 theme-hover rounded"
                  title="Italic"
                >
                  <i>I</i>
                </button>
                <button 
                  onClick={() => applyToolbar('underline')} 
                  className="p-2 theme-hover rounded"
                  title="Underline"
                >
                  <u>U</u>
                </button>
                <div className="w-px h-6 bg-gray-600 mx-1"/>
                <button
                  onClick={addTextBox}
                  className="p-1 theme-hover rounded"
                  title="Add text box"
                >
                  <Type size={16}/>
                </button>
                <button
                  onClick={addImage}
                  className="p-1 theme-hover rounded"
                  title="Add image"
                >
                  <ImageIcon size={16}/>
                </button>
                <button
                  onClick={() => addShape('rect')}
                  className="p-1 theme-hover rounded"
                  title="Add rectangle"
                >
                  <Square size={16}/>
                </button>
                <button
                  onClick={() => addShape('ellipse')}
                  className="p-1 theme-hover rounded"
                  title="Add circle"
                >
                  <Circle size={16}/>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 flex min-h-0">
                {/* Slide list */}
                <div className="w-52 border-r theme-border overflow-auto theme-bg-tertiary">
                  {slides.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => setIdx(i)}
                      className={`w-full text-left px-3 py-2 text-xs ${i === idx ? 'theme-button-primary' : 'theme-button theme-hover'}`}
                    >
                      Slide {i + 1}
                    </button>
                  ))}
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col min-h-0 p-6 theme-bg-primary overflow-auto">
                  {/* Slide Canvas */}
                  <div
                    className="relative border theme-border rounded shadow-lg mb-4 flex-shrink-0 bg-white"
                    style={{
                      width: `${slideDisplayWidth}px`,
                      height: `${slideDisplayHeight}px`,
                      margin: '0 auto',
                    }}
                  >
                    {activeSlide.shapes?.map((shape, si) => {
                      const shapeStyle = {
                        position: 'absolute',
                        left: `${emuToPx(shape.xfrm?.x || 0)}px`,
                        top: `${emuToPx(shape.xfrm?.y || 0)}px`,
                        width: `${emuToPx(shape.xfrm?.cx || 0)}px`,
                        height: `${emuToPx(shape.xfrm?.cy || 0)}px`,
                        boxSizing: 'border-box',
                        zIndex: shape.type === 'shape' ? 0 : (shape.type === 'image' ? 1 : 2),
                        backgroundColor: shape.fillColor || 'transparent',
                      };

                      return (
                        <div key={`${activeSlide.name}-${si}`} style={shapeStyle}> 


{shape.type === 'text' && (
  <div
    className="w-full h-full pptx-slide-content"
    style={{ overflow: 'visible' }}
  >
    {shape.paras?.map((p, pIndex) => (
      <div
        key={pIndex}
        contentEditable
        suppressContentEditableWarning
        style={{
          textAlign: p.align === 'ctr' ? 'center' : p.align === 'r' ? 'right' : 'left',
          color: '#000000',
          outline: 'none',
          minHeight: '1em',
          cursor: 'text',
        }}
        onBlur={(e) => {
          const newText = e.currentTarget.innerHTML;
          updateParaHTML(si, pIndex, newText);
        }}
        dangerouslySetInnerHTML={{ __html: p.html }}
      />
    ))}
  </div>
)}

             {shape.type === 'image' && shape.imgDataUrl && (
                    <img
                      src={shape.imgDataUrl}
                      alt={shape.name || 'Image'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  )}
                  {shape.type === 'shape' && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: shape.fillColor || '#3b82f6',
                        borderRadius: shape.shapeType === 'ellipse' ? '50%' : '0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes Section */}
          <div className="theme-bg-secondary rounded border theme-border shadow-sm flex-shrink-0">
            <div className="px-3 py-1 text-[11px] theme-text-muted border-b theme-border">
              Speaker notes
            </div>
            <textarea
              className="w-full p-3 bg-transparent outline-none min-h-[120px] font-mono text-xs theme-text-primary resize-none"
              placeholder="Add speaker notes for this slide..."
              defaultValue=""
              onBlur={(e) => {
                console.log('[PPTX] Notes updated:', e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="p-2 border-t theme-border text-xs theme-text-muted flex items-center justify-between theme-bg-secondary">
        <span>Slide {idx + 1} of {slides.length}</span>
        <span>{hasChanges ? 'Unsaved changes' : 'Saved'}</span>
      </div>
    </div>
  );
};
export default memo(PptxViewer);