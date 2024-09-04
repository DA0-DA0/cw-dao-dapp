import cloneDeep from 'lodash.clonedeep'
import { ComponentType } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ErrorPage,
  InputLabel,
  Loader,
  SegmentedControls,
} from '@dao-dao/stateless'
import {
  Action,
  ActionComponent,
  LoadingDataWithError,
  ProposalModuleInfo,
  SuspenseLoaderProps,
  TransProps,
} from '@dao-dao/types'

export type UpdatePreProposeConfigData = {
  proposalModuleAddress: string
  data: Record<string, unknown>
}

export type ProposalModuleWithAction = {
  proposalModule: ProposalModuleInfo
  action: Action
}

export type UpdatePreProposeConfigOptions = {
  options: LoadingDataWithError<ProposalModuleWithAction[]>
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
  Trans: ComponentType<TransProps>
}

export const UpdatePreProposeConfigComponent: ActionComponent<
  UpdatePreProposeConfigOptions
> = (props) => {
  const { t } = useTranslation()
  const {
    fieldNamePrefix,
    isCreating,
    options: { options, SuspenseLoader, Trans },
  } = props

  const { watch, setValue } = useFormContext<UpdatePreProposeConfigData>()

  const proposalModuleAddress = watch(
    (fieldNamePrefix + 'proposalModuleAddress') as 'proposalModuleAddress'
  )

  const selected =
    options.loading || options.errored
      ? undefined
      : options.data.find(
          ({ proposalModule }) =>
            proposalModule.address === proposalModuleAddress
        )

  return (
    <>
      <p className="secondary-text mb-2 max-w-prose">
        <Trans i18nKey="form.updateProposalSubmissionConfigDescription">
          This will update the proposal submission configuration for this DAO. A
          bad configuration can lock the DAO. Take care. If you have questions,
          please feel free to ask in the{' '}
          <a
            className="underline"
            href="https://discord.daodao.zone"
            rel="noreferrer"
            target="_blank"
          >
            DAO DAO Discord
          </a>
          .
        </Trans>
      </p>

      <InputLabel name={t('title.proposalType')} primary />

      {options.loading ? (
        <Loader fill={false} size={24} />
      ) : options.errored ? (
        <ErrorPage error={options.error} />
      ) : (
        <SegmentedControls
          className="w-max"
          disabled={!isCreating}
          onSelect={({ proposalModule, action }) => {
            setValue(
              (fieldNamePrefix +
                'proposalModuleAddress') as 'proposalModuleAddress',
              proposalModule.address
            )
            setValue(
              (fieldNamePrefix + 'data') as 'data',
              cloneDeep(action.defaults)
            )
          }}
          selected={selected}
          tabs={options.data.map((option) => ({
            label: option.action.metadata.label,
            value: option,
          }))}
        />
      )}

      <InputLabel name={t('title.config')} primary />

      <SuspenseLoader fallback={<Loader />}>
        {selected && (
          <selected.action.Component
            {...props}
            data={props.data?.data}
            errors={props.errors?.data}
            fieldNamePrefix={props.fieldNamePrefix + 'data.'}
          />
        )}
      </SuspenseLoader>
    </>
  )
}
