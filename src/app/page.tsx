"use client";

import { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import MessageContent from "@/components/message_content";
import { Analytics } from '@vercel/analytics/next';
import {
    playSound,
    handleResponse,
    addMessage,
    handleIntro,
} from "@/functions/pages";
import { IMessage, IProps, IChatHistory } from "@/types";

const Page: NextPage<IProps> = () => {
    const [messages, setMessages] = useState<IMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [lastSeen, setLastSeenState] = useState("last seen today");
    const [showFullDP, setShowFullDP] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [chatHistory, setChatHistory] = useState<IChatHistory[]>([]);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            audioRef.current = new Audio("/assets/sentmessage.mp3");

            // Delay the intro message slightly to ensure DOM is ready
            setTimeout(() => {
                const introMessage = handleIntro(
                    setLastSeenState,
                    setMessages,
                    setChatHistory,
                    chatRef
                );
            }, 100);
        }
    }, []);

    const handleSend = () => {
        if (!inputText.trim()) return;

        const userMessage: IChatHistory = {
            role: "user",
            content: inputText,
            timestamp: new Date().toISOString(),
        };

        // Add user message to chat history first
        setChatHistory((prev) => [...prev, userMessage]);
        addMessage(inputText, "sent", setMessages, chatRef);

        const currentInputText = inputText;
        setInputText("");

        // Use the updated chat history
        setTimeout(() => {
            handleResponse(
                setLastSeenState,
                currentInputText,
                setMessages,
                chatHistory,
                audioRef,
                chatRef,
                setChatHistory
            );
        }, 1500);
        playSound(audioRef);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            handleSend();
        }
    };

    return (
        <div className="h-[95vh]">
            <link itemProp="thumbnailUrl" href="/images/dp.jpg" />
            <span
                itemProp="thumbnail"
                itemScope
                itemType="http://schema.org/ImageObject"
            >
                <link itemProp="url" href="/images/dp.jpg" />
            </span>

            <nav>
                <div className="navbar">
                    <img
                        className="dpimg"
                        onClick={() => setShowFullDP(true)}
                        src="/images/squareDp.jpg"
                        alt="Profile"
                    />
                    <div className="personalInfo">
                        <label id="name">Murali Anand</label>
                        <label id="lastseen">{lastSeen}</label>
                        <Analytics />
                    </div>
                </div>
            </nav>

            {showFullDP && (
                <div className="fullScreenDP">
                    <div className="insideDP">
                        <img
                            className="dp"
                            src="/images/squareDp.jpg"
                            alt="Profile"
                        />
                        <svg
                            className="closeBTN"
                            onClick={() => setShowFullDP(false)}
                            xmlns="http://www.w3.org/2000/svg"
                            width="64px"
                            viewBox="0 0 512 512"
                            height="64px"
                        >
                            <path
                                className="btnColor"
                                fill="#E04F5F"
                                d="M504.1,256C504.1,119,393,7.9,256,7.9C119,7.9,7.9,119,7.9,256C7.9,393,119,504.1,256,504.1C393,504.1,504.1,393,504.1,256z"
                            />
                            <path
                                fill="#FFF"
                                d="M285,256l72.5-84.2c7.9-9.2,6.9-23-2.3-31c-9.2-7.9-23-6.9-30.9,2.3L256,222.4l-68.2-79.2c-7.9-9.2-21.8-10.2-31-2.3c-9.2,7.9-10.2,21.8-2.3,31L227,256l-72.5,84.2c-7.9,9.2-6.9,23,2.3,31c4.1,3.6,9.2,5.3,14.3,5.3c6.2,0,12.3-2.6,16.6-7.6l68.2-79.2l68.2,79.2c4.3,5,10.5,7.6,16.6,7.6c5.1,0,10.2-1.7,14.3-5.3c9.2-7.9,10.2-21.8,2.3-31L285,256z"
                            />
                        </svg>
                    </div>
                </div>
            )}

            <div className="scrollable">
                <div id="chatting" className="chatting" ref={chatRef}>
                    <ul>
                        {messages.map((message, index) => (
                            <li key={index}>
                                <div className={message.type}>
                                    <div
                                        className={
                                            message.type === "sent"
                                                ? "green"
                                                : "grey"
                                        }
                                    >
                                        <MessageContent text={message.text} />
                                        <label className="dateLabel">
                                            {message.timestamp}
                                        </label>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <footer>
                <div className="sendBar">
                    <input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        type="text"
                        placeholder="Type a message"
                        autoFocus
                    />
                    <svg
                        onClick={handleSend}
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                    >
                        <path
                            fill="currentColor"
                            d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"
                        ></path>
                    </svg>
                </div>
            </footer>
        </div>
    );
};

export default Page;
