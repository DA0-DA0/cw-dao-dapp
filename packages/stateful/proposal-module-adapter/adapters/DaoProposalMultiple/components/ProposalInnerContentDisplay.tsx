import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Loader } from '@dao-dao/stateless'
import {
  ActionKeyAndData,
  BaseProposalInnerContentDisplayProps,
  MultipleChoiceNewProposalForm,
  ProposalStatusEnum,
  ProposalVoteOption,
} from '@dao-dao/types'
import {
  MultipleChoiceProposal,
  MultipleChoiceVote,
} from '@dao-dao/types/contracts/DaoProposalMultiple'
import {
  extractProposalDescriptionAndMetadata,
  getProposalStatusKey,
} from '@dao-dao/utils'

import { SuspenseLoader } from '../../../../components'
import {
  useLoadingProposal,
  useLoadingVoteOptions,
  useLoadingVotesInfo,
} from '../hooks'
import { MultipleChoiceOptionData, VotesInfo } from '../types'
import { MultipleChoiceOptionViewer } from './MultipleChoiceOptionViewer'

export const ProposalInnerContentDisplay = (
  props: BaseProposalInnerContentDisplayProps<MultipleChoiceNewProposalForm>
) => {
  const { t } = useTranslation()
  const loadingProposal = useLoadingProposal()
  const loadingVoteOptions = useLoadingVoteOptions()
  const loadingVotesInfo = useLoadingVotesInfo()

  return (
    <SuspenseLoader
      fallback={
        <div className="flex flex-row items-center gap-4">
          <p className="title-text">{t('title.voteOptions')}</p>
          <Loader fill={false} size={22} />
        </div>
      }
      forceFallback={
        loadingProposal.loading ||
        loadingVoteOptions.loading ||
        loadingVotesInfo.loading
      }
    >
      {!loadingProposal.loading &&
        !loadingVoteOptions.loading &&
        !loadingVotesInfo.loading && (
          <InnerProposalInnerContentDisplay
            {...props}
            proposal={loadingProposal.data}
            voteOptions={loadingVoteOptions.data}
            votesInfo={loadingVotesInfo.data}
          />
        )}
    </SuspenseLoader>
  )
}

export const InnerProposalInnerContentDisplay = ({
  setDuplicateFormData,
  proposal,
  voteOptions,
  votesInfo: { winningChoice },
}: BaseProposalInnerContentDisplayProps<MultipleChoiceNewProposalForm> & {
  proposal: MultipleChoiceProposal
  voteOptions: ProposalVoteOption<MultipleChoiceVote>[]
  votesInfo: VotesInfo
}) => {
  const { t } = useTranslation()

  const statusKey = getProposalStatusKey(proposal.status)

  // Map action data to each proposal choice.
  const optionsData = proposal.choices.map(
    (choice, index): MultipleChoiceOptionData => {
      const voteOption = voteOptions[index]

      return {
        choice,
        voteOption,
      }
    }
  )

  // Load data for each choice until they're all ready.
  const [loadedData, setLoadedData] = useState<
    Record<number, ActionKeyAndData[]>
  >({})

  useEffect(() => {
    if (!setDuplicateFormData) {
      return
    }

    // Remove 'none' choice.
    const choices = proposal.choices.filter(
      ({ option_type }) => option_type !== 'none'
    )

    // Wait until all data is loaded.
    const allLoaded = choices.every(
      ({ msgs, index }) => msgs.length === 0 || loadedData[index]
    )
    if (!allLoaded) {
      return
    }

    setDuplicateFormData({
      title: proposal.title,
      description: proposal.description,
      choices: choices.map(({ title, description: _description, index }) => {
        const { description, metadata } =
          extractProposalDescriptionAndMetadata(_description)

        return {
          title,
          description,
          actionData: loadedData[index] || [],
          metadata: metadata && {
            enabled: true,
            ...metadata,
          },
        }
      }),
    })
  }, [
    setDuplicateFormData,
    loadedData,
    proposal.title,
    proposal.description,
    proposal.choices,
  ])

  return (
    <div>
      <p className="title-text mb-2">{t('title.voteOptions')}</p>

      {optionsData.map((data, index) => (
        <MultipleChoiceOptionViewer
          key={index}
          SuspenseLoader={SuspenseLoader}
          data={data}
          lastOption={index === optionsData.length - 1}
          onLoad={
            setDuplicateFormData &&
            data.choice.option_type !== 'none' &&
            data.choice.msgs.length > 0
              ? (loadedData) =>
                  setLoadedData((d) => ({
                    ...d,
                    [data.choice.index]: loadedData,
                  }))
              : undefined
          }
          winner={
            (statusKey === ProposalStatusEnum.Passed ||
              statusKey === ProposalStatusEnum.Executed ||
              statusKey === ProposalStatusEnum.ExecutionFailed ||
              statusKey === 'veto_timelock' ||
              statusKey === ProposalStatusEnum.NeutronTimelocked) &&
            winningChoice
              ? winningChoice.index === data.choice.index
              : undefined
          }
        />
      ))}
    </div>
  )
}
