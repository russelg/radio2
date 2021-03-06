import Dialog from '/components/Dialog'
import LoaderButton from '/components/LoaderButton'
import { register, useAuthState } from '/contexts/auth'
import {
  IconLookup,
  IconName,
  IconPrefix
} from '@fortawesome/fontawesome-common-types'
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock'
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Formik } from 'formik'
import React, { FunctionComponent, useState } from 'react'
import { Link, Redirect } from 'react-router-dom'
import {
  Form,
  FormFeedback,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon
} from 'reactstrap'
import { InputType } from 'reactstrap/lib/Input'
import * as yup from 'yup'

export interface FormInputProps {
  icon?: IconName | [IconPrefix, IconName] | IconLookup
  onChange?: (event: React.FormEvent<EventTarget>) => void
  onBlur?: (event: React.FormEvent<EventTarget>) => void
  placeholder?: string
  name?: string
  value?: string
  type?: InputType
  invalid?: boolean
  invalidError?: string
}

const FormInput: FunctionComponent<FormInputProps> = props => {
  return (
    <FormGroup>
      <InputGroup size="lg">
        {props.icon && (
          <InputGroupAddon addonType="prepend">
            <span className="input-group-text">
              <FontAwesomeIcon icon={props.icon} />
            </span>
          </InputGroupAddon>
        )}
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

const schema = yup.object({
  username: yup
    .string()
    .required('Username required')
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be shorter than 32 characters')
    .matches(/^\w(?:\w*(?:[.-]\w+)?)*$/, {
      excludeEmptyString: true,
      message: 'Username may only contain the following: A-z, 0-9, -_.'
    }),
  password: yup
    .string()
    .required('Password required')
    .min(3, 'Password must be at least 3 characters'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
})

const schemaErrors = (values: any): { [k: string]: string } => {
  const errors: { [k: string]: string } = {}
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

const SignUp: FunctionComponent = () => {
  const [registered, setRegistered] = useState<boolean | string>(false)
  const { loggedIn } = useAuthState()

  type onSubmitProps = {
    setSubmitting: (val: boolean) => void
    setErrors: (val: any) => void
  }

  const onSubmit = (
    values: SignUpFormInputs,
    { setSubmitting, setErrors }: onSubmitProps
  ) => {
    register(values.username, values.password)
      .then(resp => setRegistered(resp))
      .catch(error => {
        // assign the error to the username field if only a string returned
        if (Object.prototype.toString.call(error) === '[object String]') {
          error = { username: error }
        }
        setErrors(error)
      })
      .finally(() => setSubmitting(false))
  }

  if (loggedIn) return <Redirect to="/" />

  return (
    <Dialog title="Sign Up">
      <>
        {registered === false && (
          <Formik
            initialValues={
              {
                username: '',
                password: '',
                confirmPassword: ''
              } as SignUpFormInputs
            }
            validate={schemaErrors}
            onSubmit={onSubmit}>
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting
            }) => (
              <Form
                onSubmit={handleSubmit}
                className="text-center px-4 py-3"
                autoComplete="new-password">
                <FormInput
                  icon={faUser}
                  placeholder="username"
                  name="username"
                  value={values.username}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  invalidError={errors.username}
                  invalid={touched.username ? !!errors.username : false}
                />
                <FormInput
                  icon={faLock}
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
                  icon={faLock}
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
                <LoaderButton
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length !== 0}
                  loading={isSubmitting}>
                  Create Account
                </LoaderButton>
              </Form>
            )}
          </Formik>
        )}
        {registered !== false && (
          <h2>
            {registered}! You may now <Link to="/sign-in">sign in</Link>.
          </h2>
        )}
      </>
    </Dialog>
  )
}

export default SignUp
