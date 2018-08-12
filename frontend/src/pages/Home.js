import React from 'react'
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
  Row
} from 'reactstrap'
import {view} from 'react-easy-state'
import {playingState, settings} from '../store'
import {fuzzy_time, readable_filesize, readable_seconds} from '../utils'
import Loader from '../components/Loader'

import './Home.css'

class Home extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      modal: false,
      dropdownOpen: false,
      loaded: false
    }

    this.toggleModal = this.toggle.bind(this, 'modal')
    this.toggleDropdown = this.toggle.bind(this, 'dropdownOpen')
  }

  static volumeChange(event) {
    playingState.volume = parseInt(event.target.value, 10)
  }

  toggle(itm) {
    this.setState({
      [itm]: !this.state[itm]
    })
  }

  render() {
    const {info, radio} = playingState

    if (info.title === '')
      return <Loader />

    return (
      <Container className='content-panel'>
        <Row>
          <Col>
            <Row className='align-items-center'>
              <Col xs={false} lg='6'>
                <h2>{settings.title}</h2>
                <h5 className='text-muted'>
                  We have <b>{info.total_songs}</b> songs in total,
                  with a total playcount of <b>{info.total_plays}</b>.
                </h5>
                <small className='text-muted'>
                  We've wasted <b>{readable_filesize(info.total_size)}</b>!
                </small>
              </Col>
              <Col xs={false} lg='6' className='pb-3'>
                <Button color='primary' block onClick={this.props.togglePlaying}>
                  {playingState.playing && 'Stop Stream'}
                  {!playingState.playing && 'Start Stream'}
                </Button>
                <ButtonGroup className='btn-block'>
                  <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggleDropdown}
                            className='btn-block'>
                    <DropdownToggle caret className='btn-block'>
                      More Options
                    </DropdownToggle>
                    <DropdownMenu className='btn-block'>
                      <DropdownItem tag='a' href={settings.stream_url}>Direct Stream
                        Link</DropdownItem>
                      <DropdownItem tag='a' href={settings.stream_url + '.m3u'}>Stream .m3u
                        Playlist</DropdownItem>
                      <DropdownItem tag='a' href={settings.stream_url + '.xspf'}>Stream .xspf
                        Playlist</DropdownItem>
                      <DropdownItem divider />
                      <DropdownItem onClick={this.toggleModal}>Help</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </ButtonGroup>
                {playingState.playing && <Card className='my-3 text-center'>
                  <CardHeader>Volume Control</CardHeader>
                  <CardBody>
                    <input id='volume' type='range' min='0' max='100' step='1'
                           style={{width: '100%'}}
                           value={playingState.volume}
                           onChange={Home.volumeChange} />
                  </CardBody>
                </Card>}
              </Col>
              <Modal isOpen={this.state.modal} toggle={this.toggleModal}>
                <ModalHeader toggle={this.toggleModal}>title Help</ModalHeader>
                <ModalBody>
                  <h3>Playing the Stream</h3>
                  <p>Simply click the
                    &nbsp;<Button color='primary' size='sm'>Play Stream</Button>&nbsp;
                    button in your browser.
                  </p>
                  <p>A volume slider will appear, and the slider will change the volume.
                    This is remembered between page loads.</p>
                  <p>To play the stream in your browser, you can use any of the following
                    links:</p>
                  <ul>
                    <li><a href={settings.stream_url}>Direct Stream Link</a></li>
                    <li><a href={settings.stream_url + '.m3u'}>Stream .m3u Playlist</a></li>
                    <li><a href={settings.stream_url + '.xspf'}>Stream .xspf Playlist</a></li>
                  </ul>
                  <h3>Requesting Songs</h3>
                  <p>Search for a song first, by entering something into the searchbox at
                    the top (or clicking "Search" in the navbar).</p>
                  <p>Then, click on
                    &nbsp;<Button color='success' size='sm'>Play Stream</Button>&nbsp;
                  </p>
                  <p>You can only request every 2 hours.</p>
                </ModalBody>
                <ModalFooter>
                  <Button color='secondary' onClick={this.toggleModal}>Close</Button>
                </ModalFooter>
              </Modal>
            </Row>
            <Row className='pt-3'>
              <Col>
                <h2 className='pb-2 text-center'>{info.artist} - {info.title}</h2>
                <Progress value={playingState.progress} />
                <Row className='pt-3'>
                  <Col sm={{size: 5, offset: 1}}>
                    <div className='text-muted text-center'>
                      Listeners: <span id='listeners'>{info.listeners}</span>
                    </div>
                  </Col>
                  <Col sm={{size: 5}}>
                    <div className='text-muted text-center'>
                      <span>{readable_seconds(radio.current_pos)} / {readable_seconds(radio.current_len)}</span>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row>
          <Col xs={false} lg='6' className='pt-3'>
            <h4 className='text-center'>Last Played</h4>
            <ListGroup>
              {info.lp.map(item =>
                <ListGroupItem key={item.time} className='clearfix p-4' active={item.requested}>
                  <Col xs='4' className='float-left'>
                    <span title={item.time}>{fuzzy_time(item.time)}</span>
                  </Col>
                  <Col xs='8' className='float-right text-right'>
                    {item.artist} - {item.title}
                  </Col>
                </ListGroupItem>
              )}
            </ListGroup>
          </Col>
          <Col xs={false} lg='6' className='pt-3'>
            <h4 className='text-center'>Queue</h4>
            <ListGroup>
              {info.queue.map(item =>
                <ListGroupItem key={item.time} className='clearfix p-4' active={item.requested}>
                  <Col xs='8' className='float-left'>
                    {item.artist} - {item.title}
                  </Col>
                  <Col xs='4' className='float-right text-right'>
                    <span title={item.time}>{fuzzy_time(item.time)}</span>
                  </Col>
                </ListGroupItem>
              )}
            </ListGroup>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default view(Home)
