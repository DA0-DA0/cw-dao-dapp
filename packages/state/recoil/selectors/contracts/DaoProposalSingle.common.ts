import { RecoilValueReadOnly, selectorFamily } from 'recoil'

import {
  contractVersionSelector,
  queryContractIndexerSelector,
  refreshProposalIdAtom,
  refreshProposalsIdAtom,
} from '@dao-dao/state'
import { ContractVersion, WithChainId } from '@dao-dao/types'
import {
  ConfigResponse as ConfigV1Response,
  ProposalResponse as ProposalV1Response,
  ReverseProposalsResponse as ReverseProposalsV1Response,
} from '@dao-dao/types/contracts/CwProposalSingle.v1'
import {
  ListVotesResponse,
  VoteInfo,
  VoteResponse,
} from '@dao-dao/types/contracts/DaoProposalSingle.common'
import {
  Config as ConfigV2Response,
  ProposalResponse as ProposalV2Response,
  ProposalListResponse as ReverseProposalsV2Response,
} from '@dao-dao/types/contracts/DaoProposalSingle.v2'

import {
  configSelector as configV1Selector,
  getVoteSelector as getVoteV1Selector,
  listVotesSelector as listVotesV1Selector,
  proposalCountSelector as proposalCountV1Selector,
  proposalSelector as proposalV1Selector,
  reverseProposalsSelector as reverseProposalsV1Selector,
} from './CwProposalSingle.v1'
import {
  configSelector as configV2Selector,
  getVoteSelector as getVoteV2Selector,
  listVotesSelector as listVotesV2Selector,
  proposalCountSelector as proposalCountV2Selector,
  proposalSelector as proposalV2Selector,
  reverseProposalsSelector as reverseProposalsV2Selector,
} from './DaoProposalSingle.v2'

type QueryClientParams = WithChainId<{
  contractAddress: string
}>

export const getVoteSelector = selectorFamily<
  VoteResponse,
  QueryClientParams & {
    params: [
      {
        proposalId: number
        voter: string
      },
    ]
  }
>({
  key: 'daoProposalSingleCommonGetVote',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? getVoteV1Selector
          : getVoteV2Selector

      return get<VoteResponse>(selector(params))
    },
})

export const listVotesSelector = selectorFamily<
  ListVotesResponse,
  QueryClientParams & {
    params: [
      {
        limit?: number
        proposalId: number
        startAfter?: string
      },
    ]
  }
>({
  key: 'daoProposalSingleCommonListVotes',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? listVotesV1Selector
          : listVotesV2Selector

      return get<ListVotesResponse>(selector(params))
    },
})

const LIST_ALL_VOTES_LIMIT = 30
export const listAllVotesSelector = selectorFamily<
  VoteInfo[],
  QueryClientParams & {
    proposalId: number
  }
>({
  key: 'daoProposalSingleCommonListAllVotes',
  get:
    ({ proposalId, ...queryClientParams }) =>
    async ({ get }) => {
      // Attempt to load all from indexer first.
      const id =
        get(refreshProposalsIdAtom) +
        get(
          refreshProposalIdAtom({
            address: queryClientParams.contractAddress,
            proposalId,
          })
        )

      const indexerVotes = get(
        queryContractIndexerSelector({
          ...queryClientParams,
          formula: 'daoProposalSingle/listVotes',
          args: {
            proposalId,
          },
          id,
        })
      )
      if (indexerVotes) {
        return indexerVotes
      }

      const votes: VoteInfo[] = []

      while (true) {
        const response = get(
          listVotesSelector({
            ...queryClientParams,
            params: [
              {
                startAfter: votes[votes.length - 1]?.voter,
                proposalId,
                limit: LIST_ALL_VOTES_LIMIT,
              },
            ],
          })
        )
        if (!response?.votes.length) break

        votes.push(...response.votes)

        // If we have less than the limit of items, we've exhausted them.
        if (response.votes.length < LIST_ALL_VOTES_LIMIT) {
          break
        }
      }

      return votes
    },
})

export const listPaginatedVotesSelector: (
  param: QueryClientParams & {
    proposalId: number
    page: number
    pageSize: number
  }
) => RecoilValueReadOnly<ListVotesResponse> = selectorFamily({
  key: 'daoProposalSingleCommonListPaginatedVotes',
  get:
    ({ proposalId, page, pageSize, ...queryClientParams }) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector(queryClientParams)
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? listVotesV1Selector
          : listVotesV2Selector

      let startAfter: string | undefined
      // Get last page so we can retrieve the last voter from it.
      if (page > 1) {
        const lastPage = get(
          listPaginatedVotesSelector({
            ...queryClientParams,
            proposalId,
            page: page - 1,
            pageSize,
          })
        )
        if (lastPage.votes.length > 0) {
          startAfter = lastPage.votes[lastPage.votes.length - 1].voter
        }
      }

      return get<ListVotesResponse>(
        selector({
          ...queryClientParams,
          params: [
            {
              proposalId,
              startAfter,
              limit: pageSize,
            },
          ],
        })
      )
    },
})

export const proposalSelector = selectorFamily<
  ProposalV1Response | ProposalV2Response,
  QueryClientParams & {
    params: [
      {
        proposalId: number
      },
    ]
  }
>({
  key: 'daoProposalSingleCommonProposal',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? proposalV1Selector
          : proposalV2Selector

      return get<ProposalV1Response | ProposalV2Response>(selector(params))
    },
})

export const configSelector = selectorFamily<
  ConfigV1Response | ConfigV2Response,
  QueryClientParams
>({
  key: 'daoProposalSingleCommonConfig',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? configV1Selector
          : configV2Selector

      return get<ConfigV1Response | ConfigV2Response>(selector(params))
    },
})

export const proposalCountSelector = selectorFamily<number, QueryClientParams>({
  key: 'daoProposalSingleCommonProposalCount',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? proposalCountV1Selector
          : proposalCountV2Selector

      return get<number>(selector(params))
    },
})

export const reverseProposalsSelector = selectorFamily<
  ReverseProposalsV1Response | ReverseProposalsV2Response,
  QueryClientParams & {
    params: [
      {
        limit?: number
        startBefore?: number
      },
    ]
  }
>({
  key: 'daoProposalSingleCommonReverseProposals',
  get:
    (params) =>
    async ({ get }) => {
      const proposalModuleVersion = get(
        contractVersionSelector({
          contractAddress: params.contractAddress,
          chainId: params.chainId,
        })
      )
      const selector =
        proposalModuleVersion === ContractVersion.V1
          ? reverseProposalsV1Selector
          : reverseProposalsV2Selector

      return get<ReverseProposalsV1Response | ReverseProposalsV2Response>(
        selector(params)
      )
    },
})
