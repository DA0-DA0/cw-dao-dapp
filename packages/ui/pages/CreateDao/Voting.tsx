import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  ProposalModuleAdapter,
  getAdapterById as getProposalModuleAdapterById,
} from '@dao-dao/proposal-module-adapter'
import { NewDao } from '@dao-dao/tstypes'
import { getAdapterById as getVotingModuleAdapterById } from '@dao-dao/voting-module-adapter'

import {
  BreadcrumbsProps,
  DaoHeader,
  GradientHero,
  PageHeader,
} from '../../components'
import { DaoVotingConfigurationCard } from '../../components/dao/create/DaoVotingConfigurationCard'

export interface CreateDaoVotingProps {
  // Used to insert parent DAO crumbs if creating SubDAO.
  extraCrumbs?: BreadcrumbsProps['crumbs']
}

export const CreateDaoVoting = ({ extraCrumbs }: CreateDaoVotingProps) => {
  const { t } = useTranslation()

  const {
    formState: { errors },
    register,
    watch,
    setValue,
  } = useFormContext<NewDao>()

  const name = watch('name')
  const description = watch('description')
  const imageUrl = watch('imageUrl')
  const selectedStructureId = watch('votingModuleAdapter.id')
  const proposalModuleAdapters = watch('proposalModuleAdapters')

  // Get selected voting module adapter.
  const votingModuleDaoCreationAdapter = useMemo(
    () => getVotingModuleAdapterById(selectedStructureId)?.daoCreation,
    [selectedStructureId]
  )
  if (!votingModuleDaoCreationAdapter) {
    throw new Error(t('error.loadingData'))
  }

  // Get all proposal module adapters.
  const proposalModuleDaoCreationAdapters = useMemo(
    () =>
      proposalModuleAdapters
        .map(({ id }) => getProposalModuleAdapterById(id)?.daoCreation)
        // Remove undefined adapters.
        .filter(Boolean) as ProposalModuleAdapter['daoCreation'][],
    [proposalModuleAdapters]
  )

  return (
    // No container padding because we want the gradient to expand. Apply px-6
    // to children instead.
    <form className="flex flex-col items-stretch mx-auto max-w-6xl">
      <GradientHero childContainerClassName="px-6">
        <PageHeader
          breadcrumbs={{
            crumbs: [{ href: '/home', label: 'Home' }, ...(extraCrumbs ?? [])],
            current: name,
          }}
        />

        <DaoHeader
          description={description}
          established={t('info.today')}
          imageUrl={imageUrl}
          name={name}
        />
      </GradientHero>

      <div className="pb-6 mx-6 border-y border-t-border-base border-b-border-secondary">
        <p className="my-9 text-text-body title-text">
          {t('title.votingConfiguration')}
        </p>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {votingModuleDaoCreationAdapter.votingConfigurationItems.map(
            (
              { Icon, nameI18nKey, descriptionI18nKey, tooltipI18nKey, Input },
              index
            ) => (
              <DaoVotingConfigurationCard
                key={index}
                Icon={Icon}
                description={t(descriptionI18nKey)}
                input={
                  <Input
                    data={watch('votingModuleAdapter.data')}
                    errors={errors?.votingModuleAdapter?.data}
                    register={(fieldName, options) =>
                      register(
                        ('votingModuleAdapter.data.' +
                          fieldName) as `votingModuleAdapter.data.${string}`,
                        options
                      )
                    }
                    setValue={(fieldName, value, options) =>
                      setValue(
                        ('votingModuleAdapter.data.' +
                          fieldName) as `votingModuleAdapter.data.${string}`,
                        value,
                        options
                      )
                    }
                    watch={(fieldName) =>
                      watch(
                        ('votingModuleAdapter.data.' +
                          fieldName) as `votingModuleAdapter.data.${string}`
                      )
                    }
                  />
                }
                name={t(nameI18nKey)}
                tooltip={tooltipI18nKey && t(tooltipI18nKey)}
              />
            )
          )}
          {proposalModuleDaoCreationAdapters.flatMap(
            ({ votingConfigurationItems }, index) =>
              votingConfigurationItems.map(
                (
                  {
                    Icon,
                    nameI18nKey,
                    descriptionI18nKey,
                    tooltipI18nKey,
                    Input,
                  },
                  itemIndex
                ) => (
                  <DaoVotingConfigurationCard
                    key={`${index}:${itemIndex}`}
                    Icon={Icon}
                    description={t(descriptionI18nKey)}
                    input={
                      <Input
                        data={watch(`proposalModuleAdapters.${index}.data`)}
                        errors={errors?.proposalModuleAdapters?.[index]?.data}
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
                            options
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
                    tooltip={tooltipI18nKey && t(tooltipI18nKey)}
                  />
                )
              )
          )}
        </div>
      </div>
    </form>
  )
}
