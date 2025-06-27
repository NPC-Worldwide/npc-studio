import React, { useState , memo} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

const CodeBlock = React.memo(({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Failed to copy code:', err));
    };

    const isDarkMode = document.body.classList.contains('dark-mode');

    if (inline) {
        return (
            <code className="theme-code-inline px-1 py-0.5 rounded-sm font-mono text-xs" {...props}>
                {children}
            </code>
        );
    }

    return (
        <div className="relative group my-2 theme-bg-tertiary rounded-md overflow-hidden theme-border border">
            <div className="flex items-center justify-between px-4 py-1 theme-bg-secondary text-xs theme-text-muted">
                <span>{match && match[1] ? match[1] : 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded theme-hover theme-text-muted hover:theme-text-primary"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <Check size={14} className="text-green-500" />
                    ) : (
                        <Copy size={14} />
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                style={isDarkMode ? atomDark : oneLight}
                language={match ? match[1] : null}
                PreTag="div"
                className="!theme-bg-tertiary !p-4 text-sm"
                showLineNumbers={true}
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    );
});



const MarkdownRenderer = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code: CodeBlock,
                // Fix DOM nesting warnings by handling paragraphs that contain code blocks
                p: ({ node, children, ...props }) => {
                    // Check if this paragraph contains only a code block
                    const hasCodeBlock = node.children.some(child => 
                        child.type === 'element' && child.tagName === 'code' && child.properties?.className
                    );
                    
                    if (hasCodeBlock) {
                        // Return a div instead of p to avoid nesting issues
                        return <div className="mb-2" {...props}>{children}</div>;
                    }
                    
                    return <p className="mb-2 theme-text-primary" {...props}>{children}</p>;
                },
                // Custom link styling
                a: ({ node, ...props }) => (
                    <a className="theme-text-link hover:underline font-medium" {...props} />
                ),
                // Custom image styling
                img: ({ node, ...props }) => (
                    <img className="max-w-full h-auto rounded-md my-2 theme-border border" {...props} />
                ),
                // FIXED: Handle lists properly with list-outside instead of list-inside
                ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside pl-5 mb-3 theme-text-primary" {...props} />
                ),
                ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-outside pl-5 mb-3 theme-text-primary" {...props} />
                ),
                // FIXED: Better list item styling
                li: ({ node, children, ...props }) => {
                    // Check if this list item contains a paragraph as first child
                    const firstChild = node.children[0];
                    if (firstChild && firstChild.type === 'element' && firstChild.tagName === 'p') {
                        // Special handling to avoid the line break issue
                        return <li className="mb-1" {...props}>{children}</li>;
                    }
                    return <li className="mb-1" {...props}>{children}</li>;
                },
                // Handle headings
                h1: ({ node, ...props }) => (
                    <h1 className="text-xl font-bold mb-2 mt-4 theme-text-primary" {...props} />
                ),
                h2: ({ node, ...props }) => (
                    <h2 className="text-lg font-bold mb-2 mt-3 theme-text-primary" {...props} />
                ),
                h3: ({ node, ...props }) => (
                    <h3 className="text-base font-bold mb-2 mt-2 theme-text-primary" {...props} />
                ),
                // Handle blockquotes
                blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 theme-border-accent pl-4 italic theme-text-secondary my-2 theme-bg-secondary p-3 rounded-r" {...props} />
                ),
                // Handle tables
                table: ({ node, ...props }) => (
                    <table className="border-collapse w-full my-3 theme-border border rounded overflow-hidden" {...props} />
                ),
                th: ({ node, ...props }) => (
                    <th className="theme-border border p-2 text-left theme-text-primary theme-bg-secondary font-semibold" {...props} />
                ),
                td: ({ node, ...props }) => (
                    <td className="theme-border border p-2 theme-text-primary" {...props} />
                ),
                tr: ({ node, ...props }) => (
                    <tr className="even:theme-bg-secondary" {...props} />
                ),
            }}
            // Remove hardcoded prose classes to use our theme-aware styling
            className="theme-text-primary"
        >
            {content || ''}
        </ReactMarkdown>
    );
};

export default React.memo(MarkdownRenderer);
