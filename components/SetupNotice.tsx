import { Shirt } from 'lucide-react'

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-4xl border border-ink/5 bg-white/80 p-8 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-clay font-serif text-lg text-cream">
            衣
          </span>
          <div>
            <h1 className="font-serif text-xl">还差一步：连接 Supabase</h1>
            <p className="text-xs text-muted">配置环境变量后即可开始使用</p>
          </div>
        </div>

        <ol className="mt-6 space-y-4 text-sm leading-relaxed text-ink/75">
          <li>
            <span className="font-medium text-ink">1. 创建 Supabase 项目</span>
            <br />
            打开 supabase.com 新建项目，进入 Project Settings → API，复制 Project URL 与 anon public key。
          </li>
          <li>
            <span className="font-medium text-ink">2. 初始化数据库</span>
            <br />
            在 SQL Editor 中执行项目根目录的{' '}
            <code className="rounded bg-sand px-1.5 py-0.5 text-xs">supabase/schema.sql</code>。
          </li>
          <li>
            <span className="font-medium text-ink">3. 写入环境变量</span>
            <br />
            将 <code className="rounded bg-sand px-1.5 py-0.5 text-xs">.env.local.example</code> 复制为{' '}
            <code className="rounded bg-sand px-1.5 py-0.5 text-xs">.env.local</code> 并填入真实值，然后重启{' '}
            <code className="rounded bg-sand px-1.5 py-0.5 text-xs">npm run dev</code>。
          </li>
        </ol>

        <pre className="mt-5 overflow-x-auto rounded-2xl bg-ink p-4 text-[11px] leading-relaxed text-cream/90">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted">
          <Shirt size={14} /> 配置完成后刷新页面即可进入衣橱。
        </p>
      </div>
    </div>
  )
}
