import {
  DehydratedState,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import {
  SearchDaosOptions,
  commandModalVisibleAtom,
  indexerQueries,
  miscQueries,
  walletChainIdAtom,
} from '@dao-dao/state'
import {
  ChainPickerPopup,
  Logo,
  Home as StatelessHome,
  useInfiniteScroll,
  useQuerySyncedState,
} from '@dao-dao/stateless'
import {
  DaoDaoIndexerAllStats,
  DaoInfo,
  DaoSource,
  LazyDaoCardProps,
  LoadingData,
  LoadingDataWithError,
  StatefulDaoCardProps,
} from '@dao-dao/types'
import {
  SITE_TITLE,
  SITE_URL,
  getFallbackImage,
  getSupportedChainConfig,
  parseContractVersion,
} from '@dao-dao/utils'

import {
  useLoadingDaos,
  useLoadingFeaturedDaoCards,
  useQueryLoadingDataWithError,
  useWallet,
} from '../../hooks'
import { DaoCard, LazyDaoCard } from '../dao'
import { LinkWrapper } from '../LinkWrapper'
import { PageHeaderContent } from '../PageHeaderContent'
import { ProfileHome } from './ProfileHome'

export type StatefulHomeProps = {
  /**
   * Optionally show chain-specific home page.
   */
  chainId?: string
  /**
   * Stats for all chains or an individual chain if on a chain-specific home.
   */
  stats: DaoDaoIndexerAllStats
  /**
   * Optionally show chain x/gov DAOs.
   */
  chainGovDaos?: DaoInfo[]
  /**
   * Dehydrated react query state used by the server to preload data. This is
   * accessed in the _app.tsx file.
   */
  reactQueryDehydratedState?: DehydratedState
}

export const Home: NextPage<StatefulHomeProps> = ({
  chainId,
  stats: _stats,
  chainGovDaos: _chainGovDaos,
}) => {
  const { t } = useTranslation()
  const { isWalletConnected } = useWallet()
  const router = useRouter()

  // Show profile page if wallet connected and not on a chain-only page.
  const onProfilePage = isWalletConnected && !chainId

  // Update wallet chain ID to the current chain if on a chain-only page.
  const setWalletChainId = useSetRecoilState(walletChainIdAtom)
  useEffect(() => {
    if (chainId) {
      setWalletChainId(chainId)
    }
  }, [chainId, setWalletChainId])

  const setCommandModalVisible = useSetRecoilState(commandModalVisibleAtom)
  const openSearch = useCallback(
    () => setCommandModalVisible(true),
    [setCommandModalVisible]
  )

  const [search, setSearch] = useQuerySyncedState({
    param: 'q',
    defaultValue: '',
  })
  const searchOptions: SearchDaosOptions = {
    chainId: chainId || '',
    query: search,
    hitsPerPage: 18,
  }
  const searchQuery = useInfiniteQuery({
    queryKey: indexerQueries.searchDaos(searchOptions).queryKey,
    queryFn: (ctx) => {
      const { queryFn } = indexerQueries.searchDaos({
        ...searchOptions,
        page: ctx.pageParam,
      })
      return typeof queryFn === 'function' ? queryFn(ctx) : queryFn
    },
    enabled: !!chainId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage &&
      typeof lastPage === 'object' &&
      lastPage.totalPages !== undefined &&
      lastPage.page !== undefined
        ? lastPage.totalPages > lastPage.page
          ? lastPage.page + 1
          : undefined
        : undefined,
  })
  const totalHits =
    searchQuery.data &&
    searchQuery.data.pages.length &&
    typeof searchQuery.data.pages[0] === 'object' &&
    typeof searchQuery.data.pages[0].totalHits === 'number'
      ? searchQuery.data.pages[0].totalHits
      : undefined
  const infiniteScrollOptions = useInfiniteScroll({
    loadMore: searchQuery.fetchNextPage,
    disabled: !chainId || !searchQuery.hasNextPage || searchQuery.isFetching,
  })
  const searchedDaos: LoadingDataWithError<LazyDaoCardProps[]> =
    searchQuery.isPending
      ? { loading: true, errored: false }
      : searchQuery.isError
        ? { loading: false, errored: true, error: searchQuery.error }
        : {
            loading: false,
            errored: false,
            updating: searchQuery.isRefetching,
            data:
              searchQuery.data?.pages.flatMap((page) =>
                page && typeof page === 'object'
                  ? page.hits
                      .filter(({ value }) => !!value?.config)
                      .flatMap(
                        ({
                          chainId,
                          id,
                          value: {
                            config,
                            version: { version },
                          },
                        }): LazyDaoCardProps => ({
                          info: {
                            chainId,
                            coreAddress: id,
                            coreVersion: parseContractVersion(version),
                            name: config.name,
                            description: config.description,
                            imageUrl: config.image_url || getFallbackImage(id),
                          },
                        })
                      )
                  : []
              ) ?? [],
          }

  const selectedChain = chainId ? getSupportedChainConfig(chainId) : undefined
  const selectedChainHasSubDaos = !!selectedChain?.subDaos?.length
  const chainSubDaos = useLoadingDaos(
    chainId && selectedChainHasSubDaos
      ? {
          loading: false,
          data:
            selectedChain?.subDaos?.map(
              (coreAddress): DaoSource => ({
                chainId,
                coreAddress,
              })
            ) ?? [],
        }
      : {
          loading: true,
        }
  )

  const chainGovDaos: LoadingData<StatefulDaoCardProps[]> | undefined =
    selectedChainHasSubDaos && chainSubDaos.loading
      ? {
          loading: true,
        }
      : _chainGovDaos?.length ||
          (selectedChainHasSubDaos && !chainSubDaos.loading)
        ? {
            loading: false,
            data: [
              ...(_chainGovDaos || []),
              ...(!chainSubDaos.loading ? chainSubDaos.data : []),
            ].map((info): StatefulDaoCardProps => ({ info })),
          }
        : undefined

  const featuredDaosLoading = useLoadingFeaturedDaoCards(chainId)
  const featuredDaos: LoadingData<StatefulDaoCardProps[]> =
    !chainId || !chainGovDaos
      ? // If not on a chain-specific page, show all featured DAOs.
        featuredDaosLoading
      : featuredDaosLoading.loading || chainGovDaos.loading
        ? {
            loading: true,
          }
        : {
            loading: false,
            updating: featuredDaosLoading.updating,
            // On a chain-specific page, remove featured DAOs that show
            // up in the chain governance section.
            data: featuredDaosLoading.data.filter(
              (featured) =>
                !chainGovDaos.data.some(
                  (chain) =>
                    featured.info.coreAddress === chain.info.coreAddress ||
                    // If the chain itself uses a real DAO for its
                    // governance, such as Neutron, hide it from
                    // featured as well since it shows up above. This is
                    // needed because the DAO in the featured list uses
                    // the DAO's real address, while the DAO in the
                    // chain x/gov list is the name of the chain.
                    featured.info.coreAddress ===
                      selectedChain?.govContractAddress
                )
            ),
          }

  const queryClient = useQueryClient()
  const freshStats = useQueryLoadingDataWithError(
    miscQueries.homePageStats(queryClient, {
      chainId,
    })
  )

  const stats =
    freshStats.loading || freshStats.errored ? _stats : freshStats.data

  return (
    <>
      <NextSeo
        openGraph={{
          url: SITE_URL + router.asPath,
        }}
      />

      {onProfilePage ? (
        <>
          <PageHeaderContent
            centerNode={
              // Show DAO DAO logo in header on mobile.
              <LinkWrapper
                className="flex flex-row items-center gap-2 md:hidden"
                href="/"
              >
                <Logo size={28} />
                <p className="header-text">{SITE_TITLE}</p>
              </LinkWrapper>
            }
          />

          <ProfileHome />
        </>
      ) : (
        <>
          <PageHeaderContent
            centerNode={
              <>
                {/* Mobile, centered */}
                <ChainPickerPopup
                  NoneIcon={Logo}
                  buttonClassName="md:hidden"
                  chains={{ type: 'supported' }}
                  headerMode
                  noneLabel={t('info.allChains')}
                  onSelect={(chainId) => {
                    router.replace(
                      `/${
                        (chainId && getSupportedChainConfig(chainId)?.name) ||
                        ''
                      }`
                    )
                  }}
                  selectedChainId={chainId}
                  selectedLabelClassName="hidden xs:block"
                  showNone
                />

                {/* Large screen, left-aligned */}
                <ChainPickerPopup
                  NoneIcon={Logo}
                  buttonClassName="hidden md:block"
                  chains={{ type: 'supported' }}
                  headerMode
                  hideSelectedIcon
                  noneLabel={t('info.allChains')}
                  onSelect={(chainId) => {
                    router.replace(
                      `/${
                        (chainId && getSupportedChainConfig(chainId)?.name) ||
                        ''
                      }`
                    )
                  }}
                  selectedChainId={chainId}
                  selectedLabelClassName="!text-lg !header-text sm:!text-xl"
                  showNone
                />
              </>
            }
          />

          <StatelessHome
            DaoCard={DaoCard}
            chainGovDaos={chainGovDaos}
            featuredDaos={featuredDaos}
            openSearch={openSearch}
            search={
              chainId
                ? {
                    LazyDaoCard,
                    searchedDaos,
                    hasMore: searchQuery.hasNextPage,
                    totalHits,
                    query: search,
                    setQuery: setSearch,
                    ...infiniteScrollOptions,
                  }
                : undefined
            }
            stats={stats}
          />
        </>
      )}
    </>
  )
}
