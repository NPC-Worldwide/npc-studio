import React, { useRef, useEffect } from 'react';

const AutosizeTextarea = ({ value, ...props }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
        }
    }, [value]); // Rerun this effect when the text value changes

    return (
        <textarea
            ref={textareaRef}
            value={value}
            {...props}
        />
    );
};

export default AutosizeTextarea;