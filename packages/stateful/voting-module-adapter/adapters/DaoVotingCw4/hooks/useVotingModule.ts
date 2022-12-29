import { constSelector, useRecoilValue } from 'recoil'

import {
  Cw4GroupSelectors,
  CwCoreV1Selectors,
  DaoVotingCw4Selectors,
} from '@dao-dao/state'
import { Member } from '@dao-dao/types/contracts/DaoVotingCw4'

interface UseVotingModuleOptions {
  fetchMembers?: boolean
}

interface UseVotingModuleReturn {
  votingModuleAddress: string
  cw4GroupAddress: string
  members: Member[] | undefined
}

export const useVotingModule = (
  coreAddress: string,
  { fetchMembers }: UseVotingModuleOptions = {}
): UseVotingModuleReturn => {
  const votingModuleAddress = useRecoilValue(
    CwCoreV1Selectors.votingModuleSelector({ contractAddress: coreAddress })
  )

  const cw4GroupAddress = useRecoilValue(
    DaoVotingCw4Selectors.groupContractSelector({
      contractAddress: votingModuleAddress,
      params: [],
    })
  )

  const members = useRecoilValue(
    fetchMembers
      ? Cw4GroupSelectors.listAllMembersSelector({
          contractAddress: cw4GroupAddress,
        })
      : constSelector(undefined)
  )?.members

  return {
    votingModuleAddress,
    cw4GroupAddress,
    members,
  }
}
