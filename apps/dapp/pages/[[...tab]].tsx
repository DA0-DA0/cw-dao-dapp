// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.

import { GetStaticPaths, GetStaticProps } from 'next'

import { serverSideTranslations } from '@dao-dao/i18n/serverSideTranslations'
import {
  daoQueries,
  dehydrateSerializable,
  makeReactQueryClient,
  miscQueries,
} from '@dao-dao/state'
import { Home, StatefulHomeProps } from '@dao-dao/stateful'
import { AccountTabId } from '@dao-dao/types'
import {
  MAINNET,
  getDaoInfoForChainId,
  getSupportedChains,
  retry,
} from '@dao-dao/utils'

export default Home

// Share query client across static props generators since the data is the same.
const queryClient = makeReactQueryClient()

export const getStaticProps: GetStaticProps<StatefulHomeProps> = async ({
  locale,
  params,
}) => {
  const tabPath =
    params?.tab && Array.isArray(params?.tab) ? params.tab[0] : undefined

  // If defined, try to find matching chain. If found, show chain-only page.
  const selectedChain = tabPath
    ? getSupportedChains().find(({ name }) => name === tabPath)
    : undefined
  const chainId = selectedChain?.chainId

  const chainGovDaos = chainId
    ? selectedChain.noGov
      ? undefined
      : [getDaoInfoForChainId(chainId, [])]
    : // Get chain x/gov DAOs if not on a chain-specific home.
      [
        // Add DAO DAO-supported chains.
        ...getSupportedChains().flatMap(({ chainId, noGov }) =>
          noGov ? [] : chainId
        ),
        // Add some other common chains.
        ...(MAINNET
          ? [
              'akashnet-2',
              'secret-4',
              'regen-1',
              'injective-1',
              'celestia',
              'archway-1',
            ]
          : []),
      ].map((chainId) => getDaoInfoForChainId(chainId, []))

  const [i18nProps, stats] = await Promise.all([
    // Get i18n translations props.
    serverSideTranslations(locale, ['translation']),

    // Get home page stats.
    queryClient.fetchQuery(
      miscQueries.homePageStats(queryClient, {
        chainId,
      })
    ),

    // Pre-fetch featured DAOs.
    retry(5, () => queryClient.fetchQuery(daoQueries.listFeatured())).then(
      (featured) =>
        Promise.all(
          featured?.map((dao) =>
            retry(5, () =>
              queryClient.fetchQuery(daoQueries.info(queryClient, dao))
            )
          ) || []
        )
    ),
  ])

  return {
    props: {
      ...i18nProps,
      // Chain-specific home page.
      ...(chainId && { chainId }),
      // All or chain-specific stats.
      stats,
      // Chain x/gov DAOs.
      ...(chainGovDaos && { chainGovDaos }),
      // Dehydrate react-query state with featured DAOs preloaded.
      reactQueryDehydratedState: dehydrateSerializable(queryClient),
    },
    // Revalidate every 6 hours.
    revalidate: 6 * 60 * 60,
  }
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: [
    // Index page with no tab specified.
    {
      params: {
        tab: [],
      },
    },
    // All tabs.
    ...Object.values(AccountTabId).map((tab) => ({
      params: {
        tab: [tab],
      },
    })),
    // All chains.
    ...getSupportedChains().map(({ name }) => ({
      params: {
        tab: [name],
      },
    })),
  ],
  fallback: false,
})
