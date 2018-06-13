import moment from 'moment'

export function readable_filesize(fileSizeInBytes) {
  let i = -1
  let byteUnits = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  do {
    fileSizeInBytes = fileSizeInBytes / 1024
    i++
  } while (fileSizeInBytes > 1024)
  return (Math.max(fileSizeInBytes, 0.1).toFixed(2) + byteUnits[i]).toString()
}

export function readable_seconds(seconds) {
  let hours = Math.floor(seconds / 3600)
  let mins = Math.floor((seconds % 3600) / 60)
  let secs = Math.floor((seconds % 3600) % 60)
  return (
      hours > 0 ? +
          (hours < 10 ? '0' : '') +
        hours + ':' : '') +
    (mins < 10 ? '0' : '') +
    mins + ':' +
    (secs < 10 ? '0' : '') + secs
}

export function fuzzy_time(time) {
  return moment(time).fromNow()
}

export const ConditionalWrap = ({condition, wrap, children}) => condition ? wrap(children) : children
