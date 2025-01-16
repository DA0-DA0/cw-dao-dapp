import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chainQueries } from '@dao-dao/state/query'
import {
  ProposalList as StatelessProposalList,
  useChain,
} from '@dao-dao/stateless'
import { StatefulGovProposalLineProps } from '@dao-dao/types'
import { ProposalStatus } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { chainIsIndexed, getDisplayNameForChainId } from '@dao-dao/utils'

import {
  useQueryLoadingDataWithError,
  useRefreshGovProposals,
} from '../../hooks'
import { useOnCurrentDaoWebSocketMessage } from '../../hooks/useWebSocket'
import { LinkWrapper } from '../LinkWrapper'
import { GovProposalLine } from './GovProposalLine'

const PROPSALS_PER_PAGE = 20

export const GovProposalList = ({ className }: { className: string }) => {
  const { t } = useTranslation()
  const chain = useChain()
  const { asPath } = useRouter()
  const queryClient = useQueryClient()
  const hasIndexer = chainIsIndexed(chain.chainId)

  // Refresh all proposals on proposal WebSocket messages.
  const refreshGovProposals = useRefreshGovProposals()
  useOnCurrentDaoWebSocketMessage('proposal', refreshGovProposals)

  const openGovProposalsVotingPeriod = useQueryLoadingDataWithError(
    chainQueries.govProposals(queryClient, {
      chainId: chain.chainId,
      status: ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD,
    })
  )

  const govProposalsDepositPeriod = useQueryLoadingDataWithError(
    chainQueries.govProposals(queryClient, {
      chainId: chain.chainId,
      status: ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD,
    })
  )

  // Get max page by loading a single item and then getting the total.
  const loadingMaxPage = useQueryLoadingDataWithError(
    chainQueries.govProposals(queryClient, {
      chainId: chain.chainId,
      limit: 1,
    })
  )
  const maxPage =
    loadingMaxPage.loading || loadingMaxPage.errored || loadingMaxPage.updating
      ? 1
      : Math.ceil(loadingMaxPage.data.total / PROPSALS_PER_PAGE)

  const [page, setPage] = useState(1)
  const loadingPaginatedGovProposals = useQueryLoadingDataWithError(
    chainQueries.govProposals(queryClient, {
      chainId: chain.chainId,
      offset: (page - 1) * PROPSALS_PER_PAGE,
      limit: PROPSALS_PER_PAGE,
    })
  )
  // Only allow incrementing the page once the current page has loaded and if
  // we're below the max.
  const goToNextPage = useCallback(() => {
    if (
      loadingPaginatedGovProposals.loading ||
      loadingPaginatedGovProposals.updating
    ) {
      return
    }

    setPage((page) => Math.min(page + 1, maxPage))
  }, [loadingPaginatedGovProposals, maxPage])

  const [historyProposals, setHistoryProposals] = useState<
    StatefulGovProposalLineProps[]
  >([])

  useEffect(() => {
    if (
      loadingPaginatedGovProposals.loading ||
      loadingPaginatedGovProposals.errored ||
      loadingPaginatedGovProposals.updating
    ) {
      return
    }

    const newHistoryProposals = loadingPaginatedGovProposals.data.proposals
      .filter(
        (prop) =>
          prop.proposal.status === ProposalStatus.PROPOSAL_STATUS_PASSED ||
          prop.proposal.status === ProposalStatus.PROPOSAL_STATUS_REJECTED ||
          prop.proposal.status === ProposalStatus.PROPOSAL_STATUS_FAILED
      )
      .map(
        (proposal): StatefulGovProposalLineProps => ({
          proposalId: proposal.id.toString(),
          proposal,
        })
      )

    // Add new proposals to history that aren't already there.
    setHistoryProposals((prev) =>
      [
        ...prev,
        ...newHistoryProposals.filter(
          ({ proposalId }) => !prev.some((p) => p.proposalId === proposalId)
        ),
      ].sort((a, b) => Number(b.proposalId) - Number(a.proposalId))
    )
  }, [loadingPaginatedGovProposals])

  const openProposals =
    openGovProposalsVotingPeriod.loading || openGovProposalsVotingPeriod.errored
      ? []
      : openGovProposalsVotingPeriod.data.proposals
          .map(
            (proposal): StatefulGovProposalLineProps => ({
              proposalId: proposal.id.toString(),
              proposal,
            })
          )
          .sort(
            (a, b) =>
              (b.proposal.proposal.votingEndTime ?? new Date(0)).getTime() -
              (a.proposal.proposal.votingEndTime ?? new Date(0)).getTime()
          )

  const depositPeriodProposals =
    govProposalsDepositPeriod.loading || govProposalsDepositPeriod.errored
      ? []
      : govProposalsDepositPeriod.data.proposals
          .map(
            (proposal): StatefulGovProposalLineProps => ({
              proposalId: proposal.id.toString(),
              proposal,
            })
          )
          .sort(
            (a, b) =>
              (b.proposal.proposal.depositEndTime ?? new Date(0)).getTime() -
              (a.proposal.proposal.depositEndTime ?? new Date(0)).getTime()
          )

  const historyCount =
    loadingPaginatedGovProposals.loading ||
    loadingPaginatedGovProposals.errored ||
    openGovProposalsVotingPeriod.loading ||
    openGovProposalsVotingPeriod.errored ||
    govProposalsDepositPeriod.loading ||
    govProposalsDepositPeriod.errored
      ? 0
      : loadingPaginatedGovProposals.data.total -
        openGovProposalsVotingPeriod.data.proposals.length -
        govProposalsDepositPeriod.data.proposals.length

  const [search, setSearch] = useState('')
  const showingSearchResults = hasIndexer && !!search && search.length > 0
  const searchedGovProposals = useQueryLoadingDataWithError(
    showingSearchResults
      ? chainQueries.searchAndDecodeGovProposals(queryClient, {
          chainId: chain.chainId,
          query: search,
          limit: 20,
        })
      : undefined
  )

  return (
    <StatelessProposalList
      DiscordNotifierConfigureModal={undefined}
      LinkWrapper={LinkWrapper}
      ProposalLine={GovProposalLine}
      canLoadMore={!showingSearchResults && page < maxPage}
      className={className}
      createNewProposalHref={asPath + '/create'}
      daoName={getDisplayNameForChainId(chain.chainId)}
      daosWithVetoableProposals={[]}
      error={
        showingSearchResults
          ? searchedGovProposals.errored
            ? searchedGovProposals.error
            : undefined
          : loadingPaginatedGovProposals.errored
            ? loadingPaginatedGovProposals.error
            : openGovProposalsVotingPeriod.errored
              ? openGovProposalsVotingPeriod.error
              : govProposalsDepositPeriod.errored
                ? govProposalsDepositPeriod.error
                : undefined
      }
      isMember={true}
      loadMore={goToNextPage}
      loadingMore={
        showingSearchResults
          ? searchedGovProposals.loading || !!searchedGovProposals.updating
          : openGovProposalsVotingPeriod.loading ||
            govProposalsDepositPeriod.loading ||
            loadingPaginatedGovProposals.loading ||
            !!loadingPaginatedGovProposals.updating
      }
      openProposals={showingSearchResults ? [] : openProposals}
      searchBarProps={
        // Cannot search without an indexer on the chain.
        hasIndexer
          ? {
              value: search,
              onChange: (e) => setSearch(e.target.value),
            }
          : undefined
      }
      sections={
        showingSearchResults
          ? [
              {
                title: t('title.results'),
                proposals:
                  searchedGovProposals.loading || searchedGovProposals.errored
                    ? []
                    : searchedGovProposals.data.proposals.map(
                        (proposal): StatefulGovProposalLineProps => ({
                          proposalId: proposal.id.toString(),
                          proposal,
                        })
                      ),
              },
            ]
          : [
              {
                title: t('title.depositPeriod'),
                proposals: depositPeriodProposals,
                defaultCollapsed: true,
              },
              {
                title: t('title.history'),
                proposals: historyProposals,
                total: historyCount,
              },
            ]
      }
      showingSearchResults={showingSearchResults}
    />
  )
}
