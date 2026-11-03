'use client'
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Heart, Loader2, Maximize2, Plus, Search, Shirt, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, CATEGORIES, OWNERS, SEASONS } from '@/lib/constants'
import { cn, publicImageUrl } from '@/lib/utils'
import ImageLightbox from '@/components/ImageLightbox'
import type { Clothing, Owner, Season } from '@/lib/types'

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

function ClothingCard({
  item,
  onFavorite,
  onView,
  onDelete,
  deleting,
}: {
  item: Clothing
  onFavorite: () => void
  onView: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const listImage = publicImageUrl(item.thumb_path ?? item.image_path)

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/85 shadow-card">
      <Link href={`/clothes/${item.id}/edit`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-sand">
          {listImage ? (
            <img
              src={listImage}
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
              {item.owner} · {item.category}
              {item.color ? ` · ${item.color}` : ''}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={onView}
        aria-label="查看大图"
        className="absolute right-14 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-cream/85 text-ink/50 backdrop-blur transition hover:text-clay"
      >
        <Maximize2 size={15} />
      </button>

      <button
        type="button"
        onClick={onFavorite}
        aria-label={item.is_favorite ? '取消收藏' : '收藏'}
        className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-cream/85 text-ink/50 backdrop-blur transition hover:text-clay"
      >
        <Heart size={16} className={item.is_favorite ? 'fill-clay text-clay' : ''} />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-label="删除衣物"
        className="absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-cream/85 text-ink/50 backdrop-blur transition hover:text-red-500 disabled:opacity-60"
      >
        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
    </div>
  )
}

export default function ClosetClient({ clothes }: { clothes: Clothing[] }) {
  const [items, setItems] = useState<Clothing[]>(clothes)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [owner, setOwner] = useState(ALL)
  const [season, setSeason] = useState(ALL)
  const [color, setColor] = useState(ALL)
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Clothing | null>(null)

  const colors = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.color?.trim()).filter((value): value is string => Boolean(value))),
      ),
    [items],
  )

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return items.filter((item) => {
      if (category !== ALL && item.category !== category) return false
      if (owner !== ALL && item.owner !== (owner as Owner)) return false
      if (season !== ALL && !(item.seasons ?? []).includes(season as Season)) return false
      if (color !== ALL && (item.color ?? '').trim() !== color) return false
      if (favoriteOnly && !item.is_favorite) return false

      if (keyword) {
        const haystack = [item.name, item.color, item.category, item.owner, ...(item.seasons ?? []), item.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(keyword)) return false
      }

      return true
    })
  }, [items, query, category, owner, season, color, favoriteOnly])

  const filtersActive =
    category !== ALL || owner !== ALL || season !== ALL || color !== ALL || favoriteOnly || query !== ''

  function resetFilters() {
    setCategory(ALL)
    setOwner(ALL)
    setSeason(ALL)
    setColor(ALL)
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

  async function deleteItem(item: Clothing) {
    if (!window.confirm(`确定删除「${item.name}」吗？对应的图片也会一并删除。`)) return

    setDeletingId(item.id)
    setError(null)

    try {
      const supabase = createClient()
      const stale = [item.image_path, item.thumb_path].filter((value): value is string => Boolean(value))
      if (stale.length > 0) {
        await supabase.storage.from(BUCKET).remove(stale)
      }
      const { error: deleteError } = await supabase.from('clothes').delete().eq('id', item.id)
      if (deleteError) throw deleteError

      setItems((prev) => prev.filter((entry) => entry.id !== item.id))
    } catch {
      setError('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
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
            placeholder="搜索名称、颜色或备注"
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
          <FilterRow label="所属人" options={[ALL, ...OWNERS]} value={owner} onChange={setOwner} />
          <FilterRow label="季节" options={[ALL, ...SEASONS]} value={season} onChange={setSeason} />
          {colors.length > 0 && (
            <FilterRow label="颜色" options={[ALL, ...colors]} value={color} onChange={setColor} />
          )}
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
            <ClothingCard
              key={item.id}
              item={item}
              onFavorite={() => toggleFavorite(item)}
              onView={() => setViewing(item)}
              onDelete={() => deleteItem(item)}
              deleting={deletingId === item.id}
            />
          ))}
        </div>
      )}

      {viewing && publicImageUrl(viewing.image_path ?? viewing.thumb_path) && (
        <ImageLightbox
          src={publicImageUrl(viewing.image_path ?? viewing.thumb_path)}
          alt={viewing.name}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
