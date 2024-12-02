import { EncodeObject } from '@cosmjs/proto-signing'
import { FetchQueryOptions, QueryClient } from '@tanstack/react-query'

import {
  DaoPreProposeMultipleClient,
  DaoProposalMultipleClient,
} from '@dao-dao/state/contracts'
import {
  daoPreProposeMultipleQueries,
  daoProposalMultipleQueries,
} from '@dao-dao/state/query'
import {
  CheckedDepositInfo,
  Coin,
  ContractVersion,
  Duration,
  Feature,
  ModuleInstantiateInfo,
} from '@dao-dao/types'
import {
  InstantiateMsg as DaoPreProposeMultipleInstantiateMsg,
  UncheckedDepositInfo,
} from '@dao-dao/types/contracts/DaoPreProposeMultiple'
import {
  Config,
  InstantiateMsg,
  MultipleChoiceVote,
  PercentageThreshold,
  PreProposeInfo,
  ProposalResponse,
  VetoConfig,
  VoteInfo,
  VoteResponse,
} from '@dao-dao/types/contracts/DaoProposalMultiple'
import {
  DAO_PROPOSAL_MULTIPLE_CONTRACT_NAMES,
  SupportedSigningCosmWasmClient,
  encodeJsonToBase64,
  findWasmAttributeValue,
  isFeatureSupportedByVersion,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { NewProposalData } from '../../proposal-module-adapter/adapters/DaoProposalMultiple/types'
import { CwDao } from '../dao/CwDao'
import { ProposalModuleBase } from './base'

export class MultipleChoiceProposalModule extends ProposalModuleBase<
  CwDao,
  NewProposalData,
  ProposalResponse,
  VoteResponse,
  VoteInfo,
  MultipleChoiceVote,
  Config
> {
  static contractNames: readonly string[] = DAO_PROPOSAL_MULTIPLE_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config: {
      quorum: PercentageThreshold
      maxVotingPeriod: Duration
      minVotingPeriod?: Duration
      allowRevoting: boolean
      veto?: VetoConfig | null
      deposit?: UncheckedDepositInfo | null
      submissionPolicy: 'members' | 'anyone'
      /**
       * Defaults to true.
       */
      closeProposalOnExecutionFailure?: boolean
      /**
       * Defaults to true.
       */
      onlyMembersExecute?: boolean
    },
    options: {
      /**
       * If defined, use a specific version of the proposal module instead of
       * the latest. This is needed since different contract versions have
       * breaking changes, and we should try to use consistent versions across
       * modules. This is used in the Enable Multiple Choice action, which may
       * be used by old DAOs.
       */
      overrideContractVersion?: ContractVersion
    } = {}
  ): ModuleInstantiateInfo {
    const { latestVersion, allCodeIds } = mustGetSupportedChainConfig(chainId)

    const contractVersion = options.overrideContractVersion || latestVersion
    const {
      DaoProposalMultiple: daoProposalMultipleCodeId,
      DaoPreProposeMultiple: daoPreProposeMultipleCodeId,
    } = allCodeIds[contractVersion] ?? {}

    if (!daoProposalMultipleCodeId || !daoPreProposeMultipleCodeId) {
      throw new Error(
        `Code IDs not found for version ${contractVersion} on chain ${chainId}`
      )
    }

    const pre_propose_info: PreProposeInfo = {
      module_may_propose: {
        info: {
          admin: { core_module: {} },
          code_id: daoPreProposeMultipleCodeId,
          label: `dao-pre-propose-multiple_${Date.now()}`,
          msg: encodeJsonToBase64({
            deposit_info: config.deposit,
            extension: {},
            ...(isFeatureSupportedByVersion(
              Feature.GranularSubmissionPolicy,
              contractVersion
            )
              ? {
                  submission_policy:
                    config.submissionPolicy === 'anyone'
                      ? {
                          anyone: {
                            denylist: [],
                          },
                        }
                      : {
                          specific: {
                            dao_members: true,
                            allowlist: [],
                            denylist: [],
                          },
                        },
                }
              : {
                  open_proposal_submission:
                    config.submissionPolicy === 'anyone',
                }),
          } as DaoPreProposeMultipleInstantiateMsg),
          // This function is used by the enable multiple choice action, and
          // DAOs before v2.3.0 still might want to enable multiple choice, so
          // make sure to support the old version without the `funds` field.
          ...(isFeatureSupportedByVersion(
            Feature.ModuleInstantiateFunds,
            contractVersion
          ) && {
            funds: [],
          }),
        },
      },
    }

    return {
      admin: { core_module: {} },
      code_id: daoProposalMultipleCodeId,
      label: `dao-proposal-multiple_${Date.now()}`,
      msg: encodeJsonToBase64({
        allow_revoting: config.allowRevoting,
        close_proposal_on_execution_failure:
          config.closeProposalOnExecutionFailure ?? true,
        max_voting_period: config.maxVotingPeriod,
        min_voting_period: config.minVotingPeriod,
        only_members_execute: config.onlyMembersExecute ?? true,
        pre_propose_info,
        veto: config.veto,
        voting_strategy: {
          single_choice: {
            quorum: config.quorum,
          },
        },
      } as InstantiateMsg),
      // This function is used by the enable multiple choice action, and DAOs
      // before v2.3.0 still might want to enable multiple choice, so make sure
      // to support the old version without the `funds` field.
      ...(isFeatureSupportedByVersion(
        Feature.ModuleInstantiateFunds,
        contractVersion
      ) && {
        funds: [],
      }),
    }
  }

  /**
   * Query options to fetch the DAO address.
   */
  static getDaoAddressQuery(
    queryClient: QueryClient,
    options: {
      chainId: string
      contractAddress: string
    }
  ) {
    return daoProposalMultipleQueries.dao(queryClient, options)
  }

  async propose({
    data: _data,
    vote,
    getSigningClient,
    sender,
    funds,
  }: {
    data: NewProposalData
    vote?: MultipleChoiceVote
    getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
    sender: string
    funds?: Coin[]
  }): Promise<{
    proposalNumber: number
    proposalId: string
  }> {
    if (vote && !this.supports(Feature.CastVoteOnProposalCreation)) {
      throw new Error(
        `Casting vote on proposal creation is not supported by version ${this.version}`
      )
    }

    const data = {
      ..._data,
      ...(vote && {
        vote: {
          vote,
        },
      }),
    }

    const client = await getSigningClient()

    let proposalNumber: number

    if (this.prePropose) {
      const { events } = await new DaoPreProposeMultipleClient(
        client,
        sender,
        this.prePropose.address
      ).propose(
        {
          msg: {
            // Type mismatch between Cosmos msgs and Secret Network Cosmos msgs.
            // The contract execution will fail if the messages are invalid, so
            // this is safe. The UI should ensure that the co rrect messages are
            // used for the given chain anyways.
            propose: data as any,
          },
        },
        undefined,
        undefined,
        funds
      )

      proposalNumber = Number(
        findWasmAttributeValue(
          this.chainId,
          events,
          this.address,
          'proposal_id'
        ) ?? -1
      )
    } else {
      const { events } = await new DaoProposalMultipleClient(
        client,
        sender,
        this.address
      ).propose(
        // Type mismatch between Cosmos msgs and Secret Network Cosmos msgs.
        // The contract execution will fail if the messages are invalid, so this
        // is safe. The UI should ensure that the correct messages are used for
        // the given chain anyways.
        data as any,
        undefined,
        undefined,
        funds
      )

      proposalNumber = Number(
        findWasmAttributeValue(
          this.chainId,
          events,
          this.address,
          'proposal_id'
        ) ?? -1
      )
    }

    if (proposalNumber === -1) {
      throw new Error('Proposal ID not found')
    }

    return {
      proposalNumber,
      // Proposal IDs are the the prefix plus the proposal number.
      proposalId: `${this.prefix}${proposalNumber}`,
    }
  }

  async vote({
    proposalId,
    vote,
    getSigningClient,
    sender,
  }: {
    proposalId: number
    vote: MultipleChoiceVote
    getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
    sender: string
  }): Promise<void> {
    const client = await getSigningClient()

    await new DaoProposalMultipleClient(client, sender, this.address).vote({
      proposalId,
      vote,
    })

    await this.queryClient.refetchQueries({
      queryKey: this.getVoteQuery({
        proposalId,
        voter: sender,
      }).queryKey,
    })
  }

  async execute({
    proposalId,
    getSigningClient,
    sender,
    memo,
    nonCriticalExtensionOptions,
  }: {
    proposalId: number
    getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
    sender: string
    memo?: string
    nonCriticalExtensionOptions?: EncodeObject[]
  }): Promise<void> {
    const client = await getSigningClient()
    await new DaoProposalMultipleClient(client, sender, this.address).execute(
      {
        proposalId,
      },
      undefined,
      memo,
      undefined,
      nonCriticalExtensionOptions
    )
  }

  async close({
    proposalId,
    getSigningClient,
    sender,
  }: {
    proposalId: number
    getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
    sender: string
  }): Promise<void> {
    const client = await getSigningClient()
    await new DaoProposalMultipleClient(client, sender, this.address).close({
      proposalId,
    })
  }

  getProposalQuery({
    proposalId,
  }: {
    proposalId: number
  }): FetchQueryOptions<ProposalResponse> {
    return daoProposalMultipleQueries.proposal(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        proposalId,
      },
    })
  }

  async getProposal(
    ...params: Parameters<MultipleChoiceProposalModule['getProposalQuery']>
  ): Promise<ProposalResponse> {
    return await this.queryClient.fetchQuery(this.getProposalQuery(...params))
  }

  getVoteQuery({
    proposalId,
    voter,
  }: {
    proposalId: number
    voter?: string
  }): FetchQueryOptions<VoteResponse> {
    return daoProposalMultipleQueries.getVote(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        proposalId,
        ...(voter && { voter }),
        // Force type-cast since the query won't be enabled until voter is set.
        // This allows us to pass an undefined `voter` argument in order to
        // invalidate/refresh the query for all voters.
      } as any,
      // If no voter, return query in loading state.
      options: {
        enabled: !!voter,
      },
    })
  }

  async getVote(
    ...params: Parameters<MultipleChoiceProposalModule['getVoteQuery']>
  ): Promise<VoteInfo | null> {
    return (
      (await this.queryClient.fetchQuery(this.getVoteQuery(...params))).vote ||
      null
    )
  }

  getProposalCountQuery(): FetchQueryOptions<number> {
    return daoProposalMultipleQueries.proposalCount(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.info.address,
    })
  }

  getDaoAddressQuery(): FetchQueryOptions<string> {
    return daoProposalMultipleQueries.dao(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
    })
  }

  getConfigQuery(): FetchQueryOptions<Config> {
    return daoProposalMultipleQueries.config(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
    })
  }

  getDepositInfoQuery(): FetchQueryOptions<CheckedDepositInfo | null> {
    return {
      queryKey: [
        'multipleChoiceProposalModule',
        'depositInfo',
        {
          chainId: this.chainId,
          address: this.address,
        },
      ],
      queryFn: async () => {
        if (this.prePropose) {
          const { deposit_info: depositInfo } =
            await this.queryClient.fetchQuery(
              daoPreProposeMultipleQueries.config(this.queryClient, {
                chainId: this.chainId,
                contractAddress: this.prePropose.address,
              })
            )

          return depositInfo || null
        }

        // If pre-propose is supported but not set, there are no deposits.
        return null
      },
    }
  }

  async getMaxVotingPeriod(): Promise<Duration> {
    return (await this.queryClient.fetchQuery(this.getConfigQuery()))
      .max_voting_period
  }
}
