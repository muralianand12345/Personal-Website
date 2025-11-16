import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? 'production';
const studioHost = process.env.SANITY_STUDIO_HOST;

if (!projectId)
    throw new Error(
        'SANITY_PROJECT_ID environment variable is required. Add it to your environment or .env.local file.'
    );

export default defineCliConfig({
    api: {
        projectId,
        dataset,
    },
    studioHost,
});
