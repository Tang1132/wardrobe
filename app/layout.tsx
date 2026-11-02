import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import SetupNotice from '@/components/SetupNotice'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '我的衣橱 · Digital Wardrobe',
  description: '把衣物、搭配和每天的穿着记录，收进一个私人的数字衣橱。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f3ec',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <html lang="zh-CN">
        <body className="min-h-screen bg-cream font-sans text-ink antialiased">
          <SetupNotice />
        </body>
      </html>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        {user ? <AppShell email={user.email ?? ''}>{children}</AppShell> : children}
      </body>
    </html>
  )
}
