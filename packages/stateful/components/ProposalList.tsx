import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecoilCallback, useSetRecoilState } from 'recoil'

import { daoQueries } from '@dao-dao/state/query'
import {
  daoVetoableDaosSelector,
  refreshProposalsIdAtom,
} from '@dao-dao/state/recoil'
import {
  ProposalList as StatelessProposalList,
  useAppContext,
  useCachedLoadingWithError,
  useDao,
  useDaoNavHelpers,
  useLoadingPromise,
  useUpdatingRef,
} from '@dao-dao/stateless'
import {
  CommonProposalListInfo,
  ProposalStatus,
  ProposalStatusEnum,
  StatefulProposalLineProps,
  StatefulProposalListProps,
} from '@dao-dao/types'
import { chainIsIndexed, webSocketChannelNameForDao } from '@dao-dao/utils'

import {
  useMembership,
  useOnCurrentDaoWebSocketMessage,
  useOnWebSocketMessage,
  useQueryLoadingDataWithError,
} from '../hooks'
import { matchAndLoadCommon } from '../proposal-module-adapter'
import { daosWithDropdownVetoableProposalListSelector } from '../recoil'
import { DiscordNotifierConfigureModal } from './dao/DiscordNotifierConfigureModal'
import { LinkWrapper } from './LinkWrapper'
import { ProposalLine } from './ProposalLine'

// Contracts enforce a max of 30, though this is on the edge, so use 20.
const PROP_PAGINATE_LIMIT = 20
// Load proposals until at least this many are loaded.
const MIN_LOAD_PROPS = PROP_PAGINATE_LIMIT * 2

enum ProposalType {
  Normal = 'normal',
  PreProposePending = 'preProposePending',
  PreProposeCompleted = 'preProposeCompleted',
}
const PROPOSAL_TYPES = Object.values(ProposalType)

type CommonProposalListInfoWithType = CommonProposalListInfo & {
  type: ProposalType
}

export const ProposalList = ({
  onClick,
  hideVetoable = false,
  onlyExecutable = false,
  hideNotifier = false,
  ...props
}: StatefulProposalListProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const { mode } = useAppContext()
  const { isMember = false } = useMembership()

  const [openProposals, setOpenProposals] = useState<
    (StatefulProposalLineProps & { status: ProposalStatus })[]
  >([])
  const [historyProposals, setHistoryProposals] = useState<
    (StatefulProposalLineProps & { status: ProposalStatus })[]
  >([])

  // Get selectors for all proposal modules so we can list proposals.
  const commonSelectors = useMemo(
    () =>
      dao.proposalModules.map((proposalModule) => ({
        selectors: matchAndLoadCommon(dao, proposalModule.address).selectors,
        proposalModule,
      })),
    [dao]
  )

  // Cursor values for each proposal module for incremental queries.
  const [startBefores, setStartBefores] = useState<
    Record<string, Record<ProposalType, number | undefined> | undefined>
  >({})

  const loadingProposalCounts = useLoadingPromise({
    promise: () => dao.getProposalCount(),
    deps: [dao],
  })

  const vetoableDaosLoading = useCachedLoadingWithError(
    daoVetoableDaosSelector({
      chainId: dao.chainId,
      coreAddress: dao.coreAddress,
    })
  )
  const daosWithVetoableProposals = useCachedLoadingWithError(
    hideVetoable
      ? undefined
      : daosWithDropdownVetoableProposalListSelector({
          chainId: dao.chainId,
          coreAddress: dao.coreAddress,
          daoPageMode: mode,
        })
  )

  const onClickRef = useUpdatingRef(onClick)

  const [loading, setLoading] = useState(true)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const loadMore = useRecoilCallback(
    ({ snapshot }) =>
      // If `refreshAll` is true, we will load all proposals from the start,
      // ignoring the startBefore cursor values, until we have loaded all the
      // already loaded proposals.
      async (refreshAll = false) => {
        setLoading(true)

        // If refreshing all, we need to reset the state so we start from the
        // beginning.
        let newOpenProposals = refreshAll ? [] : openProposals
        let newHistoryProposals = refreshAll ? [] : historyProposals
        let newStartBefores = refreshAll ? {} : startBefores

        // If refreshing all, save number of proposals loaded so we can load
        // proposals from the beginning until we load this number.
        const totalProposalsLoaded =
          openProposals.length + historyProposals.length
        const proposalIdsSeen = new Set<string>()

        try {
          do {
            // Load the most recent PROP_LOAD_LIMIT proposals from each module.
            const proposalListInfos = await Promise.all(
              commonSelectors.flatMap(async ({ proposalModule, selectors }) => {
                const startBefore = newStartBefores[proposalModule.address]

                const proposalInfos = await snapshot.getPromise(
                  selectors.reverseProposalInfos({
                    startBefore: startBefore?.normal,
                    limit: PROP_PAGINATE_LIMIT,
                  })
                )

                const preProposePendingProposalInfos =
                  selectors.reversePreProposePendingProposalInfos
                    ? await snapshot.getPromise(
                        selectors.reversePreProposePendingProposalInfos({
                          startBefore: startBefore?.preProposePending,
                          limit: PROP_PAGINATE_LIMIT,
                        })
                      )
                    : []

                const preProposeCompletedProposalInfos =
                  selectors.reversePreProposeCompletedProposalInfos
                    ? await snapshot.getPromise(
                        selectors.reversePreProposeCompletedProposalInfos({
                          startBefore: startBefore?.preProposeCompleted,
                          limit: PROP_PAGINATE_LIMIT,
                        })
                      )
                    : []

                return [
                  ...proposalInfos.map(
                    (info): CommonProposalListInfoWithType => ({
                      type: ProposalType.Normal,
                      ...info,
                    })
                  ),
                  ...preProposePendingProposalInfos.map(
                    (info): CommonProposalListInfoWithType => ({
                      type: ProposalType.PreProposePending,
                      ...info,
                    })
                  ),
                  ...preProposeCompletedProposalInfos.map(
                    (info): CommonProposalListInfoWithType => ({
                      type: ProposalType.PreProposeCompleted,
                      ...info,
                    })
                  ),
                ].map((info) => ({
                  ...info,
                  proposalModule,
                }))
              })
            )

            // Sort descending by timestamp, putting undefined timestamps at the
            // bottom.
            let newProposalInfos = proposalListInfos
              .flat()
              .sort((a, b) =>
                b.timestamp && a.timestamp
                  ? b.timestamp.getTime() - a.timestamp.getTime()
                  : !a.timestamp
                    ? 1
                    : !b.timestamp
                      ? -1
                      : 0
              )
              // We loaded the most recent PROP_LOAD_LIMIT proposals from each
              // module above, and then sorted all of them against each other.
              // Thus, we can only guarantee that the first PROP_LOAD_LIMIT
              // proposals in this list of proposals combined from all proposal
              // modules are in order. If we display all proposals returned
              // (e.g. 10 from A, 10 from B, etc.), it's possible we'll include
              // proposals from module B that are temporally after
              // not-yet-loaded proposals from module A. In other words, if A
              // has 12 proposals, B has 5 proposals, all of A's proposals are
              // more recent than B's, and we load the first 10 from both, we
              // cannot show the first 10 from A followed by all 5 from B,
              // because we do not yet know if A has another page of 10 that are
              // before B's 5. Thus, we ask all modules for 10, and only show
              // the most recent 10, until the next list loads the remaining 2
              // from A followed by the 5 from B (since A is out of proposals).
              // In summary, we must display at most the number of proposals
              // that we ask for from each module to preserve the relative
              // timestamps across all modules.
              .slice(0, PROP_PAGINATE_LIMIT)

            // Store startBefore cursor values for next query based on last
            // proposal ID in list from each proposal module.
            newStartBefores = dao.proposalModules.reduce(
              (acc, proposalModule) => {
                const thisModulesProposalInfos = newProposalInfos.filter(
                  (info) => info.proposalModule === proposalModule
                )

                return {
                  ...acc,
                  [proposalModule.address]: PROPOSAL_TYPES.reduce(
                    (acc, type) => ({
                      ...acc,
                      [type]:
                        thisModulesProposalInfos
                          .filter((info) => info.type === type)
                          .slice(-1)[0]?.proposalNumber ??
                        // If no proposal from this proposal module with this
                        // type shows up in the proposals we are listing here,
                        // use the startBefore from before.
                        newStartBefores[proposalModule.address]?.[type],
                    }),
                    {} as Record<ProposalType, number | undefined>
                  ),
                }
              },
              {} as typeof newStartBefores
            )

            // If we loaded the max we asked for, there may be more in another
            // query.
            const canLoadMore = newProposalInfos.length === PROP_PAGINATE_LIMIT
            setCanLoadMore(canLoadMore)

            // Remove proposals that should be hidden from the list after the
            // start befores are calculated above to preserve the pagination.
            newProposalInfos = newProposalInfos.filter(
              (info) => !info.hideFromList
            )

            const transformIntoProps = ({
              id,
              status,
            }: (typeof newProposalInfos)[number]): StatefulProposalLineProps & {
              status: ProposalStatus
            } => ({
              chainId: dao.chainId,
              coreAddress: dao.coreAddress,
              proposalId: id,
              proposalViewUrl: onClickRef.current
                ? '#'
                : getDaoProposalPath(dao.coreAddress, id),
              onClick: onClickRef.current
                ? () => onClickRef.current?.({ proposalId: id })
                : undefined,
              status,
            })

            newOpenProposals = [
              ...newOpenProposals,
              ...newProposalInfos
                .filter(({ status }) => status === ProposalStatusEnum.Open)
                .map(transformIntoProps),
            ]
            newHistoryProposals = [
              ...newHistoryProposals,
              ...newProposalInfos
                .filter(({ status }) => status !== ProposalStatusEnum.Open)
                .map(transformIntoProps),
            ]

            newProposalInfos.forEach((info) => {
              proposalIdsSeen.add(info.id)
            })

            // If no more to load, stop.
            if (!canLoadMore) {
              break
            }
          } while (
            // Load at least the minimum proposals.
            proposalIdsSeen.size < MIN_LOAD_PROPS ||
            // Keep looping if we are refreshing all proposals and we have not
            // yet loaded as many as we started with.
            (refreshAll && proposalIdsSeen.size < totalProposalsLoaded)
          )
        } finally {
          // Update state.
          setOpenProposals(newOpenProposals)
          setHistoryProposals(newHistoryProposals)
          setStartBefores(newStartBefores)

          setLoading(false)
        }
      },
    [
      openProposals,
      historyProposals,
      startBefores,
      commonSelectors,
      dao,
      getDaoProposalPath,
    ]
  )

  // Load once on mount.
  const loadMoreRef = useUpdatingRef(loadMore)
  useEffect(() => {
    loadMoreRef.current()
  }, [loadMoreRef])

  // Refresh all proposals on proposal WebSocket messages.
  const setRefreshProposalsId = useSetRecoilState(refreshProposalsIdAtom)
  useOnCurrentDaoWebSocketMessage('proposal', () => {
    setRefreshProposalsId((id) => id + 1)
    // Refresh all proposals.
    loadMore(true)
  })

  // Refresh all proposals on vetoable DAO proposal WebSocket messages.
  useOnWebSocketMessage(
    vetoableDaosLoading.loading || vetoableDaosLoading.errored
      ? []
      : vetoableDaosLoading.data.map((vetoable) =>
          webSocketChannelNameForDao(vetoable)
        ),
    'proposal',
    () => setRefreshProposalsId((id) => id + 1)
  )

  const [search, setSearch] = useState('')
  // Cannot search without an indexer on the chain.
  const canSearch = chainIsIndexed(dao.chainId)
  const showingSearchResults = canSearch && !!search && search.length > 0
  const searchedProposals = useQueryLoadingDataWithError(
    showingSearchResults
      ? daoQueries.searchProposals({
          chainId: dao.chainId,
          dao: dao.coreAddress,
          query: search,
          limit: 20,
        })
      : undefined
  )

  return (
    <StatelessProposalList
      {...props}
      DiscordNotifierConfigureModal={
        hideNotifier ? undefined : DiscordNotifierConfigureModal
      }
      LinkWrapper={LinkWrapper}
      ProposalLine={ProposalLine}
      canLoadMore={canLoadMore}
      createNewProposalHref={getDaoProposalPath(dao.coreAddress, 'create')}
      daoName={dao.name}
      daosWithVetoableProposals={
        daosWithVetoableProposals.loading || daosWithVetoableProposals.errored
          ? []
          : daosWithVetoableProposals.data
      }
      error={
        showingSearchResults && searchedProposals.errored
          ? searchedProposals.error
          : undefined
      }
      isMember={isMember}
      loadMore={
        // Force no arguments.
        () => loadMore()
      }
      loadingMore={
        showingSearchResults
          ? searchedProposals.loading || !!searchedProposals.updating
          : loading
      }
      openProposals={
        showingSearchResults
          ? []
          : // Show executable proposals at the top in place of open proposals.
            onlyExecutable
            ? historyProposals.filter(
                ({ status }) => status === ProposalStatusEnum.Passed
              )
            : openProposals
      }
      searchBarProps={
        canSearch
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
                  searchedProposals.loading || searchedProposals.errored
                    ? []
                    : searchedProposals.data.flatMap(
                        (proposal): StatefulProposalLineProps | [] =>
                          proposal.value.daoProposalId
                            ? {
                                chainId: dao.chainId,
                                coreAddress: dao.coreAddress,
                                proposalId: proposal.value.daoProposalId,
                                proposalViewUrl: getDaoProposalPath(
                                  dao.coreAddress,
                                  proposal.value.daoProposalId
                                ),
                              }
                            : []
                      ),
              },
            ]
          : // Show executable proposals at the top in place of open proposals.
            onlyExecutable
            ? []
            : [
                {
                  title: t('title.history'),
                  proposals: historyProposals,
                  total:
                    !loadingProposalCounts.loading &&
                    !loadingProposalCounts.errored
                      ? // Remove open proposals from total history count since they
                        // are shown above.
                        loadingProposalCounts.data - openProposals.length
                      : undefined,
                },
              ]
      }
      showingSearchResults={showingSearchResults}
    />
  )
}
