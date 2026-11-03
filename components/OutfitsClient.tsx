'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Check, Loader2, Maximize2, Pencil, Plus, Shirt, Sparkles, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OUTFIT_TAG_SUGGESTIONS } from '@/lib/constants'
import { cn, parseTags, publicImageUrl, todayKey } from '@/lib/utils'
import ImageLightbox from '@/components/ImageLightbox'
import type { Clothing, OutfitWithItems } from '@/lib/types'

function Collage({
  items,
  large = false,
  onItemClick,
}: {
  items: Clothing[]
  large?: boolean
  onItemClick?: (item: Clothing) => void
}) {
  const shown = items.slice(0, 4)
  const multiple = shown.length > 1

  return (
    <div className={cn('relative grid gap-0.5 overflow-hidden bg-sand', multiple ? 'grid-cols-2' : 'grid-cols-1')}>
      {shown.map((item) => {
        const src = publicImageUrl(large ? item.image_path : (item.thumb_path ?? item.image_path))
        const className = cn(
          'group/tile relative overflow-hidden bg-sand',
          large ? 'aspect-[4/5]' : multiple ? 'aspect-square' : 'aspect-[4/3]',
        )
        const content = (
          <>
            {src ? (
              <img src={src} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted/40">
                <Shirt size={large ? 32 : 22} />
              </div>
            )}
            {onItemClick && src && (
              <span className="absolute inset-0 grid place-items-center bg-ink/0 text-cream/0 transition group-hover/tile:bg-ink/25 group-hover/tile:text-cream">
                <Maximize2 size={large ? 22 : 16} />
              </span>
            )}
          </>
        )

        return onItemClick ? (
          <button key={item.id} type="button" onClick={() => onItemClick(item)} className={className} aria-label={`查看${item.name}大图`}>
            {content}
          </button>
        ) : (
          <div key={item.id} className={className}>
            {content}
          </div>
        )
      })}

      {items.length > 4 && (
        <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-cream">
          +{items.length - 4}
        </span>
      )}

      {items.length === 0 && (
        <div className="grid aspect-[4/3] place-items-center text-muted/40">
          <Shirt size={26} />
        </div>
      )}
    </div>
  )
}

export default function OutfitsClient({
  outfits,
  clothes,
  userId,
}: {
  outfits: OutfitWithItems[]
  clothes: Clothing[]
  userId: string
}) {
  const router = useRouter()
  const [localOutfits, setLocalOutfits] = useState<OutfitWithItems[]>(outfits)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<OutfitWithItems | null>(null)
  const [preview, setPreview] = useState<OutfitWithItems | null>(null)
  const [lightbox, setLightbox] = useState<Clothing | null>(null)

  const [name, setName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  function openEditor(outfit?: OutfitWithItems) {
    setName(outfit?.name ?? '')
    setTagsInput((outfit?.tags ?? []).join('、'))
    setNotes(outfit?.notes ?? '')
    setSelected(new Set((outfit?.items ?? []).map((item) => item.id)))
    setEditing(outfit ?? null)
    setPreview(null)
    setError(null)
    setEditorOpen(true)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTag(tag: string) {
    const current = parseTags(tagsInput)
    const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    setTagsInput(next.join('、'))
  }

  async function saveOutfit() {
    if (!name.trim()) {
      setError('给这套搭配起个名字')
      return
    }
    if (selected.size === 0) {
      setError('至少选择一件衣物')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const payload = { name: name.trim(), tags: parseTags(tagsInput), notes: notes.trim() || null }
      const items = clothes.filter((item) => selected.has(item.id))

      if (editing) {
        const { data: updated, error: updateError } = await supabase
          .from('outfits')
          .update(payload)
          .eq('id', editing.id)
          .select('*')
          .single()
        if (updateError) throw updateError

        const { error: clearError } = await supabase.from('outfit_items').delete().eq('outfit_id', editing.id)
        if (clearError) throw clearError

        const rows = Array.from(selected).map((clothId) => ({ outfit_id: editing.id, cloth_id: clothId }))
        const { error: itemsError } = await supabase.from('outfit_items').insert(rows)
        if (itemsError) throw itemsError

        setLocalOutfits((prev) =>
          prev.map((outfit) =>
            outfit.id === editing.id
              ? { ...outfit, name: updated.name, notes: updated.notes, tags: updated.tags ?? [], items }
              : outfit,
          ),
        )
        setPreview((prev) => (prev?.id === editing.id ? null : prev))
        setToast('搭配已更新')
      } else {
        const { data: created, error: createError } = await supabase
          .from('outfits')
          .insert(payload)
          .select('*')
          .single()
        if (createError) throw createError

        const rows = Array.from(selected).map((clothId) => ({ outfit_id: created.id, cloth_id: clothId }))
        const { error: itemsError } = await supabase.from('outfit_items').insert(rows)
        if (itemsError) throw itemsError

        setLocalOutfits((prev) => [
          {
            id: created.id,
            user_id: created.user_id,
            name: created.name,
            notes: created.notes,
            tags: created.tags ?? [],
            created_at: created.created_at,
            items,
          },
          ...prev,
        ])
        setToast('搭配已保存')
      }

      setEditing(null)
      setEditorOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  async function wearToday(outfitId: string) {
    setBusyId(outfitId)
    const { error: logError } = await createClient()
      .from('wear_logs')
      .upsert(
        { user_id: userId, outfit_id: outfitId, worn_on: todayKey() },
        { onConflict: 'user_id,worn_on' },
      )

    setBusyId(null)
    if (logError) {
      setToast('记录失败，请稍后重试')
      return
    }
    setToast('已记录为今天的穿搭')
  }

  async function deleteOutfit(outfit: OutfitWithItems) {
    if (!window.confirm(`确定删除搭配「${outfit.name}」吗？`)) return

    setBusyId(outfit.id)
    const { error: deleteError } = await createClient().from('outfits').delete().eq('id', outfit.id)
    setBusyId(null)

    if (deleteError) {
      setToast('删除失败，请稍后重试')
      return
    }

    setLocalOutfits((prev) => prev.filter((item) => item.id !== outfit.id))
    setPreview(null)
    setToast('搭配已删除')
    router.refresh()
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-muted">OUTFITS</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">穿搭</h1>
          <p className="mt-1.5 text-sm text-muted">共 {localOutfits.length} 套搭配</p>
        </div>
        <button type="button" onClick={() => openEditor()} className="btn-primary">
          <Plus size={16} />
          新建搭配
        </button>
      </header>

      {error && !editorOpen && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</p>
      )}

      {localOutfits.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sand text-clay/70">
            <Sparkles size={26} />
          </span>
          <h2 className="mt-5 font-serif text-xl">还没有搭配</h2>
          <p className="mt-2 max-w-xs text-sm text-muted">
            挑选几件衣物，把喜欢的组合保存下来，早上就不用再纠结。
          </p>
          <button type="button" onClick={() => openEditor()} className="btn-primary mt-6">
            <Plus size={16} />
            新建第一套搭配
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {localOutfits.map((outfit) => (
            <article
              key={outfit.id}
              className="group overflow-hidden rounded-3xl border border-ink/5 bg-white/85 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <button type="button" onClick={() => setPreview(outfit)} className="block w-full text-left">
                <Collage items={outfit.items} />
              </button>

              <div className="space-y-3 p-4">
                <div>
                  <h2 className="truncate font-serif text-base">{outfit.name}</h2>
                  <p className="mt-0.5 text-[11px] text-muted">{outfit.items.length} 件单品</p>
                </div>

                {outfit.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {outfit.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-sand px-2.5 py-1 text-[10px] text-ink/60">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => wearToday(outfit.id)}
                    disabled={busyId === outfit.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-clay/10 py-2 text-xs text-clay transition hover:bg-clay hover:text-cream disabled:opacity-60"
                  >
                    {busyId === outfit.id ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />}
                    今天穿这套
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(outfit)}
                    aria-label="编辑搭配"
                    className="grid h-8 w-8 place-items-center rounded-full border border-ink/10 text-muted transition hover:border-ink/25 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOutfit(outfit)}
                    disabled={busyId === outfit.id}
                    aria-label="删除搭配"
                    className="grid h-8 w-8 place-items-center rounded-full border border-ink/10 text-muted transition hover:border-red-200 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 新建搭配弹窗 */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-4xl bg-cream p-5 shadow-soft sm:max-w-2xl sm:rounded-4xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">{editing ? '编辑搭配' : '新建搭配'}</h2>
                <p className="mt-1 text-xs text-muted">
                  {editing ? '调整名称、标签或衣物组合' : '选择衣物，组合成一套造型'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="关闭"
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/70 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="field-label">搭配名称 *</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  placeholder="例如：周末咖啡店"
                  className="text-input"
                />
              </label>

              <div>
                <span className="field-label">标签</span>
                <div className="mb-2 flex flex-wrap gap-2">
                  {OUTFIT_TAG_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn('chip', parseTags(tagsInput).includes(tag) && 'chip-active')}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="自定义标签，用逗号分隔"
                  className="text-input"
                />
              </div>

              <div>
                <span className="field-label">选择衣物（{selected.size} 件）</span>
                {clothes.length === 0 ? (
                  <p className="rounded-2xl bg-white/70 px-4 py-6 text-center text-xs text-muted">
                    衣橱里还没有衣物，先去添加几件吧。
                  </p>
                ) : (
                  <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {clothes.map((item) => {
                      const active = selected.has(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleSelect(item.id)}
                          className={cn(
                            'relative overflow-hidden rounded-2xl border-2 bg-sand transition',
                            active ? 'border-clay' : 'border-transparent hover:border-ink/10',
                          )}
                        >
                          <span className="block aspect-square overflow-hidden">
                            {(() => {
                              const src = publicImageUrl(item.thumb_path ?? item.image_path)
                              return src ? (
                                <img src={src} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <span className="grid h-full place-items-center text-muted/40">
                                  <Shirt size={18} />
                                </span>
                              )
                            })()}
                          </span>
                          <span className="block truncate px-2 py-1.5 text-left text-[10px] text-ink/70">
                            {item.name}
                          </span>
                          {active && (
                            <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-clay text-cream">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="field-label">备注</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="适合的场合、配色思路…"
                  className="text-input resize-none"
                />
              </label>

              {error && <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</p>}

              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1" />
                <button type="button" onClick={() => setEditorOpen(false)} className="btn-ghost">
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveOutfit}
                  disabled={saving}
                  className="btn-primary min-w-[7rem]"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? '保存修改' : '保存搭配'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搭配预览弹窗 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-4xl bg-cream p-5 shadow-soft sm:max-w-lg sm:rounded-4xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl">{preview.name}</h2>
                <p className="mt-1 text-xs text-muted">{preview.items.length} 件单品</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="关闭"
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/70 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl">
              <Collage items={preview.items} large onItemClick={setLightbox} />
            </div>

            {preview.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {preview.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-sand px-2.5 py-1 text-[10px] text-ink/60">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {preview.notes && <p className="mt-3 text-sm leading-relaxed text-ink/70">{preview.notes}</p>}

            <ul className="mt-4 divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white/70">
              {preview.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setLightbox(item)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-sand/40"
                  >
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sand">
                      {(() => {
                        const src = publicImageUrl(item.thumb_path ?? item.image_path)
                        return src ? (
                          <img src={src} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full place-items-center text-muted/40">
                            <Shirt size={14} />
                          </span>
                        )
                      })()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{item.name}</span>
                      <span className="block text-[11px] text-muted">{item.category}</span>
                    </span>
                    <Maximize2 size={13} className="shrink-0 text-muted/50" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => deleteOutfit(preview)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-4 py-2.5 text-xs text-muted transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 size={13} />
                删除
              </button>
              <button
                type="button"
                onClick={() => openEditor(preview)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-4 py-2.5 text-xs text-muted transition hover:border-ink/25 hover:text-ink"
              >
                <Pencil size={13} />
                编辑
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => wearToday(preview.id)}
                disabled={busyId === preview.id}
                className="btn-primary py-2.5 text-xs"
              >
                {busyId === preview.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CalendarCheck size={14} />
                )}
                今天穿这套
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-xs text-cream shadow-soft md:bottom-8">
          {toast}
        </div>
      )}

      {lightbox && publicImageUrl(lightbox.image_path ?? lightbox.thumb_path) && (
        <ImageLightbox
          src={publicImageUrl(lightbox.image_path ?? lightbox.thumb_path)}
          alt={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
