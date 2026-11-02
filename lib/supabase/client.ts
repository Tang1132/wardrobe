'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from './config'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/** 浏览器端 Supabase 客户端（单例） */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}
