import { calculator } from '@/lib/agent/tools/calculator';
import { currentTime } from '@/lib/agent/tools/time';
import { githubRepos } from '@/lib/agent/tools/github';
import { searchSite } from '@/lib/agent/tools/site-search';
import { convertCurrency } from '@/lib/agent/tools/currency';

/** Tools that run inside this app. MCP tools are added from /mcp.config.ts. */
export const BUILTIN_TOOLS = [searchSite, githubRepos, currentTime, calculator, convertCurrency];
