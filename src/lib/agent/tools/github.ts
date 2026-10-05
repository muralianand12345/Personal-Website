import { z } from 'zod';
import { tool } from 'langchain';

const GITHUB_USER = 'muralianand12345';

type Repo = {
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    pushed_at: string;
    fork: boolean;
    archived: boolean;
};

const fetchRepos = async (): Promise<Repo[]> => {
    const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
        {
            headers: {
                Accept: 'application/vnd.github+json',
                // Optional: lifts the anonymous limit of 60 requests an hour.
                ...(process.env.GITHUB_TOKEN && {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                }),
            },
            next: { revalidate: 60 * 60 },
        }
    );
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    return res.json();
};

/** One markdown list item: link, language, stars, last push date, then the description. */
const describeRepo = (repo: Repo) => {
    const pushed = repo.pushed_at.slice(0, 10);
    const meta = [repo.language, `★${repo.stargazers_count}`, `pushed ${pushed}`].filter(Boolean);
    const line = `- [${repo.name}](${repo.html_url}) · ${meta.join(' · ')}`;
    return repo.description ? `${line}\n  ${repo.description}` : line;
};

export const githubRepos = tool(
    async ({ sortBy = 'recent', limit = 6 }) => {
        let repos: Repo[];
        try {
            repos = (await fetchRepos()).filter((repo) => !repo.fork && !repo.archived);
        } catch (error) {
            return `Could not reach GitHub (${(error as Error).message}). Try again later.`;
        }

        if (sortBy === 'stars') repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

        return repos.slice(0, limit).map(describeRepo).join('\n');
    },
    {
        name: 'get_github_repos',
        description: `Murali's public GitHub repositories (github.com/${GITHUB_USER}): language, stars and last activity.`,
        schema: z.object({
            sortBy: z
                .enum(['recent', 'stars'])
                .optional()
                .describe('"recent" (default) for most recently pushed, "stars" for most starred'),
            limit: z.number().int().min(1).max(10).optional().describe('How many, default 6'),
        }),
    }
);
