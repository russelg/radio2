import { css, cx } from 'emotion'
import React, { FunctionComponent, useState } from 'react'
import { view } from 'react-easy-state'
import {
  NavLink as RRNavLink,
  RouteComponentProps,
  withRouter
} from 'react-router-dom'
import {
  Collapse,
  Container,
  Label,
  Nav,
  Navbar as StrapNavbar,
  NavbarBrand,
  NavbarToggler,
  NavItem,
  NavLink
} from 'reactstrap'
import LoggedInDropdown from '/components/LoggedInDropdown'
import LoginDropdown from '/components/LoginDropdown'
import ThemeChooser from '/components/ThemeChooser'
import { auth } from '/store'

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

interface NavbarProps extends RouteComponentProps<any> {
  title: string
  styles: { [k: string]: string }
  currentStyle?: string
}

const Navbar: FunctionComponent<NavbarProps> = ({
  title,
  children,
  styles,
  currentStyle
}) => {
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
      className={cx(navbar, 'fixed-top')}>
      <Container>
        <NavbarBrand to="/" activeClassName="active" tag={RRNavLink}>
          {title}
        </NavbarBrand>
        {collapsed && (
          <Collapse
            isOpen={!collapsed}
            navbar
            className={cx(flexGrow(0), 'justify-content-start')}>
            <Nav navbar>{songsButton}</Nav>
          </Collapse>
        )}
        <Nav navbar className={cx(flexGrow(1), 'mx-n1 my-auto')}>
          <NavItem className="text-center mx-auto">{children}</NavItem>
        </Nav>
        <NavbarToggler onClick={toggle} className="mr-2" />
        <Collapse
          isOpen={!collapsed}
          navbar
          className={cx(flexGrow(0), 'justify-content-end')}>
          <Nav navbar>
            {!collapsed && songsButton}
            {!auth.logged_in && <LoginDropdown />}
            {auth.logged_in && <LoggedInDropdown />}
            <NavItem>
              <NavLink>
                <Label htmlFor="theme_chooser">Style</Label>
                <ThemeChooser className="ml-2" styles={styles} />
              </NavLink>
            </NavItem>
          </Nav>
        </Collapse>
      </Container>
    </StrapNavbar>
  )
}

export default withRouter(view(Navbar))
