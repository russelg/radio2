export type Description = string | string[] | { [k: string]: string[] }

export interface ApiBaseResponse {
  status_code: number
  error: string | null
  description?: Description
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

export interface SongRequestJson {
  meta: SongMeta
}

export interface AutocompleteItemJson {
  result: string
  type: string
}

export interface AutocompleteJson {
  query: string
  suggestions: AutocompleteItemJson[]
}

export interface SettingsJson {
  css: string
  styles: {
    [k: string]: string
  }
  icecast: {
    mount: string
    url: string
  }
  title: string
  downloads_enabled: boolean
  uploads_enabled: boolean
}

export interface NowPlayingSong extends Song {
  time: string
  timestamp: number
  requested: boolean
}

export interface NowPlayingJson extends Song {
  len: number
  current: number
  start_time: number
  end_time: number
  requested: boolean
  queue: NowPlayingSong[]
  lp: NowPlayingSong[]
  listeners: number
  total_songs: number
  total_plays: number
  total_size: number
}

export interface UserJson {
  username: string
  admin: boolean
}

export interface LoginJson extends UserJson {
  access_token: string
  refresh_token: string
}
