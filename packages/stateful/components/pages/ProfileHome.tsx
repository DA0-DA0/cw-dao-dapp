import {
  ExtensionRounded,
  GroupRounded,
  WalletRounded,
  WebRounded,
} from '@mui/icons-material'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecoilState, useSetRecoilState } from 'recoil'

import {
  averageColorSelector,
  mergeProfilesVisibleAtom,
  updateProfileNftVisibleAtom,
  walletChainIdAtom,
} from '@dao-dao/state/recoil'
import {
  ChainProvider,
  PageLoader,
  ProfileHome as StatelessProfileHome,
  useCachedLoadable,
  useThemeContext,
} from '@dao-dao/stateless'
import { AccountTab, AccountTabId, Theme } from '@dao-dao/types'
import { getConfiguredChainConfig, getConfiguredChains } from '@dao-dao/utils'

import { WalletActionsProvider } from '../../actions/providers/wallet'
import { useManageProfile } from '../../hooks'
import { useWallet } from '../../hooks/useWallet'
import {
  ProfileActions,
  ProfileApps,
  ProfileDaos,
  ProfileWallet,
} from '../profile'
import { SuspenseLoader } from '../SuspenseLoader'

export const ProfileHome = () => {
  const { t } = useTranslation()
  const router = useRouter()

  const tabs: AccountTab[] = [
    {
      id: AccountTabId.Daos,
      label: t('title.daos'),
      Icon: GroupRounded,
      Component: ProfileDaos,
    },
    {
      id: AccountTabId.Wallet,
      label: t('title.wallet'),
      Icon: WalletRounded,
      Component: ProfileWallet,
    },
    {
      id: AccountTabId.Actions,
      label: t('title.actions'),
      Icon: ExtensionRounded,
      Component: ProfileActions,
    },
    {
      id: AccountTabId.Apps,
      label: t('title.apps'),
      Icon: WebRounded,
      Component: ProfileApps,
    },
  ]

  const { address: walletAddress } = useWallet()
  const {
    profile,
    updateProfile: { go: updateProfile },
    merge: { options: profileMergeOptions },
  } = useManageProfile()

  const [walletChainId, setWalletChainId] = useRecoilState(walletChainIdAtom)
  // Switch to a valid chain if not configured.
  const configuredChainConfig = getConfiguredChainConfig(walletChainId)
  useEffect(() => {
    if (!configuredChainConfig) {
      setWalletChainId(getConfiguredChains()[0].chainId)
    }
  }, [configuredChainConfig, setWalletChainId])

  const { setAccentColor, theme } = useThemeContext()
  // Get average color of image URL.
  const averageImgColorLoadable = useCachedLoadable(
    profile.loading ? undefined : averageColorSelector(profile.data.imageUrl)
  )

  const setUpdateProfileNftVisible = useSetRecoilState(
    updateProfileNftVisibleAtom
  )
  const setMergeProfilesVisible = useSetRecoilState(mergeProfilesVisibleAtom)

  // Set theme's accentColor.
  useEffect(() => {
    if (router.isFallback || averageImgColorLoadable.state !== 'hasValue') {
      return
    }

    const accentColor = averageImgColorLoadable.contents

    // Only set the accent color if we have enough contrast.
    if (accentColor) {
      const rgb = accentColor
        .replace(/^rgba?\(|\s+|\)$/g, '')
        .split(',')
        .map(Number)
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
      if (
        (theme === Theme.Dark && brightness < 100) ||
        (theme === Theme.Light && brightness > 255 - 100)
      ) {
        setAccentColor(undefined)
        return
      }
    }

    setAccentColor(accentColor ?? undefined)
  }, [
    setAccentColor,
    router.isFallback,
    theme,
    averageImgColorLoadable.state,
    averageImgColorLoadable.contents,
  ])

  return (
    <>
      {!configuredChainConfig ? (
        <PageLoader />
      ) : (
        // Refresh all children when chain changes since state varies by chain.
        <ChainProvider key={walletChainId} chainId={walletChainId}>
          <StatelessProfileHome
            SuspenseLoader={SuspenseLoader}
            WalletActionsProvider={WalletActionsProvider}
            mergeProfileType={
              profileMergeOptions.length === 0
                ? undefined
                : profileMergeOptions.length === 1
                  ? 'add'
                  : 'merge'
            }
            openMergeProfilesModal={() => setMergeProfilesVisible(true)}
            openProfileNftUpdate={() => setUpdateProfileNftVisible(true)}
            profile={profile}
            tabs={tabs}
            updateProfile={updateProfile}
            walletAddress={walletAddress}
          />
        </ChainProvider>
      )}
    </>
  )
}
