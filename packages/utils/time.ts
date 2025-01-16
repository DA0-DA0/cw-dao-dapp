import { DateTime } from 'luxon'

const secPerDay = 24 * 60 * 60
export const secondsToWdhms = (
  seconds: string | number,
  // Set to 5 or more to display all units.
  numUnits = 2
): string => {
  const secondsInt = Math.ceil(Number(seconds))
  if (secondsInt === 0) {
    return '0 seconds'
  }

  const w = Math.floor(secondsInt / (secPerDay * 7))
  const d = Math.floor((secondsInt % (secPerDay * 7)) / secPerDay)
  const h = Math.floor((secondsInt % secPerDay) / 3600)
  const m = Math.floor((secondsInt % 3600) / 60)
  const s = Math.floor(secondsInt % 60)

  const wDisplay = w ? w + ' ' + 'week' + (w === 1 ? '' : 's') : null
  const dDisplay = d ? d + ' day' + (d === 1 ? '' : 's') : null
  const hDisplay = h ? h + ' ' + 'hour' + (h === 1 ? '' : 's') : null
  const mDisplay = m ? m + ' ' + 'minute' + (m === 1 ? '' : 's') : null
  const sDisplay = s ? s + ' ' + 'second' + (s === 1 ? '' : 's') : null

  return (
    [wDisplay, dDisplay, hDisplay, mDisplay, sDisplay]
      // Ignore empty values.
      .filter(Boolean)
      // Only keep certain precision of units.
      .slice(0, numUnits)
      // Separate with commas.
      .join(', ')
  )
}

// Converts Date to string from the current point with no sign.
// Example: dateToWdhms(new Date(Date.now() + 1000)) === '1 second'
//          dateToWdhms(new Date(Date.now() - 1000)) === '1 second'
export const dateToWdhms = (date: Date, numUnits = 2) =>
  secondsToWdhms(Math.abs(date.getTime() - Date.now()) / 1000, numUnits)

// Converts number in seconds to time format mm:ss. Clock format.
export const secondsToMmSs = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${`0${Math.floor(seconds % 60)}`.slice(-2)}`

/**
 * Get the most recent value at or before the given timestamp.
 *
 * @param data An array of values sorted by timestamp in ascending order.
 * @param timestamp The timestamp to find the value at or before.
 * @returns The most recent value at or before the given timestamp.
 */
export const findValueAtTimestamp = <Value extends { timestamp: number }>(
  data: Value[],
  timestamp: number
): Value | undefined => {
  // Find the most recent value at or before this timestamp. Since they are
  // ascending, get the first one after the timestamp, and then choose the one
  // before.
  const nextIndex = data.findIndex(
    ({ timestamp: dataTimestamp }) => dataTimestamp > timestamp
  )

  // If there is no value after this timestamp, use the last value.
  return nextIndex === -1
    ? data[data.length - 1]
    : // If the first value is after this timestamp, there is no matching item.
      nextIndex === 0
      ? undefined
      : // Otherwise just use the previous value.
        data[nextIndex - 1]
}

/**
 * Check whether or not the browser uses 12-hour time with AM/PM.
 */
export const browserIs12Hour = () =>
  new Intl.DateTimeFormat(navigator.language, {
    hour: 'numeric',
  })
    .formatToParts()
    .some((part) => part.type === 'dayPeriod')

/**
 * Get current browser's time zone abbreviation.
 */
export const browserTimeZone = () => DateTime.local().toFormat('ZZZZ')
