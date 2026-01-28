import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // DEBUG: Log for Hostinger diagnosis
    console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);
    console.log(`[Middleware] Has Cookies? ${request.cookies.getAll().length > 0}`);
    console.log(`[Middleware] URL Env defined? ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`[Middleware] Key Env defined? ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);

    let supabaseResponse = NextResponse.next({
        request,
    })

    // DEBUG: Headers for client-side debugging
    supabaseResponse.headers.set('x-debug-path', request.nextUrl.pathname);
    supabaseResponse.headers.set('x-debug-env-url', !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'defined' : 'MISSING');
    supabaseResponse.headers.set('x-debug-env-key', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'defined' : 'MISSING');
    supabaseResponse.headers.set('x-debug-cookies', request.cookies.getAll().length.toString());

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    // This refreshes the session cookie if needed.
    // We wrap in try-catch to avoid blowing up on "Invalid Refresh Token"
    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        console.log(`[Middleware] Auth Check - User: ${user?.id || 'None'}, Error: ${error?.message || 'None'}`);

        if (
            !user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            console.log(`[Middleware] Redirecting to /login`);
            // no user, potentially respond by redirecting the user to the login page
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    } catch (error) {
        console.error(`[Middleware] Exception:`, error);
        // If token is invalid (e.g. race condition), we typically want to redirect to login
        // BUT, for now let's just let it pass if it's on a static asset, or force login if it's a page.
        // Better safe: If getUser fails hard, we probably need a re-login.
        // However, to avoid "loops", let's be careful.
        // For now, let's just log and redirect, but the redirect might cause the loop if the cookie isn't cleared.
        // Supabase client usually clears the cookie if it fails.

        if (!request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
