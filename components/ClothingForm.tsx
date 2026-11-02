'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, CATEGORIES, SEASONS } from '@/lib/constants'
import { compressImage, extensionOf, makeThumbnail } from '@/lib/image'
import { cn, parseTags, publicImageUrl } from '@/lib/utils'
import type { Category, Clothing, Season } from '@/lib/types'

export default function ClothingForm({ initial }: { initial?: Clothing }) {
  const router = useRouter()
  const isEdit = Boolean(initial)

  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? '上衣')
  const [season, setSeason] = useState<Season>(initial?.season ?? '四季')
  const [color, setColor] = useState(initial?.color ?? '')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [purchasedAt, setPurchasedAt] = useState(initial?.purchased_at ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join('、'))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [favorite, setFavorite] = useState(initial?.is_favorite ?? false)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(
    initial?.image_path ? publicImageUrl(initial.image_path) : null,
  )
  const [removeImage, setRemoveImage] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handlePickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    if (!picked) return
    setFile(picked)
    setRemoveImage(false)
    setPreview(URL.createObjectURL(picked))
  }

  function handleRemoveImage() {
    setFile(null)
    setPreview(null)
    setRemoveImage(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('请填写衣物名称')
      return
    }

    const priceValue = price.trim() ? Number(price) : null
    if (priceValue !== null && !Number.isFinite(priceValue)) {
      setError('价格需要填写数字')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('登录状态已失效，请重新登录')

      let imagePath = initial?.image_path ?? null
      let thumbPath = initial?.thumb_path ?? null

      if (file) {
        const blob = await compressImage(file)
        const thumb = await makeThumbnail(blob)
        const base = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const path = `${base}.${extensionOf(blob)}`
        const nextThumbPath = `${base}-thumb.jpg`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type, upsert: false })
        if (uploadError) throw uploadError

        const { error: thumbError } = await supabase.storage
          .from(BUCKET)
          .upload(nextThumbPath, thumb, { contentType: 'image/jpeg', upsert: false })
        if (thumbError) {
          await supabase.storage.from(BUCKET).remove([path])
          throw thumbError
        }

        const stale = [imagePath, thumbPath].filter((value): value is string => Boolean(value))
        if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale)

        imagePath = path
        thumbPath = nextThumbPath
      } else if (removeImage && initial?.image_path) {
        const stale = [initial.image_path, initial.thumb_path].filter((value): value is string => Boolean(value))
        if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale)
        imagePath = null
        thumbPath = null
      }

      const payload = {
        name: name.trim(),
        category,
        season,
        color: color.trim() || null,
        brand: brand.trim() || null,
        price: priceValue,
        purchased_at: purchasedAt || null,
        tags: parseTags(tags),
        notes: notes.trim() || null,
        is_favorite: favorite,
        image_path: imagePath,
        thumb_path: thumbPath,
      }

      if (initial) {
        const { error: updateError } = await supabase.from('clothes').update(payload).eq('id', initial.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('clothes').insert(payload)
        if (insertError) throw insertError
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请稍后重试')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (!window.confirm('确定删除这件衣物吗？对应的图片也会一并删除。')) return

    setDeleting(true)
    setError(null)

    try {
      const supabase = createClient()
      const stale = [initial.image_path, initial.thumb_path].filter(
        (value): value is string => Boolean(value),
      )
      if (stale.length > 0) {
        await supabase.storage.from(BUCKET).remove(stale)
      }
      const { error: deleteError } = await supabase.from('clothes').delete().eq('id', initial.id)
      if (deleteError) throw deleteError

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请稍后重试')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px,1fr] lg:items-start">
      {/* 图片 */}
      <div className="lg:sticky lg:top-8">
        <label
          htmlFor="clothing-image"
          className="group relative flex aspect-[4/5] w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-ink/15 bg-white/60 transition hover:border-clay/50"
        >
          <input
            id="clothing-image"
            type="file"
            accept="image/*"
            onChange={handlePickImage}
            className="sr-only"
          />

          {preview ? (
            <>
              <img src={preview} alt="衣物预览" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-4 text-center text-xs text-cream opacity-0 transition group-hover:opacity-100">
                点击更换图片
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center px-6 text-center text-muted">
              <ImagePlus size={30} className="text-clay/60" />
              <p className="mt-3 text-sm text-ink/70">上传衣物照片</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                JPG / PNG / WebP
                <br />
                将自动压缩后上传
              </p>
            </div>
          )}
        </label>

        {preview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-ink/10 bg-white/60 py-2.5 text-xs text-muted transition hover:border-red-200 hover:text-red-500"
          >
            <X size={13} />
            移除照片
          </button>
        )}
      </div>

      {/* 表单 */}
      <div className="space-y-5">
        <div className="card space-y-4 p-5 sm:p-6">
          <label className="block">
            <span className="field-label">名称 *</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="例如：米白色针织开衫"
              className="text-input"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">分类</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
                className="text-input"
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="field-label">颜色</span>
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                maxLength={12}
                placeholder="米白 / 黑色"
                className="text-input"
              />
            </label>
          </div>

          <div>
            <span className="field-label">适合季节</span>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSeason(option)}
                  className={cn('chip', season === option && 'chip-active')}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">品牌</span>
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                maxLength={30}
                placeholder="可选"
                className="text-input"
              />
            </label>

            <label className="block">
              <span className="field-label">购买价格（元）</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="text-input"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">购买日期</span>
              <input
                type="date"
                value={purchasedAt ?? ''}
                onChange={(event) => setPurchasedAt(event.target.value)}
                className="text-input"
              />
            </label>

            <label className="block">
              <span className="field-label">标签（用逗号分隔）</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                maxLength={80}
                placeholder="通勤、显瘦、百搭"
                className="text-input"
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">备注</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="版型、尺码、搭配灵感…"
              className="text-input resize-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setFavorite((value) => !value)}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition',
              favorite ? 'border-clay/40 bg-clay/5 text-clay' : 'border-ink/10 text-muted hover:text-ink',
            )}
          >
            <Heart size={16} className={favorite ? 'fill-clay text-clay' : ''} />
            {favorite ? '已加入收藏' : '收藏这件衣物'}
          </button>
        </div>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-4 py-3 text-sm text-muted transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              删除
            </button>
          )}

          <div className="flex-1" />

          <button type="button" onClick={() => router.back()} className="btn-ghost">
            取消
          </button>
          <button type="submit" disabled={saving || deleting} className="btn-primary min-w-[7rem]">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEdit ? '保存修改' : '保存衣物'}
          </button>
        </div>
      </div>
    </form>
  )
}
