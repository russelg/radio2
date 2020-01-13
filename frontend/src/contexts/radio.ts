import createUseContext from 'constate'
import { useEffect, useState } from 'react'
import { API_BASE } from '/api'
import {
  ApiResponse,
  NowPlayingJson,
  NowPlayingSong,
  SongItem
} from '/api/Schemas'
import { useAuthState } from '/contexts/auth'
import { useControlState } from '/contexts/control'

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
  const { shouldFetchNowPlaying } = useControlState()
  const { loggedIn } = useAuthState()

  const [favourited, setFavourited] = useState<boolean>(false)
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

  const fetchFavourited = (id: string) => {
    fetch(`${API_BASE}/song/${id}`)
      .then(resp => resp.clone().json())
      .then((resp: ApiResponse<SongItem>) => {
        setFavourited(resp.meta.favourited || false)
      })
  }

  useEffect(() => {
    setFavourited(false)
    if (loggedIn && songInfo.id) fetchFavourited(songInfo.id)
  }, [songInfo.id, loggedIn])

  const fetchInfo = () => {
    // add check for if not on main page
    if (shouldFetchNowPlaying) {
      fetch(`${API_BASE}/np`)
        .then(resp => resp.clone().json())
        .then(transformNowPlaying)
        .then(({ songInfo, serverInfo }) => {
          setSongInfo(songInfo)
          setServerInfo(serverInfo)
        })
    }
  }

  return {
    songInfo,
    serverInfo,
    fetchInfo,
    favourited,
    setFavourited
  }
}

export const useRadioInfoContext = createUseContext(useRadioInfo)
