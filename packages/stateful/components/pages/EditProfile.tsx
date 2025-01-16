import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useRecoilState, useSetRecoilState } from 'recoil'

import {
  mergeProfilesVisibleAtom,
  updateProfileNftVisibleAtom,
  walletChainIdAtom,
} from '@dao-dao/state/recoil'
import { Loader, EditProfile as StatelessEditProfile } from '@dao-dao/stateless'
import {
  SITE_URL,
  getConfiguredChainConfig,
  getConfiguredChains,
} from '@dao-dao/utils'

import { useManageProfile, useWallet } from '../../hooks'
import { PageHeaderContent } from '../PageHeaderContent'
import { DisconnectWallet } from '../wallet'

export const EditProfile = () => {
  const router = useRouter()
  const { isWalletConnecting, isWalletConnected } = useWallet()
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

  const setUpdateProfileNftVisible = useSetRecoilState(
    updateProfileNftVisibleAtom
  )
  const setMergeProfilesVisible = useSetRecoilState(mergeProfilesVisibleAtom)

  // If not connecting or connected after 3 seconds, redirect to home.
  useEffect(() => {
    if (isWalletConnecting || isWalletConnected) {
      return
    }

    const timer = setTimeout(() => {
      router.push('/')
    }, 3000)

    return () => clearTimeout(timer)
  }, [isWalletConnected, isWalletConnecting, router])

  return (
    <>
      <NextSeo
        openGraph={{
          url: SITE_URL + router.asPath,
        }}
      />

      <PageHeaderContent />

      {isWalletConnecting || isWalletConnected ? (
        <StatelessEditProfile
          DisconnectWallet={DisconnectWallet}
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
          updateProfile={updateProfile}
        />
      ) : (
        <Loader />
      )}
    </>
  )
}
