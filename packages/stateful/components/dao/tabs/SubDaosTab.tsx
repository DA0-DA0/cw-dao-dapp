import {
  SubDaosTab as StatelessSubDaosTab,
  useCachedLoading,
  useDaoInfoContext,
  useNavHelpers,
} from '@dao-dao/stateless'
import { ContractVersion, CoreActionKey } from '@dao-dao/types'

import { useActionForKey } from '../../../actions'
import { useDaoProposalSinglePrefill, useMembership } from '../../../hooks'
import { subDaoCardInfosSelector } from '../../../recoil'
import { ButtonLink } from '../../ButtonLink'
import { DaoCard } from '../DaoCard'

export const SubDaosTab = () => {
  const daoInfo = useDaoInfoContext()
  const { getDaoPath, getDaoProposalPath } = useNavHelpers()

  const { isMember = false } = useMembership(daoInfo)

  const subDaos = useCachedLoading(
    daoInfo.coreVersion === ContractVersion.V1
      ? // Only v2 DAOs have SubDAOs. Passing undefined here returns an infinite loading state, which is fine because it's never used.
        undefined
      : subDaoCardInfosSelector({ coreAddress: daoInfo.coreAddress }),
    []
  )

  const upgradeToV2Action = useActionForKey(CoreActionKey.UpgradeV1ToV2)
  const upgradeToV2ActionDefaults = upgradeToV2Action?.useDefaults()
  const proposalPrefillUpgrade = useDaoProposalSinglePrefill({
    actions: upgradeToV2Action
      ? [
          {
            action: upgradeToV2Action,
            data: upgradeToV2ActionDefaults,
          },
        ]
      : [],
  })

  return (
    <StatelessSubDaosTab
      ButtonLink={ButtonLink}
      DaoCard={DaoCard}
      createSubDaoHref={getDaoPath(daoInfo.coreAddress) + '/create'}
      daoInfo={daoInfo}
      isMember={isMember}
      subDaos={subDaos}
      upgradeToV2Href={getDaoProposalPath(daoInfo.coreAddress, 'create', {
        prefill: proposalPrefillUpgrade,
      })}
    />
  )
}
