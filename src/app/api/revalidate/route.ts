import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const POST = async (request: Request) => {
    let body: any = {};
    try {
        body = await request.json();
    } catch (e) {}

    const url = new URL(request.url);
    const secret = body?.secret || url.searchParams.get('secret');

    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const path = body?.path || '/blog';

    try {
        revalidatePath(path);
        return NextResponse.json({ revalidated: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
};

export const GET = async (request: Request) => {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    const path = url.searchParams.get('path') || '/blog';

    if (!secret || secret !== process.env.REVALIDATE_SECRET)
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    try {
        revalidatePath(path);
        return NextResponse.json({ revalidated: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
};
