import React from 'react'
import { view } from 'react-easy-state'
import { playingState } from '../store'
import { Progress } from 'reactstrap'
import { readableSeconds } from '../utils'

import './MiniPlayer.css'

class MiniPlayer extends React.Component {
  render() {
    const { info, radio } = playingState

    return (
      <div className="navbar-text text-center">
        <div className="text-center">
          {info.artist} - {info.title}
        </div>
        <Progress
          color="info"
          className="mini-progress mt-1"
          value={playingState.progress}
        />
        <small>
          {readableSeconds(Math.floor(radio.current_pos))} /{' '}
          {readableSeconds(Math.floor(radio.current_len))}
        </small>
      </div>
    )
  }
}

export default view(MiniPlayer)
