import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ClothingForm from '@/components/ClothingForm'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AddClothingPage() {
  if (!isSupabaseConfigured) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        <h1 className="mt-3 font-serif text-3xl">添加衣物</h1>
        <p className="mt-1.5 text-sm text-muted">拍一张照片，记录这件单品的全部细节。</p>
      </header>

      <ClothingForm />
    </div>
  )
}
