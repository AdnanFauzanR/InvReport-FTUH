import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    uuid: string;
    username: string;
    email: string;
    division: string;
    role: string;
    exp: number;
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {

        const decoded = jwtDecode<DecodedToken>(token);
        const currentTimeStamp = Math.floor(Date.now() / 1000);
        if (decoded.exp < currentTimeStamp) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (request.nextUrl.pathname.startsWith('/dashboard/users') && decoded.role !== 'Admin') {
            return NextResponse.redirect(new URL('/dashboard/reports', request.url));
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: ['/dashboard/:path*'],
};