import LoaderSkeleton from '/components/LoaderSkeleton'
import LoggedInDropdown from '/components/LoggedInDropdown'
import LoginDropdown from '/components/LoginDropdown'
import ThemeChooser from '/components/ThemeChooser'
import { useAuthState } from '/contexts/auth'
import { useSiteSettingsState } from '/contexts/settings'
import { containerWidthStyle } from '/utils'
import { css, cx } from 'emotion'
import React, { FunctionComponent, useState } from 'react'
import { NavLink as RRNavLink } from 'react-router-dom'
import {
  Collapse,
  Container,
  Label,
  Nav,
  Navbar as StrapNavbar,
  NavbarBrand,
  NavbarToggler,
  NavItem,
  NavLink,
} from 'reactstrap'

const flexGrow = (val: number) => css`
  flex-grow: ${val};
`

const navbar = css`
  .badge-admin {
    margin: 0 5px;
  }

  label {
    margin-bottom: 0;
  }
`

const Navbar: FunctionComponent = ({ children }) => {
  const { loggedIn } = useAuthState()
  const { styles, title } = useSiteSettingsState()

  const [collapsed, setCollapsed] = useState(true)
  const toggle = () => setCollapsed(collapsed => !collapsed)

  const songsButton = (
    <NavItem>
      <NavLink to="/songs" exact activeClassName="active" tag={RRNavLink}>
        Songs
      </NavLink>
    </NavItem>
  )

  return (
    <StrapNavbar
      color="primary"
      expand="lg"
      dark
      className={cx(navbar, 'sticky-top', 'order-1')}>
      <Container className={containerWidthStyle}>
        <NavbarBrand
          to="/"
          className="order-first"
          activeClassName="active"
          tag={RRNavLink}>
          <LoaderSkeleton loading={title === ''} width={100}>
            {() => title}
          </LoaderSkeleton>
        </NavbarBrand>
        <Collapse
          isOpen={!collapsed}
          navbar
          className={cx(
            flexGrow(0),
            'justify-content-start',
            'order-5 order-lg-2',
          )}>
          <Nav navbar>{songsButton}</Nav>
        </Collapse>
        <Nav
          navbar
          className={cx(flexGrow(1), 'mx-n1 my-auto order-1 order-lg-3')}>
          <NavItem className="text-center mx-auto">{children}</NavItem>
        </Nav>
        <NavbarToggler onClick={toggle} className="mr-2 order-4" />
        <Collapse
          isOpen={!collapsed}
          navbar
          className={cx(flexGrow(0), 'justify-content-end order-6')}>
          <Nav navbar>
            {loggedIn ? <LoggedInDropdown /> : <LoginDropdown />}
            {styles !== null && (
              <NavItem>
                <NavLink>
                  <Label htmlFor="theme_chooser">Style</Label>
                  <ThemeChooser className="ml-2" />
                </NavLink>
              </NavItem>
            )}
          </Nav>
        </Collapse>
      </Container>
    </StrapNavbar>
  )
}

export default Navbar
