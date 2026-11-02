export type Category = '上衣' | '裤子' | '外套' | '裙装' | '鞋靴' | '配饰' | '其他'
export type Season = '春' | '夏' | '秋' | '冬' | '四季'

export interface Clothing {
  id: string
  user_id: string
  name: string
  category: Category
  season: Season
  color: string | null
  brand: string | null
  price: number | string | null
  purchased_at: string | null
  tags: string[]
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
