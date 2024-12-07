import { ComponentType } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  MultipleChoiceProposalModule,
  SecretMultipleChoiceProposalModule,
} from '@dao-dao/state/clients'
import {
  InputErrorMessage,
  InputLabel,
  useActionOptions,
} from '@dao-dao/stateless'
import { AddressInputProps } from '@dao-dao/types'
import { ActionComponent, ActionContextType } from '@dao-dao/types/actions'
import { makeValidateAddress, validateRequired } from '@dao-dao/utils'

export type EnableApproverData = {
  approver: string
}

export type EnableApproverOptions = {
  AddressInput: ComponentType<AddressInputProps<EnableApproverData>>
}

export const EnableApproverComponent: ActionComponent<
  EnableApproverOptions
> = ({ isCreating, fieldNamePrefix, errors, options: { AddressInput } }) => {
  const { t } = useTranslation()
  const {
    context,
    chain: { bech32Prefix },
  } = useActionOptions()
  const { register } = useFormContext<EnableApproverData>()

  return (
    <>
      {context.type === ActionContextType.Dao &&
        context.dao.proposalModules.some(
          (m) =>
            m instanceof MultipleChoiceProposalModule ||
            m instanceof SecretMultipleChoiceProposalModule
        ) && (
          <p className="body-text text-text-interactive-error max-w-prose">
            {t('error.multipleChoiceApprovalNotYetSupported')}
          </p>
        )}

      <p className="body-text max-w-prose">
        {t('info.enableApproverExplanation')}
      </p>

      <div className="flex flex-col gap-1 max-w-prose">
        <InputLabel name={t('title.approver')} />
        <AddressInput
          disabled={!isCreating}
          error={errors?.approver}
          fieldName={(fieldNamePrefix + 'approver') as 'approver'}
          register={register}
          validation={[validateRequired, makeValidateAddress(bech32Prefix)]}
        />
        <InputErrorMessage error={errors?.approver} />
      </div>
    </>
  )
}
