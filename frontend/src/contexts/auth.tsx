import { API_BASE, createAccessTokenRequest } from '/api'
import { ApiResponse, LoginJson } from '/api/Schemas'
import {
  getLocalStorage,
  JWT,
  JWTClaims,
  parseJwt,
  setLocalStorage
} from '/utils'
import fetchIntercept from 'fetch-intercept'
// @ts-ignore
import React, { createContext, useContext, useEffect, useReducer } from 'react'

// exclude login because multiple requests are made on incorrect details
// settings/np do not need auth headers, so skip those.
const ignoredUrls = [
  '/auth/login',
  '/settings',
  '/np',
  '/openid/link',
  '/openid/login',
  '/auth/refresh'
]

type UserClaims = {
  roles: 'admin'[]
  username: string
}

type Action =
  | { type: 'LOGIN'; payload: ApiResponse<LoginJson> }
  | { type: 'LOGIN_FROM_JWT'; payload: JWT<JWTClaims<UserClaims>> }
  | { type: 'LOGOUT' }
  | { type: 'SET_ACCESS_TOKEN'; payload: string }
  | { type: 'SET_REFRESH_TOKEN'; payload: string }
type Dispatch = (action: Action) => void
type State = {
  username: string
  loggedIn: boolean
  admin: boolean
  accessToken: string | null
  refreshToken: string | null
}
type ProviderProps = { children: React.ReactNode }

const StateContext = createContext<State | undefined>(undefined)
const DispatchContext = createContext<Dispatch | undefined>(undefined)

function authReducer(state: State, action: Action) {
  console.log(action, { state })
  switch (action.type) {
    case 'LOGIN': {
      const resp = action.payload
      const refreshToken =
        'refresh_token' in resp ? { refreshToken: resp.refresh_token } : {}
      const s = {
        ...state,
        ...refreshToken,
        accessToken: resp.access_token,
        username: resp.username,
        admin: resp.admin || false,
        loggedIn: true
      }
      setLocalStorage('access_token', s.accessToken)
      setLocalStorage('refresh_token', s.refreshToken)
      return s
    }
    case 'LOGIN_FROM_JWT': {
      const jwt = action.payload
      if ('user_claims' in jwt) {
        return {
          ...state,
          username: jwt.user_claims.username,
          admin: jwt.user_claims.roles.includes('admin'),
          loggedIn: true
        }
      }
      return { ...state }
    }
    case 'LOGOUT': {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return {
        ...state,
        username: '',
        loggedIn: false,
        admin: false,
        accessToken: null,
        refreshToken: null
      }
    }
    case 'SET_ACCESS_TOKEN': {
      setLocalStorage('access_token', action.payload)
      return { ...state, accessToken: action.payload }
    }
    case 'SET_REFRESH_TOKEN': {
      setLocalStorage('refresh_token', action.payload)
      return { ...state, refreshToken: action.payload }
    }
    default: {
      return state
    }
  }
}

function fetchRefresh(dispatch: Dispatch, state: State) {
  // @ts-ignore
  return (window.originalFetch || fetch)(
    createAccessTokenRequest(state.refreshToken!)
  )
    .then((resp: any) => resp.clone().json())
    .then((resp: ApiResponse<LoginJson>) => {
      if (resp.status_code === 401) {
        // refresh token request failed, let's give up and logout.
        const msg = resp.description || ''
        throw new Error(msg.toString())
      }
      dispatch({ type: 'LOGIN', payload: resp })
      // authorize(state.refreshToken, state.accessToken)
      return resp
    })
    .catch(() => logout(dispatch))
}

function getJwt(accessToken: string) {
  if (!accessToken) return null
  const jwt = parseJwt<JWTClaims<UserClaims>>(accessToken)
  if (jwt) {
    let now = Date.now() / 1000
    const expired = jwt.exp < now
    if (!expired) {
      return jwt
    }
  }
  return null
}

function autoLogin(dispatch: Dispatch, state: State, refresh = true) {
  // login automatically based on tokens if available
  if (state.accessToken) {
    // authorize(state.refreshToken, state.accessToken)
    const jwt = getJwt(state.accessToken)
    if (jwt) {
      dispatch({ type: 'LOGIN_FROM_JWT', payload: jwt })
    }
  }
  // refresh token regardless.
  if (state.refreshToken && refresh) {
    // clear()
    fetchRefresh(dispatch, state)
  }
}

// @ts-ignore
window.originalFetch = window.fetch

function AuthProvider({ children }: ProviderProps) {
  const accessToken = getLocalStorage<string | null>('access_token', null)
  const refreshToken = getLocalStorage<string | null>('refresh_token', null)

  const [state, dispatch] = useReducer(authReducer, {
    accessToken,
    refreshToken,
    username: '',
    loggedIn: false,
    admin: false
  })

  // listen to localStorage changes from other windows
  window.addEventListener('storage', e => {
    console.log(`Key Changed: ${e.key}`)
    console.log(`New Value: ${e.newValue}`)
    if (e.key && e.newValue !== null) {
      localStorage.setItem(e.key, e.newValue)
      const val = getLocalStorage<string>(e.key, '')
      if (e.key === 'access_token')
        dispatch({ type: 'SET_ACCESS_TOKEN', payload: val })
      if (e.key === 'refresh_token')
        dispatch({ type: 'SET_REFRESH_TOKEN', payload: val })
      autoLogin(dispatch, state)
    }
  })

  // login to site using existing tokens
  useEffect(() => {
    const unregister = fetchIntercept.register({
      request: async (url, config = {}) => {
        let accessToken = getLocalStorage<string | null>('access_token', null)

        const plainUrl = ((u: string | Request) =>
          // check if url is a string
          (Object.prototype.toString.call(u) === '[object String]'
            ? u
            : // url is a Request object, get its url
              (u as Request).url
          ).toString())(url)
        const shouldIgnore = ignoredUrls.some(u => plainUrl.includes(u))

        if (accessToken && !shouldIgnore) {
          const jwt = getJwt(accessToken)
          if (!jwt) {
            // refresh if access token expired or otherwise invalid
            await fetchRefresh(dispatch, state)
          }

          accessToken = getLocalStorage<string | null>('access_token', null)
          config.headers = {
            Authorization: `Bearer ${accessToken}`,
            ...(config.headers || {})
          }
        }

        return [url, config]
      },
      response: response => response,
      requestError: error => Promise.reject(error),
      responseError: error => Promise.reject(error)
    })

    autoLogin(dispatch, state, true)

    return unregister
  }, [])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

function useAuthState(): State {
  const context = useContext(StateContext)
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }
  return context
}

function useAuthDispatch(): Dispatch {
  const context = useContext(DispatchContext)
  if (context === undefined) {
    throw new Error('useAuthDispatch must be used within an AuthProvider')
  }
  return context
}

function useAuthContext(): [State, Dispatch] {
  return [useAuthState(), useAuthDispatch()]
}

// Action creators
function logout(dispatch: Dispatch) {
  dispatch({ type: 'LOGOUT' })
}

function handleLoginResponse(
  dispatch: Dispatch
): (resp: ApiResponse<LoginJson>) => ApiResponse<LoginJson> {
  return (resp: ApiResponse<LoginJson>) => {
    if ('access_token' in resp && 'refresh_token' in resp) {
      if (resp.error === null) {
        dispatch({ type: 'LOGIN', payload: resp })
        return resp
      } else {
        logout(dispatch)
        throw resp
      }
    }
    throw resp
  }
}

async function login(
  dispatch: Dispatch,
  username: string,
  password: string
): Promise<ApiResponse<LoginJson>> {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then(handleLoginResponse(dispatch))
}

async function register(username: string, password: string): Promise<string> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' }
  }).then(resp => resp.clone().json())
  if (resp.status_code === 200 && resp.error === null) {
    return resp.description
  }
  throw resp.description
}

export {
  AuthProvider,
  useAuthContext,
  useAuthState,
  useAuthDispatch,
  login,
  logout,
  register,
  autoLogin,
  handleLoginResponse
}
