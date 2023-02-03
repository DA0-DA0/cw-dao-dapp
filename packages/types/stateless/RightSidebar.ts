import { ComponentType, ReactNode, RefCallback } from 'react'

import { ModalProps } from './Modal'

export interface RightSidebarProps {
  wallet: ReactNode
  setContentRef: RefCallback<HTMLDivElement>
  WalletFiatRampModal: ComponentType<Pick<ModalProps, 'onClose' | 'visible'>>
}

export interface RightSidebarContentProps {
  children: ReactNode
}
