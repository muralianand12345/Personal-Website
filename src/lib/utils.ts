import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => {
    return twMerge(clsx(inputs));
};

export const webhookLogger = async (payload: any) => {
    const url = process.env.WEBHOOK_URL;
    if (!url) return;

    const chunkText = (text: string, chunkSize = 1000): string[] => {
        if (!text) return [];
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.slice(i, i + chunkSize));
        }
        return chunks;
    };

    const addFieldChunks = (allFields: Array<any>, title: string, text: string) => {
        const chunks = chunkText(text);
        if (chunks.length === 0) {
            allFields.push({ name: title.slice(0, 256), value: '-', inline: false });
            return;
        }

        for (let i = 0; i < chunks.length; i++) {
            const name = i > 0 ? `${title} (cont.)` : title;
            let value = `\`\`\`${chunks[i]}\`\`\``;
            if (value.length > 1024) {
                value = value.slice(0, 1018) + '```';
            }
            allFields.push({ name: name.slice(0, 256), value, inline: false });
        }
    };

    const parsePayload = (p: any) => {
        const fields: Array<any> = [];

        const userMessage = p?.user ?? '-';
        const thinkingMessage = p?.thinking ?? null;
        const assistantMessage = p?.assistant ?? '-';

        addFieldChunks(
            fields,
            'User',
            typeof userMessage === 'string' ? userMessage : String(userMessage)
        );

        if (thinkingMessage) {
            let thinkingList: string[];
            if (typeof thinkingMessage === 'string') {
                thinkingList = [thinkingMessage];
            } else if (Array.isArray(thinkingMessage)) {
                thinkingList = thinkingMessage.map((x) => String(x));
            } else {
                thinkingList = [String(thinkingMessage)];
            }
            const fullThinking = thinkingList.join('\n\n');
            addFieldChunks(fields, 'Thinking', fullThinking);
        }

        addFieldChunks(
            fields,
            'Assistant',
            typeof assistantMessage === 'string' ? assistantMessage : String(assistantMessage)
        );

        const embeds: Array<any> = [];
        const maxEmbeds = 10;
        const maxFieldsPerEmbed = 25;
        let idx = 0;
        const totalFields = fields.length;

        while (idx < totalFields && embeds.length < maxEmbeds) {
            const sliceEnd = Math.min(idx + maxFieldsPerEmbed, totalFields);
            const embedFields = fields.slice(idx, sliceEnd);
            const embed = {
                author: { name: 'Chat Assistant', url: 'http://muralianand.in' },
                fields: embedFields,
            };
            embeds.push(embed);
            idx = sliceEnd;
        }

        if (idx < totalFields && embeds.length > 0) {
            embeds[embeds.length - 1].fields.push({
                name: 'Note',
                value: 'Output truncated to fit Discord limits.',
                inline: false,
            });
        }

        return { username: 'Chatbot', allowed_mentions: { parse: [] }, embeds };
    };

    const parsed = parsePayload(payload);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.status !== 204) {
            let body: any = null;
            try {
                body = await res.json();
            } catch (err) {
                try {
                    body = await res.text();
                } catch (e) {
                    body = String(e);
                }
            }
            throw new Error(`Failed to send webhook: ${res.status} - ${JSON.stringify(body)}`);
        }
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            throw new Error('Failed to send webhook: request timed out');
        }
        throw new Error(`Failed to send webhook: ${err?.message ?? String(err)}`);
    }
};
