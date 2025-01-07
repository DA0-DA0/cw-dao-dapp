import { AssetList } from '@chain-registry/types'
import { State, WalletModalProps, convertChain } from '@cosmos-kit/core'
import { useManager } from '@cosmos-kit/react-lite'
import clsx from 'clsx'
import uniq from 'lodash.uniq'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilValue } from 'recoil'

import { walletChainIdAtom } from '@dao-dao/state'
import { Modal, StatusCard } from '@dao-dao/stateless'
import {
  getChainForChainId,
  maybeGetAssetListForChainId,
  maybeGetChainForChainId,
  processError,
} from '@dao-dao/utils'

import { WalletUiConnected } from './WalletUiConnected'
import { WalletUiConnectQr } from './WalletUiConnectQr'
import { WalletUiWalletList } from './WalletUiWalletList'

export const WalletUi = (props: WalletModalProps) => {
  const { t } = useTranslation()

  const [qrState, setQRState] = useState<State>(State.Init)
  const [qrErrorMessage, setQRErrorMessage] = useState<string>()

  // Chain of main wallet connection.
  const { getWalletRepo } = useManager()
  const mainWalletChainId = useRecoilValue(walletChainIdAtom)

  const { isOpen, setOpen, walletRepo } = props
  if (!walletRepo) {
    return <></>
  }

  // Get main wallet repo.
  const mainWalletRepo = getWalletRepo(
    maybeGetChainForChainId(mainWalletChainId)?.chainName ||
      walletRepo.chainName
  )

  const { current } = walletRepo
  const {
    isWalletConnecting = false,
    isWalletConnected = false,
    isWalletError = false,
    message: errorMessage,
  } = current || {}

  // Set QR URL update actions so this component refreshes when QR state
  // changes.
  if (
    current?.client &&
    'qrUrl' in current.client &&
    'setActions' in current.client
  ) {
    ;(current.client as any).setActions?.({
      qrUrl: {
        state: setQRState,
        message: setQRErrorMessage,
      },
    })
  }

  const showWalletConnectQr = isWalletConnecting && qrState === State.Done
  const title = isWalletConnecting
    ? showWalletConnectQr
      ? t('title.scanQrCode')
      : current?.walletName.startsWith('web3auth_')
        ? t('title.loggingInToService', { service: current.walletPrettyName })
        : t('title.connectingToWallet', { wallet: current?.walletPrettyName })
    : isWalletConnected
      ? t('title.loggedIn')
      : t('title.logInWith')

  return (
    <Modal
      backdropClassName="z-[41]"
      containerClassName="!w-[24rem]"
      contentContainerClassName={clsx(
        // When showing wallet list, remove padding as it has its own horizontal
        // borders and thus needs to manage its own padding.
        !showWalletConnectQr && !isWalletConnected && '!p-0'
      )}
      footerContent={
        isWalletError && errorMessage ? (
          <StatusCard
            content={
              errorMessage === "key doesn't exist"
                ? t('info.configureWalletModalExplanation')
                : processError(errorMessage, { forceCapture: false })
            }
            style="warning"
          />
        ) : qrState === State.Error && qrErrorMessage ? (
          <StatusCard content={qrErrorMessage} style="warning" />
        ) : undefined
      }
      header={{
        title,
      }}
      onClose={() => {
        // If not connected, disconnect, to interrupt active connection.
        if (!isWalletConnected && walletRepo && walletRepo.current) {
          walletRepo.disconnect(undefined, true)
        }

        // Close modal if not showing QR. If showing QR, the disconnect above
        // will go back to the wallet list.
        if (!showWalletConnectQr) {
          setOpen(false)
        }
      }}
      visible={isOpen}
    >
      {showWalletConnectQr ? (
        <WalletUiConnectQr walletRepo={walletRepo} />
      ) : isWalletConnected ? (
        <WalletUiConnected {...props} />
      ) : (
        <WalletUiWalletList
          connect={async (wallet) => {
            // Reset QR State before next connection.
            setQRState(State.Init)
            setQRErrorMessage(undefined)

            // Connect to wallet.
            try {
              // Ensure chains are added before connecting.
              const chainRecords = uniq([wallet.chainId, mainWalletChainId])
                .filter(Boolean)
                .map((chainId) =>
                  convertChain(
                    // @ts-ignore
                    getChainForChainId(chainId).chainRegistry!,
                    [maybeGetAssetListForChainId(chainId)].filter(
                      (al): al is AssetList => !!al
                      // Temp fix for mismatched package types.
                    ) as any[]
                  )
                )

              await Promise.allSettled(
                chainRecords.map(
                  async (chainRecord) =>
                    await wallet?.mainWallet?.client
                      ?.addChain?.(chainRecord)
                      .catch(console.error)
                )
              )

              if (wallet.isWalletNotExist) {
                toast.error(`${wallet.walletPrettyName} is not installed.`)
                return
              }

              await Promise.all([
                // If main wallet repo not connected or is the same chain,
                // connect it too.
                ...(mainWalletRepo.isWalletConnected ||
                mainWalletChainId === wallet.chainId
                  ? []
                  : [mainWalletRepo.connect(wallet.walletName, false)]),
                // Connect selected wallet for chain.
                wallet.connect(false),
              ])
            } catch (err) {
              console.error(err)
              toast.error(err instanceof Error ? err.message : `${err}`)
            }
          }}
          walletRepo={walletRepo}
        />
      )}
    </Modal>
  )
}
