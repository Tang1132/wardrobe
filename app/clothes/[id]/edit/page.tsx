import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ClothingForm from '@/components/ClothingForm'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Clothing } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EditClothingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) redirect('/login')

  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('clothes').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-clay"
        >
          <ChevronLeft size={14} />
          返回衣橱
        </Link>
        <h1 className="mt-3 font-serif text-3xl">编辑衣物</h1>
        <p className="mt-1.5 text-sm text-muted">修改信息、替换照片，或把它移出衣橱。</p>
      </header>

      <ClothingForm initial={data as Clothing} />
    </div>
  )
}
