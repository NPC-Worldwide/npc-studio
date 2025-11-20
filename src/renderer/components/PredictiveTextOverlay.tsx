

// ChatInterface.jsx - Replace your existing PredictiveTextOverlay component definition with this:
export const PredictiveTextOverlay = ({
    predictionSuggestion,
    predictionTargetElement,
    isPredictiveTextEnabled,
    setPredictionSuggestion,
    setPredictionTargetElement
}) => {
    if (!predictionSuggestion || !predictionTargetElement || !isPredictiveTextEnabled) {
        return null;
    }

    const targetRect = predictionTargetElement.getBoundingClientRect();
    const overlayRef = useRef(null);

    const handleAcceptSuggestion = useCallback(() => {
        if (predictionTargetElement && predictionSuggestion) {
            const suggestionToInsert = predictionSuggestion.trim(); // Trim whitespace

            if (predictionTargetElement instanceof HTMLTextAreaElement || predictionTargetElement instanceof HTMLInputElement) {
                const start = predictionTargetElement.selectionStart;
                const end = predictionTargetElement.selectionEnd;
                const value = predictionTargetElement.value;

                predictionTargetElement.value = value.substring(0, start) + suggestionToInsert + value.substring(end);
                predictionTargetElement.selectionStart = predictionTargetElement.selectionEnd = start + suggestionToInsert.length;
                // Manually trigger an input event for React to pick up the change
                const event = new Event('input', { bubbles: true });
                predictionTargetElement.dispatchEvent(event);

            } else if (predictionTargetElement.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents(); // Remove any selected text
                    range.insertNode(document.createTextNode(suggestionToInsert));
                    range.setStart(range.endContainer, range.endOffset); // Move cursor to end of inserted text
                    range.collapse(true);
                }
            }
            setPredictionSuggestion('');
            setPredictionTargetElement(null);
        }
    }, [predictionSuggestion, predictionTargetElement, setPredictionSuggestion, setPredictionTargetElement]);

    useEffect(() => {
        const handleOverlayKeyDown = (e) => {
            if (e.key === 'Tab' && predictionSuggestion) {
                e.preventDefault(); // Prevent default tab behavior
                handleAcceptSuggestion();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setPredictionSuggestion('');
                setPredictionTargetElement(null);
            }
        };
        document.addEventListener('keydown', handleOverlayKeyDown);
        return () => document.removeEventListener('keydown', handleOverlayKeyDown);
    }, [handleAcceptSuggestion, predictionSuggestion, setPredictionSuggestion, setPredictionTargetElement]);


    // Calculate position
    // We want it to appear just below the cursor, or at the end of the input field
    const style = {
        position: 'fixed',
        left: targetRect.left,
        top: targetRect.bottom + 5, // 5px below the input field
        zIndex: 1000,
        maxWidth: targetRect.width, // Limit width to input field width
        backgroundColor: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border)',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        padding: '8px',
        color: 'var(--theme-text-muted)',
        fontSize: '0.875rem', // text-sm
        whiteSpace: 'pre-wrap', // Preserve whitespace and wrap
        cursor: 'text',
    };

    return (
        <div ref={overlayRef} style={style} onClick={handleAcceptSuggestion}>
            {predictionSuggestion}
            {predictionSuggestion === 'Generating...' && (
                 <span className="ml-1 inline-block w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
            )}
            <div className="text-xs text-blue-400 mt-1">
                Press <span className="font-bold">Tab</span> to accept, <span className="font-bold">Esc</span> to dismiss.
            </div>
        </div>
    );
};