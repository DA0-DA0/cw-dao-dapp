import { Check } from '@mui/icons-material'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  Button,
  CopyableAddress,
  useDao,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import { VoteDelegationWidgetData, WidgetEditorProps } from '@dao-dao/types'
import { InstantiateMsg } from '@dao-dao/types/contracts/DaoVoteDelegation'
import { instantiateSmartContract, processError } from '@dao-dao/utils'

import { ConnectWallet } from '../../../components'
import { useWallet } from '../../../hooks'

export const Editor = ({
  fieldNamePrefix,
}: WidgetEditorProps<VoteDelegationWidgetData>) => {
  const { t } = useTranslation()
  const dao = useDao()
  const {
    config: {
      codeIds: { DaoVoteDelegation: codeId },
    },
  } = useSupportedChainContext()
  const {
    isWalletConnected,
    address: walletAddress = '',
    getSigningClient,
  } = useWallet()

  const { watch, setValue } = useFormContext<VoteDelegationWidgetData>()
  const address = watch((fieldNamePrefix + 'address') as 'address')

  const [instantiating, setInstantiating] = useState(false)
  const instantiate = async () => {
    if (!isWalletConnected || !walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setInstantiating(true)
    try {
      const hookCaller = await dao.votingModule.getHookCaller()

      const contractAddress = await instantiateSmartContract(
        getSigningClient,
        walletAddress,
        codeId,
        `DAO DAO Vote Delegation (${Date.now()})`,
        {
          dao: dao.coreAddress,
          // 90 days assuming 3 seconds per block.
          delegation_validity_blocks: (90 * 24 * 3600) / 3,
          no_sync_proposal_modules: false,
          // a delegate can only utilize at most 10% of total voting power, even
          // if they are delegated more.
          vp_cap_percent: '0.1',
          vp_hook_callers: [hookCaller],
        } as InstantiateMsg,
        undefined,
        dao.coreAddress
      )

      // Should never happen.
      if (!contractAddress) {
        throw new Error(t('error.loadingData'))
      }

      setValue((fieldNamePrefix + 'address') as 'address', contractAddress)

      toast.success(t('success.created'))
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setInstantiating(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="body-text max-w-prose break-words">
        {t('info.voteDelegationExplanation')}
      </p>

      <div className="flex flex-row flex-wrap items-center gap-2">
        <p className="body-text max-w-prose break-words">
          {address
            ? t('info.createdVoteDelegationContract')
            : t('info.createVoteDelegationContract')}
        </p>

        {address && <Check className="!h-6 !w-6" />}
      </div>

      {address ? (
        <CopyableAddress address={address} className="!w-auto" />
      ) : walletAddress ? (
        <Button loading={instantiating} onClick={instantiate} variant="primary">
          {t('button.create')}
        </Button>
      ) : (
        <ConnectWallet size="md" />
      )}
    </div>
  )
}
