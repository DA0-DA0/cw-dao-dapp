// Constants NOT derived from environment variables.

export const SITE_IMAGE = '/social.jpg'
export const SITE_TITLE = 'DAO DAO'
export const DEFAULT_SITE_DESCRIPTION =
  'Create a DAO to manage your community, protocol, or entire blockchain in just a few clicks. We support multisig, token-based, and NFT-based DAOs that can be as simple or complex as you want. Set up SubDAOs, manage interchain assets, and interact with dApps across the Cosmos.'
export const CREATE_PAGE_TITLE = 'Create a DAO'
export const CREATE_PAGE_DESCRIPTION =
  'Create a new project, protocol, organization, or community—organized any way you can imagine.'
export const ACCOUNT_PAGE_TITLE = 'Account: ADDRESS'
export const ACCOUNT_PAGE_DESCRIPTION =
  'View tokens and NFTs for the account with address ADDRESS.'
export const NOTIFICATIONS_PAGE_TITLE = 'Notifications'
export const NOTIFICATIONS_PAGE_DESCRIPTION =
  'View notifications in your followed DAOs.'
export const STATUS_PAGE_TITLE = 'Status'
export const STATUS_PAGE_DESCRIPTION = "Check the status of DAO DAO's services."
export const CHAIN_GOVERNANCE_TITLE = 'Chain governance'
export const CHAIN_GOVERNANCE_DESCRIPTION =
  'View and vote on proposals in chain governance.'

// 3 days
export const IBC_TIMEOUT_SECONDS = 3 * 24 * 60 * 60

// DAO name min/max and description max defined in core.
export const MIN_DAO_NAME_LENGTH = 3
export const MAX_DAO_NAME_LENGTH = 50
export const MAX_META_CHARS_PROPOSAL_DESCRIPTION = 200

export const DAO_STATIC_PROPS_CACHE_SECONDS = 60

export const NEW_DAO_TOKEN_DECIMALS = 6

// This will not change with environment.
export const MAX_NUM_PROPOSAL_CHOICES = 20

// Discord notifier (https://github.com/DA0-DA0/discord-notifier-cf-worker)
export const DISCORD_NOTIFIER_SIGNATURE_TYPE = 'Discord Notifier'

/**
 * Prefix for the following DAOs storage in kvpk. A DAO is being followed if
 * `following:CHAIN_ID:KEY` is set, where KEY is a DAO's core address or the
 * name of a chain, which represents following the chain's native governance
 * (x/gov module).
 */
export const FOLLOWING_DAOS_PREFIX = 'following:'

// The key for the item in the DAO core contract that contains the payroll
// config.
export const DAO_CORE_PAYROLL_CONFIG_ITEM_KEY = 'payroll'
// The key for the item in the DAO core contract that contains the accent color.
export const DAO_CORE_ACCENT_ITEM_KEY = 'accent'

// The key for the item in the DAO core contract that enables the memo field on
// execute.
export const DAO_CORE_ALLOW_MEMO_ON_EXECUTE_ITEM_KEY = 'allow_memo_on_execute'

// Me balances page
export const HIDDEN_BALANCE_PREFIX = 'hiddenBalance:'

// Supported NFT video extensions. If an NFT image is a video, we'll try to
// render a video player instead of an image.
export const NFT_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi']

// Widgets
// The namespace (prefix) of widgets stored in a DAO's core items list.
export const DAO_WIDGET_ITEM_NAMESPACE = 'widget:'

// Rewards

// The namespace (prefix) of reward distribution contracts stored in a DAO's
// core items list.
export const DAO_REWARD_DISTRIBUTOR_ITEM_NAMESPACE = 'rewards'
// The namespace (prefix) of saved reward distribution emission rates stored in
// a DAO's core items list.
export const DAO_REWARD_DISTRIBUTOR_SAVED_EMISSION_RATE_ITEM_NAMESPACE =
  'rewards_saved_rate'

// The namespace (prefix) of cw721 contracts stored in a DAO's core items list
// that are to be displayed in the treasury.
export const CW721_ITEM_KEY_PREFIX = 'cw721:'
// The namespace (prefix) of cw721 contracts for polytone accounts stored in a
// DAO's core items list. Polytone proxies cannot register cw721s like the DAO
// core contract can, so we need to store this separately.
export const POLYTONE_CW721_ITEM_KEY_PREFIX = 'polytone_cw721:'
// The namespace (prefix) of cw20 contracts stored in a DAO's core items list
// that are to be displayed in the treasury.
export const CW20_ITEM_KEY_PREFIX = 'cw20:'
// The namespace (prefix) of cw20 contracts for polytone accounts stored in a
// DAO's core items list. Polytone proxies cannot register cw20s like the DAO
// core contract can, so we need to store this separately.
export const POLYTONE_CW20_ITEM_KEY_PREFIX = 'polytone_cw20:'

// Osmosis API
export const OSMOSIS_API_BASE = 'https://api-osmosis.imperator.co'

// White Whale API
export const WHITE_WHALE_PRICES_API =
  'https://www.api-white-whale.enigma-validator.com/summary/migaloo/all/current'

// Astroport API
export const ASTROPORT_PRICES_API =
  'https://api.astroport.fi/api/tokens/DENOM?chainId=neutron-1'

// Indexer
export const INDEXER_URL = 'https://indexer.daodao.zone'

// Snapper API
export const SNAPPER_API_BASE = 'https://snapper.indexer.zone'

// KVPK prefix for saved Me page transactions.
export const ME_SAVED_TX_PREFIX = 'savedTx:'

// KVPK prefix for registered ICA chains.
export const ICA_CHAINS_TX_PREFIX = 'ica:'

export const CHAIN_GAS_MULTIPLIER = 2

export const IPFS_GATEWAY_TEMPLATE = 'https://ipfs.daodao.zone/ipfs/PATH'

export const SKIP_API_BASE = 'https://api.skip.money'

// DAOs with these names will be excluded from search.
export const INACTIVE_DAO_NAMES = ['[archived]', '[deleted]']

// The namespace (prefix) of enabled vetoable DAOs stored in the items list.
export const VETOABLE_DAOS_ITEM_KEY_PREFIX = 'showVetoableDao:'

/**
 * The address passed to the historical balance and treasury value selectors to
 * indicate that it should load tokens from the community pool instead.
 */
export const COMMUNITY_POOL_ADDRESS_PLACEHOLDER = 'COMMUNITY_POOL'

// 1-10 linear from purple to orange/yellow. Intersperse colors so similar
// colors are not adjacent.
export const DISTRIBUTION_COLORS = [
  '#5B58E2', // 1
  '#954FE7', // 4
  '#FC81A4', // 7
  '#F1B671', // 10
  '#4744AC', // 2
  '#BA73DD', // 5
  '#EE7969', // 8
  '#6642CE', // 3
  '#DE73C0', // 6
  '#F4925A', // 9
]

export const DISTRIBUTION_COLORS_ORDERED = [
  '#5B58E2', // 1
  '#4744AC', // 2
  '#6642CE', // 3
  '#954FE7', // 4
  '#BA73DD', // 5
  '#DE73C0', // 6
  '#FC81A4', // 7
  '#EE7969', // 8
  '#F4925A', // 9
  '#F1B671', // 10
]

export const DISTRIBUTION_COLORS_EVERY_OTHER = [
  '#4744AC', // 2
  '#954FE7', // 4
  '#DE73C0', // 6
  '#EE7969', // 8
  '#F1B671', // 10
  '#5B58E2', // 1
  '#6642CE', // 3
  '#BA73DD', // 5
  '#FC81A4', // 7
  '#F4925A', // 9
]

/**
 * Error substrings that indicate a query does not exist.
 */
export const NONEXISTENT_QUERY_ERROR_SUBSTRINGS = ['unknown query path']

/**
 * Error substrings that indicate a contract is invalid or does not exist.
 */
export const INVALID_CONTRACT_ERROR_SUBSTRINGS = [
  'Error parsing into type',
  'no such contract',
  'not found',
  'decoding bech32 failed',
  ...NONEXISTENT_QUERY_ERROR_SUBSTRINGS,
]

/**
 * The salt used to generate a predictable Valence account address.
 */
export const VALENCE_INSTANTIATE2_SALT = 'valence'

/**
 * Gas prices for Secret transactions.
 */
export const SECRET_GAS = {
  DAO_CREATION: 1_000_000,
  PROPOSE: 1_000_000,
  VOTE: 500_000,
  EXECUTE: 1_000_000,
  CLOSE: 500_000,
  VETO: 500_000,
  STAKE: 100_000,
  UNSTAKE: 100_000,
  CLAIM: 100_000,
}

/**
 * DAO addresses to manually hide from search.
 *
 * A DAO can hide itself from search by setting the `hideFromSearch` storage
 * item. Sometimes a DAO is created with a misconfigured module (typically a
 * voting module with a nonexistent token) that bricks it immediately,
 * preventing anyone from being able to join and submit a proposal to hide it
 * from search. On request, we manually add these addresses to the hidden list
 * so users do not confuse the real DAO for a bricked one with the same name
 * when searching for it.
 */
export const DAOS_HIDDEN_FROM_SEARCH = [
  // Lion DAO
  'terra1a9ur9jyvg9kqfsl6euqdkv02v2klqnppzv4jpw93xzp5tr0xhkvschdnm5',
]

/**
 * Separator used between proposal description and additional metadata JSON
 * stored at the end of the description field.
 */
export const PROPOSAL_DESCRIPTION_METADATA_SEPARATOR = '\n~@~@~@~\n'

// Wallet account secp256k1 public keys are expected to be 33 bytes starting
// with 0x02 or 0x03. This will be used when simulating requests, but not when
// signing since we intercept messages. This may cause problems with some dApps
// if simulation fails...
export const EMPTY_PUB_KEY = new Uint8Array([
  0x02,
  ...[...new Array(32)].map(() => 0),
])
