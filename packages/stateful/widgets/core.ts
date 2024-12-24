import { Widget, WidgetFilterOptions } from '@dao-dao/types'
import { versionGte } from '@dao-dao/utils'

import {
  PressWidget,
  RetroactiveCompensationWidget,
  VestingPaymentsWidget,
  VoteDelegationWidget,
} from './widgets'

// Add widgets here.
export const getWidgets = ({
  chainId,
  version,
  isDaoCreation = false,
}: WidgetFilterOptions): readonly Widget[] =>
  [
    // MintNftWidget,
    VestingPaymentsWidget,
    RetroactiveCompensationWidget,
    VoteDelegationWidget,
    PressWidget,
  ].filter(
    (widget) =>
      (!widget.isChainSupported || widget.isChainSupported(chainId)) &&
      (!widget.minVersion || versionGte(version, widget.minVersion)) &&
      (!isDaoCreation || widget.supportsDaoCreation)
  )

export const getWidgetById = (options: WidgetFilterOptions, id: string) =>
  getWidgets(options).find((widget) => widget.id === id)
