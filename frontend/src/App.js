import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { AnimatedSwitch } from 'react-router-transition'
import { playingState, settings } from './store'
import { view } from 'react-easy-state'
import ReactHowler from 'react-howler'
import Loadable from 'react-loadable'

import Navbar from './components/Navbar'
import Loader from './components/Loader'
import MiniPlayer from './components/MiniPlayer'

const AsyncHome = Loadable({
  loader: () => import('./pages/Home'),
  loading: Loader
})

const AsyncSongs = Loadable({
  loader: () => import('./pages/Songs'),
  loading: Loader
})

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      loaded: false
    }

    this.intervalId = null

    if (localStorage.getItem('css'))
      document.querySelector('#change_stylesheet').href = localStorage.getItem('css')
  }

  fetchSettings() {
    fetch('/api/v1/settings')
      .then(res => res.json())
      .then((result) => {
        settings.updateSettings(result)
        this.setState({loaded: true})
        if (!playingState.playing)
          document.title = settings.title
      })
  }

  updateState() {
    fetch('/api/v1/np')
      .then(res => res.json())
      .then((result) => {
        playingState.update(result)
        playingState.progressParse()
        this.setState({loaded: true})
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

  componentWillReceiveProps() {
    this.fetchSettings()
    this.updateState()
  }

  periodicUpdate() {
    // only continue to update nowplaying if the radio is playing
    // and we aren't on the homepage (i.e. miniplayer is showing)
    if (window.location.pathname === '/' || playingState.playing)
      playingState.periodicUpdate(() => this.updateState())
  }

  togglePlaying() {
    const {howler} = App.player

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
    if (settings.title === '')
      return <Loader />

    return (
      <Router>
        <div className='h-100'>
          <Navbar title={settings.title} styles={settings.styles}>
            {!(playingState.info.title === '' || !playingState.playing) && <MiniPlayer />}
          </Navbar>

          <ReactHowler
            src={settings.stream_url}
            format={['ogg']}
            preload={false}
            html5={true}
            playing={playingState.playing}
            volume={playingState.volume / 100}
            ref={(ref) => (App.player = ref)}
          />

          <AnimatedSwitch
            atEnter={{opacity: 0}}
            atLeave={{opacity: 0}}
            atActive={{opacity: 1}}
            className='switch-wrapper h-100'
          >
            <Route exact path='/'
                   render={() => <AsyncHome togglePlaying={this.togglePlaying} />}
            />
            <Route path='/songs' component={AsyncSongs} exact={true} />
          </AnimatedSwitch>
        </div>
      </Router>
    )
  }
}

export default view(App)
