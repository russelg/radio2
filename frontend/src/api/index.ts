import { useEffect, useState } from 'react'

export interface ApiHook<T> {
  data: T | null
  loading: boolean
  errors: boolean | any
}

export function useFetch<T>(
  url: string,
  options: object = {},
  params: any[] = []
): ApiHook<T> {
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(null)
  const [responseData, setResponseData] = useState(null as T | null)

  async function fetchData() {
    const resp = await fetch(url, options)
    resp
      .json()
      .then((res: T) => {
        setResponseData(res)
        setLoading(false)
      })
      .catch(err => {
        setErrors(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, params)

  return { loading, errors, data: responseData }
}
