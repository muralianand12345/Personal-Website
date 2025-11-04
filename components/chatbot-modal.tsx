"use client"

import type React from "react"
import { X, Send } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

interface ChatMessage {
    id: string
    role: "user" | "assistant" | "system"
    content: string
}

interface ChatbotModalProps {
    isOpen: boolean
    onClose: () => void
}

const systemPrompt = `
# Role and Identity

You are **Leo**, a professional personal assistant for **Murali Anand**, a software engineer. Your primary responsibility is to assist users with technical queries, providing solutions, and offering guidance while maintaining a consistently professional and helpful demeanor.

## Core Responsibilities

### 1. Technical Support
- Provide clear, accurate explanations for technical concepts
- Offer practical solutions to software engineering challenges
- Share relevant code examples and documentation references
- Guide users through troubleshooting processes

### 2. Communication Style
- Maintain a professional yet approachable tone
- Use clear, concise language
- Adapt explanation complexity based on user expertise level
- Provide step-by-step guidance when needed

### 3. Information Management
- Verify information accuracy before sharing
- Cite reliable sources when providing technical recommendations
- Maintain confidentiality of sensitive information
- Acknowledge when additional research is needed

## Response Guidelines

1. Always begin responses with a clear acknowledgment of the user's query
2. Structure complex responses with appropriate headings and sections
3. Use code blocks for all technical examples
4. Include relevant links to documentation when applicable
5. Format lists appropriately based on content type:
   - Unordered lists for related but non-sequential items
   - Ordered lists for steps or prioritized items
6. Use tables for comparing multiple items or presenting structured data
7. Bold important terms or crucial information
8. Italicize technical terms on first use
9. Ensure the response is in Markdown format

## Security and Privacy Guidelines

1. Never share sensitive information about Murali or other users
2. Verify link destinations before including them in responses
3. Do not execute or encourage potentially harmful code
4. Alert users to potential security risks in their queries
5. Maintain professional boundaries in all interactions

## Technical Expertise Areas

Demonstrate proficiency in:
- Software development best practices
- Common programming languages and frameworks
- Debugging and troubleshooting
- System design and architecture
- Development tools and environments
- Version control systems
- Testing methodologies
- Documentation standards

Remember to always prioritize **clarity**, **accuracy**, and **professionalism** in all interactions while maintaining the helpful and supportive nature expected of a personal assistant.
`

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "0",
            role: "system",
            content: systemPrompt,
        },
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm Leo, Murali's AI Assistant. Ask me about AI engineering, machine learning, or anything else!",
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (typeof window === "undefined") return
        if (!document.getElementById("katex-styles")) {
            const link = document.createElement("link")
            link.id = "katex-styles"
            link.rel = "stylesheet"
            link.href = "https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css"
            document.head.appendChild(link)
        }
    }, [])

    const visibleMessages = messages.filter((m) => m.role !== "system")

    useEffect(() => scrollToBottom(), [visibleMessages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        }

        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput("")
        setIsLoading(true)

        try {
            const messagesToSend = updatedMessages.slice(-10).map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            }))

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: messagesToSend }),
            })

            if (!response.ok) throw new Error("Failed to get response from AI")

            const data = await response.json()

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
            }

            setMessages((prev) => {
                const newMessages = [...prev, assistantMessage]
                return newMessages.slice(-10)
            })
        } catch (error) {
            console.error("[v0] Error sending message:", error)
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />

            <div className="fixed bottom-8 right-8 w-96 h-[600px] bg-black border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                        <span className="text-xs text-gray-500">Powered by OpenAI</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label="Close chatbot"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {visibleMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${message.role === "user"
                                    ? "bg-white text-black rounded-br-none"
                                    : "bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700"
                                    }`}
                            >
                                {message.role === "user" ? (
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                ) : (
                                    <div className="text-sm prose prose-invert prose-sm max-w-none overflow-x-auto">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex as any]}
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-2 mt-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-2 mt-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-1 mt-1" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                code: ({ node, inline, className, children, ...props }: any) => {
                                                    const match = /language-(\w+)/.exec(className || "")
                                                    const lang = match ? match[1] : "text"

                                                    if (inline) {
                                                        return (
                                                            <code className="bg-gray-900 px-2 py-1 rounded text-yellow-300 text-xs" {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }

                                                    return (
                                                        <SyntaxHighlighter
                                                            language={lang}
                                                            style={dracula}
                                                            className="rounded text-xs mb-2"
                                                            customStyle={{
                                                                margin: 0,
                                                                padding: "8px",
                                                                backgroundColor: "#282a36",
                                                            }}
                                                        >
                                                            {String(children).replace(/\n$/, "")}
                                                        </SyntaxHighlighter>
                                                    )
                                                },
                                                pre: ({ node, ...props }) => <pre className="mb-2" {...props} />,
                                                table: ({ node, ...props }) => (
                                                    <table className="border-collapse border border-gray-600 mb-2 text-xs" {...props} />
                                                ),
                                                thead: ({ node, ...props }) => <thead className="bg-gray-900" {...props} />,
                                                tbody: ({ node, ...props }) => <tbody {...props} />,
                                                tr: ({ node, ...props }) => <tr className="border border-gray-600" {...props} />,
                                                th: ({ node, ...props }) => (
                                                    <th className="border border-gray-600 px-2 py-1 text-left font-bold" {...props} />
                                                ),
                                                td: ({ node, ...props }) => <td className="border border-gray-600 px-2 py-1" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                                blockquote: ({ node, ...props }) => (
                                                    <blockquote className="border-l-4 border-gray-600 pl-2 italic mb-2" {...props} />
                                                ),
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && visibleMessages[visibleMessages.length - 1]?.role === "user" && (
                        <div className="flex justify-start">
                            <div className="bg-gray-800 text-gray-100 px-4 py-2 rounded-lg rounded-bl-none border border-gray-700">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-gray-700 p-4 bg-black">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-gray-500 focus:outline-none transition-colors text-sm"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black p-2 rounded-lg transition-colors"
                            aria-label="Send message"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}

export default ChatbotModal
