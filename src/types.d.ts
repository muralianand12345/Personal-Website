export interface IMessage {
    text: string;
    type: "sent" | "received";
    timestamp: string;
}

export type PredefinedResponses = {
    [key: string]: string;
};

export interface IProps { }