import moment from 'moment'

export function readableFilesize(size: number): string {
  let i = -1
  let byteUnits = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  do {
    size = size / 1024
    i++
  } while (size > 1024)
  return (Math.max(size, 0.1).toFixed(2) + byteUnits[i]).toString()
}

export function readableSeconds(seconds: number): string {
  let hours = Math.floor(seconds / 3600)
  let mins = Math.floor((seconds % 3600) / 60)
  let secs = Math.floor((seconds % 3600) % 60)
  return (
    (hours > 0 ? +(hours < 10 ? '0' : '') + hours + ':' : '') +
    (mins < 10 ? '0' : '') +
    mins +
    ':' +
    (secs < 10 ? '0' : '') +
    secs
  )
}

export function fuzzyTime(time: moment.MomentInput): string {
  return moment(time).fromNow()
}
