// Constants derived from environment variables.

export const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV

export const SITE_URL =
  // On local dev or production vercel, use manually set domain.
  !VERCEL_ENV || VERCEL_ENV === 'production'
    ? (process.env.NEXT_PUBLIC_SITE_URL as string)
    : // Use vercel deployment URL if on preview or development vercel build.
      `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`

export const LEGACY_URL_PREFIX = process.env
  .NEXT_PUBLIC_LEGACY_URL_PREFIX as string

// True if on mainnet, false if on testnet.
export const MAINNET = process.env.NEXT_PUBLIC_MAINNET === 'true'

// Neutron DAOs.
export const NEUTRON_GOVERNANCE_DAO = MAINNET
  ? 'neutron1suhgf5svhu4usrurvxzlgn54ksxmn8gljarjtxqnapv8kjnp4nrstdxvff'
  : 'neutron1kvxlf27r0h7mzjqgdydqdf76dtlyvwz6u9q8tysfae53ajv8urtq4fdkvy'
export const NEUTRON_SECURITY_SUBDAO = MAINNET
  ? 'neutron1fuyxwxlsgjkfjmxfthq8427dm2am3ya3cwcdr8gls29l7jadtazsuyzwcc'
  : 'neutron1zv35zgj7d6khqxfl3tx95scjljz0rvmkxcsxmggqxrltkm8ystsqvt0qc7'

// https://dashboard.web3auth.io
export const WEB3AUTH_CLIENT_ID = process.env
  .NEXT_PUBLIC_WEB3AUTH_CLIENT_ID as string

export const CI = process.env.CI === 'true'

// Stargaze
export const STARGAZE_GQL_INDEXER_URI = process.env
  .NEXT_PUBLIC_STARGAZE_GQL_INDEXER_URI as string
export const STARGAZE_URL_BASE = process.env
  .NEXT_PUBLIC_STARGAZE_URL_BASE as string
export const STARGAZE_NAMES_CONTRACT = process.env
  .NEXT_PUBLIC_STARGAZE_NAMES_CONTRACT as string

// Wallet profiles
export const PFPK_API_BASE = process.env.NEXT_PUBLIC_PFPK_API_BASE as string

// Search
export const SEARCH_HOST = process.env.NEXT_PUBLIC_SEARCH_HOST as string
export const SEARCH_API_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY as string

// Filebase
export const FILEBASE_ACCESS_KEY_ID = process.env
  .FILEBASE_ACCESS_KEY_ID as string
export const FILEBASE_SECRET_ACCESS_KEY = process.env
  .FILEBASE_SECRET_ACCESS_KEY as string
export const FILEBASE_BUCKET = process.env.FILEBASE_BUCKET as string

export const FAST_AVERAGE_COLOR_API_TEMPLATE = process.env
  .NEXT_PUBLIC_FAST_AVERAGE_COLOR_API_TEMPLATE as string

// Discord notifier (https://github.com/DA0-DA0/discord-notifier-cf-worker)
export const DISCORD_NOTIFIER_API_BASE = process.env
  .NEXT_PUBLIC_DISCORD_NOTIFIER_API_BASE as string

// Inbox API (https://github.com/DA0-DA0/inbox-cf-worker)
export const INBOX_API_BASE = process.env.NEXT_PUBLIC_INBOX_API_BASE as string

// KVPK API (https://github.com/DA0-DA0/kvpk)
export const KVPK_API_BASE = process.env.NEXT_PUBLIC_KVPK_API_BASE as string

// Single DAO Mode
export const SINGLE_DAO_MODE =
  process.env.NEXT_PUBLIC_SINGLE_DAO_MODE === 'true'

// Kado API (https://docs.kado.money)
export const KADO_API_KEY = process.env.NEXT_PUBLIC_KADO_API_KEY as string

// Web Push
export const WEB_PUSH_PUBLIC_KEY = process.env
  .NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY as string
