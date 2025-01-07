import { ComponentType } from 'react'

import { PopupTrigger } from './Popup'

export type ChainPickerPopupProps = {
  /**
   * The chains to include in the picker.
   */
  chains:
    | {
        /**
         * Supported chains have native DAO DAO deployments.
         */
        type: 'supported'
        /**
         * Chain IDs to exclude.
         */
        excludeChainIds?: string[]
      }
    | {
        /**
         * Configured chains include supported chains and others which show up
         * in the UI in various places, such as the governance UI.
         */
        type: 'configured'
        /**
         * Chain IDs to exclude.
         */
        excludeChainIds?: string[]
        /**
         * Only include chains with a governance module. This uses the `noGov`
         * flag in chain config.
         */
        onlyGov?: boolean
      }
    | {
        /**
         * Set any chains explicitly
         */
        type: 'custom'
        chainIds: string[]
      }
  /**
   * The selected chain ID. If undefined, will select the none option if exists.
   */
  selectedChainId?: string
  /**
   * Handler for when a chain is selected. If the none option is selected, the
   * handler will be called with `undefined`.
   */
  onSelect: (chainId?: string) => void | Promise<void>
  /**
   * Whether to use the chain name or the native token symbol as the label.
   * Defaults to 'chain'.
   */
  labelMode?: 'chain' | 'token'
  /**
   * Whether or not to show a loading indicator.
   */
  loading?: boolean
  /**
   * Whether or not chain selection is disabled.
   */
  disabled?: boolean
  /**
   * Optional class name applied to the button.
   */
  buttonClassName?: string
  /**
   * If true, a button will be shown at the top that represents none.
   */
  showNone?: boolean
  /**
   * If defined, this will be the label of the none button.
   */
  noneLabel?: string
  /**
   * If defined, this will be the icon of the none button.
   */
  NoneIcon?: ComponentType<{ className?: string }>
  /**
   * If true, will make the button more like a text header instead.
   */
  headerMode?: boolean
  /**
   * Optional class name applied to the selected chain icon.
   */
  selectedIconClassName?: string
  /**
   * Optional class name applied to the selected chain label.
   */
  selectedLabelClassName?: string
  /**
   * Optionally override the picker trigger entirely.
   */
  trigger?: PopupTrigger
  /**
   * Optionally hide the icon from the selected chain. Defaults to false.
   */
  hideSelectedIcon?: boolean
}

export type WalletChainSwitcherProps = {
  /**
   * The chain type to show. Supported chains have native DAO DAO deployments,
   * whereas configured chains include supported chains and others which show up
   * in the UI in various places, such as the governance UI.
   *
   * Defaults to 'supported'.
   */
  type?: 'supported' | 'configured'
  /**
   * Chain IDs to exclude.
   */
  excludeChainIds?: string[]
} & Omit<
  ChainPickerPopupProps,
  | 'chains'
  | 'selectedChainId'
  | 'onSelect'
  | 'labelMode'
  | 'showNone'
  | 'noneLabel'
  | 'NoneIcon'
> &
  Partial<Pick<ChainPickerPopupProps, 'onSelect'>>
