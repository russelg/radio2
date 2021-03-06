import LoginForm from '/components/LoginForm'
import React, { FunctionComponent } from 'react'
import { Link } from 'react-router-dom'
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown
} from 'reactstrap'

const LoginDropdown: FunctionComponent = () => (
  <UncontrolledDropdown nav inNavbar>
    <DropdownToggle nav caret>
      Sign in
    </DropdownToggle>
    <DropdownMenu right>
      <LoginForm />
      <DropdownItem to="/sign-up" tag={Link}>
        New around here? Sign up
      </DropdownItem>
    </DropdownMenu>
  </UncontrolledDropdown>
)

export default LoginDropdown
