// @ts-ignore
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import { API_BASE } from '/api'
import { ApiResponse, LoginJson } from '/api/Schemas'
import {
  getLocalStorage,
  JWTWithClaims,
  parseJwt,
  setLocalStorage
} from '/utils'

// exclude login because multiple requests are made on incorrect details
// settings/np do not need auth headers, so skip those.
const ignoredUrls = ['/auth/login', '/settings', '/np']

type UserClaims = {
  roles: Array<'admin'>
  username: string
}

type Action =
  | { type: 'LOGIN'; payload: ApiResponse<LoginJson> }
  | { type: 'LOGIN_FROM_JWT'; payload: JWTWithClaims<UserClaims> }
  | { type: 'LOGOUT' }
  | { type: 'SET_ACCESS_TOKEN'; payload: string }
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
  switch (action.type) {
    case 'LOGIN': {
      const resp = action.payload
      const refreshToken =
        'refresh_token' in resp ? { refreshToken: resp.refresh_token } : {}
      const outState = {
        ...state,
        ...refreshToken,
        accessToken: resp.access_token,
        username: resp.username,
        admin: resp.admin || false,
        loggedIn: true
      }
      return outState
    }
    case 'LOGIN_FROM_JWT': {
      const jwt = action.payload
      if (jwt) {
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
      return { ...state, accessToken: action.payload }
    }
    default: {
      return state
    }
  }
}

function autoLogin(
  dispatch: Dispatch,
  state: State,
  createAccessTokenRequest: (refreshToken: string) => Request
) {
  // login automatically based on tokens if available
  if (state.accessToken) {
    authorize(state.refreshToken, state.accessToken)
    const jwt = parseJwt<UserClaims>(state.accessToken)
    if (jwt) {
      const expired = jwt.exp > Date.now()
      if (!expired) {
        dispatch({ type: 'LOGIN_FROM_JWT', payload: jwt })
      }
    }
  } else if (state.refreshToken) {
    // access token was not available, but refresh is...
    // ... so get a new access token using that :)
    fetch(createAccessTokenRequest(state.refreshToken))
      .then(resp => resp.clone().json())
      .then((resp: ApiResponse<LoginJson>) =>
        dispatch({ type: 'LOGIN', payload: resp })
      )
      .catch(() => logout(dispatch))
  }
}

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

  const tokenInterceptConfig = {
    parseAccessToken: async (response: Response) => {
      const json: ApiResponse<LoginJson> = await response.clone().json()
      return json.access_token
    },
    shouldIntercept: (request: Request) => {
      if (ignoredUrls.some(url => request.url.includes(url))) return false
      return true
    },
    shouldInvalidateAccessToken: () => false,
    shouldWaitForTokenRenewal: true,
    authorizeRequest: (request: Request, inAccessToken: string) => {
      request.headers.set('Authorization', `Bearer ${inAccessToken}`)
      return request
    },
    createAccessTokenRequest: (inRefreshToken: string) => {
      return new Request(`${API_BASE}/auth/refresh`, {
        headers: { Authorization: `Bearer ${inRefreshToken}` },
        method: 'POST'
      })
    },
    fetchRetryCount: 3,
    onAccessTokenChange: (inAccessToken: string) => {
      setLocalStorage('access_token', inAccessToken)
      dispatch({ type: 'SET_ACCESS_TOKEN', payload: inAccessToken })
    }
  }

  // login to site using existing tokens
  useEffect(() => {
    configure(tokenInterceptConfig)
    autoLogin(dispatch, state, tokenInterceptConfig.createAccessTokenRequest)
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
  clear()
  setLocalStorage('access_token', '')
  setLocalStorage('refresh_token', '')
  dispatch({ type: 'LOGOUT' })
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
    .then((resp: ApiResponse<LoginJson>) => {
      if ('access_token' in resp && 'refresh_token' in resp) {
        if (resp.error === null) {
          dispatch({ type: 'LOGIN', payload: resp })
          setLocalStorage('access_token', resp.access_token)
          setLocalStorage('refresh_token', resp.refresh_token)
          authorize(resp.refresh_token, resp.access_token)
        } else {
          console.log(resp)
          logout(dispatch)
        }
      }
      return resp
    })
}

async function register(username: string, password: string): Promise<string> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' }
  }).then(resp => resp.clone().json())
  const msg = resp.description || resp.message || ''
  if (resp.status_code === 200 && resp.error === null) {
    return msg.toString()
  }
  throw new Error(msg.toString())
}

export {
  AuthProvider,
  useAuthContext,
  useAuthState,
  useAuthDispatch,
  login,
  logout,
  register,
  autoLogin
}