// @ts-ignore
import MediaSession from '@mebtte/react-media-session'
import { css } from 'emotion'
import React, {
  CSSProperties,
  FunctionComponent,
  lazy,
  Suspense,
  useRef
} from 'react'
import { Helmet } from 'react-helmet'
import ReactHowler from 'react-howler'
import { BrowserRouter as Router, Route } from 'react-router-dom'
// @ts-ignore
import { AnimatedSwitch, spring } from 'react-router-transition'
import { toast, Zoom } from 'react-toastify'
import { Collapse } from 'reactstrap'
import { QueryParamProvider } from 'use-query-params'
import ErrorBoundary from '/components/ErrorBoundary'
import LoaderSpinner from '/components/LoaderSpinner'
import MiniPlayer from '/components/MiniPlayer'
import Navbar from '/components/Navbar'
import {
  togglePlaying,
  useControlDispatch,
  useControlState
} from '/contexts/control'
import { useRadioInfoState } from '/contexts/radio'
import { useSiteSettingsState } from '/contexts/settings'
import SignIn from '/pages/SignIn'
import SignUp from '/pages/SignUp'

toast.configure({
  autoClose: 2000,
  position: 'top-center',
  transition: Zoom,
  pauseOnFocusLoss: false,
  closeButton: false
})

const Home = lazy(() => import('/pages/Home'))
const Songs = lazy(() => import('/pages/Songs'))

const switchStyle = css`
  position: relative;

  > div {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`

const TitleSetter: FunctionComponent = () => {
  const { playing } = useControlState()
  const { songInfo } = useRadioInfoState()
  const { title: pageTitle } = useSiteSettingsState()

  return (
    <Helmet>
      <title>
        {playing && songInfo.title !== ''
          ? `▶ ${songInfo.title} - ${songInfo.artist} | ${pageTitle}`
          : pageTitle}
      </title>
    </Helmet>
  )
}

type MediaSessionSetterProps = {
  togglePlaying: () => void
}

const MediaSessionSetter: FunctionComponent<MediaSessionSetterProps> = ({
  togglePlaying
}) => {
  const { songInfo } = useRadioInfoState()

  return (
    <MediaSession
      title={songInfo.title}
      artist={songInfo.artist}
      onPlay={togglePlaying}
      onPause={togglePlaying}
    />
  )
}

// we need to map the `scale` prop we define below
// to the transform style property
function mapStyles(styles: CSSProperties) {
  return {
    opacity: styles.opacity,
    transform: `scale(${styles.scale})`
  }
}

// wrap the `spring` helper to use a bouncy config
function bounce(val: number) {
  return spring(val, {
    stiffness: 330,
    damping: 22
  })
}

// child matches will...
const bounceTransition = {
  // start in a transparent, upscaled state
  atEnter: {
    opacity: 0,
    scale: 1.2
  },
  // leave in a transparent, downscaled state
  atLeave: {
    opacity: bounce(0),
    scale: bounce(0.8)
  },
  // and rest at an opaque, normally-scaled state
  atActive: {
    opacity: bounce(1),
    scale: bounce(1)
  }
}

const App: FunctionComponent = () => {
  const player = useRef<ReactHowler>(null)

  const { streamUrl } = useSiteSettingsState()

  const { volume, playing } = useControlState()
  const dispatch = useControlDispatch()

  const toggleHowlerPlaying = () => {
    const howler = player.current && player.current.howler
    if (howler) {
      // Force howler to unload and reload the song
      // if we don't do this sometimes the radio will just not resume playback
      if (playing) {
        howler.unload()
      } else {
        howler.load()
        howler.play()
      }
      togglePlaying(dispatch)
    }
  }

  return (
    <Router>
      <QueryParamProvider ReactRouterRoute={Route}>
        <ErrorBoundary>
          <div className="h-100">
            <Navbar>
              <Collapse isOpen={playing}>{playing && <MiniPlayer />}</Collapse>
            </Navbar>

            <ReactHowler
              src={[
                `${streamUrl}.mp3?nocache=${new Date().getTime()}`,
                `${streamUrl}.ogg?nocache=${new Date().getTime()}`
              ]}
              format={['mp3', 'ogg']}
              preload={false}
              html5={true}
              playing={playing}
              volume={volume / 100}
              ref={player}
            />

            <TitleSetter />
            <MediaSessionSetter togglePlaying={toggleHowlerPlaying} />
            <AnimatedSwitch
              runOnMount
              atEnter={bounceTransition.atEnter}
              atLeave={bounceTransition.atLeave}
              atActive={bounceTransition.atActive}
              mapStyles={mapStyles}
              className={switchStyle}>
              <Route path="/" exact>
                <Suspense fallback={<LoaderSpinner />}>
                  <Home togglePlaying={toggleHowlerPlaying} />
                </Suspense>
              </Route>
              <Route path="/songs" exact>
                <Suspense fallback={<LoaderSpinner />}>
                  <Songs favourites={false} />
                </Suspense>
              </Route>
              <Route path="/favourites" exact>
                <Suspense fallback={<LoaderSpinner />}>
                  <Songs favourites={true} />
                </Suspense>
              </Route>
              <Route path="/sign-up" exact>
                <SignUp />
              </Route>
              <Route path="/sign-in" exact>
                <SignIn />
              </Route>
            </AnimatedSwitch>
          </div>
        </ErrorBoundary>
      </QueryParamProvider>
    </Router>
  )
}

export default App
