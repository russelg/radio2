import createUseContext from 'constate'
import { useEffect, useState } from 'react'
import { API_BASE } from '/api'
import { ApiResponse, SettingsJson } from '/api/Schemas'
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

  const fetchSettings = () => {
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
  }

  // fetch settings on first use
  useEffect(() => {
    fetchSettings()
  }, [])

  // set document title
  useEffect(() => {
    document.title = title
  }, [title])

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
    streamUrl: icecast.url + icecast.mount
  }
}

export const useSettingsContext = createUseContext(useSettings)
