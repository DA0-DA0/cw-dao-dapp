import {
  Duration,
  Threshold as DaoThreshold,
  ThresholdResponse,
} from '@dao-dao/types/contracts/cw3-dao'
import { Threshold as SigThreshold } from '@dao-dao/types/contracts/cw3-multisig'

import { NATIVE_DECIMALS, NATIVE_DENOM } from './constants'

import ibcAssets from './ibc_assets.json'

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
): string {
  if (typeof amount === 'string') {
    amount = Number(amount)
  }
  amount = amount * Math.pow(10, decimals)
  return isNaN(amount) ? '0' : String(amount)
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

export function convertDenomToHumanReadableDenom(denom: string): string {
  if (denom.startsWith('u')) {
    return denom.substring(1)
  }
  return denom
}

export function convertDenomToContractReadableDenom(denom: string): string {
  if (denom.startsWith('u')) {
    return denom
  }
  return 'u' + denom
}

export const zeroVotingCoin = {
  amount: '0',
  denom: 'ucredits',
}

export const zeroStakingCoin = {
  amount: '0',
  denom: process.env.NEXT_PUBLIC_STAKING_DENOM || 'ujuno',
}

export const thresholdString = (
  t: ThresholdResponse | DaoThreshold | SigThreshold,
  multisig: boolean,
  tokenDecimals: number
) => {
  if ('absolute_count' in t) {
    const count = t.absolute_count.weight
    return `${
      multisig
        ? count
        : convertMicroDenomToDenomWithDecimals(count, tokenDecimals)
    } vote${count != 1 ? 's' : ''}`
  } else if ('absolute_percentage' in t) {
    const threshold = t.absolute_percentage.percentage
    return `${Number(threshold) * 100}%`
  } else if ('threshold_quorum' in t) {
    const quorum = t.threshold_quorum.quorum
    const threshold = t.threshold_quorum.threshold
    return `${quorum}% quorum; ${threshold}% threshold`
  } else {
    return 'unknown'
  }
}

export function humanReadableDuration(d: Duration) {
  if ('height' in d) {
    return `${d.height} blocks`
  }
  if (d.time == 0) {
    return '0 seconds'
  }
  return `${secondsToHms(d.time.toString())}`
}

export function secondsToHms(seconds: string): string {
  const secondsInt = Number(seconds)
  const h = Math.floor(secondsInt / 3600)
  const m = Math.floor((secondsInt % 3600) / 60)
  const s = Math.floor((secondsInt % 3600) % 60)

  const hDisplay =
    h > 0 ? h + (h == 1 ? ' hr' : ' hrs') + (m > 0 || s > 0 ? ', ' : '') : ''
  const mDisplay =
    m > 0 ? m + (m == 1 ? ' min' : ' mins') + (s > 0 ? ', ' : '') : ''
  const sDisplay = s > 0 ? s + (s == 1 ? ' sec' : ' secs') : ''
  return hDisplay + mDisplay + sDisplay
}

export function nativeTokenLabel(denom: string): string {
  // Search IBC asset strings (junoDenom) if denom is in IBC format.
  // Otherwise just check microdenoms.
  const asset = denom.startsWith('ibc')
    ? ibcAssets.tokens.find(({ junoDenom }) => junoDenom === denom)
    : ibcAssets.tokens.find(({ denom: d }) => d === denom)
  // If no asset, assume it's already a microdenom.
  return asset?.symbol || convertFromMicroDenom(denom)
}

export function nativeTokenLogoURI(denom: string): string | undefined {
  if (denom === 'ujuno' || denom == 'ujunox') {
    return '/juno-symbol.png'
  }

  const asset = denom.startsWith('ibc')
    ? ibcAssets.tokens.find(({ junoDenom }) => junoDenom === denom)
    : ibcAssets.tokens.find(({ denom: d }) => d === denom)
  return asset?.logoURI
}

export function nativeTokenDecimals(denom: string): number | undefined {
  if (denom === NATIVE_DENOM) {
    return NATIVE_DECIMALS
  }
  const asset = denom.startsWith('ibc')
    ? ibcAssets.tokens.find(({ junoDenom }) => junoDenom === denom)
    : ibcAssets.tokens.find(({ denom: d }) => d === denom)
  return asset?.decimals
}
