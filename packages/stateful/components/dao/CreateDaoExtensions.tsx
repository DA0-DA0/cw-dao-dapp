import { Add } from '@mui/icons-material'
import clsx from 'clsx'
import cloneDeep from 'lodash.clonedeep'
import { useMemo } from 'react'
import { FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { CreatingDaoPlaceholder } from '@dao-dao/state/clients/dao/CreatingDaoPlaceholder'
import {
  DaoContext,
  IconButton,
  Loader,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import { CreateDaoContext } from '@dao-dao/types'
import { getFallbackImage } from '@dao-dao/utils'

export const CreateDaoExtensions = (context: CreateDaoContext) => {
  const { t } = useTranslation()
  const {
    chainId,
    config: { latestVersion },
  } = useSupportedChainContext()

  const {
    availableWidgets,
    predictedDaoAddress,
    form: {
      setValue,
      watch,
      clearErrors,
      formState: { errors },
    },
  } = context

  const existingWidgets = watch('widgets') || {}

  const name = watch('name')
  const description = watch('description')
  const imageUrl = watch('imageUrl')

  const dao = useMemo(
    () =>
      predictedDaoAddress.loading || predictedDaoAddress.errored
        ? undefined
        : new CreatingDaoPlaceholder({
            chainId,
            coreAddress: predictedDaoAddress.data,
            coreVersion: latestVersion,
            name,
            description,
            imageUrl: imageUrl || getFallbackImage('placeholderDaoAddress'),
          }),
    [chainId, latestVersion, description, imageUrl, name, predictedDaoAddress]
  )

  return (
    <>
      <p className="header-text text-text-body mt-4 mb-2 md:mt-8">
        {t('title.extensions')}
      </p>
      <p className="body-text text-text-secondary mb-8">
        {t('info.extensionsDescription')}
      </p>

      <div className="flex flex-col gap-3">
        {availableWidgets.map(({ id, defaultValues, Editor }) => {
          const added = !!existingWidgets[id]

          return (
            <div
              key={id}
              className={clsx(
                'bg-background-tertiary flex flex-col gap-5 px-7 py-5 rounded-md ring-1 transition-all',
                added ? 'ring-border-interactive-active' : 'ring-transparent'
              )}
            >
              <div className="flex flex-row gap-3 items-center">
                <IconButton
                  Icon={Add}
                  circular
                  className="-ml-3"
                  iconClassName={clsx(
                    'transition-[transform]',
                    added ? 'rotate-45' : 'rotate-0'
                  )}
                  onClick={() => {
                    if (added) {
                      // Remove.

                      setValue(`widgets.${id}`, null)
                      // Clear errors to ensure form isn't blocked by fields
                      // that no longer exist.
                      clearErrors(`widgets.${id}`)
                    } else {
                      // Add.

                      // Clone so we don't mutate the default values object.
                      setValue(`widgets.${id}`, cloneDeep(defaultValues || {}))
                    }
                  }}
                  variant="ghost"
                />

                <div className="flex flex-col gap-1">
                  <p className="title-text text-lg">{t(`widgetTitle.${id}`)}</p>
                  <p className="secondary-text">
                    {t(`widgetDescription.${id}`)}
                  </p>
                </div>
              </div>

              {added &&
                Editor &&
                (dao ? (
                  <div className="pt-4 animate-fade-in border-t border-border-secondary -mx-7 px-7">
                    <DaoContext.Provider
                      value={{
                        dao,
                      }}
                    >
                      <Editor
                        accounts={dao.accounts}
                        errors={errors.widgets?.[id] as FieldErrors}
                        fieldNamePrefix={`widgets.${id}.`}
                        isCreating
                        type="daoCreation"
                      />
                    </DaoContext.Provider>
                  </div>
                ) : (
                  // If DAO undefined, predicted DAO address is still loading.
                  <Loader />
                ))}
            </div>
          )
        })}
      </div>
    </>
  )
}
