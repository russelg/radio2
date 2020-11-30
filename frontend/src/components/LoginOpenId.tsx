import { API_BASE } from '/api'
import { ApiResponse } from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import { useAuthState } from '/contexts/auth'
import React, { FormEvent, FunctionComponent, useState } from 'react'
import { Redirect } from 'react-router-dom'

async function openIdLogin(): Promise<ApiResponse<any>> {
  return fetch(`${API_BASE}/openid/login`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then((resp: ApiResponse<any>) => {
      console.log(resp)
      window.location.href = resp.url
      return resp
    })
}

const LoginOpenId: FunctionComponent = () => {
  const { loggedIn } = useAuthState()
  if (loggedIn) return <Redirect to="/" />

  const [submitting, setSubmitting] = useState(false)

  const handleAuthLogin = (e: FormEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setSubmitting(true)
    openIdLogin().then(resp => {
      setSubmitting(false)
    })
  }

  return (
    <LoaderButton
      color="success"
      block
      loading={submitting}
      onClick={handleAuthLogin}>
      Login with OpenID
    </LoaderButton>
  )
}

export default LoginOpenId
