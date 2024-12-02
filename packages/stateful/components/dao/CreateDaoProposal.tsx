import cloneDeep from 'lodash.clonedeep'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import {
  useRecoilCallback,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from 'recoil'

import {
  latestProposalSaveAtom,
  proposalCreatedCardPropsAtom,
  proposalDraftsAtom,
  refreshProposalsIdAtom,
} from '@dao-dao/state'
import {
  CreateProposal,
  PageLoader,
  ProposalModuleSelector,
  useDao,
  useDaoNavHelpers,
  useUpdatingRef,
} from '@dao-dao/stateless'
import {
  BaseNewProposalProps,
  DaoTabId,
  IProposalModuleBase,
  ProposalDraft,
  ProposalPrefill,
} from '@dao-dao/types'
import {
  ContractName,
  DaoProposalSingleAdapterId,
  SITE_URL,
  decodeJsonFromBase64,
  objectMatchesStructure,
  transformIpfsUrlToHttpsIfNecessary,
  uploadJsonToIpfs,
} from '@dao-dao/utils'

import {
  ProposalModuleAdapterCommonProvider,
  matchAdapter as matchProposalModuleAdapter,
} from '../../proposal-module-adapter'
import { useProposalModuleAdapterCommonContext } from '../../proposal-module-adapter/react/context'
import { PageHeaderContent } from '../PageHeaderContent'
import { SuspenseLoader } from '../SuspenseLoader'
import { ProposalDaoInfoCards } from './ProposalDaoInfoCards'

export const CreateDaoProposal = () => {
  const dao = useDao()
  const [selectedProposalModule, setSelectedProposalModule] = useState(() => {
    // Ignore proposals with an approver pre-propose since those are
    // automatically managed by a pre-propose-approval contract in another DAO.
    const validProposalModules = dao.proposalModules.filter(
      ({ prePropose }) =>
        prePropose?.contractName !== ContractName.PreProposeApprover
    )

    // Default to single choice proposal module or first otherwise.
    return (
      validProposalModules.find(
        ({ contractName }) =>
          // Default to single choice proposal module.
          matchProposalModuleAdapter(contractName)?.id ===
          DaoProposalSingleAdapterId
      ) ?? validProposalModules[0]
    )
  })

  // Load saved proposal state once and then never re-render when it changes
  // again, to avoid infinite re-render loops due to periodic form saving.
  const [latestProposalSave, setLatestProposalSave] = useState<any>(undefined)
  const loadLatestProposalSave = useRecoilCallback(
    ({ snapshot }) =>
      async () =>
        setLatestProposalSave(
          await snapshot.getPromise(latestProposalSaveAtom(dao.coreAddress))
        ),
    [dao.coreAddress]
  )
  useEffect(() => {
    loadLatestProposalSave()
  }, [loadLatestProposalSave])

  return latestProposalSave ? (
    <ProposalModuleAdapterCommonProvider
      proposalModuleAddress={selectedProposalModule.address}
    >
      <InnerCreateDaoProposal
        latestProposalSave={latestProposalSave}
        selectedProposalModule={selectedProposalModule}
        setSelectedProposalModule={setSelectedProposalModule}
      />
    </ProposalModuleAdapterCommonProvider>
  ) : (
    <PageLoader />
  )
}

type InnerCreateDaoProposalProps = {
  selectedProposalModule: IProposalModuleBase
  setSelectedProposalModule: Dispatch<SetStateAction<IProposalModuleBase>>
  latestProposalSave: any
}

const InnerCreateDaoProposal = ({
  selectedProposalModule,
  setSelectedProposalModule,
  latestProposalSave,
}: InnerCreateDaoProposalProps) => {
  const { t } = useTranslation()
  const { goToDaoProposal, router, getDaoProposalPath } = useDaoNavHelpers()
  const dao = useDao()

  // Set once prefill has been assessed, indicating NewProposal can load now.
  const [prefillChecked, setPrefillChecked] = useState(false)

  const {
    id: proposalModuleAdapterCommonId,
    common: {
      fields: { makeDefaultNewProposalForm, newProposalFormTitleKey },
      components: { NewProposal },
    },
  } = useProposalModuleAdapterCommonContext()

  // Only set defaults once to prevent unnecessary useForm re-renders.
  const [firstProposalSave] = useState(() => ({
    ...makeDefaultNewProposalForm(),
    ...cloneDeep(latestProposalSave),
  }))

  const formMethods = useForm({
    mode: 'onChange',
    defaultValues: firstProposalSave,
  })
  const { getValues, reset } = formMethods

  const setLatestProposalSave = useSetRecoilState(
    latestProposalSaveAtom(dao.coreAddress)
  )

  // Reset form to defaults and clear latest proposal save.
  const clear = useCallback(() => {
    reset(makeDefaultNewProposalForm())
    setLatestProposalSave({})
  }, [reset, makeDefaultNewProposalForm, setLatestProposalSave])

  const setProposalCreatedCardProps = useSetRecoilState(
    proposalCreatedCardPropsAtom
  )

  const loadPrefill = useCallback(
    ({ id, data }: ProposalPrefill<any>) => {
      // Attempt to find proposal module to prefill and set if found.
      const matchingProposalModule = dao.proposalModules.find(
        ({ contractName }) =>
          matchProposalModuleAdapter(contractName)?.id === id
      )

      if (matchingProposalModule) {
        setSelectedProposalModule(matchingProposalModule)
        reset(data)
      }
    },
    [dao.proposalModules, reset, setSelectedProposalModule]
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
          id: {},
          data: {},
        })
      ) {
        loadPrefill(prefillData)
      }

      setPrefillChecked(true)
    }

    loadFromPrefill()
  }, [
    router.query.prefill,
    router.query.pi,
    router.isReady,
    prefillChecked,
    t,
    loadPrefill,
  ])

  const [drafts, setDrafts] = useRecoilState(
    proposalDraftsAtom(dao.coreAddress)
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
      loadPrefill(cloneDeep(draft.proposal))
      setDraftIndex(loadIndex)
    },
    [draftIndex, drafts, loadPrefill, t]
  )
  const deleteDraft = useCallback(
    (deleteIndex: number) => {
      setDrafts((drafts) => drafts.filter((_, index) => index !== deleteIndex))
      setDraftIndex(undefined)
    },
    [setDrafts]
  )
  const unloadDraft = useCallback(() => setDraftIndex(undefined), [])

  const saveDraft = useCallback(() => {
    // Already saving to a selected draft.
    if (draft) {
      return
    }

    const newDraft: ProposalDraft = {
      name: getValues(newProposalFormTitleKey),
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      proposal: {
        id: proposalModuleAdapterCommonId,
        data: getValues(),
      },
    }

    setDrafts((existing) => [newDraft, ...existing])
    setDraftIndex(0)
  }, [
    draft,
    getValues,
    proposalModuleAdapterCommonId,
    setDrafts,
    newProposalFormTitleKey,
  ])

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
                name: getValues(newProposalFormTitleKey),
                lastUpdatedAt: Date.now(),
                proposal: {
                  id: proposalModuleAdapterCommonId,
                  // Deep clone to prevent values from becoming readOnly.
                  data: cloneDeep(getValues()),
                },
              }
            : savedDraft
        )
      )
      setDraftSaving(false)
    }, 3000)
    // Debounce.
    return () => clearTimeout(timeout)
  }, [
    getValues,
    draftIndex,
    setDrafts,
    proposalModuleAdapterCommonId,
    newProposalFormTitleKey,
  ])

  const setRefreshProposalsId = useSetRecoilState(refreshProposalsIdAtom)
  const refreshProposals = useCallback(
    () => setRefreshProposalsId((id) => id + 1),
    [setRefreshProposalsId]
  )

  const onCreateSuccess: BaseNewProposalProps['onCreateSuccess'] = useCallback(
    (info) => {
      // Show modal.
      setProposalCreatedCardProps(info)

      // Delete draft.
      if (draftIndex !== undefined) {
        deleteDraft(draftIndex)
      }

      // Refresh proposals state.
      refreshProposals()

      // Clear saved form data.
      setLatestProposalSave({})

      // Navigate to proposal (underneath the creation modal).
      goToDaoProposal(info.dao.coreAddress, info.id)
    },
    [
      deleteDraft,
      draftIndex,
      goToDaoProposal,
      refreshProposals,
      setLatestProposalSave,
      setProposalCreatedCardProps,
    ]
  )

  const copyDraftLink = async () => {
    // Upload data to IPFS.
    const cid = await uploadJsonToIpfs({
      id: proposalModuleAdapterCommonId,
      data: getValues(),
    })
    // Copy link to clipboard.
    navigator.clipboard.writeText(
      SITE_URL +
        getDaoProposalPath(dao.coreAddress, 'create', {
          pi: cid,
        })
    )
    toast.success(t('info.copiedLinkToClipboard'))
  }

  return (
    <>
      <PageHeaderContent
        breadcrumbs={{
          homeTab: {
            id: DaoTabId.Proposals,
            sdaLabel: t('title.proposals'),
          },
          current: t('title.createProposal'),
          dao,
        }}
      />

      <FormProvider {...formMethods}>
        <CreateProposal
          clear={clear}
          copyDraftLink={copyDraftLink}
          newProposal={
            <SuspenseLoader
              fallback={<PageLoader />}
              forceFallback={!prefillChecked}
            >
              <NewProposal
                ProposalDaoInfoCards={ProposalDaoInfoCards}
                deleteDraft={deleteDraft}
                draft={draft}
                draftSaving={draftSaving}
                drafts={drafts}
                loadDraft={loadDraft}
                onCreateSuccess={onCreateSuccess}
                proposalModuleSelector={
                  <ProposalModuleSelector
                    className="my-2"
                    matchAdapter={matchProposalModuleAdapter}
                    selected={selectedProposalModule.address}
                    setSelected={(m) => {
                      // Clear instant vote if switching proposal modules.
                      if (m.address !== selectedProposalModule.address) {
                        formMethods.setValue('vote', undefined)
                      }

                      setSelectedProposalModule(m)
                    }}
                  />
                }
                saveDraft={saveDraft}
                unloadDraft={unloadDraft}
              />
            </SuspenseLoader>
          }
        />

        <FormSaver />
      </FormProvider>
    </>
  )
}

// Component responsible for listening to form changes and save it to local
// storage periodically.
const FormSaver = () => {
  const { watch, getValues } = useFormContext()
  const { coreAddress } = useDao()

  const proposalCreatedCardProps = useRecoilValue(proposalCreatedCardPropsAtom)
  const setLatestProposalSave = useSetRecoilState(
    latestProposalSaveAtom(coreAddress)
  )

  const saveQueuedRef = useRef(false)
  const saveLatestProposalRef = useUpdatingRef(() =>
    setLatestProposalSave(
      // If created proposal, clear latest proposal save.
      proposalCreatedCardProps ? {} : cloneDeep(getValues())
    )
  )

  const data = watch()

  // Save latest data to atom (and thus localStorage) every second.
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
  }, [proposalCreatedCardProps, saveLatestProposalRef, data])

  return null
}
