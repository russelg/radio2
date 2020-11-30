import { API_BASE } from '/api'
import { ApiResponse, Description, LoginJson } from '/api/Schemas'
import Dialog from '/components/Dialog'
import LoaderButton from '/components/LoaderButton'
import LoaderSpinner from '/components/LoaderSpinner'
import { handleLoginResponse, useAuthContext } from '/contexts/auth'
import { getLocalStorage } from '/utils'
import { css } from 'emotion'
import React, {
  ChangeEvent,
  FormEvent,
  FunctionComponent,
  useEffect,
  useState
} from 'react'
import { Redirect } from 'react-router-dom'
import { Form, FormFeedback, FormGroup, Input } from 'reactstrap'

export interface LinkingStatusJson {
  username: string
  link: boolean
  reason: string
  id: string
}

function handleLinkStatus(resp: ApiResponse<LinkingStatusJson>) {
  if (resp.error !== null) throw resp
  if ('link' in resp) {
    return resp
  }
  throw resp
}

async function openIdLinkStatus(token: string): Promise<ApiResponse<LinkingStatusJson>> {
  return fetch(`${API_BASE}/openid/link?token=${token}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then(handleLinkStatus)
}

async function openIdLink(
  dispatch: any,
  token: string,
  username: string
): Promise<ApiResponse<LoginJson | LinkingStatusJson>> {
  return fetch(`${API_BASE}/openid/link`, {
    method: 'POST',
    body: JSON.stringify({ username, token }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(resp => resp.clone().json())
    .then(handleLoginResponse(dispatch))
}

const OpenIdLink: FunctionComponent = () => {
  const [{ loggedIn }, dispatch] = useAuthContext()
  if (loggedIn) {
    localStorage.removeItem('linking_token')
    return <Redirect to="/" />
  }

  const [values, setValues] = useState({
    username: '',
    reason: '' as Description
  })

  const validateForm = () => {
    return values.username.length > 0
  }

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null as Description | null)

  const token = getLocalStorage('linking_token', '')

  const handleAuthLink = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    openIdLink(dispatch, token, values.username)
      .then(() => {
        setSubmitting(false)
        localStorage.removeItem('linking_token')
      })
      .catch(resp => {
        setSubmitting(false)
        setError(resp.reason || resp.description!)
      })
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget
    // reset errors upon changing form values
    setError(null)
    setValues({ ...values, [name]: value })
  }

  useEffect(() => {
    if (!token) {
      setError('No token was provided.')
    } else {
      openIdLinkStatus(token)
        .then(resp => {
          setLoading(false)
          setValues({ ...values, ...resp })
        })
        .catch(resp => {
          setLoading(false)
          setError(resp.reason || resp.description!)
        })
    }
  }, [token])

  if (loading)
    return (
      <Dialog title="OpenID Login">
        {error ? <Redirect to="/" /> : <LoaderSpinner />}
      </Dialog>
    )

  return (
    <Dialog title="OpenID Login">
      {values.reason && <p className="text-center">{values.reason}</p>}
      <Form onSubmit={handleAuthLink}>
        <FormGroup>
          <Input
            name="username"
            placeholder="Desired username"
            value={values.username}
            onChange={handleInputChange}
            invalid={error !== null}
            required
            autoComplete="username"
            className={css`
              margin-bottom: -1px;
              border-bottom-left-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            `}
          />
          <FormFeedback>
            {error !== null ? (error! as Description).toString() : ''}
          </FormFeedback>
        </FormGroup>
        <LoaderButton
          color="success"
          block
          disabled={error !== null || !validateForm()}
          loading={submitting}>
          Set username
        </LoaderButton>
      </Form>
    </Dialog>
  )
}

export default OpenIdLink
