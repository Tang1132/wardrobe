import { BUCKET } from './constants'
import { supabaseUrl } from './supabase/config'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/** 由 Storage 中的相对路径生成公开访问地址 */
export function publicImageUrl(path: string | null | undefined) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
}

export function parseTags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )
}

export function pad2(value: number) {
  return String(value).padStart(2, '0')
}

/** 本地时区的 YYYY-MM-DD */
export function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

export function todayKey(date = new Date()) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${year}.${month}.${day}`
}
