import createUseContext from 'constate'
import { useCallback, useEffect, useState } from 'react'
import { ApiResponse, SettingsJson } from '/api/Schemas'
import { API_BASE, playingState } from '/store'
import { useLocalStorage } from '/utils'

function useSettings() {
  const [stylesheet, setStylesheet] = useLocalStorage<string>('css', '')
  const [styles, setStyles] = useState<{ [k: string]: string } | null>(null)
  const [icecast, setIcecast] = useState({
    mount: '',
    url: ''
  })
  const [title, setTitle] = useState<string>('')
  const [canDownload, setCanDownload] = useState<boolean>(false)
  const [canUpload, setCanUpload] = useState<boolean>(false)

  const fetchSettings = useCallback(() => {
    fetch(`${API_BASE}/settings`)
      .then(resp => resp.clone().json())
      .then((resp: ApiResponse<SettingsJson>) => {
        if (stylesheet === '') {
          // only set if user hasn't already set one.
          setStylesheet(resp.css)
        }
        setStyles(resp.styles)
        setIcecast(resp.icecast)
        setTitle(resp.title)
        setCanDownload(resp.downloads_enabled)
        setCanUpload(resp.uploads_enabled)
      })
  }, [stylesheet])

  // fetch settings on first use
  useEffect(() => {
    fetchSettings()
  }, [])

  // set document title
  useEffect(() => {
    if (!playingState.playing) document.title = title
  }, [playingState.playing, title])

  // set stylesheet
  useEffect(() => {
    const link = document.getElementById(
      'change_stylesheet'
    ) as HTMLLinkElement | null
    if (link) link.href = stylesheet
  }, [stylesheet])

  return {
    fetchSettings,
    stylesheet,
    setStylesheet,
    styles,
    icecast,
    title,
    canDownload,
    canUpload,
    getStreamUrl: useCallback(() => icecast.url + icecast.mount, [icecast])
  }
}

export const useSettingsContext = createUseContext(useSettings)
