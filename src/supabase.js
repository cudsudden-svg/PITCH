import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function isHttpUrl(value) {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const supabaseConfigError =
  !supabaseUrl || !supabaseKey
    ? 'Supabase is not configured. For Vercel, add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Project Settings > Environment Variables, then redeploy. For local development, set them in .env.local.'
    : !isHttpUrl(supabaseUrl)
      ? 'VITE_SUPABASE_URL must be the full Supabase project URL, such as https://your-project-ref.supabase.co. Update it in Vercel Environment Variables, then redeploy.'
    : ''

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseKey)