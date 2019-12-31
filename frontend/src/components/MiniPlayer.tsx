import React, { FunctionComponent } from 'react'
import { view } from 'react-easy-state'
import { Progress } from 'reactstrap'
import { playingState } from '/store'
import { readableSeconds } from '/utils'
import { css, cx } from 'emotion'

const breakpoints = css`
  @media (max-width: 576px) {
    width: 50vw;
  }
  @media (max-width: 476px) {
    width: 40vw;
  }
`

const miniProgress = css`
  width: 320px;
  height: 0.35rem;
  ${breakpoints};
`

const songMetadata = css`
  width: 320px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  ${breakpoints};
`

const MiniPlayer: FunctionComponent = () => {
  const { info, radio } = playingState

  return (
    <div className="p-0 navbar-text text-center">
      <div className={cx(songMetadata, 'text-center')}>
        {info.artist} - {info.title}
      </div>
      <Progress
        color="info"
        className={cx(miniProgress, 'mt-1')}
        value={playingState.progress}
      />
      <small>
        {readableSeconds(Math.floor(radio.current_pos))} /{' '}
        {readableSeconds(Math.floor(radio.current_len))}
      </small>
    </div>
  )
}

export default view(MiniPlayer)
