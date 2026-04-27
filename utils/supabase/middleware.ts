import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

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

        if (
            !user &&
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            // no user, redirect to login page
            const url = request.nextUrl.clone()
            url.searchParams.set('next', request.nextUrl.pathname)
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    } catch (error) {
        console.error(`[Middleware] Exception:`, error);
        // If token is invalid, redirect to login

        if (
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.searchParams.set('next', request.nextUrl.pathname)
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
