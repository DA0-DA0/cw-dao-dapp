import { ChainId } from '@dao-dao/types'

import { CodeIdConfigs } from './codeIdConfigs'
import { PolytoneNotesPerChain } from './polytone'

export * from './chains'
export * from './adapters'

export const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV

export const SITE_URL =
  // On local dev or production vercel, use manually set domain.
  !VERCEL_ENV || VERCEL_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_SITE_URL as string)
    : // Use vercel deployment URL if on preview or development vercel build.
      `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`

export const SITE_IMAGE = process.env.NEXT_PUBLIC_SITE_IMAGE as string
export const WC_ICON_PATH = process.env.NEXT_PUBLIC_WC_ICON_PATH as string
export const SDA_URL_PREFIX = process.env.NEXT_PUBLIC_SDA_URL_PREFIX as string
export const DAPP_URL_PREFIX = process.env.NEXT_PUBLIC_DAPP_URL_PREFIX as string
export const CHAIN_GOV_PROPOSAL_URL_TEMPLATE = process.env
  .NEXT_PUBLIC_CHAIN_GOV_PROPOSAL_URL_TEMPLATE as string
export const LEGACY_URL_PREFIX = process.env
  .NEXT_PUBLIC_LEGACY_URL_PREFIX as string

// True if on mainnet, false if on testnet.
export const MAINNET = process.env.NEXT_PUBLIC_MAINNET === 'true'

export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID as ChainId
if (!CHAIN_ID || !Object.values(ChainId).includes(CHAIN_ID)) {
  throw new Error(`Unexpected CHAIN_ID: ${CHAIN_ID}`)
}

export const CHAIN_TXN_URL_PREFIX = process.env
  .NEXT_PUBLIC_CHAIN_TXN_URL_PREFIX as string
export const CHAIN_RPC_ENDPOINT = process.env
  .NEXT_PUBLIC_CHAIN_RPC_ENDPOINT as string
export const CHAIN_REST_ENDPOINT = process.env
  .NEXT_PUBLIC_CHAIN_REST_ENDPOINT as string
export const CHAIN_GAS_MULTIPLIER = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_GAS_MULTIPLIER || '2',
  10
)
export const DAO_DAO_DAO_ADDRESS = process.env
  .NEXT_PUBLIC_DAO_DAO_DAO_ADDRESS as string

// https://dashboard.web3auth.io
export const WEB3AUTH_CLIENT_ID = process.env
  .NEXT_PUBLIC_WEB3AUTH_CLIENT_ID as string

// KVPK prefix for saved Me page transactions.
export const ME_SAVED_TX_PREFIX = `${CHAIN_ID}:savedTx:`

export const CI = process.env.CI === 'true'

// Code IDs
export const CODE_ID_CONFIG = CodeIdConfigs[CHAIN_ID]!
if (!CODE_ID_CONFIG) {
  throw new Error(`Chain_ID ${CHAIN_ID} not found in Code ID Configs`)
}

// Polytone Notes
export const POLYTONE_NOTES = PolytoneNotesPerChain[CHAIN_ID] || {}

// 3 days
export const POLYTONE_TIMEOUT_SECONDS = (3 * 24 * 60 * 60).toString()

export const FACTORY_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS as string

// DAO name min/max and description max defined in core.
export const MIN_DAO_NAME_LENGTH = parseInt(
  process.env.NEXT_PUBLIC_MIN_DAO_NAME_LENGTH || '3',
  10
)
export const MAX_DAO_NAME_LENGTH = parseInt(
  process.env.NEXT_PUBLIC_MAX_DAO_NAME_LENGTH || '50',
  10
)

export const MAX_META_CHARS_PROPOSAL_DESCRIPTION = parseInt(
  process.env.NEXT_PUBLIC_MAX_META_CHARS_PROPOSAL_DESCRIPTION || '200',
  10
)

export const DAO_STATIC_PROPS_CACHE_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_DAO_STATIC_PROPS_CACHE_SECONDS ||
    // 5 minutes
    (60 * 5).toString(),
  10
)

export const FEATURED_DAOS_CACHE_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_FEATURED_DAOS_CACHE_SECONDS ||
    // 12 hours
    (60 * 60 * 12).toString(),
  10
)

export const NEW_DAO_CW20_DECIMALS = parseInt(
  process.env.NEXT_PUBLIC_NEW_DAO_CW20_DECIMALS || '6',
  10
)

// This will not change with environment.
export const MAX_NUM_PROPOSAL_CHOICES = 20

// Stargaze
export const STARGAZE_RPC_ENDPOINT = process.env
  .NEXT_PUBLIC_STARGAZE_RPC_ENDPOINT as string
export const STARGAZE_REST_ENDPOINT = process.env
  .NEXT_PUBLIC_STARGAZE_REST_ENDPOINT as string
export const STARGAZE_PROFILE_API_TEMPLATE = process.env
  .NEXT_PUBLIC_STARGAZE_PROFILE_API_TEMPLATE as string
export const STARGAZE_URL_BASE = process.env
  .NEXT_PUBLIC_STARGAZE_URL_BASE as string

// Wallet profiles
export const PFPK_API_BASE = process.env.NEXT_PUBLIC_PFPK_API_BASE as string

// Indexer
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL

// Search
export const SEARCH_HOST = process.env.NEXT_PUBLIC_SEARCH_HOST as string
export const SEARCH_API_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY as string
export const SEARCH_DAOS_INDEX = process.env
  .NEXT_PUBLIC_SEARCH_DAOS_INDEX as string
export const FEATURED_DAOS_INDEX = process.env
  .NEXT_PUBLIC_FEATURED_DAOS_INDEX as string

export const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_API_KEY as string

export const FAST_AVERAGE_COLOR_API_TEMPLATE = process.env
  .NEXT_PUBLIC_FAST_AVERAGE_COLOR_API_TEMPLATE as string
export const IPFS_GATEWAY_TEMPLATE = process.env
  .NEXT_PUBLIC_IPFS_GATEWAY_TEMPLATE as string

export const DISABLED_ACTIONS = (
  process.env.NEXT_PUBLIC_DISABLED_ACTIONS || ''
).split(',')

// Discord notifier (https://github.com/DA0-DA0/discord-notifier-cf-worker)
export const DISCORD_NOTIFIER_CLIENT_ID = process.env
  .NEXT_PUBLIC_DISCORD_NOTIFIER_CLIENT_ID as string
export const DISCORD_NOTIFIER_REDIRECT_URI = process.env
  .NEXT_PUBLIC_DISCORD_NOTIFIER_REDIRECT_URI as string
export const DISCORD_NOTIFIER_API_BASE = process.env
  .NEXT_PUBLIC_DISCORD_NOTIFIER_API_BASE as string
export const DISCORD_NOTIFIER_SIGNATURE_TYPE = 'Discord Notifier'

// Inbox API (https://github.com/DA0-DA0/inbox-cf-worker)
export const INBOX_API_BASE = process.env.NEXT_PUBLIC_INBOX_API_BASE as string

// KVPK API (https://github.com/DA0-DA0/kvpk)
export const KVPK_API_BASE = process.env.NEXT_PUBLIC_KVPK_API_BASE as string

// Following DAOs
export const FOLLOWING_DAOS_PREFIX = 'following:'

// The key for the item in the DAO core contract that contains the payroll
// config.
export const DAO_CORE_PAYROLL_CONFIG_ITEM_KEY = 'payroll'

// Single DAO Mode
export const SINGLE_DAO_MODE =
  process.env.NEXT_PUBLIC_SINGLE_DAO_MODE === 'true'

// Kado API (https://docs.kado.money)
export const KADO_API_KEY = process.env.NEXT_PUBLIC_KADO_API_KEY as string

// WYND
export const WYND_MULTI_HOP_CONTRACT = process.env
  .NEXT_PUBLIC_WYND_MULTI_HOP_CONTRACT as string
export const WYND_API_BASE = process.env.NEXT_PUBLIC_WYND_API_BASE as string
export const WYND_REFERRAL_COMMISSION = Number(
  process.env.NEXT_PUBLIC_WYND_REFERRAL_COMMISSION || '0.01'
)

// WebSockets API
export const WEB_SOCKET_PUSHER_APP_KEY = process.env
  .NEXT_PUBLIC_WEB_SOCKET_PUSHER_APP_KEY as string
export const WEB_SOCKET_PUSHER_HOST = process.env
  .NEXT_PUBLIC_WEB_SOCKET_PUSHER_HOST as string
export const WEB_SOCKET_PUSHER_PORT = Number(
  process.env.NEXT_PUBLIC_WEB_SOCKET_PUSHER_PORT || '6001'
)

// Me balances page
export const HIDDEN_BALANCE_PREFIX = 'hiddenBalance:'

// Supported NFT video extensions. If an NFT image is a video, we'll try to
// render a video player instead of an image.
export const NFT_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi']

// Widgets
// The namespace (prefix) of widgets stored in a DAO's core items list.
export const DAO_WIDGET_ITEM_NAMESPACE = 'widget:'

// The namespace (prefix) of cw721 contracts stored in a DAO's core items list.
// This workaround is necessary for contracts that don't conform to the expected
// contract info response.
export const CW721_WORKAROUND_ITEM_KEY_PREFIX = 'cw721:'
