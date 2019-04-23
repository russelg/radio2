import { Formik } from 'formik'
import React from 'react'
import { view } from 'react-easy-state'
import FontAwesome from 'react-fontawesome'
import { Link, Redirect } from 'react-router-dom'
import {
  Button,
  Form,
  FormFeedback,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
} from 'reactstrap'
import * as yup from 'yup'
import Dialog from '../components/Dialog'
import { auth } from '../store'
import './Home.css'
import { InputType } from 'reactstrap/lib/Input'

export interface FormInputProps {
  icon?: string
  onChange?: (event: React.FormEvent<EventTarget>) => void
  onBlur?: (event: React.FormEvent<EventTarget>) => void
  placeholder?: string
  name?: string
  value?: string
  type?: InputType
  invalid?: boolean
  invalidError?: string
}

function FormInput(props: FormInputProps) {
  return (
    <FormGroup>
      <InputGroup size="lg">
        <InputGroupAddon addonType="prepend">
          <span className="input-group-text">
            <FontAwesome name={props.icon} />
          </span>
        </InputGroupAddon>
        <Input
          onChange={props.onChange}
          onBlur={props.onBlur}
          placeholder={props.placeholder || props.name}
          name={props.name}
          value={props.value}
          type={props.type || 'text'}
          invalid={props.invalid}
          autoComplete="new-password"
        />
        <FormFeedback tag="span">{props.invalidError}</FormFeedback>
      </InputGroup>
    </FormGroup>
  )
}

let schema = yup.object({
  username: yup
    .string()
    .required('Username required')
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be shorter than 32 characters')
    .matches(/^\w(?:\w*(?:[.-]\w+)?)*$/, {
      excludeEmptyString: true,
      message: 'Username may only contain the following: A-z, 0-9, -_.',
    }),
  password: yup.string().required('Password required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match'),
})

let schemaErrors = (values: any): { [k: string]: string } => {
  let errors = {}
  try {
    schema.validateSync(values, { abortEarly: false })
  } catch (errs) {
    errs.inner.forEach((error: { path: string; message: string }) => {
      errors[error.path] = error.message
    })
  }
  return errors
}

export interface SignUpFormInputs {
  username: string
  password: string
  confirmPassword: string
}

class SignUp extends React.Component {
  state = {
    username: '',
    password: '',
    confirmPassword: '',
    registered: false,
  }

  constructor(props: {}) {
    super(props)
  }

  render() {
    if (auth.logged_in) return <Redirect to="/" />

    // let errors = schemaErrors(schema, this.state)
    return (
      <Dialog title="Sign Up">
        <>
          {' '}
          {this.state.registered === false && (
            <Formik
              initialValues={
                {
                  username: '',
                  password: '',
                  confirmPassword: '',
                } as SignUpFormInputs
              }
              validate={schemaErrors}
              onSubmit={(
                values: SignUpFormInputs,
                { setSubmitting, setErrors }
              ) => {
                auth
                  .register(values.username, values.password)
                  .then(msg => {
                    this.setState({ registered: msg })
                  })
                  .catch(error => {
                    setErrors({ username: error.message })
                  })
                setSubmitting(false)
              }}
              render={({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
              }) => (
                <Form
                  onSubmit={handleSubmit}
                  className="text-center px-4 py-3"
                  autoComplete="new-password">
                  <FormInput
                    icon="user"
                    placeholder="username"
                    name="username"
                    value={values.username}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    invalidError={errors.username}
                    invalid={touched.username ? !!errors.username : false}
                  />
                  <FormInput
                    icon="lock"
                    placeholder="password"
                    name="password"
                    type="password"
                    value={values.password}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    invalidError={errors.password}
                    invalid={touched.password ? !!errors.password : false}
                  />
                  <FormInput
                    icon="lock"
                    placeholder="confirm password"
                    name="confirmPassword"
                    type="password"
                    value={values.confirmPassword}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    invalidError={errors.confirmPassword}
                    invalid={
                      touched.confirmPassword || touched.password
                        ? !!errors.confirmPassword
                        : false
                    }
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    Submit
                  </Button>
                </Form>
              )}
            />
          )}
          {this.state.registered && (
            <h2>
              {this.state.registered}! You may now{' '}
              <Link to="/sign-in">sign in</Link>.
            </h2>
          )}
        </>
      </Dialog>
    )
  }
}

export default view(SignUp)
