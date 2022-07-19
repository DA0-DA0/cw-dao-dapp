import { useMemo } from 'react'

import { matchAndLoadCommon } from '@dao-dao/proposal-module-adapter'
import {
  HorizontalInfo,
  HorizontalInfoSection,
  Loader,
  Logo,
  SuspenseLoader,
} from '@dao-dao/ui'
import { useVotingModuleAdapter } from '@dao-dao/voting-module-adapter'

import { useDAOInfoContext } from '.'

const FallbackDisplay = () => (
  <HorizontalInfo>
    <HorizontalInfoSection />
  </HorizontalInfo>
)

export const DaoHorizontalInfoDisplay = () => (
  <SuspenseLoader fallback={<FallbackDisplay />}>
    <InnerDaoHorizontalInfoDisplay />
  </SuspenseLoader>
)

const InnerDaoHorizontalInfoDisplay = () => {
  const {
    components: { DaoHorizontalInfoDisplayContent },
  } = useVotingModuleAdapter()
  const { coreAddress, proposalModules } = useDAOInfoContext()

  const useProposalCountHooks = useMemo(
    () =>
      proposalModules.map(
        (proposalModule) =>
          matchAndLoadCommon(proposalModule, {
            coreAddress,
            Loader,
            Logo,
          }).hooks.useProposalCount
      ),
    [coreAddress, proposalModules]
  )

  // Always called in the same order, so this is safe.
  const proposalCount = useProposalCountHooks.reduce(
    // eslint-disable-next-line react-hooks/rules-of-hooks
    (acc, useProposalCount) => acc + useProposalCount(),
    0
  )

  return <DaoHorizontalInfoDisplayContent proposalCount={proposalCount} />
}
