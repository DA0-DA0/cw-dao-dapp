import { Block, Circle } from '@mui/icons-material'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ProposalContentDisplay } from '@dao-dao/stateless'
import { MultipleChoiceNewProposalForm } from '@dao-dao/types'
import { descriptionWithPotentialProposalMetadata } from '@dao-dao/utils'

import { useActionEncodeContext } from '../../../../../actions'
import { EntityDisplay, SuspenseLoader } from '../../../../../components'
import { useEntity, useWallet } from '../../../../../hooks'
import { MULTIPLE_CHOICE_OPTION_COLORS } from '../../components/MultipleChoiceOptionEditor'
import { MultipleChoiceOptionViewer } from '../../components/MultipleChoiceOptionViewer'

export const NewProposalPreview = () => {
  const { t } = useTranslation()
  const { watch } = useFormContext<MultipleChoiceNewProposalForm>()
  const encodeContext = useActionEncodeContext()

  const { address: walletAddress = '' } = useWallet()
  const { entity } = useEntity(walletAddress)

  const proposalDescription = watch('description')
  const proposalTitle = watch('title')
  const choices = watch('choices') ?? []

  return (
    <ProposalContentDisplay
      EntityDisplay={EntityDisplay}
      createdAt={new Date()}
      creator={{
        address: walletAddress,
        entity,
      }}
      description={proposalDescription}
      innerContentDisplay={
        <div>
          <p className="title-text mb-2">{t('title.voteOptions')}</p>

          {choices.map(
            ({ title, description, metadata, actionData }, index) => (
              <MultipleChoiceOptionViewer
                key={index}
                SuspenseLoader={SuspenseLoader}
                actionKeysAndData={actionData}
                data={{
                  choice: {
                    description: descriptionWithPotentialProposalMetadata(
                      description,
                      metadata
                    ),
                    index,
                    // Unused in preview mode. Uses actionKeysAndData instead.
                    msgs: [],
                    title,
                    option_type: 'standard',
                    vote_count: '0',
                  },
                  voteOption: {
                    Icon: Circle,
                    label: title,
                    value: { option_id: index },
                    color:
                      MULTIPLE_CHOICE_OPTION_COLORS[
                        index % MULTIPLE_CHOICE_OPTION_COLORS.length
                      ],
                  },
                }}
                encodeContext={encodeContext}
                lastOption={false}
                preview
              />
            )
          )}

          {/* None of the above */}
          <MultipleChoiceOptionViewer
            SuspenseLoader={SuspenseLoader}
            actionKeysAndData={[]}
            data={{
              choice: {
                description: '',
                index: choices.length,
                // Unused in preview mode. Uses actionKeysAndData instead.
                msgs: [],
                title: '',
                option_type: 'none',
                vote_count: '0',
              },
              voteOption: {
                Icon: Block,
                label: '',
                value: { option_id: choices.length },
              },
            }}
            encodeContext={encodeContext}
            lastOption
            preview
          />
        </div>
      }
      title={proposalTitle}
    />
  )
}
