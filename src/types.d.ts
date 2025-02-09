import React from "react";

export interface IMessageContentProps {
    text: string;
}

export interface IMessage {
    text: string;
    type: "sent" | "received";
    timestamp: string;
};

export type PredefinedResponses = {
    [key: string]: string;
};

export interface IProps { };

export interface ICodeProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
};