import { Add, Remove } from '@mui/icons-material'
import clsx from 'clsx'
import { FieldErrors, useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Button,
  ButtonLink,
  CodeMirrorInput,
  FormSwitch,
  IconButton,
  InputErrorMessage,
  InputLabel,
  TextInput,
  Tooltip,
  useChain,
} from '@dao-dao/stateless'
import { ChainId, ProposalExecutionMetadataEditorData } from '@dao-dao/types'
import { validateJSON, validateRequired } from '@dao-dao/utils'

export type ProposalExecutionMetadataEditorProps = {
  /**
   * Field errors for the form fields.
   */
  errors?: FieldErrors<ProposalExecutionMetadataEditorData>
  /**
   * Field name prefix for the form fields, if the `metadata` field is nested
   * within another field.
   */
  fieldNamePrefix?: string
  /**
   * Optional container class name.
   */
  className?: string
}

/**
 * A form for editing proposal execution metadata. It expects to be within a
 * form context whose data has a `metadata` field with type
 * `ProposalExecutionMetadata`.
 */
export const ProposalExecutionMetadataEditor = ({
  errors,
  fieldNamePrefix = '',
  className,
}: ProposalExecutionMetadataEditorProps) => {
  const { t } = useTranslation()
  const { chainId } = useChain()

  const { watch, register, control, setValue, clearErrors } =
    useFormContext<ProposalExecutionMetadataEditorData>()

  const metadataFieldName = (fieldNamePrefix + 'metadata') as 'metadata'

  const metadataEnabled = watch(`${metadataFieldName}.enabled`)

  const {
    fields: gaiaMetaprotocolsExtensionDataFields,
    append: appendGaiaMetaprotocolsExtensionData,
    remove: removeGaiaMetaprotocolsExtensionData,
  } = useFieldArray({
    control,
    name: `${metadataFieldName}.gaiaMetaprotocolsExtensionData`,
  })

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <div className="flex flex-row gap-3 items-center">
        <FormSwitch
          fieldName={`${metadataFieldName}.enabled`}
          setValue={setValue}
          sizing="md"
          value={metadataEnabled}
        />

        <InputLabel
          name={t('title.executionMetadata')}
          onClick={() =>
            setValue(`${metadataFieldName}.enabled`, !metadataEnabled)
          }
          title
        />
      </div>

      {metadataEnabled && (
        <div className="rounded-lg bg-background-tertiary animate-fade-in">
          <div className="flex flex-col gap-2 py-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <InputLabel
              className="text-text-body"
              name={t('title.memo')}
              primary
              tooltip={t('info.proposalExecutionMemoTooltip')}
            />
            <TextInput
              fieldName={`${metadataFieldName}.memo`}
              register={register}
            />
          </div>

          {/* Gaia Metaprotocols Extension Data only supported on Cosmos Hub */}
          {(chainId === ChainId.CosmosHubMainnet ||
            chainId === ChainId.CosmosHubProviderTestnet) && (
            <div
              className={clsx(
                'flex flex-col gap-4 px-6 pt-4 sm:gap-4 border-t border-border-secondary',
                gaiaMetaprotocolsExtensionDataFields.length > 0
                  ? 'pb-6'
                  : 'pb-4'
              )}
            >
              <div className="flex flex-row flex-wrap gap-x-8 gap-y-4 justify-between items-center">
                <InputLabel
                  className="text-text-body"
                  name={t('title.metaprotocolExtensionData')}
                  primary
                  tooltip={
                    <>
                      See the{' '}
                      <ButtonLink
                        containerClassName="inline-block"
                        href="https://hub.cosmos.network/main/modules/metaprotocols"
                        variant="underline"
                      >
                        Cosmos Network docs
                      </ButtonLink>{' '}
                      for more information.
                    </>
                  }
                />

                <Button
                  onClick={() => appendGaiaMetaprotocolsExtensionData({})}
                  variant="secondary"
                >
                  <Add className="!h-5 !w-5" />
                  {t('button.addEntry')}
                </Button>
              </div>

              {gaiaMetaprotocolsExtensionDataFields.map(({ id }, index) => (
                <div key={id} className="flex flex-row gap-4 items-start">
                  <Tooltip title={t('button.remove')}>
                    <IconButton
                      Icon={Remove}
                      circular
                      onClick={() => {
                        removeGaiaMetaprotocolsExtensionData(index)
                        clearErrors(
                          `${metadataFieldName}.gaiaMetaprotocolsExtensionData.${index}`
                        )
                      }}
                      size="sm"
                      variant="secondary"
                    />
                  </Tooltip>

                  <div className="grow flex flex-col gap-4 rounded-md p-4 bg-background-tertiary">
                    <div className="space-y-1">
                      <InputLabel name={t('form.protocolId')} />
                      <TextInput
                        fieldName={`${metadataFieldName}.gaiaMetaprotocolsExtensionData.${index}.protocolId`}
                        register={register}
                        validation={[validateRequired]}
                      />
                      <InputErrorMessage
                        error={
                          errors?.metadata?.gaiaMetaprotocolsExtensionData?.[
                            index
                          ]?.protocolId
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <InputLabel name={t('form.protocolVersion')} />
                      <TextInput
                        fieldName={`${metadataFieldName}.gaiaMetaprotocolsExtensionData.${index}.protocolVersion`}
                        register={register}
                        validation={[validateRequired]}
                      />
                      <InputErrorMessage
                        error={
                          errors?.metadata?.gaiaMetaprotocolsExtensionData?.[
                            index
                          ]?.protocolVersion
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <InputLabel name={t('form.data')} />
                      <CodeMirrorInput
                        control={control}
                        error={
                          errors?.metadata?.gaiaMetaprotocolsExtensionData?.[
                            index
                          ]?.data
                        }
                        fieldName={`${metadataFieldName}.gaiaMetaprotocolsExtensionData.${index}.data`}
                        validation={[validateJSON]}
                      />
                      <InputErrorMessage
                        error={
                          errors?.metadata?.gaiaMetaprotocolsExtensionData?.[
                            index
                          ]?.data
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
