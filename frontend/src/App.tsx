import { css, cx } from 'emotion'
import React, {
  FunctionComponent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef
} from 'react'
import { view } from 'react-easy-state'
import ReactHowler from 'react-howler'
import { BrowserRouter as Router, Route } from 'react-router-dom'
// @ts-ignore
import { AnimatedSwitch } from 'react-router-transition'
import { toast, Zoom } from 'react-toastify'
// import 'react-toastify/dist/ReactToastify.css'
import { Collapse } from 'reactstrap'
import { QueryParamProvider } from 'use-query-params'
import { ApiResponse, NowPlayingJson } from '/api/Schemas'
import ErrorBoundary from '/components/ErrorBoundary'
import LoaderSpinner from '/components/LoaderSpinner'
import Navbar from '/components/Navbar'
import { useAuthContext } from '/contexts/auth'
import { useSettingsContext } from '/contexts/settings'
import { API_BASE, playingState } from '/store'
import { useInterval } from '/utils'

toast.configure({
  autoClose: 2000,
  position: 'top-center',
  transition: Zoom,
  pauseOnFocusLoss: false,
  closeButton: false
})

const Home = lazy(() => import('/pages/Home'))
const Songs = lazy(() => import('/pages/Songs'))
const MiniPlayer = lazy(() => import('/components/MiniPlayer'))
const SignIn = lazy(() => import('/pages/SignIn'))
const SignUp = lazy(() => import('/pages/SignUp'))

const switchStyle = css`
  position: relative;

  > div {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`

const App: FunctionComponent = () => {
  const player = useRef<ReactHowler>(null)

  const { title, styles, getStreamUrl } = useSettingsContext()
  const streamUrl = getStreamUrl()

  const updateNowPlaying = useCallback(() => {
    fetch(`${API_BASE}/np`)
      .then(res => res.json())
      .then((result: ApiResponse<NowPlayingJson>) => {
        playingState.update(result)
        playingState.progressParse()
      })
  }, [])

  const togglePlaying = useCallback(() => {
    const { info, playing } = playingState
    if (playingState.playing) {
      document.title = `▶ ${info.title} - ${info.artist} | ${title}`
    } else {
      document.title = title
    }

    const howler = player.current && player.current.howler
    if (howler) {
      // Force howler to unload and reload the song
      // if we don't do this sometimes the radio will just not resume playback
      if (playingState.playing) {
        howler.unload()
      } else {
        howler.load()
        howler.play()
      }
      playingState.togglePlaying()
    }
  }, [title, player])

  // run update hook every 500 ms
  // requests are made every 5s
  useInterval(() => {
    if (window.location.pathname === '/' || playingState.playing) {
      playingState.periodicUpdate(updateNowPlaying)
    }
  }, 500)

  // get now playing on load
  useEffect(() => {
    updateNowPlaying()
  }, [])

  const miniPlayerVisible =
    playingState.playing && playingState.info.title !== ''

  return (
    <Router>
      <QueryParamProvider ReactRouterRoute={Route}>
        <ErrorBoundary>
          <div className="h-100">
            <useAuthContext.Provider>
              <Navbar title={title} styles={styles}>
                <Collapse isOpen={miniPlayerVisible}>
                  <Suspense fallback={<LoaderSpinner />}>
                    {miniPlayerVisible && <MiniPlayer />}
                  </Suspense>
                </Collapse>
              </Navbar>

              <ReactHowler
                src={[`${streamUrl}.ogg`, `${streamUrl}.mp3`]}
                format={['ogg', 'mp3']}
                preload={false}
                html5={true}
                playing={playingState.playing}
                volume={playingState.volume / 100}
                ref={player}
              />
              <AnimatedSwitch
                atEnter={{ opacity: 0 }}
                atLeave={{ opacity: 0 }}
                atActive={{ opacity: 1 }}
                className={cx(switchStyle, 'h-100')}>
                <Route
                  path="/"
                  exact
                  render={props => (
                    <Suspense fallback={<LoaderSpinner />}>
                      <Home {...props} togglePlaying={togglePlaying} />
                    </Suspense>
                  )}
                />
                <Route
                  path="/songs"
                  exact
                  render={props => (
                    <Suspense fallback={<LoaderSpinner />}>
                      <Songs {...props} favourites={false} />
                    </Suspense>
                  )}
                />
                <Route
                  path="/favourites"
                  exact
                  render={props => (
                    <Suspense fallback={<LoaderSpinner />}>
                      <Songs {...props} favourites={true} />
                    </Suspense>
                  )}
                />
                <Route
                  path="/sign-up"
                  exact
                  render={props => (
                    <Suspense fallback={<LoaderSpinner />}>
                      <SignUp />
                    </Suspense>
                  )}
                />
                <Route
                  path="/sign-in"
                  exact
                  render={props => (
                    <Suspense fallback={<LoaderSpinner />}>
                      <SignIn />
                    </Suspense>
                  )}
                />
              </AnimatedSwitch>
            </useAuthContext.Provider>
          </div>
        </ErrorBoundary>
      </QueryParamProvider>
    </Router>
  )
}

export default view(App)
