import { fromBase64 } from '@cosmjs/encoding'
import { QueryClient } from '@tanstack/react-query'
import type { GetStaticProps, GetStaticPropsResult, Redirect } from 'next'
import { TFunction } from 'next-i18next'
import removeMarkdown from 'remove-markdown'

import { serverSideTranslationsWithServerT } from '@dao-dao/i18n/serverSideTranslations'
import {
  ChainXGovDao,
  contractQueries,
  dehydrateSerializable,
  getDao,
  makeReactQueryClient,
  polytoneQueries,
  queryIndexer,
} from '@dao-dao/state'
import {
  AnyChain,
  CommonProposalInfo,
  DaoPageMode,
  GovProposalVersion,
  GovProposalWithDecodedContent,
  IDaoBase,
  ProposalV1,
  ProposalV1Beta1,
} from '@dao-dao/types'
import {
  DAO_CORE_ACCENT_ITEM_KEY,
  DAO_STATIC_PROPS_CACHE_SECONDS,
  LEGACY_DAO_CONTRACT_NAMES,
  LEGACY_URL_PREFIX,
  MAX_META_CHARS_PROPOSAL_DESCRIPTION,
  cosmosProtoRpcClientRouter,
  cosmosSdkVersionIs46OrHigher,
  decodeGovProposal,
  getChainForChainId,
  getChainIdsForAddress,
  getConfiguredGovChainByName,
  getDaoPath,
  processError,
} from '@dao-dao/utils'

import { DaoPageWrapperProps } from '../components'
import {
  ProposalModuleAdapterError,
  matchAndLoadAdapter,
} from '../proposal-module-adapter'

interface GetDaoStaticPropsMakerProps {
  leadingTitle?: string
  followingTitle?: string
  overrideTitle?: string
  overrideDescription?: string
  additionalProps?: Record<string, any> | null | undefined
  url?: string
}

interface GetDaoStaticPropsMakerOptions {
  appMode: DaoPageMode
  coreAddress?: string
  getProps?: (options: {
    context: Parameters<GetStaticProps>[0]
    t: TFunction
    queryClient: QueryClient
    chain: AnyChain
    dao: IDaoBase
  }) =>
    | GetDaoStaticPropsMakerProps
    | undefined
    | null
    | Promise<GetDaoStaticPropsMakerProps | undefined | null>
}

type GetDaoStaticPropsMaker = (
  options: GetDaoStaticPropsMakerOptions
) => GetStaticProps<DaoPageWrapperProps>

export class LegacyDaoError extends Error {
  constructor() {
    super()
    this.name = 'LegacyDaoError'
  }
}

// Computes DaoPageWrapperProps for the DAO with optional alterations.
export const makeGetDaoStaticProps: GetDaoStaticPropsMaker =
  ({ appMode, coreAddress: _coreAddress, getProps }) =>
  async (context) => {
    // Load server translations and get T function for use in getProps.
    const { i18nProps, serverT } = await serverSideTranslationsWithServerT(
      context.locale,
      ['translation']
    )

    let coreAddress = (_coreAddress ?? context.params?.address) as string

    // Check if address is actually the name of a chain so we can resolve the
    // gov module.
    const configuredGovChain =
      coreAddress && typeof coreAddress === 'string'
        ? getConfiguredGovChainByName(coreAddress)
        : undefined

    const queryClient = makeReactQueryClient()

    const getForChainId = async (
      chainId: string
    ): Promise<GetStaticPropsResult<DaoPageWrapperProps>> => {
      // If address is polytone proxy, redirect to DAO on native chain.
      if (!configuredGovChain) {
        try {
          const isPolytoneProxy = await queryClient.fetchQuery(
            contractQueries.isPolytoneProxy(queryClient, {
              chainId,
              address: coreAddress,
            })
          )
          if (isPolytoneProxy) {
            const { remoteAddress } = await queryClient.fetchQuery(
              polytoneQueries.reverseLookupProxy(queryClient, {
                chainId,
                address: coreAddress,
              })
            )

            return {
              redirect: {
                destination: getDaoPath(appMode, remoteAddress),
                permanent: true,
              },
            }
          }
        } catch {
          // If failed, ignore.
        }
      }

      // Add to Sentry error tags if error occurs.
      try {
        // Check for legacy contract.
        const contractInfo = !configuredGovChain
          ? (
              await queryClient.fetchQuery(
                contractQueries.info(queryClient, {
                  chainId,
                  address: coreAddress,
                })
              )
            )?.info
          : undefined
        if (
          contractInfo &&
          LEGACY_DAO_CONTRACT_NAMES.includes(contractInfo.contract)
        ) {
          throw new LegacyDaoError()
        }

        const dao = getDao({
          queryClient,
          chainId,
          coreAddress,
        })

        await Promise.all([
          // Initialize to load info.
          dao.init(),
          // Pre-fetch TVL.
          dao.getTvl().catch(() => undefined),
        ])

        // Must be called after server side translations has been awaited,
        // because props may use the `t` function, and it won't be available
        // until after.
        const {
          leadingTitle,
          followingTitle,
          overrideTitle,
          overrideDescription,
          additionalProps,
          url,
        } =
          (await getProps?.({
            context,
            t: serverT,
            queryClient,
            chain: getChainForChainId(chainId),
            dao,
          })) ?? {}

        const title =
          overrideTitle ??
          [leadingTitle?.trim(), dao.name, followingTitle?.trim()]
            .filter(Boolean)
            .join(' | ')
        const description = overrideDescription ?? dao.description
        const accentColor =
          // If viewing configured gov chain, use its accent color.
          configuredGovChain?.accentColor ||
          dao.info.items[DAO_CORE_ACCENT_ITEM_KEY] ||
          null

        const props: DaoPageWrapperProps = {
          ...i18nProps,
          url: url ?? null,
          title,
          description,
          accentColor,
          info: dao.info,
          reactQueryDehydratedState: dehydrateSerializable(queryClient),
          ...additionalProps,
        }

        return {
          props,
          // For chain governance DAOs: no need to regenerate this page for
          // since the props are constant. The values above can only change when
          // a new version of the frontend is deployed, in which case the static
          // pages will regenerate.
          //
          // For real DAOs, revalidate the page at most once per `revalidate`
          // seconds. Serves cached copy and refreshes in background.
          revalidate: configuredGovChain
            ? false
            : DAO_STATIC_PROPS_CACHE_SECONDS,
        }
      } catch (error) {
        // Redirect.
        if (error instanceof RedirectError) {
          return {
            redirect: error.redirect,
          }
        }

        // Redirect legacy DAOs (legacy multisigs redirected in next.config.js
        // redirects list).
        if (
          error instanceof LegacyDaoError ||
          (error instanceof Error &&
            error.message.includes(
              'Query failed with (18): Error parsing into type cw3_dao::msg::QueryMsg: unknown variant `dump_state`'
            ))
        ) {
          return {
            redirect: {
              destination:
                LEGACY_URL_PREFIX + getDaoPath(DaoPageMode.Dapp, coreAddress),
              permanent: false,
            },
          }
        }

        if (
          error instanceof Error &&
          (error.message.includes('contract: not found') ||
            error.message.includes('no such contract') ||
            error.message.includes('404 contract not found') ||
            error.message.includes('Error parsing into type') ||
            error.message.includes('decoding bech32 failed') ||
            error.message.includes('dumpState reason: Unexpected token'))
        ) {
          // Excluding `info` will render DAONotFound.
          return {
            props: {
              ...i18nProps,
              title: 'DAO not found',
              description: '',
              reactQueryDehydratedState: dehydrateSerializable(queryClient),
            },
            // Regenerate the page at most once per second. Serves cached copy
            // and refreshes in background.
            revalidate: 1,
          }
        }

        console.error(error)

        // Return error in props to trigger client-side 500 error.
        return {
          props: {
            ...i18nProps,
            title: serverT('title.500'),
            description: '',
            reactQueryDehydratedState: dehydrateSerializable(queryClient),
            // Report to Sentry.
            error: processError(error, {
              tags: {
                chainId,
                coreAddress,
              },
              extra: { context },
            }),
          },
          // Regenerate the page at most once per second. Serves cached copy and
          // refreshes in background.
          revalidate: 1,
        }
      }
    }

    let result
    if (configuredGovChain) {
      result = await getForChainId(configuredGovChain.chainId)
    } else {
      // Get chain IDs for address based on prefix.
      let decodedChainIds: string[]
      try {
        // If invalid address, display not found.
        if (!coreAddress || typeof coreAddress !== 'string') {
          throw new Error('Invalid address')
        }

        decodedChainIds = getChainIdsForAddress(coreAddress)

        // Validation throws error if address prefix not recognized. Display not
        // found in this case.
      } catch (err) {
        console.error(err)

        // Excluding `info` will render DAONotFound.
        return {
          props: {
            ...i18nProps,
            title: serverT('title.daoNotFound'),
            description: err instanceof Error ? err.message : `${err}`,
            reactQueryDehydratedState: dehydrateSerializable(queryClient),
          },
        }
      }

      const results = await Promise.allSettled(
        decodedChainIds.map((c) => getForChainId(c))
      )

      // If all errored, throw first error.
      if (results.every((p) => p.status === 'rejected')) {
        throw new Error(
          results[0].status === 'rejected'
            ? results[0].reason
            : 'Failed to find chain'
        )
      }

      const fulfilledResults = results.flatMap((p) =>
        p.status === 'fulfilled' ? p.value : []
      )

      // Get first result that found DAO info successfully. Otherwise, use first
      // result (probably DAO not found).
      result =
        fulfilledResults.find((r) => 'props' in r && r.props.info) ||
        fulfilledResults[0]
    }

    return result
  }

interface GetDaoProposalStaticPropsMakerOptions
  extends Omit<GetDaoStaticPropsMakerOptions, 'getProps'> {
  getProposalUrlPrefix: (
    params: Record<string, string | string[] | undefined>
  ) => string
  proposalIdParamKey?: string
}

export const makeGetDaoProposalStaticProps = ({
  getProposalUrlPrefix,
  proposalIdParamKey = 'proposalId',
  ...options
}: GetDaoProposalStaticPropsMakerOptions) =>
  makeGetDaoStaticProps({
    ...options,
    getProps: async ({ context: { params = {} }, t, chain, dao }) => {
      const proposalId = params[proposalIdParamKey]

      // If invalid proposal ID, not found.
      if (typeof proposalId !== 'string') {
        return {
          followingTitle: t('title.proposalNotFound'),
          additionalProps: {
            proposalInfo: null,
          },
        }
      }

      // Gov module.
      if (dao instanceof ChainXGovDao) {
        const url = getProposalUrlPrefix(params) + proposalId

        const client = await cosmosProtoRpcClientRouter.connect(chain.chainId)
        const cosmosSdkVersion =
          (
            await client.base.tendermint.v1beta1.getNodeInfo()
          ).applicationVersion?.cosmosSdkVersion.slice(1) || '0.0.0'
        const supportsV1Gov = cosmosSdkVersionIs46OrHigher(cosmosSdkVersion)

        let proposal: GovProposalWithDecodedContent | null = null
        try {
          // Try to load from indexer first.
          const indexerProposal:
            | {
                id: string
                data: string
              }
            | undefined = await queryIndexer({
            chainId: chain.chainId,
            type: 'generic',
            formula: 'gov/proposal',
            args: {
              id: proposalId,
            },
          })

          if (indexerProposal) {
            if (supportsV1Gov) {
              proposal = await decodeGovProposal(chain.chainId, {
                version: GovProposalVersion.V1,
                id: BigInt(proposalId),
                proposal: ProposalV1.decode(fromBase64(indexerProposal.data)),
              })
            } else {
              proposal = await decodeGovProposal(chain.chainId, {
                version: GovProposalVersion.V1_BETA_1,
                id: BigInt(proposalId),
                proposal: ProposalV1Beta1.decode(
                  fromBase64(indexerProposal.data),
                  undefined,
                  true
                ),
              })
            }
          }
        } catch (err) {
          console.error(err)
          // Report to Sentry.
          processError(err)
        }

        // Fallback to querying chain if indexer failed.
        if (!proposal) {
          try {
            if (supportsV1Gov) {
              try {
                const proposalV1 = (
                  await client.gov.v1.proposal({
                    proposalId: BigInt(proposalId),
                  })
                ).proposal
                if (!proposalV1) {
                  throw new Error('NOT_FOUND')
                }

                proposal = await decodeGovProposal(chain.chainId, {
                  version: GovProposalVersion.V1,
                  id: BigInt(proposalId),
                  proposal: proposalV1,
                })
              } catch (err) {
                // Fallback to v1beta1 query if v1 not supported.
                if (
                  !(err instanceof Error) ||
                  !err.message.includes('unknown query path')
                ) {
                  // Rethrow other errors.
                  throw err
                }
              }
            }

            if (!proposal) {
              const proposalV1Beta1 = (
                await client.gov.v1beta1.proposal(
                  {
                    proposalId: BigInt(proposalId),
                  },
                  true
                )
              ).proposal
              if (!proposalV1Beta1) {
                throw new Error('NOT_FOUND')
              }

              proposal = await decodeGovProposal(chain.chainId, {
                version: GovProposalVersion.V1_BETA_1,
                id: BigInt(proposalId),
                proposal: proposalV1Beta1,
              })
            }
          } catch (error) {
            if (
              error instanceof Error &&
              (error.message.includes("doesn't exist: key not found") ||
                error.message === 'NOT_FOUND')
            ) {
              return {
                url,
                followingTitle: t('title.proposalNotFound'),
                // Excluding `proposalId` indicates not found.
                additionalProps: {
                  proposalId: null,
                },
              }
            }

            console.error(error)
            // Report to Sentry.
            processError(error)
            // Throw error to trigger 500.
            throw new Error(t('error.unexpectedError'))
          }
        }

        return {
          url,
          followingTitle: proposal.title,
          overrideDescription: removeMarkdown(proposal.description).slice(
            0,
            MAX_META_CHARS_PROPOSAL_DESCRIPTION
          ),
          additionalProps: {
            proposalInfo: {
              id: proposal.id.toString(),
              title: proposal.title,
              description: proposal.description,
              expiration: null,
              createdAtEpoch: null,
              createdByAddress: '',
            } as CommonProposalInfo,
          },
        }
      }

      // DAO.

      let proposalInfo: CommonProposalInfo | null = null
      try {
        const {
          options: {
            proposalModule: { prefix },
          },
          adapter: {
            functions: { getProposalInfo },
          },
        } = await matchAndLoadAdapter(dao, proposalId)

        // If proposal is numeric, i.e. has no prefix, redirect to prefixed URL.
        if (!isNaN(Number(proposalId))) {
          throw new RedirectError({
            destination: getProposalUrlPrefix(params) + prefix + proposalId,
            permanent: true,
          })
        }

        // undefined if proposal does not exist.
        proposalInfo = (await getProposalInfo()) ?? null
      } catch (error) {
        // Rethrow.
        if (error instanceof RedirectError) {
          throw error
        }

        // If ProposalModuleAdapterError, treat as 404 below. Otherwise display
        // 500.
        if (!(error instanceof ProposalModuleAdapterError)) {
          // Report to Sentry.
          processError(error)

          console.error(error)
          // Throw error to trigger 500.
          throw new Error(t('error.unexpectedError'))
        }
      }

      return {
        url: getProposalUrlPrefix(params) + proposalId,
        followingTitle: proposalInfo
          ? proposalInfo.title
          : t('title.proposalNotFound'),
        overrideDescription: removeMarkdown(
          proposalInfo?.description ?? ''
        ).slice(0, MAX_META_CHARS_PROPOSAL_DESCRIPTION),
        additionalProps: {
          // If proposal does not exist, null indicates 404.
          proposalInfo,
        },
      }
    },
  })

export class RedirectError {
  constructor(public redirect: Redirect) {}
}
