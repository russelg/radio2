import { API_BASE } from '/api'
import {
  ApiResponse,
  NowPlayingJson,
  NowPlayingSong,
  SongItem
} from '/api/Schemas'
import { useAuthState } from '/contexts/auth'
import React, { createContext, useContext, useEffect, useReducer } from 'react'

export const SYNC_OFFSET = 4

type SongInfo = {
  length: number
  serverTime: number
  startTime: number
  endTime: number
  artist: string
  title: string
  id: string
  requested: boolean
}

type ServerInfo = {
  listeners: number
  totalSongs: number
  totalPlays: number
  totalSize: number
  queue: NowPlayingSong[]
  lastPlayed: NowPlayingSong[]
}

function transformNowPlaying(
  resp: ApiResponse<NowPlayingJson>
): {
  songInfo: SongInfo
  serverInfo: ServerInfo
} {
  return {
    songInfo: {
      length: resp.len,
      serverTime: resp.current,
      startTime: resp.start_time,
      endTime: resp.end_time,
      artist: resp.artist,
      title: resp.title,
      id: resp.id,
      requested: resp.requested
    },
    serverInfo: {
      listeners: resp.listeners,
      totalSongs: resp.total_songs,
      totalPlays: resp.total_plays,
      totalSize: resp.total_size,
      queue: resp.queue,
      lastPlayed: resp.lp
    }
  }
}

type Action =
  | { type: 'SET_INFO'; payload: ApiResponse<NowPlayingJson> }
  | { type: 'SET_FAVOURITED'; payload: boolean }
type Dispatch = (action: Action) => void
type State = {
  songInfo: SongInfo
  serverInfo: ServerInfo
  favourited: boolean
}
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function radioInfoReducer(state: State, action: Action) {
  switch (action.type) {
    case 'SET_INFO': {
      return { ...state, ...transformNowPlaying(action.payload) }
    }
    case 'SET_FAVOURITED': {
      return { ...state, favourited: action.payload }
    }
    default: {
      return state
    }
  }
}

function RadioInfoProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(radioInfoReducer, {
    songInfo: {
      length: 0,
      serverTime: 0,
      startTime: 0,
      endTime: 0,
      artist: '',
      title: '',
      id: '',
      requested: false
    },
    serverInfo: {
      listeners: 0,
      totalSongs: 0,
      totalPlays: 0,
      totalSize: 0,
      queue: [],
      lastPlayed: []
    },
    favourited: false
  })

  const { loggedIn } = useAuthState()

  // get song favourited state for use on homepage
  useEffect(() => {
    setFavourited(dispatch, false)
    if (loggedIn && state.songInfo.id) {
      fetch(`${API_BASE}/song/${state.songInfo.id}`)
        .then(resp => resp.clone().json())
        .then((resp: ApiResponse<SongItem>) =>
          setFavourited(dispatch, resp.meta.favourited || false)
        )
    }
  }, [state.songInfo.id, loggedIn])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

function useRadioInfoState(): State {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error('useRadioInfoState must be used within a RadioInfoProvider')
  }
  return context
}

function useRadioInfoDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error(
      'useRadioInfoDispatch must be used within a RadioInfoProvider'
    )
  }
  return context
}

function useRadioInfoContext(): [State, Dispatch] {
  return [useRadioInfoState(), useRadioInfoDispatch()]
}

// Action creators
async function fetchInfo(dispatch: Dispatch) {
  return fetch(`${API_BASE}/np`)
    .then(resp => resp.clone().json())
    .then((resp: ApiResponse<NowPlayingJson>) => {
      dispatch({ type: 'SET_INFO', payload: resp })
      return transformNowPlaying(resp)
    })
}

function setFavourited(dispatch: Dispatch, favourited: boolean) {
  dispatch({ type: 'SET_FAVOURITED', payload: favourited })
}

export {
  RadioInfoProvider,
  useRadioInfoContext,
  useRadioInfoState,
  useRadioInfoDispatch,
  fetchInfo,
  setFavourited
}
