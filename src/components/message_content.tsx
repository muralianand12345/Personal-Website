"use client";

import React from 'react';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { IMessageContentProps, ICodeProps } from '../types';

const MessageContent: React.FC<IMessageContentProps> = ({ text }) => {
    // Check if the text contains HTML (from predefined responses)
    if (text.includes('<')) {
        return <div dangerouslySetInnerHTML={{ __html: text }} />;
    }

    // Define components with proper typing
    const components: Partial<Components> = {
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        a: ({ href, children }) => (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
            >
                {children}
            </a>
        ),
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
        code: ({ inline, className, children }: ICodeProps) => {
            if (inline) {
                return <code className="bg-gray-800 px-1 rounded text-sm">{children}</code>;
            }
            return (
                <pre className="bg-gray-800 p-2 rounded my-2 overflow-x-auto 
                    [&::-webkit-scrollbar]:h-2
                    [&::-webkit-scrollbar-track]:rounded-full
                    [&::-webkit-scrollbar-track]:bg-gray-700
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-gray-500
                    [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                    <code className="text-sm">{children}</code>
                </pre>
            );
        },
        // Table components remain the same
        table: ({ children }) => (
            <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-700">
                    {children}
                </table>
            </div>
        ),
        thead: ({ children }) => (
            <thead className="bg-gray-800">
                {children}
            </thead>
        ),
        tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-700">
                {children}
            </tbody>
        ),
        tr: ({ children }) => (
            <tr className="hover:bg-gray-800/50">
                {children}
            </tr>
        ),
        th: ({ children }) => (
            <th className="px-4 py-2 text-left border border-gray-700 font-medium">
                {children}
            </th>
        ),
        td: ({ children }) => (
            <td className="px-4 py-2 border border-gray-700">
                {children}
            </td>
        )
    };

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
        >
            {text}
        </ReactMarkdown>
    );
};

export default MessageContent;