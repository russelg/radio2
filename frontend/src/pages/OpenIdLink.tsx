import { API_BASE } from '/api'
import {
  ApiResponse,
  Description,
  LinkingStatusJson,
  LoginJson
} from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import { handleLoginResponse, useAuthContext } from '/contexts/auth'
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

interface LinkingProps {
  status: ApiResponse<LinkingStatusJson>
}

const OpenIdLink: FunctionComponent<LinkingProps> = ({ status }) => {
  const [{ loggedIn }, dispatch] = useAuthContext()
  if (loggedIn) {
    localStorage.removeItem('linking_token')
    if (window.opener) {
      // close the popup since we've logged in successfully
      window.close()
    }
    return <Redirect to="/" />
  }

  const [values, setValues] = useState({
    username: '',
    reason: ''
  } as { [k: string]: any })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null as Description | null)

  const token = status.token

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget
    if (values[name] !== value) {
      setError(null)
    }
    setValues({ ...values, [name]: value })
  }

  const handleAuthLink = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    openIdLink(dispatch, token, values.username)
      .then(() => localStorage.removeItem('linking_token'))
      .catch(resp => setError(resp.reason || resp.description!))
      .finally(() => setSubmitting(false))
  }

  useEffect(() => {
    if (!token) {
      setError('No token was provided.')
    }
    setValues({ ...values, ...status })
    if (status.error) {
      setError(status.reason || status.description!)
    }
  }, [token, status])

  return (
    <>
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
          <FormFeedback>{error ? error.toString() : ''}</FormFeedback>
        </FormGroup>
        <LoaderButton
          color="success"
          block
          disabled={error !== null || !values.username.length}
          loading={submitting}>
          Set username
        </LoaderButton>
      </Form>
    </>
  )
}

export default OpenIdLink
