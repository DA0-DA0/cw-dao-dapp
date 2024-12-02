import { Buffer } from 'buffer'

import { AssetList, IBCInfo } from '@chain-registry/types'
import { fromBech32, fromHex, toBech32 } from '@cosmjs/encoding'
import uniq from 'lodash.uniq'
import RIPEMD160 from 'ripemd160'
import semverGte from 'semver/functions/gte'

import { HugeDecimal } from '@dao-dao/math'
import {
  Account,
  AnyChain,
  BaseChainConfig,
  ChainId,
  ConfiguredChain,
  ContractVersion,
  DaoInfo,
  GenericToken,
  SupportedChain,
  SupportedChainConfig,
  TokenType,
  Validator,
} from '@dao-dao/types'
import {
  Validator as RpcValidator,
  bondStatusToJSON,
} from '@dao-dao/types/protobuf/codegen/cosmos/staking/v1beta1/staking'

import {
  convertChainRegistryAssetToGenericToken,
  getChainAssets,
} from './assets'
import {
  CHAIN_ENDPOINTS,
  CONFIGURED_CHAINS,
  MAINNET,
  SUPPORTED_CHAINS,
  assets,
  chains,
  ibc,
} from './constants'
import { getFallbackImage } from './getFallbackImage'

/**
 * Get the RPC for the given chain.
 *
 * @param chainId Chain to get RPC for.
 * @param offset Offset will try a different URL from the list of available
 * RPCs.
 * @returns RPC for the given chain.
 */
export const getRpcForChainId = (
  chainId: string,
  // Offset will try a different RPC from the list of available RPCs.
  offset = 0
): string => {
  let rpc = (
    (chainId in CHAIN_ENDPOINTS &&
      CHAIN_ENDPOINTS[chainId as keyof typeof CHAIN_ENDPOINTS]) ||
    {}
  )?.rpc
  // Try preferred RPC 3 times before falling back to chain registry.
  if (rpc && offset < 3) {
    return rpc
  }

  // If RPC was found but not used, offset > 3, so subtract 3 so we start trying
  // the first RPC in the chain registry list.
  if (rpc) {
    offset -= 3
  }

  // Fallback to chain registry.
  const chain = maybeGetChainForChainId(chainId)
  if (!chain) {
    throw new Error(`Unknown chain ID "${chainId}"`)
  }

  const rpcs = [
    // Try cosmos.directory RPC first.
    { address: 'https://rpc.cosmos.directory/' + chain.chainName },
    // Fallback to chain registry.
    ...(chain?.chainRegistry?.apis?.rpc ?? []),
  ]

  return rpcs[offset % rpcs.length].address.replace(/http:\/\//, 'https://')
}

/**
 * Get the LCD for the given chain.
 *
 * @param chainId Chain to get LCD for.
 * @param offset Offset will try a different URL from the list of available
 * LCDs.
 * @returns LCD for the given chain.
 */
export const getLcdForChainId = (
  chainId: string,
  // Offset will try a different LCD from the list of available LCDs.
  offset = 0
): string => {
  let lcd = (
    (chainId in CHAIN_ENDPOINTS &&
      CHAIN_ENDPOINTS[chainId as keyof typeof CHAIN_ENDPOINTS]) ||
    {}
  )?.rest
  if (lcd && offset === 0) {
    return lcd
  }

  // If LCD was found but not used, offset > 0, and subtract 1 from offset so we
  // try the first LCD in the chain registry list.
  if (lcd) {
    offset -= 1
  }

  // Fallback to chain registry.
  const chain = maybeGetChainForChainId(chainId)
  if (!chain) {
    throw new Error(`Unknown chain ID "${chainId}"`)
  }

  const lcds = chain?.chainRegistry?.apis?.rest ?? []
  if (lcds.length === 0) {
    throw new Error(`No LCD found for chain ID "${chainId}"`)
  }

  return lcds[offset % lcds.length].address.replace(/http:\/\//, 'https://')
}

export const cosmosValidatorToValidator = ({
  operatorAddress: address,
  description: { moniker, website, details } = {
    moniker: '',
    identity: '',
    website: '',
    securityContact: '',
    details: '',
  },
  commission,
  status,
  tokens,
}: RpcValidator): Validator => ({
  address,
  moniker,
  website:
    website && (website.startsWith('http') ? website : `https://${website}`),
  details,
  commission: commission?.commissionRates
    ? Number(commission.commissionRates.rate)
    : -1,
  status: bondStatusToJSON(status),
  tokens: HugeDecimal.from(tokens),
})

export const getImageUrlForChainId = (chainId: string): string => {
  const overrideUrl = getConfiguredChainConfig(chainId)?.overrideChainImageUrl
  if (overrideUrl) {
    return overrideUrl
  }

  // Chain logo is sometimes larger and not square.
  const { logo_URIs, images } =
    maybeGetChainForChainId(chainId)?.chainRegistry ?? {}
  const chainImageUrl =
    logo_URIs?.png ??
    logo_URIs?.jpeg ??
    logo_URIs?.svg ??
    images?.[0]?.png ??
    images?.[0]?.svg

  // Use native token image if available.
  const { imageUrl: nativeTokenImageUrl } =
    maybeGetNativeTokenForChainId(chainId) || {}

  // Some chain logos are not square, so use the coin instead.
  const image =
    (chainId === ChainId.OsmosisMainnet ||
    chainId === ChainId.OsmosisTestnet ||
    chainId === ChainId.NeutronMainnet ||
    chainId === ChainId.NeutronTestnet
      ? nativeTokenImageUrl
      : chainImageUrl) ||
    nativeTokenImageUrl ||
    getFallbackImage(chainId)

  return image
}

/**
 * Convert secp256k1 public key in hex format to a bech32 address.
 *
 * Be very careful to ensure the public key is actually a secp256k1 key. Some
 * chains, like Injective, use a different curve than secp256k1 and thus this
 * will not work.
 *
 * https://github.com/cosmos/cosmos-sdk/blob/e09516f4795c637ab12b30bf732ce5d86da78424/crypto/keys/secp256k1/secp256k1.go#L152-L162
 *
 * Keplr implementation:
 * https://github.com/chainapsis/keplr-wallet/blob/088dc701ce14df77a1ee22b7e39c651e50879d9f/packages/crypto/src/key.ts#L56-L63
 */
export const secp256k1PublicKeyToBech32Address = async (
  hexPublicKey: string,
  bech32Prefix: string
): Promise<string> => {
  const sha256Hash = await crypto.subtle.digest(
    'SHA-256',
    fromHex(hexPublicKey)
  )
  const ripemd160Hex = new RIPEMD160()
    .update(Buffer.from(sha256Hash))
    .digest('hex')
  return toBech32(bech32Prefix, fromHex(ripemd160Hex))
}

const cachedChainsById: Record<string, AnyChain | undefined> = {}
export const maybeGetChainForChainId = (
  chainId: string
): AnyChain | undefined => {
  cachedChainsById[chainId] ||= chains.find((c) => c.chainId === chainId)
  return cachedChainsById[chainId]
}

export const getChainForChainId = (chainId: string): AnyChain => {
  const chain = maybeGetChainForChainId(chainId)
  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found`)
  }

  return chain
}

const cachedAssetListsById: Record<string, AssetList | undefined> = {}
export const maybeGetAssetListForChainId = (
  chainId: string
): AssetList | undefined => {
  const { chainName } = maybeGetChainForChainId(chainId) ?? {}
  if (chainName) {
    cachedAssetListsById[chainId] ||= assets.find(
      ({ chain_name }) => chain_name === chainName
    )
  }
  return cachedAssetListsById[chainId]
}

const cachedChainsByName: Record<string, AnyChain | undefined> = {}
export const maybeGetChainForChainName = (
  chainName: string
): AnyChain | undefined => chains.find((c) => c.chainName === chainName)

export const getChainForChainName = (chainName: string): AnyChain => {
  cachedChainsByName[chainName] ||= maybeGetChainForChainName(chainName)
  if (!cachedChainsByName[chainName]) {
    throw new Error(`Chain with name ${chainName} not found`)
  }
  return cachedChainsByName[chainName]!
}

export const getDisplayNameForChainId = (chainId: string): string =>
  maybeGetChainForChainId(chainId)?.prettyName ?? chainId

/**
 * Get the description for a chain's native governance DAO.
 */
export const getChainGovernanceDaoDescription = (chainId: string): string =>
  `Native chain governance for ${getDisplayNameForChainId(chainId)}.`

const cachedNativeTokens: Record<string, GenericToken | undefined> = {}
export const getNativeTokenForChainId = (chainId: string): GenericToken => {
  if (!cachedNativeTokens[chainId]) {
    const chain = getChainForChainId(chainId)

    const feeDenom = chain.chainRegistry?.fees?.fee_tokens.find(
      ({ denom }) => !denom.startsWith('ibc/')
    )?.denom
    if (!feeDenom) {
      throw new Error(`Chain ${chainId} has no fee token`)
    }

    const assetList =
      assets.find(({ chain_name }) => chain_name === chain.chainName)?.assets ??
      []
    const asset = assetList.find(({ base }) => base === feeDenom)
    if (!asset) {
      throw new Error(`Chain ${chainId} has no asset for fee token ${feeDenom}`)
    }

    cachedNativeTokens[chainId] = convertChainRegistryAssetToGenericToken(
      chainId,
      asset
    )
  }

  return cachedNativeTokens[chainId]!
}

export const maybeGetNativeTokenForChainId = (
  chainId: string
): GenericToken | undefined => {
  try {
    return getNativeTokenForChainId(chainId)
  } catch {
    return undefined
  }
}

const cachedTokens: Record<string, GenericToken | undefined> = {}
/**
 * Find a token in the local asset list, if it exists. Depending on the value of
 * the `placeholder` argument, it will either return an empty token placeholder
 * or error.
 */
export const getTokenForChainIdAndDenom = (
  chainId: string,
  denom: string,
  /**
   * If true, will return placeholder token if not found. If false, will throw
   * error.
   */
  placeholder = true
): GenericToken => {
  try {
    // If native token, return it.
    const nativeToken = getNativeTokenForChainId(chainId)
    if (denom === nativeToken.denomOrAddress) {
      return nativeToken
    }

    const key = `${chainId}:${denom}`
    if (!cachedTokens[key]) {
      // Try chain assets.
      const asset = getChainAssets(chainId).find(
        ({ denomOrAddress, denomAliases }) =>
          denomOrAddress === denom || denomAliases?.includes(denom)
      )
      if (!asset) {
        throw new Error(`Chain ${chainId} has no asset for token ${denom}`)
      }

      cachedTokens[key] = asset
    }

    return cachedTokens[key]!
  } catch (err) {
    if (placeholder) {
      return Object.freeze({
        chainId,
        type: TokenType.Native,
        denomOrAddress: denom,
        symbol: denom,
        decimals: 0,
        imageUrl: getFallbackImage(denom),
        source: {
          chainId,
          denomOrAddress: denom,
        },
      } as GenericToken)
    } else {
      throw err
    }
  }
}

export const getIbcTransferInfoBetweenChains = (
  srcChainId: string,
  destChainId: string
): {
  sourceChain: IBCInfo['chain_1']
  sourceChannel: string
  destinationChain: IBCInfo['chain_1']
  destinationChannel: string
  info: IBCInfo
} => {
  const { chainName: srcChainName } = getChainForChainId(srcChainId)
  const { chainName: destChainName } = getChainForChainId(destChainId)

  const info = ibc.find(
    ({ chain_1, chain_2, channels }) =>
      ((chain_1.chain_name === srcChainName &&
        chain_2.chain_name === destChainName) ||
        (chain_1.chain_name === destChainName &&
          chain_2.chain_name === srcChainName)) &&
      channels.some(
        ({ chain_1, chain_2, version }) =>
          version === 'ics20-1' &&
          chain_1.port_id === 'transfer' &&
          chain_2.port_id === 'transfer'
      )
  )
  if (!info) {
    throw new Error(
      `Failed to find IBC channel from chain ${srcChainId} to chain ${destChainId}.`
    )
  }

  const srcChainNumber = info.chain_1.chain_name === srcChainName ? 1 : 2
  const destChainNumber = info.chain_1.chain_name === destChainName ? 1 : 2
  const channel = info.channels.find(
    ({
      [`chain_${srcChainNumber}` as `chain_${typeof srcChainNumber}`]: srcChain,
      [`chain_${destChainNumber}` as `chain_${typeof srcChainNumber}`]:
        destChain,
      version,
    }) =>
      version === 'ics20-1' &&
      srcChain.port_id === 'transfer' &&
      destChain.port_id === 'transfer'
  )
  if (!channel) {
    throw new Error(
      `Failed to find IBC channel from chain ${srcChainId} to chain ${destChainId}.`
    )
  }

  return {
    sourceChain: info[`chain_${srcChainNumber}`],
    sourceChannel: channel[`chain_${srcChainNumber}`].channel_id,
    destinationChain: info[`chain_${destChainNumber}`],
    destinationChannel: channel[`chain_${destChainNumber}`].channel_id,
    info,
  }
}

export const getIbcTransferInfoFromChannel = (
  sourceChainId: string,
  sourceChannel: string
): {
  destinationChain: IBCInfo['chain_1']
  channel: IBCInfo['channels'][number]
  info: IBCInfo
} => {
  const { chainName } = getChainForChainId(sourceChainId)

  const info = ibc.find(
    ({ chain_1, chain_2, channels }) =>
      // Chain 1 is the source chain.
      (chain_1.chain_name === chainName &&
        channels.some(
          ({ chain_1, version }) =>
            version === 'ics20-1' &&
            chain_1.port_id === 'transfer' &&
            chain_1.channel_id === sourceChannel
        )) ||
      // Chain 2 is the source chain.
      (chain_2.chain_name === chainName &&
        channels.some(
          ({ chain_2, version }) =>
            version === 'ics20-1' &&
            chain_2.port_id === 'transfer' &&
            chain_2.channel_id === sourceChannel
        ))
  )
  if (!info) {
    throw new Error(
      `Failed to find IBC channel for chain ${sourceChainId} and source channel ${sourceChannel}.`
    )
  }

  const thisChainNumber = info.chain_1.chain_name === chainName ? 1 : 2
  const otherChain = info[`chain_${thisChainNumber === 1 ? 2 : 1}`]
  const channel = info.channels.find(
    ({
      [`chain_${thisChainNumber}` as `chain_${typeof thisChainNumber}`]: {
        port_id,
        channel_id,
      },
      version,
    }) =>
      version === 'ics20-1' &&
      port_id === 'transfer' &&
      channel_id === sourceChannel
  )
  if (!channel) {
    throw new Error(
      `Failed to find IBC channel for chain ${sourceChainId} and source channel ${sourceChannel}.`
    )
  }

  return {
    destinationChain: otherChain,
    channel,
    info,
  }
}

/**
 * Get the chain IDs with an existing IBC transfer channel to the given chain.
 */
export const getIbcTransferChainIdsForChain = (chainId: string): string[] => {
  const sourceChain = getChainForChainId(chainId)
  return uniq(
    ibc
      .filter(
        ({ chain_1, chain_2, channels }) =>
          // Either chain is the source chain.
          (chain_1.chain_name === sourceChain.chainName ||
            chain_2.chain_name === sourceChain.chainName) &&
          // Both chains exist in the registry.
          maybeGetChainForChainName(chain_1.chain_name) &&
          maybeGetChainForChainName(chain_2.chain_name) &&
          // An ics20 transfer channel exists.
          channels.some(
            ({ chain_1, chain_2, version }) =>
              version === 'ics20-1' &&
              chain_1.port_id === 'transfer' &&
              chain_2.port_id === 'transfer'
          )
      )
      .map(({ chain_1, chain_2 }) => {
        const otherChain =
          chain_1.chain_name === sourceChain.chainName ? chain_2 : chain_1
        return getChainForChainName(otherChain.chain_name).chainId
      })
      // Remove nonexistent osmosis testnet chain.
      .filter((chainId) => chainId !== 'osmo-test-4')
  )
}

export const getConfiguredChainConfig = (
  chainId: string
): BaseChainConfig | undefined =>
  CONFIGURED_CHAINS.find((config) => config.chainId === chainId)

export const mustGetConfiguredChainConfig = (
  chainId: string
): BaseChainConfig => {
  const config = getConfiguredChainConfig(chainId)
  if (!config) {
    throw new Error(`Unconfigured chain: ${chainId}`)
  }

  return config
}

export const getConfiguredChains = ({
  mainnet = MAINNET,
}: {
  mainnet?: boolean
} = {}): ConfiguredChain[] =>
  CONFIGURED_CHAINS.filter((config) => config.mainnet === mainnet).map(
    (config) => ({
      chain: getChainForChainId(config.chainId),
      ...config,
    })
  )

/**
 * Find configured chain with governance module by name.
 */
export const getConfiguredGovChainByName = (govName: string) =>
  getConfiguredChains().find(({ name, noGov }) => name === govName && !noGov)

/**
 * Whether or not a given string is the configured name for a given chain. This
 * is used to represent the x/gov module of a chain as a DAO.
 */
export const isConfiguredChainName = (chainId: string, key: string) => {
  const chainConfig = getConfiguredChainConfig(chainId)
  return !!chainConfig && key === chainConfig.name
}

export const getIbcTransferInfoFromConnection = (
  sourceChainId: string,
  sourceConnectionId: string
): {
  info: IBCInfo
  destinationChain: IBCInfo['chain_1']
} => {
  const { chainName } = getChainForChainId(sourceChainId)

  const info = ibc.find(
    ({ chain_1, chain_2, channels }) =>
      ((chain_1.chain_name === chainName &&
        chain_1.connection_id === sourceConnectionId) ||
        (chain_2.chain_name === chainName &&
          chain_2.connection_id === sourceConnectionId)) &&
      channels.some(
        ({ chain_1, chain_2, version }) =>
          version === 'ics20-1' &&
          chain_1.port_id === 'transfer' &&
          chain_2.port_id === 'transfer'
      )
  )
  if (!info) {
    throw new Error(
      `Failed to find IBC info for source chain ${sourceChainId} and connection ${sourceConnectionId}.`
    )
  }

  const thisChainNumber = info.chain_1.chain_name === chainName ? 1 : 2
  const destinationChain = info[`chain_${thisChainNumber === 1 ? 2 : 1}`]

  return {
    info,
    destinationChain,
  }
}

export const getSupportedChainConfig = (
  chainId: string
): SupportedChainConfig | undefined =>
  SUPPORTED_CHAINS.find((config) => config.chainId === chainId)

export const mustGetSupportedChainConfig = (
  chainId: string
): SupportedChainConfig => {
  const config = getSupportedChainConfig(chainId)
  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }

  return config
}

/**
 * Whether or not this chain is supported.
 */
export const isSupportedChain = (chainId: string): boolean =>
  getSupportedChainConfig(chainId) !== undefined

/**
 * Get chains with DAO DAO deployed.
 */
export const getSupportedChains = ({
  mainnet = MAINNET,
  hasIndexer,
}: {
  /**
   * Whether or not to fetch supported chains on mainnet or testnet. Defaults to
   * MAINNET environment variable.
   */
  mainnet?: boolean
  /**
   * Whether or not to filter by chains that have an indexer. Defaults to all.
   */
  hasIndexer?: boolean
} = {}): SupportedChain[] =>
  SUPPORTED_CHAINS.filter(
    (config) =>
      (mainnet === undefined || config.mainnet === mainnet) &&
      (hasIndexer === undefined || hasIndexer === !config.noIndexer)
  ).map((config) => ({
    chain: getChainForChainId(config.chainId),
    ...config,
  }))

/**
 * Whether or not we index this chain.
 */
export const chainIsIndexed = (chainId: string): boolean =>
  SUPPORTED_CHAINS.some(
    (config) => config.chainId === chainId && !config.noIndexer
  )

/**
 * Returns the supported chain IDs for the given address based on the prefix.
 * Throws error if none found.
 */
export const getChainIdsForAddress = (address: string): string[] => {
  const supportedChains = getSupportedChains()

  // Match supported chain from address prefix. Hopefully there is only one. Use
  // the first.
  const { prefix } = fromBech32(address)
  const chainsForAddress = supportedChains.filter(
    ({ chain, mainnet }) => chain.bech32Prefix === prefix && mainnet === MAINNET
  )

  if (!chainsForAddress.length) {
    throw new Error(`Unsupported chain: unrecognized prefix "${prefix}"`)
  }

  return chainsForAddress.map((c) => c.chainId)
}

/**
 * Returns true if the cosmos SDK version is 0.46 or higher.
 *
 * @param version the cosmos SDK version string
 * @returns true if the cosmos sdk version is 0.46 or higher
 */
export const cosmosSdkVersionIs46OrHigher = (version: string) =>
  semverGte(version, '0.46.0')

/**
 * Returns true if the cosmos SDK version is 0.47 or higher.
 *
 * @param version the cosmos SDK version string
 * @returns true if the cosmos sdk version is 0.47 or higher
 */
export const cosmosSdkVersionIs47OrHigher = (version: string) =>
  semverGte(version, '0.47.0')

/**
 * Get the DAO info object for a given chain ID.
 */
export const getDaoInfoForChainId = (
  chainId: string,
  accounts: Account[]
): DaoInfo => ({
  chainId,
  coreAddress: mustGetConfiguredChainConfig(chainId).name,
  coreVersion: ContractVersion.Gov,
  votingModuleAddress: '',
  votingModuleInfo: {
    contract: '',
    version: '',
  },
  proposalModules: [],
  name: getDisplayNameForChainId(chainId),
  description: getChainGovernanceDaoDescription(chainId),
  imageUrl: getImageUrlForChainId(chainId),
  created: null,
  isActive: true,
  activeThreshold: null,
  items: {},
  polytoneProxies: {},
  accounts,
  parentDao: null,
  admin: '',
  contractAdmin: null,
})

/**
 * Whether or not the chain ID is Secret Network mainnet or testnet.
 */
export const isSecretNetwork = (chainId: string): boolean =>
  chainId === ChainId.SecretMainnet || chainId === ChainId.SecretTestnet

/**
 * Get the null wallet address to use as a placeholder when the wallet isn't
 * connected.
 */
export const getNullWalletForChain = (chainId: string): string =>
  toBech32(
    getChainForChainId(chainId).bech32Prefix,
    new Uint8Array([...Array(20)].fill(0))
  )

/**
 * Get the public key type used for wallets on a given chain.
 *
 * TODO(public key): can we locate this somehow?
 */
export const getPublicKeyTypeForChain = (chainId: string): string => {
  switch (chainId) {
    case ChainId.InjectiveMainnet:
      return '/injective.crypto.v1beta1.ethsecp256k1.PubKey'
    default:
      return '/cosmos.crypto.secp256k1.PubKey'
  }
}
