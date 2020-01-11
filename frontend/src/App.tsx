import { css, cx } from 'emotion'
import React, {
  CSSProperties,
  FunctionComponent,
  lazy,
  Suspense,
  useCallback,
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
import { useAuthContext } from '/contexts/auth'
import { useControlContext } from '/contexts/control'
import { useRadioInfoContext } from '/contexts/radio'
import { useRadioStatusContext } from '/contexts/radioStatus'
import { useSettingsContext } from '/contexts/settings'
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
  const { playing } = useControlContext()
  const { songInfo } = useRadioInfoContext()
  const { title: pageTitle } = useSettingsContext()

  return (
    <Helmet>
      <title>
        {playing
          ? `▶ ${songInfo.title} - ${songInfo.artist} | ${pageTitle}`
          : pageTitle}
      </title>
    </Helmet>
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

  const { title, styles, getStreamUrl } = useSettingsContext()
  const streamUrl = getStreamUrl()

  const {
    volume,
    playing,
    togglePlaying,
    setShouldFetchInfo
  } = useControlContext()

  // const { setShouldFetchInfo } = useRadioInfoContext()

  const toggleHowlerPlaying = useCallback(() => {
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
      togglePlaying()
    }
  }, [player, playing, togglePlaying])

  return (
    <Router>
      <QueryParamProvider ReactRouterRoute={Route}>
        <ErrorBoundary>
          <TitleSetter />
          <div className="h-100">
            <useAuthContext.Provider>
              <Navbar>
                <Collapse isOpen={playing}>
                  {playing && (
                    <useRadioStatusContext.Provider>
                      <MiniPlayer />
                    </useRadioStatusContext.Provider>
                  )}
                </Collapse>
              </Navbar>

              <ReactHowler
                src={[`${streamUrl}.ogg`, `${streamUrl}.mp3`]}
                format={['ogg', 'mp3']}
                preload={false}
                html5={true}
                playing={playing}
                volume={volume / 100}
                ref={player}
              />

              <AnimatedSwitch
                runOnMount
                atEnter={bounceTransition.atEnter}
                atLeave={bounceTransition.atLeave}
                atActive={bounceTransition.atActive}
                mapStyles={mapStyles}
                className={cx(switchStyle, 'h-100')}>
                <Route
                  path="/"
                  exact
                  render={props => {
                    setShouldFetchInfo(true)
                    return (
                      <Suspense fallback={<LoaderSpinner />}>
                        <Home {...props} togglePlaying={toggleHowlerPlaying} />
                      </Suspense>
                    )
                  }}
                />
                <Route
                  path="/songs"
                  exact
                  render={props => {
                    setShouldFetchInfo(playing)
                    return (
                      <Suspense fallback={<LoaderSpinner />}>
                        <Songs {...props} favourites={false} />
                      </Suspense>
                    )
                  }}
                />
                <Route
                  path="/favourites"
                  exact
                  render={props => {
                    setShouldFetchInfo(playing)
                    return (
                      <Suspense fallback={<LoaderSpinner />}>
                        <Songs {...props} favourites={true} />
                      </Suspense>
                    )
                  }}
                />
                <Route
                  path="/sign-up"
                  exact
                  render={props => {
                    setShouldFetchInfo(playing)
                    return <SignUp />
                  }}
                />
                <Route
                  path="/sign-in"
                  exact
                  render={props => {
                    setShouldFetchInfo(playing)
                    return <SignIn />
                  }}
                />
              </AnimatedSwitch>
            </useAuthContext.Provider>
          </div>
        </ErrorBoundary>
      </QueryParamProvider>
    </Router>
  )
}

export default App
