import React from 'react'
import {Card, CardBody, CardTitle, Col, Container, Row} from 'reactstrap'

import './Home.css'
import LoginForm from '../components/LoginForm'
import {view} from 'react-easy-state'
import {auth} from '../store'
import {Redirect} from 'react-router-dom'

class SignIn extends React.Component {
  render() {
    if (auth.logged_in)
      return (
        <Redirect to="/" />
      )

    return (
      <Container className='content-panel'>
        <Row className='align-items-center'>
          <Col lg={{size: 8, offset: 2}}>
            <Card>
              <CardBody className="mx-auto col-md-6">
                <CardTitle>Sign In</CardTitle>
                <LoginForm />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default view(SignIn)
