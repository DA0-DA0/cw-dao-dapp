import clsx from 'clsx'
import { ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { AccountType, ChainPickerPopupProps } from '@dao-dao/types'
import { getIbcTransferChainIdsForChain } from '@dao-dao/utils'

import { useChainContext, useDaoIfAvailable } from '../../contexts'
import { ChainPickerPopup } from '../popup'
import { InputLabel } from './InputLabel'

export type DaoSupportedChainPickerInputProps = {
  /**
   * The name of the chain ID form field.
   */
  fieldName?: string
  /**
   * The selected chain ID, instead of using the form context.
   */
  selected?: string
  /**
   * Handler for when the selected chain changes.
   */
  onChange?: (chainId: string) => void | Promise<void>
  /**
   * If defined, only include these chains.
   */
  includeChainIds?: string[] | readonly string[]
  /**
   * If defined, exclude these chains.
   */
  excludeChainIds?: string[]
  /**
   * Whether to include only the chains the DAO has an account on (its native
   * chain or one of its cross-chain accounts).
   * Defaults to false.
   */
  onlyDaoChainIds?: boolean
  /**
   * Which potential account types of chains for this DAO to include.
   *
   * Defaults to Polytone only.
   */
  accountTypes?: (AccountType.Polytone | AccountType.Ica)[]
  /**
   * Whether to hide the form label.
   */
  hideFormLabel?: boolean
  /**
   * Class name applied to container.
   */
  className?: string
  /**
   * A component to render if there are no chains to show.
   */
  noChainsFallback?: ReactNode
} & Omit<ChainPickerPopupProps, 'chains' | 'selectedChainId' | 'onSelect'>

/**
 * A form picker that is intended to be used in DAO actions to choose a
 * supported chain to execute a message from. This should include the DAO native
 * chain and current or potential cross-chain (polytone) accounts.
 */
export const DaoSupportedChainPickerInput = ({
  fieldName,
  selected,
  onChange,
  includeChainIds: _includeChainIds,
  excludeChainIds,
  onlyDaoChainIds = false,
  accountTypes = [AccountType.Polytone],
  hideFormLabel = false,
  className,
  labelMode = 'chain',
  noChainsFallback,
  ...pickerProps
}: DaoSupportedChainPickerInputProps) => {
  const { t } = useTranslation()
  const {
    chain: { chainId },
    config,
  } = useChainContext()
  const { watch, setValue } = useFormContext() ?? {}
  const dao = useDaoIfAvailable()

  const includeChainIds =
    onlyDaoChainIds && dao
      ? [
          dao.chainId,
          ...dao.accounts.flatMap(({ type, chainId }) =>
            accountTypes.includes(type as any) ? chainId : []
          ),
        ]
      : _includeChainIds

  // Only works on supported chains, so don't render if no supported chain
  // config.
  if (!config) {
    return null
  }

  const chainIds = [
    chainId,
    // Other chains with Polytone connections to this one.
    ...(accountTypes.includes(AccountType.Polytone)
      ? Object.keys(config.polytone || {})
      : []),
    // Other chains with IBC transfer channels to this one.
    ...(accountTypes.includes(AccountType.Ica)
      ? getIbcTransferChainIdsForChain(chainId)
      : []),
  ].filter(
    (chainId) =>
      !excludeChainIds?.includes(chainId) &&
      (!includeChainIds || includeChainIds.includes(chainId))
  )

  if (chainIds.length === 0) {
    return noChainsFallback ? <>{noChainsFallback}</> : null
  }

  // Don't show if only showing the current chain.
  if (chainIds.length === 1 && chainIds[0] === chainId) {
    return null
  }

  const selectedChainId = fieldName && watch ? watch(fieldName) : selected

  return (
    <div className={clsx('flex flex-col items-start gap-1', className)}>
      {!hideFormLabel && (
        <InputLabel
          name={labelMode === 'chain' ? t('title.chain') : t('title.token')}
        />
      )}

      <ChainPickerPopup
        {...pickerProps}
        chains={{
          type: 'custom',
          chainIds,
        }}
        labelMode={labelMode}
        onSelect={(chainId) => {
          // Type-check. None option is disabled so should not be possible.
          if (!chainId) {
            return
          }

          if (fieldName && setValue) {
            setValue(fieldName, chainId)
          }

          onChange?.(chainId)
        }}
        selectedChainId={selectedChainId}
      />
    </div>
  )
}
