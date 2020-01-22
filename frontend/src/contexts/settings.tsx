import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { ApiResponse, SettingsJson } from '/api/Schemas'
import { getLocalStorage, setLocalStorage } from '/utils'
import { API_BASE } from '/api'

type Action =
  | { type: 'SET_INFO'; payload: ApiResponse<SettingsJson> }
  | { type: 'SET_STYLESHEET'; payload: string }
type Dispatch = (action: Action) => void
type State = {
  stylesheet: string
  styles: { [k: string]: string } | null
  title: string
  canDownload: boolean
  canUpload: boolean
  streamUrl: string
}
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function siteSettingsReducer(state: State, action: Action) {
  switch (action.type) {
    case 'SET_INFO': {
      const { payload } = action
      return {
        ...state,
        stylesheet: state.stylesheet === '' ? payload.css : state.stylesheet,
        styles: payload.styles,
        title: payload.title,
        canDownload: payload.downloads_enabled,
        canUpload: payload.uploads_enabled,
        streamUrl: payload.icecast.url + payload.icecast.mount
      }
    }
    case 'SET_STYLESHEET': {
      return { ...state, stylesheet: action.payload }
    }
    default: {
      return state
    }
  }
}

function SiteSettingsProvider({ children }: ProviderProps) {
  const localStylesheet = getLocalStorage<string>('css', '')

  const [state, dispatch] = useReducer(siteSettingsReducer, {
    stylesheet: localStylesheet,
    styles: null,
    title: '',
    canDownload: false,
    canUpload: false,
    streamUrl: ''
  })

  // fetch settings on first use
  useEffect(() => {
    fetchSettings(dispatch)
  }, [])

  // set document title
  useEffect(() => {
    document.title = state.title
  }, [state.title])

  // set stylesheet
  useEffect(() => {
    const link = document.getElementById(
      'change_stylesheet'
    ) as HTMLLinkElement | null
    if (link) link.href = state.stylesheet
  }, [state.stylesheet])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

function useSiteSettingsState(): State {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error(
      'useSiteSettingsState must be used within a SiteSettingsProvider'
    )
  }
  return context
}

function useSiteSettingsDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error(
      'useSiteSettingsDispatch must be used within a SiteSettingsProvider'
    )
  }
  return context
}

function useSiteSettingsContext(): [State, Dispatch] {
  return [useSiteSettingsState(), useSiteSettingsDispatch()]
}

// Action creators
function fetchSettings(dispatch: Dispatch) {
  fetch(`${API_BASE}/settings`)
    .then(resp => resp.clone().json())
    .then((resp: ApiResponse<SettingsJson>) =>
      dispatch({ type: 'SET_INFO', payload: resp })
    )
}

function setStylesheet(dispatch: Dispatch, stylesheet: string) {
  setLocalStorage('css', stylesheet)
  dispatch({ type: 'SET_STYLESHEET', payload: stylesheet })
}

export {
  useSiteSettingsContext,
  SiteSettingsProvider,
  useSiteSettingsState,
  useSiteSettingsDispatch,
  setStylesheet
}
