import fs from 'fs'
import path from 'path'

import { ChainId } from '@dao-dao/types'

import { uploadContract } from '../utils'

export class DeploySetContract {
  /**
   * Actual file name of the contract to deploy.
   */
  public readonly file: string
  /**
   * Name for the contract. Defaults to the file name.
   */
  public readonly name: string

  constructor(file: string, alias?: string) {
    this.file = file
    this.name = alias ?? file
  }

  /**
   * Get path to the WASM file for the contract given a list of directories to
   * search.
   */
  getWasmPath(contractDirs: string[]): string {
    for (const contractDir of contractDirs) {
      const file = path.join(contractDir, `${this.file}.wasm`)
      if (fs.existsSync(file)) {
        return file
      }
    }

    throw new Error(`${this.file}.wasm not found in contract directories`)
  }

  /**
   * Upload this contract.
   */
  upload(
    options: Omit<Parameters<typeof uploadContract>[0], 'id' | 'file'> & {
      contractDirs: string[]
    }
  ) {
    return uploadContract({
      ...options,
      id: this.name,
      file: this.getWasmPath(options.contractDirs),
    })
  }
}

export class DeploySet {
  /**
   * If defined, only deploy the set for the given chain IDs.
   */
  public readonly chainIds?: string[]
  /**
   * If defined, skip the set for the given chain IDs.
   */
  public readonly skipChainIds?: string[]

  constructor(
    public readonly name: string,
    /**
     * The type of set to deploy.
     *
     * - `once`: Only deploy the set once. If the contracts already exist, do
     *   not deploy new versions.
     * - `always`: Always deploy new versions of the contracts.
     * - `manual`: Do not deploy automatically, but store for manual deployment.
     */
    public readonly type: 'once' | 'always' | 'manual',
    /**
     * Contracts to deploy.
     */
    public readonly contracts: DeploySetContract[],
    /**
     * Additional options.
     */
    public readonly options?: {
      /**
       * If defined, only deploy the set for the given chain IDs.
       */
      chainIds?: string[]
      /**
       * If defined, skip the set for the given chain IDs.
       */
      skipChainIds?: string[]
    }
  ) {
    this.chainIds = options?.chainIds
    this.skipChainIds = options?.skipChainIds
  }

  /**
   * Get automatically deployable sets for a given chain.
   */
  static getAutoDeploySets(chainId: string) {
    return deploySets.filter(
      (s) =>
        s.type !== 'manual' &&
        (!s.chainIds || s.chainIds.includes(chainId)) &&
        !s.skipChainIds?.includes(chainId)
    )
  }
}

/**
 * List of contracts that should deploy on each chain.
 */
export const deploySets: DeploySet[] = [
  // the polytone contracts to deploy manually
  new DeploySet('polytone', 'manual', [
    new DeploySetContract('polytone_listener'),
    new DeploySetContract('polytone_note'),
    new DeploySetContract('polytone_proxy'),
    new DeploySetContract('polytone_voice'),
  ]),

  // the external contracts to deploy on all chains once
  new DeploySet('external', 'once', [
    new DeploySetContract('cw1_whitelist'),
    new DeploySetContract('cw4_group'),
  ]),

  // the admin factory contract to deploy on all chains every time except Terra
  // Classic since it doesn't support instantiate2
  new DeploySet(
    'admin factory',
    'always',
    [new DeploySetContract('cw_admin_factory')],
    {
      skipChainIds: [ChainId.TerraClassicMainnet],
    }
  ),

  // the core DAO contracts to deploy on all chains every time
  new DeploySet('core DAO stuff', 'always', [
    new DeploySetContract('cw_payroll_factory'),
    new DeploySetContract('cw_token_swap'),
    new DeploySetContract('dao_dao_core'),
    new DeploySetContract('dao_pre_propose_approval_multiple'),
    new DeploySetContract('dao_pre_propose_approval_single'),
    new DeploySetContract('dao_pre_propose_approver'),
    new DeploySetContract('dao_pre_propose_multiple'),
    new DeploySetContract('dao_pre_propose_single'),
    new DeploySetContract('dao_proposal_multiple'),
    new DeploySetContract('dao_proposal_single'),
    new DeploySetContract('dao_rewards_distributor'),
    new DeploySetContract('dao_vote_delegation'),
    new DeploySetContract('dao_voting_cw4'),
  ]),

  // the v1 to v2 migrator contract to deploy every time
  new DeploySet('migrator', 'always', [new DeploySetContract('dao_migrator')], {
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,
    ],
  }),

  // cw-vesting with staking, which all chains but Neutron support
  new DeploySet(
    'cw-vesting with staking',
    'always',
    [new DeploySetContract('cw_vesting')],
    {
      skipChainIds: [ChainId.NeutronMainnet, ChainId.NeutronTestnet],
    }
  ),

  // cw-vesting without staking
  new DeploySet(
    'cw-vesting without staking',
    'always',
    [new DeploySetContract('cw_vesting-no_staking', 'cw_vesting')],
    {
      chainIds: [ChainId.NeutronMainnet, ChainId.NeutronTestnet],
    }
  ),

  // cw20 contract to deploy once
  new DeploySet('cw20 base', 'once', [new DeploySetContract('cw20_base')], {
    chainIds: [
      ChainId.JunoMainnet,
      ChainId.JunoTestnet,
      ChainId.StarshipJunoTesting,

      'layer',

      ChainId.OraichainMainnet,

      ChainId.TerraMainnet,
      ChainId.TerraClassicMainnet,
    ],
  }),

  // cw20 contracts to deploy every time
  new DeploySet(
    'cw20 DAO stuff',
    'always',
    [
      new DeploySetContract('cw20_stake'),
      new DeploySetContract('dao_voting_cw20_staked'),
    ],
    {
      chainIds: [
        ChainId.JunoMainnet,
        ChainId.JunoTestnet,
        ChainId.StarshipJunoTesting,

        'layer',

        ChainId.OraichainMainnet,

        ChainId.TerraMainnet,
        ChainId.TerraClassicMainnet,
      ],
    }
  ),

  // cw721 contract to deploy once
  new DeploySet('cw721 base', 'once', [new DeploySetContract('cw721_base')], {
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
  }),

  // cw721 contracts to deploy every time
  new DeploySet(
    'cw721 DAO stuff',
    'always',
    [new DeploySetContract('dao_voting_cw721_staked')],
    {
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
    }
  ),

  // token factory contract to deploy every time
  new DeploySet(
    'token factory',
    'always',
    [new DeploySetContract('cw_tokenfactory_issuer')],
    {
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
    }
  ),

  // token factory kujira contract to deploy every time
  new DeploySet(
    'token factory kujira',
    'always',
    [
      new DeploySetContract(
        'cw_tokenfactory_issuer-kujira',
        'cw_tokenfactory_issuer'
      ),
    ],
    {
      chainIds: [ChainId.KujiraMainnet, ChainId.KujiraTestnet],
    }
  ),

  // token staking contract to deploy every time
  new DeploySet(
    'token staking',
    'always',
    [new DeploySetContract('dao_voting_token_staked')],
    {
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
    }
  ),

  // bitsong contract to deploy every time
  new DeploySet(
    'bitsong',
    'always',
    [new DeploySetContract('btsg_ft_factory')],
    {
      chainIds: [ChainId.BitsongMainnet, ChainId.BitsongTestnet],
    }
  ),

  // omniflix NFT staking to deploy every time
  new DeploySet(
    'omniflix',
    'always',
    [new DeploySetContract('dao_voting_onft_staked')],
    {
      chainIds: [ChainId.OmniflixHubMainnet, ChainId.OmniflixHubTestnet],
    }
  ),
]
