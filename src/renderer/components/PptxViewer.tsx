// PptxViewer - Enhanced PowerPoint-like Editor
import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import JSZip from 'jszip';
import {
  Save, X, ChevronLeft, ChevronRight, Plus, Copy, Trash2, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Type, Square, Circle, Bold, Italic,
  Underline, Strikethrough, ZoomIn, ZoomOut, Play, ChevronDown, Palette,
  LayoutGrid, Grid, Maximize2, MousePointer, Move, RotateCcw, Layers,
  FileDown, Printer, MoreHorizontal, Triangle, Pentagon, Star, Minus,
  ArrowRight, Hexagon, Heart, Diamond, PaintBucket, Sparkles, Layout,
  Undo, Redo, List, ListOrdered, Highlighter
} from 'lucide-react';

// Constants
const FONTS = [
  'Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Verdana',
  'Tahoma', 'Trebuchet MS', 'Impact', 'Helvetica', 'Century Gothic',
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins'
];

const FONT_SIZES = ['8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '44', '54', '72', '96'];

const THEME_COLORS = [
  '#000000', '#ffffff', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59',
  '#8064a2', '#4bacc6', '#f79646', '#ffff00', '#ff0000', '#00ff00',
  '#2c3e50', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff5722', '#795548', '#607d8b',
];

const BACKGROUND_COLORS = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da',
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#00cec9',
  '#fdcb6e', '#e17055', '#d63031', '#74b9ff', '#a29bfe',
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', colors: ['#ff7e5f', '#feb47b'] },
  { name: 'Ocean', colors: ['#2193b0', '#6dd5ed'] },
  { name: 'Purple', colors: ['#667eea', '#764ba2'] },
  { name: 'Green', colors: ['#11998e', '#38ef7d'] },
  { name: 'Dark', colors: ['#232526', '#414345'] },
  { name: 'Fire', colors: ['#f12711', '#f5af19'] },
  { name: 'Pink', colors: ['#ff6a88', '#ff99ac'] },
  { name: 'Blue', colors: ['#4facfe', '#00f2fe'] },
];

const SHAPE_PRESETS = [
  { type: 'rect', icon: Square, name: 'Rectangle' },
  { type: 'roundRect', icon: Square, name: 'Rounded Rect' },
  { type: 'ellipse', icon: Circle, name: 'Ellipse' },
  { type: 'triangle', icon: Triangle, name: 'Triangle' },
  { type: 'diamond', icon: Diamond, name: 'Diamond' },
  { type: 'hexagon', icon: Hexagon, name: 'Hexagon' },
  { type: 'star', icon: Star, name: 'Star' },
  { type: 'arrow', icon: ArrowRight, name: 'Arrow' },
  { type: 'line', icon: Minus, name: 'Line' },
];

const SLIDE_LAYOUTS = [
  { name: 'Title Slide', shapes: [{ type: 'text', x: 10, y: 35, w: 80, h: 20, text: 'Title', size: 44 }, { type: 'text', x: 10, y: 55, w: 80, h: 10, text: 'Subtitle', size: 24 }] },
  { name: 'Title + Content', shapes: [{ type: 'text', x: 5, y: 5, w: 90, h: 15, text: 'Title', size: 36 }, { type: 'text', x: 5, y: 25, w: 90, h: 65, text: 'Content', size: 18 }] },
  { name: 'Two Columns', shapes: [{ type: 'text', x: 5, y: 5, w: 90, h: 15, text: 'Title', size: 36 }, { type: 'text', x: 5, y: 25, w: 42, h: 65, text: 'Left', size: 18 }, { type: 'text', x: 52, y: 25, w: 42, h: 65, text: 'Right', size: 18 }] },
  { name: 'Blank', shapes: [] },
];

const NS = {
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  pkgRels: 'http://schemas.openxmlformats.org/package/2006/relationships',
};

// Helper functions
function qNS(doc: any, nsUri: string, localName: string) {
  if (!doc || !nsUri || !localName) return null;
  const elements = doc.getElementsByTagNameNS(nsUri, localName);
  return elements.length > 0 ? elements[0] : null;
}

function qaNS(doc: any, nsUri: string, localName: string) {
  if (!doc || !nsUri || !localName) return [];
  return Array.from(doc.getElementsByTagNameNS(nsUri, localName));
}

function escapeHtml(text: string) {
  if (typeof text !== 'string') return '';
  const escapeMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => escapeMap[m] || m);
}

// Theme color extraction - handles both PowerPoint and Google Slides
async function extractThemeColors(zip: JSZip): Promise<Record<string, string>> {
  const themeFile = zip.file('ppt/theme/theme1.xml');
  if (!themeFile) return {};

  try {
    const xml = await themeFile.async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const colorScheme = qNS(doc, NS.a, 'clrScheme');
    if (!colorScheme) return {};

    const colors: Record<string, string> = {};
    const names = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];

    for (const name of names) {
      const elem = colorScheme.getElementsByTagNameNS(NS.a, name)[0];
      if (elem) {
        const srgb = qNS(elem, NS.a, 'srgbClr');
        const sys = qNS(elem, NS.a, 'sysClr');
        if (srgb) colors[name] = `#${srgb.getAttribute('val')}`;
        else if (sys) colors[name] = sys.getAttribute('lastClr') ? `#${sys.getAttribute('lastClr')}` : '#000000';
      }
    }

    // Google Slides uses tx1/tx2/bg1/bg2 which map to dk1/lt1/dk2/lt2
    colors['tx1'] = colors['dk1'] || '#000000';
    colors['tx2'] = colors['dk2'] || '#000000';
    colors['bg1'] = colors['lt1'] || '#ffffff';
    colors['bg2'] = colors['lt2'] || '#ffffff';

    return colors;
  } catch (e) {
    console.error('[PPTX] Theme extraction error:', e);
    return {};
  }
}

// Parse color from solidFill element with luminance modifiers
function parseColor(fillEl: Element | null, themeColors: Record<string, string>): string | null {
  if (!fillEl) return null;

  const srgb = qNS(fillEl, NS.a, 'srgbClr');
  const scheme = qNS(fillEl, NS.a, 'schemeClr');

  let color: string | null = null;

  if (srgb) {
    color = `#${srgb.getAttribute('val')}`;
  } else if (scheme) {
    const val = scheme.getAttribute('val');
    color = themeColors[val || ''] || null;

    // Handle luminance modifiers (lumMod, lumOff, tint, shade)
    if (color) {
      const lumMod = qNS(scheme, NS.a, 'lumMod');
      const lumOff = qNS(scheme, NS.a, 'lumOff');
      const tint = qNS(scheme, NS.a, 'tint');
      const shade = qNS(scheme, NS.a, 'shade');

      // Apply basic luminance adjustments
      if (lumMod || lumOff || tint || shade) {
        // Convert to RGB, apply modifier, convert back
        const hex = color.replace('#', '');
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);

        if (lumMod) {
          const mod = parseInt(lumMod.getAttribute('val') || '100000') / 100000;
          r = Math.round(r * mod);
          g = Math.round(g * mod);
          b = Math.round(b * mod);
        }
        if (lumOff) {
          const off = parseInt(lumOff.getAttribute('val') || '0') / 100000 * 255;
          r = Math.round(Math.min(255, r + off));
          g = Math.round(Math.min(255, g + off));
          b = Math.round(Math.min(255, b + off));
        }
        if (tint) {
          const t = parseInt(tint.getAttribute('val') || '100000') / 100000;
          r = Math.round(r + (255 - r) * (1 - t));
          g = Math.round(g + (255 - g) * (1 - t));
          b = Math.round(b + (255 - b) * (1 - t));
        }
        if (shade) {
          const s = parseInt(shade.getAttribute('val') || '100000') / 100000;
          r = Math.round(r * s);
          g = Math.round(g * s);
          b = Math.round(b * s);
        }

        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
  }

  return color;
}

// Build style string from run properties
function buildStyleFromRPr(rPr: Element | null, defaultRPr: Element | null, themeColors: Record<string, string>): string[] {
  const styles: string[] = [];

  // Get properties from run, falling back to default if not specified
  const runSize = rPr?.getAttribute('sz');
  const defaultSize = defaultRPr?.getAttribute('sz');
  const runBold = rPr?.getAttribute('b');
  const defaultBold = defaultRPr?.getAttribute('b');
  const runItalic = rPr?.getAttribute('i');
  const defaultItalic = defaultRPr?.getAttribute('i');
  const runUnderline = rPr?.getAttribute('u');
  const defaultUnderline = defaultRPr?.getAttribute('u');

  // Font size (in hundredths of a point)
  const sz = runSize || defaultSize;
  if (sz) {
    const ptSize = Math.round(parseInt(sz) / 100);
    styles.push(`font-size: ${ptSize}pt`);
  }

  // Font family - check run first, then default
  const runLatin = rPr ? qNS(rPr, NS.a, 'latin') : null;
  const defaultLatin = defaultRPr ? qNS(defaultRPr, NS.a, 'latin') : null;
  const latin = runLatin || defaultLatin;
  const runEa = rPr ? qNS(rPr, NS.a, 'ea') : null;
  const defaultEa = defaultRPr ? qNS(defaultRPr, NS.a, 'ea') : null;
  const ea = runEa || defaultEa;
  const runCs = rPr ? qNS(rPr, NS.a, 'cs') : null;
  const defaultCs = defaultRPr ? qNS(defaultRPr, NS.a, 'cs') : null;
  const cs = runCs || defaultCs;

  const typeface = latin?.getAttribute('typeface') || ea?.getAttribute('typeface') || cs?.getAttribute('typeface');
  if (typeface && typeface !== '+mn-lt' && typeface !== '+mj-lt') {
    // Map common Google Slides font names
    const fontMap: Record<string, string> = {
      'Arial': 'Arial, sans-serif',
      'Roboto': 'Roboto, Arial, sans-serif',
      'Open Sans': '"Open Sans", Arial, sans-serif',
      'Lato': 'Lato, Arial, sans-serif',
      'Montserrat': 'Montserrat, Arial, sans-serif',
      'Oswald': 'Oswald, Arial, sans-serif',
      'Playfair Display': '"Playfair Display", Georgia, serif',
      'Times New Roman': '"Times New Roman", Times, serif',
      'Georgia': 'Georgia, serif',
    };
    styles.push(`font-family: ${fontMap[typeface] || `"${typeface}", sans-serif`}`);
  }

  // Bold - check for explicit value
  const bold = runBold !== null ? runBold : defaultBold;
  if (bold === '1' || bold === 'true') styles.push('font-weight: bold');

  // Italic
  const italic = runItalic !== null ? runItalic : defaultItalic;
  if (italic === '1' || italic === 'true') styles.push('font-style: italic');

  // Underline
  const underline = runUnderline !== null ? runUnderline : defaultUnderline;
  if (underline && underline !== 'none') styles.push('text-decoration: underline');

  // Strikethrough
  const runStrike = rPr?.getAttribute('strike');
  const defaultStrike = defaultRPr?.getAttribute('strike');
  const strike = runStrike !== null ? runStrike : defaultStrike;
  if (strike && strike !== 'noStrike') styles.push('text-decoration: line-through');

  // Baseline (superscript/subscript)
  const baseline = rPr?.getAttribute('baseline') || defaultRPr?.getAttribute('baseline');
  if (baseline) {
    const bl = parseInt(baseline);
    if (bl > 0) styles.push('vertical-align: super; font-size: 0.7em');
    else if (bl < 0) styles.push('vertical-align: sub; font-size: 0.7em');
  }

  // Color from solidFill - check run first then default
  const runFill = rPr ? qNS(rPr, NS.a, 'solidFill') : null;
  const defaultFill = defaultRPr ? qNS(defaultRPr, NS.a, 'solidFill') : null;
  const solidFill = runFill || defaultFill;
  const color = parseColor(solidFill, themeColors);
  if (color) {
    styles.push(`color: ${color}`);
  }

  // Letter spacing (spc attribute in hundredths of a point)
  const spc = rPr?.getAttribute('spc') || defaultRPr?.getAttribute('spc');
  if (spc) {
    const spacing = parseInt(spc) / 100;
    styles.push(`letter-spacing: ${spacing}pt`);
  }

  return styles;
}

// Parse entire paragraph including runs, fields, and breaks
function parseParagraph(p: Element, themeColors: Record<string, string>, defaultRPr?: Element | null): string {
  const parts: string[] = [];

  // Get all text runs using namespace query (more reliable than childNodes iteration)
  const runs = qaNS(p, NS.a, 'r') as Element[];
  const fields = qaNS(p, NS.a, 'fld') as Element[];
  const breaks = qaNS(p, NS.a, 'br') as Element[];

  // Combine and sort by document order
  const allElements: { el: Element; type: string }[] = [
    ...runs.map(el => ({ el, type: 'r' })),
    ...fields.map(el => ({ el, type: 'fld' })),
    ...breaks.map(el => ({ el, type: 'br' })),
  ];

  // Sort by document position
  allElements.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  for (const { el, type } of allElements) {
    if (type === 'r' || type === 'fld') {
      // Text run or field
      const t = qNS(el, NS.a, 't');
      const text = t?.textContent || '';
      if (!text) continue;

      const rPr = qNS(el, NS.a, 'rPr');
      const styles = buildStyleFromRPr(rPr, defaultRPr, themeColors);

      const html = escapeHtml(text).replace(/\n/g, '<br/>');
      if (styles.length > 0) {
        parts.push(`<span style="${styles.join('; ')}">${html}</span>`);
      } else {
        parts.push(html);
      }
    } else if (type === 'br') {
      parts.push('<br/>');
    }
  }

  // If no runs found, try to get any text content directly
  if (parts.length === 0) {
    const directText = p.textContent?.trim();
    if (directText) {
      // Apply default styles if available
      const styles = buildStyleFromRPr(null, defaultRPr, themeColors);
      const html = escapeHtml(directText).replace(/\n/g, '<br/>');
      if (styles.length > 0) {
        parts.push(`<span style="${styles.join('; ')}">${html}</span>`);
      } else {
        parts.push(html);
      }
    }
  }

  return parts.join('');
}

// Parse text runs with proper styling (legacy function for compatibility)
function parseRuns(runs: Element[], themeColors: Record<string, string>, defaultRPr?: Element | null): string {
  const parts: string[] = [];

  for (const r of runs) {
    const t = qNS(r, NS.a, 't');
    const text = t?.textContent || '';
    if (!text) continue;

    const rPr = qNS(r, NS.a, 'rPr');
    const styles = buildStyleFromRPr(rPr, defaultRPr, themeColors);

    const html = escapeHtml(text).replace(/\n/g, '<br/>');
    if (styles.length > 0) {
      parts.push(`<span style="${styles.join('; ')}">${html}</span>`);
    } else {
      parts.push(html);
    }
  }

  return parts.join('');
}

function nextRelationshipId(relsDoc: Document | null): string {
  if (!relsDoc) return 'rId1';
  const rels = qaNS(relsDoc, NS.pkgRels, 'Relationship') as Element[];
  const ids = rels.map(r => parseInt(r.getAttribute('Id')?.replace('rId', '') || '0'));
  return 'rId' + (Math.max(0, ...ids) + 1);
}

interface ParaData {
  html: string;
  align: string;
  level: number;
  bullet: boolean;
  lineSpacing?: number;  // In percentage (e.g., 150 for 1.5x)
  spaceBefore?: number;  // In points
  spaceAfter?: number;   // In points
}

interface Shape {
  type: 'text' | 'image' | 'shape';
  xfrm: { x: number; y: number; cx: number; cy: number };
  paras?: ParaData[];
  imgDataUrl?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  shapeType?: string;
  name?: string;
  spNode?: Element | null;
}

interface Slide {
  name: string;
  doc: Document | null;
  relsDoc: Document | null;
  shapes: Shape[];
  background?: string;
}

const PptxViewer = ({
  nodeId,
  contentDataRef,
  findNodePath,
  rootLayoutNode,
  setDraggedItem,
  setPaneContextMenu,
  closeContentPane
}: any) => {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [presDoc, setPresDoc] = useState<Document | null>(null);
  const [presRelsDoc, setPresRelsDoc] = useState<Document | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [slideOrder, setSlideOrder] = useState<any[]>([]);
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const paneData = contentDataRef.current[nodeId];
  const filePath = paneData?.contentId;

  // Display settings
  const [slideWidth, setSlideWidth] = useState(960);
  const [slideHeight, setSlideHeight] = useState(540);
  const [pxPerEmu, setPxPerEmu] = useState(0.0001);
  const [zoom, setZoom] = useState(100);

  // Toolbar state
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentFontSize, setCurrentFontSize] = useState('24');
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'shape'>('select');
  const [selectedShapeColor, setSelectedShapeColor] = useState('#4285f4');

  // Presentation mode
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);

  const activeSlide = slides[idx];

  const emuToPx = useCallback((emu: number) => {
    if (typeof emu !== 'number' || isNaN(emu)) return 0;
    return emu * pxPerEmu;
  }, [pxPerEmu]);

  // Load PPTX
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!filePath) return;
      setLoading(true);
      setErr(null);

      try {
        const buffer = await window.api.readFileBuffer(filePath);
        if (cancelled) return;

        if (!buffer || buffer.length === 0) {
          setSlides([{ name: 'slide1', doc: null, relsDoc: null, shapes: [], background: '#ffffff' }]);
          setLoading(false);
          return;
        }

        const z = await JSZip.loadAsync(buffer);
        if (cancelled) return;

        // Extract theme colors
        const colors = await extractThemeColors(z);
        setThemeColors(colors);

        const presFile = z.file('ppt/presentation.xml');
        if (!presFile) throw new Error('Invalid PPTX file');

        const presXml = await presFile.async('string');
        const pres = new DOMParser().parseFromString(presXml, 'application/xml');

        const presRelsFile = z.file('ppt/_rels/presentation.xml.rels');
        const presRelsXml = presRelsFile ? await presRelsFile.async('string') : '<Relationships/>';
        const presRels = new DOMParser().parseFromString(presRelsXml, 'application/xml');

        // Get slide size
        const sldSz = qNS(pres, NS.p, 'sldSz');
        const widthEmu = Number(sldSz?.getAttribute('cx')) || 9144000;
        const heightEmu = Number(sldSz?.getAttribute('cy')) || 6858000;
        const maxWidth = 800;
        const scale = maxWidth / widthEmu;
        setSlideWidth(maxWidth);
        setSlideHeight(heightEmu * scale);
        setPxPerEmu(scale);

        // Get slide order
        const sldIdLst = qNS(pres, NS.p, 'sldIdLst');
        const sldIds = sldIdLst ? qaNS(sldIdLst, NS.p, 'sldId') as Element[] : [];
        const rels = qaNS(presRels, NS.pkgRels, 'Relationship') as Element[];

        const order: any[] = [];
        for (const sldId of sldIds) {
          const rId = sldId.getAttributeNS(NS.r, 'id');
          const rel = rels.find(r => r.getAttribute('Id') === rId);
          if (rel) {
            const target = rel.getAttribute('Target') || '';
            order.push({ rId, target, name: `ppt/${target}` });
          }
        }

        // Load slides
        const loadedSlides: Slide[] = [];
        for (const s of order) {
          if (cancelled) return;

          const slideFile = z.file(s.name);
          if (!slideFile) continue;

          const xml = await slideFile.async('string');
          const doc = new DOMParser().parseFromString(xml, 'application/xml');

          const relsPath = `ppt/slides/_rels/${s.name.split('/').pop()}.rels`;
          const relsFile = z.file(relsPath);
          const relsXml = relsFile ? await relsFile.async('string') : '<Relationships/>';
          const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');

          const shapes: Shape[] = [];

          // Parse text shapes
          const spNodes = qaNS(doc, NS.p, 'sp') as Element[];
          for (const sp of spNodes) {
            const txBody = qNS(sp, NS.p, 'txBody');
            if (!txBody) continue;

            const spPr = qNS(sp, NS.p, 'spPr');
            const xfrm = spPr ? qNS(spPr, NS.a, 'xfrm') : null;
            const off = xfrm ? qNS(xfrm, NS.a, 'off') : null;
            const ext = xfrm ? qNS(xfrm, NS.a, 'ext') : null;

            const xfrmData = {
              x: Number(off?.getAttribute('x')) || 0,
              y: Number(off?.getAttribute('y')) || 0,
              cx: Number(ext?.getAttribute('cx')) || 1000000,
              cy: Number(ext?.getAttribute('cy')) || 500000,
            };

            const paras: Shape['paras'] = [];
            const pNodes = qaNS(txBody, NS.a, 'p') as Element[];

            for (const p of pNodes) {
              const pPr = qNS(p, NS.a, 'pPr');
              // Get default run properties from paragraph properties (used by Google Slides)
              const defRPr = pPr ? qNS(pPr, NS.a, 'defRPr') : null;

              // Also check for endParaRPr as fallback for paragraph-level defaults
              const endParaRPr = qNS(p, NS.a, 'endParaRPr');
              const defaultProps = defRPr || endParaRPr;

              // Use parseParagraph for full support of runs, fields, and breaks
              const html = parseParagraph(p, colors, defaultProps);

              const align = pPr?.getAttribute('algn') || 'l';
              const level = Number(pPr?.getAttribute('lvl')) || 0;
              const hasBullet = !!(pPr && (qNS(pPr, NS.a, 'buChar') || qNS(pPr, NS.a, 'buAutoNum')));

              // Extract line spacing
              let lineSpacing: number | undefined;
              const lnSpc = pPr ? qNS(pPr, NS.a, 'lnSpc') : null;
              if (lnSpc) {
                const spcPct = qNS(lnSpc, NS.a, 'spcPct');
                if (spcPct) {
                  const val = spcPct.getAttribute('val');
                  if (val) lineSpacing = parseInt(val) / 1000; // val is in 1/1000 percent
                }
              }

              // Extract paragraph spacing (spaceBefore, spaceAfter)
              let spaceBefore: number | undefined;
              let spaceAfter: number | undefined;
              const spcBef = pPr ? qNS(pPr, NS.a, 'spcBef') : null;
              const spcAft = pPr ? qNS(pPr, NS.a, 'spcAft') : null;
              if (spcBef) {
                const spcPts = qNS(spcBef, NS.a, 'spcPts');
                if (spcPts) spaceBefore = parseInt(spcPts.getAttribute('val') || '0') / 100;
              }
              if (spcAft) {
                const spcPts = qNS(spcAft, NS.a, 'spcPts');
                if (spcPts) spaceAfter = parseInt(spcPts.getAttribute('val') || '0') / 100;
              }

              paras.push({ html, align, level, bullet: hasBullet, lineSpacing, spaceBefore, spaceAfter });
            }

            // Extract text box fill and border from spPr
            let fillColor: string | undefined;
            let borderColor: string | undefined;
            let borderWidth: number | undefined;

            if (spPr) {
              const solidFill = qNS(spPr, NS.a, 'solidFill');
              if (solidFill) {
                const color = parseColor(solidFill, colors);
                if (color) fillColor = color;
              }

              const ln = qNS(spPr, NS.a, 'ln');
              if (ln) {
                const lnFill = qNS(ln, NS.a, 'solidFill');
                if (lnFill) {
                  borderColor = parseColor(lnFill, colors) || undefined;
                }
                const w = ln.getAttribute('w');
                if (w) borderWidth = parseInt(w) / 12700; // EMUs to points
              }
            }

            shapes.push({ type: 'text', xfrm: xfrmData, paras, spNode: sp, fillColor, borderColor, borderWidth });
          }

          // Parse images
          const picNodes = qaNS(doc, NS.p, 'pic') as Element[];
          for (const pic of picNodes) {
            try {
              const blipFill = qNS(pic, NS.p, 'blipFill');
              const blip = blipFill ? qNS(blipFill, NS.a, 'blip') : null;
              const embedId = blip?.getAttributeNS(NS.r, 'embed');

              let imgDataUrl = '';
              if (embedId) {
                const slideRels = qaNS(relsDoc, NS.pkgRels, 'Relationship') as Element[];
                const imgRel = slideRels.find(r => r.getAttribute('Id') === embedId);
                if (imgRel) {
                  const target = imgRel.getAttribute('Target') || '';
                  const mediaPath = `ppt/${target.replace(/^\.\.\//, '')}`;
                  const imgFile = z.file(mediaPath);
                  if (imgFile) {
                    const buf = await imgFile.async('uint8array');
                    const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
                    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
                    const b64 = btoa(Array.from(buf).map(b => String.fromCharCode(b)).join(''));
                    imgDataUrl = `data:${mime};base64,${b64}`;
                  }
                }
              }

              const spPr = qNS(pic, NS.p, 'spPr');
              const xfrm = spPr ? qNS(spPr, NS.a, 'xfrm') : null;
              const off = xfrm ? qNS(xfrm, NS.a, 'off') : null;
              const ext = xfrm ? qNS(xfrm, NS.a, 'ext') : null;

              shapes.push({
                type: 'image',
                imgDataUrl,
                xfrm: {
                  x: Number(off?.getAttribute('x')) || 0,
                  y: Number(off?.getAttribute('y')) || 0,
                  cx: Number(ext?.getAttribute('cx')) || 1000000,
                  cy: Number(ext?.getAttribute('cy')) || 1000000,
                },
              });
            } catch (e) {
              console.error('[PPTX] Image parse error:', e);
            }
          }

          // Extract slide background
          let background = '#ffffff';
          const cSld = qNS(doc, NS.p, 'cSld');
          const bgElement = cSld ? qNS(cSld, NS.p, 'bg') : null;
          if (bgElement) {
            const bgPr = qNS(bgElement, NS.p, 'bgPr');
            if (bgPr) {
              const solidFill = qNS(bgPr, NS.a, 'solidFill');
              const gradFill = qNS(bgPr, NS.a, 'gradFill');

              if (solidFill) {
                const bgColor = parseColor(solidFill, colors);
                if (bgColor) background = bgColor;
              } else if (gradFill) {
                // Extract gradient colors
                const gsLst = qNS(gradFill, NS.a, 'gsLst');
                if (gsLst) {
                  const gsNodes = qaNS(gsLst, NS.a, 'gs') as Element[];
                  const gradientColors: string[] = [];
                  for (const gs of gsNodes) {
                    const gradColor = parseColor(gs, colors);
                    if (gradColor) gradientColors.push(gradColor);
                  }
                  if (gradientColors.length >= 2) {
                    background = `linear-gradient(135deg, ${gradientColors.join(', ')})`;
                  }
                }
              }
            }
            // Check for bgRef (references theme background)
            const bgRef = qNS(bgElement, NS.p, 'bgRef');
            if (bgRef) {
              const refColor = parseColor(bgRef, colors);
              if (refColor) background = refColor;
            }
          }

          loadedSlides.push({ name: s.name, doc, relsDoc, shapes, background });
        }

        if (cancelled) return;

        setZip(z);
        setPresDoc(pres);
        setPresRelsDoc(presRels);
        setSlideOrder(order);
        setSlides(loadedSlides);
        setIdx(0);
        setHasChanges(false);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[PPTX] Load error:', e);
          setErr(e.message || String(e));
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filePath]);

  // Update paragraph HTML
  const updateParaHTML = useCallback((shapeIdx: number, paraIdx: number, newHTML: string) => {
    if (!activeSlide) return;
    setSlides(prev => {
      const next = [...prev];
      const s = { ...next[idx] };
      const shapes = [...s.shapes];
      const sh = { ...shapes[shapeIdx] };
      if (sh.paras && paraIdx < sh.paras.length) {
        const paras = [...sh.paras];
        paras[paraIdx] = { ...paras[paraIdx], html: newHTML };
        sh.paras = paras;
      }
      shapes[shapeIdx] = sh;
      s.shapes = shapes;
      next[idx] = s;
      return next;
    });
    setHasChanges(true);
  }, [idx, activeSlide]);

  // Add text box
  const addTextBox = useCallback(() => {
    setSlides(prev => {
      const next = [...prev];
      const s = { ...next[idx] };
      const shapes = [...s.shapes];
      shapes.push({
        type: 'text',
        paras: [{ html: 'Click to edit', align: 'l', level: 0, bullet: false }],
        xfrm: { x: 1500000, y: 1500000, cx: 4000000, cy: 800000 },
        spNode: null,
      });
      s.shapes = shapes;
      next[idx] = s;
      return next;
    });
    setHasChanges(true);
  }, [idx]);

  // Add image
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
          const shapes = [...s.shapes];
          shapes.push({
            type: 'image',
            imgDataUrl: dataUrl,
            xfrm: { x: 1000000, y: 1000000, cx: 3000000, cy: 2000000 },
          });
          s.shapes = shapes;
          next[idx] = s;
          return next;
        });
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [idx]);

  // Add shape
  const addShape = useCallback((shapeType: string, color: string = '#4285f4') => {
    setSlides(prev => {
      const next = [...prev];
      const s = { ...next[idx] };
      const shapes = [...s.shapes];
      shapes.push({
        type: 'shape',
        shapeType,
        fillColor: color,
        xfrm: { x: 2000000, y: 2000000, cx: 2000000, cy: 1500000 },
      });
      s.shapes = shapes;
      next[idx] = s;
      return next;
    });
    setHasChanges(true);
    setShowShapePicker(false);
  }, [idx]);

  // Set slide background
  const setSlideBackground = useCallback((bg: string) => {
    setSlides(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], background: bg };
      return next;
    });
    setHasChanges(true);
    setShowBgPicker(false);
  }, [idx]);

  // Set slide gradient
  const setSlideGradient = useCallback((colors: string[]) => {
    const gradient = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    setSlides(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], background: gradient };
      return next;
    });
    setHasChanges(true);
    setShowBgPicker(false);
  }, [idx]);

  // Apply slide layout
  const applyLayout = useCallback((layout: typeof SLIDE_LAYOUTS[0]) => {
    const newShapes: Shape[] = layout.shapes.map((s: any) => ({
      type: 'text' as const,
      paras: [{ html: s.text, align: 'ctr', level: 0, bullet: false }],
      xfrm: {
        x: (s.x / 100) * 9144000,
        y: (s.y / 100) * 6858000,
        cx: (s.w / 100) * 9144000,
        cy: (s.h / 100) * 6858000,
      },
      spNode: null,
    }));
    setSlides(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], shapes: newShapes };
      return next;
    });
    setHasChanges(true);
    setShowLayoutPicker(false);
  }, [idx]);

  // Add slide
  const addSlide = useCallback(() => {
    if (!slides.length || !zip || !presDoc || !presRelsDoc) return;

    const base = slides[idx];
    const nextNum = 1 + Math.max(0, ...Object.keys(zip.files)
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .map(n => Number(n.match(/slide(\d+)\.xml$/)?.[1]) || 0));

    const newSlide: Slide = {
      name: `ppt/slides/slide${nextNum}.xml`,
      doc: base.doc?.cloneNode(true) as Document || null,
      relsDoc: base.relsDoc?.cloneNode(true) as Document || null,
      shapes: [],
    };

    setSlides(prev => [...prev, newSlide]);
    setIdx(slides.length);
    setHasChanges(true);
  }, [slides, idx, zip, presDoc, presRelsDoc]);

  // Delete slide
  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    setIdx(Math.max(0, idx - 1));
    setHasChanges(true);
  }, [slides.length, idx]);

  // Duplicate slide
  const duplicateSlide = useCallback(() => {
    if (!activeSlide) return;
    const cloned: Slide = {
      ...activeSlide,
      name: `slide${slides.length + 1}`,
      shapes: activeSlide.shapes.map(sh => ({
        ...sh,
        paras: sh.paras ? sh.paras.map(p => ({ ...p })) : undefined,
      })),
    };
    setSlides(prev => [...prev.slice(0, idx + 1), cloned, ...prev.slice(idx + 1)]);
    setIdx(idx + 1);
    setHasChanges(true);
  }, [activeSlide, slides.length, idx]);

  // Save
  const save = useCallback(async () => {
    if (!zip || !presDoc || !presRelsDoc || !hasChanges) return;
    try {
      for (const slide of slides) {
        if (slide.doc && slide.relsDoc) {
          zip.file(slide.name, new XMLSerializer().serializeToString(slide.doc));
          const relsPath = `ppt/slides/_rels/${slide.name.split('/').pop()}.rels`;
          zip.file(relsPath, new XMLSerializer().serializeToString(slide.relsDoc));
        }
      }
      zip.file('ppt/presentation.xml', new XMLSerializer().serializeToString(presDoc));
      zip.file('ppt/_rels/presentation.xml.rels', new XMLSerializer().serializeToString(presRelsDoc));

      const output = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      await window.api.writeFileBuffer(filePath, output);
      setHasChanges(false);
    } catch (e: any) {
      console.error('[PPTX] Save error:', e);
      setErr(`Save failed: ${e.message}`);
    }
  }, [zip, presDoc, presRelsDoc, slides, filePath, hasChanges]);

  // Presentation mode
  const enterPresentation = useCallback(() => {
    setIsPresentationMode(true);
    presentationRef.current?.requestFullscreen?.();
  }, []);

  const exitPresentation = useCallback(() => {
    setIsPresentationMode(false);
    document.exitFullscreen?.();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        save();
      }
      if (isPresentationMode) {
        if (e.key === 'Escape') exitPresentation();
        else if (e.key === 'ArrowRight' || e.key === ' ') {
          if (idx < slides.length - 1) setIdx(idx + 1);
        } else if (e.key === 'ArrowLeft') {
          if (idx > 0) setIdx(idx - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [save, isPresentationMode, idx, slides.length, exitPresentation]);

  // Fullscreen change
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsPresentationMode(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.dropdown-container')) {
        setShowFontPicker(false);
        setShowColorPicker(false);
        setShowShapePicker(false);
        setShowBgPicker(false);
        setShowLayoutPicker(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Render slide content
  const renderSlideContent = useCallback((slide: Slide, scale: number = 1, editable: boolean = true) => {
    return slide.shapes.map((shape, si) => {
      const style: React.CSSProperties = {
        position: 'absolute',
        left: emuToPx(shape.xfrm.x) * scale,
        top: emuToPx(shape.xfrm.y) * scale,
        width: emuToPx(shape.xfrm.cx) * scale,
        height: emuToPx(shape.xfrm.cy) * scale,
        zIndex: shape.type === 'shape' ? 0 : shape.type === 'image' ? 1 : 2,
      };

      if (shape.type === 'text') {
        // Build text box styles
        const textBoxStyle: React.CSSProperties = {
          ...style,
          padding: 4 * scale,
          boxSizing: 'border-box' as const,
        };
        if (shape.fillColor) {
          textBoxStyle.backgroundColor = shape.fillColor;
        }
        if (shape.borderColor || shape.borderWidth) {
          textBoxStyle.border = `${(shape.borderWidth || 1) * scale}px solid ${shape.borderColor || '#000000'}`;
        }

        return (
          <div key={si} style={textBoxStyle}>
            {shape.paras?.map((p, pi) => {
              // Build paragraph styles
              const paraStyle: React.CSSProperties = {
                textAlign: p.align === 'ctr' ? 'center' : p.align === 'r' ? 'right' : p.align === 'just' ? 'justify' : 'left',
                paddingLeft: p.level * 20 * scale,
                outline: 'none',
                minHeight: '1em',
                color: '#000000', // Default text color (can be overridden by inline styles)
                fontSize: `${18 * scale}px`, // Default font size
                fontFamily: 'Arial, sans-serif', // Default font
              };

              // Apply line spacing
              if (p.lineSpacing) {
                paraStyle.lineHeight = `${p.lineSpacing}%`;
              }

              // Apply paragraph spacing
              if (p.spaceBefore) {
                paraStyle.marginTop = `${p.spaceBefore * scale}pt`;
              }
              if (p.spaceAfter) {
                paraStyle.marginBottom = `${p.spaceAfter * scale}pt`;
              }

              return (
                <div
                  key={pi}
                  contentEditable={editable}
                  suppressContentEditableWarning
                  style={paraStyle}
                  onBlur={editable ? (e) => updateParaHTML(si, pi, e.currentTarget.innerHTML) : undefined}
                  dangerouslySetInnerHTML={{ __html: (p.bullet ? '<span style="margin-right:4px">•</span>' : '') + p.html }}
                />
              );
            })}
          </div>
        );
      }

      if (shape.type === 'image' && shape.imgDataUrl) {
        return (
          <div key={si} style={style}>
            <img src={shape.imgDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        );
      }

      if (shape.type === 'shape') {
        const shapeStyle: React.CSSProperties = {
          width: '100%',
          height: '100%',
          backgroundColor: shape.fillColor || '#4285f4',
        };

        // Apply shape-specific styling
        if (shape.shapeType === 'ellipse') {
          shapeStyle.borderRadius = '50%';
        } else if (shape.shapeType === 'roundRect') {
          shapeStyle.borderRadius = '12px';
        } else if (shape.shapeType === 'diamond') {
          shapeStyle.transform = 'rotate(45deg)';
          shapeStyle.width = '70%';
          shapeStyle.height = '70%';
          shapeStyle.margin = '15%';
        } else if (shape.shapeType === 'triangle') {
          shapeStyle.backgroundColor = 'transparent';
          shapeStyle.borderLeft = `${emuToPx(shape.xfrm.cx) * scale / 2}px solid transparent`;
          shapeStyle.borderRight = `${emuToPx(shape.xfrm.cx) * scale / 2}px solid transparent`;
          shapeStyle.borderBottom = `${emuToPx(shape.xfrm.cy) * scale}px solid ${shape.fillColor || '#4285f4'}`;
        } else if (shape.shapeType === 'star') {
          shapeStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        } else if (shape.shapeType === 'hexagon') {
          shapeStyle.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
        } else if (shape.shapeType === 'arrow') {
          shapeStyle.clipPath = 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
        } else if (shape.shapeType === 'line') {
          shapeStyle.height = '4px';
          shapeStyle.marginTop = `${emuToPx(shape.xfrm.cy) * scale / 2}px`;
        }

        return <div key={si} style={{ ...style, ...shapeStyle }} />;
      }

      return null;
    });
  }, [emuToPx, updateParaHTML]);

  // Error state
  if (err) {
    return (
      <div className="h-full flex flex-col theme-bg-secondary p-4">
        <div className="text-red-500">
          <h3 className="font-bold mb-2">Error loading presentation</h3>
          <p className="text-sm mb-4">{err}</p>
          <button onClick={() => { setErr(null); setLoading(true); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center theme-bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm theme-text-muted">Loading presentation...</p>
        </div>
      </div>
    );
  }

  // No slides
  if (!slides.length || !activeSlide) {
    return (
      <div className="h-full flex items-center justify-center theme-bg-secondary">
        <p className="theme-text-muted">No slides found</p>
      </div>
    );
  }

  // Presentation mode
  if (isPresentationMode) {
    const scale = Math.min(window.innerWidth / slideWidth, window.innerHeight / slideHeight);
    return (
      <div
        ref={presentationRef}
        className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
        onClick={(e) => {
          const x = e.clientX;
          if (x > window.innerWidth / 2) {
            if (idx < slides.length - 1) setIdx(idx + 1);
          } else {
            if (idx > 0) setIdx(idx - 1);
          }
        }}
      >
        <div
          className="relative bg-white"
          style={{ width: slideWidth * scale, height: slideHeight * scale }}
        >
          {renderSlideContent(activeSlide, scale, false)}
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
          {idx + 1} / {slides.length}
        </div>
        <div className="absolute top-4 right-4 text-white/30 text-xs">ESC to exit</div>
      </div>
    );
  }

  // Main editor
  return (
    <div className="h-full flex flex-col theme-bg-secondary overflow-hidden">
      {/* Header */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          const nodePath = findNodePath?.(rootLayoutNode, nodeId) || [];
          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pane', id: nodeId, nodePath }));
          setTimeout(() => setDraggedItem?.({ type: 'pane', id: nodeId, nodePath }), 0);
        }}
        onDragEnd={() => setDraggedItem?.(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setPaneContextMenu?.({ isOpen: true, x: e.clientX, y: e.clientY, nodeId, nodePath: findNodePath?.(rootLayoutNode, nodeId) || [] });
        }}
        className="px-3 py-2 border-b theme-border theme-bg-secondary cursor-move flex items-center justify-between"
      >
        <span className="text-sm font-medium truncate">
          {filePath?.split('/').pop() || 'Presentation'}{hasChanges ? ' *' : ''}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={addSlide} className="p-1.5 theme-hover rounded" title="Add slide"><Plus size={14} /></button>
          <button onClick={duplicateSlide} className="p-1.5 theme-hover rounded" title="Duplicate"><Copy size={14} /></button>
          <button onClick={deleteSlide} disabled={slides.length <= 1} className="p-1.5 theme-hover rounded disabled:opacity-30" title="Delete"><Trash2 size={14} /></button>
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <button onClick={enterPresentation} className="p-1.5 theme-hover rounded" title="Present"><Play size={14} /></button>
          <button onClick={save} disabled={!hasChanges} className="p-1.5 theme-hover rounded disabled:opacity-30" title="Save"><Save size={14} /></button>
          <button onClick={() => closeContentPane?.(nodeId, findNodePath?.(rootLayoutNode, nodeId) || [])} className="p-1.5 theme-hover rounded-full" title="Close"><X size={14} /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-2 py-1.5 border-b theme-border theme-bg-tertiary flex items-center gap-1 flex-wrap">
        {/* Font */}
        <div className="relative dropdown-container">
          <button
            onClick={(e) => { e.stopPropagation(); setShowFontPicker(!showFontPicker); }}
            className="px-2 py-1 text-[11px] theme-hover rounded flex items-center gap-1 min-w-[90px] border border-white/10"
          >
            <Type size={12} />
            <span className="truncate">{currentFont}</span>
            <ChevronDown size={10} />
          </button>
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 max-h-48 overflow-y-auto">
              {FONTS.map(font => (
                <button
                  key={font}
                  onClick={() => { setCurrentFont(font); setShowFontPicker(false); document.execCommand('fontName', false, font); }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700"
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font size */}
        <select
          value={currentFontSize}
          onChange={(e) => { setCurrentFontSize(e.target.value); document.execCommand('fontSize', false, e.target.value); }}
          className="px-1.5 py-1 rounded theme-bg-secondary border border-white/10 text-[11px] w-14"
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        {/* Formatting */}
        <button onClick={() => document.execCommand('bold')} className="p-1.5 theme-hover rounded" title="Bold"><Bold size={14} /></button>
        <button onClick={() => document.execCommand('italic')} className="p-1.5 theme-hover rounded" title="Italic"><Italic size={14} /></button>
        <button onClick={() => document.execCommand('underline')} className="p-1.5 theme-hover rounded" title="Underline"><Underline size={14} /></button>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        {/* Color */}
        <div className="relative dropdown-container">
          <button
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
            className="p-1.5 theme-hover rounded"
            title="Text Color"
          >
            <Palette size={14} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 p-2">
              <div className="grid grid-cols-6 gap-1">
                {THEME_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { document.execCommand('foreColor', false, c); setShowColorPicker(false); }}
                    className="w-5 h-5 rounded border border-gray-600 hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        {/* Alignment */}
        <button onClick={() => document.execCommand('justifyLeft')} className="p-1.5 theme-hover rounded" title="Left"><AlignLeft size={14} /></button>
        <button onClick={() => document.execCommand('justifyCenter')} className="p-1.5 theme-hover rounded" title="Center"><AlignCenter size={14} /></button>
        <button onClick={() => document.execCommand('justifyRight')} className="p-1.5 theme-hover rounded" title="Right"><AlignRight size={14} /></button>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        {/* Insert */}
        <button onClick={addTextBox} className="p-1.5 theme-hover rounded" title="Text Box"><Type size={14} /></button>
        <button onClick={addImage} className="p-1.5 theme-hover rounded" title="Image"><ImageIcon size={14} /></button>

        <div className="relative dropdown-container">
          <button
            onClick={(e) => { e.stopPropagation(); setShowShapePicker(!showShapePicker); }}
            className="p-1.5 theme-hover rounded"
            title="Shapes"
          >
            <Square size={14} />
          </button>
          {showShapePicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 p-2">
              <div className="text-[10px] text-gray-400 mb-1 px-1">Shape color</div>
              <div className="grid grid-cols-6 gap-1 mb-2 pb-2 border-b border-gray-700">
                {THEME_COLORS.slice(0, 12).map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedShapeColor(c)}
                    className={`w-5 h-5 rounded border ${selectedShapeColor === c ? 'border-white' : 'border-gray-600'} hover:scale-110`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {SHAPE_PRESETS.map(s => (
                  <button
                    key={s.type}
                    onClick={() => addShape(s.type, selectedShapeColor)}
                    className="p-2 theme-hover rounded flex items-center gap-2 text-xs"
                  >
                    <s.icon size={14} />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        {/* Background */}
        <div className="relative dropdown-container">
          <button
            onClick={(e) => { e.stopPropagation(); setShowBgPicker(!showBgPicker); }}
            className="p-1.5 theme-hover rounded"
            title="Slide Background"
          >
            <PaintBucket size={14} />
          </button>
          {showBgPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 p-2 min-w-[200px]">
              <div className="text-[10px] text-gray-400 mb-1">Solid Colors</div>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {BACKGROUND_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setSlideBackground(c)}
                    className="w-7 h-7 rounded border border-gray-600 hover:scale-110"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="text-[10px] text-gray-400 mb-1">Gradients</div>
              <div className="grid grid-cols-4 gap-1">
                {GRADIENT_PRESETS.map(g => (
                  <button
                    key={g.name}
                    onClick={() => setSlideGradient(g.colors)}
                    className="w-10 h-6 rounded border border-gray-600 hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})` }}
                    title={g.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="relative dropdown-container">
          <button
            onClick={(e) => { e.stopPropagation(); setShowLayoutPicker(!showLayoutPicker); }}
            className="p-1.5 theme-hover rounded"
            title="Slide Layout"
          >
            <Layout size={14} />
          </button>
          {showLayoutPicker && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 py-1 min-w-[130px]">
              {SLIDE_LAYOUTS.map(layout => (
                <button
                  key={layout.name}
                  onClick={() => applyLayout(layout)}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700"
                >
                  {layout.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Navigation */}
        <span className="text-[10px] text-gray-400 px-2">Slide {idx + 1}/{slides.length}</span>
        <button onClick={() => idx > 0 && setIdx(idx - 1)} disabled={idx === 0} className="p-1.5 theme-hover rounded disabled:opacity-30"><ChevronLeft size={14} /></button>
        <button onClick={() => idx < slides.length - 1 && setIdx(idx + 1)} disabled={idx === slides.length - 1} className="p-1.5 theme-hover rounded disabled:opacity-30"><ChevronRight size={14} /></button>

        <div className="w-px h-5 bg-gray-600 mx-1" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 theme-hover rounded"><ZoomOut size={14} /></button>
        <span className="text-[10px] text-gray-400 w-10 text-center">{zoom}%</span>
        <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 theme-hover rounded"><ZoomIn size={14} /></button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Slide panel */}
        <div className="w-48 border-r theme-border overflow-y-auto theme-bg-tertiary p-2 space-y-2">
          {slides.map((slide, i) => (
            <button
              key={slide.name + i}
              onClick={() => setIdx(i)}
              className={`w-full relative rounded overflow-hidden border-2 transition-colors ${
                i === idx ? 'border-blue-500' : 'border-transparent hover:border-gray-600'
              }`}
            >
              {/* Thumbnail */}
              <div
                className="relative"
                style={{
                  width: '100%',
                  paddingBottom: `${(slideHeight / slideWidth) * 100}%`,
                  background: slide.background || '#ffffff',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{ transform: `scale(${160 / slideWidth})`, transformOrigin: 'top left' }}
                >
                  <div style={{ width: slideWidth, height: slideHeight, position: 'relative', background: slide.background || '#ffffff' }}>
                    {renderSlideContent(slide, 1, false)}
                  </div>
                </div>
              </div>
              {/* Slide number */}
              <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1 rounded">
                {i + 1}
              </div>
            </button>
          ))}
        </div>

        {/* Editor canvas */}
        <div className="flex-1 flex flex-col overflow-auto theme-bg-primary p-6">
          <div
            className="relative shadow-2xl mx-auto flex-shrink-0 rounded overflow-hidden"
            style={{
              width: slideWidth * (zoom / 100),
              height: slideHeight * (zoom / 100),
              background: activeSlide.background || '#ffffff',
            }}
          >
            <div
              style={{
                width: slideWidth,
                height: slideHeight,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                position: 'relative',
                background: activeSlide.background || '#ffffff',
              }}
            >
              {renderSlideContent(activeSlide, 1, true)}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 theme-bg-secondary rounded border theme-border shadow-sm mx-auto" style={{ width: slideWidth * (zoom / 100) }}>
            <div className="px-3 py-1 text-[11px] theme-text-muted border-b theme-border">Speaker notes</div>
            <textarea
              className="w-full p-3 bg-transparent outline-none min-h-[80px] text-xs theme-text-primary resize-none"
              placeholder="Add notes..."
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t theme-border theme-bg-tertiary text-[10px] text-gray-500 flex items-center justify-between">
        <span>Slide {idx + 1} of {slides.length}</span>
        <span>{hasChanges ? '● Unsaved changes' : 'Saved'}</span>
      </div>
    </div>
  );
};

export default memo(PptxViewer);
