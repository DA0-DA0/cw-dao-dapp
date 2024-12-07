import { ReactNode, useMemo } from 'react'

import { ChainXGovDao } from '@dao-dao/state/clients/dao'
import {
  ChainProvider,
  DaoContext,
  ErrorPage,
  IDaoContext,
  Loader,
} from '@dao-dao/stateless'
import { DaoProvidersProps } from '@dao-dao/types'

import { DaoActionsProvider } from '../../actions'
import { useDaoClient } from '../../hooks'
import { VotingModuleAdapterProvider } from '../../voting-module-adapter'

type InitializedDaoProvidersProps = {
  context: IDaoContext
  children: ReactNode
}

export const DaoProviders = ({
  chainId,
  coreAddress,
  children,
  loaderFallback,
  LoaderFallback = Loader,
}: DaoProvidersProps) => {
  const { dao, initializing, initialized, error } = useDaoClient({
    dao: {
      chainId,
      coreAddress,
    },
    initialize: true,
  })

  const context = useMemo<IDaoContext>(
    () => ({
      dao,
    }),
    [dao]
  )

  return initializing || !coreAddress ? (
    loaderFallback ? (
      <>{loaderFallback}</>
    ) : (
      <LoaderFallback />
    )
  ) : error || !initialized ? (
    <ErrorPage error={error || new Error('Failed to initialize DAO client.')} />
  ) : (
    <InitializedDaoProviders context={context}>
      {children}
    </InitializedDaoProviders>
  )
}

const InitializedDaoProviders = ({
  context,
  children,
}: InitializedDaoProvidersProps) => (
  // Add a unique key here to tell React to re-render everything when the
  // `coreAddress` is changed, since for some insane reason, Next.js does not
  // reset state when navigating between dynamic rotues. Even though the `info`
  // value passed below changes, somehow no re-render occurs... unless the `key`
  // prop is unique. See the issue below for more people compaining about this
  // to no avail. https://github.com/vercel/next.js/issues/9992
  <ChainProvider chainId={context.dao.chainId}>
    <DaoContext.Provider key={context.dao.coreAddress} value={context}>
      {
        // Don't wrap chain governance in voting module or DAO actions provider.
        context.dao instanceof ChainXGovDao ? (
          children
        ) : (
          <VotingModuleAdapterProvider>
            <DaoActionsProvider>{children}</DaoActionsProvider>
          </VotingModuleAdapterProvider>
        )
      }
    </DaoContext.Provider>
  </ChainProvider>
)
