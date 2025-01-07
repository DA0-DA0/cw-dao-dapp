// Format a percent that has already been converted to percentage units
// (i.e. it is not in decimal form; passing in 5 outputs 5%, not 500%).
// Examples:
// 5       --> 5%
// 5.12345 --> 5.1234%
// 0.15    --> 0.15%
// 23.4852 --> 23.49%

import { TFunction } from 'react-i18next'

import { Expiration } from '@dao-dao/types'

import { convertExpirationToDate } from './conversion'

// 23.4952 --> 23.5%
export const formatPercentOf100 = (
  percentOf100: number | string,
  maximumSignificantDigits = 4
) =>
  Number(percentOf100).toLocaleString(undefined, {
    maximumSignificantDigits,
  }) + '%'

export const dateFormatterNoDay = new Intl.DateTimeFormat('default', {
  month: 'long',
  day: undefined,
  year: 'numeric',
})
export const dateFormatterNoYear = new Intl.DateTimeFormat('default', {
  month: 'long',
  day: 'numeric',
  year: undefined,
})
export const dateFormatterDayAndYear = new Intl.DateTimeFormat('default', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

// If this year, add date in month and ignore year. Otherwise, add year and
// ignore date in month. If both is true, add both day and year.
export const formatDate = (date: Date, both = false) =>
  (both
    ? dateFormatterDayAndYear
    : date.getFullYear() === new Date().getFullYear()
      ? dateFormatterNoYear
      : dateFormatterNoDay
  ).format(date)

// Shows month and date. Adds year if not this year.
export const formatDateWithDayAndMaybeYear = (date: Date) =>
  (date.getFullYear() === new Date().getFullYear()
    ? dateFormatterNoYear
    : dateFormatterDayAndYear
  ).format(date)

export const dateTimeFormatter = new Intl.DateTimeFormat('default', {
  dateStyle: 'short',
  timeStyle: 'short',
})
export const formatDateTime = (date: Date) => dateTimeFormatter.format(date)

export const longDateTimeFormatter = new Intl.DateTimeFormat('default', {
  dateStyle: 'long',
  timeStyle: 'short',
})
export const formatLongDateTime = (date: Date) =>
  longDateTimeFormatter.format(date)

export const dateTimeTzFormatter = new Intl.DateTimeFormat('default', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})
export const formatDateTimeTz = (date: Date) => dateTimeTzFormatter.format(date)

export const timeFormatter = new Intl.DateTimeFormat('default', {
  timeStyle: 'short',
})
export const formatTime = (date: Date) => timeFormatter.format(date)

export const isoStringForLocalDateString = (dateString: string) =>
  new Date(dateString).toISOString()

// TODO(huge): replace with HugeDecimal
// Select number of decimal digits, rounding down / truncating.
export const toFixedDown = (value: number, digits: number) => {
  // If contains scientific notation, truncate and use BigInt to get rid of it.
  let stringifiedValue = value.toString()
  if (stringifiedValue.includes('e')) {
    stringifiedValue = BigInt(Math.floor(value)).toString()
  }

  const re = new RegExp('(\\d+\\.\\d{' + digits + '})(\\d)')
  const matches = stringifiedValue.match(re)
  return matches ? parseFloat(matches[1]) : value
}

/**
 * Format an expiration as human readable.
 */
export const formatExpiration = (t: TFunction, expiration: Expiration) =>
  'never' in expiration
    ? t('info.na')
    : 'at_height' in expiration
      ? t('info.blockHeightValue', {
          height: expiration.at_height.toLocaleString(),
        })
      : formatDateTimeTz(
          // always returns date when 'at_time' is used
          convertExpirationToDate(
            // Unused
            0,
            expiration,
            // Unused
            0
          )!
        )
