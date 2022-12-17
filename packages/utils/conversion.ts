import { TFunction } from 'next-i18next'
import { Loadable } from 'recoil'

import {
  CachedLoadable,
  Duration,
  DurationUnits,
  DurationWithUnits,
  LoadingData,
  LoadingDataWithError,
} from '@dao-dao/types'
import { Expiration } from '@dao-dao/types/contracts/common'

import { IPFS_GATEWAY_TEMPLATE } from './constants'

export function convertMicroDenomToDenomWithDecimals(
  amount: number | string,
  decimals: number
) {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  amount = amount / Math.pow(10, decimals)
  return isNaN(amount) ? 0 : amount
}

export function convertDenomToMicroDenomWithDecimals(
  amount: number | string,
  decimals: number
) {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  // Need to round. Example: `8.029409 * Math.pow(10, 6)`.
  amount = Math.round(amount * Math.pow(10, decimals))
  return isNaN(amount) ? 0 : amount
}

export function convertFromMicroDenom(denom: string) {
  return denom?.substring(1).toUpperCase()
}

export function convertToFixedDecimals(amount: number | string): string {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  if (amount > 0.01) {
    return amount.toFixed(2)
  } else return String(amount)
}

export const expirationAtTimeToSecondsFromNow = (exp: Expiration) => {
  if (!('at_time' in exp)) {
    return
  }

  const end = Number(exp['at_time'])
  const nowSeconds = new Date().getTime() / 1000
  const endSeconds = end / 1000000000

  return endSeconds - nowSeconds
}

export const zeroPad = (num: number, target: number) => {
  const s = num.toString()
  if (s.length >= target) {
    return s
  }
  return '0'.repeat(target - s.length) + s
}

export const spacePad = (number: string, target: number) =>
  number.length >= length ? number : ' '.repeat(target - number.length) + number

export const convertDurationWithUnitsToDuration = ({
  units,
  value,
}: DurationWithUnits): { time: number } => {
  let time
  switch (units) {
    case DurationUnits.Seconds:
      time = value
      break
    case DurationUnits.Minutes:
      time = value * 60
      break
    case DurationUnits.Hours:
      time = value * 60 * 60
      break
    case DurationUnits.Days:
      time = value * 60 * 60 * 24
      break
    case DurationUnits.Weeks:
      time = value * 60 * 60 * 24 * 7
      break
    default:
      throw new Error(`Unsupported duration unit: ${units}`)
  }
  return { time }
}

export const convertDurationWithUnitsToHumanReadableString = (
  t: TFunction,
  { units, value }: DurationWithUnits
): string =>
  `${value} ${t(`unit.${units}`, {
    count: value,
  }).toLocaleLowerCase()}`

// Convert Recoil loadable into our generic data loader type.
export const loadableToLoadingData = <T>(
  loadable: CachedLoadable<T> | Loadable<T>,
  defaultValue: T,
  onError?: (error: any) => void
): LoadingData<T> => {
  if (loadable.state === 'hasError') {
    onError?.(loadable.contents)
  }

  return loadable.state === 'loading' ||
    // If on server, start by loading to prevent hyration error.
    typeof window === 'undefined'
    ? { loading: true }
    : loadable.state === 'hasValue'
    ? { loading: false, data: loadable.contents }
    : { loading: false, data: defaultValue }
}

// Convert Recoil loadable into our generic data loader with error type.
export const loadableToLoadingDataWithError = <T>(
  loadable: CachedLoadable<T> | Loadable<T>
): LoadingDataWithError<T> => {
  return loadable.state === 'loading' ||
    // If on server, start by loading to prevent hyration error.
    typeof window === 'undefined'
    ? { loading: true, errored: false }
    : loadable.state === 'hasValue'
    ? { loading: false, errored: false, data: loadable.contents }
    : { loading: false, errored: true, error: loadable.contents }
}

export const convertExpirationToDate = (
  blocksPerYear: number,
  expiration: Expiration,
  // For converting height to rough date.
  currentBlockHeight: number
): Date | undefined =>
  'at_height' in expiration && currentBlockHeight > 0
    ? new Date(
        Date.now() +
          convertBlocksToSeconds(
            blocksPerYear,
            expiration.at_height - currentBlockHeight
          ) *
            1000
      )
    : 'at_time' in expiration
    ? // Timestamp is in nanoseconds, convert to microseconds.
      new Date(Number(expiration.at_time) / 1e6)
    : undefined

export const convertBlocksToSeconds = (blocksPerYear: number, blocks: number) =>
  Math.round((blocks / blocksPerYear) * 365 * 24 * 60 * 60)

export const convertSecondsToBlocks = (
  blocksPerYear: number,
  seconds: number
) => Math.round((seconds * blocksPerYear) / (365 * 24 * 60 * 60))

export const durationToSeconds = (blocksPerYear: number, duration: Duration) =>
  'height' in duration
    ? convertBlocksToSeconds(blocksPerYear, duration.height)
    : duration.time

// Use Stargaze's IPFS gateway.
export const transformIpfsUrlToHttpsIfNecessary = (ipfsUrl: string) =>
  ipfsUrl.startsWith('ipfs://')
    ? IPFS_GATEWAY_TEMPLATE.replace('PATH', ipfsUrl.replace('ipfs://', ''))
    : ipfsUrl
