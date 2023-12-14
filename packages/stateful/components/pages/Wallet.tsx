import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecoilValue } from 'recoil'

import {
  averageColorSelector,
  walletHexPublicKeySelector,
} from '@dao-dao/state/recoil'
import {
  ChainProvider,
  CopyableAddress,
  ErrorPage,
  Loader,
  PageHeaderContent,
  RightSidebarContent,
  TooltipInfoIcon,
  WalletProfileHeader,
  useCachedLoadable,
  useCachedLoadingWithError,
  useThemeContext,
} from '@dao-dao/stateless'
import { Theme } from '@dao-dao/types'
import {
  SITE_URL,
  getConfiguredChainConfig,
  getConfiguredChains,
  getWalletPath,
  transformBech32Address,
} from '@dao-dao/utils'

import { walletProfileDataSelector } from '../../recoil'
import { ButtonLink } from '../ButtonLink'
import { ChainSwitcher } from '../ChainSwitcher'
import { LazyNftCard } from '../nft'
import { ProfileHomeCard } from '../profile'
import { SuspenseLoader } from '../SuspenseLoader'
import { TreasuryHistoryGraph } from '../TreasuryHistoryGraph'
import { WalletBalances } from '../wallet'

export const Wallet: NextPage = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const { chain, address } = router.query || {}

  const configuredChain = getConfiguredChains().find(
    ({ name }) => name === chain
  )
  const walletAddress = typeof address === 'string' ? address : undefined

  if (!configuredChain || !walletAddress) {
    throw new Error('Unsupported chain or address.')
  }

  const hexPublicKey = useCachedLoadingWithError(
    walletHexPublicKeySelector({
      chainId: configuredChain.chain.chain_id,
      walletAddress,
    })
  )

  const profileData = useRecoilValue(
    walletProfileDataSelector({
      chainId: configuredChain.chain.chain_id,
      address: walletAddress,
    })
  )

  const { setAccentColor, theme } = useThemeContext()
  // Get average color of image URL.
  const averageImgColorLoadable = useCachedLoadable(
    profileData.loading
      ? undefined
      : averageColorSelector(profileData.profile.imageUrl)
  )

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

  const [goingToChainId, setGoingToChainId] = useState<string>()

  return (
    <>
      <NextSeo
        description={t('info.walletPageDescription', {
          address: walletAddress,
        })}
        openGraph={{
          url: SITE_URL + router.asPath,
          title: t('title.wallet') + ': ' + walletAddress,
          description: t('info.walletPageDescription', {
            address: walletAddress,
          }),
        }}
        title={t('title.wallet') + ': ' + walletAddress}
      />

      <RightSidebarContent>
        <ProfileHomeCard />
      </RightSidebarContent>
      <PageHeaderContent
        className="mx-auto max-w-5xl"
        gradient
        rightNode={
          <ChainSwitcher
            chainId={configuredChain.chain.chain_id}
            loading={
              !!goingToChainId &&
              goingToChainId !== configuredChain.chain.chain_id
            }
            onSelect={(chainId) => {
              const chainConfig = getConfiguredChainConfig(chainId)
              if (chainConfig) {
                router.push(
                  getWalletPath(
                    chainId,
                    transformBech32Address(walletAddress, chainId)
                  )
                )
                setGoingToChainId(chainId)
              }
            }}
            type="configured"
          />
        }
        title={t('title.wallet')}
      />

      <div className="mx-auto flex max-w-5xl flex-col items-stretch gap-6">
        {!hexPublicKey.loading &&
        (hexPublicKey.errored || !hexPublicKey.data) ? (
          <ErrorPage title={t('error.couldntFindWallet')}>
            <ButtonLink href="/" variant="secondary">
              {t('button.returnHome')}
            </ButtonLink>
          </ErrorPage>
        ) : (
          <ChainProvider chainId={configuredChain.chain.chain_id}>
            <WalletProfileHeader editable={false} profileData={profileData}>
              <CopyableAddress address={walletAddress} />
            </WalletProfileHeader>

            <SuspenseLoader fallback={<Loader />}>
              <TreasuryHistoryGraph
                address={walletAddress}
                chainId={configuredChain.chain.chain_id}
                className="mb-4 rounded-md bg-background-tertiary p-6 sm:mb-8"
                header={
                  <div className="flex flex-row items-center justify-center gap-1">
                    <p className="title-text">{t('title.treasuryValue')}</p>

                    <TooltipInfoIcon
                      size="sm"
                      title={t('info.treasuryValueTooltip')}
                    />
                  </div>
                }
              />

              <WalletBalances
                NftCard={LazyNftCard}
                address={walletAddress}
                chainId={configuredChain.chain.chain_id}
                chainMode="current"
                editable={false}
                hexPublicKey={
                  hexPublicKey.loading ||
                  hexPublicKey.errored ||
                  !hexPublicKey.data
                    ? { loading: true }
                    : {
                        loading: false,
                        updating: hexPublicKey.updating,
                        data: hexPublicKey.data,
                      }
                }
              />
            </SuspenseLoader>
          </ChainProvider>
        )}
      </div>
    </>
  )
}
