/** 客户端图片压缩：长边限制在 maxSize 内，减少移动端上传体积 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && file.size < 900_000) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )

    return blob ?? file
  } catch {
    // HEIC 等浏览器无法解码的格式，直接上传原文件
    return file
  }
}

export function extensionOf(blob: Blob) {
  if (blob.type === 'image/png') return 'png'
  if (blob.type === 'image/webp') return 'webp'
  return 'jpg'
}

/** 生成列表用缩略图：长边压到 maxSize，固定 JPEG，显著降低列表带宽 */
export async function makeThumbnail(source: Blob, maxSize = 400, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(source)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && source.size <= 80_000) {
      bitmap.close()
      return source
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return source
    }

    // 透明背景（抠图结果）转 JPEG 时补白底，避免出现黑底
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )

    return blob ?? source
  } catch {
    return source
  }
}
