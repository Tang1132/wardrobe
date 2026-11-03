export type Category =
  | '上衣'
  | '背心'
  | '开衫'
  | '裤子'
  | '外套'
  | '裙装'
  | '鞋靴'
  | '配饰'
  | '其他'
export type Season = '春' | '夏' | '秋' | '冬' | '四季'
export type Owner = '老公' | '老婆'

export interface Clothing {
  id: string
  user_id: string
  name: string
  category: Category
  seasons: Season[]
  owner: Owner
  color: string | null
  notes: string | null
  image_path: string | null
  thumb_path: string | null
  is_favorite: boolean
  created_at: string
}

export interface Outfit {
  id: string
  user_id: string
  name: string
  notes: string | null
  tags: string[]
  created_at: string
}

export interface OutfitWithItems extends Outfit {
  items: Clothing[]
}

export interface WearLog {
  id: string
  user_id: string
  outfit_id: string | null
  worn_on: string
  note: string | null
  created_at: string
}
