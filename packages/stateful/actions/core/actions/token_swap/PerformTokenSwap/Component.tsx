import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useActionOptions } from '@dao-dao/stateless'
import { ActionComponent } from '@dao-dao/types'

import { useTokenSwapStatusInfoForContract } from '../../../../../hooks/useTokenSwapStatusInfoForContract'
import { ExistingTokenSwap } from '../stateless/ExistingTokenSwap'

export const PerformTokenSwapComponent: ActionComponent = (props) => {
  const { t } = useTranslation()
  const {
    address,
    chain: { chainId },
  } = useActionOptions()

  const { watch } = useFormContext()
  const tokenSwapContractAddress: string | undefined = watch(
    props.fieldNamePrefix + 'tokenSwapContractAddress'
  )

  if (!tokenSwapContractAddress) {
    throw new Error(t('error.loadingData'))
  }

  const {
    selfParty,
    selfPartyTokenInfo,
    selfPartyAmount,
    props: tokenSwapStatusProps,
  } = useTokenSwapStatusInfoForContract({
    contractAddress: tokenSwapContractAddress,
    chainId,
    selfPartyAddress: address,
  })

  return (
    <ExistingTokenSwap
      {...props}
      options={{
        tokenSwapStatusProps,
        status: t('info.actionPaysTokenSwap', {
          context: selfParty.provided ? 'paid' : 'unpaid',
          amount: selfPartyAmount.toLocaleString(undefined, {
            maximumFractionDigits: selfPartyTokenInfo.decimals,
          }),
          tokenSymbol: selfPartyTokenInfo.symbol,
        }),
      }}
    />
  )
}
