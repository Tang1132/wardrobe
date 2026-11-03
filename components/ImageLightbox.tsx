'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt?: string
  onClose: () => void
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt ? `${alt} 大图` : '查看大图'}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭大图"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-cream transition hover:bg-white/25 sm:right-6 sm:top-6"
      >
        <X size={18} />
      </button>

      <img
        src={src}
        alt={alt ?? ''}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
      />
    </div>
  )
}
