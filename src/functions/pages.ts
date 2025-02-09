import React from "react";
import { chatWithAPI } from "./chat";
import { predefinedResponses } from "@/constants";
import { IMessage, IChatHistory } from "@/types";

export const playSound = (
    audioRef: React.RefObject<HTMLAudioElement | null>
) => {
    if (audioRef.current?.paused) {
        audioRef.current
            ?.play()
            .catch((e: Error) => console.log("Audio play failed:", e));
    }
};

export const updateLastSeen = (setLastSeenState: (state: string) => void) => {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    setLastSeenState(`last seen today at ${hours}:${minutes}`);
};

export const handleResponse = async (
    setLastSeenState: (state: string) => void,
    text: string,
    setMessages: (
        messages: IMessage[] | ((prev: IMessage[]) => IMessage[])
    ) => void,
    chatHistory: IChatHistory[],
    audioRef: React.RefObject<HTMLAudioElement | null>,
    chatRef: React.RefObject<HTMLDivElement | null>,
    setChatHistory: React.Dispatch<React.SetStateAction<IChatHistory[]>>
) => {
    setLastSeenState("typing...");
    const lowerText = text.toLowerCase().trim();

    let response: string;
    if (lowerText === "clear") {
        setMessages([]);
        setChatHistory([]);
        // Call handleIntro directly instead of recursive handleResponse
        handleIntro(setLastSeenState, setMessages, setChatHistory, chatRef);
        return;
    }

    // Handle predefined responses including "intro"
    if (predefinedResponses[lowerText as keyof typeof predefinedResponses]) {
        response =
            predefinedResponses[lowerText as keyof typeof predefinedResponses];
    } else {
        response = await chatWithAPI(text, chatHistory);
    }

    const assistantMessage: IChatHistory = {
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, assistantMessage]);

    setTimeout(() => {
        updateLastSeen(setLastSeenState);
        addMessage(response, "received", setMessages, chatRef);
        playSound(audioRef);
    }, 1000);
};

export const handleIntro = (
    setLastSeenState: (state: string) => void,
    setMessages: (
        messages: IMessage[] | ((prev: IMessage[]) => IMessage[])
    ) => void,
    setChatHistory: React.Dispatch<React.SetStateAction<IChatHistory[]>>,
    chatRef: React.RefObject<HTMLDivElement | null>
) => {
    const introMessage = predefinedResponses.intro;
    if (!introMessage) {
        console.error("Intro message not found in predefinedResponses");
        return;
    }

    // Add message immediately
    addMessage(introMessage, "received", setMessages, chatRef);

    // Update chat history
    const assistantMessage: IChatHistory = {
        role: "assistant",
        content: introMessage,
        timestamp: new Date().toISOString(),
    };
    setChatHistory([assistantMessage]);

    // Update last seen
    setLastSeenState("typing...");
    setTimeout(() => {
        updateLastSeen(setLastSeenState);
    }, 1000);
};

export const addMessage = (
    text: string,
    type: "sent" | "received",
    setMessages: (
        messages: IMessage[] | ((prev: IMessage[]) => IMessage[])
    ) => void,
    chatRef: React.RefObject<HTMLDivElement | null>
) => {
    const date = new Date();
    const timestamp = `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    setMessages((prev) => [...prev, { text, type, timestamp }]);

    setTimeout(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, 100);
};
