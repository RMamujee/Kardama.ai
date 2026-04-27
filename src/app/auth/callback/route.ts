import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Supabase auth callback for email confirmation / invite links.
// Exchanges the `code` query param for a session cookie, then redirects to the role's home page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        return NextResponse.redirect(`${origin}${profile?.role === 'cleaner' ? '/me' : '/dashboard'}`)
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
