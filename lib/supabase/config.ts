export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** 环境变量是否已配置（未配置时页面会展示配置引导，而不是直接崩溃） */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
