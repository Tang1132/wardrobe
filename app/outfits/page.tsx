import { redirect } from 'next/navigation'
import OutfitsClient from '@/components/OutfitsClient'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Clothing, Outfit, OutfitWithItems } from '@/lib/types'

export const dynamic = 'force-dynamic'

type OutfitRow = Outfit & { outfit_items: { clothes: Clothing | null }[] }

export default async function OutfitsPage() {
  if (!isSupabaseConfigured) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [outfitsResult, clothesResult] = await Promise.all([
    supabase.from('outfits').select('*, outfit_items(clothes(*))').order('created_at', { ascending: false }),
    supabase
      .from('clothes')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  const outfits: OutfitWithItems[] = ((outfitsResult.data ?? []) as unknown as OutfitRow[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    notes: row.notes,
    tags: row.tags ?? [],
    created_at: row.created_at,
    items: (row.outfit_items ?? [])
      .map((link) => link.clothes)
      .filter((item): item is Clothing => Boolean(item)),
  }))

  const clothes = (clothesResult.data ?? []) as Clothing[]

  return <OutfitsClient outfits={outfits} clothes={clothes} userId={user.id} />
}
