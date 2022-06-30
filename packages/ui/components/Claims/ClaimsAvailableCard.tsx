import { FC } from 'react'

import { useTranslation } from '@dao-dao/i18n'
import { TokenInfoResponse } from '@dao-dao/types/contracts/stake-cw20'
import { convertMicroDenomToDenomWithDecimals } from '@dao-dao/utils'

import { LogoNoBorder } from '../Logo'

export interface ClaimsAvailableCardProps {
  available: number
  tokenInfo: TokenInfoResponse
  onClaim: () => void
  loading: boolean
}

export const ClaimsAvailableCard: FC<ClaimsAvailableCardProps> = ({
  available,
  tokenInfo,
  onClaim,
  loading,
}) => {
  const { t } = useTranslation()

  return (
    <div className="border-base-300 mt-2 w-full rounded-lg border p-6 shadow">
      <h2 className="font-mono text-sm text-secondary">
        {t('title.unclaimed')} (
        {t('info.unstakedTokens', { tokenSymbol: tokenInfo.symbol })})
      </h2>
      {loading ? (
        <div className="mt-2 inline-block animate-spin-medium">
          <LogoNoBorder />
        </div>
      ) : (
        <p className="mt-2 font-bold">
          {convertMicroDenomToDenomWithDecimals(available, tokenInfo.decimals)}$
          {tokenInfo.symbol}
        </p>
      )}
      <div className="flex justify-end">
        <button
          className="btn-outline btn-xs border-secondary btn normal-case"
          onClick={onClaim}
        >
          {t('button.claim')}
        </button>
      </div>
    </div>
  )
}
