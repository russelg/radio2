import React, { lazy, Suspense } from 'react'
import { view } from 'react-easy-state'
import ReactHowler from 'react-howler'
import { BrowserRouter as Router, Route } from 'react-router-dom'
// @ts-ignore
import { AnimatedSwitch } from 'react-router-transition'
import { ApiResponse, NowPlayingJson, SettingsJson } from '/api/Schemas'
import ErrorBoundary from '/components/ErrorBoundary'
import Loader from '/components/Loader'
import LoaderSpinner from '/components/LoaderSpinner'
import Navbar from '/components/Navbar'
import { API_BASE, playingState, settings } from '/store'

const Home = lazy(() => import('/pages/Home'))
const Songs = lazy(() => import('/pages/Songs'))
const MiniPlayer = lazy(() => import('./components/MiniPlayer'))
const SignIn = lazy(() => import('/pages/SignIn'))
const SignUp = lazy(() => import('/pages/SignUp'))

interface Props {}
interface State {
  loaded: boolean
}

class App extends React.Component<Props, State> {
  intervalId?: any = undefined
  player: React.RefObject<ReactHowler>

  state = {
    loaded: false
  }

  constructor(props: Props) {
    super(props)

    this.player = React.createRef()

    if (localStorage.getItem('css')) {
      const customCSS: HTMLLinkElement | null = document.querySelector(
        '#change_stylesheet'
      )

      if (customCSS instanceof HTMLLinkElement) {
        customCSS.href = localStorage.getItem('css') || ''
      }
    }

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
    if (settings.title === '') return <Loader />

    return (
      <Router>
        <ErrorBoundary>
          <div className="h-100">
            <Navbar title={settings.title} styles={settings.styles}>
              {playingState.playing && playingState.info.title !== '' && (
                <Suspense fallback={LoaderSpinner}>
                  <MiniPlayer />
                </Suspense>
              )}
            </Navbar>

            <ReactHowler
              src={[`${settings.stream_url}.ogg`, `${settings.stream_url}.mp3`]}
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
              className="switch-wrapper h-100">
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
                    <SignUp {...props} />
                  </Suspense>
                )}
              />
              <Route
                path="/sign-in"
                exact
                render={props => (
                  <Suspense fallback={<LoaderSpinner />}>
                    <SignIn {...props} />
                  </Suspense>
                )}
              />
            </AnimatedSwitch>
          </div>
        </ErrorBoundary>
      </Router>
    )
  }
}

export default view(App)
