import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { ActionComponent, ActionContextType, ActionKey } from '@dao-dao/types'
import {
  CHAIN_GAS_MULTIPLIER,
  CODE_ID_CONFIG,
  processError,
} from '@dao-dao/utils'

import { AddressInput } from '../../../../components'
import { useWallet } from '../../../../hooks'
import { useActionOptions } from '../../../react'
import { InstantiateNftCollection as StatelessInstantiateNftCollection } from './stateless/InstantiateNftCollection'

export const InstantiateNftCollection: ActionComponent = (props) => {
  const { t } = useTranslation()
  const { address: walletAddress, getSigningCosmWasmClient } = useWallet()
  const { watch, setValue } = useFormContext()
  const { context } = useActionOptions()

  const [instantiating, setInstantiating] = useState(false)

  const instantiateMsg = watch(props.fieldNamePrefix + 'instantiateMsg')

  const onInstantiate = async () => {
    if (!instantiateMsg) {
      toast.error(t('error.loadingData'))
      return
    }

    if (!walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    const signingCosmWasmClient = await getSigningCosmWasmClient()

    setInstantiating(true)
    try {
      const { contractAddress } = await signingCosmWasmClient.instantiate(
        walletAddress,
        CODE_ID_CONFIG.Cw721Base,
        instantiateMsg,
        'NFT Collection',
        CHAIN_GAS_MULTIPLIER
      )

      // Update action form data with address.
      setValue(props.fieldNamePrefix + 'collectionAddress', contractAddress, {
        shouldValidate: true,
      })
      // Indicate that contract is ready.
      setValue(props.fieldNamePrefix + 'contractChosen', true, {
        shouldValidate: true,
      })
      // Display success.
      toast.success(t('success.nftCollectionContractInstantiated'))

      // Add display NFT action if in a DAO.
      if (props.isCreating && context.type === ActionContextType.Dao) {
        props.addAction({
          actionKey: ActionKey.ManageCw721,
          data: {
            adding: true,
            address: contractAddress,
          },
        })
      }
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    }
  }

  return (
    <StatelessInstantiateNftCollection
      {...props}
      options={{
        instantiating,
        onInstantiate,
        AddressInput,
      }}
    />
  )
}
