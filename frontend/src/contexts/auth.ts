// @ts-ignore
import { authorize, clear, configure } from '@shoutem/fetch-token-intercept'
import createUseContext from 'constate'
import { useCallback, useEffect, useState } from 'react'
import { API_BASE } from '/api'
import { ApiBaseResponse, ApiResponse, LoginJson } from '/api/Schemas'
import { parseJwt, useLocalStorage } from '/utils'

// exclude login because multiple requests are made on incorrect details
// settings/np do not need auth headers, so skip those.
const ignoredUrls = ['/auth/login', '/settings', '/np']

type UserClaims = {
  roles: 'admin'[]
  username: string
}

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

  const fetchTokenInterceptConfig = {
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
    fetchRetryCount: 3,
    onAccessTokenChange: (accessToken: string) => {
      setAccessToken(accessToken)
    }
  }

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

  const setUserFromJwt = useCallback(token => {
    const jwt = parseJwt<UserClaims>(token)
    if (jwt) {
      const expired = jwt.exp > Date.now()
      if (!expired) {
        setUsername(jwt.user_claims.username)
        setIsAdmin(jwt.user_claims.roles.includes('admin'))
        setLoggedIn(true)
      }
      return expired
    }
    return false
  }, [])

  const loginUsingTokens = useCallback(() => {
    if (accessToken) {
      authorize(refreshToken, accessToken)
      const user = setUserFromJwt(accessToken)
    } else if (refreshToken) {
      fetch(fetchTokenInterceptConfig.createAccessTokenRequest(refreshToken))
        .then(resp => resp.clone().json())
        .then(setStateFromTokenResponse)
        .catch(logout)
    }
  }, [accessToken, refreshToken])

  // attempt login on first use
  useEffect(() => {
    configure(fetchTokenInterceptConfig)
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
