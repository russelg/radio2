import { css } from 'emotion'
import React, { FunctionComponent, useEffect, useState } from 'react'
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
import { SongItem, SongListItem } from '/api/Schemas'
import LoaderSkeleton from '/components/LoaderSkeleton'
import { FavouriteButton } from '/components/SongRow'
import { useAuthState } from '/contexts/auth'
import {
  setVolume,
  useControlContext,
  useControlState
} from '/contexts/control'
import {
  setFavourited,
  useRadioInfoContext,
  useRadioInfoState
} from '/contexts/radio'
import { useRadioStatusState } from '/contexts/radioStatus'
import { useSiteSettingsState } from '/contexts/settings'
import {
  containerWidthStyle,
  fuzzyTime,
  navbarMarginStyle,
  readableFilesize,
  readableSeconds,
  setLocalStorage
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
    const { streamUrl } = useSiteSettingsState()

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
            <Button color="primary" size="sm">
              Play Stream
            </Button>
            &nbsp;
          </p>
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
  alignment
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
                key={idx}
                className="clearfix py-3 px-1 py-lg-4 px-md-3"
                active={item ? item.requested : undefined}>
                <Col xs="8" className={`float-${alignment} text-${alignment}`}>
                  <LoaderSkeleton loading={item === null} count={2}>
                    {() => `${item!.artist} - ${item!.title}`}
                  </LoaderSkeleton>
                </Col>
                <Col xs="4" className={`float-${flipped} text-${flipped}`}>
                  <LoaderSkeleton loading={item === null}>
                    {() => (
                      <small
                        className="text-muted font-italic"
                        title={item!.time}>
                        {fuzzyTime(item!.time)}
                      </small>
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
  const { title } = useSiteSettingsState()
  const { serverInfo } = useRadioInfoState()

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

const ListenersCount: FunctionComponent = () => {
  const { songInfo, serverInfo } = useRadioInfoState()

  return (
    <LoaderSkeleton loading={!songInfo.title} width="30%">
      {() => `Listeners: ${serverInfo.listeners}`}
    </LoaderSkeleton>
  )
}

const FavouriteSongButton: FunctionComponent = () => {
  const [{ songInfo, favourited }, dispatch] = useRadioInfoContext()

  return (
    <FavouriteButton
      // useIcon={false}
      updateSong={(id: string, song: SongItem | null) => {
        setFavourited(dispatch, (song && song.meta.favourited) || false)
      }}
      song={{
        id: songInfo.id,
        // @ts-ignore
        meta: { favourited }
      }}
    />
  )
}

const SongPosition: FunctionComponent = () => {
  const { songInfo } = useRadioInfoState()
  const { position, duration } = useRadioStatusState()

  return (
    <LoaderSkeleton loading={!songInfo.length} width="30%">
      {() => `${readableSeconds(position)} / ${readableSeconds(duration)}`}
    </LoaderSkeleton>
  )
}

const BigProgressInfo: FunctionComponent = () => {
  const { loggedIn } = useAuthState()

  return (
    <Row className="pt-2">
      <Col
        sm={{ size: loggedIn ? 3 : 5, offset: 1 }}
        className="text-muted text-center pt-3 order-last order-sm-first">
        <ListenersCount />
      </Col>
      {loggedIn && (
        <Col sm={{ size: 4 }} className="text-center pt-1">
          <FavouriteSongButton />
        </Col>
      )}
      <Col
        sm={{ size: loggedIn ? 3 : 5 }}
        className="text-muted text-center pt-3">
        <SongPosition />
      </Col>
    </Row>
  )
}

const BigProgressTitle: FunctionComponent = () => {
  const { songInfo } = useRadioInfoState()

  return (
    <h2 className="pb-2 text-center">
      <LoaderSkeleton loading={!songInfo.title} width="50%">
        {() => (
          <>
            {songInfo.artist} - {songInfo.title}
          </>
        )}
      </LoaderSkeleton>
    </h2>
  )
}

const BigProgress: FunctionComponent = () => {
  const { progress, progressIncrement } = useRadioStatusState()
  return <Progress value={progress + progressIncrement} />
}

const Controls: FunctionComponent<HomeProps> = React.memo(
  ({ togglePlaying }) => {
    const { streamUrl } = useSiteSettingsState()
    const { playing } = useControlState()

    const [showModal, setShowModal] = useState<boolean>(false)
    const [showDropdown, setShowDropdown] = useState<boolean>(false)

    const toggleModal = () => setShowModal(show => !show)
    const toggleDropdown = () => setShowDropdown(show => !show)

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
  const [{ volume }, dispatch] = useControlContext()

  const volumeChange = (event: React.FormEvent<HTMLInputElement>) => {
    setVolume(dispatch, parseInt(event.currentTarget.value, 10))
  }

  useEffect(() => {
    setLocalStorage('volume', volume)
  }, [volume])

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

const SongLists: FunctionComponent = () => {
  const {
    serverInfo: { queue, lastPlayed }
  } = useRadioInfoState()

  return (
    <>
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
    </>
  )
}

const Home: FunctionComponent<HomeProps> = ({ togglePlaying }) => {
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
              <BigProgressTitle />
              <BigProgress />
              <BigProgressInfo />
            </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <SongLists />
      </Row>
    </Container>
  )
}

export default Home
