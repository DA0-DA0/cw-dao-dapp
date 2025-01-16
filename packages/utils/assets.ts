import { Asset } from '@chain-registry/types'

import { GenericToken, TokenType } from '@dao-dao/types'

import { getChainForChainId } from './chain'
import { assets } from './constants'
import { abbreviateAddress, abbreviateString } from './conversion'
import { getFallbackImage } from './getFallbackImage'

// Cache once loaded.
const chainAssetsMap: Record<
  string,
  | (GenericToken & {
      id: string
      description?: string
      denomAliases?: string[]
    })[]
  | undefined
> = {}
export const getChainAssets = (chainId: string) => {
  if (!chainAssetsMap[chainId]) {
    chainAssetsMap[chainId] =
      assets
        .find(
          ({ chain_name }) =>
            chain_name === getChainForChainId(chainId).chainName
        )
        ?.assets.map((asset) =>
          convertChainRegistryAssetToGenericToken(chainId, asset)
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol)) ?? []
  }

  return chainAssetsMap[chainId]!
}

/**
 * Convert chain registry asset to GenericToken.
 */
export const convertChainRegistryAssetToGenericToken = (
  chainId: string,
  {
    base,
    symbol,
    logo_URIs: { png, svg, jpeg } = {},
    name,
    display,
    denom_units,
    type_asset,
  }: Asset
): GenericToken & {
  id: string
  description?: string
  denomAliases?: string[]
} => ({
  chainId,
  id: display,
  type: type_asset === 'cw20' ? TokenType.Cw20 : TokenType.Native,
  denomOrAddress: type_asset === 'cw20' ? base.replace('cw20:', '') : base,
  denomAliases: denom_units.find(({ denom }) => denom === base)?.aliases ?? [],
  symbol,
  decimals:
    denom_units.find(({ denom }) => denom === display)?.exponent ??
    denom_units.find(({ exponent }) => exponent > 0)?.exponent ??
    denom_units[0]?.exponent ??
    0,
  imageUrl: svg || png || jpeg || getFallbackImage(base),
  description: symbol === name ? undefined : name,
  // This will be wrong when this is an IBC asset.
  source: {
    chainId,
    type: type_asset === 'cw20' ? TokenType.Cw20 : TokenType.Native,
    denomOrAddress: type_asset === 'cw20' ? base.replace('cw20:', '') : base,
  },
})

/**
 * Valid native denom if it follows cosmos SDK validation logic. Specifically,
 * the regex string `[a-zA-Z][a-zA-Z0-9/:._-]{2,127}`.
 *
 * <https://github.com/cosmos/cosmos-sdk/blob/7728516abfab950dc7a9120caad4870f1f962df5/types/coin.go#L865-L867>
 */
export const isValidNativeTokenDenom = (denom: string) =>
  /^[a-zA-Z][a-zA-Z0-9/:._-]{2,127}$/.test(denom)

export const getNativeIbcUsdc = (chainId: string) =>
  getChainAssets(chainId).find(
    ({ id, symbol }) => id === 'usdc' && symbol === 'USDC'
  ) || getChainAssets(chainId).find(({ id }) => id === 'usdc')

// Returns true if this denom is the IBC denom for USDC on the current chain.
export const isNativeIbcUsdc = (chainId: string, ibcDenom: string): boolean =>
  ibcDenom === getNativeIbcUsdc(chainId)?.denomOrAddress

// Processes token symbol and converts into readable format (cut out middle and
// add ellipses) if long IBC or token factory string. Used in `TokenCard`,
// `TokenLine`, and `TokenDepositModal`.
export const shortenTokenSymbol = (
  symbol: string
): {
  isShortened: boolean
  tokenSymbol: string
  originalTokenSymbol: string
} => {
  const isIbc = symbol.toLowerCase().startsWith('ibc')
  const isFactory = symbol.toLowerCase().startsWith('factory')

  // Truncate denominations to prevent overflow.
  const tokenSymbol = isIbc
    ? abbreviateString(symbol, 7, 3)
    : isFactory
      ? // Truncate address in middle.
        `factory/${abbreviateAddress(symbol.split('/')[1], 3)}/${
          symbol.split('/')[2]
        }`
      : symbol

  return {
    isShortened: isIbc || isFactory,
    tokenSymbol,
    originalTokenSymbol: symbol,
  }
}
