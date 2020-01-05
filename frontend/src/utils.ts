import format from 'date-fns/format'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import fromUnixTime from 'date-fns/fromUnixTime'
import parseISO from 'date-fns/parseISO'
import { useEffect, useState, useRef } from 'react'
import { css } from 'emotion'

export const containerWidthStyle = css`
  @media (min-width: 992px) {
    width: 960px;
  }

  @media (min-width: 1200px) {
    width: 960px;
  }
`

export const navbarMarginStyle = css`
  margin-top: 8rem;
`

export function readableFilesize(size: number): string {
  let i = -1
  const byteUnits = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let s = size
  do {
    s = s / 1024
    i += 1
  } while (s > 1024)
  return (Math.max(s, 0.1).toFixed(2) + byteUnits[i]).toString()
}

export function readableSeconds(seconds: number): string {
  return format(fromUnixTime(Math.max(0, Math.floor(seconds))), 'm:ss')
}

export function fuzzyTime(time: string): string {
  return formatDistanceToNow(parseISO(time), { addSuffix: true })
}

export const useDelayedLoader = (
  loading: boolean
): [boolean, (value: boolean) => void] => {
  const [localLoading, setLoading] = useState(loading)
  const [showLoader, setShowLoader] = useState(loading)

  useEffect(() => {
    if (localLoading) {
      setShowLoader(true)
    }

    // Show loader a bits longer to avoid loading flash
    if (!localLoading && showLoader) {
      const timeout = setTimeout(() => {
        setShowLoader(false)
      }, 400)

      return () => {
        clearTimeout(timeout)
      }
    }

    return () => {}
  }, [localLoading, showLoader])

  return [showLoader, setLoading]
}

export const useIsMounted = () => {
  const isMounted = useRef(false)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])
  return isMounted
}

export function useLocalStorage(key: string, initialValue: any) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // If error also return initialValue
      console.log(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: any | ((value: any) => any)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      // Save state
      setStoredValue(valueToStore)
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error)
    }
  }

  return [storedValue, setValue]
}
