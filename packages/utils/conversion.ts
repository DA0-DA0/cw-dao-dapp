import { fromBech32, toBech32, toHex } from '@cosmjs/encoding'
import { UseQueryResult } from '@tanstack/react-query'
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

import { getChainForChainId } from './chain'
import { IPFS_GATEWAY_TEMPLATE, SITE_URL } from './constants'

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
  const s = BigInt(num).toString()
  if (s.length >= target) {
    return s
  }
  return '0'.repeat(target - s.length) + s
}

export const spacePad = (number: string, target: number) =>
  number.length >= length ? number : ' '.repeat(target - number.length) + number

export const convertDurationWithUnitsToSeconds = ({
  units,
  value,
}: DurationWithUnits): number => {
  switch (units) {
    case DurationUnits.Seconds:
      return value
    case DurationUnits.Minutes:
      return value * 60
    case DurationUnits.Hours:
      return value * 60 * 60
    case DurationUnits.Days:
      return value * 60 * 60 * 24
    case DurationUnits.Weeks:
      return value * 60 * 60 * 24 * 7
    case DurationUnits.Months:
      return value * 60 * 60 * 24 * 30
    case DurationUnits.Years:
      return value * 60 * 60 * 24 * 365
    default:
      throw new Error(`Unsupported time duration unit: ${units}`)
  }
}

export const convertDurationWithUnitsToDuration = (
  durationWithUnits: DurationWithUnits
): Duration =>
  durationWithUnits.units === DurationUnits.Blocks
    ? {
        height: durationWithUnits.value,
      }
    : {
        time: convertDurationWithUnitsToSeconds(durationWithUnits),
      }

export const convertDurationToDurationWithUnits = (
  duration: Duration
): DurationWithUnits =>
  'height' in duration
    ? { units: DurationUnits.Blocks, value: duration.height }
    : convertSecondsToDurationWithUnits(duration.time)

// Use largest whole-number unit possible.
export const convertSecondsToDurationWithUnits = (
  seconds: number
): DurationWithUnits => {
  if (seconds % (60 * 60 * 24 * 365) === 0) {
    return {
      value: seconds / (60 * 60 * 24 * 365),
      units: DurationUnits.Years,
    }
  } else if (seconds % (60 * 60 * 24 * 30) === 0) {
    return {
      value: seconds / (60 * 60 * 24 * 30),
      units: DurationUnits.Months,
    }
  } else if (seconds % (60 * 60 * 24 * 7) === 0) {
    return {
      value: seconds / (60 * 60 * 24 * 7),
      units: DurationUnits.Weeks,
    }
  } else if (seconds % (60 * 60 * 24) === 0) {
    return {
      value: seconds / (60 * 60 * 24),
      units: DurationUnits.Days,
    }
  } else if (seconds % (60 * 60) === 0) {
    return {
      value: seconds / (60 * 60),
      units: DurationUnits.Hours,
    }
  } else if (seconds % 60 === 0) {
    return {
      value: seconds / 60,
      units: DurationUnits.Minutes,
    }
  } else {
    return {
      value: seconds,
      units: DurationUnits.Seconds,
    }
  }
}

export const convertDurationWithUnitsToHumanReadableString = (
  t: TFunction,
  { units, value }: DurationWithUnits
): string =>
  `${value.toLocaleString()} ${t(`unit.${units}`, {
    count: value,
  }).toLocaleLowerCase()}`

export const convertDurationToHumanReadableString = (
  t: TFunction,
  duration: Duration
) =>
  convertDurationWithUnitsToHumanReadableString(
    t,
    convertDurationToDurationWithUnits(duration)
  )

// Convert Recoil loadable into our generic data loader type with a default
// value on error. See the comment above the LoadingData type for more details.
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
      ? {
          loading: false,
          updating: 'updating' in loadable ? loadable.updating : undefined,
          data: loadable.contents,
        }
      : {
          loading: false,
          data: defaultValue,
        }
}

// Combine many data loaders into one.
export const combineLoadingDatas = <T>(
  ...loadables: LoadingData<T[]>[]
): LoadingData<T[]> =>
  loadables.some((l) => l.loading)
    ? {
        loading: true,
      }
    : {
        loading: false,
        data: loadables.flatMap((l) => (l.loading ? [] : l.data)),
      }

// Combine many data with error loaders into one.
export const combineLoadingDataWithErrors = <T>(
  ...loadables: LoadingDataWithError<T[]>[]
): LoadingDataWithError<T[]> =>
  loadables.some((l) => l.loading)
    ? {
        loading: true,
        errored: false,
      }
    : loadables.some((l) => l.errored)
      ? {
          loading: false,
          errored: true,
          // First error.
          error: loadables.flatMap((l) => (l.errored ? l.error : []))[0],
        }
      : {
          loading: false,
          errored: false,
          data: loadables.flatMap((l) =>
            l.loading || l.errored ? [] : l.data
          ),
        }

/**
 * Combine react-query results into LoadingData list. Filters out any errored
 * results.
 */
export const makeCombineQueryResultsIntoLoadingData =
  <T extends unknown = unknown, R extends unknown = T[]>({
    firstLoad = 'all',
    transform = (results: T[]) => results as R,
  }: {
    /**
     * Whether or not to show loading until all of the results are loaded, at
     * least one result is loaded, or none of the results are loaded. If 'one',
     * will show not loading (just updating) once the first result is loaded. If
     * 'none', will never show loading.
     *
     * Defaults to 'all'.
     */
    firstLoad?: 'all' | 'one' | 'none'
    /**
     * Optional transformation function that acts on combined list of data.
     */
    transform?: (results: T[]) => R
  } = {}) =>
  (results: UseQueryResult<T>[]): LoadingData<R> => {
    const isLoading =
      firstLoad === 'all'
        ? results.some((r) => r.isPending)
        : firstLoad === 'one'
          ? results.every((r) => r.isPending)
          : false

    if (isLoading) {
      return {
        loading: true,
      }
    } else {
      return {
        loading: false,
        updating: results.some((r) => r.isPending || r.isFetching),
        // Cast data to T if not pending since it's possible that data has
        // successfully loaded and returned undefined. isPending will be true if
        // data is not yet loaded.
        data: transform(
          results.flatMap((r) =>
            r.isPending || r.isError ? [] : [r.data as T]
          )
        ),
      }
    }
  }

/**
 * Combine react-query results into LoadingDataWithError list.
 */
export const makeCombineQueryResultsIntoLoadingDataWithError =
  <T extends unknown = unknown, R extends unknown = T[]>({
    firstLoad = 'all',
    loadIfNone = false,
    errorIf = 'any',
    transform = (results: T[]) => results as R,
  }: {
    /**
     * Whether or not to show loading until all of the results are loaded, at
     * least one result is loaded, or none of the results are loaded. If 'one',
     * will show not loading again (just updating) once the first result is
     * loaded. If 'none', will never show loading.
     *
     * Defaults to 'all'.
     */
    firstLoad?: 'all' | 'one' | 'none'
    /**
     * Whether or not to show loading when no queries are passed.
     *
     * Defaults to false.
     */
    loadIfNone?: boolean
    /**
     * Whether or not to show error if any of the results are errored or all. If
     * set to 'all' but only some of the results are errored, the errored
     * results will be filtered out of the data.
     *
     * Defaults to 'any'.
     */
    errorIf?: 'any' | 'all'
    /**
     * Optional transformation function that acts on combined list of data.
     */
    transform?: (results: T[]) => R
  } = {}) =>
  (results: UseQueryResult<T>[]): LoadingDataWithError<R> => {
    const isLoading =
      firstLoad === 'all'
        ? (loadIfNone && results.length === 0) ||
          results.some((r) => r.isPending)
        : firstLoad === 'one'
          ? results.length > 0 && results.every((r) => r.isPending)
          : false
    const isError =
      errorIf === 'any'
        ? results.some((r) => r.isError)
        : errorIf === 'all'
          ? results.length > 0 && results.every((r) => r.isError)
          : false

    if (isLoading) {
      return {
        loading: true,
        errored: false,
      }
    } else if (isError) {
      return {
        loading: false,
        errored: true,
        // First error.
        error: results.flatMap((r) => (r.isError ? r.error : []))[0],
      }
    } else {
      return {
        loading: false,
        errored: false,
        updating: results.some((r) => r.isPending || r.isFetching),
        // Cast data to T if not pending since it's possible that data has
        // successfully loaded and returned undefined. isPending will be true if
        // data is not yet loaded. Filter out errored data.
        data: transform(
          results.flatMap((r) =>
            r.isPending || r.isError ? [] : [r.data as T]
          )
        ),
      }
    }
  }

// Convert Recoil loadable into our generic data loader with error type. See the
// comment above the LoadingData type for more details.
export const loadableToLoadingDataWithError = <T>(
  loadable: CachedLoadable<T> | Loadable<T>
): LoadingDataWithError<T> =>
  loadable.state === 'loading' ||
  // If on server, start by loading to prevent hyration error.
  typeof window === 'undefined'
    ? { loading: true, errored: false }
    : loadable.state === 'hasValue'
      ? {
          loading: false,
          errored: false,
          updating: 'updating' in loadable ? loadable.updating : undefined,
          data: loadable.contents,
        }
      : {
          loading: false,
          errored: true,
          error: !loadable.contents
            ? new Error('Unknown error')
            : loadable.contents instanceof Error
              ? loadable.contents
              : new Error(`${loadable.contents}`),
        }

/**
 * Transform data stored in LoadingDataWithError type into another format.
 *
 * @param {LoadingDataWithError<T>} loadingDataWithError Data to convert.
 * @param {Function} transform Function to transform data from T to U.
 * @returns {LoadingDataWithError<U>}
 */
export const transformLoadingDataWithError = <T, U>(
  loadingDataWithError: LoadingDataWithError<T>,
  transform: (data: T) => U
): LoadingDataWithError<U> =>
  loadingDataWithError.loading || loadingDataWithError.errored
    ? loadingDataWithError
    : {
        loading: false,
        errored: false,
        updating: loadingDataWithError.updating,
        data: transform(loadingDataWithError.data),
      }

export const convertExpirationToDate = (
  blocksPerYear: number,
  expiration: Expiration,
  // For converting height to rough date.
  currentBlockHeight: number
): Date | undefined =>
  'at_height' in expiration && currentBlockHeight > 0 && blocksPerYear > 0
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

// Convert IPFS protocol URL to HTTPS protocol URL using IPFS gateway.
export const transformIpfsUrlToHttpsIfNecessary = (ipfsUrl: string) =>
  ipfsUrl.startsWith('ipfs://')
    ? IPFS_GATEWAY_TEMPLATE.replace('PATH', ipfsUrl.replace('ipfs://', ''))
    : ipfsUrl

const IPFS_CID_PREFIX_URL = /^https?:\/\/(.+)\.ipfs\.[^/]+(.*)$/

// Transform image URLs to ensure they can be accessed. They need to be using
// https protocol, not ipfs, and potentially from a whitelisted IPFS gateway.
// They only need to be from a whitelisted IPFS gateway if being used in a
// NextJS Image component (in which case proxy should also be set to true so
// that non-IPFS images are proxied through our whitelisted proxy domain).
export const toAccessibleImageUrl = (
  url: string,
  { proxy, replaceRelative }: { proxy?: boolean; replaceRelative?: boolean } = {
    proxy: false,
    replaceRelative: false,
  }
) => {
  // If hosted locally, passthrough (probably development/test env).
  if (url.startsWith('/')) {
    return replaceRelative ? SITE_URL + url : url
  }

  // Convert `https://CID.ipfs.<domain>` to our IPFS gateway because we have to
  // explicitly whitelist domains, and the CID is the part that changes. Except
  // use Stargaze's IPFS gateway since they pin NFT content.
  if (!url.includes('ipfs.stargaze.zone') && IPFS_CID_PREFIX_URL.test(url)) {
    const matches = url.match(IPFS_CID_PREFIX_URL)
    if (matches?.length === 3) {
      url = IPFS_GATEWAY_TEMPLATE.replace('PATH', matches[1] + matches[2])
      return url
    }
  }

  url = transformIpfsUrlToHttpsIfNecessary(url)

  // If this is not an IPFS image, we can't enforce that it is coming from one
  // of our NextJS allowed image sources. Thus proxy it through a whitelisted
  // domain. This only needs to be used for images that are displayed in the
  // NextJS Image component, which is why it is optional and off by default.
  if (
    proxy &&
    url.startsWith('http') &&
    !url.includes('ipfs.daodao.zone') &&
    !url.includes('ipfs.stargaze.zone') &&
    !url.includes('ipfs-gw.stargaze-apis.com')
  ) {
    url = `https://img-proxy.daodao.zone/?url=${encodeURIComponent(url)}`
  }

  return url
}

// Converts an address to its corresponding validator address.
export const toValidatorAddress = (address: string, bech32Prefix: string) => {
  try {
    return toBech32(bech32Prefix + 'valoper', fromBech32(address).data)
  } catch (err) {
    return ''
  }
}

// Convert bech32 address to general hex bech32 hash.
export const toBech32Hash = (address: string) => {
  try {
    return toHex(fromBech32(address).data)
  } catch (err) {
    return ''
  }
}

/**
 * Shrinks a string by slicing off the start and end and joining them with
 * ellipses. Useful for displaying addresses more compactly.
 */
export const abbreviateString = (
  str: string,
  /**
   * The number of characters at the beginning to keep. If `takeEnd` is
   * undefined, this applies to the end as well.
   */
  takeStartOrBoth: number,
  /**
   * The number of characters at the end to keep. If undefined,
   * `takeStartOrBoth` is used.
   */
  takeEnd?: number
): string => {
  takeEnd ??= takeStartOrBoth

  // Nothing to abbreviate if the string is as short as or shorter than the
  // abbreviated length, which is the start, end, and 2 periods.
  if (str.length <= takeStartOrBoth + takeEnd + 2) {
    return str
  }

  const first = str.substring(0, takeStartOrBoth)
  const last = str.substring(str.length - takeEnd, str.length)
  return [first, last].filter(Boolean).join('..')
}

/**
 * Shrinks an address by slicing off the start and end and joining them with
 * ellipses. Preserves the bech32 prefix in full.
 */
export const abbreviateAddress = (address: string, takeN = 4): string => {
  // Use bech32 prefix length to determine how much to truncate from beginning.
  let prefixLength
  try {
    prefixLength = fromBech32(address).prefix.length
  } catch (e) {
    // Conservative estimate.
    prefixLength = 8
  }

  return abbreviateString(address, prefixLength + takeN, takeN)
}

/**
 * Transform an address from one chain to another sharing the same bech32 data.
 *
 * WARNING: This should be used very sparingly if at all. Different chains may
 * use different derivation paths
 * (https://help.myetherwallet.com/en/articles/5867305-hd-wallets-and-derivation-paths),
 * which lead to addresses that do not share the same bech32 data. Thus, it is
 * unreliable to transform addresses and should not be done to find a user's
 * other wallet. While they do technically control all bech32 addresses that can
 * be derived from their private key, they may not be using the same bech32
 * address on a given chain, so we should just request the correct address for a
 * chain directly from their connected wallet whenever possible.
 */
export const transformBech32Address = (address: string, toChainId: string) =>
  toBech32(getChainForChainId(toChainId).bech32Prefix, fromBech32(address).data)
