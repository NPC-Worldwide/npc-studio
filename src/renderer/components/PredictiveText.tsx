const handleGlobalPredictionTrigger = useCallback((e) => {
    if (!isPredictiveTextEnabled || !predictiveTextModel || !predictiveTextProvider) {
        setPredictionSuggestion('');
        setPredictionTargetElement(null);
        return;
    }

    // ---- ACCEPT WITH TAB ----
    if (e.key === 'Tab') {
        if (predictionSuggestion && predictionTargetElement) {
            e.preventDefault();

            const suggestion = predictionSuggestion.replace(/^Generating\.\.\.\s*/, '');
            if (!suggestion) return;

            const el = predictionTargetElement;
            if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
                const start = el.selectionStart ?? 0;
                const end   = el.selectionEnd ?? start;
                const before = el.value.slice(0, start);
                const after  = el.value.slice(end);
                el.value = before + suggestion + after;

                const newPos = before.length + suggestion.length;
                el.selectionStart = newPos;
                el.selectionEnd   = newPos;

                el.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (el && el.isContentEditable) {
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(suggestion));
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }

            setPredictionSuggestion('');
            setPredictionTargetElement(null);
            if (predictionStreamIdRef.current) {
                window.api.interruptStream?.(predictionStreamIdRef.current);
                predictionStreamIdRef.current = null;
            }
        }
        return; // never start a new prediction on Tab
    }

    // ---- REJECT WITH ESC ----
    if (e.key === 'Escape') {
        setPredictionSuggestion('');
        setPredictionTargetElement(null);
        if (predictionStreamIdRef.current) {
            window.api.interruptStream?.(predictionStreamIdRef.current);
            predictionStreamIdRef.current = null;
        }
        return;
    }

    // ---- UNCONDITIONAL PREDICT ON TYPING (no ctrl/meta/alt) ----
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const activeElement = document.activeElement;
    const isEditable = activeElement &&
        (activeElement instanceof HTMLTextAreaElement ||
         activeElement instanceof HTMLInputElement ||
         activeElement.isContentEditable);

    if (!isEditable) {
        setPredictionSuggestion('');
        setPredictionTargetElement(null);
        return;
    }

    const textContent = activeElement.value || activeElement.textContent || '';
    let cursorPosition = 0;

    if (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement) {
        cursorPosition = activeElement.selectionStart ?? textContent.length;
    } else if (activeElement.isContentEditable) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const pre = range.cloneRange();
            pre.selectNodeContents(activeElement);
            pre.setEnd(range.endContainer, range.endOffset);
            cursorPosition = pre.toString().length;
        }
    }

    if (textContent.length === 0) {
        setPredictionSuggestion('');
        setPredictionTargetElement(null);
        return;
    }

    // kill prior stream so tokens don't interleave
    if (predictionStreamIdRef.current) {
        window.api.interruptStream?.(predictionStreamIdRef.current);
        predictionStreamIdRef.current = null;
    }

    setPredictionTargetElement(activeElement);
    setPredictionSuggestion(PRED_PLACEHOLDER);

    const newStreamId = generateId();
    predictionStreamIdRef.current = newStreamId;

    let contextType = 'general';
    let filePathForContext = null;
    if (activeElement.dataset?.contextType) {
        contextType = activeElement.dataset.contextType;
        filePathForContext = activeElement.dataset.filePath ?? null;
    } else if (activeElement.classList?.contains('chat-input-textarea')) {
        contextType = 'chat';
    } else if (activeElement.classList?.contains('browser-url-input')) {
        contextType = 'browser';
    }

    if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
        predictionTimeoutRef.current = null;
    }

    predictionTimeoutRef.current = setTimeout(async () => {
        await window.api.textPredict({
            streamId: newStreamId,
            text_content: textContent,
            cursor_position: cursorPosition,
            currentPath,
            model: predictiveTextModel,
            provider: predictiveTextProvider,
            context_type: contextType,
            file_path: filePathForContext,
        });
    }, 250);
}, [
    isPredictiveTextEnabled,
    predictiveTextModel,
    predictiveTextProvider,
    currentPath,
    setPredictionSuggestion,
    setPredictionTargetElement,
    predictionStreamIdRef,
    predictionTimeoutRef,
    predictionSuggestion,
    predictionTargetElement
]);
useEffect(() => {
  const handleStreamData = (_, { streamId: sid, chunk }) => {
    if (!sid) return;
    if (predictionStreamIdRef.current !== sid) return;

    let piece = '';
    try {
      piece = typeof chunk === 'string' ? chunk : chunk?.toString?.() || '';
    } catch { return; }
    if (!piece) return;

    // append to buffer for this stream id
    const prev = streamBuffersRef.current.get(sid) || '';
    let buf = (prev + piece).replace(/\r\n/g, '\n');

    // process complete SSE frames separated by blank line
    while (true) {
      const sep = buf.indexOf('\n\n');
      if (sep === -1) break;

      const frame = buf.slice(0, sep);
      buf = buf.slice(sep + 2);

      // collect all "data:" lines in this frame
      const dataLines = frame
        .split('\n')
        .filter(l => l.startsWith('data:'))
        .map(l => l.slice(5).trim());

      if (dataLines.length === 0) continue;

      const payload = dataLines.join('\n');
      if (payload === '[DONE]') continue;

      let text = '';
      try {
        const parsed = JSON.parse(payload);
        text = parsed?.choices?.[0]?.delta?.content || '';
      } catch {
        continue;
      }
      if (!text) continue;

      // replace placeholder on first token, then append
      setPredictionSuggestion(prev =>
        prev === PRED_PLACEHOLDER ? text : prev + text
      );
    }

    // keep any partial frame for next chunk
    streamBuffersRef.current.set(sid, buf);
  };

  const handleStreamComplete = (_, { streamId }) => {
    if (predictionStreamIdRef.current === streamId) {
      predictionStreamIdRef.current = null;
    }
    streamBuffersRef.current.delete(streamId);
  };

  const handleStreamError = (_, { streamId, error }) => {
    console.error('[STREAM ERROR]', error);
    if (predictionStreamIdRef.current === streamId) {
      setPredictionSuggestion('');
      predictionStreamIdRef.current = null;
    }
    streamBuffersRef.current.delete(streamId);
  };

  const offData = window.api.onStreamData(handleStreamData);
  const offComplete = window.api.onStreamComplete(handleStreamComplete);
  const offError = window.api.onStreamError(handleStreamError);

  return () => {
    offData();
    offComplete();
    offError();
  };
}, [setPredictionSuggestion]);


useEffect(() => {
    // capture=true so Tab acceptance beats focus navigation
    window.addEventListener('keydown', handleGlobalPredictionTrigger, true);
    return () => window.removeEventListener('keydown', handleGlobalPredictionTrigger, true);
}, [handleGlobalPredictionTrigger]);



useEffect(() => {
    window.addEventListener('keydown', handleGlobalPredictionTrigger);

    return () => {
        window.removeEventListener('keydown', handleGlobalPredictionTrigger);
        if (predictionTimeoutRef.current) {
            clearTimeout(predictionTimeoutRef.current);
        }
    };
}, [handleGlobalPredictionTrigger, predictionTimeoutRef]);
