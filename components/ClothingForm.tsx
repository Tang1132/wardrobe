'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crop, Heart, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET, CATEGORIES, OWNERS, SEASONS } from '@/lib/constants'
import { compressImage, extensionOf, makeThumbnail } from '@/lib/image'
import { cn, publicImageUrl } from '@/lib/utils'
import ImageEditor from '@/components/ImageEditor'
import type { Category, Clothing, Owner, Season } from '@/lib/types'

export default function ClothingForm({ initial }: { initial?: Clothing }) {
  const router = useRouter()
  const isEdit = Boolean(initial)

  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? '上衣')
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? '老婆')
  const [seasons, setSeasons] = useState<Season[]>(
    initial?.seasons?.length ? initial.seasons : ['四季'],
  )
  const [color, setColor] = useState(initial?.color ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [favorite, setFavorite] = useState(initial?.is_favorite ?? false)

  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(
    initial?.image_path ? publicImageUrl(initial.image_path) : null,
  )
  const [removeImage, setRemoveImage] = useState(false)
  const [editorSrc, setEditorSrc] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    return () => {
      if (editorSrc) URL.revokeObjectURL(editorSrc)
    }
  }, [editorSrc])

  async function handlePickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return

    setPreparing(true)
    setError(null)

    try {
      const compressed = await compressImage(picked)
      setEditorSrc(URL.createObjectURL(compressed))
    } catch {
      setError('图片读取失败，请换一张试试')
    } finally {
      setPreparing(false)
    }
  }

  function handleApplyEdit(blob: Blob) {
    setImageBlob(blob)
    setPreview(URL.createObjectURL(blob))
    setRemoveImage(false)
    setEditorSrc(null)
  }

  function handleEditAgain() {
    if (!imageBlob) return
    setEditorSrc(URL.createObjectURL(imageBlob))
  }

  function handleRemoveImage() {
    setImageBlob(null)
    setPreview(null)
    setRemoveImage(true)
  }

  function toggleSeason(option: Season) {
    setSeasons((prev) =>
      prev.includes(option) ? prev.filter((value) => value !== option) : [...prev, option],
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('请填写衣物名称')
      return
    }
    if (seasons.length === 0) {
      setError('请至少选择一个适合季节')
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

      if (imageBlob) {
        const thumb = await makeThumbnail(imageBlob)
        const base = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const path = `${base}.${extensionOf(imageBlob)}`
        const nextThumbPath = `${base}-thumb.jpg`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, imageBlob, { contentType: imageBlob.type, upsert: false })
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
        owner,
        seasons,
        color: color.trim() || null,
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
    <>
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

            {preparing ? (
              <div className="flex flex-col items-center text-muted">
                <Loader2 size={26} className="animate-spin text-clay/60" />
                <p className="mt-3 text-xs">正在读取照片…</p>
              </div>
            ) : preview ? (
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
                  上传后可裁剪、抠图
                </p>
              </div>
            )}
          </label>

          {preview && (
            <div className="mt-2 flex gap-2">
              {imageBlob && (
                <button
                  type="button"
                  onClick={handleEditAgain}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-ink/10 bg-white/60 py-2.5 text-xs text-muted transition hover:border-clay/40 hover:text-clay"
                >
                  <Crop size={13} />
                  裁剪 / 抠图
                </button>
              )}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-ink/10 bg-white/60 py-2.5 text-xs text-muted transition hover:border-red-200 hover:text-red-500"
              >
                <X size={13} />
                移除照片
              </button>
            </div>
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

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="field-label">所属人</span>
                <select
                  value={owner}
                  onChange={(event) => setOwner(event.target.value as Owner)}
                  className="text-input"
                >
                  {OWNERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

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
              <span className="field-label">适合季节（可多选）</span>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleSeason(option)}
                    className={cn('chip', seasons.includes(option) && 'chip-active')}
                  >
                    {option}
                  </button>
                ))}
              </div>
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
            <button type="submit" disabled={saving || deleting || preparing} className="btn-primary min-w-[7rem]">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? '保存修改' : '保存衣物'}
            </button>
          </div>
        </div>
      </form>

      {editorSrc && (
        <ImageEditor
          src={editorSrc}
          onCancel={() => setEditorSrc(null)}
          onApply={handleApplyEdit}
        />
      )}
    </>
  )
}
