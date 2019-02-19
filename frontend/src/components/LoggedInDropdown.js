import React from 'react'
import {
  Badge,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from 'reactstrap'
import { view } from 'react-easy-state'
import { auth } from '../store'
import { Link } from 'react-router-dom'

class LoggedInDropdown extends React.Component {
  constructor() {
    super()
    this.handleLogout = this.handleLogout.bind(this)
  }

  async handleLogout(event) {
    await auth.logout()
  }

  render() {
    return (
      <UncontrolledDropdown nav inNavbar>
        <DropdownToggle nav caret>
          Signed in as {auth.username + ' '}
          {auth.admin && (
            <Badge pill variant="info" className="align-middle badge-admin">
              Admin
            </Badge>
          )}
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem to={`/favourites?user=${auth.username}`} tag={Link}>
            View your favourites
          </DropdownItem>
          <DropdownItem divider />
          <DropdownItem onClick={this.handleLogout}>Logout</DropdownItem>
        </DropdownMenu>
      </UncontrolledDropdown>
    )
  }
}

export default view(LoggedInDropdown)
