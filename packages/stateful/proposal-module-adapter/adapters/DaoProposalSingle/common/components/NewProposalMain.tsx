import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ActionsEditor,
  ActionsRenderer,
  ProposalExecutionMetadataEditor,
  ProposalExecutionMetadataRenderer,
  ProposalInstantVoter,
  useActionsContext,
} from '@dao-dao/stateless'
import { Feature } from '@dao-dao/types'
import { convertActionKeysAndDataToActions } from '@dao-dao/utils'

import { SuspenseLoader } from '../../../../../components'
import { useMembership } from '../../../../../hooks'
import { useProposalModuleAdapterCommonOptions } from '../../../../react/context'
import { useLoadingVoteOptions } from '../../hooks'
import { NewProposalForm } from '../../types'

export type NewProposalMainProps = {
  actionsReadOnlyMode?: boolean
}

export const NewProposalMain = ({
  actionsReadOnlyMode,
}: NewProposalMainProps) => {
  const { t } = useTranslation()
  const { actionMap } = useActionsContext()
  const { proposalModule } = useProposalModuleAdapterCommonOptions()
  const voteOptions = useLoadingVoteOptions()
  const { isMember = false } = useMembership()

  const {
    watch,
    formState: { errors },
  } = useFormContext<NewProposalForm>()

  const actionKeysAndData = watch('actionData') || []
  const metadata = watch('metadata')

  return (
    <div className="flex flex-col gap-8">
      {actionsReadOnlyMode ? (
        <>
          <div className="flex flex-col gap-4">
            <p className="title-text">{t('title.actions')}</p>

            <ActionsRenderer
              SuspenseLoader={SuspenseLoader}
              actionData={convertActionKeysAndDataToActions(
                actionMap,
                actionKeysAndData
              )}
            />
          </div>

          <ProposalExecutionMetadataRenderer metadata={metadata} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <p className="title-text">{t('title.actions')}</p>

            <ActionsEditor
              SuspenseLoader={SuspenseLoader}
              actionDataErrors={errors?.actionData}
              actionDataFieldName="actionData"
            />
          </div>

          <ProposalExecutionMetadataEditor errors={errors} />

          {isMember &&
            proposalModule.supports(Feature.CastVoteOnProposalCreation) &&
            // Single choice vote options are static and load immediately.
            !voteOptions.loading && (
              <ProposalInstantVoter
                fieldName="vote"
                isSelected={(option, vote) => option === vote}
                options={voteOptions.data}
              />
            )}
        </>
      )}
    </div>
  )
}
