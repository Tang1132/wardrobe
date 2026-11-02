'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码不正确',
  'Email not confirmed': '邮箱尚未验证，请先查看确认邮件',
  'User already registered': '该邮箱已注册，请直接登录',
  'Password should be at least 6 characters': '密码至少需要 6 位',
}

function translate(message: string) {
  return ERROR_MAP[message] ?? message
}

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const supabase = createClient()

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (signUpError) throw signUpError

        if (data.session) {
          router.replace('/')
          router.refresh()
          return
        }
        setNotice('注册成功！请到邮箱点击确认链接，然后回到这里登录。')
        setMode('signin')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError

        router.replace('/')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? translate(err.message) : '操作失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-7">
        <h1 className="font-serif text-2xl">{mode === 'signin' ? '欢迎回来' : '创建你的衣橱'}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {mode === 'signin' ? '登录后继续打理你的数字衣橱' : '用邮箱注册，数据只属于你自己'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="field-label">邮箱</span>
          <span className="relative block">
            <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="text-input pl-11"
            />
          </span>
        </label>

        <label className="block">
          <span className="field-label">密码</span>
          <span className="relative block">
            <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              className="text-input pl-11"
            />
          </span>
        </label>

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>
        )}
        {notice && (
          <p className="rounded-2xl bg-sage/10 px-4 py-3 text-xs text-sage">{notice}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {mode === 'signin' ? '登录' : '注册'}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        {mode === 'signin' ? '还没有账号？' : '已有账号？'}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setNotice(null)
          }}
          className="ml-1 font-medium text-clay hover:underline"
        >
          {mode === 'signin' ? '立即注册' : '去登录'}
        </button>
      </p>
    </div>
  )
}
