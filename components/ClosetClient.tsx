'use client'
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Heart, Plus, Search, Shirt, SlidersHorizontal, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, SEASONS } from '@/lib/constants'
import { cn, formatPrice, publicImageUrl } from '@/lib/utils'
import type { Clothing } from '@/lib/types'

const ALL = '全部'

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 w-8 shrink-0 text-xs text-muted">{label}</span>
      <div className="no-scrollbar flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn('chip', value === option && 'chip-active')}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClothingCard({ item, onFavorite }: { item: Clothing; onFavorite: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/85 shadow-card">
      <Link href={`/clothes/${item.id}/edit`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          {item.image_path ? (
            <img
              src={publicImageUrl(item.image_path)}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted/50">
              <Shirt size={34} />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 via-ink/15 to-transparent p-3 pt-10 text-cream">
            <p className="truncate font-serif text-sm">{item.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-cream/75">
              {item.category}
              {item.color ? ` · ${item.color}` : ''}
              {item.price ? ` · ${formatPrice(item.price)}` : ''}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={onFavorite}
        aria-label={item.is_favorite ? '取消收藏' : '收藏'}
        className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-cream/85 text-ink/50 backdrop-blur transition hover:text-clay"
      >
        <Heart size={16} className={item.is_favorite ? 'fill-clay text-clay' : ''} />
      </button>
    </div>
  )
}

export default function ClosetClient({ clothes }: { clothes: Clothing[] }) {
  const [items, setItems] = useState<Clothing[]>(clothes)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [season, setSeason] = useState(ALL)
  const [color, setColor] = useState(ALL)
  const [tag, setTag] = useState(ALL)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const colors = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.color?.trim()).filter((value): value is string => Boolean(value))),
      ),
    [items],
  )

  const tags = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags ?? []))), [items])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return items.filter((item) => {
      if (category !== ALL && item.category !== category) return false
      if (season !== ALL && item.season !== season) return false
      if (color !== ALL && (item.color ?? '').trim() !== color) return false
      if (tag !== ALL && !(item.tags ?? []).includes(tag)) return false
      if (favoriteOnly && !item.is_favorite) return false

      if (keyword) {
        const haystack = [
          item.name,
          item.brand,
          item.color,
          item.category,
          item.season,
          item.notes,
          ...(item.tags ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(keyword)) return false
      }

      return true
    })
  }, [items, query, category, season, color, tag, favoriteOnly])

  const filtersActive =
    category !== ALL || season !== ALL || color !== ALL || tag !== ALL || favoriteOnly || query !== ''

  function resetFilters() {
    setCategory(ALL)
    setSeason(ALL)
    setColor(ALL)
    setTag(ALL)
    setFavoriteOnly(false)
    setQuery('')
  }

  async function toggleFavorite(item: Clothing) {
    const next = !item.is_favorite
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_favorite: next } : entry)))

    const { error: updateError } = await createClient()
      .from('clothes')
      .update({ is_favorite: next })
      .eq('id', item.id)

    if (updateError) {
      setError('收藏状态更新失败，请稍后重试')
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_favorite: !next } : entry)),
      )
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、品牌、颜色或标签"
            className="w-full rounded-full border border-ink/10 bg-white/80 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted/60 focus:border-clay/50 focus:ring-4 focus:ring-clay/10"
          />
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMore((value) => !value)}
            className={cn('btn-ghost', showMore && 'border-clay/40 text-clay')}
          >
            <SlidersHorizontal size={15} />
            筛选
          </button>
          <button
            type="button"
            onClick={() => setFavoriteOnly((value) => !value)}
            className={cn('btn-ghost', favoriteOnly && 'border-clay/40 text-clay')}
          >
            <Heart size={15} className={favoriteOnly ? 'fill-clay text-clay' : ''} />
            收藏
          </button>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[ALL, ...CATEGORIES].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option)}
            className={cn('chip', category === option && 'chip-active')}
          >
            {option}
          </button>
        ))}
      </div>

      {showMore && (
        <div className="space-y-3 rounded-3xl border border-ink/5 bg-white/60 p-4">
          <FilterRow label="季节" options={[ALL, ...SEASONS]} value={season} onChange={setSeason} />
          {colors.length > 0 && (
            <FilterRow label="颜色" options={[ALL, ...colors]} value={color} onChange={setColor} />
          )}
          {tags.length > 0 && <FilterRow label="标签" options={[ALL, ...tags]} value={tag} onChange={setTag} />}
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-muted transition hover:text-clay"
            >
              <X size={12} />
              清除全部筛选
            </button>
          )}
        </div>
      )}

      {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{filtered.length} 件单品</span>
        {filtersActive && (
          <button type="button" onClick={resetFilters} className="transition hover:text-clay">
            清除筛选
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sand text-clay/70">
            <Shirt size={28} />
          </span>
          <h2 className="mt-5 font-serif text-xl">衣橱还是空的</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">从第一件衣物开始，慢慢建立属于你的数字衣橱。</p>
          <Link href="/add" className="btn-primary mt-6">
            <Plus size={16} />
            添加第一件衣物
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <h2 className="font-serif text-lg">没有找到匹配的单品</h2>
          <p className="mt-2 text-sm text-muted">换个关键词或清空筛选条件试试。</p>
          <button type="button" onClick={resetFilters} className="btn-ghost mt-5">
            清除筛选
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filtered.map((item) => (
            <ClothingCard key={item.id} item={item} onFavorite={() => toggleFavorite(item)} />
          ))}
        </div>
      )}
    </div>
  )
}
