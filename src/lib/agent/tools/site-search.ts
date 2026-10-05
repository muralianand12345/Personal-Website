import { z } from 'zod';
import { tool } from 'langchain';

import { fetchPosts } from '@/lib/sanity';
import { getMdPages } from '@/lib/md-pages';

type SiteEntry = {
    title: string;
    url: string;
    date?: string;
    summary: string;
    tags: string[];
    body?: string;
};

const MAX_RESULTS = 5;

/** Blog posts from Sanity and Markdown pages from /md_pages. Either source may fail alone. */
const loadEntries = async (): Promise<SiteEntry[]> => {
    const [posts, pages] = await Promise.allSettled([
        fetchPosts(),
        Promise.resolve().then(getMdPages),
    ]);

    const blog: SiteEntry[] =
        posts.status === 'fulfilled'
            ? posts.value.map((post: any) => ({
                  title: post.title,
                  url: `/blog/${post.slug}`,
                  date: post.publishedAt?.slice(0, 10),
                  summary: post.excerpt ?? '',
                  tags: post.categories ?? [],
              }))
            : [];

    const stories: SiteEntry[] =
        pages.status === 'fulfilled'
            ? pages.value.map((page) => ({
                  title: page.title,
                  url: `/md/${page.slug}`,
                  date: page.date,
                  summary: page.description,
                  tags: [],
                  body: page.body,
              }))
            : [];

    return [...blog, ...stories];
};

/** Title matches count most, then tags, then the summary, then the full text. */
const score = (entry: SiteEntry, terms: string[]) => {
    const fields: Array<[string, number]> = [
        [entry.title, 4],
        [entry.tags.join(' '), 3],
        [entry.summary, 2],
        [entry.body ?? '', 1],
    ];
    return terms.reduce(
        (total, term) =>
            total +
            fields.reduce(
                (sum, [text, weight]) => sum + (text.toLowerCase().includes(term) ? weight : 0),
                0
            ),
        0
    );
};

const byDateDesc = (a: SiteEntry, b: SiteEntry) => (b.date ?? '').localeCompare(a.date ?? '');

export const searchSite = tool(
    async ({ query = '' }) => {
        const entries = await loadEntries();
        if (!entries.length) return 'The site content is unavailable right now.';

        const terms = query
            .toLowerCase()
            .split(/\W+/)
            .filter((term) => term.length > 2);
        const results = terms.length
            ? entries
                  .map((entry) => ({ entry, score: score(entry, terms) }))
                  .filter((result) => result.score > 0)
                  .sort((a, b) => b.score - a.score || byDateDesc(a.entry, b.entry))
                  .map((result) => result.entry)
            : entries.sort(byDateDesc);

        if (!results.length) return `Nothing on the site matches "${query}".`;

        return results
            .slice(0, MAX_RESULTS)
            .map((entry) => {
                const date = entry.date ? ` (${entry.date})` : '';
                const summary =
                    entry.summary.length > 200 ? `${entry.summary.slice(0, 200)}…` : entry.summary;
                return `- [${entry.title}](${entry.url})${date}: ${summary}`;
            })
            .join('\n');
    },
    {
        name: 'search_site',
        description:
            "Search Murali's blog posts and stories on this website. Leave the query empty to list the newest.",
        schema: z.object({
            query: z
                .string()
                .optional()
                .describe('Keywords, for example "fine-tuning apple silicon"'),
        }),
    }
);
