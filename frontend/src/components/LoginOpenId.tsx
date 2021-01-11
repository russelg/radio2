import { API_BASE } from '/api'
import { ApiResponse, Description, OpenIdLoginJson } from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import { useAuthState } from '/contexts/auth'
import React, { FunctionComponent, useRef, useState } from 'react'
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

  const windowObjectReference = useRef<Window | null>(null)
  const [previousUrl, setPreviousUrl] = useState(null as string | null)

  const receiveMessage = (event: MessageEvent) => {
    console.log(event)
  }

  const openSignInWindow = (url: string, name: string) => {
    // remove any existing event listeners
    window.removeEventListener('message', receiveMessage)

    // window features
    const strWindowFeatures =
      'toolbar=no, menubar=no, width=600, height=700, top=100, left=100'

    if (
      windowObjectReference.current === null ||
      windowObjectReference.current.closed
    ) {
      /* if the pointer to the window object in memory does not exist
       or if such pointer exists but the window was closed */
      windowObjectReference.current = window.open(url, name, strWindowFeatures)
    } else if (previousUrl !== url) {
      /* if the resource to load is different,
       then we load it in the already opened secondary window and then
       we bring such window back on top/in front of its parent window. */
      windowObjectReference.current = window.open(url, name, strWindowFeatures)
      windowObjectReference.current!.focus()
    } else {
      /* else the window reference must exist and the window
       is not closed; therefore, we can bring it back on top of any other
       window with the focus() method. There would be no need to re-create
       the window or to reload the referenced resource. */
      windowObjectReference.current.focus()
    }

    // redirect the main page if popup window fails to open
    const redirect = () => {
      window.location.assign(url)
    }

    if (!windowObjectReference.current) redirect()
    else {
      windowObjectReference.current.onload = function() {
        setTimeout(function() {
          if (windowObjectReference.current!.screenX === 0) {
            redirect()
          }
        }, 0)
      }
    }

    // add the listener for receiving a message from the popup
    window.addEventListener('message', event => receiveMessage(event), false)
    // assign the previous URL
    setPreviousUrl(url)
  }

  const handleAuthLogin = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault()
    setSubmitting(true)
    openIdLogin()
      .then(resp => {
        // TODO: use popup instead
        // window.location.href = resp.url
        openSignInWindow(resp.url, 'Sign In')
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
