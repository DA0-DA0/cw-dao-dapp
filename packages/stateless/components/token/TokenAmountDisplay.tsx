import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { TokenAmountDisplayProps } from '@dao-dao/types'
import {
  formatTime,
  getDisplayNameForChainId,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

import { ChainLogo } from '../chain/ChainLogo'
import { Tooltip } from '../tooltip/Tooltip'

// Standardized display for token amounts, with support for displaying compact
// notation of numbers and providing tooltips with precise numbers when any
// abbreviation occurs.
//
// It automatically displays max 2 decimals when abbreviating larger values,
// since the abbreviation already implies an approximate is being displayed, and
// the token decimals no longer carry the same meaning in the abbreviated value.
//
// For example: 250,319,726.80401 $JUNO abbreviates to 250.31K $JUNO, which
// looks much better than 250.319726K $JUNO.
//
// Notes:
//
// The only token amounts we intentionally don't show with full decimals are USD
// value estimates (i.e. USDC) (max 2).

export const TokenAmountDisplay = ({
  amount: _amount,
  decimals: _decimals = 0,
  prefix,
  prefixClassName,
  suffix,
  suffixClassName,
  dateFetched,
  minAmount: _minAmount,
  showFullAmount = false,
  showAllDecimals,
  iconUrl,
  iconClassName,
  showChainId,
  symbol,
  hideSymbol,
  estimatedUsdValue,
  onClick,
  wrapperClassName,
  ...props
}: TokenAmountDisplayProps) => {
  const { t } = useTranslation()

  const tokenTranslation = estimatedUsdValue
    ? 'format.estUsdValue'
    : 'format.token'
  const decimals = estimatedUsdValue ? 2 : _decimals
  const minAmount = estimatedUsdValue ? 0.01 : _minAmount

  showAllDecimals ||= estimatedUsdValue

  const translateOrOmitSymbol = (translationKey: string, amount: string) =>
    hideSymbol
      ? amount
      : t(translationKey, {
          amount,
          symbol,
        })

  // If loading, display pulsing ellipses.
  if (
    typeof _amount !== 'number' &&
    _amount &&
    !(_amount instanceof HugeDecimal) &&
    'loading' in _amount &&
    _amount.loading
  ) {
    return (
      <p {...props} className={clsx('animate-pulse truncate', props.className)}>
        {translateOrOmitSymbol(tokenTranslation, '...')}
      </p>
    )
  }

  // Extract amount from loaded value and convert to HugeDecimal.
  let amount =
    _amount instanceof HugeDecimal
      ? _amount
      : typeof _amount === 'number'
        ? HugeDecimal.fromHumanReadable(_amount, decimals)
        : _amount
          ? _amount.data instanceof HugeDecimal
            ? _amount.data
            : HugeDecimal.fromHumanReadable(_amount.data, decimals)
          : HugeDecimal.zero

  // If amount too small and nonzero, set to min and add `< ` to prefix.
  const amountBelowMin =
    !!minAmount &&
    amount.isPositive() &&
    amount.toHumanReadable(decimals).lt(minAmount)
  if (amountBelowMin) {
    amount = HugeDecimal.fromHumanReadable(minAmount, decimals)
    prefix = `< ${prefix || ''}`
  }

  const minDecimals = showAllDecimals ? decimals : 0

  const amountDisplay = amount.toInternationalizedHumanReadableString({
    decimals,
    showFullAmount,
    minDecimals,
  })

  const display = translateOrOmitSymbol(tokenTranslation, amountDisplay)

  // Show full value in tooltip if compacted and not an estimated USD value.
  const shouldShowFullTooltip =
    !showFullAmount &&
    amount.toHumanReadable(decimals).gte(1000) &&
    !estimatedUsdValue

  return (
    <Tooltip
      title={
        // Show tooltip with full value and fetch time.
        shouldShowFullTooltip || dateFetched ? (
          <>
            {shouldShowFullTooltip &&
              translateOrOmitSymbol(
                // eslint-disable-next-line i18next/no-literal-string
                'format.token',
                amount.toInternationalizedHumanReadableString({
                  decimals,
                  showFullAmount: true,
                })
              )}

            {shouldShowFullTooltip && dateFetched && <br />}

            {dateFetched && (
              <span className="caption-text">
                {t('info.fetchedAtTime', {
                  time: formatTime(dateFetched),
                })}
              </span>
            )}
          </>
        ) : undefined
      }
    >
      <div
        className={clsx(
          'flex min-w-0 flex-row items-center gap-2 max-w-full',
          onClick &&
            'cursor-pointer transition-opacity hover:opacity-80 active:opacity-70',
          wrapperClassName
        )}
        onClick={onClick}
      >
        {/* Icon */}
        {!!iconUrl && (
          <Tooltip
            title={
              showChainId
                ? t('info.tokenOnChain', {
                    token: symbol,
                    chain: getDisplayNameForChainId(showChainId),
                  })
                : undefined
            }
          >
            <div
              className={clsx(
                'h-5 w-5 shrink-0 rounded-full bg-cover bg-center',
                showChainId && 'relative',
                iconClassName
              )}
              style={{
                backgroundImage: `url(${toAccessibleImageUrl(iconUrl)})`,
              }}
            >
              {showChainId && (
                <ChainLogo
                  chainId={showChainId}
                  className="absolute -bottom-1 -right-1"
                  size={14}
                />
              )}
            </div>
          </Tooltip>
        )}

        {/* Amount Display */}
        <p
          {...props}
          className={clsx(
            'min-w-0 max-w-full truncate whitespace-normal',
            onClick && 'underline',
            props.className
          )}
        >
          <span className={prefixClassName}>{prefix}</span>
          {display}
          <span className={suffixClassName}>{suffix}</span>
        </p>
      </div>
    </Tooltip>
  )
}
