import { ChainId } from '@dao-dao/types'

export type DeploySetContract =
  | string
  | {
      /**
       * File name of the contract to deploy.
       */
      file: string
      /**
       * Actual alias to use as the name for the contract.
       */
      alias: string
    }

export type DeploySet = {
  name: string
  /**
   * The type of set to deploy.
   *
   * - `once`: Only deploy the set once. If the contracts already exist, do not
   *   deploy new versions.
   * - `always`: Always deploy new versions of the contracts.
   * - `manual`: Do not deploy automatically, but store for manual deployment.
   */
  type: 'once' | 'always' | 'manual'
  /**
   * Contracts to deploy.
   */
  contracts: DeploySetContract[]
  /**
   * If defined, only deploy the set for the given chain IDs.
   */
  chainIds?: string[]
  /**
   * If defined, skip the set for the given chain IDs.
   */
  skipChainIds?: string[]
}

/**
 * List of contracts that should deploy on each chain.
 */
export const deploySets: DeploySet[] = [
  // the polytone contracts to deploy manually
  {
    name: 'polytone',
    type: 'manual',
    contracts: [
      'polytone_listener',
      'polytone_note',
      'polytone_proxy',
      'polytone_voice',
    ],
  },

  // the external contracts to deploy on all chains once
  {
    name: 'external',
    type: 'once',
    contracts: ['cw1_whitelist', 'cw4_group'],
  },

  // the admin factory contract to deploy on all chains every time except Terra
  // Classic since it doesn't support instantiate2
  {
    name: 'admin factory',
    type: 'always',
    contracts: ['cw_admin_factory'],
    skipChainIds: [ChainId.TerraClassicMainnet],
  },

  // the core DAO contracts to deploy on all chains every time
  {
    name: 'core DAO stuff',
    type: 'always',
    contracts: [
      'cw_payroll_factory',
      'cw_token_swap',
      'dao_dao_core',
      'dao_pre_propose_approval_multiple',
      'dao_pre_propose_approval_single',
      'dao_pre_propose_approver',
      'dao_pre_propose_multiple',
      'dao_pre_propose_single',
      'dao_proposal_multiple',
      'dao_proposal_single',
      'dao_rewards_distributor',
      'dao_vote_delegation',
      'dao_voting_cw4',
    ],
  },

  // the v1 to v2 migrator contract to deploy every time
  {
    name: 'migrator',
    type: 'always',
    contracts: ['dao_migrator'],
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,
    ],
  },

  // cw-vesting with staking, which all chains but Neutron support
  {
    name: 'cw-vesting with staking',
    type: 'always',
    contracts: [
      {
        file: 'cw_vesting',
        alias: 'cw_vesting',
      },
    ],
    skipChainIds: [ChainId.NeutronMainnet, ChainId.NeutronTestnet],
  },

  // cw-vesting without staking
  {
    name: 'cw-vesting without staking',
    type: 'always',
    contracts: [
      {
        file: 'cw_vesting-no_staking',
        alias: 'cw_vesting',
      },
    ],
    chainIds: [ChainId.NeutronMainnet, ChainId.NeutronTestnet],
  },

  // cw20 contract to deploy once
  {
    name: 'cw20 base',
    type: 'once',
    contracts: ['cw20_base'],
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      'layer',

      ChainId.OraichainMainnet,

      ChainId.TerraMainnet,
      ChainId.TerraClassicMainnet,
    ],
  },

  // cw20 contracts to deploy every time
  {
    name: 'cw20 DAO stuff',
    type: 'always',
    contracts: ['cw20_stake', 'dao_voting_cw20_staked'],
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      'layer',

      ChainId.OraichainMainnet,

      ChainId.TerraMainnet,
      ChainId.TerraClassicMainnet,
    ],
  },

  // cw721 contract to deploy once
  {
    name: 'cw721 base',
    type: 'once',
    contracts: ['cw721_base'],
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      ChainId.KujiraMainnet,
      ChainId.KujiraTestnet,

      'layer',

      ChainId.MigalooMainnet,
      ChainId.MigalooTestnet,

      ChainId.NeutronMainnet,
      ChainId.NeutronTestnet,

      ChainId.OraichainMainnet,

      ChainId.OsmosisMainnet,
      ChainId.OsmosisTestnet,

      ChainId.TerraMainnet,
      ChainId.TerraClassicMainnet,
    ],
  },

  // cw721 contracts to deploy every time
  {
    name: 'cw721 DAO stuff',
    type: 'always',
    contracts: ['dao_voting_cw721_staked'],
    chainIds: [
      ChainId.BitsongMainnet,
      ChainId.BitsongTestnet,

      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      ChainId.KujiraMainnet,
      ChainId.KujiraTestnet,

      'layer',

      ChainId.MigalooMainnet,
      ChainId.MigalooTestnet,

      ChainId.NeutronMainnet,
      ChainId.NeutronTestnet,

      ChainId.OraichainMainnet,

      ChainId.OsmosisMainnet,
      ChainId.OsmosisTestnet,

      ChainId.StargazeMainnet,
      ChainId.StargazeTestnet,

      ChainId.TerraMainnet,
      ChainId.TerraClassicMainnet,
    ],
  },

  // token factory contract to deploy every time
  {
    name: 'token factory',
    type: 'always',
    contracts: [
      {
        file: 'cw_tokenfactory_issuer',
        alias: 'cw_tokenfactory_issuer',
      },
    ],
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      'layer',

      ChainId.MigalooMainnet,
      ChainId.MigalooTestnet,

      ChainId.NeutronMainnet,
      ChainId.NeutronTestnet,

      ChainId.OmniflixHubMainnet,
      ChainId.OmniflixHubTestnet,

      ChainId.OraichainMainnet,

      ChainId.OsmosisMainnet,
      ChainId.OsmosisTestnet,

      ChainId.StargazeMainnet,
      ChainId.StargazeTestnet,

      ChainId.TerraMainnet,
    ],
  },

  // token factory kujira contract to deploy every time
  {
    name: 'token factory kujira',
    type: 'always',
    contracts: [
      {
        file: 'cw_tokenfactory_issuer-kujira',
        alias: 'cw_tokenfactory_issuer',
      },
    ],
    chainIds: [ChainId.KujiraMainnet, ChainId.KujiraTestnet],
  },

  // token staking contract to deploy every time
  {
    name: 'token staking',
    type: 'always',
    contracts: ['dao_voting_token_staked'],
    chainIds: [
      ChainId.BitsongMainnet,
      ChainId.BitsongTestnet,

      ChainId.CosmosHubMainnet,
      ChainId.CosmosHubProviderTestnet,

      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      ChainId.KujiraMainnet,
      ChainId.KujiraTestnet,

      'layer',

      ChainId.MigalooMainnet,
      ChainId.MigalooTestnet,

      ChainId.NeutronMainnet,
      ChainId.NeutronTestnet,

      ChainId.OmniflixHubMainnet,
      ChainId.OmniflixHubTestnet,

      ChainId.OraichainMainnet,

      ChainId.OsmosisMainnet,
      ChainId.OsmosisTestnet,

      ChainId.StargazeMainnet,
      ChainId.StargazeTestnet,

      ChainId.TerraMainnet,
    ],
  },

  // bitsong contract to deploy every time
  {
    name: 'bitsong',
    type: 'always',
    contracts: ['btsg_ft_factory'],
    chainIds: [ChainId.BitsongMainnet, ChainId.BitsongTestnet],
  },

  // omniflix NFT staking to deploy every time
  {
    name: 'omniflix',
    type: 'always',
    contracts: ['dao_voting_onft_staked'],
    chainIds: [ChainId.OmniflixHubMainnet, ChainId.OmniflixHubTestnet],
  },
]

/**
 * Map chain ID to indexer ansible group_vars name.
 */
export const chainIdToIndexerGroupVarsName: Record<string, string> = {
  [ChainId.BitsongMainnet]: 'bitsong_mainnet',
  [ChainId.BitsongTestnet]: 'bitsong_testnet',
  [ChainId.CosmosHubMainnet]: 'cosmosHub_mainnet',
  [ChainId.CosmosHubProviderTestnet]: 'cosmosHubProvider_testnet',
  [ChainId.JunoMainnet]: 'juno_mainnet',
  [ChainId.JunoTestnet]: 'juno_testnet',
  [ChainId.KujiraMainnet]: 'kujira_mainnet',
  [ChainId.KujiraTestnet]: 'kujira_testnet',
  [ChainId.MigalooMainnet]: 'migaloo_mainnet',
  [ChainId.MigalooTestnet]: 'migaloo_testnet',
  [ChainId.NeutronMainnet]: 'neutron_mainnet',
  [ChainId.NeutronTestnet]: 'neutron_testnet',
  [ChainId.OmniflixHubMainnet]: 'omniflix_mainnet',
  [ChainId.OmniflixHubTestnet]: 'omniflix_testnet',
  [ChainId.OraichainMainnet]: 'oraichain_mainnet',
  [ChainId.OsmosisMainnet]: 'osmosis_mainnet',
  [ChainId.OsmosisTestnet]: 'osmosis_testnet',
  [ChainId.StargazeMainnet]: 'stargaze_mainnet',
  [ChainId.StargazeTestnet]: 'stargaze_testnet',
  [ChainId.TerraMainnet]: 'terra_mainnet',
  [ChainId.TerraClassicMainnet]: 'terraClassic_mainnet',
}

/**
 * Map chain ID to deployment argument overrides.
 */
export const chainIdToDeploymentArgs: Record<string, Record<string, any>> = {
  [ChainId.StargazeMainnet]: {
    authz: 'stars1565xc6aq0ycfx5zwusevpmwx6f5uzp93zuutfp',
  },
  [ChainId.KujiraMainnet]: {
    mnemonic: 'df_operator',
    authz: 'kujira1ss7avjjlzrmnp2m3thges80vetpq4nr8tjk20f0arweke8r840ss58v6yh',
    restrictInstantiation: true,
    instantiateAdminFactory: false,
  },
  [ChainId.OmniflixHubMainnet]: {
    mnemonic: 'df_operator',
    authz:
      'omniflix1kr6t4gg33kfuc26rz4xxkv0ftlxq5j09pndcf9ndk450rrevgf8sy59urv',
  },
  [ChainId.BitsongTestnet]: {
    mnemonic: 'bitsong_testnet',
  },
}
