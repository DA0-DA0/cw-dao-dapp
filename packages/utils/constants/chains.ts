import { Chain, IBCInfo } from '@chain-registry/types'
import {
  assets as chainRegistryAssets,
  chains as chainRegistryChains,
  ibc as chainRegistryIbc,
} from 'chain-registry'

import {
  AnyChain,
  BaseChainConfig,
  ChainId,
  CodeHashConfig,
  CodeIdConfig,
  ContractVersion,
  PolytoneConfig,
  SkipChain,
  SupportedChainConfig,
  TokenType,
} from '@dao-dao/types'

import { NftBasedCreatorId } from './adapters'
import _ALL_CODE_HASHES from './codeHashes.json'
import _ALL_CODE_IDS from './codeIds.json'
import { NEUTRON_GOVERNANCE_DAO } from './env'
import _ALL_POLYTONE from './polytone.json'

const ALL_CODE_HASHES = _ALL_CODE_HASHES as unknown as Partial<
  Record<ChainId, Partial<Record<ContractVersion, CodeHashConfig>>>
>
const ALL_CODE_IDS = _ALL_CODE_IDS as unknown as Partial<
  Record<ChainId, Partial<Record<ContractVersion, CodeIdConfig>>>
>
const ALL_POLYTONE = _ALL_POLYTONE as unknown as Partial<
  Record<ChainId, PolytoneConfig>
>

export const convertChainRegistryChainToAnyChain = (
  chain: Chain
): AnyChain => ({
  chainId: chain.chain_id,
  chainName: chain.chain_name,
  bech32Prefix: chain.bech32_prefix,
  prettyName: chain.pretty_name ?? chain.chain_name,
  chainRegistry: chain,
})

export const convertSkipChainToAnyChain = (chain: SkipChain): AnyChain => ({
  chainId: chain.chain_id,
  chainName: chain.chain_name,
  bech32Prefix: chain.bech32_prefix,
  prettyName: chain.pretty_name ?? chain.chain_name,
  skipChain: chain,
})

//! ----- Modified chain-registry -----
let chains: AnyChain[] = chainRegistryChains.map(
  convertChainRegistryChainToAnyChain
)
const assets = [...chainRegistryAssets]

// BitSong Testnet
const bitSongTestnetChain = convertChainRegistryChainToAnyChain({
  ...chains.find((c) => c.chainId === ChainId.BitsongMainnet)!.chainRegistry!,
  chain_id: ChainId.BitsongTestnet,
  chain_name: 'bitsongtestnet',
  status: 'live',
  network_type: 'testnet',
  pretty_name: 'BitSong Testnet',
  apis: {
    rpc: [
      {
        address: 'https://rpc-testnet.explorebitsong.com',
      },
    ],
    rest: [
      {
        address: 'https://lcd-testnet.explorebitsong.com',
      },
    ],
  },
})
chains.push(bitSongTestnetChain)
assets.push({
  chain_name: bitSongTestnetChain.chainName,
  // Copy assets from BitSong mainnet.
  assets: assets.find((a) => a.chain_name === 'bitsong')?.assets ?? [],
})

// OmniFlix Hub Testnet
const omniFlixHubTestnetChain = convertChainRegistryChainToAnyChain({
  ...chains.find((c) => c.chainId === ChainId.OmniflixHubMainnet)!
    .chainRegistry!,
  chain_id: ChainId.OmniflixHubTestnet,
  chain_name: 'omniflixhubtestnet',
  status: 'live',
  network_type: 'testnet',
  pretty_name: 'OmniFlix Hub Testnet',
  apis: {
    rpc: [
      {
        address: 'https://rpc.testnet.omniflix.network',
      },
    ],
    rest: [
      {
        address: 'https://api.testnet.omniflix.network',
      },
    ],
  },
})
chains.push(omniFlixHubTestnetChain)
assets.push({
  chain_name: omniFlixHubTestnetChain.chainName,
  // Copy assets from OmniFlix Hub mainnet.
  assets: assets.find((a) => a.chain_name === 'omniflixhub')?.assets ?? [],
})

// Remove thorchain and althea since they spam the console.
const chainsToRemove = ['thorchain', 'althea']
chains = chains.filter((chain) => !chainsToRemove.includes(chain.chainName))

// Shrink Cosmos Hub ICS provider testnet name since Keplr thinks it's too long.
chains.find((c) => c.chainId === ChainId.CosmosHubProviderTestnet)!.prettyName =
  'Cosmos ICS Provider Testnet'

export { chains, assets }
//! ----- Modified chain-registry -----

export const ibc: IBCInfo[] = [
  ...chainRegistryIbc,
  // Oraichain <-> Cosmos Hub
  {
    chain_1: {
      chain_name: 'oraichain',
      client_id: '07-tendermint-47',
      connection_id: 'connection-22',
    },
    chain_2: {
      chain_name: 'cosmoshub',
      client_id: '07-tendermint-651',
      connection_id: 'connection-497',
    },
    channels: [
      {
        chain_1: {
          channel_id: 'channel-15',
          port_id: 'transfer',
        },
        chain_2: {
          channel_id: 'channel-301',
          port_id: 'transfer',
        },
        ordering: 'unordered',
        version: 'ics20-1',
        tags: {
          status: 'live',
          preferred: true,
        },
      },
    ],
  },
  // Neutron <-> Carbon
  {
    chain_1: {
      chain_name: 'neutron',
      client_id: '07-tendermint-141',
      connection_id: 'connection-99',
    },
    chain_2: {
      chain_name: 'carbon',
      client_id: '07-tendermint-77',
      connection_id: 'connection-51',
    },
    channels: [
      {
        chain_1: {
          channel_id: 'channel-4892',
          port_id: 'transfer',
        },
        chain_2: {
          channel_id: 'channel-48',
          port_id: 'transfer',
        },
        ordering: 'unordered',
        version: 'ics20-1',
        tags: {
          status: 'live',
          preferred: true,
        },
      },
    ],
  },
]

/**
 * Chains where DAO DAO is deployed.
 */
const BASE_SUPPORTED_CHAINS: Omit<
  SupportedChainConfig,
  'codeIds' | 'allCodeIds' | 'codeHashes' | 'allCodeHashes' | 'polytone'
>[] = [
  {
    chainId: ChainId.CosmosHubMainnet,
    name: 'cosmos',
    mainnet: true,
    accentColor: '#5064fb',
    factoryContractAddress:
      'cosmos10wrmqup88j9pp489a4ftldgutm52zz02xspfv25rcny8w8wk7pmqauag5d',
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/cosmos/tx/REPLACE',
      gov: 'https://mintscan.io/cosmos/proposals',
      govProp: 'https://mintscan.io/cosmos/proposals/REPLACE',
      wallet: 'https://mintscan.io/cosmos/account/REPLACE',
    },
    // Disable token creation.
    noTokenFactory: true,
    daoCreatorDisabled: {
      // No NFTs on the Hub.
      [NftBasedCreatorId]: 'unsupported',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.JunoMainnet,
    name: 'juno',
    mainnet: true,
    accentColor: '#f74a49',
    factoryContractAddress:
      'juno1kyyat0t5ref452fz7r0des6hx5f9zynp9e9k2k3pqk49rcjhmd7sag82sp',
    kado: {
      network: 'JUNO',
    },
    subDaos: [
      'juno1nmezpepv3lx45mndyctz2lzqxa6d9xzd2xumkxf7a6r4nxt0y95qypm6c0',
      'juno1gyjl26rnqqyk6cuh6nqtvx8t885jgqagusvpqpvtgaygcjg2wjdqz0rzle',
      'juno1n34v729jqgysm5w0unukpt4kvqu4wqyacsv4krmd40f7pz5ruzwqau7e6m',
      'juno1mjsgk02jyn72jm2x7fgw72uu9wj7xy0v6pnuj2jd3aq7rgeqg5qq4dnhes',
    ],
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/juno/txs/REPLACE',
      gov: 'https://mintscan.io/juno/proposals',
      govProp: 'https://mintscan.io/juno/proposals/REPLACE',
      wallet: 'https://mintscan.io/juno/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.OsmosisMainnet,
    name: 'osmosis',
    mainnet: true,
    accentColor: '#5604e8',
    factoryContractAddress:
      'osmo13vpxfky3hdd4k9ymjfhnm8939t9e0kx0rc4eckkwwttqxtn9szaq3h3m3y',
    kado: {
      network: 'OSMOSIS',
    },
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/osmosis/txs/REPLACE',
      gov: 'https://mintscan.io/osmosis/proposals',
      govProp: 'https://mintscan.io/osmosis/proposals/REPLACE',
      wallet: 'https://mintscan.io/osmosis/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.NeutronMainnet,
    name: 'neutron',
    mainnet: true,
    accentColor: '#000000',
    factoryContractAddress:
      'neutron1exzasdlj6r2lhu5ur642qjft07hljcw88g8xjztvd6a4wymh0v8stxvnju',
    govContractAddress: NEUTRON_GOVERNANCE_DAO,
    subDaos: [
      'neutron1fuyxwxlsgjkfjmxfthq8427dm2am3ya3cwcdr8gls29l7jadtazsuyzwcc',
      'neutron1zjdv3u6svlazlydmje2qcp44yqkt0059chz8gmyl5yrklmgv6fzq9chelu',
    ],
    explorerUrlTemplates: {
      tx: 'https://neutron.celat.one/neutron-1/txs/REPLACE',
      wallet: 'https://neutron.celat.one/neutron-1/accounts/REPLACE',
    },
    latestVersion: ContractVersion.V260,
    valence: {
      servicesManager:
        'neutron1gantvpnat0la8kkkzrnj48d5d8wxdjllh5r2w4r2hcrpwy00s69quypupa',
      rebalancer:
        'neutron1qs6mzpmcw3dvg5l8nyywetcj326scszdj7v4pfk55xwshd4prqnqfwc0z2',
    },
  },
  {
    chainId: ChainId.StargazeMainnet,
    name: 'stargaze',
    mainnet: true,
    accentColor: '#8ac3cc',
    factoryContractAddress:
      'stars1tfqwhhnus2u39kdlhhp93k9z7qvkhty65wvyt6snymejeyftkt5qlzq269',
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/stargaze/txs/REPLACE',
      gov: 'https://mintscan.io/stargaze/proposals',
      govProp: 'https://mintscan.io/stargaze/proposals/REPLACE',
      wallet: 'https://mintscan.io/stargaze/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.MigalooMainnet,
    name: 'migaloo',
    mainnet: true,
    accentColor: '#3ccd64',
    factoryContractAddress:
      'migaloo1nc87nqkyp4q0zf029ddaluv200vprmsljpke502r5gjj5pcpkt5s9tarl0',
    explorerUrlTemplates: {
      tx: 'https://inbloc.org/migaloo/transactions/REPLACE',
      gov: 'https://inbloc.org/migaloo/governance',
      govProp: 'https://inbloc.org/migaloo/proposal/REPLACE',
      wallet: 'https://inbloc.org/migaloo/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.TerraMainnet,
    name: 'terra',
    mainnet: true,
    overrideChainImageUrl: '/chains/terra.png',
    accentColor: '#113da5',
    factoryContractAddress:
      'terra14nx6mwk3jn595tya24tdjqze2xmrdf0dnh86wyevjyl2ujz6n8qq55wuh4',
    explorerUrlTemplates: {
      tx: 'https://finder.terra.money/mainnet/tx/REPLACE',
      gov: 'https://mintscan.io/terra/proposals',
      govProp: 'https://mintscan.io/terra/proposals/REPLACE',
      wallet: 'https://finder.terra.money/mainnet/address/REPLACE',
    },
    tokenDaoType: 'both',
    latestVersion: ContractVersion.V260,
  },
  {
    // Ensure this chain stays below Terra so that the logic in
    // makeGetDaoStaticProps works with Terra Classic fallback.
    chainId: ChainId.TerraClassicMainnet,
    name: 'terraclassic',
    mainnet: true,
    accentColor: '#ffd842',
    noInstantiate2Create: true,
    factoryContractAddress:
      'terra18d67ywrfwxq6924xdsg4ahrsjrtuvnu0q5v0ttj07fakw2thspps2fn9yy',
    explorerUrlTemplates: {
      tx: 'https://finder.terra-classic.hexxagon.io/mainnet/tx/REPLACE',
      gov: 'https://ping.pub/terra-luna/gov',
      govProp: 'https://ping.pub/terra-luna/gov/REPLACE',
      wallet:
        'https://finder.terra-classic.hexxagon.io/mainnet/address/REPLACE',
    },
    tokenDaoType: TokenType.Cw20,
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.OraichainMainnet,
    name: 'oraichain',
    mainnet: true,
    overrideChainImageUrl: '/chains/oraichain.svg',
    accentColor: '#ffffff',
    factoryContractAddress:
      'orai1my5rxk0x2wczawqta97yhdgz0zxh3jg5vxv7wjnnyvp259acahjqkl32m6',
    explorerUrlTemplates: {
      tx: 'https://scan.orai.io/txs/REPLACE',
      gov: 'https://scan.orai.io/proposals',
      govProp: 'https://scan.orai.io/proposals/REPLACE',
      wallet: 'https://scan.orai.io/account/REPLACE',
    },
    tokenDaoType: TokenType.Cw20,
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.KujiraMainnet,
    name: 'kujira',
    mainnet: true,
    accentColor: '#e53935',
    // Permissioned, only Kujira governance can create DAOs.
    factoryContractAddress:
      'kujira1d4zzt4y0meqr9m3k55w0k0zztpfwm8dulvv4zsnap8cd2na9uhdqemhppe',
    createViaGovernance: true,
    explorerUrlTemplates: {
      tx: 'https://finder.kujira.network/kaiyo-1/tx/REPLACE',
      gov: 'https://kujira.network/govern',
      govProp: 'https://kujira.network/govern/REPLACE',
      wallet: 'https://finder.kujira.network/kaiyo-1/address/REPLACE',
    },
    // TODO(260): Update to V260 once gov prop is published and passes:
    // https://daodao.zone/dao/kujira/proposals/create?pi=QmYs6F4Zu5rZczqDRzxvyJtCCntMoaWL1yQjtw9p4J3XzZ
    latestVersion: ContractVersion.V250,
  },
  {
    chainId: ChainId.BitsongMainnet,
    name: 'bitsong',
    mainnet: true,
    accentColor: '#c53381',
    factoryContractAddress:
      'bitsong1tqzvu2hpj83d5s0h3346cx90mscglu4u7yhfm48vpk7kc3x6e7msl98sl8',
    tokenCreationFactoryAddress:
      'bitsong16jp4jd68hzpc9a88mqcg3mnktjhgrlyv96shx4zvt522zzq99afsdldd04',
    subDaos: [
      'bitsong1qfwdjcmxgjr9jwa2grhf7pce87afx57j2664tvhh29j7r68a9tgqj9kuf3',
    ],
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/bitsong/txs/REPLACE',
      gov: 'https://mintscan.io/bitsong/proposals',
      govProp: 'https://mintscan.io/bitsong/proposals/REPLACE',
      wallet: 'https://mintscan.io/bitsong/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.OmniflixHubMainnet,
    name: 'omniflixhub',
    mainnet: true,
    accentColor: '#d71d6a',
    factoryContractAddress:
      'omniflix1yxxxv35e0jwaakzv64l97z43msuw8vqn8cay8amvd0zckhra6h2qmfrzmx',
    explorerUrlTemplates: {
      tx: 'https://mintscan.io/omniflix/txs/REPLACE',
      gov: 'https://mintscan.io/omniflix/proposals',
      govProp: 'https://mintscan.io/omniflix/proposals/REPLACE',
      wallet: 'https://mintscan.io/omniflix/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.CosmosHubProviderTestnet,
    name: 'cosmosprovider',
    mainnet: false,
    accentColor: '#5064fb',
    factoryContractAddress:
      'cosmos1pt9cc828wcnrwr9x5u3mtdwvcce7ykrxd7gmneyqgexrpa74m3esp0jn9v',
    explorerUrlTemplates: {
      tx: 'https://explorer.polypore.xyz/provider/tx/REPLACE',
      gov: 'https://explorer.polypore.xyz/provider/gov',
      govProp: 'https://explorer.polypore.xyz/provider/gov/REPLACE',
      wallet: 'https://explorer.polypore.xyz/provider/account/REPLACE',
    },
    // Disable token creation.
    noTokenFactory: true,
    daoCreatorDisabled: {
      // No NFTs on the Hub.
      [NftBasedCreatorId]: 'unsupported',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.JunoTestnet,
    name: 'juno',
    mainnet: false,
    accentColor: '#f74a49',
    factoryContractAddress:
      'juno1fec7mpkacctlj8w98af6d7grxu0jjy2zadvv9mekzhcdmleaa28s4mwu64',
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/juno/tx/REPLACE',
      gov: 'https://testnet.ping.pub/juno/gov',
      govProp: 'https://testnet.ping.pub/juno/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/juno/account/REPLACE',
    },
    latestVersion: ContractVersion.V270Alpha1,
  },
  {
    chainId: ChainId.OsmosisTestnet,
    name: 'osmosis',
    mainnet: false,
    accentColor: '#5604e8',
    factoryContractAddress:
      'osmo1qr2a9hk5423z7rfwp2p5jp27nzvaf3zcsuhta6hqtx7gjv4lzugslqts83',
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/osmosis/tx/REPLACE',
      gov: 'https://testnet.ping.pub/osmosis/gov',
      govProp: 'https://testnet.ping.pub/osmosis/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/osmosis/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.StargazeTestnet,
    name: 'stargaze',
    mainnet: false,
    accentColor: '#8ac3cc',
    factoryContractAddress:
      'stars1wahchy39f5zqzdk948z49pp84c0vk7ta434tfzfp0c58e3an7qcqr20270',
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/stargaze/tx/REPLACE',
      gov: 'https://testnet.ping.pub/stargaze/gov',
      govProp: 'https://testnet.ping.pub/stargaze/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/stargaze/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.MigalooTestnet,
    name: 'migaloo',
    mainnet: false,
    accentColor: '#3ccd64',
    factoryContractAddress:
      'migaloo14uk6sst2jwdscw8qf0t4tm8330u9qrw7hr39wrvjvynp0cq9rsvsluga70',
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/migaloo/tx/REPLACE',
      gov: 'https://testnet.ping.pub/migaloo/gov',
      govProp: 'https://testnet.ping.pub/migaloo/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/migaloo/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.KujiraTestnet,
    name: 'kujira',
    mainnet: false,
    accentColor: '#e53935',
    factoryContractAddress:
      'kujira13aa6np9kh2ejue5mgqd88ktmkmswcs4vyn6djtf3d0h8n0dt2uysfxx9a7',
    explorerUrlTemplates: {
      tx: 'https://finder.kujira.network/harpoon-4/tx/REPLACE',
      // cannot link directly to testnet
      // gov: 'https://kujira.network/govern',
      // cannot link directly to testnet
      // govProp: 'https://kujira.network/govern/REPLACE',
      wallet: 'https://finder.kujira.network/harpoon-4/address/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.NeutronTestnet,
    name: 'neutron',
    mainnet: false,
    accentColor: '#000000',
    factoryContractAddress:
      'neutron1amz5kq2fla85wkn93vls5mhfql8nzqpc9chnu6fzutx2lh4c6ecs38knzv',
    govContractAddress: NEUTRON_GOVERNANCE_DAO,
    explorerUrlTemplates: {
      tx: 'https://neutron.celat.one/pion-1/txs/REPLACE',
      wallet: 'https://neutron.celat.one/pion-1/accounts/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.BitsongTestnet,
    name: 'bitsong',
    mainnet: false,
    accentColor: '#c53381',
    factoryContractAddress:
      'bitsong1zftu69lqmhgwyuqlyawssrm62h58hqyl0gvv4n9aj8pvkr6qqd8s2wl5ve',
    tokenCreationFactoryAddress:
      'bitsong13ackt4dv4ngt4jpngnvyyecjhu33w6gge3mad3n9vc0qkqcrk6cqzfm9vx',
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.OmniflixHubTestnet,
    name: 'omniflixhub',
    mainnet: false,
    accentColor: '#d71d6a',
    factoryContractAddress:
      'omniflix1cqjm2yqkts8tetgkvd222cuk6tqlgsd6vssvduq0d3l6glc5xcfswk9ylt',
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/omniflix/tx/REPLACE',
      gov: 'https://testnet.ping.pub/omniflix/gov',
      govProp: 'https://testnet.ping.pub/omniflix/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/omniflix/account/REPLACE',
    },
    latestVersion: ContractVersion.V260,
  },
  {
    chainId: ChainId.SecretTestnet,
    name: 'secret',
    mainnet: false,
    accentColor: '#000000',
    factoryContractAddress: 'secret15rtkhedsr9gx2z4vq2p7zqk25z4kssju5ae0yy',
    noIndexer: true,
    noInstantiate2Create: true,
    explorerUrlTemplates: {
      tx: 'https://testnet.ping.pub/secret/tx/REPLACE',
      gov: 'https://testnet.ping.pub/secret/gov',
      govProp: 'https://testnet.ping.pub/secret/gov/REPLACE',
      wallet: 'https://testnet.ping.pub/secret/account/REPLACE',
    },
    tokenDaoType: TokenType.Cw20,
    latestVersion: ContractVersion.V242,
  },
]

// Extract info from JSON config.
export const SUPPORTED_CHAINS: SupportedChainConfig[] =
  BASE_SUPPORTED_CHAINS.map((chain): SupportedChainConfig => {
    // Type-check to ensure chain code IDs are present in JSON.
    const allCodeIds = ALL_CODE_IDS[chain.chainId]
    if (!allCodeIds) {
      throw new Error(`No code IDs found for chain ${chain.chainId}`)
    }

    // Type-check to ensure correct version of code IDs are present in JSON.
    const codeIds = allCodeIds[chain.latestVersion]
    if (!codeIds) {
      throw new Error(
        `Version ${chain.latestVersion} code IDs not found for chain ${chain.chainId}`
      )
    }

    return {
      ...chain,
      codeIds,
      allCodeIds,
      codeHashes: ALL_CODE_HASHES[chain.chainId]?.[chain.latestVersion],
      allCodeHashes: ALL_CODE_HASHES[chain.chainId],
      polytone: ALL_POLYTONE[chain.chainId],
    }
  })

export const POLYTONE_CONFIG_PER_CHAIN: [ChainId, PolytoneConfig][] =
  SUPPORTED_CHAINS.map(({ chainId, polytone: polytone = {} }) => [
    chainId as ChainId,
    polytone,
  ])

export const VALENCE_SUPPORTED_CHAINS = SUPPORTED_CHAINS.filter(
  ({ valence }) => valence
).map(({ chainId }) => chainId as ChainId)

export const CHAIN_ENDPOINTS: Partial<
  Record<
    ChainId,
    {
      rpc: string
      rest: string
    }
  >
> = {
  [ChainId.JunoMainnet]: {
    rpc: 'https://juno-rpc.kleomedes.network',
    rest: 'https://juno-api.kleomedes.network',
  },
  [ChainId.JunoTestnet]: {
    rpc: 'https://juno-testnet-rpc.polkachu.com',
    rest: 'https://juno-testnet-api.polkachu.com',
  },
  [ChainId.OsmosisMainnet]: {
    rpc: 'https://osmosis-rpc.publicnode.com',
    rest: 'https://osmosis-rest.publicnode.com',
  },
  [ChainId.OsmosisTestnet]: {
    rpc: 'https://osmosis-testnet-rpc.polkachu.com',
    rest: 'https://osmosis-testnet-api.polkachu.com',
  },
  [ChainId.StargazeMainnet]: {
    rpc: 'https://rpc.stargaze-apis.com',
    rest: 'https://rest.stargaze-apis.com',
  },
  [ChainId.StargazeTestnet]: {
    rpc: 'https://rpc.elgafar-1.stargaze-apis.com',
    rest: 'https://rest.elgafar-1.stargaze-apis.com',
  },
  [ChainId.NeutronMainnet]: {
    rpc: 'https://rpc-lb.neutron.org',
    rest: 'https://rest-lb.neutron.org',
  },
  [ChainId.NeutronTestnet]: {
    rpc: 'https://rpc-falcron.pion-1.ntrn.tech',
    rest: 'https://rest-falcron.pion-1.ntrn.tech',
  },
  [ChainId.CosmosHubMainnet]: {
    rpc: 'https://cosmos-rpc.polkachu.com',
    rest: 'https://cosmos-api.polkachu.com',
  },
  [ChainId.CosmosHubProviderTestnet]: {
    rpc: 'https://rpc.provider-sentry-01.rs-testnet.polypore.xyz',
    rest: 'https://rest.provider-sentry-01.rs-testnet.polypore.xyz',
  },
  [ChainId.TerraMainnet]: {
    rpc: 'https://terra-rpc.polkachu.com',
    rest: 'https://terra-api.polkachu.com',
  },
  [ChainId.TerraClassicMainnet]: {
    rpc: 'https://terra-classic-rpc.publicnode.com',
    rest: 'https://terra-classic-lcd.publicnode.com',
  },
  [ChainId.MigalooMainnet]: {
    rpc: 'https://migaloo-rpc.kleomedes.network',
    rest: 'https://migaloo-api.kleomedes.network',
  },
  [ChainId.MigalooTestnet]: {
    rpc: 'https://migaloo-testnet-rpc.polkachu.com',
    rest: 'https://migaloo-testnet-api.polkachu.com',
  },
  [ChainId.KujiraMainnet]: {
    rpc: 'https://kujira-rpc.publicnode.com',
    rest: 'https://kujira-rest.publicnode.com',
  },
  [ChainId.KujiraTestnet]: {
    rpc: 'https://kujira-testnet-rpc.polkachu.com',
    rest: 'https://kujira-testnet-api.polkachu.com',
  },
  [ChainId.ChihuahuaMainnet]: {
    rpc: 'https://chihuahua-rpc.polkachu.com',
    rest: 'https://chihuahua-api.polkachu.com',
  },
  [ChainId.OraichainMainnet]: {
    rpc: 'https://rpc.orai.io',
    rest: 'https://lcd.orai.io',
  },
  [ChainId.ArchwayMainnet]: {
    rpc: 'https://archway-rpc.polkachu.com',
    rest: 'https://archway-api.polkachu.com',
  },
  [ChainId.BitsongTestnet]: {
    rpc: 'https://rpc-testnet.explorebitsong.com',
    rest: 'https://lcd-testnet.explorebitsong.com',
  },
  [ChainId.BitsongMainnet]: {
    rpc: 'https://rpc.explorebitsong.com',
    rest: 'https://lcd.explorebitsong.com',
  },
  [ChainId.OmniflixHubMainnet]: {
    rpc: 'https://omniflix-rpc.polkachu.com',
    rest: 'https://omniflix-api.polkachu.com',
  },
  [ChainId.OmniflixHubTestnet]: {
    rpc: 'https://rpc.testnet.omniflix.network',
    rest: 'https://api.testnet.omniflix.network',
  },
  [ChainId.SecretTestnet]: {
    rpc: 'https://rpc.pulsar.scrttestnet.com',
    rest: 'https://api.pulsar.scrttestnet.com',
  },
}

export const GAS_OVERRIDES: Partial<
  Record<
    ChainId,
    {
      amount: number
      denom: string
    }
  >
> = {
  [ChainId.KujiraTestnet]: {
    amount: 0.00125,
    denom: 'ukuji',
  },
}

// The chains not to show in the governance UI.
const NO_GOV_CHAIN_IDS = ['noble-1']

/**
 * All configured chains. Configured chains are either supported chains, which
 * DAO DAO is deployed on, or other chains that show up in the governance UI.
 */
export const CONFIGURED_CHAINS: BaseChainConfig[] = [
  ...SUPPORTED_CHAINS,
  // Add other chains from chain registry.
  ...chains
    .flatMap((chain): BaseChainConfig | [] => {
      // Skip if chain already exists in configured chains.
      if (SUPPORTED_CHAINS.some((c) => c.chainId === chain.chainId)) {
        return []
      }

      // Skip if no RPC exists for chain. Can't use `getRpcForChainId` helper
      // because that file depends on this one. Yay circular dependencies.
      if (
        !(chain.chainId in CHAIN_ENDPOINTS) &&
        !chain.chainRegistry?.apis?.rpc?.length
      ) {
        return []
      }

      let explorerUrlTemplates: BaseChainConfig['explorerUrlTemplates'] =
        undefined
      const explorers = chain.chainRegistry?.explorers
      if (explorers) {
        const mintscanExplorer = explorers.find(
          (explorer) =>
            explorer.kind?.toLowerCase() === 'mintscan' &&
            explorer.url?.includes('mintscan.io')
        )
        if (mintscanExplorer) {
          explorerUrlTemplates = {
            tx: mintscanExplorer.url + '/txs/REPLACE',
            gov: mintscanExplorer.url + '/proposals',
            govProp: mintscanExplorer.url + '/proposals/REPLACE',
            wallet: mintscanExplorer.url + '/account/REPLACE',
          }
        }

        if (!explorerUrlTemplates) {
          const pingPubExplorer = explorers.find(
            (explorer) =>
              explorer.kind?.toLowerCase() === 'ping.pub' &&
              // Some explorers have kind = 'ping.pub' but the wrong URL.
              explorer.url?.includes('ping.pub')
          )
          if (pingPubExplorer) {
            explorerUrlTemplates = {
              tx: pingPubExplorer.url + '/tx/REPLACE',
              gov: pingPubExplorer.url + '/gov',
              govProp: pingPubExplorer.url + '/gov/REPLACE',
              wallet: pingPubExplorer.url + '/account/REPLACE',
            }
          }
        }

        if (!explorerUrlTemplates) {
          const atomScanExplorer = explorers.find(
            (explorer) =>
              explorer.kind?.toLowerCase() === 'atomscan' &&
              explorer.url?.includes('atomscan.com')
          )
          if (atomScanExplorer) {
            explorerUrlTemplates = {
              tx: atomScanExplorer.url + '/transactions/REPLACE',
              gov: atomScanExplorer.url + '/votes',
              govProp: atomScanExplorer.url + '/votes/REPLACE',
              wallet: atomScanExplorer.url + '/accounts/REPLACE',
            }
          }
        }

        if (!explorerUrlTemplates) {
          const bigDipperExplorer = explorers.find(
            (explorer) =>
              explorer.kind?.toLowerCase() === 'bigdipper' &&
              explorer.url?.includes('bigdipper.live')
          )
          if (bigDipperExplorer) {
            explorerUrlTemplates = {
              tx: bigDipperExplorer.url + '/transactions/REPLACE',
              gov: bigDipperExplorer.url + '/proposals',
              govProp: bigDipperExplorer.url + '/proposals/REPLACE',
              wallet: bigDipperExplorer.url + '/accounts/REPLACE',
            }
          }
        }

        if (!explorerUrlTemplates) {
          const explorersGuruExplorer = explorers.find(
            (explorer) =>
              explorer.kind?.toLowerCase() === 'explorers.guru' &&
              explorer.url?.includes('explorers.guru')
          )
          if (explorersGuruExplorer) {
            explorerUrlTemplates = {
              tx: explorersGuruExplorer.url + '/transaction/REPLACE',
              gov: explorersGuruExplorer.url + '/proposals',
              govProp: explorersGuruExplorer.url + '/proposals/REPLACE',
              wallet: explorersGuruExplorer.url + '/account/REPLACE',
            }
          }
        }

        if (!explorerUrlTemplates) {
          const stakeflowExplorer = explorers.find(
            (explorer) =>
              explorer.kind?.toLowerCase() === 'stakeflow' &&
              explorer.url?.includes('stakeflow.io')
          )
          if (stakeflowExplorer) {
            explorerUrlTemplates = {
              tx: stakeflowExplorer.url + '/transactions/REPLACE',
              gov: stakeflowExplorer.url + '/proposals',
              govProp: stakeflowExplorer.url + '/proposals/REPLACE',
              wallet: stakeflowExplorer.url + '/accounts/REPLACE',
            }
          }
        }
      }

      return {
        chainId: chain.chainId,
        name: chain.chainName,
        mainnet: chain.chainRegistry?.network_type === 'mainnet',
        accentColor: '',
        noGov: NO_GOV_CHAIN_IDS.includes(chain.chainId),
        explorerUrlTemplates,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name)),
]
