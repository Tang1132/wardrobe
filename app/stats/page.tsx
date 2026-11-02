import { redirect } from 'next/navigation'
import StatsClient from '@/components/StatsClient'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import type { Clothing, WearLog } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  if (!isSupabaseConfigured) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [clothesResult, outfitsResult, logsResult] = await Promise.all([
    supabase.from('clothes').select('*'),
    supabase.from('outfits').select('id, name').order('created_at', { ascending: false }),
    supabase.from('wear_logs').select('*').order('worn_on', { ascending: false }),
  ])

  const clothes = (clothesResult.data ?? []) as Clothing[]
  const outfits = (outfitsResult.data ?? []) as { id: string; name: string }[]
  const logs = (logsResult.data ?? []) as WearLog[]

  return <StatsClient clothes={clothes} outfits={outfits} logs={logs} userId={user.id} />
}
