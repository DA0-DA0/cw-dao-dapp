import { FormProvider, SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { ProfileAddChains as StatelessProfileAddChains } from '@dao-dao/stateless'
import {
  ProfileAddChainsForm,
  StatefulProfileAddChainsProps,
} from '@dao-dao/types'
import { processError } from '@dao-dao/utils'

import { useManageProfile, useProfile } from '../../hooks'

export const ProfileAddChains = (props: StatefulProfileAddChainsProps) => {
  const { t } = useTranslation()

  const { chains } = useProfile()
  const {
    addChains,
    merge: { otherProfiles },
  } = useManageProfile()

  const form = useForm<ProfileAddChainsForm>({
    defaultValues: {
      chains: [],
    },
  })

  // Cannot add chains while profiles that need merging exist.
  if (otherProfiles.length > 0) {
    return null
  }

  const onAddChains: SubmitHandler<ProfileAddChainsForm> = async ({
    chains,
  }) => {
    const chainIds = chains.map(({ chainId }) => chainId)
    const chainIdToFormIndex = Object.fromEntries(
      chains.map(({ chainId }, index) => [chainId, index])
    )

    try {
      await addChains.go(chainIds, {
        setChainStatus: (chainId, status) => {
          const formIndex = chainIdToFormIndex[chainId]
          if (formIndex !== undefined) {
            form.setValue(`chains.${formIndex}.status`, status)
          }
        },
      })

      // On success...

      // Clear form.
      form.reset()

      // Show success toast.
      toast.success(t('success.addedChainsToProfile'))
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    }
  }

  return (
    <FormProvider {...form}>
      <StatelessProfileAddChains
        {...props}
        chains={chains}
        onAddChains={addChains.ready ? onAddChains : undefined}
        status={addChains.status}
      />
    </FormProvider>
  )
}