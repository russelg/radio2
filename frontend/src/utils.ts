import moment from 'moment'

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
  return moment.utc(seconds * 1000).format('m:ss')
}

export function fuzzyTime(time: moment.MomentInput): string {
  return moment(time).fromNow()
}
