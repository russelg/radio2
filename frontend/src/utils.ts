import format from 'date-fns/format'
import fromUnixTime from 'date-fns/fromUnixTime'
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import parseISO from 'date-fns/parseISO'

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
  return format(fromUnixTime(Math.max(0, seconds)), 'm:ss')
}

export function fuzzyTime(time: string): string {
  return formatDistanceToNow(parseISO(time), { addSuffix: true })
}
