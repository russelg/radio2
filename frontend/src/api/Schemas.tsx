export interface ApiBaseResponse {
  status_code: number
  error: string | null
  description: string | string[] | { [k: string]: string[] }
  message?: string
  _links?: {
    _self?: string
    _next?: string | null
    _prev?: string | null
  }
}

export type ApiResponse<T> = ApiBaseResponse & T

export interface Song {
  artist: string
  title: string
  id: string
}

export interface SongListItem extends Song {
  time: string
  timestamp: number
  requested: boolean
}

export interface SongMeta {
  requestable: boolean
  humanized_lastplayed: string
  reason: string | null
  favourited?: boolean
}

export interface SongItem extends Song {
  length: number
  lastplayed: string
  playcount: number
  added: string
  meta: SongMeta
  size: number
}

export interface SongsJson {
  query: string | null
  pagination: {
    page: number
    per_page: number
    total_count: number
    pages: number
    has_prev: boolean
    has_next: boolean
  }
  songs: SongItem[]
}

export interface SongDownloadJson {
  id: string
  download_token: string
}

export interface AutocompleteItemJson {
  result: string
  type: string
}

export interface AutocompleteJson {
  query: string
  suggestions: AutocompleteItemJson[]
}
