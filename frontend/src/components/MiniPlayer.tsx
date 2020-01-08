import { css, cx } from 'emotion'
import React, { FunctionComponent } from 'react'
import { Progress } from 'reactstrap'
import { useRadioInfoContext } from '/contexts/radio'
import { useRadioStatusContext } from '/contexts/radioStatus'
import { readableSeconds } from '/utils'

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
  const { songInfo } = useRadioInfoContext()
  const { radioStatus } = useRadioStatusContext()

  return (
    <div className="p-0 navbar-text text-center">
      <div className={cx(songMetadata, 'text-center')}>
        {songInfo.artist} - {songInfo.title}
      </div>
      <Progress
        color="info"
        className={cx(miniProgress, 'mt-1')}
        value={radioStatus.progress + radioStatus.progressIncrement}
      />
      <small>
        {readableSeconds(Math.floor(radioStatus.position))} /{' '}
        {readableSeconds(Math.floor(radioStatus.duration))}
      </small>
    </div>
  )
}

export default MiniPlayer
