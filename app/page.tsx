import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import ClosetClient from '@/components/ClosetClient'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Clothing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (!isSupabaseConfigured) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('clothes').select('*').order('created_at', { ascending: false })
  const clothes = (data ?? []) as Clothing[]
  const categoryCount = new Set(clothes.map((item) => item.category)).size
  const favoriteCount = clothes.filter((item) => item.is_favorite).length

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-muted">MY WARDROBE</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">衣橱</h1>
          <p className="mt-1.5 text-sm text-muted">
            共 {clothes.length} 件单品 · {categoryCount} 个分类 · 收藏 {favoriteCount}
          </p>
        </div>
        <Link href="/add" className="btn-primary hidden md:inline-flex">
          <Plus size={16} />
          添加衣物
        </Link>
      </header>

      <ClosetClient clothes={clothes} />
    </div>
  )
}
