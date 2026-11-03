'use client'
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react'
import { Check, Loader2, Scissors, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Rect = { x: number; y: number; w: number; h: number }
type Mode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

const MIN_SIZE = 0.08

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** 从裁切结果中移除与四角同色、且与边缘连通的背景（适合纯色/浅色背景的照片） */
function removeBackground(context: CanvasRenderingContext2D, width: number, height: number, tolerance: number) {
  const image = context.getImageData(0, 0, width, height)
  const data = image.data
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([x, y]) => {
    const index = (y * width + x) * 4
    return [data[index], data[index + 1], data[index + 2]]
  })

  const limit = tolerance * tolerance * 3

  function matches(index: number) {
    const r = data[index * 4]
    const g = data[index * 4 + 1]
    const b = data[index * 4 + 2]
    return corners.some(([cr, cg, cb]) => (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2 <= limit)
  }

  function push(index: number) {
    if (visited[index] || !matches(index)) return
    visited[index] = 1
    queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width)
    push(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    data[index * 4 + 3] = 0

    const x = index % width
    const y = (index - x) / width
    if (x > 0) push(index - 1)
    if (x < width - 1) push(index + 1)
    if (y > 0) push(index - width)
    if (y < height - 1) push(index + width)
  }

  context.putImageData(image, 0, 0)
}

export default function ImageEditor({
  src,
  onCancel,
  onApply,
}: {
  src: string
  onCancel: () => void
  onApply: (blob: Blob) => void
}) {
  const [crop, setCrop] = useState<Rect>({ x: 0.04, y: 0.04, w: 0.92, h: 0.92 })
  const [removeBg, setRemoveBg] = useState(false)
  const [tolerance, setTolerance] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    mode: Mode
    startX: number
    startY: number
    rect: Rect
    width: number
    height: number
  } | null>(null)

  function startDrag(event: React.PointerEvent, mode: Mode) {
    event.preventDefault()
    event.stopPropagation()
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: crop,
      width: box.width,
      height: box.height,
    }
  }

  function handleMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return

    const dx = (event.clientX - drag.startX) / drag.width
    const dy = (event.clientY - drag.startY) / drag.height
    let { x, y, w, h } = drag.rect

    if (drag.mode === 'move') {
      x = clamp(x + dx, 0, 1 - w)
      y = clamp(y + dy, 0, 1 - h)
    } else {
      if (drag.mode.includes('w')) {
        const right = x + w
        x = clamp(x + dx, 0, right - MIN_SIZE)
        w = right - x
      } else if (drag.mode.includes('e')) {
        w = clamp(w + dx, MIN_SIZE, 1 - x)
      }
      if (drag.mode.includes('n')) {
        const bottom = y + h
        y = clamp(y + dy, 0, bottom - MIN_SIZE)
        h = bottom - y
      } else if (drag.mode.includes('s')) {
        h = clamp(h + dy, MIN_SIZE, 1 - y)
      }
    }

    setCrop({ x, y, w, h })
  }

  function endDrag() {
    dragRef.current = null
  }

  async function apply() {
    setBusy(true)
    setError(null)

    try {
      const image = new Image()
      image.src = src
      await image.decode()

      const sourceX = crop.x * image.naturalWidth
      const sourceY = crop.y * image.naturalHeight
      const sourceW = crop.w * image.naturalWidth
      const sourceH = crop.h * image.naturalHeight

      const scale = Math.min(1, 1600 / Math.max(sourceW, sourceH))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(sourceW * scale))
      canvas.height = Math.max(1, Math.round(sourceH * scale))

      const context = canvas.getContext('2d')
      if (!context) throw new Error('当前浏览器不支持图片处理')

      context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height)

      if (removeBg) {
        removeBackground(context, canvas.width, canvas.height, tolerance)
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, removeBg ? 'image/png' : 'image/jpeg', removeBg ? undefined : 0.9),
      )
      if (!blob) throw new Error('图片处理失败')

      onApply(blob)
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片处理失败，请重试')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-4 shadow-xl sm:rounded-3xl sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">编辑照片</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="关闭"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-1 text-[11px] text-muted">拖动方框调整裁剪范围，拖拽四角自由缩放。</p>

        <div ref={boxRef} className="relative mt-3 touch-none select-none overflow-hidden rounded-2xl bg-sand">
          <img src={src} alt="待编辑照片" draggable={false} className="block w-full" />

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-ink/45" style={{ height: `${crop.y * 100}%` }} />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/45"
            style={{ height: `${(1 - crop.y - crop.h) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute left-0 bg-ink/45"
            style={{ top: `${crop.y * 100}%`, width: `${crop.x * 100}%`, height: `${crop.h * 100}%` }}
          />
          <div
            className="pointer-events-none absolute right-0 bg-ink/45"
            style={{ top: `${crop.y * 100}%`, width: `${(1 - crop.x - crop.w) * 100}%`, height: `${crop.h * 100}%` }}
          />

          <div
            role="presentation"
            onPointerDown={(event) => startDrag(event, 'move')}
            onPointerMove={handleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute cursor-move border-2 border-cream shadow-[0_0_0_9999px_rgba(0,0,0,0.02)]"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
          >
            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
              <span
                key={corner}
                onPointerDown={(event) => startDrag(event, corner)}
                onPointerMove={handleMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={cn(
                  'absolute h-5 w-5 rounded-full border-2 border-clay bg-cream',
                  corner === 'nw' && '-left-2.5 -top-2.5 cursor-nwse-resize',
                  corner === 'ne' && '-right-2.5 -top-2.5 cursor-nesw-resize',
                  corner === 'sw' && '-bottom-2.5 -left-2.5 cursor-nesw-resize',
                  corner === 'se' && '-bottom-2.5 -right-2.5 cursor-nwse-resize',
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/70 p-4">
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <Scissors size={15} className="text-clay" />
              去除纯色背景（抠图）
            </span>
            <input
              type="checkbox"
              checked={removeBg}
              onChange={(event) => setRemoveBg(event.target.checked)}
              className="h-4 w-4 accent-clay"
            />
          </label>

          {removeBg && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>容差</span>
                <span>{tolerance}</span>
              </div>
              <input
                type="range"
                min={5}
                max={80}
                value={tolerance}
                onChange={(event) => setTolerance(Number(event.target.value))}
                className="mt-1 w-full accent-clay"
              />
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                适合白墙、纯色背景布等场景；背景越复杂越难完全去除，可调大容差重试。
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost">
            取消
          </button>
          <button type="button" onClick={apply} disabled={busy} className="btn-primary min-w-[7rem]">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            应用
          </button>
        </div>
      </div>
    </div>
  )
}
