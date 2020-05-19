import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef
} from 'react'
import { useControlState } from '/contexts/control'
import { fetchInfo, useRadioInfoDispatch } from '/contexts/radio'
import { useInterval } from '/utils'

export const SYNC_OFFSET = 0

type RadioStatus = {
  progress: number
  counter: number
  position: number
  syncSeconds: number
  progressIncrement: number
  duration: number
}

type UpdatePayload = {
  start: number
  end: number
  serverTime: number
  clientTime: number
}

type Action =
  | { type: 'UPDATE'; payload: UpdatePayload }
  | { type: 'UPDATE_COUNTER' }
type Dispatch = (action: Action) => void
type State = RadioStatus
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function radioStatusReducer(state: State, action: Action) {
  switch (action.type) {
    case 'UPDATE': {
      const { serverTime, clientTime, start, end } = action.payload
      if (end !== 0) {
        const syncSeconds = serverTime - clientTime
        const localStart = start + syncSeconds
        const localEnd = end + syncSeconds
        const duration = localEnd - localStart
        const position = clientTime - localStart
        const progress = (100 / duration) * position
        const progressIncrement = (100 / duration) * 0.5
        return {
          ...state,
          syncSeconds,
          duration,
          position,
          progress,
          progressIncrement,
          counter: 0
        }
      }
      return { ...state, progress: 0, counter: 0 }
    }
    case 'UPDATE_COUNTER': {
      let progress = 0
      if (state.progress > 0) {
        progress = state.progress + state.progressIncrement
      }
      let counter = state.counter + 0.5
      let position = state.position
      // only increment if duration is set (i.e. there is a song)
      if (state.duration) {
        position += 0.5
      }
      // reset counter as song changes
      return { ...state, progress, counter, position }
    }
    default: {
      return state
    }
  }
}

function RadioStatusProvider({ children }: ProviderProps) {
  const isFirstRun = useRef(true)

  const [state, dispatch] = useReducer(radioStatusReducer, {
    counter: 0.0,
    syncSeconds: 0,
    progress: 0.0,
    progressIncrement: 0.0,
    position: 0,
    duration: 0
  })

  const radioInfoDispatch = useRadioInfoDispatch()

  const controlState = useControlState()

  useInterval(
    () => {
      // once counter hits 8 (i.e. 8 seconds) or song has finished
      // then fetch current song info from server
      if (
        isFirstRun.current ||
        // only request info if radio is playing, or we are on the homepage
        ((controlState.playing || window.location.pathname === '/') &&
          (state.counter >= 8.0 ||
            // next song should have started by now, so refresh
            state.position > state.duration))
      ) {
        fetchInfo(radioInfoDispatch).then(info => {
          const { songInfo } = info
          dispatch({
            type: 'UPDATE',
            payload: {
              start: songInfo.startTime + SYNC_OFFSET,
              // set end to 0 to reset the counter
              // this is done to make sure the counter still progresses
              // even if there are no songs.
              end:
                songInfo.startTime !== songInfo.endTime
                  ? songInfo.endTime + SYNC_OFFSET
                  : 0,
              serverTime: songInfo.serverTime,
              clientTime: Math.round(new Date().getTime() / 1000.0)
            }
          })
        })
      }
      dispatch({ type: 'UPDATE_COUNTER' })
      if (isFirstRun.current) {
        isFirstRun.current = false
      }
    },
    500,
    false
  ) // update progress every 500ms (counter +0.5 per run)

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

function useRadioStatusState(): State {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error(
      'useRadioStatusState must be used within a RadioStatusProvider'
    )
  }
  return context
}

function useRadioStatusDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error(
      'useRadioStatusDispatch must be used within a RadioStatusProvider'
    )
  }
  return context
}

function useRadioStatusContext(): [State, Dispatch] {
  return [useRadioStatusState(), useRadioStatusDispatch()]
}

export {
  RadioStatusProvider,
  useRadioStatusContext,
  useRadioStatusState,
  useRadioStatusDispatch
}
