import React, { createContext, useContext, useReducer } from 'react'
import { getLocalStorage } from '/utils'

type Action =
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'TOGGLE_PLAYING' }
  | { type: 'SET_SHOULD_FETCH_NOW_PLAYING'; value: boolean }
type Dispatch = (action: Action) => void
type State = {
  playing: boolean
  volume: number
  shouldFetchNowPlaying: boolean
}
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function controlReducer(state: State, action: Action) {
  switch (action.type) {
    case 'SET_VOLUME': {
      return { ...state, volume: action.value }
    }
    case 'TOGGLE_PLAYING': {
      const playing = !state.playing
      return {
        ...state,
        playing,
        shouldFetchNowPlaying: playing
      }
    }
    case 'SET_SHOULD_FETCH_NOW_PLAYING': {
      return { ...state, shouldFetchNowPlaying: action.value }
    }
    default: {
      return state
    }
  }
}

function ControlProvider({ children }: ProviderProps) {
  const localVolume = getLocalStorage<number>('volume', 80)

  const [state, dispatch] = useReducer(controlReducer, {
    playing: false,
    volume: localVolume,
    shouldFetchNowPlaying: true
  })

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

function useControlState(): State {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error('useCountState must be used within a CountProvider')
  }
  return context
}

function useControlDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error('useCountDispatch must be used within a CountProvider')
  }
  return context
}

function useControlContext(): [State, Dispatch] {
  return [useControlState(), useControlDispatch()]
}

// Action creators
function setVolume(dispatch: Dispatch, volume: number) {
  dispatch({ type: 'SET_VOLUME', value: volume })
}

function togglePlaying(dispatch: Dispatch) {
  dispatch({ type: 'TOGGLE_PLAYING' })
}

function setShouldFetchInfo(dispatch: Dispatch, value: boolean) {
  dispatch({ type: 'SET_SHOULD_FETCH_NOW_PLAYING', value })
}

export {
  useControlContext,
  ControlProvider,
  useControlState,
  useControlDispatch,
  setVolume,
  togglePlaying,
  setShouldFetchInfo
}
