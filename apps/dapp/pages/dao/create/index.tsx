import Emoji from 'a11y-react-emoji'
import { FC, useCallback } from 'react'

import i18n from '@dao-dao/i18n'
import {
  ImageSelector,
  InputErrorMessage,
  InputLabel,
  TextAreaInput,
  TextInput,
} from '@dao-dao/ui'
import { validateRequired } from '@dao-dao/utils'

import {
  DEFAULT_NEW_DAO_GOV_TOKEN_INITIAL_TIER_WEIGHT,
  DEFAULT_NEW_DAO_SIMPLE_INITIAL_TIER_WEIGHT,
  DefaultNewDAO,
  NewDAOStructure,
} from '@/atoms'
import {
  CreateDAOFormWrapper,
  CreateDAOStructure,
  SmallScreenNav,
} from '@/components'
import { useCreateDAOForm } from '@/hooks'

const CreateDAOPage: FC = () => {
  const { register, watch, errors, watchedNewDAO, setValue, formWrapperProps } =
    useCreateDAOForm(0)

  const onStructureChange = useCallback(
    (structure: NewDAOStructure) => {
      setValue('structure', structure)

      // Swap initial tier voting power to the default for the structure
      // if the tiers have not yet been changed.
      if (
        watchedNewDAO.tiers.length === 1 &&
        watchedNewDAO.tiers[0].name === DefaultNewDAO.tiers[0].name &&
        watchedNewDAO.tiers[0].members.length === 1 &&
        watchedNewDAO.tiers[0].members[0].address === ''
      ) {
        setValue(
          'tiers.0.weight',
          structure === NewDAOStructure.GovernanceToken
            ? DEFAULT_NEW_DAO_GOV_TOKEN_INITIAL_TIER_WEIGHT
            : DEFAULT_NEW_DAO_SIMPLE_INITIAL_TIER_WEIGHT
        )
      }
    },
    [setValue, watchedNewDAO]
  )

  return (
    <>
      <SmallScreenNav />

      <CreateDAOFormWrapper {...formWrapperProps}>
        <div className="flex relative flex-row gap-8 items-stretch p-8 bg-disabled rounded-lg">
          <div className="flex flex-col gap-4 justify-center">
            <ImageSelector
              className="!bg-card !border-0"
              error={errors.imageUrl}
              label="imageUrl"
              register={register}
              watch={watch}
            />

            <p className="text-disabled">{i18n.t('Add an image')}</p>
          </div>

          <div className="flex flex-col flex-1 gap-2">
            <div className="space-y-1">
              <InputLabel name={i18n.t('DAO Name')} />
              <TextInput
                error={errors.name}
                label="name"
                register={register}
                validation={[validateRequired]}
              />
              <InputErrorMessage error={errors.name} />
            </div>

            <div className="space-y-1">
              <InputLabel name={i18n.t('DAO Description')} />
              <TextAreaInput
                error={errors.description}
                label="description"
                register={register}
                rows={4}
              />
              <InputErrorMessage error={errors.description} />
            </div>
          </div>
        </div>

        <p className="mt-6 mb-4 primary-text">{i18n.t('Choose a structure')}</p>

        <div className="flex flex-col gap-4 items-stretch sm:flex-row md:flex-col xl:flex-row">
          <CreateDAOStructure
            description={i18n.t('Membership-based DAO description')}
            emoji={<Emoji className="text-5xl" label="Handshake" symbol="🤝" />}
            newDAO={watchedNewDAO}
            onChange={onStructureChange}
            structure={NewDAOStructure.Membership}
            title={i18n.t('Membership-based DAO')}
          />

          <CreateDAOStructure
            description={i18n.t('Governance Token-based DAO description')}
            emoji={<Emoji className="text-5xl" label="Yin yang" symbol="☯️" />}
            newDAO={watchedNewDAO}
            onChange={onStructureChange}
            structure={NewDAOStructure.GovernanceToken}
            title={i18n.t('Governance Token-based DAO')}
          />
        </div>
      </CreateDAOFormWrapper>
    </>
  )
}

export default CreateDAOPage
