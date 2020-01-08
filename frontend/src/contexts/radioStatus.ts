import createUseContext from 'constate'
import { useCallback, useEffect, useState } from 'react'
import { SYNC_OFFSET, useRadioInfoContext } from '/contexts/radio'
import { useInterval } from '/utils'

type RadioInfo = {
  counter: number
  syncSeconds: number
  progress: number
  progressIncrement: number
  position: number
  duration: number
}

function useRadioStatusHook(callback: () => void) {
  const [radioStatus, setRadioStatus] = useState<RadioInfo>({
    counter: 0.0,
    syncSeconds: 0,
    progress: 0.0,
    progressIncrement: 0.0,
    position: 0,
    duration: 0
  })

  const updateProgress = useCallback(
    (start: number, end: number, serverTime: number): void => {
      if (end !== 0) {
        const clientTime = Math.round(new Date().getTime() / 1000.0)
        const syncSeconds = serverTime - clientTime
        const localStart = start + syncSeconds
        const localEnd = end + syncSeconds
        const duration = localEnd - localStart
        const position = clientTime - localStart
        const progress = (100 / duration) * position
        const progressIncrement = (100 / duration) * 0.5
        setRadioStatus(radioStatus => ({
          ...radioStatus,
          syncSeconds,
          duration,
          position,
          progress,
          progressIncrement
        }))
      } else {
        setRadioStatus(radioStatus => ({
          ...radioStatus,
          progress: 0
        }))
      }
    },
    []
  )

  useInterval(() => {
    let progress = 0
    if (radioStatus.progress > 0) {
      progress = radioStatus.progress + radioStatus.progressIncrement
    }

    let counter = radioStatus.counter + 0.5
    const position = radioStatus.position + 0.5

    // reset counter if reaches 5 seconds, or song changes ...
    // ... and run the provided callback (intention is to allow data fetching)
    if (counter >= 5 || position > radioStatus.duration) {
      counter = 0.0
      callback()
    }

    setRadioStatus(radioStatus => ({
      ...radioStatus,
      progress,
      counter,
      position
    }))
  }, 500)

  return { radioStatus, updateProgress }
}

function useRadioStatus() {
  const { songInfo, fetchInfo } = useRadioInfoContext()

  // run fetchInfo every 5 seconds as callback
  const radioStatusHook = useRadioStatusHook(fetchInfo)

  // when songInfo changes, update radio info
  useEffect(() => {
    radioStatusHook.updateProgress(
      songInfo.startTime + SYNC_OFFSET,
      songInfo.endTime + SYNC_OFFSET,
      songInfo.serverTime
    )
  }, [songInfo])

  return { ...radioStatusHook }
}

export const useRadioStatusContext = createUseContext(useRadioStatus)
