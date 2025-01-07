import cloneDeep from 'lodash.clonedeep'
import { useCallback, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRecoilState, useSetRecoilState } from 'recoil'
import useDeepCompareEffect from 'use-deep-compare-effect'

import {
  proposalCreatedCardPropsAtom,
  proposalDraftsAtom,
  refreshProposalsIdAtom,
} from '@dao-dao/state/recoil'
import {
  ActionCardLoader,
  ErrorPage,
  Loader,
  Modal,
  ProfileImage,
  ProfileNameDisplayAndEditor,
  StatusCard,
  useDao,
} from '@dao-dao/stateless'
import { BaseNewProposalProps, ProposalDraft } from '@dao-dao/types'
import { DaoProposalSingleAdapterId } from '@dao-dao/utils'

import { useProfile } from '../../../hooks'
import {
  ProposalModuleAdapterCommonProvider,
  matchAdapter as matchProposalModuleAdapter,
} from '../../../proposal-module-adapter'
import { NewProposalForm as NewSingleChoiceProposalForm } from '../../../proposal-module-adapter/adapters/DaoProposalSingle/types'
import { useProposalModuleAdapterCommonContext } from '../../../proposal-module-adapter/react/context'
import { AppsRenderer, AppsRendererExecutorProps } from '../../apps'
import { ConnectWallet } from '../../ConnectWallet'
import { SuspenseLoader } from '../../SuspenseLoader'
import { ProposalDaoInfoCards } from '../ProposalDaoInfoCards'

export const AppsTab = () => {
  const { t } = useTranslation()
  const dao = useDao()

  // Select the single choice proposal module to use for proposals.
  const singleChoiceProposalModule = dao.proposalModules.find(
    ({ contractName }) =>
      matchProposalModuleAdapter(contractName)?.id ===
      DaoProposalSingleAdapterId
  )

  return singleChoiceProposalModule ? (
    <ProposalModuleAdapterCommonProvider
      proposalModuleAddress={singleChoiceProposalModule.address}
    >
      <AppsRenderer Executor={AppsTabExecutor} mode="dao" />
    </ProposalModuleAdapterCommonProvider>
  ) : (
    <StatusCard
      content={t('error.noSingleChoiceProposalModuleAppsDisabled')}
      style="warning"
    />
  )
}

const AppsTabExecutor = ({ onClose, data }: AppsRendererExecutorProps) => {
  const { t } = useTranslation()
  const { coreAddress } = useDao()
  const { connected, profile } = useProfile()

  const {
    id: proposalModuleAdapterCommonId,
    common: {
      fields: { newProposalFormTitleKey },
      components: { NewProposal },
    },
  } = useProposalModuleAdapterCommonContext()

  const formMethods = useForm<NewSingleChoiceProposalForm>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      actionData: [],
    },
  })
  const proposalData = formMethods.watch()

  // If contents of matched action data finish loading or change, update form.
  useDeepCompareEffect(() => {
    if (data.loading || data.errored) {
      return
    }

    formMethods.reset({
      title: proposalData.title,
      description: proposalData.description,
      actionData: data.data,
    })
  }, [data])

  const setProposalCreatedCardProps = useSetRecoilState(
    proposalCreatedCardPropsAtom
  )

  const setRefreshProposalsId = useSetRecoilState(refreshProposalsIdAtom)
  const refreshProposals = useCallback(
    () => setRefreshProposalsId((id) => id + 1),
    [setRefreshProposalsId]
  )

  const [drafts, setDrafts] = useRecoilState(proposalDraftsAtom(coreAddress))
  const [draftIndex, setDraftIndex] = useState<number>()
  const draft =
    draftIndex !== undefined && drafts.length > draftIndex
      ? drafts[draftIndex]
      : undefined
  const deleteDraft = useCallback(
    (deleteIndex: number) => {
      setDrafts((drafts) => drafts.filter((_, index) => index !== deleteIndex))
      setDraftIndex(undefined)
    },
    [setDrafts]
  )
  const unloadDraft = () => setDraftIndex(undefined)

  const proposalName = formMethods.watch(newProposalFormTitleKey as any)
  const saveDraft = useCallback(() => {
    // Already saving to a selected draft.
    if (draft) {
      return
    }

    const newDraft: ProposalDraft = {
      name: proposalName,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      proposal: {
        id: proposalModuleAdapterCommonId,
        data: proposalData,
      },
    }

    setDrafts([newDraft, ...drafts])
    setDraftIndex(0)
  }, [
    draft,
    drafts,
    proposalData,
    proposalModuleAdapterCommonId,
    setDrafts,
    proposalName,
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
                name: proposalName,
                lastUpdatedAt: Date.now(),
                proposal: {
                  id: proposalModuleAdapterCommonId,
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
    proposalName,
    proposalModuleAdapterCommonId,
  ])

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

      // Close modal.
      onClose()
    },
    [
      deleteDraft,
      draftIndex,
      refreshProposals,
      setProposalCreatedCardProps,
      onClose,
    ]
  )

  return (
    <Modal
      backdropClassName="!z-[39]"
      containerClassName="sm:!max-w-[min(90dvw,64rem)] !w-full"
      footerContainerClassName="flex flex-row justify-end"
      footerContent={
        connected ? (
          <>
            <div className="flex min-w-0 flex-row items-center gap-2">
              {/* Image */}
              <ProfileImage
                imageUrl={profile.loading ? undefined : profile.data.imageUrl}
                loading={profile.loading}
                size="sm"
              />

              {/* Name */}
              <ProfileNameDisplayAndEditor profile={profile} />
            </div>
          </>
        ) : (
          <ConnectWallet size="md" />
        )
      }
      header={{
        title: t('title.createProposal'),
        subtitle: t('info.appsProposalDescription'),
      }}
      onClose={onClose}
      visible
    >
      {data.loading ? (
        <div className="flex flex-col gap-2">
          <ActionCardLoader />
          <ActionCardLoader />
          <ActionCardLoader />
        </div>
      ) : data.errored ? (
        <ErrorPage error={data.error} />
      ) : (
        <FormProvider {...formMethods}>
          <SuspenseLoader fallback={<Loader />}>
            <NewProposal
              ProposalDaoInfoCards={ProposalDaoInfoCards}
              actionsReadOnlyMode
              deleteDraft={deleteDraft}
              draft={draft}
              draftSaving={draftSaving}
              drafts={drafts}
              onCreateSuccess={onCreateSuccess}
              proposalModuleSelector={null}
              saveDraft={saveDraft}
              unloadDraft={unloadDraft}
            />
          </SuspenseLoader>
        </FormProvider>
      )}
    </Modal>
  )
}
