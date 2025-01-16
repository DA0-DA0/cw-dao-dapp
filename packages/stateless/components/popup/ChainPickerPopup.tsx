import { ArrowDropDown } from '@mui/icons-material'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import { ChainPickerPopupProps } from '@dao-dao/types'
import {
  getConfiguredChains,
  getDisplayNameForChainId,
  getFallbackImage,
  getImageUrlForChainId,
  getNativeTokenForChainId,
  getSupportedChains,
  toAccessibleImageUrl,
} from '@dao-dao/utils'

import { FilterableItem, FilterableItemPopup } from './FilterableItemPopup'

/**
 * A popup that allows the user to select a chain.
 */
export const ChainPickerPopup = ({
  chains,
  selectedChainId,
  onSelect,
  labelMode = 'chain',
  loading,
  disabled,
  buttonClassName,
  showNone,
  noneLabel,
  NoneIcon,
  headerMode,
  selectedIconClassName,
  selectedLabelClassName,
  trigger,
  hideSelectedIcon = false,
}: ChainPickerPopupProps) => {
  const { t } = useTranslation()

  const chainOptions = useMemo(
    () => {
      const chainIds =
        chains.type === 'supported'
          ? getSupportedChains()
              .filter(
                ({ chainId }) => !chains.excludeChainIds?.includes(chainId)
              )
              .map(({ chain }) => chain.chainId)
          : chains.type === 'configured'
            ? getConfiguredChains()
                .filter(
                  ({ chainId, noGov }) =>
                    !chains.excludeChainIds?.includes(chainId) &&
                    (!chains.onlyGov || !noGov)
                )
                .map(({ chain }) => chain.chainId)
            : chains.chainIds

      const _chainOptions = chainIds.map(
        (chainId): FilterableItem => ({
          key: chainId,
          label:
            labelMode === 'chain'
              ? getDisplayNameForChainId(chainId)
              : getNativeTokenForChainId(chainId).symbol,
          iconUrl: toAccessibleImageUrl(
            (labelMode === 'chain'
              ? getImageUrlForChainId(chainId)
              : getNativeTokenForChainId(chainId).imageUrl) ||
              getFallbackImage(chainId)
          ),
          ...commonOptionClassFields,
        })
      )

      // Add none option to the top.
      if (showNone) {
        _chainOptions.splice(0, 0, {
          key: NONE_KEY,
          label: noneLabel || t('info.none'),
          Icon: NoneIcon,
          ...commonOptionClassFields,
        })
      }

      return _chainOptions.map((option) => ({
        ...option,
        selected: !selectedChainId
          ? showNone && option.key === NONE_KEY
          : option.key === selectedChainId,
      }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useDeepCompareMemoize([
      NoneIcon,
      chains,
      labelMode,
      noneLabel,
      showNone,
      t,
      selectedChainId,
    ])
  )

  const selectedChain = selectedChainId
    ? chainOptions.find(({ key }) => key === selectedChainId)
    : undefined

  return (
    <FilterableItemPopup
      filterableItemKeys={FILTERABLE_KEYS}
      items={chainOptions}
      onSelect={({ key }) =>
        onSelect(key === NONE_KEY ? undefined : (key as string))
      }
      searchPlaceholder={
        labelMode === 'chain'
          ? t('info.searchForChain')
          : t('info.searchForToken')
      }
      trigger={
        trigger || {
          type: 'button',
          tooltip: t('button.switchChain'),
          props: {
            className: buttonClassName,
            contentContainerClassName: clsx(
              'justify-between text-icon-primary',
              headerMode ? '!gap-1' : '!gap-4'
            ),
            loading,
            disabled,
            size: 'lg',
            variant: headerMode ? 'none' : 'ghost_outline',
            children: (
              <>
                <div className="flex flex-row items-center gap-2">
                  {!hideSelectedIcon &&
                    (selectedChain
                      ? !!selectedChain.iconUrl && (
                          <div
                            className={clsx(
                              'h-6 w-6 shrink-0 rounded-full bg-cover bg-center',
                              selectedIconClassName
                            )}
                            style={{
                              backgroundImage: `url(${selectedChain.iconUrl})`,
                            }}
                          />
                        )
                      : showNone &&
                        NoneIcon && (
                          <NoneIcon
                            className={clsx('!h-6 !w-6', selectedIconClassName)}
                          />
                        ))}

                  <p
                    className={clsx(
                      selectedChain ? 'text-text-body' : 'text-text-tertiary',
                      selectedLabelClassName
                    )}
                  >
                    {selectedChain?.label ||
                      (showNone && noneLabel) ||
                      (labelMode === 'chain'
                        ? t('button.selectChain')
                        : t('button.selectToken'))}
                  </p>
                </div>

                {!disabled && <ArrowDropDown className="!h-6 !w-6" />}
              </>
            ),
          },
        }
      }
    />
  )
}

const NONE_KEY = '_none_'
const FILTERABLE_KEYS = ['key', 'label']

const commonOptionClassFields = {
  iconClassName: '!h-8 !w-8',
  className: '!py-2',
  contentContainerClassName: '!gap-3',
}
