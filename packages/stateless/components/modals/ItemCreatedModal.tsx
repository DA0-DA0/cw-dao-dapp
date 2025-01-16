import clsx from 'clsx'
import { ComponentType, useEffect, useState } from 'react'
import Confetti from 'react-confetti'
import { useTranslation } from 'react-i18next'

import { CopyToClipboard } from '../CopyToClipboard'
import { Modal, ModalProps } from './Modal'

export interface ItemCreatedModalProps<T> {
  modalProps: Omit<ModalProps, 'header' | 'children' | 'visible'>
  header: Required<ModalProps>['header']
  Item: ComponentType<Omit<T, 'onMouseOver' | 'onMouseLeave'>>
  itemProps: T
  url: string
}

export const ItemCreatedModal = <
  T extends {
    className?: string
    onMouseOver?: () => void
    onMouseLeave?: () => void
  },
>({
  modalProps: {
    containerClassName: modalContainerClassName,
    ...modalProps
  } = {},
  header,
  url,
  ...props
}: ItemCreatedModalProps<T>) => {
  const { t } = useTranslation()

  const [confettiVisible, setConfettiVisible] = useState(true)
  const [recycleConfetti, setRecycleConfetti] = useState(false)
  // Turn confetti off and back on.
  const [resetConfetti, setResetConfetti] = useState(false)
  useEffect(() => {
    if (resetConfetti && !confettiVisible) {
      setResetConfetti(false)
      setConfettiVisible(true)
    }
  }, [confettiVisible, resetConfetti])

  return (
    <Modal
      {...modalProps}
      containerClassName={clsx('sm:!max-w-lg', modalContainerClassName)}
      header={header}
      visible
    >
      <div className="relative -m-6 overflow-hidden p-6 pt-8">
        {confettiVisible && (
          <Confetti
            className="!z-10"
            gravity={0.042069 * 1.337}
            numberOfPieces={1337 / 2}
            onConfettiComplete={() => setConfettiVisible(false)}
            recycle={recycleConfetti}
          />
        )}

        <div className="relative z-20 flex h-full w-full flex-col gap-10 overflow-y-auto">
          <div className="w-[18rem] max-w-[90%] shrink-0 self-center rounded-md bg-background-base shadow-dp8">
            <props.Item
              {...props.itemProps}
              className={clsx(
                // Force same rounded corners as parent, just in case.
                'w-full !rounded-md',
                props.itemProps.className
              )}
              onMouseLeave={() => setRecycleConfetti(false)}
              onMouseOver={() => {
                setRecycleConfetti(true)
                setConfettiVisible(true)
              }}
            />
          </div>

          <div className="shrink-0 rounded-md bg-background-base shadow-dp4">
            <CopyToClipboard
              className="symbol-small-body-text w-full gap-4 rounded-md bg-background-secondary p-4 text-left font-mono transition hover:bg-background-button-secondary-default"
              onCopy={() => {
                setResetConfetti(true)
                setConfettiVisible(false)
              }}
              takeAll
              textClassName="!bg-transparent"
              tooltip={t('button.copyToClipboard')}
              value={url}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
