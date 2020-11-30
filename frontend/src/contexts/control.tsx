import { getLocalStorage } from '/utils'
import React, { createContext, useContext, useReducer } from 'react'

type Action =
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TOGGLE_PLAYING' }
type Dispatch = (action: Action) => void
type State = {
  playing: boolean
  volume: number
}
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function controlReducer(state: State, action: Action) {
  switch (action.type) {
    case 'SET_VOLUME': {
      return { ...state, volume: action.payload }
    }
    case 'TOGGLE_PLAYING': {
      const playing = !state.playing
      return {
        ...state,
        playing,
        shouldFetchNowPlaying: playing,
      }
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
    throw new Error('useControlState must be used within a ControlProvider')
  }
  return context
}

function useControlDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error('useControlDispatch must be used within a ControlProvider')
  }
  return context
}

function useControlContext(): [State, Dispatch] {
  return [useControlState(), useControlDispatch()]
}

// Action creators
function setVolume(dispatch: Dispatch, volume: number) {
  dispatch({ type: 'SET_VOLUME', payload: volume })
}

function togglePlaying(dispatch: Dispatch) {
  dispatch({ type: 'TOGGLE_PLAYING' })
}

export {
  useControlContext,
  ControlProvider,
  useControlState,
  useControlDispatch,
  setVolume,
  togglePlaying,
}
