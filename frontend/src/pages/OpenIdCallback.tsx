import { API_BASE } from '/api'
import { ApiResponse, LoginJson } from '/api/Schemas'
import Dialog from '/components/Dialog'
import LoaderSpinner from '/components/LoaderSpinner'
import { handleLoginResponse, useAuthContext } from '/contexts/auth'
import { setLocalStorage } from '/utils'
import { stringify } from 'query-string'
import React, { FunctionComponent, useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'
import { StringParam, useQueryParams } from 'use-query-params'

export interface LinkingJson {
  link: boolean
  token: string
}

async function openIdCallback(
  dispatch: any,
  params: {
    code?: string | null
    scope?: string | null
    state?: string | null
  }
): Promise<ApiResponse<LoginJson | LinkingJson>> {
  return fetch(`${API_BASE}/openid/callback?${stringify(params)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then(handleLoginResponse(dispatch))
}

const OpenIdCallback: FunctionComponent = () => {
  const [{ loggedIn }, dispatch] = useAuthContext()
  if (loggedIn) return <Redirect to="/" />

  const [queryParam, setQueryParam] = useQueryParams({
    code: StringParam,
    scope: StringParam,
    state: StringParam
  })

  const [error, setError] = useState({ state: false, message: '' })

  const [linking, setLinking] = useState(false)

  const hasParams = () =>
    queryParam.code && queryParam.scope && queryParam.state

  useEffect(() => {
    if (hasParams()) {
      openIdCallback(dispatch, queryParam)
        .then(resp => {
          window.location.href = '/'
        })
        .catch(resp => {
          if (resp.link && resp.token) {
            setLinking(true)
            setLocalStorage('linking_token', resp.token)
          }
          const msg = 'description' in resp ? resp.description : resp.message
          if (msg) {
            setError({ state: true, message: msg })
          }
        })
    }
  }, [queryParam])

  return (
    <Dialog title="OpenID Login">
      {linking ? (
        <Redirect to="/openid/link" />
      ) : error.state ? (
        <div>
          <h2 className="p-2 text-center text-danger">Error</h2>
          <p className="text-center">{error.message}</p>
        </div>
      ) : (
        <LoaderSpinner />
      )}
    </Dialog>
  )
}

export default OpenIdCallback
