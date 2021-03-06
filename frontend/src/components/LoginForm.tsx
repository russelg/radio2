import { Description } from '/api/Schemas'
import LoaderButton from '/components/LoaderButton'
import LoginOpenId from '/components/LoginOpenId'
import { login, useAuthDispatch } from '/contexts/auth'
import { css, cx } from 'emotion'
import React, {
  ChangeEvent,
  FormEvent,
  FunctionComponent,
  useState
} from 'react'
import { Form, FormFeedback, FormGroup, Input } from 'reactstrap'

const formControlStyle = css`
  .form-control {
    position: relative;
    box-sizing: border-box;
    height: auto;
    padding: 10px;
    font-size: 16px;
  }

  .form-control:focus {
    z-index: 2;
  }
`

const LoginForm: FunctionComponent = () => {
  const dispatch = useAuthDispatch()

  const [values, setValues] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState(null as Description | null)
  const [submitting, setSubmitting] = useState(false)

  const validateForm = () => {
    return values.username.length > 0 && values.password.length > 0
  }

  const handleLogin = (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    login(dispatch, values.username, values.password)
      .catch(resp => setError(resp.description))
      .finally(() => setSubmitting(false))
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget
    // reset errors upon changing form values
    setError(null)
    setValues({ ...values, [name]: value })
  }

  return (
    <Form className={cx(formControlStyle, 'px-4 py-3')} onSubmit={handleLogin}>
      <FormGroup>
        <Input
          name="username"
          placeholder="Username"
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
        <Input
          type="password"
          name="password"
          placeholder="Password"
          value={values.password}
          onChange={handleInputChange}
          invalid={error !== null}
          required
          autoComplete="current-password"
          className={css`
            margin-bottom: 10px;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
          `}
        />
        <FormFeedback>{error !== null ? error : ''}</FormFeedback>
      </FormGroup>
      <LoaderButton
        color="success"
        block
        disabled={error !== null || !validateForm()}
        loading={submitting}>
        Login
      </LoaderButton>
      <hr />
      <LoginOpenId />
    </Form>
  )
}

export default LoginForm
