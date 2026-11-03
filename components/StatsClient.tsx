'use client'

import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  Shirt,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants'
import { cn, dateKey, pad2, todayKey } from '@/lib/utils'
import type { Clothing, WearLog } from '@/lib/types'

interface OutfitOption {
  id: string
  name: string
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Shirt
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="card p-4 sm:p-5">
      <span className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon size={13} />
        {label}
      </span>
      <p className="mt-2.5 font-serif text-2xl leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export default function StatsClient({
  clothes,
  outfits,
  logs,
  userId,
}: {
  clothes: Clothing[]
  outfits: OutfitOption[]
  logs: WearLog[]
  userId: string
}) {
  const today = new Date()
  const [localLogs, setLocalLogs] = useState<WearLog[]>(logs)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedOutfitId, setSelectedOutfitId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const outfitNames = useMemo(() => new Map(outfits.map((item) => [item.id, item.name])), [outfits])
  const logsByDate = useMemo(() => {
    const map = new Map<string, WearLog>()
    localLogs.forEach((log) => map.set(log.worn_on, log))
    return map
  }, [localLogs])

  const categoryStats = useMemo(() => {
    const stats = CATEGORIES.map((category) => ({
      category,
      count: clothes.filter((item) => item.category === category).length,
    }))
    return stats.filter((item) => item.count > 0).sort((a, b) => b.count - a.count)
  }, [clothes])

  const maxCount = Math.max(...categoryStats.map((item) => item.count), 1)

  const topOutfit = useMemo(() => {
    const counts = new Map<string, number>()
    localLogs.forEach((log) => {
      if (!log.outfit_id) return
      counts.set(log.outfit_id, (counts.get(log.outfit_id) ?? 0) + 1)
    })
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    return { name: outfitNames.get(sorted[0][0]) ?? '已删除的搭配', count: sorted[0][1] }
  }, [localLogs, outfitNames])

  const monthPrefix = `${viewYear}-${pad2(viewMonth + 1)}`
  const monthWornCount = localLogs.filter((log) => log.worn_on.startsWith(monthPrefix)).length

  const cells = useMemo(() => {
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null as number | null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  }, [viewYear, viewMonth])

  const todayValue = todayKey()

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
    setSelectedDate(null)
    setSelectedOutfitId('')
    setMessage(null)
  }

  function selectDay(day: number) {
    const key = dateKey(viewYear, viewMonth, day)
    setSelectedDate(key)
    setSelectedOutfitId(logsByDate.get(key)?.outfit_id ?? '')
    setMessage(null)
  }

  async function saveDay() {
    if (!selectedDate) return
    if (!selectedOutfitId) {
      setMessage({ type: 'error', text: '请选择一套搭配' })
      return
    }

    setBusy(true)
    setMessage(null)

    const { data, error } = await createClient()
      .from('wear_logs')
      .upsert(
        { user_id: userId, outfit_id: selectedOutfitId, worn_on: selectedDate },
        { onConflict: 'user_id,worn_on' },
      )
      .select('*')
      .single()

    setBusy(false)

    if (error || !data) {
      setMessage({ type: 'error', text: '保存失败，请稍后重试' })
      return
    }

    setLocalLogs((prev) => [...prev.filter((log) => log.worn_on !== selectedDate), data as WearLog])
    setMessage({ type: 'ok', text: '已记录到日历' })
  }

  async function clearDay() {
    if (!selectedDate) return

    setBusy(true)
    setMessage(null)

    const { error } = await createClient().from('wear_logs').delete().eq('worn_on', selectedDate)
    setBusy(false)

    if (error) {
      setMessage({ type: 'error', text: '清除失败，请稍后重试' })
      return
    }

    setLocalLogs((prev) => prev.filter((log) => log.worn_on !== selectedDate))
    setSelectedOutfitId('')
    setMessage({ type: 'ok', text: '已清除当天记录' })
  }

  const selectedLog = selectedDate ? logsByDate.get(selectedDate) : undefined

  return (
    <div>
      <header className="mb-6 md:mb-8">
        <p className="text-[10px] tracking-[0.3em] text-muted">INSIGHTS</p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl">统计与日历</h1>
        <p className="mt-1.5 text-sm text-muted">看看衣橱的构成，以及它被穿着的频率。</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <StatCard icon={Shirt} label="衣物总数" value={`${clothes.length}`} hint="件单品" />
        <StatCard icon={Layers} label="搭配方案" value={`${outfits.length}`} hint="套已保存" />
        <StatCard icon={CalendarDays} label="穿着记录" value={`${localLogs.length}`} hint="天" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr,1.1fr]">
        {/* 分类统计 */}
        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">分类占比</h2>
            <span className="text-[11px] text-muted">{categoryStats.length} 个分类</span>
          </div>

          {categoryStats.length === 0 ? (
            <p className="rounded-2xl bg-sand/50 px-4 py-8 text-center text-xs text-muted">
              还没有衣物数据，添加后这里会自动统计。
            </p>
          ) : (
            <div className="space-y-3.5">
              {categoryStats.map(({ category, count }) => (
                <div key={category}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-ink/75">{category}</span>
                    <span className="text-muted">
                      {count} 件 · {Math.round((count / clothes.length) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-clay/80"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-sand/50 p-4">
            <p className="text-[11px] text-muted">穿着最多</p>
            <p className="mt-1 font-serif text-base">
              {topOutfit ? `${topOutfit.name}` : '还没有记录'}
              {topOutfit && <span className="ml-1.5 text-xs text-muted">× {topOutfit.count}</span>}
            </p>
          </div>
        </section>

        {/* 日历 */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">
              {viewYear} 年 {viewMonth + 1} 月
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="上一月"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="下一月"
                className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <p className="mt-1 text-[11px] text-muted">本月已记录 {monthWornCount} 天</p>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} />

              const key = dateKey(viewYear, viewMonth, day)
              const log = logsByDate.get(key)
              const isToday = key === todayValue
              const isSelected = key === selectedDate

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition',
                    isSelected
                      ? 'bg-clay text-cream'
                      : log
                        ? 'bg-clay/10 text-clay hover:bg-clay/15'
                        : 'text-ink/70 hover:bg-sand',
                    isToday && !isSelected && 'ring-1 ring-clay/40',
                  )}
                >
                  {day}
                  {log && (
                    <span
                      className={cn(
                        'mt-0.5 h-1 w-1 rounded-full',
                        isSelected ? 'bg-cream' : 'bg-clay',
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="mt-4 rounded-2xl bg-sand/50 p-4">
              <p className="text-xs text-ink/70">
                {selectedDate}
                {selectedLog ? (
                  <span className="ml-1.5 text-clay">
                    · {outfitNames.get(selectedLog.outfit_id ?? '') ?? '已删除的搭配'}
                  </span>
                ) : (
                  <span className="ml-1.5 text-muted">· 尚未记录</span>
                )}
              </p>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedOutfitId}
                  onChange={(event) => setSelectedOutfitId(event.target.value)}
                  className="text-input flex-1 py-2.5 text-xs"
                >
                  <option value="">选择一套搭配…</option>
                  {outfits.map((outfit) => (
                    <option key={outfit.id} value={outfit.id}>
                      {outfit.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  {selectedLog && (
                    <button
                      type="button"
                      onClick={clearDay}
                      disabled={busy}
                      className="rounded-full border border-ink/10 px-4 py-2.5 text-xs text-muted transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                    >
                      清除
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveDay}
                    disabled={busy}
                    className="btn-primary px-4 py-2.5 text-xs"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    记录
                  </button>
                </div>
              </div>

              {message && (
                <p className={cn('mt-2 text-[11px]', message.type === 'ok' ? 'text-sage' : 'text-red-500')}>
                  {message.text}
                </p>
              )}
            </div>
          )}

          {outfits.length === 0 && (
            <p className="mt-3 text-[11px] text-muted">先到「穿搭」页面保存一套搭配，才能记录到日历。</p>
          )}
        </section>
      </div>
    </div>
  )
}
