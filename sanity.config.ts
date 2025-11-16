import { defineConfig } from 'sanity';
import { visionTool } from '@sanity/vision';
import { codeInput } from '@sanity/code-input';
import { structureTool } from 'sanity/structure';

import { schemaTypes } from './sanity/schemas';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? 'production';

export default defineConfig({
    name: 'default',
    title: 'Murali Anand Portfolio',
    projectId: projectId!,
    dataset: dataset!,
    plugins: [structureTool(), visionTool(), codeInput()],
    schema: {
        types: schemaTypes,
    },
});
