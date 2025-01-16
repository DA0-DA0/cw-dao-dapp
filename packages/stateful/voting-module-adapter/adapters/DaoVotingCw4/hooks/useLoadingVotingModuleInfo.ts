import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { cw4GroupExtraQueries, daoVotingCw4Queries } from '@dao-dao/state'
import { useVotingModule } from '@dao-dao/stateless'
import { LoadingDataWithError } from '@dao-dao/types'
import { Member } from '@dao-dao/types/contracts/DaoVotingCw4'

import { useQueryLoadingDataWithError } from '../../../../hooks'

type UseVotingModuleInfoOptions = {
  fetchMembers?: boolean
}

type UseVotingModuleInfoReturn = {
  cw4GroupAddress: string
  members: Member[] | undefined
}

export const useLoadingVotingModuleInfo = ({
  fetchMembers,
}: UseVotingModuleInfoOptions = {}): LoadingDataWithError<UseVotingModuleInfoReturn> => {
  const votingModule = useVotingModule()
  const queryClient = useQueryClient()

  const cw4GroupAddress = useQueryLoadingDataWithError(
    daoVotingCw4Queries.groupContract(queryClient, {
      chainId: votingModule.chainId,
      contractAddress: votingModule.address,
    })
  )

  const members = useQueryLoadingDataWithError(
    fetchMembers
      ? cw4GroupAddress.loading || cw4GroupAddress.errored
        ? undefined
        : cw4GroupExtraQueries.listAllMembers(queryClient, {
            chainId: votingModule.chainId,
            address: cw4GroupAddress.data,
          })
      : undefined
  )

  return useMemo(
    () =>
      cw4GroupAddress.loading || (fetchMembers && members.loading)
        ? {
            loading: true,
            errored: false,
          }
        : cw4GroupAddress.errored || (fetchMembers && members.errored)
          ? {
              loading: false,
              errored: true,
              error: cw4GroupAddress.errored
                ? cw4GroupAddress.error
                : fetchMembers && members.errored
                  ? members.error
                  : new Error('Unknown error'),
            }
          : {
              loading: false,
              errored: false,
              updating:
                cw4GroupAddress.updating ||
                (fetchMembers && !members.loading && members.updating),
              data: {
                cw4GroupAddress: cw4GroupAddress.data,
                members:
                  fetchMembers && !members.loading && !members.errored
                    ? members.data.members
                    : undefined,
              },
            },
    [cw4GroupAddress, members, fetchMembers]
  )
}
