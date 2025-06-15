import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const middleware = (req: NextRequest) => {
	// Only apply middleware to specific paths to reduce function count
	const pathname = req.nextUrl.pathname;

	// Skip middleware for static files and _next
	if (pathname.startsWith('/_next/') || pathname.startsWith('/api/_') || pathname.includes('.') || pathname === '/favicon.ico') {
		return NextResponse.next();
	}

	const allowedOrigins = ['localhost:3000', 'muralianand.in', 'www.muralianand.in'];
	const origin = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
	const isAllowedOrigin = allowedOrigins.some((allowed) => origin.includes(allowed));

	if (isAllowedOrigin) {
		return NextResponse.next();
	}

	// Only check auth for specific API routes
	if (pathname.startsWith('/api/addNews')) {
		const authHeader = req.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split(' ')[1];
		if (token !== process.env.AUTHORIZATION_TOKEN) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	return NextResponse.next();
};

export const config = {
	// Be more specific about which paths need middleware
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder files
		 */
		'/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
		'/api/addNews',
	],
};
