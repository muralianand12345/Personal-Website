import { z } from 'zod';
import { tool } from 'langchain';

/** Murali lives in Wellington, so "what time is it for him" is the usual question. */
export const HOME_TIME_ZONE = 'Pacific/Auckland';

export const currentTime = tool(
    async ({ timeZone = HOME_TIME_ZONE }) => {
        try {
            const formatted = new Intl.DateTimeFormat('en-NZ', {
                timeZone,
                dateStyle: 'full',
                timeStyle: 'long',
            }).format(new Date());
            return `${formatted} (${timeZone})`;
        } catch {
            return `Unknown time zone "${timeZone}". Use an IANA name such as "Asia/Kolkata".`;
        }
    },
    {
        name: 'get_current_time',
        description:
            'Current date and time in any time zone. Defaults to Wellington, New Zealand, where Murali lives.',
        schema: z.object({
            timeZone: z
                .string()
                .optional()
                .describe('IANA time zone, for example "Asia/Kolkata" or "America/New_York"'),
        }),
    }
);
