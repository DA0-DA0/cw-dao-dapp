import { EncodeObject } from '@cosmjs/proto-signing'
import { FetchQueryOptions, QueryClient } from '@tanstack/react-query'

import {
  CwProposalSingleV1Client,
  DaoPreProposeSingleClient,
  DaoProposalSingleV2Client,
} from '@dao-dao/state/contracts'
import {
  cwProposalSingleV1Queries,
  daoProposalSingleV2Queries,
} from '@dao-dao/state/query'
import { daoPreProposeSingleQueries } from '@dao-dao/state/query/queries/contracts/DaoPreProposeSingle'
import {
  CheckedDepositInfo,
  Coin,
  ContractVersion,
  DepositRefundPolicy,
  Duration,
  Feature,
  ModuleInstantiateInfo,
} from '@dao-dao/types'
import { InstantiateMsg as DaoPreProposeApprovalSingleInstantiateMsg } from '@dao-dao/types/contracts/DaoPreProposeApprovalSingle'
import {
  InstantiateMsg as DaoPreProposeSingleInstantiateMsg,
  UncheckedDepositInfo,
} from '@dao-dao/types/contracts/DaoPreProposeSingle'
import {
  Config,
  InstantiateMsg,
  PreProposeInfo,
  ProposalResponse,
  Threshold,
  VetoConfig,
  Vote,
  VoteInfo,
  VoteResponse,
} from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import {
  ContractName,
  DAO_PROPOSAL_SINGLE_CONTRACT_NAMES,
  SupportedSigningCosmWasmClient,
  encodeJsonToBase64,
  findWasmAttributeValue,
  isFeatureSupportedByVersion,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { NewProposalData } from '../../proposal-module-adapter/adapters/DaoProposalSingle/types'
import { CwDao } from '../dao/CwDao'
import { ProposalModuleBase } from './base'

export class SingleChoiceProposalModule extends ProposalModuleBase<
  CwDao,
  NewProposalData,
  ProposalResponse,
  VoteResponse,
  VoteInfo,
  Vote,
  Config
> {
  static contractNames: readonly string[] = DAO_PROPOSAL_SINGLE_CONTRACT_NAMES

  /**
   * Generate the module instantiate info to plug into the DAO instantiate info
   * generator function.
   */
  static generateModuleInstantiateInfo(
    chainId: string,
    config: {
      threshold: Threshold
      maxVotingPeriod: Duration
      minVotingPeriod?: Duration
      allowRevoting: boolean
      veto?: VetoConfig | null
      approver?: string
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
    }
  ): ModuleInstantiateInfo {
    const { codeIds, latestVersion } = mustGetSupportedChainConfig(chainId)

    const preProposeCommon = {
      deposit_info: config.deposit,
      ...(isFeatureSupportedByVersion(
        Feature.GranularSubmissionPolicy,
        latestVersion
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
            open_proposal_submission: config.submissionPolicy === 'anyone',
          }),
    }

    const pre_propose_info: PreProposeInfo = {
      module_may_propose: {
        info: {
          admin: { core_module: {} },
          code_id: config.approver
            ? codeIds.DaoPreProposeApprovalSingle
            : codeIds.DaoPreProposeSingle,
          label: `dao-pre-propose${
            config.approver ? '-approval' : ''
          }-single_${Date.now()}`,
          msg: encodeJsonToBase64(
            config.approver
              ? ({
                  ...preProposeCommon,
                  extension: {
                    approver: config.approver,
                  },
                } as DaoPreProposeApprovalSingleInstantiateMsg)
              : ({
                  ...preProposeCommon,
                  extension: {},
                } as DaoPreProposeSingleInstantiateMsg)
          ),
          funds: [],
        },
      },
    }

    return {
      admin: { core_module: {} },
      code_id: codeIds.DaoProposalSingle,
      label: `dao-proposal-single_${Date.now()}`,
      msg: encodeJsonToBase64({
        allow_revoting: config.allowRevoting,
        close_proposal_on_execution_failure:
          config.closeProposalOnExecutionFailure ?? true,
        max_voting_period: config.maxVotingPeriod,
        min_voting_period: config.minVotingPeriod,
        only_members_execute: config.onlyMembersExecute ?? true,
        pre_propose_info,
        threshold: config.threshold,
        veto: config.veto,
      } as InstantiateMsg),
      funds: [],
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
    return daoProposalSingleV2Queries.dao(queryClient, options)
  }

  async propose({
    data: _data,
    vote,
    getSigningClient,
    sender,
    funds,
  }: {
    data: NewProposalData
    vote?: Vote
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
    let isPreProposeApprovalProposal = false

    // V1 does not support pre-propose.
    if (this.version === ContractVersion.V1) {
      const { events } = await new CwProposalSingleV1Client(
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

      // Every other version supports pre-propose.
    } else if (this.prePropose) {
      const { events } = await new DaoPreProposeSingleClient(
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

      isPreProposeApprovalProposal =
        this.prePropose.contractName ===
          ContractName.PreProposeApprovalSingle ||
        this.prePropose.contractName === ContractName.PreProposeApprovalMultiple
      proposalNumber =
        // pre-propose-approval proposals have a different event
        isPreProposeApprovalProposal
          ? Number(
              findWasmAttributeValue(
                this.chainId,
                events,
                this.prePropose.address,
                'id'
              ) ?? -1
            )
          : Number(
              findWasmAttributeValue(
                this.chainId,
                events,
                this.address,
                'proposal_id'
              ) ?? -1
            )
    } else {
      const { events } = await new DaoProposalSingleV2Client(
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
      // Proposal IDs are the the prefix plus the proposal number. If a
      // pre-propose-approval proposal, an asterisk is inserted in the middle.
      proposalId: `${this.prefix}${
        isPreProposeApprovalProposal ? '*' : ''
      }${proposalNumber}`,
    }
  }

  async vote({
    proposalId,
    vote,
    getSigningClient,
    sender,
  }: {
    proposalId: number
    vote: Vote
    getSigningClient: () => Promise<SupportedSigningCosmWasmClient>
    sender: string
  }): Promise<void> {
    const client = await getSigningClient()

    const Client =
      this.version === ContractVersion.V1
        ? CwProposalSingleV1Client
        : DaoProposalSingleV2Client

    await new Client(client, sender, this.address).vote({
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

    const Client =
      this.version === ContractVersion.V1
        ? CwProposalSingleV1Client
        : DaoProposalSingleV2Client

    await new Client(client, sender, this.address).execute(
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

    const Client =
      this.version === ContractVersion.V1
        ? CwProposalSingleV1Client
        : DaoProposalSingleV2Client

    await new Client(client, sender, this.address).close({
      proposalId,
    })
  }

  getProposalQuery({
    proposalId,
  }: {
    proposalId: number
  }): FetchQueryOptions<ProposalResponse> {
    return daoProposalSingleV2Queries.proposal(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
      args: {
        proposalId,
      },
    })
  }

  async getProposal(
    ...params: Parameters<SingleChoiceProposalModule['getProposalQuery']>
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
    const query =
      this.info.version === ContractVersion.V1
        ? cwProposalSingleV1Queries.vote
        : daoProposalSingleV2Queries.getVote

    return query(this.queryClient, {
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
    ...params: Parameters<SingleChoiceProposalModule['getVoteQuery']>
  ): Promise<VoteInfo | null> {
    return (
      (await this.queryClient.fetchQuery(this.getVoteQuery(...params))).vote ||
      null
    )
  }

  getProposalCountQuery(): FetchQueryOptions<number> {
    const query =
      this.info.version === ContractVersion.V1
        ? cwProposalSingleV1Queries.proposalCount
        : daoProposalSingleV2Queries.proposalCount

    return query(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
    })
  }

  getConfigQuery(): FetchQueryOptions<Config> {
    return daoProposalSingleV2Queries.config(this.queryClient, {
      chainId: this.chainId,
      contractAddress: this.address,
    })
  }

  getDepositInfoQuery(): FetchQueryOptions<CheckedDepositInfo | null> {
    return {
      queryKey: [
        'singleChoiceProposalModule',
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
              daoPreProposeSingleQueries.config(this.queryClient, {
                chainId: this.chainId,
                contractAddress: this.prePropose.address,
              })
            )

          return depositInfo || null
        } else if (
          // V1 has proposal deposits built right into the proposal module
          // instead of a separate pre-propose module.
          !isFeatureSupportedByVersion(Feature.PrePropose, this.version)
        ) {
          const { deposit_info: depositInfo } =
            await this.queryClient.fetchQuery(
              cwProposalSingleV1Queries.config(this.queryClient, {
                chainId: this.chainId,
                contractAddress: this.address,
              })
            )

          return depositInfo
            ? {
                amount: depositInfo.deposit,
                denom: {
                  cw20: depositInfo.token,
                },
                refund_policy: depositInfo.refund_failed_proposals
                  ? DepositRefundPolicy.Always
                  : DepositRefundPolicy.OnlyPassed,
              }
            : null
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
