import { existsSync } from 'node:fs';
import { defineCliConfig } from 'sanity/cli';

// The Sanity CLI only loads SANITY_STUDIO_* variables by itself, so read the
// same .env the Next.js app uses. Variables already set in the shell win.
for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) process.loadEnvFile(file);
}

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
    // sanity.config.ts runs in the browser, where only SANITY_STUDIO_* variables
    // are injected, so bake the project settings into the Studio bundle.
    vite: (config) => ({
        ...config,
        define: {
            ...config.define,
            'process.env.SANITY_PROJECT_ID': JSON.stringify(projectId),
            'process.env.SANITY_DATASET': JSON.stringify(dataset),
        },
    }),
});
