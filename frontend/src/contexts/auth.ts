// @ts-ignore
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'
import createUseContext from 'constate'
import { useCallback, useEffect, useState } from 'react'
import { ApiBaseResponse, ApiResponse, LoginJson, UserJson } from '/api/Schemas'
import { API_BASE } from '/store'
import { useLocalStorage, parseJwt } from '/utils'

const config = {
  parseAccessToken: async (response: Response) => {
    const json: ApiResponse<LoginJson> = await response.clone().json()
    return json.access_token
  },
  shouldIntercept: (request: Request) => {
    // exclude login requests from intercepting
    // without this, each login will occur 3 times if invalid...
    if (request.url.includes('/auth/login')) return false
    return true
  },
  shouldInvalidateAccessToken: () => false,
  shouldWaitForTokenRenewal: true,
  authorizeRequest: (request: Request, accessToken: string) => {
    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return request
  },
  createAccessTokenRequest: (refreshToken: string) => {
    return new Request(`${API_BASE}/auth/refresh`, {
      headers: { Authorization: `Bearer ${refreshToken}` },
      method: 'POST'
    })
  },
  fetchRetryCount: 3
}

configure(config)

function useAuth() {
  const [username, setUsername] = useState<string>('')
  const [loggedIn, setLoggedIn] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [accessToken, setAccessToken] = useLocalStorage<string | null>(
    'access_token',
    null
  )
  const [refreshToken, setRefreshToken] = useLocalStorage<string | null>(
    'refresh_token',
    null
  )
  const [showAdmin, setShowAdmin] = useLocalStorage<boolean>(
    'show_admin',
    false
  )

  const setStateFromTokenResponse = useCallback(
    (resp: ApiResponse<LoginJson>) => {
      if (resp.error === null) {
        setAccessToken(resp.access_token)
        setUsername(resp.username)
        setIsAdmin(resp.admin || false)
        setLoggedIn(true)
        authorize(refreshToken, resp.access_token)
      } else {
        console.log(resp)
        logout()
      }
    },
    [refreshToken]
  )

  const login = useCallback((username: string, password: string) => {
    const doLogin = async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const r: ApiResponse<LoginJson> = await response.clone().json()
      if ('access_token' in r && 'refresh_token' in r) {
        setRefreshToken(r.refresh_token)
        setStateFromTokenResponse(r)
      }
      return r
    }
    return doLogin()
  }, [])

  const register = useCallback((username: string, password: string) => {
    const doRegister = async () => {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const r: ApiBaseResponse = await resp.clone().json()
      const msg = r.description || r.message || ''
      if (r.status_code === 200 && r.error === null) {
        return msg.toString()
      }
      throw new Error(msg.toString())
    }
    return doRegister()
  }, [])

  const logout = useCallback(() => {
    clear()
    setUsername('')
    setLoggedIn(false)
    setIsAdmin(false)
    setAccessToken('')
    setRefreshToken('')
  }, [])

  const loginUsingTokens = useCallback(() => {
    if (accessToken) {
      const jwt = parseJwt(accessToken)
      if ('exp' in jwt && jwt.exp < Date.now()) {
        // access token has not expired yet, so get the user details
        fetch(`${API_BASE}/auth/user`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then(resp => resp.clone().json())
          .then((resp: ApiResponse<UserJson>) => {
            if (!resp.error) {
              setUsername(resp.username)
              setIsAdmin(resp.admin)
              setLoggedIn(true)
              authorize(refreshToken, accessToken)
            }
          })
        return
      }
    }

    if (refreshToken) {
      fetch(config.createAccessTokenRequest(refreshToken))
        .then(resp => resp.clone().json())
        .then(setStateFromTokenResponse)
        .catch(logout)
    }
  }, [accessToken, refreshToken])

  // attempt login on first use
  useEffect(() => {
    loginUsingTokens()
  }, [])

  return {
    username,
    loggedIn,
    isAdmin,
    accessToken,
    refreshToken,
    showAdmin,
    login,
    register,
    logout,
    setShowAdmin
  }
}

export const useAuthContext = createUseContext(useAuth)