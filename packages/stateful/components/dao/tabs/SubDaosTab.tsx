import { useQueryClient } from '@tanstack/react-query'

import { daoQueries } from '@dao-dao/state/query'
import {
  SubDaosTab as StatelessSubDaosTab,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import { Feature } from '@dao-dao/types'

import { useMembership, useQueryLoadingDataWithError } from '../../../hooks'
import { ButtonLink } from '../../ButtonLink'
import { DaoCard } from '../DaoCard'

export const SubDaosTab = () => {
  const dao = useDao()
  const { chainId, coreAddress } = dao
  const { getDaoPath } = useDaoNavHelpers()

  const { isMember = false } = useMembership()

  const queryClient = useQueryClient()
  const subDaos = useQueryLoadingDataWithError({
    ...daoQueries.subDaoInfos(queryClient, {
      chainId,
      coreAddress,
    }),
    enabled: dao.supports(Feature.SubDaos),
  })

  return (
    <StatelessSubDaosTab
      ButtonLink={ButtonLink}
      DaoCard={DaoCard}
      createSubDaoHref={getDaoPath(coreAddress, 'create')}
      isMember={isMember}
      subDaos={subDaos}
    />
  )
}
