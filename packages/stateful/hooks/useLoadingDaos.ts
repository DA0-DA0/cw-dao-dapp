import { useQueries, useQueryClient } from '@tanstack/react-query'
import { constSelector, useRecoilValueLoadable, waitForAll } from 'recoil'

import { daoQueries } from '@dao-dao/state/query'
import { followingDaosSelector } from '@dao-dao/state/recoil'
import {
  DaoInfo,
  DaoSource,
  LoadingData,
  StatefulDaoCardProps,
} from '@dao-dao/types'
import { makeCombineQueryResultsIntoLoadingData } from '@dao-dao/utils'

import { daoQueries as statefulDaoQueries } from '../queries/dao'
import { useQueryLoadingData } from './query/useQueryLoadingData'
import { useProfile } from './useProfile'

export const useLoadingDaos = (
  daos: LoadingData<DaoSource[]>,
  alphabetize = false
): LoadingData<DaoInfo[]> => {
  const queryClient = useQueryClient()
  return useQueries({
    queries: daos.loading
      ? []
      : daos.data.map(({ chainId, coreAddress }) =>
          statefulDaoQueries.info(queryClient, {
            chainId,
            coreAddress,
          })
        ),
    combine: makeCombineQueryResultsIntoLoadingData<DaoInfo>({
      transform: (infos) =>
        infos.sort((a, b) => (alphabetize ? a.name.localeCompare(b.name) : 0)),
    }),
  })
}

export const useLoadingFeaturedDaoCards = (
  /**
   * If passed, only load DAOs from this chain. Otherwise, load from all chains.
   */
  chainId?: string
): LoadingData<StatefulDaoCardProps[]> => {
  const featuredDaos = useQueryLoadingData(
    daoQueries.listFeatured(),
    [] as DaoSource[]
  )

  const daos = useLoadingDaos(
    featuredDaos.loading
      ? { loading: true }
      : !featuredDaos.data
        ? { loading: false, data: [] }
        : {
            loading: false,
            data: featuredDaos.data.filter(
              (featured) => !chainId || featured.chainId === chainId
            ),
          }
  )

  return daos.loading
    ? daos
    : {
        loading: false,
        updating: daos.updating,
        data: daos.data.map(
          (info): StatefulDaoCardProps => ({
            info,
          })
        ),
      }
}

export const useLoadingFollowingDaos = (
  // If passed, will only load DAOs from this chain. Otherwise, will load from
  // all chains.
  chainId?: string
): LoadingData<DaoInfo[]> => {
  const { uniquePublicKeys } = useProfile()

  const followingDaosLoading = useRecoilValueLoadable(
    !uniquePublicKeys.loading
      ? waitForAll(
          uniquePublicKeys.data.map(({ publicKey }) =>
            followingDaosSelector({
              walletPublicKey: publicKey,
            })
          )
        )
      : constSelector([])
  )

  return useLoadingDaos(
    followingDaosLoading.state === 'loading'
      ? { loading: true }
      : followingDaosLoading.state === 'hasError'
        ? { loading: false, data: [] }
        : {
            loading: false,
            data: followingDaosLoading.contents.flatMap((following) =>
              following.filter((f) => !chainId || f.chainId === chainId)
            ),
          },
    // Alphabetize.
    true
  )
}
