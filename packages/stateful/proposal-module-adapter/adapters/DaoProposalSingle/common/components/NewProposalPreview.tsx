import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ProposalContentDisplay,
  ProposalExecutionMetadataRenderer,
  RawActionsRenderer,
} from '@dao-dao/stateless'
import { SingleChoiceNewProposalForm } from '@dao-dao/types'
import { descriptionWithPotentialProposalMetadata } from '@dao-dao/utils'

import { useActionEncodeContext } from '../../../../../actions'
import { EntityDisplay } from '../../../../../components'
import { useEntity, useWallet } from '../../../../../hooks'

export const NewProposalPreview = () => {
  const { t } = useTranslation()
  const { watch } = useFormContext<SingleChoiceNewProposalForm>()

  const { address: walletAddress = '' } = useWallet()
  const { entity } = useEntity(walletAddress)

  const encodeContext = useActionEncodeContext()

  const proposalDescription = watch('description')
  const proposalTitle = watch('title')

  const actionData = watch('actionData') || []
  const metadata = watch('metadata')

  return (
    <ProposalContentDisplay
      EntityDisplay={EntityDisplay}
      createdAt={new Date()}
      creator={{
        address: walletAddress,
        entity,
      }}
      description={descriptionWithPotentialProposalMetadata(
        proposalDescription,
        metadata
      )}
      innerContentDisplay={
        <div className="flex flex-col gap-6">
          {actionData.length ? (
            <RawActionsRenderer
              actionKeysAndData={actionData}
              encodeContext={encodeContext}
            />
          ) : (
            <p className="caption-text italic">{t('info.noProposalActions')}</p>
          )}

          {metadata?.enabled && (
            <ProposalExecutionMetadataRenderer metadata={metadata} />
          )}
        </div>
      }
      title={proposalTitle}
    />
  )
}
