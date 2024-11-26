import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  AddressInput,
  CodeMirrorInput,
  InputErrorMessage,
  InputLabel,
  NumericInput,
  StatusCard,
  useActionOptions,
  useChain,
} from '@dao-dao/stateless'
import { ActionComponent } from '@dao-dao/types/actions'
import {
  getChainAddressForActionOptions,
  makeValidateAddress,
  validateJSON,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { Trans } from '../../../../components/Trans'

export interface MigrateOptions {
  onContractChange: (s: string) => void
  contractAdmin: string | undefined
}

export const MigrateContractComponent: ActionComponent<MigrateOptions> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: { onContractChange, contractAdmin },
}) => {
  const { t } = useTranslation()
  const options = useActionOptions()
  const { chainId, bech32Prefix } = useChain()
  const { register, control } = useFormContext()

  const address = getChainAddressForActionOptions(options, chainId)

  return (
    <>
      <p className="secondary-text max-w-prose">
        <Trans i18nKey="form.migrateDescription">
          This will{' '}
          <a
            className="underline"
            href="https://docs.cosmwasm.com/docs/1.0/smart-contracts/migration/"
            rel="noreferrer"
            target="_blank"
          >
            migrate
          </a>{' '}
          the selected contract to a new code ID.
        </Trans>
      </p>

      <div className="flex flex-col items-stretch gap-2 xs:flex-row">
        <div className="flex grow flex-col gap-1">
          <InputLabel name={t('form.smartContractAddress')} />
          <AddressInput
            disabled={!isCreating}
            error={errors?.contract}
            fieldName={fieldNamePrefix + 'contract'}
            onChange={(v) => onContractChange(v.target.value)}
            register={register}
            validation={[validateRequired, makeValidateAddress(bech32Prefix)]}
          />
          <InputErrorMessage error={errors?.contract} />
        </div>
        <div className="flex flex-col gap-1">
          <InputLabel name={t('form.codeId')} />
          <NumericInput
            containerClassName="xs:h-full"
            disabled={!isCreating}
            error={errors?.codeId}
            fieldName={fieldNamePrefix + 'codeId'}
            min={1}
            numericValue
            register={register}
            sizing="fill"
            step={1}
            validation={[validateRequired, validatePositive]}
          />
          <InputErrorMessage error={errors?.codeId} />
        </div>
      </div>

      {isCreating &&
        !!address &&
        !!contractAdmin &&
        contractAdmin !== address && (
          <StatusCard
            content={t('info.daoNotAdminProposalNotExecutable')}
            style="warning"
          />
        )}

      <div className="flex flex-col gap-1">
        <InputLabel name={t('form.migrateMessage')} />
        <CodeMirrorInput
          control={control}
          error={errors?.msg}
          fieldName={fieldNamePrefix + 'msg'}
          readOnly={!isCreating}
          validation={[validateJSON]}
        />
        <InputErrorMessage error={errors?.msg} />
      </div>
    </>
  )
}
