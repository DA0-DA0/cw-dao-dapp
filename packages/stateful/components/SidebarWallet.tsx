import {
  WalletConnectionStatus,
  useWallet,
  useWalletManager,
} from '@noahsaso/cosmodal'
import { useRecoilValue, useSetRecoilState } from 'recoil'

import {
  walletChainIdAtom,
  walletModalVisibleAtom,
} from '@dao-dao/state/recoil'
import { SidebarWallet as OriginalSidebarWallet } from '@dao-dao/stateless'

import { SuspenseLoader } from './SuspenseLoader'

export const SidebarWallet = () => {
  const { connect } = useWalletManager()

  const walletChainId = useRecoilValue(walletChainIdAtom)
  const { connected, status, address, name, wallet } = useWallet(walletChainId)

  const setWalletModalVisible = useSetRecoilState(walletModalVisibleAtom)
  const openWalletModal = () => setWalletModalVisible(true)

  return (
    <SuspenseLoader
      fallback={<OriginalSidebarWallet connected={false} loading />}
      forceFallback={
        // Prevent flickering to connect wallet button when no longer suspended
        // but cosmodal hasn't started its first autoconnection attempt yet.
        status === WalletConnectionStatus.Initializing ||
        status === WalletConnectionStatus.AttemptingAutoConnection
      }
    >
      {connected && address && name && wallet ? (
        <OriginalSidebarWallet
          connected
          openWalletModal={openWalletModal}
          walletAddress={address}
          walletName={name}
          walletProviderImageUrl={wallet.imageUrl}
        />
      ) : (
        <OriginalSidebarWallet connected={false} onConnect={connect} />
      )}
    </SuspenseLoader>
  )
}
