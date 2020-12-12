import { API_BASE } from '/api'
import {
  ApiResponse,
  Description,
  LinkingJson,
  LinkingStatusJson,
  LoginJson
} from '/api/Schemas'
import Dialog from '/components/Dialog'
import LoaderSpinner from '/components/LoaderSpinner'
import { handleLoginResponse, useAuthContext } from '/contexts/auth'
import OpenIdLink from '/pages/OpenIdLink'
import { parseJwt } from '/utils'
import { stringify } from 'query-string'
import React, { FunctionComponent, useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'
import { StringParam, useQueryParams } from 'use-query-params'

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

  const [error, setError] = useState({
    state: false,
    message: '' as Description
  })

  const [linking, setLinking] = useState(
    null as ApiResponse<LinkingStatusJson> | null
  )

  const hasParams = () =>
    queryParam.code && queryParam.scope && queryParam.state

  useEffect(() => {
    if (hasParams()) {
      openIdCallback(dispatch, queryParam).catch(
        (resp: ApiResponse<LinkingJson>) => {
          if (resp.token) {
            const jwt = parseJwt<{ identity: LinkingStatusJson }>(resp.token)
            if (jwt) {
              const expired = jwt.exp > Date.now()
              if (!expired) {
                setLinking({ ...resp, ...jwt.identity })
              } else {
                setError({ state: true, message: 'Token has expired' })
              }
            }
          }
          if (resp.description) {
            setError({ state: true, message: resp.description })
          }
        }
      )
    }
  }, [queryParam])

  return (
    <Dialog title="OpenID Login">
      {linking ? (
        <OpenIdLink status={linking} />
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
