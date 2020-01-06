import { css, cx } from 'emotion'
import React, { lazy, Suspense } from 'react'
import { view } from 'react-easy-state'
import ReactHowler from 'react-howler'
import { BrowserRouter as Router, Route } from 'react-router-dom'
// @ts-ignore
import { AnimatedSwitch } from 'react-router-transition'
import { toast, Zoom } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Collapse } from 'reactstrap'
import { QueryParamProvider } from 'use-query-params'
import { ApiResponse, NowPlayingJson, SettingsJson } from '/api/Schemas'
import ErrorBoundary from '/components/ErrorBoundary'
import LoaderSpinner from '/components/LoaderSpinner'
import Navbar from '/components/Navbar'
import { API_BASE, playingState, settings } from '/store'
import { useAuthContext } from '/authContext'

toast.configure({
  autoClose: 2000,
  position: 'top-center',
  transition: Zoom,
  pauseOnFocusLoss: false
})

const Home = lazy(() => import('/pages/Home'))
const Songs = lazy(() => import('/pages/Songs'))
const MiniPlayer = lazy(() => import('/components/MiniPlayer'))
const SignIn = lazy(() => import('/pages/SignIn'))
const SignUp = lazy(() => import('/pages/SignUp'))

interface Props {}
interface State {
  loaded: boolean
}

const switchStyle = css`
  position: relative;

  > div {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`

class App extends React.Component<Props, State> {
  intervalId?: any = undefined
  player: React.RefObject<ReactHowler>

  state = {
    loaded: false
  }

  constructor(props: Props) {
    super(props)
    this.player = React.createRef()
    this.togglePlaying = this.togglePlaying.bind(this)
  }

  fetchSettings(): void {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then((result: ApiResponse<SettingsJson>) => {
        settings.updateSettings(result)
        this.setState({ loaded: true })
        if (!playingState.playing) document.title = settings.title
      })
  }

  updateState(): void {
    fetch(`${API_BASE}/np`)
      .then(res => res.json())
      .then((result: ApiResponse<NowPlayingJson>) => {
        playingState.update(result)
        playingState.progressParse()
        this.setState({ loaded: true })
      })
  }

  componentWillUnmount() {
    clearInterval(this.intervalId)
  }

  componentDidMount() {
    this.fetchSettings()
    this.updateState()
    this.intervalId = setInterval(this.periodicUpdate.bind(this), 500)
  }

  periodicUpdate(): void {
    // only continue to update nowplaying if the radio is playing
    // and we aren't on the homepage (i.e. miniplayer is showing)
    if (window.location.pathname === '/' || playingState.playing) {
      playingState.periodicUpdate(() => this.updateState())
    }
  }

  togglePlaying(): void {
    const howler = this.player.current!.howler

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

  render() {
    const miniPlayerVisible =
      playingState.playing && playingState.info.title !== ''

    return (
      <Router>
        <QueryParamProvider ReactRouterRoute={Route}>
          <ErrorBoundary>
            <div className="h-100">
              <useAuthContext.Provider>
                <Navbar title={settings.title} styles={settings.styles}>
                  <Collapse isOpen={miniPlayerVisible}>
                    <Suspense fallback={<LoaderSpinner />}>
                      {miniPlayerVisible && <MiniPlayer />}
                    </Suspense>
                  </Collapse>
                </Navbar>

                <ReactHowler
                  src={[
                    `${settings.stream_url}.ogg`,
                    `${settings.stream_url}.mp3`
                  ]}
                  format={['ogg', 'mp3']}
                  preload={false}
                  html5={true}
                  playing={playingState.playing}
                  volume={playingState.volume / 100}
                  ref={this.player}
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
                        <Home {...props} togglePlaying={this.togglePlaying} />
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
}

export default view(App)
