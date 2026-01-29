import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // Check if we have a session
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        await supabase.auth.signOut()
    }

    revalidatePath('/', 'layout')

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')

    if (!baseUrl) {
        // Fallback for environments where env var is missing/undefined
        // Use the 'Host' header which should be the actual domain (e.g. gtviaticos.com)
        const host = req.headers.get('host')
        const protocol = req.headers.get('x-forwarded-proto') || 'https'

        if (host) {
            baseUrl = `${protocol}://${host}`
        } else {
            // Last resort: internal node process URL (e.g. 0.0.0.0:3000)
            baseUrl = new URL('/', req.url).origin
        }
    }

    return NextResponse.redirect(`${baseUrl}/login`, {
        status: 302,
    })
}
