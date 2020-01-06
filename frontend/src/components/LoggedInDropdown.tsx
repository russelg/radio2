import { faUser } from '@fortawesome/free-solid-svg-icons/faUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Link } from 'react-router-dom'
import {
  Badge,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown
} from 'reactstrap'
import { useAuthContext } from '/authContext'

const LoggedInDropdown: FunctionComponent = () => {
  const { username, isAdmin, logout } = useAuthContext()

  return (
    <UncontrolledDropdown nav inNavbar>
      <DropdownToggle nav caret>
        <FontAwesomeIcon fixedWidth icon={faUser} />
        <span className="mx-2">{username}</span>
        {isAdmin && (
          <Badge pill variant="info" className="align-middle badge-admin">
            Admin
          </Badge>
        )}
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem to={`/favourites?user=${username}`} tag={Link}>
          View your favourites
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={logout}>Logout</DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  )
}

export default view(LoggedInDropdown)
