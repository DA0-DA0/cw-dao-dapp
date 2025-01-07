import { toBase64, toUtf8 } from '@cosmjs/encoding'
import { ArrowBack, Clear } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import cloneDeep from 'lodash.clonedeep'
import merge from 'lodash.merge'
import { nanoid } from 'nanoid'
import { usePlausible } from 'next-plausible'
import { useEffect, useMemo, useState } from 'react'
import {
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
} from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilState, useRecoilValue } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  averageColorSelector,
  contractQueries,
  walletChainIdAtom,
} from '@dao-dao/state'
import {
  Button,
  ChainProvider,
  CreateDaoGovernance,
  CreateDaoReview,
  CreateDaoStart,
  CreateDaoVoting,
  DaoHeader,
  IconButton,
  ImageSelector,
  Loader,
  StatusCard,
  Tooltip,
  TooltipInfoIcon,
  useAppContext,
  useCachedLoadable,
  useDaoIfAvailable,
  useDaoNavHelpers,
  useSupportedChainContext,
  useThemeContext,
} from '@dao-dao/stateless'
import {
  ActionKey,
  ContractVersion,
  CreateDaoContext,
  CreateDaoCustomValidator,
  DaoPageMode,
  DaoParentInfo,
  DaoTabId,
  GovernanceProposalActionData,
  NewDao,
  PlausibleEvents,
  ProposalModuleAdapter,
  SecretModuleInstantiateInfo,
} from '@dao-dao/types'
import {
  InstantiateMsg as DaoDaoCoreInstantiateMsg,
  InitialItem,
} from '@dao-dao/types/contracts/DaoDaoCore'
import { InstantiateMsg as SecretDaoDaoCoreInstantiateMsg } from '@dao-dao/types/contracts/SecretDaoDaoCore'
import {
  CHAIN_GAS_MULTIPLIER,
  DaoProposalMultipleAdapterId,
  NEW_DAO_TOKEN_DECIMALS,
  SECRET_GAS,
  TokenBasedCreatorId,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  findWasmAttributeValue,
  getDisplayNameForChainId,
  getFallbackImage,
  getFundsFromDaoInstantiateMsg,
  getNativeTokenForChainId,
  getSupportedChainConfig,
  getSupportedChains,
  getWidgetStorageItemKey,
  instantiateSmartContract,
  isErrorWithSubstring,
  isSecretNetwork,
  makeWasmMessage,
  parseContractVersion,
  processError,
  versionGte,
} from '@dao-dao/utils'

import { CustomData } from '../../actions/core/actions/Custom/Component'
import { CwDao } from '../../clients/dao/CwDao'
import { SecretCwDao } from '../../clients/dao/SecretCwDao'
import { getCreatorById, getCreators } from '../../creators'
import {
  GovernanceTokenType,
  CreatorData as TokenBasedCreatorData,
} from '../../creators/TokenBased/types'
import {
  CwAdminFactoryHooks,
  SecretCwAdminFactoryHooks,
  useAwaitNextBlock,
  useFollowingDaos,
  useGenerateInstantiate2,
  useQuerySyncedRecoilState,
  useWallet,
} from '../../hooks'
import { getAdapterById as getProposalModuleAdapterById } from '../../proposal-module-adapter'
import {
  daoCreatedCardPropsAtom,
  makeDefaultNewDao,
  newDaoAtom,
} from '../../recoil/atoms/newDao'
import { getWidgets } from '../../widgets'
import { LinkWrapper } from '../LinkWrapper'
import { PageHeaderContent } from '../PageHeaderContent'
import { SuspenseLoader } from '../SuspenseLoader'
import { TokenAmountDisplay } from '../TokenAmountDisplay'
import { Trans } from '../Trans'
import { WalletChainSwitcher } from '../wallet'
import { loadCommonVotingConfigItems } from './commonVotingConfig'
import { CreateDaoExtensions } from './CreateDaoExtensions'
import { ImportMultisigModal } from './ImportMultisigModal'

// i18n keys
export enum CreateDaoSubmitValue {
  Back = 'button.goBack',
  Continue = 'button.continue',
  Review = 'button.review',
  Create = 'button.createDAO',
}

export type CreateDaoFormProps = {
  parentDao?: DaoParentInfo

  // Primarily for testing in storybook.
  override?: Partial<NewDao>
  initialPageIndex?: number
}

export const CreateDaoForm = (props: CreateDaoFormProps) => {
  // Sync chain ID in query param.
  const [, setWalletChainId] = useQuerySyncedRecoilState({
    // If parent DAO exists, we use the parent DAO's chain, so no need to sync
    // this in state as it won't be used.
    param: props.parentDao ? undefined : 'chain',
    atom: walletChainIdAtom,
  })

  // If parent DAO exists, we're making a SubDAO, so use the parent DAO's chain.
  const chainId = useRecoilValue(
    props.parentDao ? constSelector(props.parentDao.chainId) : walletChainIdAtom
  )

  const config = getSupportedChainConfig(chainId)
  // Switch to a valid chain if not a valid supported chain.
  useEffect(() => {
    if (!config) {
      setWalletChainId(getSupportedChains()[0].chainId)
    }
  }, [config, setWalletChainId])

  if (!config) {
    return <Loader />
  }

  return (
    <ChainProvider key={chainId} chainId={chainId}>
      <InnerCreateDaoForm {...props} />
    </ChainProvider>
  )
}

export const InnerCreateDaoForm = ({
  parentDao,
  override,
  initialPageIndex = 0,
}: CreateDaoFormProps) => {
  const { t } = useTranslation()
  const dao = useDaoIfAvailable()
  const queryClient = useQueryClient()
  const plausible = usePlausible<PlausibleEvents>()

  const chainContext = useSupportedChainContext()
  const {
    chainId,
    config: {
      name: chainGovName,
      factoryContractAddress,
      latestVersion,
      codeIds: { DaoDaoCore: daoDaoCoreCodeId },
      codeHashes,
      createViaGovernance,
      noInstantiate2Create,
    },
  } = chainContext

  // Only v2.5.0 and above supports instantiate2 in admin factory, so we can set
  // up widgets with the predictable DAO address.
  const supportsInstantiate2 =
    versionGte(latestVersion, ContractVersion.V250) && !noInstantiate2Create

  const CreateDaoPages = [
    CreateDaoStart,
    CreateDaoGovernance,
    CreateDaoVoting,
    // Need instantiate2 to setup extensions on DAO creation.
    ...(supportsInstantiate2 ? [CreateDaoExtensions] : []),
    CreateDaoReview,
  ]

  const { goToDao, goToDaoProposal } = useDaoNavHelpers()
  const { setFollowing } = useFollowingDaos()

  const { mode } = useAppContext()

  const [daoCreatedCardProps, setDaoCreatedCardProps] = useRecoilState(
    daoCreatedCardPropsAtom
  )

  const [_newDaoAtom, setNewDaoAtom] = useRecoilState(
    newDaoAtom({
      chainId,
      parentDaoAddress: parentDao?.coreAddress,
    })
  )

  // Verify cached value is still valid, and fix if not.
  const defaultForm = useMemo(() => {
    const defaultNewDao = makeDefaultNewDao(chainId)

    const cached = cloneDeep(_newDaoAtom)

    // Verify that the creator is still valid, since the IDs have been renamed a
    // couple times.
    if (!cached?.creator || !getCreatorById(cached.creator.id)) {
      cached.creator = defaultNewDao.creator
    }
    // Verify that the proposal module adapters are still valid, since the IDs
    // have been renamed a couple times.
    if (
      cached?.proposalModuleAdapters &&
      Array.isArray(cached.proposalModuleAdapters)
    ) {
      cached.proposalModuleAdapters = cached.proposalModuleAdapters.filter(
        (adapter) => adapter && getProposalModuleAdapterById(adapter.id)
      )
      if (cached.proposalModuleAdapters.length === 0) {
        cached.proposalModuleAdapters = defaultNewDao.proposalModuleAdapters
      }
    }

    // Merge defaults in case there are any new fields.
    const creator = getCreatorById(cached.creator.id)
    cached.creator.data = merge(
      {},
      // Start with defaults.
      creator?.makeDefaultConfig(chainContext.config),
      // Overwrite with existing values.
      cached.creator.data
    )

    cached.proposalModuleAdapters?.forEach((adapter) => {
      const proposalModuleAdapter = getProposalModuleAdapterById(adapter.id)
      adapter.data = merge(
        {},
        // Start with defaults.
        proposalModuleAdapter?.daoCreation?.extraVotingConfig?.default,
        // Overwrite with existing values.
        adapter.data
      )
    })

    // Ensure voting config object exists.
    if (!cached.votingConfig) {
      cached.votingConfig = defaultNewDao.votingConfig
    }
    cached.votingConfig = merge(
      {},
      // Start with defaults.
      defaultNewDao.votingConfig,
      // Overwrite with existing values.
      cached.votingConfig
    )

    // If no UUID is set, or no widgets are configured, randomize the uuid.
    // Sometimes uuid gets stuck in local storage, not cleared from a previous
    // DAO creation, and it needs to be reset. However, this uuid controls the
    // predicted DAO address which gets used when setting up widgets, so we can
    // only randomize it if no widgets have been set up yet.
    if (
      !cached.uuid ||
      !cached.widgets ||
      Object.keys(cached.widgets).length === 0 ||
      Object.values(cached.widgets).every((v) => v === null)
    ) {
      cached.uuid = nanoid()
    }

    return merge(
      // Merges into this object.
      cached,
      // Use overrides passed into component.
      override
    )
  }, [_newDaoAtom, chainContext.config, chainId, override])

  const form = useForm<NewDao>({
    defaultValues: defaultForm,
    mode: 'onChange',
  })

  const newDao = form.watch()
  const {
    uuid,
    name,
    description,
    imageUrl,
    bannerImageUrl,
    creator: { id: creatorId, data: creatorData },
    proposalModuleAdapters,
    votingConfig,
    widgets,
  } = newDao

  // If chain ID changes, update form values.
  useEffect(() => {
    if (newDao.chainId !== chainId) {
      form.reset(_newDaoAtom)
    }
  }, [_newDaoAtom, chainId, form, newDao.chainId])

  const makingSubDao = !!parentDao

  // Debounce saving latest data to atom and thus localStorage every 10 seconds.
  useEffect(() => {
    // If created DAO, don't update.
    if (daoCreatedCardProps) {
      return
    }

    // Deep clone to prevent values from becoming readOnly.
    const timeout = setTimeout(() => setNewDaoAtom(cloneDeep(newDao)), 10000)
    return () => clearTimeout(timeout)
  }, [newDao, setNewDaoAtom, daoCreatedCardProps])

  const onClear = () => {
    const newDao = makeDefaultNewDao(chainId)
    form.reset(newDao)
    setNewDaoAtom(cloneDeep(newDao))
  }

  // Set accent color based on image provided.
  const { setAccentColor } = useThemeContext()
  // Get average color of image URL.
  const averageImgColorLoadable = useCachedLoadable(
    !imageUrl ? undefined : averageColorSelector(imageUrl)
  )
  useEffect(() => {
    if (
      averageImgColorLoadable.state !== 'hasValue' ||
      !averageImgColorLoadable.contents
    ) {
      setAccentColor(undefined)
      return
    }

    setAccentColor(averageImgColorLoadable.contents)
  }, [averageImgColorLoadable, imageUrl, setAccentColor])

  //! Page state
  const [pageIndex, setPageIndex] = useState(initialPageIndex)

  const showBack = pageIndex > 0
  const submitValue =
    pageIndex < CreateDaoPages.length - 2
      ? CreateDaoSubmitValue.Continue
      : // Second to last links to the Review page.
        pageIndex === CreateDaoPages.length - 2
        ? CreateDaoSubmitValue.Review
        : // Last page creates the DAO.
          CreateDaoSubmitValue.Create
  const submitLabel =
    // Override with continue button if necessary.
    submitValue === CreateDaoSubmitValue.Create && createViaGovernance
      ? t('button.continue')
      : // Override with SubDAO button if necessary.
        submitValue === CreateDaoSubmitValue.Create && makingSubDao
        ? t('button.createSubDao')
        : t(submitValue)

  //! Adapters and message generators

  // Get available creators.
  const availableCreators: CreateDaoContext['availableCreators'] = useMemo(
    () => getCreators(),
    []
  )

  // Get selected creator.
  const creator = useMemo(() => getCreatorById(creatorId), [creatorId])
  if (!creator) {
    throw new Error(t('error.loadingData'))
  }

  // Get enabled proposal module adapters.
  const proposalModuleDaoCreationAdapters = useMemo(
    () =>
      proposalModuleAdapters
        // Filter out multiple choice adapter if not enabled.
        .filter(
          ({ id }) =>
            id !== DaoProposalMultipleAdapterId ||
            votingConfig.enableMultipleChoice
        )
        .map(({ id }) => getProposalModuleAdapterById(id)?.daoCreation)
        // Remove undefined adapters.
        .filter(Boolean) as Required<ProposalModuleAdapter>['daoCreation'][],
    [proposalModuleAdapters, votingConfig.enableMultipleChoice]
  )

  // Get available widgets.
  const availableWidgets: CreateDaoContext['availableWidgets'] = useMemo(
    () => getWidgets(chainId).filter((w) => w.supportsDaoCreation),
    [chainId]
  )

  let instantiateMsg:
    | DaoDaoCoreInstantiateMsg
    | SecretDaoDaoCoreInstantiateMsg
    | undefined
  let instantiateMsgError: string | undefined
  try {
    // Generate voting module adapter instantiation message.
    const votingModuleInstantiateInfo = creator.getInstantiateInfo({
      chainConfig: chainContext.config,
      newDao,
      data: creatorData,
      t,
    })

    // Generate proposal module adapters' instantiation messages.
    const proposalModuleInstantiateInfos =
      proposalModuleDaoCreationAdapters.map(({ getInstantiateInfo }, index) =>
        getInstantiateInfo(
          chainContext.config,
          newDao,
          proposalModuleAdapters[index].data,
          t
        )
      )

    const initialItems: InitialItem[] = [
      // Add banner image if set.
      ...(bannerImageUrl?.trim()
        ? [
            {
              key: 'banner',
              value: bannerImageUrl.trim(),
            },
          ]
        : []),
      // Add widgets if configured.
      ...(widgets && Object.keys(widgets).length > 0
        ? Object.entries(widgets).flatMap(([id, values]): InitialItem | [] =>
            values
              ? {
                  key: getWidgetStorageItemKey(id),
                  value: JSON.stringify(values),
                }
              : []
          )
        : []),
    ]

    const commonConfig = {
      // If parentDao exists, let's make a subDAO :D
      admin: parentDao?.coreAddress ?? null,
      name: name.trim(),
      description,
      imageUrl,
      initialItems: initialItems.length > 0 ? initialItems : undefined,
    }

    if (isSecretNetwork(chainId)) {
      // Type-checks. Adapters are responsible for using the correct proposal
      // module info generator based on the chain.
      if (!('code_hash' in votingModuleInstantiateInfo)) {
        throw new Error('Missing code_hash in voting module info')
      }
      if (
        proposalModuleInstantiateInfos.some((info) => !('code_hash' in info))
      ) {
        throw new Error('Missing code_hash in proposal module info')
      }

      instantiateMsg = decodeJsonFromBase64(
        SecretCwDao.generateInstantiateInfo(
          chainContext.chainId,
          commonConfig,
          votingModuleInstantiateInfo,
          proposalModuleInstantiateInfos as SecretModuleInstantiateInfo[]
        ).msg
      )
    } else {
      instantiateMsg = decodeJsonFromBase64(
        CwDao.generateInstantiateInfo(
          chainContext.chainId,
          commonConfig,
          votingModuleInstantiateInfo,
          proposalModuleInstantiateInfos
        ).msg
      )
    }
  } catch (err) {
    instantiateMsgError = err instanceof Error ? err.message : `${err}`
  }

  const instantiateMsgFunds =
    instantiateMsg && getFundsFromDaoInstantiateMsg(instantiateMsg)

  //! Submit handlers

  const [creating, setCreating] = useState(false)
  const {
    isWalletConnected,
    address: walletAddress,
    getSigningClient,
    refreshBalances,
  } = useWallet()

  const predictedDaoAddress = useGenerateInstantiate2({
    chainId,
    creator: factoryContractAddress,
    codeId: daoDaoCoreCodeId,
    salt: uuid,
  })

  // If the predicted DAO address differs from the one in the form, update it
  // and clear widgets, since widgets depend on knowing the DAO address ahead of
  // time.
  useEffect(() => {
    if (
      !predictedDaoAddress.loading &&
      !predictedDaoAddress.errored &&
      predictedDaoAddress.data !== newDao.predictedDaoAddress
    ) {
      form.setValue('predictedDaoAddress', predictedDaoAddress.data)
      form.setValue('widgets', {})
    }
  }, [form, newDao.predictedDaoAddress, predictedDaoAddress])

  const instantiateWithSelfAdmin =
    CwAdminFactoryHooks.useInstantiateWithAdminFactory({
      contractAddress: factoryContractAddress,
      sender: walletAddress ?? '',
    })
  const instantiate2WithSelfAdmin =
    CwAdminFactoryHooks.useInstantiate2WithAdminFactory({
      contractAddress: factoryContractAddress,
      sender: walletAddress ?? '',
    })
  const secretInstantiateWithSelfAdmin =
    SecretCwAdminFactoryHooks.useInstantiateContractWithSelfAdmin({
      contractAddress: factoryContractAddress,
      sender: walletAddress ?? '',
    })

  const doCreateDao = async () => {
    if (instantiateMsgError) {
      throw new Error(instantiateMsgError)
    } else if (!instantiateMsg) {
      throw new Error(t('error.loadingData'))
    } else if (!walletAddress) {
      throw new Error(t('error.logInToContinue'))
    }

    const isSecret = isSecretNetwork(chainId)
    const instantiateFunds = getFundsFromDaoInstantiateMsg(instantiateMsg)
    const contractLabel = `DAO DAO DAO (${Date.now()})`

    // If admin is set, use it as the contract-level admin as well (for creating
    // SubDAOs). Otherwise, instantiate with self as admin via factory.
    if (instantiateMsg.admin) {
      return await instantiateSmartContract(
        getSigningClient,
        walletAddress,
        daoDaoCoreCodeId,
        contractLabel,
        instantiateMsg,
        instantiateFunds,
        instantiateMsg.admin,
        undefined,
        undefined,
        supportsInstantiate2 ? toUtf8(uuid) : undefined
      )
    } else if (isSecret) {
      if (!codeHashes?.DaoDaoCore) {
        throw new Error('Code hash not found for DAO core contract')
      }

      const { events } = await secretInstantiateWithSelfAdmin(
        {
          instantiateMsg: encodeJsonToBase64(instantiateMsg),
          codeId: daoDaoCoreCodeId,
          codeHash: codeHashes.DaoDaoCore,
          label: contractLabel,
        },
        SECRET_GAS.DAO_CREATION,
        undefined,
        instantiateFunds
      )
      return findWasmAttributeValue(
        chainId,
        events,
        factoryContractAddress,
        'set contract admin as itself'
      )!
    } else {
      if (supportsInstantiate2 && !newDao.predictedDaoAddress) {
        throw new Error('Predicted DAO address not found')
      }

      const { events } = await (supportsInstantiate2
        ? instantiate2WithSelfAdmin(
            {
              codeId: daoDaoCoreCodeId,
              instantiateMsg: encodeJsonToBase64(instantiateMsg),
              label: contractLabel,
              salt: toBase64(toUtf8(uuid)),
              expect: newDao.predictedDaoAddress,
            },
            CHAIN_GAS_MULTIPLIER,
            undefined,
            instantiateFunds
          )
        : instantiateWithSelfAdmin(
            {
              codeId: daoDaoCoreCodeId,
              instantiateMsg: encodeJsonToBase64(instantiateMsg),
              label: contractLabel,
            },
            CHAIN_GAS_MULTIPLIER,
            undefined,
            instantiateFunds
          ))
      return findWasmAttributeValue(
        chainId,
        events,
        factoryContractAddress,
        'set contract admin as itself'
      )!
    }
  }

  const parseSubmitterValueDelta = (value: string): number => {
    switch (value) {
      case CreateDaoSubmitValue.Back:
        return -1
      case CreateDaoSubmitValue.Continue:
      case CreateDaoSubmitValue.Review:
        return 1
      default:
        // Pass a number to step that many pages in either direction.
        const valueNumber = parseInt(value || '1', 10)
        if (!isNaN(valueNumber) && valueNumber !== 0) return valueNumber

        return 0
    }
  }

  const [customValidator, setCustomValidator] =
    useState<CreateDaoCustomValidator>()

  const daoVotingTokenBasedCreatorData =
    creatorId === TokenBasedCreatorId
      ? (creatorData as TokenBasedCreatorData)
      : undefined

  const awaitNextBlock = useAwaitNextBlock()
  const onSubmit: SubmitHandler<NewDao> = async (values, event) => {
    // If navigating, no need to display errors.
    form.clearErrors()

    const nativeEvent = event?.nativeEvent as SubmitEvent
    const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

    // Create the DAO.
    if (submitterValue === CreateDaoSubmitValue.Create) {
      if (createViaGovernance) {
        if (instantiateMsgError) {
          toast.error(processError(instantiateMsgError))
          return
        } else if (!instantiateMsg) {
          toast.error(t('error.loadingData'))
          return
        }

        setCreating(true)

        const contractLabel = `DAO DAO DAO (${Date.now()})`

        if (supportsInstantiate2 && !newDao.predictedDaoAddress) {
          throw new Error('Predicted DAO address not found')
        }

        // Redirect to prefilled chain governance prop page.
        goToDaoProposal(chainGovName, 'create', {
          prefill: encodeJsonToBase64({
            chainId,
            title: `Create DAO: ${name.trim()}`,
            description: 'This proposal creates a new DAO.',
            // If admin is set, use it as the contract-level admin as well (for
            // creating SubDAOs). Otherwise, instantiate with self as admin via
            // factory.
            _actionData: instantiateMsg.admin
              ? [
                  {
                    _id: 'create',
                    actionKey: ActionKey.Custom,
                    data: {
                      message: JSON.stringify(
                        makeWasmMessage({
                          wasm: {
                            [supportsInstantiate2
                              ? 'instantiate2'
                              : 'instantiate']: {
                              admin: instantiateMsg.admin,
                              code_id: daoDaoCoreCodeId,
                              funds:
                                getFundsFromDaoInstantiateMsg(instantiateMsg),
                              label: contractLabel,
                              msg: instantiateMsg,
                              ...(supportsInstantiate2 && {
                                salt: toBase64(toUtf8(uuid)),
                              }),
                            },
                          },
                        }),
                        null,
                        2
                      ),
                    } as CustomData,
                  },
                ]
              : [
                  {
                    _id: 'create',
                    actionKey: ActionKey.Custom,
                    data: {
                      message: JSON.stringify(
                        makeWasmMessage({
                          wasm: {
                            execute: {
                              contract_addr: factoryContractAddress,
                              funds:
                                getFundsFromDaoInstantiateMsg(instantiateMsg),
                              msg: {
                                [supportsInstantiate2
                                  ? 'instantiate2_contract_with_self_admin'
                                  : 'instantiate_contract_with_self_admin']: {
                                  code_id: daoDaoCoreCodeId,
                                  instantiate_msg:
                                    encodeJsonToBase64(instantiateMsg),
                                  label: contractLabel,
                                  ...(supportsInstantiate2 && {
                                    salt: toBase64(toUtf8(uuid)),
                                    expect: newDao.predictedDaoAddress,
                                  }),
                                },
                              },
                            },
                          },
                        }),
                        null,
                        2
                      ),
                    } as CustomData,
                  },
                ],
          } as Partial<GovernanceProposalActionData>),
        })
      } else if (isWalletConnected && walletAddress) {
        setCreating(true)
        try {
          const coreAddress = await toast.promise(doCreateDao(), {
            loading: t('info.creatingDao'),
            success: t('success.daoCreatedPleaseWait'),
            error: (err) => {
              // If instantiate2 collision error, redirect to the first creation
              // page and tell them to clear and restart.
              if (
                isErrorWithSubstring(err, [
                  'contract address already exists, try a different combination of creator, checksum and salt',
                  'instance with this code id, sender and label exists: try a different label',
                ])
              ) {
                setPageIndex(initialPageIndex)

                return t('error.daoCreationCollision')
              }

              return processError(err)
            },
          })

          plausible('daoCreate', {
            props: {
              chainId,
              dao: coreAddress,
              daoType: values.creator.id,
              walletAddress,
            },
          })

          const { info } = await queryClient
            .fetchQuery(
              contractQueries.info(queryClient, {
                chainId,
                address: coreAddress,
              })
            )
            .catch(() => ({ info: { version: 'unknown' } }))
          const coreVersion = parseContractVersion(info.version)

          // Don't set following on SDA. Only dApp.
          if (mode !== DaoPageMode.Sda) {
            setFollowing({
              chainId,
              coreAddress,
            })
          }

          // New wallet balances will not appear until the next block.
          awaitNextBlock().then(refreshBalances)

          //! Show DAO created modal.

          const nativeToken = getNativeTokenForChainId(chainId)

          // Get tokenSymbol and tokenBalance for DAO card.
          const { tokenSymbol, tokenBalance, tokenDecimals } =
            creatorId === TokenBasedCreatorId && daoVotingTokenBasedCreatorData
              ? //! Display governance token supply if using governance tokens.
                {
                  tokenBalance:
                    daoVotingTokenBasedCreatorData.govTokenType ===
                    GovernanceTokenType.New
                      ? HugeDecimal.fromHumanReadable(
                          daoVotingTokenBasedCreatorData.newInfo.initialSupply,
                          NEW_DAO_TOKEN_DECIMALS
                        )
                      : // If using existing token but no token info loaded (should
                        // be impossible), just display 0.
                        !daoVotingTokenBasedCreatorData.existingToken ||
                          daoVotingTokenBasedCreatorData.existingTokenSupply ===
                            undefined
                        ? HugeDecimal.zero
                        : HugeDecimal.from(
                            daoVotingTokenBasedCreatorData.existingTokenSupply
                          ),
                  tokenSymbol:
                    daoVotingTokenBasedCreatorData.govTokenType ===
                    GovernanceTokenType.New
                      ? daoVotingTokenBasedCreatorData.newInfo.symbol
                      : // If using existing token but no token info loaded (should
                        // be impossible), the tokenBalance above will be set to
                        // 0, so use the native token here so this value is
                        // accurate.
                        !daoVotingTokenBasedCreatorData.existingToken
                        ? nativeToken.symbol
                        : daoVotingTokenBasedCreatorData.existingToken.symbol ||
                          t('info.token').toLocaleUpperCase(),
                  tokenDecimals:
                    daoVotingTokenBasedCreatorData.govTokenType ===
                      GovernanceTokenType.Existing &&
                    daoVotingTokenBasedCreatorData.existingToken
                      ? daoVotingTokenBasedCreatorData.existingToken.decimals
                      : // If using existing token but no token info loaded
                        // (should be impossible), the tokenBalance above will
                        // be set to 0, so it doesn't matter that this is
                        // wrong.
                        NEW_DAO_TOKEN_DECIMALS,
                }
              : //! Otherwise display native token, which has a balance of 0 initially.
                {
                  tokenBalance: HugeDecimal.zero,
                  tokenSymbol: nativeToken.symbol,
                  tokenDecimals: nativeToken.decimals,
                }

          // Set card props to show modal.
          setDaoCreatedCardProps({
            info: {
              admin: parentDao?.coreAddress || coreAddress,
              chainId,
              coreAddress,
              coreVersion,
              name,
              description,
              imageUrl: imageUrl || getFallbackImage(coreAddress),
              parentDao: parentDao || null,
              created: Date.now(),
              votingModuleAddress: '',
              votingModuleInfo: {
                contract: '',
                version: '',
              },
              proposalModules: [],
              isActive: true,
              activeThreshold: null,
              items: {},
              polytoneProxies: {},
              accounts: [],
              contractAdmin: null,
            },
            lazyData: {
              loading: false,
              errored: false,
              data: {
                proposalCount: 0,
                tokenWithBalance: {
                  balance: tokenBalance.toHumanReadableNumber(tokenDecimals),
                  symbol: tokenSymbol,
                  decimals: tokenDecimals,
                },
              },
            },
            showIsMember: false,
            showingEstimatedUsdValue: false,
          })

          // Clear saved form data.
          setNewDaoAtom(makeDefaultNewDao(chainId))

          // Navigate to DAO page (underneath the creation modal).
          goToDao(coreAddress)
        } catch (err) {
          // toast.promise above will handle displaying the error
          console.error(err)
          setCreating(false)
        }
        // Don't stop creating on success, since we are navigating to a new
        // page and want to prevent creating duplicate DAOs.
      } else {
        toast.error(t('error.logInToCreate'))
      }

      return
    }

    // Save values to state.
    setNewDaoAtom((prevNewDao) => ({
      ...prevNewDao,
      // Deep clone to prevent values from becoming readOnly.
      ...cloneDeep(values),
    }))

    // Clear custom validation function in case next page does not override
    // the previous page's.
    setCustomValidator(undefined)

    // Navigate pages.
    const pageDelta = parseSubmitterValueDelta(submitterValue)
    setPageIndex(
      Math.min(Math.max(0, pageIndex + pageDelta), CreateDaoPages.length - 1)
    )
  }

  const onError: SubmitErrorHandler<NewDao> = (errors, event) => {
    const nativeEvent = event?.nativeEvent as SubmitEvent
    const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

    // Allow backwards navigation without valid fields.
    const pageDelta = parseSubmitterValueDelta(submitterValue)
    if (pageDelta < 0) {
      return onSubmit(form.getValues(), event)
    } else {
      console.error('Form errors', errors)
    }
  }

  const _handleSubmit = form.handleSubmit(onSubmit, onError)
  const formOnSubmit = (...args: Parameters<typeof _handleSubmit>) => {
    const nativeEvent = args[0]?.nativeEvent as SubmitEvent
    const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value
    const pageDelta = parseSubmitterValueDelta(submitterValue)

    // Validate here instead of in onSubmit since custom errors prevent form
    // submission, and we still want to be able to move backwards.
    customValidator?.(
      // Only set new errors when progressing. If going back, don't.
      pageDelta > 0
    )

    return _handleSubmit(...args)
  }

  const createDaoContext: CreateDaoContext = {
    form,
    instantiateMsg,
    instantiateMsgError,
    setCustomValidator: (fn) => setCustomValidator(() => fn),
    commonVotingConfig: loadCommonVotingConfigItems(),
    availableCreators,
    creator,
    predictedDaoAddress,
    proposalModuleDaoCreationAdapters,
    availableWidgets,
    makeDefaultNewDao,
    SuspenseLoader,
    ImportMultisigModal,
  }

  const Page = CreateDaoPages[pageIndex]

  return (
    <>
      {/* <RightSidebarContent>
        <DaoCreateSidebarCard
          // Once created, set pageIndex to 4 to show all checkboxes.
          pageIndex={daoCreatedCardProps ? 4 : pageIndex}
        />
      </RightSidebarContent> */}

      <PageHeaderContent
        breadcrumbs={{
          className: !makingSubDao ? 'hidden md:flex' : undefined,
          // Use the SubDAOs tab as the home breadcrumb if making a SubDAO.
          homeTab: makingSubDao
            ? {
                id: DaoTabId.SubDaos,
                sdaLabel: t('title.subDaos'),
              }
            : undefined,
          current: makingSubDao ? t('title.newSubDao') : t('title.newDao'),
          dao,
        }}
        centerNode={
          !makingSubDao && (
            <WalletChainSwitcher
              buttonClassName="md:hidden"
              headerMode
              selectedLabelClassName="hidden xs:block"
            />
          )
        }
        rightNode={
          !makingSubDao && (
            <WalletChainSwitcher buttonClassName="hidden md:block" headerMode />
          )
        }
      />

      {/* No container padding because we want the gradient to expand. Apply px-6 to children instead. */}
      <form
        className="relative z-[1] flex flex-col items-stretch"
        onSubmit={formOnSubmit}
      >
        {/* Show image selector or DAO header depending on page. */}
        {pageIndex === 0 ? (
          <div className="relative flex flex-col items-center pb-10">
            <Tooltip title={t('button.clear')}>
              <IconButton
                Icon={Clear}
                circular
                className="absolute -top-2 right-0"
                confirm
                onClick={onClear}
                variant="ghost"
              />
            </Tooltip>

            <div className="relative flex flex-col justify-end items-center h-48 self-stretch mb-6 mt-10">
              <ImageSelector
                Trans={Trans}
                className="absolute top-0 left-0 right-0 bottom-0"
                error={form.formState.errors.bannerImageUrl}
                fieldName="bannerImageUrl"
                register={form.register}
                setValue={form.setValue}
                style="banner"
                watch={form.watch}
              />

              <ImageSelector
                Trans={Trans}
                className="-mb-8 relative"
                error={form.formState.errors.imageUrl}
                fieldName="imageUrl"
                register={form.register}
                setValue={form.setValue}
                style="avatar"
                watch={form.watch}
              />
            </div>
          </div>
        ) : (
          <DaoHeader
            LinkWrapper={LinkWrapper}
            bannerImageUrl={bannerImageUrl}
            className={clsx('mb-8 md:mb-12', !bannerImageUrl && 'md:mt-4')}
            description={description}
            imageUrl={imageUrl}
            name={name}
            parentDao={parentDao}
          />
        )}

        {/* Divider line shown after first page. */}
        {pageIndex > 0 && (
          <div className="bg-border-base mb-7 h-[1px] w-full"></div>
        )}

        <div className="mb-14">
          <FormProvider {...form}>
            <Page {...createDaoContext} />
          </FormProvider>

          {/* If funds are required, display on last page. */}
          {pageIndex === CreateDaoPages.length - 1 &&
            !!instantiateMsgFunds?.length &&
            instantiateMsgFunds.some(({ amount }) => amount !== '0') && (
              <div className="mt-6 -mb-8 flex flex-row justify-end">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-row items-center gap-1 self-start">
                    <p className="primary-text text-text-body">
                      {t('title.fees')}
                    </p>
                    <TooltipInfoIcon
                      size="sm"
                      title={t('info.createDaoFeesExplanation')}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    {instantiateMsgFunds.map((coin, index) => (
                      <TokenAmountDisplay
                        key={coin.denom + index}
                        coin={coin}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
        </div>

        {submitValue === CreateDaoSubmitValue.Create && createViaGovernance && (
          <div className="flex flex-col items-end mb-8 -mt-4">
            <StatusCard
              className="max-w-md"
              content={t('info.daoCreationRequiresChainGovProp', {
                chain: getDisplayNameForChainId(chainId),
              })}
              style="warning"
            />
          </div>
        )}

        <div
          className="border-border-secondary flex flex-row items-center border-y py-7 gap-8"
          // justify-end doesn't work in tailwind for some reason
          style={{
            justifyContent: showBack ? 'space-between' : 'flex-end',
          }}
        >
          {showBack && (
            <Button
              disabled={creating}
              type="submit"
              value={CreateDaoSubmitValue.Back}
              variant="secondary"
            >
              <ArrowBack className="text-icon-primary !h-4 !w-4" />
              <p>{t(CreateDaoSubmitValue.Back)}</p>
            </Button>
          )}

          <Button loading={creating} type="submit" value={submitValue}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  )
}
