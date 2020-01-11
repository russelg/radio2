import React, { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ApiBaseResponse } from '/api/Schemas'
import NotificationToast from '/components/NotificationToast'

export const API_BASE: string = '/api/v1'

export interface ApiHook<T> {
  data?: T
  loading: boolean
  errors: any
  response: Res<T>
  run: (options?: object) => Promise<any>
  runUrl: (url: string, options?: object) => Promise<any>
}

export interface Res<T> extends Response {
  data?: T
}

const onAbort = () => {}

export function useFetch<T>(
  url: string,
  options: object = {},
  params?: any[]
): ApiHook<T> {
  const controller = useRef<AbortController>()
  const res = useRef<Res<T>>({} as Res<T>)
  const data = useRef<T | undefined>(undefined)

  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<any>()

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const makeFetch = useCallback(() => {
    const fetchData = async (newUrl?: string, inputOptions = {}) => {
      controller.current = new AbortController()
      controller.current.signal.onabort = onAbort

      setLoading(true)
      setErrors(undefined)

      try {
        const resp = await fetch(newUrl || url, {
          ...defaultOptions,
          ...options,
          ...inputOptions
        })
        res.current = resp.clone()
        res.current.data = await resp.json()
        data.current = res.current.data
      } catch (err) {
        setErrors(err)
        throw err
      } finally {
        controller.current = undefined
        setLoading(false)
      }

      return data.current
    }

    return fetchData
  }, [url, options])

  // onMount or onUpdate
  useEffect(() => {
    if (params && Array.isArray(params)) {
      setLoading(true)
      makeFetch()(url, options)
    }
  }, params)

  // abort on unmount
  useEffect(() => () => controller.current && controller.current.abort(), [])

  return {
    loading,
    errors,
    data: data.current,
    response: res.current,
    run: (options = {}) => makeFetch()(url, options),
    runUrl: (newUrl, options = {}) => makeFetch()(newUrl, options)
  }
}

export const handleResponse = <T extends ApiBaseResponse>(
  result: T,
  sendToast: boolean = true
): Promise<T> => {
  if (result === undefined) {
    return Promise.reject({
      description: 'Error occured while loading response'
    })
  }
  const error = result.error !== null
  const msg = result.description || ''
  if (typeof msg === 'string' && !error && sendToast) {
    toast(<NotificationToast>{msg}</NotificationToast>)
  }
  return error ? Promise.reject(result) : Promise.resolve(result)
}
