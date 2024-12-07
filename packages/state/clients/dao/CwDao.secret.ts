import { ChainWalletContext } from '@cosmos-kit/core'
import { FetchQueryOptions, skipToken } from '@tanstack/react-query'
import { nanoid } from 'nanoid'

import {
  DaoCardLazyData,
  DaoInfo,
  DaoSource,
  PermitForPermitData,
  SecretInstantiateInfo,
} from '@dao-dao/types'
import {
  InitialItem,
  InstantiateMsg,
  ModuleInstantiateInfo,
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/SecretDaoDaoCore'
import {
  createSecretNetworkPermit,
  encodeJsonToBase64,
  getFundsFromDaoInstantiateMsg,
  mustGetSupportedChainConfig,
  objectMatchesStructure,
  serializeDaoSource,
} from '@dao-dao/utils'

import { secretDaoDaoCoreQueries } from '../../query'
import {
  FallbackProposalModule,
  SecretMultipleChoiceProposalModule,
  SecretSingleChoiceProposalModule,
} from '../proposal-module'
import {
  SecretCw4VotingModule,
  SecretSnip721StakedVotingModule,
  SecretTokenStakedVotingModule,
} from '../voting-module'
import { CwDao } from './CwDao'

export const getVotingModuleBases = () => [
  SecretCw4VotingModule,
  // SecretSnip20StakedVotingModule,
  SecretSnip721StakedVotingModule,
  SecretTokenStakedVotingModule,
]

export const getProposalModuleBases = () => [
  SecretSingleChoiceProposalModule,
  SecretMultipleChoiceProposalModule,
]

export const SECRET_PERMIT_UPDATE_EVENT_PREFIX = 'secretPermitUpdate:'
export type SecretPermitUpdateEvent = {
  dao: DaoSource
  permit: PermitForPermitData
}

export class SecretCwDao extends CwDao {
  /**
   * Function to sign with amino as the current wallet. Must be set before
   * `getPermit` and `getVotingPower` can be used.
   */
  private signAmino?: ChainWalletContext['signAmino']

  /**
   * Generate the DAO instantiate info. Use the voting module and proposal
   * module generateModuleInstantiateInfo functions to get the module
   * instantiate info objects.
   */
  static generateInstantiateInfo(
    chainId: string,
    config: {
      admin?: string | null
      uri?: string | null
      name: string
      description: string
      imageUrl?: string | null
      initialItems?: InitialItem[] | null
    },
    votingModule: ModuleInstantiateInfo,
    proposalModules: ModuleInstantiateInfo[]
  ): SecretInstantiateInfo {
    const { codeIds, codeHashes } = mustGetSupportedChainConfig(chainId)
    if (!codeHashes || !codeHashes.QueryAuth || !codeIds.QueryAuth) {
      throw new Error('Codes not properly configured for chain ' + chainId)
    }

    return {
      admin: config.admin || null,
      codeId: codeIds.DaoDaoCore,
      codeHash: codeHashes.DaoDaoCore,
      label: `DAO DAO DAO (${Date.now()})`,
      msg: encodeJsonToBase64({
        admin: config.admin,
        dao_uri: config.uri,
        description: config.description,
        // Replace empty strings with null.
        image_url: config.imageUrl?.trim() || null,
        initial_items: config.initialItems,
        name: config.name,
        prng_seed: nanoid(),
        proposal_modules_instantiate_info: proposalModules,
        query_auth_code_hash: codeHashes.QueryAuth,
        query_auth_code_id: codeIds.QueryAuth,
        voting_module_instantiate_info: votingModule,
      } as InstantiateMsg),
      funds: getFundsFromDaoInstantiateMsg({
        voting_module_instantiate_info: votingModule,
        proposal_modules_instantiate_info: proposalModules,
      }),
    }
  }

  protected setInfo(info: DaoInfo | undefined) {
    this._info = info

    if (info) {
      const VotingModule = getVotingModuleBases().find((Base) =>
        Base.contractNames.includes(info.votingModuleInfo.contract)
      )
      if (!VotingModule) {
        throw new Error('Voting module not found')
      }
      this._votingModule = new VotingModule(
        this.queryClient,
        this,
        info.votingModuleAddress,
        info.votingModuleInfo
      )

      const proposalModuleBases = getProposalModuleBases()
      this._proposalModules = info.proposalModules.map((proposalModule) => {
        const ProposalModule =
          proposalModuleBases.find((Base) =>
            Base.contractNames.includes(proposalModule.info.contract)
          ) || FallbackProposalModule

        if (ProposalModule === FallbackProposalModule) {
          console.error(
            `Proposal module not found for contract: ${proposalModule.info.contract}. Using fallback.`
          )
        }

        return new ProposalModule(
          this.queryClient,
          this,
          this.chainId,
          proposalModule.address,
          proposalModule.prefix
        )
      })
    }
  }

  private getPermitLocalStorageKey(address: string) {
    return [
      'secretNetworkPermit',
      this.options.chainId,
      this.options.coreAddress,
      address,
    ].join(':')
  }

  /**
   * Register a function to sign with amino as the current wallet. Must be set
   * before `getPermit` and `getVotingPower` can be used.
   */
  registerSignAmino(signAmino: ChainWalletContext['signAmino']) {
    this.signAmino = signAmino
  }

  /**
   * Retrieve a permit from local storage if it exists. Returns undefined if
   * it doesn't exist.
   */
  getExistingPermit(address: string): PermitForPermitData | undefined {
    // Attempt to load from local storage.
    try {
      const saved = JSON.parse(
        localStorage.getItem(this.getPermitLocalStorageKey(address)) || 'null'
      )
      // Basic validation.
      if (
        objectMatchesStructure(saved, {
          params: {},
          signature: {},
        })
      ) {
        return saved
      }
    } catch (err) {
      console.error('getExistingPermit failed', this.options, address, err)
    }
  }

  async getPermit(address: string): Promise<PermitForPermitData> {
    const existing = this.getExistingPermit(address)
    if (existing) {
      return existing
    }

    if (!this.signAmino) {
      throw new Error(
        'Amino signer not registered. Call registerSignAmino first.'
      )
    }

    // Create a new permit.
    const permit = await createSecretNetworkPermit({
      chainId: this.options.chainId,
      key: this.options.coreAddress,
      signAmino: (signDoc, signOptions) =>
        this.signAmino!(address, signDoc, signOptions),
    })

    // Save to local storage.
    localStorage.setItem(
      this.getPermitLocalStorageKey(address),
      JSON.stringify(permit)
    )

    const dao: DaoSource = {
      chainId: this.options.chainId,
      coreAddress: this.options.coreAddress,
    }

    // Notify window of new permit.
    window.dispatchEvent(
      new CustomEvent<SecretPermitUpdateEvent>(
        SECRET_PERMIT_UPDATE_EVENT_PREFIX + serializeDaoSource(dao),
        {
          detail: {
            dao,
            permit,
          },
        }
      )
    )

    return permit
  }

  getVotingPowerQuery(
    address?: string,
    height?: number
  ): FetchQueryOptions<VotingPowerAtHeightResponse> {
    // If no address nor permit, return query in loading state.
    const permit = address && this.getExistingPermit(address)
    if (!permit) {
      return {
        queryKey: [],
        queryFn: skipToken,
      }
    }

    return secretDaoDaoCoreQueries.votingPowerAtHeight({
      chainId: this.options.chainId,
      contractAddress: this.options.coreAddress,
      args: {
        auth: {
          permit,
        },
        height,
      },
    })
  }

  async getVotingPower(
    address?: string,
    height?: number,
    /**
     * Whether or not to prompt the wallet for a permit. If true,
     * `registerSignAmino` must be called first.
     *
     * Defaults to false.
     */
    prompt = false
  ): Promise<string> {
    if (prompt && address) {
      // Load permit now which will be retrieved in getVoteQuery.
      await this.getPermit(address)
    }

    return await super.getVotingPower(address, height)
  }

  getTotalVotingPowerQuery(
    height?: number
  ): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return secretDaoDaoCoreQueries.totalPowerAtHeight({
      chainId: this.options.chainId,
      contractAddress: this.options.coreAddress,
      args: {
        height,
      },
    })
  }

  async getDaoCardLazyData(): Promise<DaoCardLazyData> {
    const proposalCount = await this.getProposalCount()

    return {
      proposalCount,
      // No TVL because we don't index Secret DAOs.
    }
  }
}
