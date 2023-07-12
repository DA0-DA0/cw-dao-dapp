import { Chain } from '@chain-registry/types'
import axios from 'axios'
import type { GetStaticProps, Redirect } from 'next'
import { TFunction } from 'next-i18next'
import removeMarkdown from 'remove-markdown'

import { serverSideTranslationsWithServerT } from '@dao-dao/i18n/serverSideTranslations'
import {
  DaoCoreV2QueryClient,
  PolytoneNoteQueryClient,
  queryIndexer,
} from '@dao-dao/state'
import {
  CommonProposalInfo,
  ContractVersion,
  ContractVersionInfo,
  DaoPageMode,
  DaoParentInfo,
  IndexerDumpState,
  InfoResponse,
  PolytoneProxies,
  ProposalModule,
} from '@dao-dao/types'
import { ConfigResponse as ConfigV1Response } from '@dao-dao/types/contracts/CwCore.v1'
import {
  Config,
  ConfigResponse as ConfigV2Response,
  ListItemsResponse,
  ProposalModuleWithInfo,
} from '@dao-dao/types/contracts/DaoCore.v2'
import {
  CI,
  DAO_STATIC_PROPS_CACHE_SECONDS,
  LEGACY_URL_PREFIX,
  MAX_META_CHARS_PROPOSAL_DESCRIPTION,
  cosmWasmClientRouter,
  getChainForChainId,
  getDaoPath,
  getRpcForChainId,
  isValidWalletAddress,
  parseContractVersion,
  processError,
  toAccessibleImageUrl,
  validateAddressOnCurrentChain,
} from '@dao-dao/utils'
import {
  CHAIN_ID,
  FAST_AVERAGE_COLOR_API_TEMPLATE,
  POLYTONE_NOTES,
} from '@dao-dao/utils/constants'

import { DaoPageWrapperProps } from '../components'
import {
  ProposalModuleAdapterError,
  matchAndLoadAdapter,
} from '../proposal-module-adapter'
import {
  fetchProposalModules,
  fetchProposalModulesWithInfoFromChain,
} from '../utils/fetchProposalModules'

interface GetDaoStaticPropsMakerProps {
  leadingTitle?: string
  followingTitle?: string
  overrideTitle?: string
  overrideDescription?: string
  overrideImageUrl?: string
  additionalProps?: Record<string, any> | null | undefined
  url?: string
}

interface GetDaoStaticPropsMakerOptions {
  coreAddress?: string
  getProps?: (options: {
    context: Parameters<GetStaticProps>[0]
    t: TFunction
    config: ConfigV1Response | ConfigV2Response
    chain: Chain
    coreAddress: string
    coreVersion: ContractVersion
    proposalModules: ProposalModule[]
  }) =>
    | GetDaoStaticPropsMakerProps
    | undefined
    | null
    | Promise<GetDaoStaticPropsMakerProps | undefined | null>
}

type GetDaoStaticPropsMaker = (
  options?: GetDaoStaticPropsMakerOptions
) => GetStaticProps<DaoPageWrapperProps>

export class LegacyDaoError extends Error {
  constructor() {
    super()
    this.name = 'LegacyDaoError'
  }
}

// Computes DaoPageWrapperProps for the DAO with optional alterations.
export const makeGetDaoStaticProps: GetDaoStaticPropsMaker =
  ({ coreAddress: _coreAddress, getProps } = {}) =>
  async (context) => {
    // Don't query chain if running in CI.
    if (CI) {
      return { notFound: true }
    }

    // Load server translations and get T function for use in getProps.
    const { i18nProps, serverT } = await serverSideTranslationsWithServerT(
      context.locale,
      ['translation']
    )

    const coreAddress = _coreAddress ?? context.params?.address

    // Validate supported chain for address and redirect if necessary.
    try {
      // If invalid address, display not found.
      if (!coreAddress || typeof coreAddress !== 'string') {
        throw new Error('Invalid address')
      }

      const switchToSubdomain = validateAddressOnCurrentChain(coreAddress)
      if (switchToSubdomain) {
        return {
          redirect: {
            destination:
              switchToSubdomain + getDaoPath(DaoPageMode.Dapp, coreAddress),
            permanent: false,
          },
        }
      }

      // Validation throws error if address prefix not recognized. Display not
      // found in this case.
    } catch (err) {
      console.error(err)

      // Excluding `info` will render DAONotFound.
      return {
        props: {
          ...i18nProps,
          title: serverT('title.daoNotFound'),
          description: '',
        },
      }
    }

    // Add to Sentry error tags if error occurs.
    let coreVersion: ContractVersion | undefined
    try {
      const {
        admin,
        config,
        version,
        votingModule: { address: votingModuleAddress, info: votingModuleInfo },
        activeProposalModules,
        created,
        parentDao,
        items: _items,
      } = await daoCoreDumpState(coreAddress, serverT)
      coreVersion = version

      // If no contract name, will display fallback voting module adapter.
      const votingModuleContractName =
        (votingModuleInfo &&
          'contract' in votingModuleInfo &&
          votingModuleInfo.contract) ||
        'fallback'

      // Get DAO proposal modules.
      const proposalModules = await fetchProposalModules(
        CHAIN_ID,
        coreAddress,
        coreVersion,
        activeProposalModules
      )

      // Convert items list into map.
      const items = _items.reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value,
        }),
        {} as Record<string, string>
      )

      // Get DAO polytone proxies.
      const polytoneProxies = (
        await Promise.all(
          Object.entries(POLYTONE_NOTES).map(async ([_chainId, { note }]) => {
            let proxy
            try {
              proxy = await queryIndexer<string>({
                type: 'contract',
                address: note,
                formula: 'polytone/note/remoteAddress',
                args: {
                  address: coreAddress,
                },
                chainId: CHAIN_ID,
              })
            } catch {
              // Ignore error.
            }
            if (!proxy) {
              const polytoneNoteClient = new PolytoneNoteQueryClient(
                // Will not reconnect if already connected. Safe to lazily
                // evaluate here.
                await cosmWasmClientRouter.connect(getRpcForChainId(CHAIN_ID)),
                note
              )
              proxy =
                (await polytoneNoteClient.remoteAddress({
                  localAddress: coreAddress,
                })) || undefined
            }

            return {
              chainId: _chainId,
              proxy,
            }
          })
        )
      ).reduce(
        (acc, { chainId, proxy }) => ({
          ...acc,
          ...(proxy
            ? {
                [chainId]: proxy,
              }
            : {}),
        }),
        {} as PolytoneProxies
      )

      // Must be called after server side translations has been awaited, because
      // props may use the `t` function, and it won't be available until after.
      const {
        leadingTitle,
        followingTitle,
        overrideTitle,
        overrideDescription,
        overrideImageUrl,
        additionalProps,
        url,
      } =
        (await getProps?.({
          context,
          t: serverT,
          config,
          chain: getChainForChainId(CHAIN_ID),
          coreAddress,
          coreVersion,
          proposalModules,
        })) ?? {}

      // Get DAO accent color.
      let accentColor: string | null = null
      if (config.image_url) {
        try {
          const response = await axios.get(
            FAST_AVERAGE_COLOR_API_TEMPLATE.replace(
              'URL',
              toAccessibleImageUrl(config.image_url)
            ),
            { responseType: 'text' }
          )

          accentColor = response.data
        } catch (error) {
          // If fail to load image or get color, don't prevent page render.
          console.error(error)
        }
      }

      const props: DaoPageWrapperProps = {
        ...i18nProps,
        url: url ?? null,
        title:
          overrideTitle ??
          [leadingTitle?.trim(), config.name.trim(), followingTitle?.trim()]
            .filter(Boolean)
            .join(' | '),
        description: overrideDescription ?? config.description,
        accentColor,
        serializedInfo: {
          coreAddress,
          coreVersion,
          votingModuleAddress,
          votingModuleContractName,
          proposalModules,
          name: config.name,
          description: config.description,
          imageUrl: overrideImageUrl ?? config.image_url ?? null,
          created: created?.toJSON() ?? null,
          items,
          polytoneProxies,
          parentDao,
          admin,
        },
        ...additionalProps,
      }

      return {
        props,
        // Regenerate the page at most once per `revalidate` seconds. Serves
        // cached copy and refreshes in background.
        revalidate: DAO_STATIC_PROPS_CACHE_SECONDS,
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

      console.error(error)

      if (
        error instanceof Error &&
        (error.message.includes('contract: not found') ||
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
          },
          // Regenerate the page at most once per second. Serves cached copy and
          // refreshes in background.
          revalidate: 1,
        }
      }

      // Return error in props to trigger client-side 500 error.
      return {
        props: {
          ...i18nProps,
          title: serverT('title.500'),
          description: '',
          // Report to Sentry.
          error: processError(error, {
            forceCapture: true,
            tags: {
              coreAddress,
              coreVersion: coreVersion ?? '<undefined>',
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
    getProps: async ({
      context: { params = {} },
      t,
      chain,
      coreAddress,
      proposalModules,
    }) => {
      const proposalId = params[proposalIdParamKey]

      // If invalid proposal ID, not found.
      if (typeof proposalId !== 'string') {
        return {
          followingTitle: t('title.proposalNotFound'),
          additionalProps: {
            proposalInfo: undefined,
          },
        }
      }

      let proposalInfo: CommonProposalInfo | null = null
      try {
        const {
          options: {
            proposalModule: { prefix },
          },
          adapter: {
            functions: { getProposalInfo },
          },
        } = await matchAndLoadAdapter(proposalModules, proposalId, {
          chain,
          coreAddress,
        })

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

        // If ProposalModuleAdapterError, treat as 404 below.
        // Otherwise display 500.
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
          // If proposal does not exist, undefined indicates 404.
          proposalInfo,
        },
      }
    },
  })

export class RedirectError {
  constructor(public redirect: Redirect) {}
}

const loadParentDaoInfo = async (
  subDaoAddress: string,
  potentialParentAddress: string | null | undefined,
  serverT: TFunction,
  // Prevent cycles by ensuring admin has not already been seen.
  previousParentAddresses: string[]
): Promise<Omit<DaoParentInfo, 'registeredSubDao'> | null> => {
  // If no admin, or admin is set to itself, or admin is a wallet, no parent
  // DAO.
  if (
    !potentialParentAddress ||
    potentialParentAddress === subDaoAddress ||
    isValidWalletAddress(
      potentialParentAddress,
      getChainForChainId(CHAIN_ID).bech32_prefix
    ) ||
    previousParentAddresses?.includes(potentialParentAddress)
  ) {
    return null
  }

  try {
    const {
      admin,
      version,
      config: { name, image_url },
      parentDao,
    } = await daoCoreDumpState(potentialParentAddress, serverT, [
      ...(previousParentAddresses ?? []),
      potentialParentAddress,
    ])

    return {
      coreAddress: potentialParentAddress,
      coreVersion: version,
      name: name,
      imageUrl: image_url ?? null,
      parentDao,
      admin,
    }
  } catch (err) {
    // If contract not found, ignore error. Otherwise, log it.
    if (!(err instanceof Error) || !err.message.includes('not found')) {
      console.error(err)
      console.error(
        `Error loading parent DAO (${potentialParentAddress}) of ${subDaoAddress}`,
        processError(err)
      )
    }

    // Don't prevent page render if failed to load parent DAO info.
    return null
  }
}

const LEGACY_DAO_CONTRACT_NAMES = ['crates.io:sg_dao', 'crates.io:cw3_dao']
const ITEM_LIST_LIMIT = 30

interface DaoCoreDumpState {
  admin: string
  config: Config
  version: ContractVersion
  votingModule: {
    address: string
    info: ContractVersionInfo
  }
  activeProposalModules: ProposalModuleWithInfo[]
  created: Date | undefined
  parentDao: DaoParentInfo | null
  items: ListItemsResponse
}

const daoCoreDumpState = async (
  coreAddress: string,
  serverT: TFunction,
  // Prevent cycles by ensuring admin has not already been seen.
  previousParentAddresses?: string[]
): Promise<DaoCoreDumpState> => {
  try {
    const indexerDumpedState = await queryIndexer<IndexerDumpState>({
      type: 'contract',
      address: coreAddress,
      formula: 'daoCore/dumpState',
      chainId: CHAIN_ID,
    })

    // Use data from indexer if present.
    if (indexerDumpedState) {
      if (
        LEGACY_DAO_CONTRACT_NAMES.includes(indexerDumpedState.version?.contract)
      ) {
        throw new LegacyDaoError()
      }

      const coreVersion = parseContractVersion(
        indexerDumpedState.version.version
      )
      if (!coreVersion) {
        throw new Error(serverT('error.failedParsingCoreVersion'))
      }

      const items =
        (await queryIndexer<ListItemsResponse>({
          type: 'contract',
          address: coreAddress,
          formula: 'daoCore/listItems',
          chainId: CHAIN_ID,
        })) ?? []

      const parentDaoInfo = await loadParentDaoInfo(
        coreAddress,
        indexerDumpedState.admin,
        serverT,
        [...(previousParentAddresses ?? []), coreAddress]
      )

      return {
        ...indexerDumpedState,
        version: coreVersion,
        votingModule: {
          address: indexerDumpedState.voting_module,
          info: indexerDumpedState.votingModuleInfo,
        },
        activeProposalModules: indexerDumpedState.proposal_modules.filter(
          ({ status }) => status === 'enabled' || status === 'Enabled'
        ),
        created: indexerDumpedState.createdAt
          ? new Date(indexerDumpedState.createdAt)
          : undefined,
        items,
        parentDao: parentDaoInfo
          ? {
              ...parentDaoInfo,
              // Whether or not this parent has registered its child as a SubDAO.
              registeredSubDao:
                indexerDumpedState.adminInfo?.registeredSubDao ?? false,
            }
          : null,
      }
    }
  } catch (error) {
    // Rethrow if legacy DAO.
    if (error instanceof LegacyDaoError) {
      throw error
    }

    // Ignore error. Fallback to querying chain below.
    console.error(error, processError(error))
  }

  const cwClient = await cosmWasmClientRouter.connect(
    getRpcForChainId(CHAIN_ID)
  )
  const daoCoreClient = new DaoCoreV2QueryClient(cwClient, coreAddress)

  const dumpedState = await daoCoreClient.dumpState()
  if (LEGACY_DAO_CONTRACT_NAMES.includes(dumpedState.version.contract)) {
    throw new LegacyDaoError()
  }

  const coreVersion = parseContractVersion(dumpedState.version.version)
  if (!coreVersion) {
    throw new Error(serverT('error.failedParsingCoreVersion'))
  }

  const votingModuleInfo = (
    (await cwClient.queryContractSmart(dumpedState.voting_module, {
      info: {},
    })) as InfoResponse
  ).info

  const proposalModules = await fetchProposalModulesWithInfoFromChain(
    CHAIN_ID,
    coreAddress,
    coreVersion
  )

  // Get all items.
  const items: ListItemsResponse = []
  while (true) {
    const _items = await daoCoreClient.listItems({
      startAfter: items[items.length - 1]?.[0],
      limit: ITEM_LIST_LIMIT,
    })
    if (!_items.length) {
      break
    }

    items.push(..._items)

    // If we got less than the limit, we've reached the end.
    if (_items.length < ITEM_LIST_LIMIT) {
      break
    }
  }

  const parentDao = await loadParentDaoInfo(
    coreAddress,
    dumpedState.admin,
    serverT,
    [...(previousParentAddresses ?? []), coreAddress]
  )
  let registeredSubDao = false
  // If parent DAO exists, check if this DAO is a SubDAO of the parent. Only V2
  // DAOs have SubDAOs.
  if (parentDao && parentDao.coreVersion !== ContractVersion.V1) {
    const parentDaoCoreClient = new DaoCoreV2QueryClient(
      cwClient,
      dumpedState.admin
    )

    // Get all SubDAOs.
    const subdaoAddrs: string[] = []
    while (true) {
      const response = await parentDaoCoreClient.listSubDaos({
        startAfter: subdaoAddrs[subdaoAddrs.length - 1],
        limit: SUBDAO_LIST_LIMIT,
      })
      if (!response?.length) break

      subdaoAddrs.push(...response.map(({ addr }) => addr))

      // If we have less than the limit of items, we've exhausted them.
      if (response.length < SUBDAO_LIST_LIMIT) {
        break
      }
    }

    registeredSubDao = subdaoAddrs.includes(coreAddress)
  }

  return {
    ...dumpedState,
    version: coreVersion,
    votingModule: {
      address: dumpedState.voting_module,
      info: votingModuleInfo,
    },
    activeProposalModules: proposalModules.filter(
      ({ status }) => status === 'enabled' || status === 'Enabled'
    ),
    created: undefined,
    items,
    parentDao: parentDao
      ? {
          ...parentDao,
          registeredSubDao,
        }
      : null,
  }
}

const SUBDAO_LIST_LIMIT = 30
