import React from 'react'
import { view } from 'react-easy-state'
import FontAwesome from 'react-fontawesome'
import { Link } from 'react-router-dom'
import {
  Badge,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from 'reactstrap'
import { auth } from '../store'

class LoggedInDropdown extends React.Component<{}> {
  constructor(props: {}) {
    super(props)
    this.handleLogout = this.handleLogout.bind(this)
  }

  async handleLogout(): Promise<void> {
    await auth.logout()
  }

  render() {
    return (
      <UncontrolledDropdown nav inNavbar>
        <DropdownToggle nav caret>
          <FontAwesome fixedWidth name="user" /> {auth.username + ' '}
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
