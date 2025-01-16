import { useSetRecoilState } from 'recoil'

import { mergeProfilesVisibleAtom } from '@dao-dao/state'
import { NavWallet as StatelessNavWallet } from '@dao-dao/stateless'
import { StatefulNavWalletProps } from '@dao-dao/types'

import { useInboxApiWithUi, useManageProfile, useWallet } from '../hooks'
import { ButtonLink } from './ButtonLink'
import { InboxMainItemRenderer } from './inbox'
import { SuspenseLoader } from './SuspenseLoader'

export const NavWallet = (props: StatefulNavWalletProps) => {
  const { openView, isWalletConnected, wallet, disconnect } = useWallet()
  const {
    profile,
    merge: { options: profileMergeOptions },
  } = useManageProfile()

  const setMergeProfilesModalVisible = useSetRecoilState(
    mergeProfilesVisibleAtom
  )

  // Ignore errors loading inbox because the SDA does not have an inbox.
  let inbox
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    inbox = useInboxApiWithUi({
      mode: 'popup',
    })
  } catch {}

  return (
    <SuspenseLoader
      fallback={
        <StatelessNavWallet connected={false} loading mode={props.mode} />
      }
    >
      {isWalletConnected && wallet ? (
        <StatelessNavWallet
          ButtonLink={ButtonLink}
          InboxMainItemRenderer={InboxMainItemRenderer}
          connected
          disconnect={disconnect}
          inbox={inbox}
          mergeProfileType={
            profileMergeOptions.length === 0
              ? undefined
              : profileMergeOptions.length === 1
                ? 'add'
                : 'merge'
          }
          onMergeProfiles={() => setMergeProfilesModalVisible(true)}
          profile={profile}
          wallet={wallet}
          {...props}
        />
      ) : (
        <StatelessNavWallet connected={false} onConnect={openView} {...props} />
      )}
    </SuspenseLoader>
  )
}

export const HeaderWallet = () => <NavWallet mode="header" />
export const SidebarWallet = () => <NavWallet mode="sidebar" />
export const DockWallet = () => <NavWallet mode="dock" />
