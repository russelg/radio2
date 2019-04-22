import React from 'react'
import { view } from 'react-easy-state'
import {
  NavLink as RRNavLink,
  RouteComponentProps,
  withRouter,
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
  NavLink,
} from 'reactstrap'
import { auth } from '../store'
import LoggedInDropdown from './LoggedInDropdown'
import LoginDropdown from './LoginDropdown'
import './Navbar.css'
import ThemeChooser from './ThemeChooser'

interface Props extends RouteComponentProps<any> {
  children: JSX.Element
  title: string
  styles: object
  currentStyle?: string
}

interface State {
  collapsed: boolean
}

class Navbar extends React.Component<Props, State> {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: true,
    }

    this.toggle = this.toggle.bind(this)
  }

  toggle() {
    this.setState({
      collapsed: !this.state.collapsed,
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
      <StrapNavbar color="primary" expand="lg" dark className="fixed-top">
        <Container>
          <NavbarBrand to="/" activeClassName="active" tag={RRNavLink}>
            {this.props.title}
          </NavbarBrand>
          {this.state.collapsed && (
            <Collapse
              isOpen={!this.state.collapsed}
              navbar
              className="justify-content-start no-flex-grow">
              <Nav navbar>{songsButton}</Nav>
            </Collapse>
          )}
          <Nav navbar className="player flex-grow my-auto">
            <NavItem className="text-center mx-auto">
              {this.props.children}
            </NavItem>
          </Nav>
          <NavbarToggler onClick={this.toggle} className="mr-2" />
          <Collapse
            isOpen={!this.state.collapsed}
            navbar
            className="justify-content-end no-flex-grow">
            <Nav navbar>
              {!this.state.collapsed && songsButton}
              {!auth.logged_in && <LoginDropdown />}
              {auth.logged_in && <LoggedInDropdown />}
              <NavItem>
                <NavLink>
                  <Label htmlFor="theme_chooser">Style</Label>
                  <ThemeChooser styles={this.props.styles} />
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
