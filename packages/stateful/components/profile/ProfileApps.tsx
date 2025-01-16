import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import { meTransactionAtom } from '@dao-dao/state/recoil'
import {
  ActionCardLoader,
  ErrorPage,
  Modal,
  ProfileImage,
  ProfileNameDisplayAndEditor,
  useChain,
} from '@dao-dao/stateless'

import { useProfile } from '../../hooks'
import { AppsRenderer, AppsRendererExecutorProps } from '../apps'
import { ConnectWallet } from '../ConnectWallet'
import { ProfileActions } from './ProfileActions'

export const ProfileApps = () => {
  return <AppsRenderer Executor={ProfileAppsExecutor} mode="wallet" />
}

const ProfileAppsExecutor = ({ onClose, data }: AppsRendererExecutorProps) => {
  const { t } = useTranslation()
  const { connected, profile } = useProfile()
  const { chainId } = useChain()

  // Initialized as false, and set to true once transaction atom is set. This
  // tells us to stop loading and show the actions in the modal.
  const [ready, setReady] = useState(false)
  const setWalletTransactionAtom = useSetRecoilState(meTransactionAtom(chainId))

  // Set transaction atom once actions are loaded.
  useEffect(() => {
    if (data.loading || data.errored) {
      return
    }

    setWalletTransactionAtom({
      actions: data.data,
    })
    setReady(true)
  }, [chainId, data, setWalletTransactionAtom])

  return (
    <Modal
      backdropClassName="!z-[39]"
      containerClassName="sm:!max-w-[min(90dvw,64rem)] !w-full"
      footerContainerClassName="flex flex-row justify-end"
      footerContent={
        connected ? (
          <>
            <div className="flex min-w-0 flex-row items-center gap-2">
              {/* Image */}
              <ProfileImage
                imageUrl={profile.loading ? undefined : profile.data.imageUrl}
                loading={profile.loading}
                size="sm"
              />

              {/* Name */}
              <ProfileNameDisplayAndEditor profile={profile} />
            </div>
          </>
        ) : (
          <ConnectWallet size="md" />
        )
      }
      header={{
        title: t('title.reviewTransaction'),
      }}
      onClose={onClose}
      visible
    >
      {data.loading || !ready ? (
        <div className="flex flex-col gap-2">
          <ActionCardLoader />
          <ActionCardLoader />
          <ActionCardLoader />
        </div>
      ) : data.errored ? (
        <ErrorPage error={data.error} />
      ) : (
        <ProfileActions actionsReadOnlyMode />
      )}
    </Modal>
  )
}
