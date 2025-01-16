import { WarningRounded } from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { CreateDaoContext } from '@dao-dao/types'

import { FormCheckbox } from '../../../inputs/Checkbox'
import { DaoCreateConfigInputCard } from '../DaoCreateConfigInputCard'

export const CreateDaoVoting = ({
  form: {
    formState: { errors },
    register,
    watch,
    setValue,
    getValues,
  },
  commonVotingConfig: {
    items: commonVotingConfigItems,
    advancedItems: commonVotingConfigAdvancedItems,
  },
  creator,
  proposalModuleDaoCreationAdapters,
  SuspenseLoader,
}: CreateDaoContext) => {
  const { t } = useTranslation()

  const newDao = watch()
  const {
    creator: { data: creatorData },
    proposalModuleAdapters,
    advancedVotingConfigEnabled,
    votingConfig,
  } = newDao

  // Combine all advanced warnings i18n keys into single array.
  const advancedWarningI18nKeys = useMemo(
    () => [
      // General warning.
      'info.advancedVotingConfigWarning',
      // Specific adapter warnings.
      ...(creator.votingConfig.advancedWarningI18nKeys ?? []),
      ...proposalModuleDaoCreationAdapters.flatMap(
        ({ extraVotingConfig: { advancedWarningI18nKeys = [] } = {} }) =>
          advancedWarningI18nKeys
      ),
    ],
    [
      proposalModuleDaoCreationAdapters,
      creator.votingConfig.advancedWarningI18nKeys,
    ]
  )

  const advancedConfigurationContainerRef = useRef<HTMLDivElement>(null)
  // When enabling advanced configuration, scroll to container.
  useEffect(() => {
    if (advancedVotingConfigEnabled) {
      advancedConfigurationContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }, [advancedVotingConfigEnabled])

  return (
    <>
      <div className="border-b border-b-border-secondary pb-6">
        <p className="header-text mt-4 mb-6 text-text-body md:my-8">
          {t('title.votingConfiguration')}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creator.votingConfig.items.map(
            (
              {
                onlyDisplayCondition,
                Icon,
                nameI18nKey,
                descriptionI18nKey,
                Input,
                getInputError,
              },
              index
            ) =>
              // If has display condition, check it. Otherwise display.
              (onlyDisplayCondition?.(newDao) ?? true) && (
                <DaoCreateConfigInputCard
                  key={index}
                  Icon={Icon}
                  SuspenseLoader={SuspenseLoader}
                  description={t(descriptionI18nKey)}
                  error={getInputError(errors.creator?.data)}
                  input={
                    <Input
                      data={creatorData}
                      errors={errors.creator?.data}
                      fieldNamePrefix="creator.data."
                      getValues={(
                        fieldNameOrNames?: string | readonly string[]
                      ) =>
                        fieldNameOrNames === undefined
                          ? getValues()
                          : typeof fieldNameOrNames === 'string'
                            ? getValues(
                                ('creator.data.' +
                                  fieldNameOrNames) as `creator.data.${string}`
                              )
                            : getValues(
                                fieldNameOrNames.map(
                                  (fieldName) =>
                                    ('creator.data.' +
                                      fieldName) as `creator.data.${string}`
                                )
                              )
                      }
                      newDao={newDao}
                      register={(fieldName, options) =>
                        register(
                          ('creator.data.' +
                            fieldName) as `creator.data.${string}`,
                          options
                        )
                      }
                      setValue={(fieldName, value, options) =>
                        setValue(
                          ('creator.data.' +
                            fieldName) as `creator.data.${string}`,
                          value,
                          {
                            // Validate by default.
                            shouldValidate: true,
                            ...options,
                          }
                        )
                      }
                      watch={(fieldName) =>
                        watch(
                          ('creator.data.' +
                            fieldName) as `creator.data.${string}`
                        )
                      }
                    />
                  }
                  name={t(nameI18nKey)}
                />
              )
          )}
          {proposalModuleDaoCreationAdapters.flatMap(
            ({ extraVotingConfig: { items = [] } = {} }, index) =>
              items.map(
                (
                  {
                    onlyDisplayCondition,
                    Icon,
                    nameI18nKey,
                    descriptionI18nKey,
                    Input,
                    getInputError,
                  },
                  itemIndex
                ) =>
                  // If has display condition, check it. Otherwise display.
                  (onlyDisplayCondition?.(newDao) ?? true) && (
                    <DaoCreateConfigInputCard
                      key={`${index}:${itemIndex}`}
                      Icon={Icon}
                      SuspenseLoader={SuspenseLoader}
                      description={t(descriptionI18nKey)}
                      error={getInputError(
                        errors.proposalModuleAdapters?.[index]?.data
                      )}
                      input={
                        <Input
                          data={proposalModuleAdapters[index].data}
                          errors={errors.proposalModuleAdapters?.[index]?.data}
                          fieldNamePrefix={`proposalModuleAdapters.${index}.data.`}
                          getValues={(
                            fieldNameOrNames?: string | readonly string[]
                          ) =>
                            fieldNameOrNames === undefined
                              ? getValues()
                              : typeof fieldNameOrNames === 'string'
                                ? getValues(
                                    (`proposalModuleAdapters.${index}.data.` +
                                      fieldNameOrNames) as `proposalModuleAdapters.${number}.data.${string}`
                                  )
                                : getValues(
                                    fieldNameOrNames.map(
                                      (fieldName) =>
                                        (`proposalModuleAdapters.${index}.data.` +
                                          fieldName) as `proposalModuleAdapters.${number}.data.${string}`
                                    )
                                  )
                          }
                          newDao={newDao}
                          register={(fieldName, options) =>
                            register(
                              (`proposalModuleAdapters.${index}.data.` +
                                fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                              options
                            )
                          }
                          setValue={(fieldName, value, options) =>
                            setValue(
                              (`proposalModuleAdapters.${index}.data.` +
                                fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                              value,
                              {
                                // Validate by default.
                                shouldValidate: true,
                                ...options,
                              }
                            )
                          }
                          watch={(fieldName) =>
                            watch(
                              (`proposalModuleAdapters.${index}.data.` +
                                fieldName) as `proposalModuleAdapters.${number}.data.${string}`
                            )
                          }
                        />
                      }
                      name={t(nameI18nKey)}
                    />
                  )
              )
          )}
          {commonVotingConfigItems.map(
            (
              {
                onlyDisplayCondition,
                Icon,
                nameI18nKey,
                descriptionI18nKey,
                Input,
                getInputError,
              },
              index
            ) =>
              // If has display condition, check it. Otherwise display.
              (onlyDisplayCondition?.(newDao) ?? true) && (
                <DaoCreateConfigInputCard
                  key={index}
                  Icon={Icon}
                  SuspenseLoader={SuspenseLoader}
                  description={t(descriptionI18nKey)}
                  error={getInputError(errors.votingConfig)}
                  input={
                    <Input
                      data={votingConfig}
                      errors={errors.votingConfig}
                      fieldNamePrefix="votingConfig."
                      getValues={(
                        fieldNameOrNames?: string | readonly string[]
                      ) =>
                        fieldNameOrNames === undefined
                          ? getValues()
                          : typeof fieldNameOrNames === 'string'
                            ? getValues(
                                ('votingConfig.' +
                                  fieldNameOrNames) as `votingConfig.${string}`
                              )
                            : getValues(
                                fieldNameOrNames.map(
                                  (fieldName) =>
                                    ('votingConfig.' +
                                      fieldName) as `votingConfig.${string}`
                                )
                              )
                      }
                      newDao={newDao}
                      register={(fieldName, options) =>
                        register(('votingConfig.' + fieldName) as any, options)
                      }
                      setValue={(fieldName, value, options) =>
                        setValue(('votingConfig.' + fieldName) as any, value, {
                          // Validate by default.
                          shouldValidate: true,
                          ...options,
                        })
                      }
                      watch={(fieldName) =>
                        watch(('votingConfig.' + fieldName) as any)
                      }
                    />
                  }
                  name={t(nameI18nKey)}
                />
              )
          )}
        </div>
      </div>

      <div ref={advancedConfigurationContainerRef}>
        <div className="mt-7 -mb-7 flex flex-row items-end justify-between">
          <p className="title-text text-text-body">
            {t('title.advancedConfiguration')}
          </p>

          <div className="flex flex-row items-center gap-4">
            <p
              className="body-text cursor-pointer"
              onClick={() =>
                setValue(
                  'advancedVotingConfigEnabled',
                  !advancedVotingConfigEnabled
                )
              }
            >
              {t('form.showAdvancedSettings')}
            </p>

            <FormCheckbox
              fieldName="advancedVotingConfigEnabled"
              setValue={setValue}
              value={advancedVotingConfigEnabled}
            />
          </div>
        </div>

        <div
          className={clsx(
            'mt-14 flex flex-col gap-4',
            !advancedVotingConfigEnabled && 'hidden'
          )}
        >
          {advancedWarningI18nKeys.length > 0 && (
            <div className="flex flex-col gap-4">
              {advancedWarningI18nKeys.map((advancedWarningI18nKey, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg bg-background-interactive-warning py-5 px-6"
                >
                  <div className="flex flex-row items-center gap-3">
                    <WarningRounded className="!h-6 !w-6 text-icon-interactive-warning" />
                    <p className="primary-text text-text-interactive-warning-title">
                      {t('title.watchOut')}
                    </p>
                  </div>

                  <p className="body-text text-text-interactive-warning-body">
                    {t(advancedWarningI18nKey)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creator.votingConfig.advancedItems?.map(
              (
                {
                  onlyDisplayCondition,
                  Icon,
                  nameI18nKey,
                  descriptionI18nKey,
                  Input,
                  getInputError,
                },
                index
              ) =>
                // If has display condition, check it. Otherwise display.
                (onlyDisplayCondition?.(newDao) ?? true) && (
                  <DaoCreateConfigInputCard
                    key={index}
                    Icon={Icon}
                    SuspenseLoader={SuspenseLoader}
                    description={t(descriptionI18nKey)}
                    error={getInputError(errors.creator?.data)}
                    input={
                      <Input
                        data={creatorData}
                        errors={errors.creator?.data}
                        fieldNamePrefix="creator.data."
                        getValues={(
                          fieldNameOrNames?: string | readonly string[]
                        ) =>
                          fieldNameOrNames === undefined
                            ? getValues()
                            : typeof fieldNameOrNames === 'string'
                              ? getValues(
                                  ('creator.data.' +
                                    fieldNameOrNames) as `creator.data.${string}`
                                )
                              : getValues(
                                  fieldNameOrNames.map(
                                    (fieldName) =>
                                      ('creator.data.' +
                                        fieldName) as `creator.data.${string}`
                                  )
                                )
                        }
                        newDao={newDao}
                        register={(fieldName, options) =>
                          register(
                            ('creator.data.' +
                              fieldName) as `creator.data.${string}`,
                            options
                          )
                        }
                        setValue={(fieldName, value, options) =>
                          setValue(
                            ('creator.data.' +
                              fieldName) as `creator.data.${string}`,
                            value,
                            {
                              // Validate by default.
                              shouldValidate: true,
                              ...options,
                            }
                          )
                        }
                        watch={(fieldName) =>
                          watch(
                            ('creator.data.' +
                              fieldName) as `creator.data.${string}`
                          )
                        }
                      />
                    }
                    name={t(nameI18nKey)}
                  />
                )
            )}
            {proposalModuleDaoCreationAdapters.flatMap(
              ({ extraVotingConfig: { advancedItems = [] } = {} }, index) =>
                advancedItems.map(
                  (
                    {
                      onlyDisplayCondition,
                      Icon,
                      nameI18nKey,
                      descriptionI18nKey,
                      Input,
                      getInputError,
                    },
                    itemIndex
                  ) =>
                    // If has display condition, check it. Otherwise display.
                    (onlyDisplayCondition?.(newDao) ?? true) && (
                      <DaoCreateConfigInputCard
                        key={`${index}:${itemIndex}`}
                        Icon={Icon}
                        SuspenseLoader={SuspenseLoader}
                        description={t(descriptionI18nKey)}
                        error={getInputError(
                          errors.proposalModuleAdapters?.[index]?.data
                        )}
                        input={
                          <Input
                            data={proposalModuleAdapters[index].data}
                            errors={
                              errors.proposalModuleAdapters?.[index]?.data
                            }
                            fieldNamePrefix={`proposalModuleAdapters.${index}.data.`}
                            getValues={(
                              fieldNameOrNames?: string | readonly string[]
                            ) =>
                              fieldNameOrNames === undefined
                                ? getValues()
                                : typeof fieldNameOrNames === 'string'
                                  ? getValues(
                                      (`proposalModuleAdapters.${index}.data.` +
                                        fieldNameOrNames) as `proposalModuleAdapters.${number}.data.${string}`
                                    )
                                  : getValues(
                                      fieldNameOrNames.map(
                                        (fieldName) =>
                                          (`proposalModuleAdapters.${index}.data.` +
                                            fieldName) as `proposalModuleAdapters.${number}.data.${string}`
                                      )
                                    )
                            }
                            newDao={newDao}
                            register={(fieldName, options) =>
                              register(
                                (`proposalModuleAdapters.${index}.data.` +
                                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                                options
                              )
                            }
                            setValue={(fieldName, value, options) =>
                              setValue(
                                (`proposalModuleAdapters.${index}.data.` +
                                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                                value,
                                {
                                  // Validate by default.
                                  shouldValidate: true,
                                  ...options,
                                }
                              )
                            }
                            watch={(fieldName) =>
                              watch(
                                (`proposalModuleAdapters.${index}.data.` +
                                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`
                              )
                            }
                          />
                        }
                        name={t(nameI18nKey)}
                      />
                    )
                )
            )}
            {commonVotingConfigAdvancedItems.map(
              (
                {
                  onlyDisplayCondition,
                  Icon,
                  nameI18nKey,
                  descriptionI18nKey,
                  Input,
                  getInputError,
                },
                index
              ) =>
                // If has display condition, check it. Otherwise display.
                (onlyDisplayCondition?.(newDao) ?? true) && (
                  <DaoCreateConfigInputCard
                    key={index}
                    Icon={Icon}
                    SuspenseLoader={SuspenseLoader}
                    description={t(descriptionI18nKey)}
                    error={getInputError(errors.votingConfig)}
                    input={
                      <Input
                        data={votingConfig}
                        errors={errors.votingConfig}
                        fieldNamePrefix="votingConfig."
                        getValues={(
                          fieldNameOrNames?: string | readonly string[]
                        ) =>
                          fieldNameOrNames === undefined
                            ? getValues()
                            : typeof fieldNameOrNames === 'string'
                              ? getValues(
                                  ('votingConfig.' +
                                    fieldNameOrNames) as `votingConfig.${string}`
                                )
                              : getValues(
                                  fieldNameOrNames.map(
                                    (fieldName) =>
                                      ('votingConfig.' +
                                        fieldName) as `votingConfig.${string}`
                                  )
                                )
                        }
                        newDao={newDao}
                        register={(fieldName, options) =>
                          register(
                            ('votingConfig.' + fieldName) as any,
                            options
                          )
                        }
                        setValue={(fieldName, value, options) =>
                          setValue(
                            ('votingConfig.' + fieldName) as any,
                            value,
                            {
                              // Validate by default.
                              shouldValidate: true,
                              ...options,
                            }
                          )
                        }
                        watch={(fieldName) =>
                          watch(('votingConfig.' + fieldName) as any)
                        }
                      />
                    }
                    name={t(nameI18nKey)}
                  />
                )
            )}
          </div>
        </div>
      </div>
    </>
  )
}
