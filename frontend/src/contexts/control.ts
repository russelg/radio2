import createUseContext from 'constate'
import { useCallback, useState } from 'react'
import { useLocalStorage } from '/utils'

function useControl() {
  const [playing, setPlaying] = useState<boolean>(false)
  const togglePlaying = useCallback(() => {
    setPlaying(playing => !playing)
  }, [])

  const [volume, setVolume] = useLocalStorage<number>('volume', 80)

  const [shouldFetchInfo, setShouldFetchInfo] = useState<boolean>(true)

  return {
    playing,
    togglePlaying,
    volume,
    setVolume,
    shouldFetchInfo,
    setShouldFetchInfo
  }
}

export const useControlContext = createUseContext(useControl)
