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
import { auth } from '/store'

const LoggedInDropdown: FunctionComponent = () => {
  const handleLogout = async () => {
    await auth.logout()
  }

  return (
    <UncontrolledDropdown nav inNavbar>
      <DropdownToggle nav caret>
        <FontAwesomeIcon fixedWidth icon={faUser} />
        <span className="mx-2">{auth.username}</span>
        {auth.admin && (
          <>
            <Badge pill variant="info" className="align-middle badge-admin">
              Admin
            </Badge>
          </>
        )}
      </DropdownToggle>
      <DropdownMenu right>
        <DropdownItem to={`/favourites?user=${auth.username}`} tag={Link}>
          View your favourites
        </DropdownItem>
        <DropdownItem divider />
        <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
  )
}

export default view(LoggedInDropdown)
