import React, { useMemo, useCallback, useRef, useEffect, useState, memo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { search, searchKeymap } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
    const handleFileSave = async () => {
        if (!currentFile || !fileChanged || isSaving) return;
        try {
            setIsSaving(true);
            const response = await window.api.writeFileContent(currentFile, fileContent);
            if (response.error) throw new Error(response.error);
            setFileChanged(false);
            
           
            const structureResult = await window.api.readDirectoryStructure(currentPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
            }
            
            console.log('File saved successfully');
        } catch (err) {
            console.error('Error saving file:', err);
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };
    const handleFileContentChange = useCallback((value) => {
        setFileContent(value);
        setFileChanged(true);
    }, []);
const generateInlineDiff = (unifiedDiffText) => {
    const diff = [];
    const lines = unifiedDiffText.split('\n');
    let originalLineNum = 0;
    let modifiedLineNum = 0;

    for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++')) {
            continue;
        }

        if (line.startsWith('@@')) {
            const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                originalLineNum = parseInt(match[1]); // Starting line number in original file
                modifiedLineNum = parseInt(match[3]); // Starting line number in modified file
            }
            continue;
        }

        if (line.startsWith('-')) {
            diff.push({ type: 'removed', content: line.substring(1), originalLine: originalLineNum, modifiedLine: null });
            originalLineNum++;
        } else if (line.startsWith('+')) {
            diff.push({ type: 'added', content: line.substring(1), originalLine: null, modifiedLine: modifiedLineNum });
            modifiedLineNum++;
        } else if (line.startsWith(' ')) {
            diff.push({ type: 'unchanged', content: line.substring(1), originalLine: originalLineNum, modifiedLine: modifiedLineNum });
            originalLineNum++;
            modifiedLineNum++;
        }
    }
    console.log('generateInlineDiff output:', diff);
    return diff;
};
const startAgenticEdit = async (instruction) => {
    const contexts = gatherWorkspaceContext();
    
    if (contexts.length === 0) {
        setError("No open files or contexts to work with");
        return;
    }
    
    const fileContexts = contexts.filter(c => c.type === 'file');
    
    if (fileContexts.length === 0) {
        setError("No open files to edit");
        return;
    }
    
    const contextPrompt = fileContexts.map(ctx => 
        `File: ${ctx.path}\n\`\`\`\n${ctx.content}\n\`\`\``
    ).join('\n\n');
    
    const fullPrompt = `${instruction}

Available files in workspace:
${contextPrompt}

For each file you want to modify, respond with a unified diff. If there are multiple distinct logical changes within a single file, please provide a separate 'FILE: <filepath>\nREASONING: <why this change>\n\`\`\`diff\n...\`\`\`' block for each of them.

Use this exact format:
FILE: <filepath>
REASONING: <why this change>
\`\`\`diff
--- a/<filepath>
+++ b/<filepath>
@@ -<line>,<count> +<line>,<count> @@
 context line
-removed line
+added line
 context line
\`\`\`

Only show the lines that change, with a few lines of context. Multiple files = multiple FILE blocks.`; // <-- EXPLICITLY ASKING FOR UNIFIED DIFFS AND DISTINCT BLOCKS!

    const newStreamId = generateId();
    
    setAiEditModal({
        isOpen: true,
        type: 'agentic',
        selectedText: '',
        selectionStart: 0,
        selectionEnd: 0,
        aiResponse: '',
        showDiff: false,
        isLoading: true,
        streamId: newStreamId,
        modelForEdit: currentModel,
        npcForEdit: currentNPC,
        workspaceContexts: fileContexts,
        proposedChanges: []
    });

    try {
        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);
        
            await window.api.executeCommandStream({
                commandstr: fullPrompt,
                currentPath,
                conversationId: null,
                model: currentModel,
                provider: currentProvider,
                npc: selectedNpc ? selectedNpc.name : currentNPC,
                npcSource: selectedNpc ? selectedNpc.source : 'global',
                attachments: [],
                streamId: newStreamId,
                executionMode: executionMode,
                mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
                selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined
            });
    } catch (err) {
        console.error('Error starting agentic edit:', err);
        setError(err.message);
        setAiEditModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
    }
};
const parseAgenticResponse = (response, contexts) => {
    const changes = [];
    const fileRegex = /FILE:\s*(.+?)\s*\nREASONING:\s*(.+?)\s*\n```diff\n([\s\S]*?)```/gi;
    
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
        const filePath = match[1].trim();
        const reasoning = match[2].trim();
        const rawUnifiedDiffText = match[3].trim();
        
        const context = contexts.find(c => 
            c.path.includes(filePath) || filePath.includes(c.path.split('/').pop())
        );
        
        if (context) {
            const newCode = applyUnifiedDiff(context.content, rawUnifiedDiffText);
            
            changes.push({
                paneId: context.paneId,
                filePath: context.path,
                reasoning: reasoning,
                originalCode: context.content,
                newCode: newCode,
                diff: generateInlineDiff(rawUnifiedDiffText) || []
            });
        }
    }
    
    console.log('Parsed agent changes:', changes);
    return changes;
};
const applyUnifiedDiff = (originalContent, unifiedDiffText) => {
    console.log('--- applyUnifiedDiff START ---'); // <--- LAVANZARO'S LOGGING!
    console.log('Original Content (first 10 lines):\n', originalContent.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!
    console.log('Unified Diff Text (first 10 lines):\n', unifiedDiffText.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!

    const originalLines = originalContent.split('\n');
    const diffLines = unifiedDiffText.split('\n');
    const resultLines = [];
    
    let currentOriginalIndex = 0; // Pointer for originalLines
    
    for (const diffLine of diffLines) {
        console.log(`Processing diffLine: "${diffLine}" (currentOriginalIndex: ${currentOriginalIndex})`); // <--- LAVANZARO'S LOGGING!

        if (diffLine.startsWith('---') || diffLine.startsWith('+++')) {
            continue;
        }
        
        if (diffLine.startsWith('@@')) {
            const match = diffLine.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
            if (match) {
                const originalHunkStart = parseInt(match[1]) - 1; // 0-indexed
                
                // Add lines from original that are *before* this hunk
                while (currentOriginalIndex < originalHunkStart) {
                    if (currentOriginalIndex < originalLines.length) { // Safety check
                        resultLines.push(originalLines[currentOriginalIndex]);
                        console.log(`  Added original context line (before hunk): ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
                    } else {
                        console.warn("applyUnifiedDiff: Attempted to add original line beyond file bounds before hunk:", currentOriginalIndex); // <--- LAVANZARO'S LOGGING!
                    }
                    currentOriginalIndex++;
                }
            }
            continue;
        }
        
        if (diffLine.startsWith('-')) {
            // Line removed. Just advance original index.
            console.log(`  Removed line (original): ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
            currentOriginalIndex++;
        } else if (diffLine.startsWith('+')) {
            // Line added. Add to result.
            resultLines.push(diffLine.substring(1));
            console.log(`  Added new line: ${diffLine.substring(1)}`); // <--- LAVANZARO'S LOGGING!
        } else if (diffLine.startsWith(' ')) {
            // Context line. Add from original and advance both.
            if (currentOriginalIndex < originalLines.length) {
                resultLines.push(originalLines[currentOriginalIndex]);
                console.log(`  Added unchanged context line: ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
                currentOriginalIndex++;
            } else {
                console.warn("applyUnifiedDiff: Context line references beyond original content, ignoring:", diffLine); // <--- LAVANZARO'S LOGGING!
            }
        }
        console.log(`  resultLines length: ${resultLines.length}`); // <--- LAVANZARO'S LOGGING!
    }
    
    // Add any remaining lines from the original content after the last hunk
    while (currentOriginalIndex < originalLines.length) {
        resultLines.push(originalLines[currentOriginalIndex]);
        console.log(`Adding remaining original line: ${originalLines[currentOriginalIndex]}`); // <--- LAVANZARO'S LOGGING!
        currentOriginalIndex++;
    }
    
    const newContent = resultLines.join('\n');
    console.log('New Content (first 10 lines):\n', newContent.split('\n').slice(0, 10).join('\n')); // <--- LAVANZARO'S LOGGING!
    console.log('--- applyUnifiedDiff END ---'); // <--- LAVANZARO'S LOGGING!
    return newContent;
};



    const handleTextSelection = useCallback((from, to) => {
       
        if (!activeContentPaneId) return;
        const paneData = contentDataRef.current[activeContentPaneId];
       
        if (!paneData || paneData.contentType !== 'editor') return;

        const selectedText = (paneData.fileContent || '').substring(from, to);
        if (selectedText.length > 0) {
            setAiEditModal(prev => ({
                ...prev,
                selectedText,
                selectionStart: from,
                selectionEnd: to,
            }));
        }
    }, [activeContentPaneId]);

    const handleEditorCopy = () => {
        const selectedText = aiEditModal.selectedText;
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
        }
        setEditorContextMenuPos(null);
    };
    
    const handleEditorPaste = async () => {
        const paneId = activeContentPaneId;
        const paneData = contentDataRef.current[paneId];
        if (!paneId || !paneData || paneData.contentType !== 'editor') return;
    
        try {
            const textToPaste = await navigator.clipboard.readText();
            if (!textToPaste) return;
    
            const originalContent = paneData.fileContent || '';
            const { selectionStart, selectionEnd } = aiEditModal;
    
           
            const newContent = originalContent.substring(0, selectionStart) +
                               textToPaste +
                               originalContent.substring(selectionEnd);
            
           
            paneData.fileContent = newContent;
            paneData.fileChanged = true;
    
            setRootLayoutNode(p => ({ ...p }));
        } catch (err) {
            console.error("Failed to read from clipboard:", err);
            setError("Clipboard paste failed. Please grant permission if prompted.");
        } finally {
            setEditorContextMenuPos(null);
        }
    };
    


const handleEditorContextMenu = (e) => {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    e.preventDefault();
    
    setAiEditModal(prev => ({
        ...prev,
        selectedText,
        selectionStart: start,
        selectionEnd: end
    }));
    
    setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
};

const handleAIEdit = async (action, customPrompt = null) => {
   
    setEditorContextMenuPos(null);

   
   
    if (action === 'edit' && customPrompt === null) {
        setPromptModal({
            isOpen: true,
            title: 'Customize AI Edit',
            message: 'Describe the changes you want the AI to make to the selected code.',
            defaultValue: 'Refactor this for clarity and efficiency',
            onConfirm: (userPrompt) => {
               
                handleAIEdit('edit', userPrompt);
            },
        });
        return;
    }

   

    const newStreamId = generateId();
    
    setAiEditModal(prev => ({
        ...prev,
        isOpen: true,
        type: action,
        isLoading: true,
        aiResponse: '',
        showDiff: action !== 'ask',
        streamId: newStreamId,
        modelForEdit: currentModel,
        npcForEdit: currentNPC,
        customEditPrompt: customPrompt || ''
    }));

    try {
        let finalPrompt = '';
        const activePaneData = contentDataRef.current[activeContentPaneId];
        const selectedText = activePaneData ? (activePaneData.fileContent || '').substring(aiEditModal.selectionStart, aiEditModal.selectionEnd) : '';

        if (!selectedText) throw new Error("No text selected.");

        switch (action) {
            case 'ask':
                finalPrompt = `Please analyze and explain this code. Provide a concise overview, highlighting its purpose, key components, and any notable patterns or potential improvements:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
            case 'document':
                finalPrompt = `Add comprehensive inline comments and, if appropriate, a docstring to this code. Ensure the comments explain complex logic, parameters, return values, and any assumptions. Return only the commented version of the code, preserving original indentation and structure:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
            case 'edit':
                finalPrompt = `${customPrompt}\n\nHere is the code to apply changes to. Return only the modified code:\n\n\`\`\`\n${selectedText}\n\`\`\``;
                break;
        }

        const selectedNpc = availableNPCs.find(npc => npc.value === currentNPC);

        const result = await window.api.executeCommandStream({
            commandstr: finalPrompt,
            currentPath,
            conversationId: null,
            model: currentModel,
            provider: currentProvider,
            npc: selectedNpc ? selectedNpc.name : currentNPC,
            npcSource: selectedNpc ? selectedNpc.source : 'global',
            attachments: [],
            streamId: newStreamId, 
            executionMode: executionMode,
            tools: executionMode === 'agent' ? selectedTools : [],
            mcpServerPath: executionMode === 'tool_agent' ? mcpServerPath : undefined,
            selectedMcpTools: executionMode === 'tool_agent' ? selectedMcpTools : undefined,
        
        });

        if (result && result.error) {
            throw new Error(result.error);
        }

    } catch (err) {
        console.error('Error processing AI edit:', err);
        setError(err.message);
        setAiEditModal(prev => ({
            ...prev,
            isLoading: false,
            isOpen: false,
        }));
    }
};
const generateDiff = (original, modified) => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const diff = [];
    let i = 0, j = 0;
    
    while (i < originalLines.length || j < modifiedLines.length) {
        if (i >= originalLines.length) {
           
            diff.push({ type: 'added', content: modifiedLines[j], lineNumber: j + 1 });
            j++;
        } else if (j >= modifiedLines.length) {
           
            diff.push({ type: 'removed', content: originalLines[i], lineNumber: i + 1 });
            i++;
        } else if (originalLines[i] === modifiedLines[j]) {
           
            diff.push({ type: 'unchanged', content: originalLines[i], lineNumber: i + 1 });
            i++;
            j++;
        } else {
           
            diff.push({ type: 'removed', content: originalLines[i], lineNumber: i + 1 });
            diff.push({ type: 'added', content: modifiedLines[j], lineNumber: j + 1 });
            i++;
            j++;
        }
    }
    
    return diff;
};
const applyAIEdit = () => {
   
    if (!activeContentPaneId) return;
    const paneData = contentDataRef.current[activeContentPaneId];
   
    if (!paneData || paneData.contentType !== 'editor') return;

    const originalContent = paneData.fileContent || '';

    const newContent = originalContent.substring(0, aiEditModal.selectionStart) + 
                      aiEditModal.aiResponse + 
                      originalContent.substring(aiEditModal.selectionEnd);
    
   
    paneData.fileContent = newContent;
    paneData.fileChanged = true;

   
    setRootLayoutNode(p => ({ ...p }));
    
   
    setAiEditModal({ isOpen: false, type: '', selectedText: '', selectionStart: 0, selectionEnd: 0, aiResponse: '', showDiff: false, isLoading: false });
};


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
    search({top:true}),
    keymap.of([
      ...defaultKeymap, 
      ...historyKeymap, 
      ...searchKeymap,
    ]),
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



// Update renderFileEditor to properly handle double-click rename
const renderFileEditor = useCallback(({ nodeId }) => {
    const paneData = contentDataRef.current[nodeId];
    if (!paneData) return null;

    const { contentId: filePath, fileContent, fileChanged } = paneData;
    const fileName = filePath?.split('/').pop() || 'Untitled';
    const isRenaming = renamingPaneId === nodeId;

    const onContentChange = (value) => {
        if (contentDataRef.current[nodeId]) {
            contentDataRef.current[nodeId].fileContent = value;
            if (!contentDataRef.current[nodeId].fileChanged) {
                contentDataRef.current[nodeId].fileChanged = true;
                setRootLayoutNode(p => ({ ...p }));
            }
        }
    };

    const onSave = async () => {
        const currentPaneData = contentDataRef.current[nodeId];
        if (currentPaneData?.contentId && currentPaneData.fileChanged) {
            await window.api.writeFileContent(currentPaneData.contentId, currentPaneData.fileContent);
            currentPaneData.fileChanged = false;
            setRootLayoutNode(p => ({ ...p }));
        }
    };
    
    const onEditorContextMenu = (e) => {
        if (activeContentPaneId === nodeId) {
            e.preventDefault();
            setEditorContextMenuPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleStartRename = () => {
        setRenamingPaneId(nodeId);
        setEditedFileName(fileName);
    };  

    return (
        <div className="flex-1 flex flex-col min-h-0 theme-bg-secondary relative">
            {/* PaneHeader removed from here */}
            <div className="flex-1 overflow-scroll min-h-0">
                <CodeEditor
                    value={fileContent || ''}
                    onChange={onContentChange}
                    onSave={onSave}
                    filePath={filePath}
                    onSelect={handleTextSelection}
                    onContextMenu={onEditorContextMenu}
                />
            </div>

            {editorContextMenuPos && activeContentPaneId === nodeId && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setEditorContextMenuPos(null)}
                    />
                    <div
                        className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                        style={{
                            top: `${editorContextMenuPos.y}px`,
                            left: `${editorContextMenuPos.x}px`
                        }}
                    >
                        <button onClick={handleEditorCopy} disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            Copy
                        </button>
                        <button onClick={handleEditorPaste}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            Paste
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={handleAddToChat} disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            Add to Chat
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button onClick={() => { handleAIEdit('ask'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <MessageSquare size={16} />Explain
                        </button>
                        <button onClick={() => { handleAIEdit('document'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <FileText size={16} />Add Comments
                        </button>
                        <button onClick={() => { handleAIEdit('edit'); setEditorContextMenuPos(null); }}
                            disabled={!aiEditModal.selectedText}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm disabled:opacity-50">
                            <Edit size={16} />Refactor
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                handleStartRename();
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary text-sm">
                            <Edit size={16} />Rename File
                        </button>
                        <div className="border-t theme-border my-1"></div>
                        <button
                            onClick={() => {
                                setEditorContextMenuPos(null);
                                setPromptModal({
                                    isOpen: true,
                                    title: 'Agentic Code Edit',
                                    message: 'What would you like AI to do with all open files?',
                                    defaultValue: 'Add error handling and improve code quality',
                                    onConfirm: (instruction) => startAgenticEdit(instruction)
                                });
                            }}
                            className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left text-blue-400 text-sm">
                            <BrainCircuit size={16} />Agentic Edit (All Files)
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}, [contentDataRef, activeContentPaneId, editorContextMenuPos, aiEditModal, renamingPaneId, editedFileName, handleTextSelection, handleEditorCopy, handleEditorPaste, handleAddToChat, handleAIEdit, startAgenticEdit, setRootLayoutNode, setRenamingPaneId, setEditedFileName, setEditorContextMenuPos, setPromptModal]);




    const renderFileContextMenu = () => (
        fileContextMenuPos && (
            <>
                {/* Backdrop to catch outside clicks */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setFileContextMenuPos(null)}
                />
                <div
                    className="fixed theme-bg-secondary theme-border border rounded shadow-lg py-1 z-50"
                    style={{ top: fileContextMenuPos.y, left: fileContextMenuPos.x }}
                    onMouseLeave={() => setFileContextMenuPos(null)}
                >
                    <button
                        onClick={() => handleApplyPromptToFiles('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('summarize')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <MessageSquare size={16} />
                        <span>Summarize in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze Files ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFilesInInput('analyze')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Edit size={16} />
                        <span>Analyze in Input Field ({selectedFiles.size})</span>
                    </button>
                    <div className="border-t theme-border my-1"></div>
                    <button
                        onClick={() => handleApplyPromptToFiles('refactor')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <Code2 size={16} />
                        <span>Refactor Code ({selectedFiles.size})</span>
                    </button>
                    <button
                        onClick={() => handleApplyPromptToFiles('document')}
                        className="flex items-center gap-2 px-4 py-2 theme-hover w-full text-left theme-text-primary"
                    >
                        <FileText size={16} />
                        <span>Document Code ({selectedFiles.size})</span>
                    </button>
                </div>
            </>
        )
    );