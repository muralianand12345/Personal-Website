import { getMdAssets, readMdAsset } from '@/lib/md-pages';

/**
 * Serves the non-Markdown files in /md_pages (images, PDFs, video), so pages
 * can reference them by relative path. Built once per file, like the pages.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export const generateStaticParams = () => getMdAssets().map((file) => ({ path: file.split('/') }));

type Context = { params: Promise<{ path: string[] }> };

export const GET = async (_request: Request, { params }: Context) => {
    const { path } = await params;
    const asset = readMdAsset(path);
    if (!asset) return new Response('Not found', { status: 404 });

    return new Response(new Uint8Array(asset.data), {
        headers: { 'Content-Type': asset.type },
    });
};
