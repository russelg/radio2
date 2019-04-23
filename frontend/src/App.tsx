import React from 'react'
import { view } from 'react-easy-state'
import ReactHowler from 'react-howler'
import Loadable from 'react-loadable'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { AnimatedSwitch } from 'react-router-transition'
import { ApiResponse, NowPlayingJson, SettingsJson } from './api/Schemas'
import Loader from './components/Loader'
import MiniPlayer from './components/MiniPlayer'
import Navbar from './components/Navbar'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import { API_BASE, playingState, settings } from './store'

const AsyncHome = Loadable({
  loader: () => import('./pages/Home'),
  loading: Loader,
  delay: 100,
})

const AsyncSongs = Loadable({
  loader: () => import('./pages/Songs'),
  loading: Loader,
  delay: 100,
})

interface Props {}
interface State {
  loaded: boolean
}

class App extends React.Component<Props, State> {
  intervalId?: any = undefined
  player: React.RefObject<ReactHowler>

  state = {
    loaded: false,
  }

  constructor(props: Props) {
    super(props)

    this.player = React.createRef()

    if (localStorage.getItem('css')) {
      let customCSS: HTMLLinkElement | null = document.querySelector(
        '#change_stylesheet'
      )

      if (customCSS instanceof HTMLLinkElement) {
        customCSS.href = localStorage.getItem('css') || ''
      }
    }
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
    if (window.location.pathname === '/' || playingState.playing)
      playingState.periodicUpdate(() => this.updateState())
  }

  togglePlaying(): void {
    let howler = this.player.current!.howler

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
        <div className="h-100">
          <Navbar title={settings.title} styles={settings.styles}>
            {!(playingState.info.title === '' || !playingState.playing) ? (
              <MiniPlayer />
            ) : (
              <></>
            )}
          </Navbar>

          <ReactHowler
            src={[settings.stream_url + '.ogg', settings.stream_url + '.mp3']}
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
              exact
              path="/"
              render={props => (
                <AsyncHome
                  {...props}
                  togglePlaying={this.togglePlaying.bind(this)}
                />
              )}
            />
            <Route
              path="/songs"
              exact
              render={props => <AsyncSongs {...props} favourites={false} />}
            />
            <Route
              path="/favourites"
              exact
              render={props => <AsyncSongs {...props} favourites={true} />}
            />
            <Route path="/sign-up" component={SignUp} exact />
            <Route path="/sign-in" component={SignIn} exact />
          </AnimatedSwitch>
        </div>
      </Router>
    )
  }
}

export default view(App)
