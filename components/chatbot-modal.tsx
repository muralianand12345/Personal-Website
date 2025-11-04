"use client"

import type React from "react"
import { X, Send } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ChatMessage {
    id: string
    role: "user" | "assistant" | "system"
    content: string
}

interface ChatbotModalProps {
    isOpen: boolean
    onClose: () => void
}

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm Leo, Murali's AI Assistant. Ask me about AI engineering, machine learning, or facts!",
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string>("")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => scrollToBottom(), [messages])

    useEffect(() => {
        if (isOpen && !sessionId) {
            const storedSessionId = sessionStorage.getItem('chat-session-id')
            if (storedSessionId) setSessionId(storedSessionId)
        }
    }, [isOpen, sessionId])

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

        // Logic here
    }

    // Clear session when modal closes
    const handleClose = () => {
        onClose()
        // clear session on close
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} aria-hidden="true" />

            <div className="fixed bottom-8 right-8 w-96 h-[600px] bg-black border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-black">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                        {sessionId && (
                            <span className="text-xs text-gray-500">Session active</span>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label="Close chatbot"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${message.role === "user"
                                    ? "bg-white text-black rounded-br-none"
                                    : "bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
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

export default ChatbotModal;