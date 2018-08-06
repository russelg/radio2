import React from 'react'
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  Container,
  Form,
  FormFeedback,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
  Row
} from 'reactstrap'
import { view } from 'react-easy-state'

import './Home.css'
import { auth } from '../store'
import { Formik } from 'formik'
import FontAwesome from 'react-fontawesome'
import * as yup from 'yup'
import { Link, Redirect } from 'react-router-dom'

class FormInput extends React.Component {
  render() {
    return (
      <FormGroup>
        <InputGroup size="lg">
          <InputGroupAddon addonType="prepend">
            <span className="input-group-text">
              <FontAwesome name={this.props.icon} />
            </span>
          </InputGroupAddon>
          <Input onChange={this.props.onChange}
                 onBlur={this.props.onBlur}
                 placeholder={this.props.placeholder || this.props.name}
                 name={this.props.name}
                 value={this.props.value}
                 type={this.props.type || 'text'}
                 invalid={this.props.invalid}
                 autoComplete="new-password" />
          <FormFeedback tag="span">{this.props.invalidError}</FormFeedback>
        </InputGroup>
      </FormGroup>
    )
  }
}

let schema = yup.object({
  username: yup.string()
    .required('Username required')
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be shorter than 32 characters')
    .matches(/^\w(?:\w*(?:[.-]\w+)?)*$/, {
      excludeEmptyString: true,
      message: 'Username may only contain the following: A-z, 0-9, -_.'
    }),
  password: yup.string().required('Password required'),
  confirmPassword: yup.string().oneOf([ yup.ref('password') ], 'Passwords do not match')
})

let schemaErrors = (values) => {
  let errors = {}
  try {
    schema.validateSync(values, {abortEarly: false})
  } catch (errs) {
    errs.inner.forEach((error) => {
      errors[ error.path ] = error.message
    })
  }
  return errors
}

class SignUp extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      password: '',
      confirmPassword: '',
      registered: false
    }
  }

  render() {
    if (auth.logged_in)
      return (
        <Redirect to="/" />
      )

    // let errors = schemaErrors(schema, this.state)
    return (
      <Container className='content-panel'>
        <Row className='align-items-center'>
          <Col lg={{size: 8, offset: 2}}>
            <Card>
              <CardBody className="mx-auto col-md-6">
                <CardTitle>Register</CardTitle>
                {this.state.registered === false && <Formik
                  initialValues={{
                    username: '',
                    password: '',
                    confirmPassword: ''
                  }}
                  validate={schemaErrors}
                  onSubmit={(values, {setSubmitting, setErrors}) => {
                    console.log(values)
                    auth.register(values.username, values.password)
                      .then(msg => {
                        this.setState({registered: msg})
                      })
                      .catch(error => {
                        setErrors({username: error.message})
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
                    isSubmitting
                  }) => (
                    <Form onSubmit={handleSubmit} autoComplete="new-password">
                      <FormInput icon="user" placeholder="username" name="username"
                                 value={values.username}
                                 onBlur={handleBlur}
                                 onChange={handleChange}
                                 invalidError={errors.username}
                                 invalid={touched.username && !!errors.username} />
                      <FormInput icon="lock" placeholder="password" name="password" type="password"
                                 value={values.password}
                                 onBlur={handleBlur}
                                 onChange={handleChange}
                                 invalidError={errors.password}
                                 invalid={touched.password && !!errors.password} />
                      <FormInput icon="lock" placeholder="confirm password" name="confirmPassword" type="password"
                                 value={values.confirmPassword}
                                 onBlur={handleBlur}
                                 onChange={handleChange}
                                 invalidError={errors.confirmPassword}
                                 invalid={(touched.confirmPassword || touched.password) && !!errors.confirmPassword} />
                      <Button type="submit" disabled={isSubmitting}>
                        Submit
                      </Button>
                    </Form>
                  )}
                />}
                {this.state.registered &&
                <h2>{this.state.registered}! You may now <Link to='/sign-in'>sign in</Link>.</h2>}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default view(SignUp)
