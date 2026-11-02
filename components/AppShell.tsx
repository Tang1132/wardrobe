'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, LogOut, Plus, Shirt, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: '衣橱', icon: Shirt },
  { href: '/outfits', label: '穿搭', icon: Sparkles },
  { href: '/stats', label: '统计', icon: BarChart3 },
]

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen">
      {/* 桌面端侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink/5 bg-sand/50 px-5 py-8 backdrop-blur md:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-clay font-serif text-lg text-cream shadow-soft">
            衣
          </span>
          <span>
            <span className="block font-serif text-lg leading-tight">我的衣橱</span>
            <span className="mt-0.5 block text-[10px] tracking-[0.25em] text-muted">WARDROBE</span>
          </span>
        </Link>

        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                isActive(href) ? 'bg-white text-clay shadow-card' : 'text-ink/60 hover:bg-white/60 hover:text-ink',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <Link
            href="/add"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-clay/40 px-4 py-3 text-sm text-clay transition hover:bg-clay/5"
          >
            <Plus size={18} />
            添加衣物
          </Link>
        </nav>

        <div className="space-y-3 border-t border-ink/10 pt-5">
          <p className="truncate text-[11px] text-muted" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-ink/50 transition hover:text-clay"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-14 md:pt-10">
          {/* 移动端顶栏：品牌 + 退出 */}
          <div className="mb-5 flex items-center justify-between md:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-clay font-serif text-sm text-cream">
                衣
              </span>
              <span className="font-serif text-base">我的衣橱</span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              aria-label="退出登录"
              className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 text-muted transition hover:text-clay"
            >
              <LogOut size={16} />
            </button>
          </div>

          {children}
        </main>
      </div>

      {/* 移动端悬浮添加入口 */}
      <Link
        href="/add"
        aria-label="添加衣物"
        className="fixed bottom-24 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-clay text-cream shadow-soft transition active:scale-95 md:hidden"
      >
        <Plus size={26} />
      </Link>

      {/* 移动端底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/5 bg-cream/90 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition',
                isActive(href) ? 'text-clay' : 'text-ink/45',
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
