import createUseContext from 'constate'
import { useCallback, useState } from 'react'
import { API_BASE } from '/api'
import { ApiResponse, NowPlayingJson, NowPlayingSong } from '/api/Schemas'
import { useControlContext } from '/contexts/control'

export const SYNC_OFFSET = 4

type SongInfo = {
  length: number
  serverTime: number
  startTime: number
  endTime: number
  artist: string
  title: string
  id: string
  requested: boolean
}

type ServerInfo = {
  listeners: number
  totalSongs: number
  totalPlays: number
  totalSize: number
  queue: NowPlayingSong[]
  lastPlayed: NowPlayingSong[]
}

function transformNowPlaying(
  resp: ApiResponse<NowPlayingJson>
): {
  songInfo: SongInfo
  serverInfo: ServerInfo
} {
  return {
    songInfo: {
      length: resp.len,
      serverTime: resp.current,
      startTime: resp.start_time,
      endTime: resp.end_time,
      artist: resp.artist,
      title: resp.title,
      id: resp.id,
      requested: resp.requested
    },
    serverInfo: {
      listeners: resp.listeners,
      totalSongs: resp.total_songs,
      totalPlays: resp.total_plays,
      totalSize: resp.total_size,
      queue: resp.queue,
      lastPlayed: resp.lp
    }
  }
}

function useRadioInfo() {
  const { shouldFetchInfo } = useControlContext()

  const [songInfo, setSongInfo] = useState<SongInfo>({
    length: 0,
    serverTime: 0,
    startTime: 0,
    endTime: 0,
    artist: '',
    title: '',
    id: '',
    requested: false
  })

  const [serverInfo, setServerInfo] = useState<ServerInfo>({
    listeners: 0,
    totalSongs: 0,
    totalPlays: 0,
    totalSize: 0,
    queue: [],
    lastPlayed: []
  })

  const fetchInfo = useCallback(() => {
    // add check for if not on main page
    if (shouldFetchInfo) {
      fetch(`${API_BASE}/np`)
        .then(resp => resp.clone().json())
        .then(transformNowPlaying)
        .then(({ songInfo, serverInfo }) => {
          setSongInfo(songInfo)
          setServerInfo(serverInfo)
        })
    }
  }, [shouldFetchInfo])

  return {
    songInfo,
    serverInfo,
    fetchInfo
  }
}

export const useRadioInfoContext = createUseContext(useRadioInfo)
