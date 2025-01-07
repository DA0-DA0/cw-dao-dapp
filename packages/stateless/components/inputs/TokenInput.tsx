import { ArrowDropDown, Edit } from '@mui/icons-material'
import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'
import { FieldValues, Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  PopupTriggerCustomComponent,
  TokenInputOption,
  TokenInputProps,
} from '@dao-dao/types'
import {
  getDisplayNameForChainId,
  getFallbackImage,
  toAccessibleImageUrl,
  tokensEqual,
  transformIpfsUrlToHttpsIfNecessary,
  validateNonNegative,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { useUpdatingRef } from '../../hooks'
import { ChainLogo } from '../chain/ChainLogo'
import { IconButton } from '../icon_buttons'
import { FilterableItem, FilterableItemPopup } from '../popup'
import { Tooltip } from '../tooltip'
import { NumericInput } from './NumericInput'
import { TextInput } from './TextInput'

/**
 * A component for specifying an amount and a token. This should be used
 * whenever an amount of a variable choice token is needed. See example usage in
 * the Spend action component.
 */
export const TokenInput = <
  T extends TokenInputOption,
  FV extends FieldValues = FieldValues,
  FieldName extends Path<FV> = Path<FV>,
>({
  amount: amountField,
  tokens,
  hideTokens,
  onSelectToken,
  selectedToken: _selectedToken,
  tokenFallback,
  disabled,
  readOnly,
  required = true,
  containerClassName,
  showChainImage,
  containerRef,
  allowCustomToken,
  onCustomTokenChange,
}: TokenInputProps<T, FV, FieldName>) => {
  const { t } = useTranslation()

  const selectedToken =
    tokens.loading || !_selectedToken
      ? undefined
      : tokens.data.find((token) => tokensEqual(token, _selectedToken))

  const amount = HugeDecimal.fromHumanReadable(
    amountField?.watch(amountField.fieldName) || '0',
    selectedToken?.decimals ?? 0
  )

  // All tokens from same chain.
  const allTokensOnSameChain =
    !tokens.loading &&
    tokens.data.every((token) => token.chainId === tokens.data[0].chainId)

  const selectedTokenDisplay = useMemo(
    () =>
      selectedToken ? (
        <div className="flex min-w-0 flex-row items-center gap-2">
          <Tooltip
            title={t('info.tokenOnChain', {
              token: selectedToken.symbol,
              chain: getDisplayNameForChainId(selectedToken.chainId),
            })}
          >
            <div
              className={clsx(
                'h-6 w-6 shrink-0 rounded-full bg-cover bg-center',
                showChainImage && 'relative'
              )}
              style={{
                backgroundImage: `url(${toAccessibleImageUrl(
                  selectedToken.imageUrl ||
                    getFallbackImage(selectedToken.denomOrAddress)
                )})`,
              }}
            >
              {showChainImage && (
                <ChainLogo
                  chainId={selectedToken.chainId}
                  className="absolute -bottom-1 -right-1"
                  size={14}
                />
              )}
            </div>
          </Tooltip>

          <p className="min-w-[4rem] grow truncate text-left">
            {readOnly &&
              amountField &&
              amount.toInternationalizedHumanReadableString({
                decimals: selectedToken.decimals,
              }) +
                (amountField.unit ? amountField.unit : '') +
                ' $'}
            {selectedToken.symbol}
          </p>
        </div>
      ) : (
        (tokenFallback ?? (
          <p className="text-text-secondary">
            {readOnly
              ? t('info.token', {
                  // Plural if amount is not 1.
                  count: amount.eq(1) ? 1 : 2,
                })
              : disabled
                ? t('info.noTokenSelected')
                : t('button.selectToken')}
          </p>
        ))
      ),
    [
      amount,
      amountField,
      disabled,
      readOnly,
      selectedToken,
      showChainImage,
      t,
      tokenFallback,
    ]
  )

  // Disable if there is only one token to choose from and the currently
  // selected token is equal to it.
  const selectDisabled =
    disabled ||
    (!tokens.loading &&
      tokens.data.length === 1 &&
      selectedToken &&
      tokensEqual(tokens.data[0], selectedToken))

  const [customSelected, setCustomSelected] = useState(false)

  const items: (
    | (FilterableItem &
        T & {
          _custom?: false
        })
    | (FilterableItem & {
        _custom: true
      })
  )[] = tokens.loading
    ? []
    : [
        ...(allowCustomToken
          ? [
              {
                key: '_custom',
                label: t('info.enterCustomToken'),
                Icon: Edit,
                _custom: true as const,
                iconClassName: 'ml-1 mb-1',
                contentContainerClassName: '!gap-3',
              },
            ]
          : []),
        ...tokens.data
          .filter(
            (token) => !hideTokens?.some((hidden) => tokensEqual(hidden, token))
          )
          .map((token, index) => ({
            key: index + token.denomOrAddress,
            label: token.symbol,
            iconUrl: transformIpfsUrlToHttpsIfNecessary(
              token.imageUrl || getFallbackImage(token.denomOrAddress)
            ),
            ...token,
            rightNode: (
              <p className="caption-text max-w-[5rem] truncate">
                {allTokensOnSameChain
                  ? token.denomOrAddress
                  : getDisplayNameForChainId(token.chainId)}
              </p>
            ),
            iconClassName: '!h-8 !w-8',
            contentContainerClassName: '!gap-3',
          })),
      ]

  // Memoize reference so renderer never changes.
  const onCustomTokenChangeRef = useUpdatingRef(onCustomTokenChange)
  const CustomInputRenderer: PopupTriggerCustomComponent = useCallback(
    ({ onClick }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [customInput, setCustomInput] = useState('')

      return (
        <div className="flex flex-row gap-3 items-center justify-between bg-transparent rounded-md py-3 pl-4 pr-2 transition ring-1 focus-within:ring-2 ring-border-primary focus-within:ring-border-interactive-focus min-w-[10rem] grow basis-[10rem]">
          <TextInput
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            ghost
            onInput={(event) => {
              const { value } = event.target as HTMLInputElement
              setCustomInput(value)
              onCustomTokenChangeRef.current?.(value)
            }}
            // eslint-disable-next-line i18next/no-literal-string
            placeholder="udenom..."
            spellCheck={false}
            value={customInput}
          />

          <IconButton
            Icon={ArrowDropDown}
            onClick={onClick}
            size="sm"
            variant="ghost"
          />
        </div>
      )
    },
    [onCustomTokenChangeRef]
  )

  return (
    <div
      className={clsx(
        'flex max-w-md flex-row flex-wrap items-stretch gap-1',
        containerClassName
      )}
      ref={containerRef}
    >
      {readOnly ? (
        selectedTokenDisplay
      ) : (
        <>
          {amountField && (
            <NumericInput
              {...amountField}
              containerClassName="min-w-[12rem] grow basis-[12rem]"
              disabled={disabled || (!selectedToken && !customSelected)}
              setValue={(fieldName, value, options) =>
                amountField.setValue(fieldName, value as any, options)
              }
              validation={[
                HugeDecimal.from(amountField.min || 0).isZero()
                  ? validateNonNegative
                  : validatePositive,
                ...(required ? [validateRequired] : []),
                ...(amountField.validations ?? []),
              ]}
            />
          )}

          <FilterableItemPopup
            filterableItemKeys={FILTERABLE_KEYS}
            items={items}
            onSelect={(token) => {
              if (allowCustomToken) {
                onSelectToken(token._custom ? undefined : token)

                setCustomSelected(!!token._custom)
                if (token._custom) {
                  onCustomTokenChange('')
                }

                // Type-check. It shouldn't be possible to select a custom token
                // if `allowCustomToken` is false, but just in case. Do nothing
                // if a custom token is somehow selected when not allowed.
              } else if (!token._custom) {
                onSelectToken(token)
              }
            }}
            searchPlaceholder={t('info.searchForToken')}
            trigger={
              allowCustomToken && customSelected
                ? {
                    type: 'custom',
                    Renderer: CustomInputRenderer,
                  }
                : {
                    type: 'button',
                    props: {
                      className: 'min-w-[10rem] grow basis-[10rem]',
                      contentContainerClassName:
                        'justify-between text-icon-primary !gap-4',
                      disabled: selectDisabled,
                      loading: tokens.loading,
                      size: 'lg',
                      variant: 'ghost_outline',
                      children: (
                        <>
                          {selectedTokenDisplay}

                          {!selectDisabled && (
                            <ArrowDropDown className="!h-6 !w-6" />
                          )}
                        </>
                      ),
                    },
                  }
            }
          />
        </>
      )}
    </div>
  )
}

const FILTERABLE_KEYS = ['key', 'label', 'description']
