import { DecoratorFn } from '@storybook/react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { daoQueries } from '@dao-dao/state'
import { DaoProviders } from '@dao-dao/stateful'
import { DaoInfo } from '@dao-dao/types'

export const makeDaoProvidersDecorator = (info: DaoInfo): DecoratorFn =>
  function DaoActionsProviderDecorator(Story) {
    const queryClient = useQueryClient()
    // Store provided info in query cache so the DAO client in the provider is
    // initialized immediately and doesn't try to fetch it.
    useMemo(() => {
      queryClient.setQueryData(
        daoQueries.info(queryClient, {
          chainId: info.chainId,
          coreAddress: info.coreAddress,
        }).queryKey,
        info
      )
    }, [queryClient])

    return (
      <DaoProviders chainId={info.chainId} coreAddress={info.coreAddress}>
        <Story />
      </DaoProviders>
    )
  }
