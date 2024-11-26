import { Widget } from '@dao-dao/types'

import {
  PressWidget,
  RetroactiveCompensationWidget,
  VestingPaymentsWidget,
  VoteDelegationWidget,
} from './widgets'

// Add widgets here.
export const getWidgets = (chainId: string): readonly Widget[] =>
  [
    // MintNftWidget,
    VestingPaymentsWidget,
    RetroactiveCompensationWidget,
    VoteDelegationWidget,
    PressWidget,
  ].filter(
    (widget) => !widget.isChainSupported || widget.isChainSupported(chainId)
  )

export const getWidgetById = (chainId: string, id: string) =>
  getWidgets(chainId).find((widget) => widget.id === id)
