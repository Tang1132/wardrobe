import type { Category, Season } from './types'

/** Storage Bucket 名称（与 SQL 脚本保持一致） */
export const BUCKET = 'clothing-images'

export const CATEGORIES: Category[] = [
  '上衣',
  '背心',
  '开衫',
  '裤子',
  '外套',
  '裙装',
  '鞋靴',
  '配饰',
  '其他',
]

export const SEASONS: Season[] = ['春', '夏', '秋', '冬', '四季']

export const OUTFIT_TAG_SUGGESTIONS = ['工作', '休闲', '约会', '运动', '旅行']
