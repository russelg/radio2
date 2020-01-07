// @ts-ignore
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'
import { store } from 'react-easy-state'
import {
  SettingsJson,
  NowPlayingJson,
  ApiResponse,
  LoginJson,
  ApiBaseResponse
} from '/api/Schemas'

export const API_BASE: string = '/api/v1'

export interface RadioStore {
  counter: number
  sync_seconds: number
  update_progress: number
  update_progress_inc: number
  update_old_progress: number
  current_pos: number
  current_len: number
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
    listeners: 0
  },

  radio: {
    counter: 0.0,
    sync_seconds: 0,
    update_progress: 0.0,
    update_progress_inc: 0.0,
    update_old_progress: 0.0,
    current_pos: 0,
    current_len: 0,
    current_title: '',
    current_artist: '',
    cur_time: 0,
    duration: 0,
    position: 0
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
    Object.assign(playingState.info, info)
  },

  progressParse(): void {
    const { info, sync_offset } = playingState
    playingState.radioUpdate(
      info.start_time + sync_offset,
      info.end_time + sync_offset,
      info.current
    )
  },

  radioUpdate(start: number, end: number, cur: number): void {
    const { radio } = playingState

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
    const { radio } = playingState
    return radio.update_progress + radio.update_progress_inc
  },

  applyProgress(): void {
    const { radio } = playingState

    if (radio.update_progress > 0) {
      radio.update_progress = radio.update_progress + radio.update_progress_inc
    } else {
      radio.update_progress = 0
    }
  },

  periodicUpdate(func: () => void): void {
    const { info, radio } = playingState
    playingState.applyProgress()
    // only progress if song exists
    if (playingState.info.id !== '') {
      radio.counter = radio.counter + 0.5
      radio.current_pos = radio.current_pos + 0.5
    }

    if (radio.counter >= 5 || radio.current_pos > radio.current_len) {
      radio.counter = 0.0
      func()
    }
  },

  togglePlaying(): void {
    playingState.playing = !playingState.playing
  }
} as PlayingStore)
