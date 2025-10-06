import React, { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const appHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#c678dd' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e06c75' },
  { tag: [t.function(t.variableName), t.labelName], color: '#61afef' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#d19a66' },
  { tag: [t.definition(t.name), t.function(t.definition(t.name))], color: '#e5c07b' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#d19a66' },
  { tag: [t.operator, t.operatorKeyword], color: '#56b6c2' },
  { tag: [t.meta, t.comment], color: '#7f848e', fontStyle: 'italic' },
  { tag: [t.string, t.inserted], color: '#98c379' },
  { tag: t.invalid, color: '#ff5555' },
]);
const CodeEditor = ({ value, onChange, filePath, onSave, onContextMenu, onSelect }) => {
  const editorRef = useRef(null);

  const languageExtension = useMemo(() => {
    const ext = filePath?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return javascript({ jsx: true });
      case 'py': return python();
      default: return [];
    }
  }, [filePath]);

  const customKeymap = useMemo(() => keymap.of([
    { key: 'Mod-s', run: () => { if (onSave) onSave(); return true; }},
  ]), [onSave]);

  const extensions = useMemo(() => [
    languageExtension,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    customKeymap,
    EditorView.lineWrapping,
    syntaxHighlighting(appHighlightStyle),
  ], [languageExtension, customKeymap]);

  const handleUpdate = useCallback((viewUpdate) => {
    if (viewUpdate.selectionSet && onSelect) {
      const { from, to } = viewUpdate.state.selection.main;
      onSelect(from, to);
    }
  }, [onSelect]);

  useEffect(() => {
    const editorDOM = editorRef.current?.editor;
    if (editorDOM) {
      const handleContextMenu = (event) => { if (onContextMenu) onContextMenu(event); };
      editorDOM.addEventListener('contextmenu', handleContextMenu);
      return () => editorDOM.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [onContextMenu]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="auto" 
      extensions={extensions}
      onChange={onChange}
      onUpdate={handleUpdate}
  />
  );
};
export default memo(CodeEditor);