import { css, cx } from 'emotion'
import React from 'react'
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

interface Props extends RouteComponentProps<any> {
  children: React.ReactNode
  title: string
  styles: { [k: string]: string }
  currentStyle?: string
}

interface State {
  collapsed: boolean
}

class Navbar extends React.Component<Props, State> {
  state = {
    collapsed: true
  }

  constructor(props: Props) {
    super(props)

    this.toggle = this.toggle.bind(this)
  }

  toggle(): void {
    this.setState({
      collapsed: !this.state.collapsed
    })
  }

  render() {
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
            {this.props.title}
          </NavbarBrand>
          {this.state.collapsed && (
            <Collapse
              isOpen={!this.state.collapsed}
              navbar
              className={cx(flexGrow(0), 'justify-content-start')}>
              <Nav navbar>{songsButton}</Nav>
            </Collapse>
          )}
          <Nav navbar className={cx(flexGrow(1), 'mx-n1 my-n3')}>
            <NavItem className="text-center mx-auto">
              {this.props.children}
            </NavItem>
          </Nav>
          <NavbarToggler onClick={this.toggle} className="mr-2" />
          <Collapse
            isOpen={!this.state.collapsed}
            navbar
            className={cx(flexGrow(0), 'justify-content-end')}>
            <Nav navbar>
              {!this.state.collapsed && songsButton}
              {!auth.logged_in && <LoginDropdown />}
              {auth.logged_in && <LoggedInDropdown />}
              <NavItem>
                <NavLink>
                  <Label htmlFor="theme_chooser">Style</Label>
                  <ThemeChooser className="ml-1" styles={this.props.styles} />
                </NavLink>
              </NavItem>
            </Nav>
          </Collapse>
        </Container>
      </StrapNavbar>
    )
  }
}

export default withRouter(view(Navbar))
