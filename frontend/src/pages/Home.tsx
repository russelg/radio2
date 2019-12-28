import React from 'react'
import { view } from 'react-easy-state'
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Progress,
  Row,
} from 'reactstrap'
import { SongListItem } from '/api/Schemas'
import '/pages/Home.css'
import { playingState, settings } from '/store'
import { fuzzyTime, readableFilesize, readableSeconds } from '/utils'

export interface State {
  modal: boolean
  dropdownOpen: boolean
  loaded: boolean
}

export interface Props {
  togglePlaying: () => void
}

class Home extends React.Component<Props, State> {
  state = {
    modal: false,
    dropdownOpen: false,
    loaded: false,
  }

  toggleModal = this.toggle.bind(this, 'modal')
  toggleDropdown = this.toggle.bind(this, 'dropdownOpen')

  constructor(props: Props) {
    super(props)
  }

  static volumeChange(event: React.FormEvent<EventTarget>): void {
    const target = event.target as HTMLInputElement
    playingState.volume = parseInt(target.value, 10)
  }

  toggle(itm: keyof State): void {
    const newState = this.state
    newState[itm] = !this.state[itm]
    this.setState(newState)
  }

  render() {
    const { info, radio } = playingState

    return (
      <Container className="content-panel">
        <Row>
          <Col>
            <Row>
              <Col xs={false} lg="6" className="pb-3">
                <h2>{settings.title}</h2>
                <h5 className="text-muted mb-0">
                  Currently spinning <b>{info.total_songs}</b> songs, with{' '}
                  <b>{info.total_plays}</b> total plays.
                </h5>
                <small className="text-muted">
                  That's <b>{readableFilesize(info.total_size)}</b> of music!
                </small>
              </Col>
              <Col xs={false} lg="6" className="pb-3">
                <Button
                  color="primary"
                  block
                  onClick={this.props.togglePlaying}>
                  {playingState.playing && 'Stop Stream'}
                  {!playingState.playing && 'Start Stream'}
                </Button>
                <ButtonGroup className="btn-block">
                  <Dropdown
                    isOpen={this.state.dropdownOpen}
                    toggle={() =>
                      this.setState({
                        dropdownOpen: !this.state.dropdownOpen,
                      })
                    }
                    className="btn-block">
                    <DropdownToggle caret className="btn-block">
                      More Options
                    </DropdownToggle>
                    <DropdownMenu className="btn-block">
                      <DropdownItem tag="a" href={`${settings.stream_url}.ogg`}>
                        Direct Stream Link
                      </DropdownItem>
                      <DropdownItem tag="a" href={`${settings.stream_url}.m3u`}>
                        Stream .m3u Playlist
                      </DropdownItem>
                      <DropdownItem
                        tag="a"
                        href={`${settings.stream_url}.xspf`}>
                        Stream .xspf Playlist
                      </DropdownItem>
                      <DropdownItem divider />
                      <DropdownItem onClick={this.toggleModal}>
                        Help
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </ButtonGroup>
                {playingState.playing && (
                  <Card className="my-3 text-center">
                    <CardHeader>Volume Control</CardHeader>
                    <CardBody>
                      <input
                        id="volume"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        style={{ width: '100%' }}
                        value={playingState.volume}
                        onChange={Home.volumeChange}
                      />
                    </CardBody>
                  </Card>
                )}
              </Col>
              <Modal isOpen={this.state.modal} toggle={this.toggleModal}>
                <ModalHeader toggle={this.toggleModal}>Help</ModalHeader>
                <ModalBody>
                  <h3>Playing the Stream</h3>
                  <p>
                    Simply click the &nbsp;
                    <Button color="primary" size="sm">
                      Play Stream
                    </Button>
                    &nbsp; button in your browser.
                  </p>
                  <p>
                    A volume slider will appear, and the slider will change the
                    volume. This is remembered between page loads.
                  </p>
                  <p>
                    To play the stream in your browser, you can use any of the
                    following links:
                  </p>
                  <ul>
                    <li>
                      <a href={`${settings.stream_url}.ogg`}>
                        Direct Stream Link
                      </a>
                    </li>
                    <li>
                      <a href={`${settings.stream_url}.m3u`}>
                        Stream .m3u Playlist
                      </a>
                    </li>
                    <li>
                      <a href={`${settings.stream_url}.xspf`}>
                        Stream .xspf Playlist
                      </a>
                    </li>
                  </ul>
                  <h3>Requesting Songs</h3>
                  <p>
                    Search for a song first, by entering something into the
                    searchbox at the top (or clicking "Search" in the navbar).
                  </p>
                  <p>
                    Then, click on &nbsp;
                    <Button color="success" size="sm">
                      Play Stream
                    </Button>
                    &nbsp;
                  </p>
                  <p>You can only request every 2 hours.</p>
                </ModalBody>
                <ModalFooter>
                  <Button color="secondary" onClick={this.toggleModal}>
                    Close
                  </Button>
                </ModalFooter>
              </Modal>
            </Row>
            <Row className="py-5">
              <Col>
                <h2 className="pb-2 text-center">
                  {info.title ? (
                    <span>
                      {info.artist} - {info.title}
                    </span>
                  ) : (
                    <span className="text-muted">
                      No song currently playing.
                    </span>
                  )}
                </h2>
                <Progress value={playingState.progress} />
                <Row className="pt-3">
                  <Col sm={{ size: 5, offset: 1 }}>
                    <div className="text-muted text-center">
                      Listeners: <span id="listeners">{info.listeners}</span>
                    </div>
                  </Col>
                  <Col sm={{ size: 5 }}>
                    <div className="text-muted text-center">
                      <span>
                        {readableSeconds(radio.current_pos)} /{' '}
                        {readableSeconds(radio.current_len)}
                      </span>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row>
          <Col xs={false} lg="6" className="py-3">
            <h4 className="text-center">Last Played</h4>
            {info.lp.length > 0 ? (
              <ListGroup>
                {info.lp.map((item: SongListItem) => (
                  <ListGroupItem
                    key={item.time}
                    className="clearfix p-4"
                    active={item.requested}>
                    <Col xs="4" className="float-left">
                      <span title={item.time}>{fuzzyTime(item.time)}</span>
                    </Col>
                    <Col xs="8" className="float-right text-right">
                      {item.artist} - {item.title}
                    </Col>
                  </ListGroupItem>
                ))}
              </ListGroup>
            ) : (
              <p className="text-center text-muted">
                No songs played recently.
              </p>
            )}
          </Col>
          <Col xs={false} lg="6" className="py-3">
            <h4 className="text-center">Queue</h4>
            {info.queue.length > 0 ? (
              <ListGroup>
                {info.queue.map((item: SongListItem) => (
                  <ListGroupItem
                    key={item.time}
                    className="clearfix p-4"
                    active={item.requested}>
                    <Col xs="8" className="float-left">
                      {item.artist} - {item.title}
                    </Col>
                    <Col xs="4" className="float-right text-right">
                      <span title={item.time}>{fuzzyTime(item.time)}</span>
                    </Col>
                  </ListGroupItem>
                ))}
              </ListGroup>
            ) : (
              <p className="text-center text-muted">
                No songs currently queued.
              </p>
            )}
          </Col>
        </Row>
      </Container>
    )
  }
}

export default view(Home)
