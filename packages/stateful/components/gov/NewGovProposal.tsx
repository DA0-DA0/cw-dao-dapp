import { fromBase64 } from '@cosmjs/encoding'
import { EncodeObject } from '@cosmjs/proto-signing'
import {
  BookOutlined,
  Close,
  FlagOutlined,
  GavelRounded,
  Timelapse,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Fuse from 'fuse.js'
import cloneDeep from 'lodash.clonedeep'
import { useRouter } from 'next/router'
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
} from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

import { accountQueries, chainQueries } from '@dao-dao/state/query'
import {
  latestProposalSaveAtom,
  proposalCreatedCardPropsAtom,
  proposalDraftsAtom,
} from '@dao-dao/state/recoil'
import {
  Button,
  ErrorPage,
  FilterableItem,
  FilterableItemPopup,
  IconButton,
  PageLoader,
  ProposalContentDisplay,
  Tooltip,
  useActionOptions,
  useConfiguredChainContext,
  useDaoNavHelpers,
  useHoldingKey,
  useLoadingPromise,
  useUpdatingRef,
} from '@dao-dao/stateless'
import {
  ActionChainContextType,
  ActionContextType,
  GovernanceProposalActionData,
  ProposalDraft,
} from '@dao-dao/types'
import { BinaryReader } from '@dao-dao/types/protobuf'
import { MsgSubmitProposal as MsgSubmitProposalV1 } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1/tx'
import { ProposalStatus } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { MsgSubmitProposal as MsgSubmitProposalV1Beta1 } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/tx'
import { Any } from '@dao-dao/types/protobuf/codegen/google/protobuf/any'
import {
  CHAIN_GAS_MULTIPLIER,
  SITE_URL,
  dateToWdhms,
  decodeJsonFromBase64,
  formatDateTime,
  formatPercentOf100,
  formatTime,
  getDisplayNameForChainId,
  getImageUrlForChainId,
  getNullWalletForChain,
  govProposalActionDataToDecodedContent,
  isCosmWasmStargateMsg,
  makeEmptyUnifiedProfile,
  objectMatchesStructure,
  processError,
  transformIpfsUrlToHttpsIfNecessary,
  uploadJsonToIpfs,
} from '@dao-dao/utils'

import { WalletActionsProvider } from '../../actions'
import { GovernanceProposalAction } from '../../actions/core/actions'
import {
  useEntity,
  useProfile,
  useQueryLoadingDataWithError,
  useRefreshGovProposals,
} from '../../hooks'
import { useWallet } from '../../hooks/useWallet'
import { EntityDisplay } from '../EntityDisplay'
import { GovProposalActionDisplay } from './GovProposalActionDisplay'

enum ProposeSubmitValue {
  Preview = 'Preview',
  Submit = 'Submit',
}

export type NewGovProposalProps = Pick<
  InnerNewGovProposalProps,
  'clearRef' | 'copyDraftLinkRef'
>

export const NewGovProposal = (innerProps: NewGovProposalProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const chainContext = useConfiguredChainContext()
  const queryClient = useQueryClient()

  const { address: walletAddress = '' } = useWallet()
  const { profile } = useProfile()
  const accounts = useQueryLoadingDataWithError(
    walletAddress
      ? accountQueries.list(queryClient, {
          chainId: chainContext.chainId,
          address: walletAddress,
        })
      : undefined
  )

  const governanceProposalAction = useMemo(
    () =>
      new GovernanceProposalAction({
        t,
        chain: chainContext.chain,
        chainContext: {
          type: ActionChainContextType.Configured,
          ...chainContext,
        },
        address: walletAddress,
        context: {
          type: ActionContextType.Wallet,
          profile: profile.loading
            ? makeEmptyUnifiedProfile(chainContext.chainId, walletAddress)
            : profile.data,
          accounts: accounts.loading || accounts.errored ? [] : accounts.data,
        },
        queryClient,
      }),
    [t, chainContext, walletAddress, profile, accounts, queryClient]
  )
  // Initialize governance proposal action and re-render when done.
  useLoadingPromise({
    promise: () => governanceProposalAction.init(),
    deps: [governanceProposalAction],
  })

  const localStorageKey = `gov_${chainContext.chainId}`
  const latestProposalSave = useRecoilValue(
    latestProposalSaveAtom(localStorageKey)
  )

  // Set once prefill has been assessed, indicating NewProposal can load now.
  const [prefillChecked, setPrefillChecked] = useState(false)
  // If set to an object, prefill form with data.
  const [usePrefill, setUsePrefill] = useState<Record<string, any> | undefined>(
    undefined
  )
  // Prefill form with data from parameter once ready.
  useEffect(() => {
    if (!router.isReady || prefillChecked) {
      return
    }

    const loadFromPrefill = async () => {
      let potentialPrefill = router.query.prefill

      // If no potential prefill found, try to load from IPFS.
      if (!potentialPrefill) {
        if (router.query.pi && typeof router.query.pi === 'string') {
          try {
            // Parse as text (not JSON) since JSON will be parsed below.
            potentialPrefill = await (
              await fetch(
                transformIpfsUrlToHttpsIfNecessary(`ipfs://${router.query.pi}`)
              )
            ).text()
          } catch (error) {
            console.error(error)
            toast.error(t('error.failedToLoadIpfsProposalSave'))
          }
        }
      }

      if (typeof potentialPrefill !== 'string' || !potentialPrefill) {
        setPrefillChecked(true)
        return
      }

      // Try to parse as JSON.
      let prefillData
      try {
        prefillData = JSON.parse(potentialPrefill)
      } catch (error) {
        console.error(error)
      }

      // Try to parse as base64.
      if (!prefillData) {
        try {
          prefillData = decodeJsonFromBase64(potentialPrefill)
        } catch (error) {
          console.error(error)
        }
      }

      // If prefillData looks valid, use it.
      if (
        objectMatchesStructure(prefillData, {
          chainId: {},
          title: {},
          description: {},
        })
      ) {
        setUsePrefill(prefillData)
      }

      setPrefillChecked(true)
    }

    loadFromPrefill()
  }, [router.query.prefill, router.query.pi, router.isReady, prefillChecked, t])

  return governanceProposalAction.idle ||
    governanceProposalAction.loading ||
    (walletAddress && accounts.loading) ||
    !prefillChecked ? (
    <PageLoader />
  ) : governanceProposalAction.errored ? (
    <ErrorPage error={governanceProposalAction.error} />
  ) : (
    <InnerNewGovProposal
      {...innerProps}
      action={governanceProposalAction}
      defaults={{
        ...governanceProposalAction.defaults,
        ...latestProposalSave,
        ...usePrefill,
      }}
      localStorageKey={localStorageKey}
      realDefaults={governanceProposalAction.defaults}
    />
  )
}

type InnerNewGovProposalProps = {
  /**
   * The local storage key to use for saving the current form.
   */
  localStorageKey: string
  /**
   * The default values to use form the form on initial load, taking into
   * account save state and prefill.
   */
  defaults: GovernanceProposalActionData
  /**
   * Used to reset the form back to default.
   */
  realDefaults: GovernanceProposalActionData
  /**
   * The governance proposal creation action.
   */
  action: GovernanceProposalAction
  /**
   * A function ref that the parent uses to clear the form.
   */
  clearRef: MutableRefObject<() => void>
  /**
   * A function ref that copies a link to the current draft.
   */
  copyDraftLinkRef: MutableRefObject<() => Promise<void>>
}

const InnerNewGovProposal = ({
  localStorageKey,
  defaults,
  realDefaults,
  action,
  clearRef,
  copyDraftLinkRef,
}: InnerNewGovProposalProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const chainContext = useConfiguredChainContext()
  const { isWalletConnected, getSigningClient, chain, chainWallet } =
    useWallet()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const queryClient = useQueryClient()

  const { context } = useActionOptions()
  if (context.type !== ActionContextType.Gov) {
    throw new Error(`Unsupported context: ${context}`)
  }

  const [loading, setLoading] = useState(false)

  const [showPreview, setShowPreview] = useState(false)
  const [showSubmitErrorNote, setShowSubmitErrorNote] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { address: walletAddress = '' } = useWallet()
  const { entity } = useEntity(walletAddress)

  const [proposalCreatedCardProps, setProposalCreatedCardProps] =
    useRecoilState(proposalCreatedCardPropsAtom)

  const setLatestProposalSave = useSetRecoilState(
    latestProposalSaveAtom(localStorageKey)
  )

  const formMethods = useForm<GovernanceProposalActionData>({
    mode: 'onChange',
    defaultValues: cloneDeep(defaults),
  })
  const {
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = formMethods

  const holdingAltForDirectSign = useHoldingKey({ key: 'alt' })

  const onSubmitError: SubmitErrorHandler<GovernanceProposalActionData> =
    useCallback(() => {
      setShowSubmitErrorNote(true)
      setSubmitError('')
    }, [setShowSubmitErrorNote])

  const refreshGovProposals = useRefreshGovProposals()

  const onSubmitForm: SubmitHandler<GovernanceProposalActionData> = useCallback(
    async (data, event) => {
      const nativeEvent = event?.nativeEvent as SubmitEvent
      const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

      setShowSubmitErrorNote(false)

      // Preview toggled in onClick handler.
      if (submitterValue === ProposeSubmitValue.Preview) {
        return
      }

      if (!isWalletConnected || !chainWallet) {
        toast.error(t('error.logInToContinue'))
        return
      }

      setSubmitError('')

      let encodeObject: EncodeObject
      try {
        // Transforms to stargate Cosmos message that submits proposal.
        const submitProposalStargateMsg = (await action.encode(data))[0]
        if (
          !submitProposalStargateMsg ||
          !isCosmWasmStargateMsg(submitProposalStargateMsg)
        ) {
          throw new Error(t('error.loadingData'))
        }

        // Transform Cosmos message to executable encode object.
        encodeObject = {
          typeUrl: submitProposalStargateMsg.stargate.type_url,
          value:
            submitProposalStargateMsg.stargate.type_url ===
            MsgSubmitProposalV1.typeUrl
              ? MsgSubmitProposalV1.decode(
                  fromBase64(submitProposalStargateMsg.stargate.value)
                )
              : MsgSubmitProposalV1Beta1.decode(
                  fromBase64(submitProposalStargateMsg.stargate.value)
                ),
        }

        // Need to re-encode the v1beta1 content as Any since `decode` fully
        // decodes the content into an object, but we need it encoded.
        if (encodeObject.typeUrl === MsgSubmitProposalV1Beta1.typeUrl) {
          const reader = new BinaryReader(
            fromBase64(submitProposalStargateMsg.stargate.value)
          )
          const end = reader.len
          while (reader.pos < end) {
            const tag = reader.uint32()
            switch (tag >>> 3) {
              case 1:
                ;(encodeObject.value as MsgSubmitProposalV1Beta1).content =
                  Any.decode(reader, reader.uint32()) as any
                break
              default:
                reader.skipType(tag & 7)
                break
            }
          }
        }
      } catch (err) {
        console.error(err)
        setSubmitError(
          processError(err, {
            forceCapture: false,
          })
        )
        return
      }

      setLoading(true)
      try {
        const signingClient = await getSigningClient(
          holdingAltForDirectSign ? 'direct' : 'amino'
        )

        const { events } = await signingClient.signAndBroadcast(
          walletAddress,
          [encodeObject],
          CHAIN_GAS_MULTIPLIER
        )

        const proposalId = Number(
          events
            .find(
              ({ type, attributes }) =>
                type === 'submit_proposal' &&
                attributes.some(({ key }) => key === 'proposal_id')
            )
            ?.attributes.find(({ key }) => key === 'proposal_id')?.value ?? -1
        )
        if (proposalId === -1) {
          throw new Error(t('error.loadingData'))
        }

        const proposal = await queryClient.fetchQuery(
          chainQueries.govProposal(queryClient, {
            chainId: chainContext.chainId,
            proposalId,
          })
        )

        const endTime =
          proposal.proposal.status ===
          ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD
            ? proposal.proposal.depositEndTime
            : proposal.proposal.votingEndTime

        // Show modal.
        setProposalCreatedCardProps({
          id: proposal.id.toString(),
          title: proposal.title,
          description: proposal.description,
          info: [
            {
              Icon: BookOutlined,
              label: `${t('title.threshold')}: ${formatPercentOf100(
                context.params.threshold * 100
              )}`,
            },
            {
              Icon: FlagOutlined,
              label: `${t('title.quorum')}: ${formatPercentOf100(
                context.params.quorum * 100
              )}`,
            },
            ...(endTime
              ? [
                  {
                    Icon: Timelapse,
                    label: dateToWdhms(endTime),
                  },
                ]
              : []),
          ],
          dao: {
            name: getDisplayNameForChainId(chainContext.chainId),
            coreAddress: chainContext.config.name,
            imageUrl: getImageUrlForChainId(chainContext.chainId),
          },
        })

        // Refresh proposals state.
        refreshGovProposals()

        // Clear saved form data.
        setLatestProposalSave({})

        // Navigate to proposal (underneath the creation modal).
        router.push(
          getDaoProposalPath(chainContext.config.name, proposalId.toString())
        )

        // Don't stop loading indicator on success since we are navigating.
      } catch (err) {
        console.error(err)
        toast.error(processError(err))
        setLoading(false)
      }
    },
    [
      isWalletConnected,
      chainWallet,
      t,
      action,
      walletAddress,
      getSigningClient,
      holdingAltForDirectSign,
      chainContext.chainId,
      chainContext.config.name,
      setProposalCreatedCardProps,
      context.params.threshold,
      context.params.quorum,
      refreshGovProposals,
      setLatestProposalSave,
      router,
      queryClient,
      getDaoProposalPath,
    ]
  )
  const proposalData = watch()

  // Reset form to defaults and clear latest proposal save.
  clearRef.current = () => {
    formMethods.reset(cloneDeep(realDefaults))
    setLatestProposalSave({})
  }

  // Copy link to current draft.
  copyDraftLinkRef.current = async () => {
    // Upload data to IPFS.
    const cid = await uploadJsonToIpfs(proposalData)
    // Copy link to clipboard.
    navigator.clipboard.writeText(
      SITE_URL +
        getDaoProposalPath(chainContext.config.name, 'create', {
          pi: cid,
        })
    )
    toast.success(t('info.copiedLinkToClipboard'))
  }

  const saveQueuedRef = useRef(false)
  const saveLatestProposalRef = useUpdatingRef(() =>
    setLatestProposalSave(
      // If created proposal, clear latest proposal save.
      proposalCreatedCardProps ? {} : cloneDeep(proposalData)
    )
  )

  // Save latest data to atom and thus localStorage every second.
  useEffect(() => {
    // If created proposal, don't save.
    if (proposalCreatedCardProps) {
      return
    }

    // Queue save in 1 second if not already queued.
    if (saveQueuedRef.current) {
      return
    }
    saveQueuedRef.current = true

    // Save in one second.
    setTimeout(() => {
      saveLatestProposalRef.current()
      saveQueuedRef.current = false
    }, 1000)
  }, [
    proposalCreatedCardProps,
    setLatestProposalSave,
    proposalData,
    saveLatestProposalRef,
  ])

  const [drafts, setDrafts] = useRecoilState(
    proposalDraftsAtom(localStorageKey)
  )
  const [draftIndex, setDraftIndex] = useState<number>()
  const draft =
    draftIndex !== undefined && drafts.length > draftIndex
      ? drafts[draftIndex]
      : undefined
  const loadDraft = useCallback(
    (loadIndex: number) => {
      // Already saving to a selected draft or draft doesn't exist.
      if (draftIndex || loadIndex >= drafts.length) {
        return
      }

      const draft = drafts[loadIndex]
      if (!draft) {
        toast.error(t('error.loadingData'))
      }
      // Deep clone to prevent values from being readOnly.
      reset(cloneDeep(draft.proposal.data))
      setDraftIndex(loadIndex)
    },
    [draftIndex, drafts, reset, t]
  )
  const deleteDraft = useCallback(
    (deleteIndex: number) => {
      setDrafts((drafts) => drafts.filter((_, index) => index !== deleteIndex))
      setDraftIndex(undefined)
    },
    [setDrafts]
  )
  const unloadDraft = () => setDraftIndex(undefined)

  const saveDraft = useCallback(() => {
    // Already saving to a selected draft.
    if (draft) {
      return
    }

    const newDraft: ProposalDraft = {
      name: proposalData.title,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      proposal: {
        id: '',
        data: proposalData,
      },
    }

    setDrafts([newDraft, ...drafts])
    setDraftIndex(0)
  }, [draft, drafts, proposalData, setDrafts])

  // Debounce saving draft every 3 seconds.
  const [draftSaving, setDraftSaving] = useState(false)
  useEffect(() => {
    if (draftIndex === undefined) {
      return
    }

    // Save after 3 seconds.
    setDraftSaving(true)
    const timeout = setTimeout(() => {
      setDrafts((drafts) =>
        drafts.map((savedDraft, index) =>
          index === draftIndex
            ? {
                ...savedDraft,
                name: proposalData.title,
                lastUpdatedAt: Date.now(),
                proposal: {
                  id: '',
                  // Deep clone to prevent values from becoming readOnly.
                  data: cloneDeep(proposalData),
                },
              }
            : savedDraft
        )
      )
      setDraftSaving(false)
    }, 3000)
    // Debounce.
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Instance changes every time, so compare stringified verison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(proposalData),
    draftIndex,
    setDrafts,
  ])

  return (
    <FormProvider {...formMethods}>
      <form
        className="flex flex-col gap-6"
        onSubmit={handleSubmit(onSubmitForm, onSubmitError)}
      >
        <div className="flex flex-col gap-4">
          <WalletActionsProvider
            address={
              // If wallet not connected, use placeholder wallet so it still
              // loads.
              walletAddress || getNullWalletForChain(chain.chainId)
            }
          >
            <action.Component
              addAction={() => {}}
              allActionsWithData={[]}
              data={proposalData}
              errors={errors}
              fieldNamePrefix=""
              index={-1}
              isCreating
              remove={() => {}}
            />
          </WalletActionsProvider>
        </div>

        <div className="border-border-secondary flex flex-col gap-2 border-y py-6">
          <div className="flex flex-row items-center justify-between gap-6">
            <p className="title-text text-text-body">
              {t('info.reviewYourProposal')}
            </p>

            <div className="flex flex-row items-center justify-end gap-2">
              <Button
                disabled={loading}
                onClick={() => setShowPreview((p) => !p)}
                type="submit"
                value={ProposeSubmitValue.Preview}
                variant="secondary"
              >
                {showPreview ? (
                  <>
                    {t('button.hidePreview')}
                    <VisibilityOff className="!h-5 !w-5" />
                  </>
                ) : (
                  <>
                    {t('button.preview')}
                    <Visibility className="!h-5 !w-5" />
                  </>
                )}
              </Button>

              <Tooltip
                title={
                  !isWalletConnected ? t('error.logInToContinue') : undefined
                }
              >
                <Button
                  disabled={!isWalletConnected}
                  loading={loading}
                  type="submit"
                  value={ProposeSubmitValue.Submit}
                >
                  <p>
                    {t('button.publish') +
                      (holdingAltForDirectSign ? ` (${t('info.direct')})` : '')}
                  </p>
                  <GavelRounded className="!h-4 !w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {showSubmitErrorNote && (
            <p className="secondary-text text-text-interactive-error self-end text-right">
              {t('error.correctErrorsAbove')}
            </p>
          )}

          {!!submitError && (
            <p className="secondary-text text-text-interactive-error self-end text-right">
              {submitError}
            </p>
          )}

          {showPreview && (
            <div className="border-border-secondary mt-4 rounded-md border p-6">
              <ProposalContentDisplay
                EntityDisplay={EntityDisplay}
                createdAt={new Date()}
                creator={{
                  address: walletAddress,
                  entity,
                }}
                description={proposalData.description}
                innerContentDisplay={
                  <GovProposalActionDisplay
                    content={govProposalActionDataToDecodedContent(
                      proposalData
                    )}
                  />
                }
                title={proposalData.title}
              />
            </div>
          )}
        </div>

        <div className="flex flex-row items-center justify-end gap-2">
          {draft ? (
            <>
              <p
                className={clsx(
                  'caption-text italic',
                  draftSaving && 'animate-pulse'
                )}
              >
                {draftSaving
                  ? t('info.draftSaving')
                  : t('info.draftSavedAtTime', {
                      time: formatTime(new Date(draft.lastUpdatedAt)),
                    })}
              </p>

              <Tooltip
                title={draftSaving ? undefined : t('info.draftStillSaved')}
              >
                <Button
                  className="caption-text -ml-1"
                  disabled={draftSaving}
                  onClick={unloadDraft}
                  variant="underline"
                >
                  {t('button.resetQuestion')}
                </Button>
              </Tooltip>
            </>
          ) : (
            <>
              {drafts.length > 0 && (
                <FilterableItemPopup
                  filterableItemKeys={FILTERABLE_KEYS}
                  items={drafts.map(
                    ({ name, createdAt, lastUpdatedAt }, index) => ({
                      key: createdAt,
                      label: name,
                      description: (
                        <>
                          {t('title.created')}:{' '}
                          {formatDateTime(new Date(createdAt))}
                          <br />
                          {t('title.lastUpdated')}:{' '}
                          {formatDateTime(new Date(lastUpdatedAt))}
                        </>
                      ),
                      rightNode: (
                        <Tooltip title={t('button.deleteDraft')}>
                          <IconButton
                            Icon={Close}
                            onClick={(event) => {
                              // Don't click on item button.
                              event.stopPropagation()
                              deleteDraft(index)
                            }}
                            variant="ghost"
                          />
                        </Tooltip>
                      ),
                    })
                  )}
                  onSelect={(_, index) => loadDraft(index)}
                  searchPlaceholder={t('info.searchDraftPlaceholder')}
                  trigger={{
                    type: 'button',
                    props: {
                      variant: 'secondary',
                      children: t('button.loadDraft'),
                    },
                  }}
                />
              )}

              <Tooltip
                title={
                  proposalData.title
                    ? undefined
                    : t('info.enterNameBeforeSavingDraft')
                }
              >
                <Button
                  disabled={!proposalData.title}
                  onClick={saveDraft}
                  variant="secondary"
                >
                  {t('button.saveDraft')}
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

const FILTERABLE_KEYS: Fuse.FuseOptionKey<FilterableItem>[] = ['label']
