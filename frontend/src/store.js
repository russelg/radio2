import { store } from 'react-easy-state'
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'

if (!localStorage.getItem('volume')) {
  localStorage.setItem('volume', '80')
}

export const API_BASE = '/api/v1'

let config = {
  shouldIntercept: request => true,
  shouldInvalidateAccessToken: request => false,
  shouldWaitForTokenRenewal: true,
  authorizeRequest: (request, accessToken) => {
    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  },
  createAccessTokenRequest: refreshToken =>
    new Request(`${API_BASE}/auth/refresh`, {
      headers: { Authorization: `Bearer ${refreshToken}` },
      method: 'POST',
    }),
  parseAccessToken: response => {
    return response
      .clone()
      .json()
      .then(json => {
        auth.username = json.username
        auth.access_token = json.access_token
        auth.logged_in = true
        auth.admin = json.admin || false

        return json.access_token
      })
  },
}

export const auth = store({
  username: '',
  logged_in: false,
  admin: false,

  get access_token() {
    return localStorage.getItem('access_token') || ''
  },

  set access_token(token) {
    localStorage.setItem('access_token', token)
  },

  get refresh_token() {
    return localStorage.getItem('refresh_token') || ''
  },

  set refresh_token(token) {
    localStorage.setItem('refresh_token', token)
  },

  async login(username, password) {
    await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })
      .then(response => {
        response
          .clone()
          .json()
          .then(r => {
            if ('access_token' in r && 'refresh_token' in r) {
              this.refresh_token = r.refresh_token
              config.parseAccessToken(response)

              authorize(this.refresh_token, this.access_token)
            }
          })
      })
      .catch(error => {
        throw error
      })
  },

  async register(username, password) {
    let resp = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    })

    let r = await resp.clone().json()
    if (r.status_code === 200 && r.error === null) {
      return r.description
    }

    throw new Error(r.description)
  },

  logout() {
    this.username = ''
    this.logged_in = false
    this.admin = false
    clear()
    this.access_token = ''
    this.refresh_token = ''
  },
})

configure(config)
if (auth.refresh_token) authorize(auth.refresh_token)

export const settings = store({
  css: '',
  styles: {},
  icecast: {
    mount: '',
    url: '',
  },
  title: '',
  downloads_enabled: false,
  uploads_enabled: false,

  updateSettings(settings) {
    Object.assign(this, settings)
  },

  get stream_url() {
    let noproto = this.icecast.url
    return noproto + this.icecast.mount
  },
})

export const playingState = store({
  info: {
    len: 0,
    current: 0,
    start_time: 0,
    end_time: 0,
    artist: '',
    title: '',
    id: 0,
    requested: 0,
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
  },

  get volume() {
    if (localStorage.getItem('volume')) {
      return parseInt(localStorage.getItem('volume'), 10)
    }
    return 80
  },

  set volume(vol) {
    localStorage.setItem('volume', vol)
  },

  sync_offset: 4,
  loaded: false,
  playing: false,

  update(info) {
    Object.assign(this.info, info)
  },

  progressParse() {
    this.radioUpdate(
      this.info.start_time + this.sync_offset,
      this.info.end_time + this.sync_offset,
      this.info.current
    )
  },

  radioUpdate(start, end, cur) {
    let { radio } = this

    if (end !== 0) {
      radio.cur_time = Math.round(new Date().getTime() / 1000.0)
      radio.sync_seconds = radio.cur_time - cur
      end += radio.sync_seconds
      start += radio.sync_seconds
      radio.temp_update_progress = 0
      radio.duration = end - start
      radio.position = radio.cur_time - start
      radio.update_progress = (100 / radio.duration) * radio.position
      radio.update_progress_inc = (100 / radio.duration) * 0.5
      radio.current_pos = radio.position
      radio.current_len = radio.duration
    } else {
      radio.update_progress = 0
    }
  },

  get progress() {
    let { radio } = this
    return radio.update_progress + radio.update_progress_inc
  },

  applyProgress() {
    let { radio } = this

    if (radio.update_progress > 0) {
      radio.update_progress = radio.update_progress + radio.update_progress_inc
    } else {
      radio.update_progress = 100
    }
  },

  periodicUpdate(func) {
    let { info, radio } = this

    if (this.playing) {
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

  togglePlaying() {
    this.playing = !this.playing
  },
})
