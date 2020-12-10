import { API_BASE } from '/api'
import { ApiResponse, Description, OpenIdLoginJson } from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import { useAuthState } from '/contexts/auth'
import React, { FormEvent, FunctionComponent, useState } from 'react'
import { Redirect } from 'react-router-dom'

async function openIdLogin(): Promise<ApiResponse<OpenIdLoginJson>> {
  return fetch(`${API_BASE}/openid/login`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then(resp => {
      if (resp.error) throw resp
      return resp
    })
}

const LoginOpenId: FunctionComponent = () => {
  const { loggedIn } = useAuthState()
  if (loggedIn) return <Redirect to="/" />

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null as Description | null)

  const handleAuthLogin = (e: FormEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setSubmitting(true)
    openIdLogin()
      .then(resp => {
        window.location.href = resp.url
      })
      .catch(resp => {
        setSubmitting(false)
        setError(resp.error)
      })
  }

  return (
    <LoaderButton
      color={error ? 'danger' : 'success'}
      block
      disabled={error !== null}
      loading={submitting}
      onClick={handleAuthLogin}>
      {error ? 'Unable to login using OpenID' : 'Login with OpenID'}
    </LoaderButton>
  )
}

export default LoginOpenId
