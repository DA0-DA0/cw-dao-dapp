import { useQueryClient } from '@tanstack/react-query'

import {
  SubDaosTab as StatelessSubDaosTab,
  useDao,
  useDaoNavHelpers,
  useInitializedActionForKey,
} from '@dao-dao/stateless'
import { ActionKey, Feature } from '@dao-dao/types'
import { getDaoProposalSinglePrefill } from '@dao-dao/utils'

import { useMembership, useQueryLoadingDataWithError } from '../../../hooks'
import { daoQueries } from '../../../queries'
import { ButtonLink } from '../../ButtonLink'
import { DaoCard } from '../DaoCard'

export const SubDaosTab = () => {
  const dao = useDao()
  const { chainId, coreAddress } = dao
  const { getDaoPath, getDaoProposalPath } = useDaoNavHelpers()

  const { isMember = false } = useMembership()

  const queryClient = useQueryClient()
  const subDaos = useQueryLoadingDataWithError({
    ...daoQueries.subDaoInfos(queryClient, {
      chainId,
      coreAddress,
    }),
    enabled: dao.supports(Feature.SubDaos),
  })

  const upgradeToV2Action = useInitializedActionForKey(ActionKey.UpgradeV1ToV2)

  return (
    <StatelessSubDaosTab
      ButtonLink={ButtonLink}
      DaoCard={DaoCard}
      createSubDaoHref={getDaoPath(coreAddress, 'create')}
      isMember={isMember}
      subDaos={subDaos}
      upgradeToV2Href={
        upgradeToV2Action.loading || upgradeToV2Action.errored
          ? undefined
          : getDaoProposalPath(coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                actions: [
                  {
                    actionKey: upgradeToV2Action.data.key,
                    data: upgradeToV2Action.data.defaults,
                  },
                ],
              }),
            })
      }
    />
  )
}
