import React from 'react'
import {view} from 'react-easy-state'
import {playingState} from '../store'
import {Progress} from 'reactstrap'
import {readable_seconds} from '../utils'

import './MiniPlayer.css'

class MiniPlayer extends React.Component {
  render() {
    const {info, radio} = playingState

    return (
      <div className='navbar-text text-center'>
        <div className='text-center'>
          {info.artist} - {info.title}
        </div>
        <Progress color='info' className='mini-progress mt-1' value={playingState.progress}>
        </Progress>
        <small>{readable_seconds(Math.floor(radio.current_pos))} / {readable_seconds(Math.floor(radio.current_len))}</small>
      </div>
    )
  }
}

export default view(MiniPlayer)
