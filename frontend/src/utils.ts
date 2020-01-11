import format from 'date-fns/format'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import fromUnixTime from 'date-fns/fromUnixTime'
import parseISO from 'date-fns/parseISO'
import { css } from 'emotion'
import { useEffect, useRef, useState } from 'react'

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
  try {
    return format(fromUnixTime(Math.max(0, Math.floor(seconds))), 'm:ss')
  } catch {
    // time was invalid, return a default
    return '0:00'
  }
}

export function fuzzyTime(time: string): string {
  return formatDistanceToNow(parseISO(time), { addSuffix: true })
}

type JWT = {
  ait: number
  nbf: number
  jti: number
  exp: number
  fresh?: boolean
  type: 'access' | 'refresh'
}

type JWTClaims<T> = {
  user_claims: T
}

export function parseJwt<T>(token: string): (JWT & JWTClaims<T>) | null {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  )

  try {
    return JSON.parse(jsonPayload)
  } catch {
    // just give up if there are any errors
    return null
  }
}

export const useDelayedLoader = (
  loading: boolean,
  delay: number = 400
): [boolean, (value: boolean) => void] => {
  const [localLoading, setLoading] = useState(loading)
  const [showLoader, setShowLoader] = useState(loading)

  useEffect(() => {
    setLoading(loading)
  }, [loading])

  useEffect(() => {
    if (localLoading) setShowLoader(true)
    // Show loader a bits longer to avoid loading flash
    if (!localLoading && showLoader) {
      const timeout = setTimeout(() => {
        setShowLoader(false)
      }, delay)
      return () => clearTimeout(timeout)
    }
    return () => {}
  }, [localLoading, showLoader, delay])

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

// https://usehooks.com/useLocalStorage/
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: any | ((value: any) => any)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key)
      // Parse stored json or if none return initialValue
      try {
        if (item) return JSON.parse(item)
      } catch (error) {
        return item
      }
      return initialValue
    } catch (error) {
      console.log(error)
      // If error also return initialValue
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: any | ((value: any) => any)): void => {
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

// babakness/use-interval.ts
// https://gist.github.com/babakness/faca3b633bc23d9a0924efb069c9f1f5
type IntervalFunction = () => unknown | void
export function useInterval(callback: IntervalFunction, delay: number) {
  const savedCallback = useRef<IntervalFunction | null>(null)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  })

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current !== null) {
        savedCallback.current()
      }
    }
    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay])
}
