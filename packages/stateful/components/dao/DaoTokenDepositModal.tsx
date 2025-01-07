import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  Cw20BaseSelectors,
  nativeDenomBalanceWithTimestampSelector,
  refreshWalletBalancesIdAtom,
} from '@dao-dao/state/recoil'
import {
  CopyToClipboard,
  TokenDepositModal,
  TokenDepositModalProps,
  useCachedLoading,
  useDao,
} from '@dao-dao/stateless'
import { Account } from '@dao-dao/types'
import { CHAIN_GAS_MULTIPLIER, processError } from '@dao-dao/utils'

import { Cw20BaseHooks, useWallet } from '../../hooks'
import { ConnectWallet } from '../ConnectWallet'

export type DaoTokenDepositModalProps = Pick<
  TokenDepositModalProps,
  'token' | 'onClose' | 'visible'
> & {
  owner: Account
}

export const DaoTokenDepositModal = ({
  token,
  onClose,
  owner,
  ...props
}: DaoTokenDepositModalProps) => {
  const { t } = useTranslation()
  const { name: daoName } = useDao()
  const {
    isWalletConnected,
    address,
    getSigningStargateClient,
    refreshBalances: refreshWalletBalances,
  } = useWallet({
    chainId: token.chainId,
    // Only attempt connection when the modal is visible.
    attemptConnection: props.visible,
  })

  const depositAddress = owner.address

  const setRefreshDaoBalancesId = useSetRecoilState(
    refreshWalletBalancesIdAtom(depositAddress)
  )
  const refreshDaoBalances = useCallback(
    () => setRefreshDaoBalancesId((id) => id + 1),
    [setRefreshDaoBalancesId]
  )

  const loadingBalance = useCachedLoading(
    !address
      ? undefined
      : token.type === 'native'
        ? nativeDenomBalanceWithTimestampSelector({
            walletAddress: address,
            chainId: token.chainId,
            denom: token.denomOrAddress,
          })
        : Cw20BaseSelectors.balanceWithTimestampSelector({
            contractAddress: token.denomOrAddress,
            chainId: token.chainId,
            params: [{ address }],
          }),
    {
      amount: 0,
      timestamp: Date.now(),
    }
  )

  const [amount, setAmount] = useState(HugeDecimal.zero)
  const [loading, setLoading] = useState(false)

  const transferCw20 = Cw20BaseHooks.useTransfer({
    contractAddress: token.type === 'cw20' ? token.denomOrAddress : '',
    sender: address ?? '',
  })

  const onDeposit = useCallback(
    async (amount: HugeDecimal) => {
      if (!address) {
        toast.error(t('error.logInToContinue'))
        return
      }

      if (!depositAddress) {
        toast.error(t('error.accountNotFound'))
        return
      }

      setLoading(true)
      try {
        if (token.type === 'native') {
          const signingClient = await getSigningStargateClient()
          await signingClient.sendTokens(
            address,
            depositAddress,
            amount.toCoins(token.denomOrAddress),
            CHAIN_GAS_MULTIPLIER
          )
        } else if (token.type === 'cw20') {
          await transferCw20({
            amount: amount.toFixed(0),
            recipient: depositAddress,
          })
        }

        refreshWalletBalances()
        refreshDaoBalances()

        toast.success(
          t('success.depositedTokenIntoDao', {
            amount: amount.toInternationalizedHumanReadableString({
              decimals: token.decimals,
            }),
            tokenSymbol: token.symbol,
            daoName,
          })
        )

        onClose?.()
        // Clear amount after a timeout to allow closing.
        setTimeout(() => setAmount(HugeDecimal.zero), 500)
      } catch (err) {
        console.error(err)
        toast.error(processError(err))
      } finally {
        setLoading(false)
      }
    },
    [
      address,
      depositAddress,
      daoName,
      onClose,
      refreshDaoBalances,
      refreshWalletBalances,
      setAmount,
      getSigningStargateClient,
      t,
      token,
      transferCw20,
    ]
  )

  return (
    <TokenDepositModal
      ConnectWallet={ConnectWallet}
      amount={amount}
      connected={isWalletConnected}
      disabled={!depositAddress}
      loading={loading}
      loadingBalance={
        loadingBalance.loading
          ? loadingBalance
          : {
              loading: false,
              data: {
                amount: HugeDecimal.from(
                  loadingBalance.data.amount
                ).toHumanReadableNumber(token.decimals),
                timestamp: loadingBalance.data.timestamp,
              },
            }
      }
      onClose={onClose}
      onDeposit={onDeposit}
      setAmount={setAmount}
      subtitle={
        <CopyToClipboard
          className="mt-1"
          iconClassName="text-icon-secondary"
          takeAll
          textClassName="text-text-secondary"
          tooltip={t('button.clickToCopyAddress')}
          value={depositAddress || 'ERROR'}
        />
      }
      token={token}
      warning={t('info.depositTokenWarning')}
      {...props}
    />
  )
}
