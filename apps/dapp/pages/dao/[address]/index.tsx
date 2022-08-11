// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.

import axios from 'axios'
import { getAverageColor } from 'fast-average-color-node'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DaoPageWrapper,
  DaoPageWrapperProps,
  useDaoInfoContext,
} from '@dao-dao/common'
import { makeGetDaoStaticProps } from '@dao-dao/common/server'
import { MemberCheck } from '@dao-dao/icons'
import { useVotingModule } from '@dao-dao/state'
import {
  Breadcrumbs,
  GradientHero,
  MobileMenuTab,
  PageLoader,
  PinToggle,
  SuspenseLoader,
  useThemeContext,
} from '@dao-dao/ui'
import { SITE_URL } from '@dao-dao/utils'
import { useVotingModuleAdapter } from '@dao-dao/voting-module-adapter'

import {
  ContractHeader,
  DaoInfo,
  DaoMobileHeader,
  DaoProposals,
  DaoThinInfo,
  DaoTreasury,
  DaoTreasuryHistory,
  SmallScreenNav,
} from '@/components'
import { usePinnedDAOs } from '@/hooks'

enum MobileMenuTabSelection {
  Proposal,
  Membership,
  Treasury,
  Info,
}

const InnerMobileDaoHome = () => {
  const { t } = useTranslation()
  const {
    components: { Membership },
  } = useVotingModuleAdapter()
  const [tab, setTab] = useState(MobileMenuTabSelection.Proposal)
  const makeTabSetter = (tab: MobileMenuTabSelection) => () => setTab(tab)

  return (
    <div className="flex flex-col gap-2">
      <GradientHero>
        <SmallScreenNav />
        <DaoMobileHeader />
      </GradientHero>
      <div className="flex overflow-auto gap-1 px-6 pb-4 border-b border-inactive no-scrollbar">
        <MobileMenuTab
          icon="🗳"
          onClick={makeTabSetter(MobileMenuTabSelection.Proposal)}
          selected={tab === MobileMenuTabSelection.Proposal}
          text={t('title.proposals')}
        />
        <Membership.MobileTab
          onClick={makeTabSetter(MobileMenuTabSelection.Membership)}
          selected={tab === MobileMenuTabSelection.Membership}
        />
        <MobileMenuTab
          icon="🏛"
          onClick={makeTabSetter(MobileMenuTabSelection.Treasury)}
          selected={tab === MobileMenuTabSelection.Treasury}
          text={t('title.treasury')}
        />
        <MobileMenuTab
          icon="⚙️"
          onClick={makeTabSetter(MobileMenuTabSelection.Info)}
          selected={tab === MobileMenuTabSelection.Info}
          text={t('title.info')}
        />
      </div>
      <div className="py-5 px-6">
        {tab === MobileMenuTabSelection.Proposal && <DaoProposals />}
        {tab === MobileMenuTabSelection.Membership && <Membership.Mobile />}
        {tab === MobileMenuTabSelection.Treasury && (
          <div className="space-y-8">
            <DaoTreasury />
            <DaoTreasuryHistory shortTitle />
          </div>
        )}
        {tab === MobileMenuTabSelection.Info && <DaoInfo hideTreasury />}
      </div>
    </div>
  )
}

const InnerDAOHome = () => {
  const { t } = useTranslation()
  const router = useRouter()

  const { coreAddress, name } = useDaoInfoContext()
  const {
    components: { Membership },
  } = useVotingModuleAdapter()
  const { isMember } = useVotingModule(coreAddress, { fetchMembership: true })

  const { isPinned, setPinned, setUnpinned } = usePinnedDAOs()
  const pinned = isPinned(coreAddress)

  return (
    <div className="flex flex-col items-stretch lg:grid lg:grid-cols-6">
      <div className="col-span-4 min-h-screen">
        <GradientHero>
          <SmallScreenNav />
          <div className="p-6">
            <div className="flex justify-between items-center">
              <Breadcrumbs
                crumbs={[
                  ['/home', t('title.home')],
                  [router.asPath, name],
                ]}
              />
              <div className="flex flex-row gap-4 items-center">
                {isMember && (
                  <div className="flex flex-row gap-2 items-center">
                    <MemberCheck fill="currentColor" width="16px" />
                    <p className="text-sm text-primary">
                      {t('info.youAreMember')}
                    </p>
                  </div>
                )}
                <PinToggle
                  onPin={() => {
                    if (pinned) {
                      setUnpinned(coreAddress)
                    } else {
                      setPinned(coreAddress)
                    }
                  }}
                  pinned={pinned}
                />
              </div>
            </div>

            <ContractHeader />

            <div className="mt-2">
              <DaoThinInfo />
            </div>
            <div className="block mt-4 lg:hidden">
              <Membership.Desktop />
            </div>
            <div className="pt-[22px] pb-[28px] border-b border-inactive">
              <DaoInfo />
            </div>
          </div>
        </GradientHero>
        <div className="px-6 mb-8 space-y-10">
          <DaoProposals />
          <DaoTreasuryHistory />
        </div>
      </div>
      <div className="hidden col-span-2 p-6 w-full h-full min-h-screen lg:block">
        <Membership.Desktop />
      </div>
    </div>
  )
}

interface DaoHomePageProps extends DaoPageWrapperProps {
  accentColor?: string
}

const DaoHomePage: NextPage<DaoHomePageProps> = ({
  accentColor,
  children: _,
  ...props
}) => {
  const { isReady, isFallback } = useRouter()

  const { setAccentColor, theme } = useThemeContext()

  // Only set the accent color if we have enough contrast.
  if (accentColor) {
    const rgb = accentColor
      .replace(/^rgba?\(|\s+|\)$/g, '')
      .split(',')
      .map(Number)
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
    if (
      (theme === 'dark' && brightness < 60) ||
      (theme === 'light' && brightness > 255 - 80)
    ) {
      accentColor = undefined
    }
  }

  useEffect(() => {
    if (!isReady || isFallback) return

    setAccentColor(accentColor)
  }, [accentColor, setAccentColor, isReady, isFallback])

  return (
    <DaoPageWrapper {...props}>
      <SuspenseLoader fallback={<PageLoader />}>
        <div className="block md:hidden">
          <InnerMobileDaoHome />
        </div>
        <div className="hidden md:block">
          <InnerDAOHome />
        </div>
      </SuspenseLoader>
    </DaoPageWrapper>
  )
}

export default DaoHomePage

// Fallback to loading screen if page has not yet been statically generated.
export const getStaticPaths: GetStaticPaths = () => ({
  paths: [],
  fallback: true,
})

export const getStaticProps: GetStaticProps<DaoHomePageProps> =
  makeGetDaoStaticProps({
    getProps: async ({ coreAddress, config: { image_url } }) => {
      const url = `${SITE_URL}/dao/${coreAddress}`

      if (!image_url) {
        return { url }
      }

      try {
        const response = await axios.get(image_url, {
          responseType: 'arraybuffer',
        })
        const buffer = Buffer.from(response.data, 'binary')
        const result = await getAverageColor(buffer)

        return {
          url,
          additionalProps: { accentColor: result.rgb },
        }
      } catch (error) {
        // If fail to load image or get color, don't prevent page render.
        console.error(error)
      }
    },
  })
