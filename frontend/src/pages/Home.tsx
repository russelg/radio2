import React, { FunctionComponent, useCallback, useState } from 'react'
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
  Row
} from 'reactstrap'
import { SongListItem, NowPlayingJson } from '/api/Schemas'
import '/pages/Home.css'
import { playingState, settings, RadioStore } from '/store'
import { fuzzyTime, readableFilesize, readableSeconds } from '/utils'

interface HomeProps {
  togglePlaying: () => void
}

interface UsageModalProps {
  open: boolean
  toggle: () => void
}

const UsageModal: FunctionComponent<UsageModalProps> = view(
  ({ open, toggle }) => {
    return (
      <Modal isOpen={open} toggle={toggle}>
        <ModalHeader toggle={toggle}>Help</ModalHeader>
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
            A volume slider will appear, and the slider will change the volume.
            This is remembered between page loads.
          </p>
          <p>
            To play the stream in your browser, you can use any of the following
            links:
          </p>
          <ul>
            <li>
              <a href={`${settings.stream_url}.ogg`}>Direct Stream Link</a>
            </li>
            <li>
              <a href={`${settings.stream_url}.m3u`}>Stream .m3u Playlist</a>
            </li>
            <li>
              <a href={`${settings.stream_url}.xspf`}>Stream .xspf Playlist</a>
            </li>
          </ul>
          <h3>Requesting Songs</h3>
          <p>
            Search for a song first, by entering something into the searchbox at
            the top (or clicking "Search" in the navbar).
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
          <Button color="secondary" onClick={toggle}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    )
  }
)

interface SongListProps {
  songs: SongListItem[]
  title: string
  alignment: 'left' | 'right'
}

const SongList: FunctionComponent<SongListProps> = view(
  ({ songs, title, alignment, children }) => {
    return (
      <>
        <h4 className="text-center mb-4">{title}</h4>
        {songs.length > 0 ? (
          <ListGroup>
            {songs.map((item: SongListItem) => {
              const flipped = alignment === 'left' ? 'right' : 'left'
              return (
                <ListGroupItem
                  key={item.time}
                  className="clearfix p-4"
                  active={item.requested}>
                  <Col
                    xs="8"
                    className={`float-${alignment} text-${alignment}`}>
                    {item.artist} - {item.title}
                  </Col>
                  <Col xs="4" className={`float-${flipped} text-${flipped}`}>
                    <span title={item.time}>{fuzzyTime(item.time)}</span>
                  </Col>
                </ListGroupItem>
              )
            })}
          </ListGroup>
        ) : (
          <p className="text-center text-muted">{children}</p>
        )}
      </>
    )
  }
)

const Branding: FunctionComponent<{
  info: NowPlayingJson
}> = view(({ info }) => {
  return (
    <>
      <h2>{settings.title}</h2>
      <h5 className="text-muted mb-0">
        Currently spinning <b>{info.total_songs}</b> songs, with{' '}
        <b>{info.total_plays}</b> total plays.
      </h5>
      <small className="text-muted">
        That's <b>{readableFilesize(info.total_size)}</b> of music!
      </small>
    </>
  )
})

const BigProgress: FunctionComponent<{
  info: NowPlayingJson
  radio: RadioStore
}> = view(({ info, radio }) => {
  return (
    <>
      <h2 className="pb-2 text-center">
        {info.title ? (
          <span>
            {info.artist} - {info.title}
          </span>
        ) : (
          <span className="text-muted">No song currently playing.</span>
        )}
      </h2>
      <Progress value={playingState.progress} />
      <Row>
        <Col
          sm={{ size: 5, offset: 1 }}
          className="text-muted text-center pt-3 order-last order-sm-first">
          Listeners: {info.listeners}
        </Col>
        <Col sm={{ size: 5 }} className="text-muted text-center pt-3">
          {readableSeconds(radio.current_pos)} /{' '}
          {readableSeconds(radio.current_len)}
        </Col>
      </Row>
    </>
  )
})

const Controls: FunctionComponent<HomeProps> = view(({ togglePlaying }) => {
  const [showModal, setShowModal] = useState<boolean>(false)
  const [showDropdown, setShowDropdown] = useState<boolean>(false)

  const toggleModal = useCallback(
    () => setShowModal(showModal => !showModal),
    []
  )

  const toggleDropdown = useCallback(
    () => setShowDropdown(showDropdown => !showDropdown),
    []
  )

  return (
    <>
      <Button color="primary" block onClick={togglePlaying}>
        {playingState.playing ? 'Stop Stream' : 'Start Stream'}
      </Button>
      <ButtonGroup className="btn-block">
        <Dropdown
          isOpen={showDropdown}
          toggle={toggleDropdown}
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
            <DropdownItem tag="a" href={`${settings.stream_url}.xspf`}>
              Stream .xspf Playlist
            </DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={toggleModal}>Help</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </ButtonGroup>
      <UsageModal open={showModal} toggle={toggleModal} />
      {playingState.playing && <VolumeControl />}
    </>
  )
})

const VolumeControl: FunctionComponent = view(() => {
  const { volume } = playingState

  const volumeChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      playingState.volume = parseInt(event.currentTarget.value, 10)
    },
    []
  )

  return (
    <Card className="my-3 text-center">
      <CardHeader>Volume Control</CardHeader>
      <CardBody>
        <input
          id="volume"
          type="range"
          min="0"
          max="100"
          step="1"
          className="w-100"
          value={volume}
          onChange={volumeChange}
        />
      </CardBody>
    </Card>
  )
})

const Home: FunctionComponent<HomeProps> = ({ togglePlaying }) => {
  const { info, radio } = playingState

  return (
    <Container className="content-panel">
      <Row>
        <Col>
          <Row>
            <Col lg="6" className="pb-3">
              <Branding info={info} />
            </Col>
            <Col lg="6" className="pb-3">
              <Controls togglePlaying={togglePlaying} />
            </Col>
          </Row>
          <Row className="py-5">
            <Col>
              <BigProgress info={info} radio={radio} />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col lg="6" className="py-3">
          <SongList songs={info.lp} title="Last Played" alignment="right">
            No songs played recently.
          </SongList>
        </Col>
        <Col lg="6" className="py-3">
          <SongList songs={info.queue} title="Queue" alignment="left">
            No songs currently queued.
          </SongList>
        </Col>
      </Row>
    </Container>
  )
}

export default view(Home)
