import React, { useRef, useEffect } from 'react';

const AutosizeTextarea = ({ value, ...props }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            {...props}
        />
    );
};

export default AutosizeTextarea;