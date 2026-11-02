import { redirect } from 'next/navigation'
import { CalendarDays, Sparkles, Wallet } from 'lucide-react'
import LoginForm from '@/components/LoginForm'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const HIGHLIGHTS = [
  { icon: Sparkles, title: '搭配灵感', desc: '把单品组合成整套造型，随时预览' },
  { icon: CalendarDays, title: '穿着日历', desc: '记录每天穿了什么，回看衣橱利用率' },
  { icon: Wallet, title: '花费一目了然', desc: '统计总花费与分类占比' },
]

export default async function LoginPage() {
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect('/')
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* 品牌区 */}
      <section className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-ink px-10 py-12 text-cream md:flex lg:px-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-clay/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sage/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cream/10 font-serif text-lg backdrop-blur">
            衣
          </span>
          <span className="text-[11px] tracking-[0.3em] text-cream/70">DIGITAL WARDROBE</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-snug lg:text-5xl">
            你的衣橱，
            <br />
            值得被认真整理。
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-cream/60">
            拍下每一件衣物，记住它们的价格与故事；把喜欢的组合保存成搭配，让每天早上少一点犹豫。
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream/10">
                  <Icon size={17} />
                </span>
                <span>
                  <span className="block text-sm">{title}</span>
                  <span className="block text-xs text-cream/50">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-cream/35">© {new Date().getFullYear()} 我的衣橱</p>
      </section>

      {/* 表单区 */}
      <section className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-clay font-serif text-cream">衣</span>
            <div>
              <p className="font-serif text-base leading-tight">我的衣橱</p>
              <p className="text-[10px] tracking-[0.25em] text-muted">WARDROBE</p>
            </div>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  )
}
