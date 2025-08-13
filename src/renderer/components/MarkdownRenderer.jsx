import React, { useState, useRef, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from 'lucide-react';

const CodeBlock = memo(({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const scrollContainerRef = useRef(null);

    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Failed to copy code:', err));
    }, [codeString]);

    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isScrolled = scrollTop > 0;
            const hasScrollbar = scrollHeight > clientHeight;
            setShowFloatingButton(isScrolled && hasScrollbar);
        }
    }, []);

    const isDarkMode = document.body.classList.contains('dark-mode');

    const shouldRenderInline = inline || codeString.length <= 60;
    if (shouldRenderInline) {
        return (
            <code className="theme-code-inline px-1 py-0.5 rounded-sm font-mono text-xs" {...props}>
                {children}
            </code>
        );
    }

    return (
        <div className="relative group my-2 theme-bg-tertiary rounded-md overflow-hidden theme-border border">
            <div className="flex items-center justify-between px-4 py-1 theme-bg-secondary text-xs theme-text-muted">
                <span>{match?.[1] || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded theme-hover theme-text-muted hover:theme-text-primary"
                    aria-label="Copy code"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="overflow-auto"
                style={{ maxHeight: '400px' }}
            >
                <SyntaxHighlighter
                    style={isDarkMode ? atomDark : oneLight}
                    language={match?.[1]}
                    PreTag="div"
                    showLineNumbers={true}
                    wrapLines={true}
                    lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                    {...props}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>

            {showFloatingButton && (
                <div className="absolute bottom-4 right-4 z-10 transition-opacity opacity-0 group-hover:opacity-100">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-2 rounded-md shadow-lg theme-bg-secondary theme-border border theme-hover"
                        aria-label="Copy code"
                    >
                        {copied ? (
                            <Check size={16} className="text-green-500" />
                        ) : (
                            <Copy size={16} />
                        )}
                        <span className="text-xs font-semibold">Copy</span>
                    </button>
                </div>
            )}
        </div>
    );
});

const MarkdownRenderer = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code: CodeBlock,
                p: ({ node, children, ...props }) => {
                    const hasCodeBlock = node.children.some(child => 
                        child.type === 'element' && child.tagName === 'code' && child.properties?.className
                    );
                    if (hasCodeBlock) {
                        return <div className="mb-2" {...props}>{children}</div>;
                    }
                    return <p className="mb-2 theme-text-primary" {...props}>{children}</p>;
                },
                a: ({ node, ...props }) => (
                    <a className="theme-text-link hover:underline font-medium" {...props} />
                ),
                img: ({ node, ...props }) => (
                    <img className="max-w-full h-auto rounded-md my-2 theme-border border" {...props} />
                ),
                ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside pl-5 mb-3 theme-text-primary" {...props} />
                ),
                ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-outside pl-5 mb-3 theme-text-primary" {...props} />
                ),
                li: ({ node, children, ...props }) => {
                    const firstChild = node.children[0];
                    if (firstChild && firstChild.type === 'element' && firstChild.tagName === 'p') {
                        return <li className="mb-1" {...props}>{children}</li>;
                    }
                    return <li className="mb-1" {...props}>{children}</li>;
                },
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2 mt-4 theme-text-primary" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-3 theme-text-primary" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-2 theme-text-primary" {...props} />,
                blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 theme-border-accent pl-4 italic theme-text-secondary my-2 theme-bg-secondary p-3 rounded-r" {...props} />
                ),
                table: ({ node, ...props }) => <table className="border-collapse w-full my-3 theme-border border rounded overflow-hidden" {...props} />,
                th: ({ node, ...props }) => <th className="theme-border border p-2 text-left theme-text-primary theme-bg-secondary font-semibold" {...props} />,
                td: ({ node, ...props }) => <td className="theme-border border p-2 theme-text-primary" {...props} />,
                tr: ({ node, ...props }) => <tr className="even:theme-bg-secondary" {...props} />,
            }}
            className="theme-text-primary"
        >
            {content || ''}
        </ReactMarkdown>
    );
};

export default memo(MarkdownRenderer);