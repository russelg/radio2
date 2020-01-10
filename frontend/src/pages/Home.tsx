import { css } from 'emotion'
import React, { FunctionComponent, useCallback, useState } from 'react'
import {
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Col,
  Collapse,
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
import { SongListItem } from '/api/Schemas'
import LoaderSkeleton from '/components/LoaderSkeleton'
import { useControlContext } from '/contexts/control'
import { useRadioInfoContext } from '/contexts/radio'
import { useRadioStatusContext } from '/contexts/radioStatus'
import { useSettingsContext } from '/contexts/settings'
import {
  containerWidthStyle,
  fuzzyTime,
  navbarMarginStyle,
  readableFilesize,
  readableSeconds
} from '/utils'

interface HomeProps {
  togglePlaying: () => void
}

interface UsageModalProps {
  open: boolean
  toggle: () => void
}

const UsageModal: FunctionComponent<UsageModalProps> = React.memo(
  ({ open, toggle }) => {
    const { getStreamUrl } = useSettingsContext()
    const streamUrl = getStreamUrl()

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
              <a href={`${streamUrl}.ogg`}>Direct Stream Link</a>
            </li>
            <li>
              <a href={`${streamUrl}.ogg.m3u`}>Stream .m3u Playlist</a>
            </li>
            <li>
              <a href={`${streamUrl}.ogg.xspf`}>Stream .xspf Playlist</a>
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

const SongList: FunctionComponent<SongListProps> = ({
  songs,
  title,
  alignment,
  children
}) => {
  const flipped = alignment === 'left' ? 'right' : 'left'

  return (
    <>
      <h4 className="text-center mb-4">{title}</h4>
      <ListGroup>
        {// show placeholders if songs has not loaded
        (songs.length > 0 ? songs : Array(4).fill(null)).map(
          (item: SongListItem | null, idx: number) => {
            return (
              <ListGroupItem
                key={item ? item.time : idx}
                className="clearfix p-4"
                active={item ? item.requested : undefined}>
                <Col xs="8" className={`float-${alignment} text-${alignment}`}>
                  <LoaderSkeleton loading={item === null} count={2}>
                    {() => `${item!.artist} - ${item!.title}`}
                  </LoaderSkeleton>
                </Col>
                <Col xs="4" className={`float-${flipped} text-${flipped}`}>
                  <LoaderSkeleton loading={item === null}>
                    {() => (
                      <span title={item!.time}>{fuzzyTime(item!.time)}</span>
                    )}
                  </LoaderSkeleton>
                </Col>
              </ListGroupItem>
            )
          }
        )}
      </ListGroup>
    </>
  )
}

const Branding: FunctionComponent = () => {
  const { title } = useSettingsContext()
  const { serverInfo } = useRadioInfoContext()

  return (
    <>
      <h2>
        <LoaderSkeleton loading={title === ''} width={300}>
          {title}
        </LoaderSkeleton>
      </h2>
      <h5 className="text-muted mb-0">
        <LoaderSkeleton
          loading={!(serverInfo.totalSongs && serverInfo.totalPlays)}
          width="80%">
          {() => (
            <>
              Currently spinning <b>{serverInfo.totalSongs}</b> songs, with{' '}
              <b>{serverInfo.totalPlays}</b> total plays.
            </>
          )}
        </LoaderSkeleton>
      </h5>
      <small className="text-muted">
        <LoaderSkeleton loading={!serverInfo.totalSize} width="30%">
          {() => (
            <>
              That's <b>{readableFilesize(serverInfo.totalSize)}</b> of music!
            </>
          )}
        </LoaderSkeleton>
      </small>
    </>
  )
}

const BigProgress: FunctionComponent = () => {
  const { songInfo, serverInfo } = useRadioInfoContext()
  const {
    radioStatus: { position, duration, progress, progressIncrement }
  } = useRadioStatusContext()

  return (
    <>
      <h2 className="pb-2 text-center">
        <LoaderSkeleton loading={!songInfo.title} width="50%">
          {() => `${songInfo.artist} - ${songInfo.title}`}
        </LoaderSkeleton>
      </h2>
      <Progress value={progress + progressIncrement} />
      <Row>
        <Col
          sm={{ size: 5, offset: 1 }}
          className="text-muted text-center pt-3 order-last order-sm-first">
          <LoaderSkeleton loading={!songInfo.title} width="20%">
            {() => `Listeners: ${serverInfo.listeners}`}
          </LoaderSkeleton>
        </Col>
        <Col sm={{ size: 5 }} className="text-muted text-center pt-3">
          <LoaderSkeleton loading={!songInfo.length} width="20%">
            {() =>
              `${readableSeconds(position)} / ${readableSeconds(duration)}`
            }
          </LoaderSkeleton>
        </Col>
      </Row>
    </>
  )
}

const Controls: FunctionComponent<HomeProps> = React.memo(
  ({ togglePlaying }) => {
    const { getStreamUrl } = useSettingsContext()
    const streamUrl = getStreamUrl()

    const { playing } = useControlContext()

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
          {playing ? 'Stop Stream' : 'Play Stream'}
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
              <DropdownItem tag="a" href={`${streamUrl}.ogg`}>
                Direct Stream Link
              </DropdownItem>
              <DropdownItem tag="a" href={`${streamUrl}.ogg.m3u`}>
                Stream .m3u Playlist
              </DropdownItem>
              <DropdownItem tag="a" href={`${streamUrl}.ogg.xspf`}>
                Stream .xspf Playlist
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem onClick={toggleModal}>Help</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </ButtonGroup>
        <UsageModal open={showModal} toggle={toggleModal} />
        <Collapse isOpen={playing}>
          <VolumeControl />
        </Collapse>
      </>
    )
  }
)

const VolumeControl: FunctionComponent = React.memo(() => {
  const { volume, setVolume } = useControlContext()

  const volumeChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      setVolume(parseInt(event.currentTarget.value, 10))
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

const homeStyle = css`
  ${navbarMarginStyle};
  ${containerWidthStyle};
`

const Home: FunctionComponent<HomeProps> = ({ togglePlaying }) => {
  const {
    serverInfo: { queue, lastPlayed }
  } = useRadioInfoContext()

  return (
    <Container className={homeStyle}>
      <Row>
        <Col>
          <Row>
            <Col lg="6" className="pb-3">
              <Branding />
            </Col>
            <Col lg="6" className="pb-3">
              <Controls togglePlaying={togglePlaying} />
            </Col>
          </Row>
          <Row className="py-5">
            <Col>
              <useRadioStatusContext.Provider>
                <BigProgress />
              </useRadioStatusContext.Provider>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col lg="6" className="py-3">
          <SongList songs={lastPlayed} title="Last Played" alignment="right">
            No songs played recently.
          </SongList>
        </Col>
        <Col lg="6" className="py-3">
          <SongList songs={queue} title="Queue" alignment="left">
            No songs currently queued.
          </SongList>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
