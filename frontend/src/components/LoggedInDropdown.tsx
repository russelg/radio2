import { faUser } from '@fortawesome/free-solid-svg-icons/faUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { FunctionComponent } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown
} from 'reactstrap'
import { logout, useAuthDispatch, useAuthState } from '/contexts/auth'

const LoggedInDropdown: FunctionComponent = () => {
  const { username, admin } = useAuthState()
  const dispatch = useAuthDispatch()

  return (
    <UncontrolledDropdown nav inNavbar>
      <DropdownToggle nav caret>
        <FontAwesomeIcon fixedWidth icon={faUser} />
        <span className="mx-2">{username}</span>
        {admin && (
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
        <DropdownItem onClick={() => logout(dispatch)}>Logout</DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  )
}

export default LoggedInDropdown
