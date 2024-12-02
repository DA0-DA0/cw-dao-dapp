import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { LazyDaoCardProps } from '@dao-dao/types'
import { processError } from '@dao-dao/utils'

import { daoQueries } from '../../queries/dao'
import { DaoCard } from './DaoCard'

export const LazyDaoCard = (props: LazyDaoCardProps) => {
  const { t } = useTranslation()

  const daoInfoQuery = useQuery(
    daoQueries.info(useQueryClient(), {
      chainId: props.info.chainId,
      coreAddress: props.info.coreAddress,
    })
  )

  return daoInfoQuery.isPending ? (
    <DaoCard
      {...props}
      className={clsx('animate-pulse', props.className)}
      info={{
        ...props.info,
        votingModuleAddress: '',
        votingModuleInfo: {
          contract: '',
          version: '',
        },
        proposalModules: [],
        created: null,
        isActive: true,
        activeThreshold: null,
        items: {},
        polytoneProxies: {},
        accounts: [],
        parentDao: null,
        admin: '',
        contractAdmin: null,
      }}
    />
  ) : daoInfoQuery.isError ? (
    <DaoCard
      {...props}
      info={{
        ...props.info,
        description:
          t('error.unexpectedError') +
          '\n' +
          processError(daoInfoQuery.error, {
            forceCapture: false,
          }),
        votingModuleAddress: '',
        votingModuleInfo: {
          contract: '',
          version: '',
        },
        proposalModules: [],
        created: null,
        isActive: true,
        activeThreshold: null,
        items: {},
        polytoneProxies: {},
        accounts: [],
        parentDao: null,
        admin: '',
        contractAdmin: null,
      }}
    />
  ) : (
    <DaoCard info={daoInfoQuery.data} />
  )
}
