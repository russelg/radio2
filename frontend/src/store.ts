// @ts-ignore
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'
import { store } from 'react-easy-state'
import {
  SettingsJson,
  NowPlayingJson,
  ApiResponse,
  LoginJson,
  ApiBaseResponse,
} from '/api/Schemas'

// if (!localStorage.getItem('volume')) {
//   localStorage.setItem('volume', '80')
// }

export const API_BASE: string = '/api/v1'

const config = {
  shouldIntercept: () => true,
  shouldInvalidateAccessToken: () => false,
  shouldWaitForTokenRenewal: true,
  authorizeRequest: (request: Request, accessToken: string) => {
    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  },
  createAccessTokenRequest: (refreshToken: string) =>
    new Request(`${API_BASE}/auth/refresh`, {
      headers: { Authorization: `Bearer ${refreshToken}` },
      method: 'POST',
    }),
  parseAccessToken: async (response: Response) => {
    const json = await response.clone().json()
    auth.username = json.username
    auth.access_token = json.access_token
    auth.logged_in = true
    auth.admin = json.admin || false
    return json.access_token
  },
  fetchRetryCount: 3,
}

export const auth = store({
  username: '',
  logged_in: false,
  admin: false,

  get access_token(): string {
    return localStorage.getItem('access_token') || ''
  },

  set access_token(token: string) {
    localStorage.setItem('access_token', token)
  },

  get refresh_token(): string {
    return localStorage.getItem('refresh_token') || ''
  },

  set refresh_token(token: string) {
    localStorage.setItem('refresh_token', token)
  },

  async login(
    username: string,
    password: string
  ): Promise<ApiResponse<LoginJson>> {
    const response: Response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })

    const r: ApiResponse<LoginJson> = await response.clone().json()
    if ('access_token' in r && 'refresh_token' in r) {
      this.refresh_token = r.refresh_token
      config.parseAccessToken(response)
      authorize(this.refresh_token, this.access_token)
    }

    return r
  },

  async register(username: string, password: string): Promise<string> {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })

    const r: ApiBaseResponse = await resp.clone().json()
    if (r.status_code === 200 && r.error === null) {
      return r.description.toString()
    }

    throw new Error(r.description.toString())
  },

  logout(): void {
    clear()
    this.username = ''
    this.logged_in = false
    this.admin = false
    this.access_token = ''
    this.refresh_token = ''
  },
})

configure(config)
if (auth.refresh_token) authorize(auth.refresh_token)

export interface SettingsStore extends SettingsJson {
  updateSettings: (settings: SettingsJson) => void
  stream_url: string
}

export const settings: SettingsStore = store({
  css: '',
  styles: {} as { [k: string]: string },
  icecast: {
    mount: '',
    url: '',
  },
  title: '',
  downloads_enabled: false,
  uploads_enabled: false,

  updateSettings(settings: SettingsJson): void {
    Object.assign(this, settings)
  },

  get stream_url(): string {
    return this.icecast.url + this.icecast.mount
  },
} as SettingsStore)

export interface RadioStore {
  counter: number
  sync_seconds: number
  update_progress: number
  update_progress_inc: number
  update_old_progress: number
  current_pos: number
  current_len: number
  afk: string
  current_title: string
  current_artist: string
  cur_time: number
  duration: number
  position: number
}

export interface PlayingStore {
  info: NowPlayingJson
  radio: RadioStore
  volume: number
  sync_offset: number
  loaded: boolean
  playing: boolean
  progress: number
  update: (info: NowPlayingJson) => void
  progressParse: () => void
  radioUpdate: (start: number, end: number, cur: number) => void
  applyProgress: () => void
  periodicUpdate: (func: () => void) => void
  togglePlaying: () => void
}

export const playingState: PlayingStore = store({
  info: {
    len: 0,
    current: 0,
    start_time: 0,
    end_time: 0,
    artist: '',
    title: '',
    id: '',
    requested: false,
    total_songs: 0,
    total_plays: 0,
    queue: [],
    lp: [],
    total_size: 0,
    listeners: 0,
  },

  radio: {
    counter: 0.0,
    sync_seconds: 0,
    update_progress: 0.0,
    update_progress_inc: 0.0,
    update_old_progress: 0.0,
    current_pos: 0,
    current_len: 0,
    afk: 'init',
    current_title: '',
    current_artist: '',
    cur_time: 0,
    duration: 0,
    position: 0,
  },

  get volume(): number {
    const vol = localStorage.getItem('volume')
    if (vol) {
      return parseInt(vol || '80', 10)
    }
    return 80
  },

  set volume(vol: number) {
    localStorage.setItem('volume', `${vol}`)
  },

  sync_offset: 4,
  loaded: false,
  playing: false,

  update(info: NowPlayingJson): void {
    Object.assign(this.info, info)
  },

  progressParse(): void {
    const { info, sync_offset } = this
    this.radioUpdate(
      info.start_time + sync_offset,
      info.end_time + sync_offset,
      info.current
    )
  },

  radioUpdate(start: number, end: number, cur: number): void {
    const { radio } = this

    let localEnd = end
    let localStart = start

    if (localEnd !== 0) {
      radio.cur_time = Math.round(new Date().getTime() / 1000.0)
      radio.sync_seconds = radio.cur_time - cur
      localEnd += radio.sync_seconds
      localStart += radio.sync_seconds
      radio.duration = localEnd - localStart
      radio.position = radio.cur_time - localStart
      radio.update_progress = (100 / radio.duration) * radio.position
      radio.update_progress_inc = (100 / radio.duration) * 0.5
      radio.current_pos = radio.position
      radio.current_len = radio.duration
    } else {
      radio.update_progress = 0
    }
  },

  get progress(): number {
    const { radio } = this
    return radio.update_progress + radio.update_progress_inc
  },

  applyProgress(): void {
    const { radio } = this

    if (radio.update_progress > 0) {
      radio.update_progress = radio.update_progress + radio.update_progress_inc
    } else {
      radio.update_progress = 0
    }
  },

  periodicUpdate(func: () => void): void {
    const { info, radio, playing } = this

    if (playing) {
      document.title = `▶ ${info.title} - ${info.artist} | ${settings.title}`
    } else {
      document.title = settings.title
    }

    this.applyProgress()
    radio.counter = radio.counter + 0.5
    radio.current_pos = radio.current_pos + 0.5

    if (radio.counter >= 3.5 || radio.current_pos >= radio.current_len) {
      radio.counter = 0.0
      func()
    }
  },

  togglePlaying(): void {
    this.playing = !this.playing
  },
} as PlayingStore)
