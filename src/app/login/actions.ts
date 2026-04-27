'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email').trim(),
  password: z.string().min(1, 'Password required'),
})

export type LoginState = {
  error?: string
  fieldErrors?: { email?: string[]; password?: string[] }
} | undefined

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.user) {
    return { error: error?.message ?? 'Invalid credentials' }
  }

  // Look up role to decide where to send them.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  const next = (formData.get('next') as string) || ''
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    redirect(next)
  }
  redirect(profile?.role === 'cleaner' ? '/me' : '/dashboard')
}
