import { ArrowNarrowRightIcon } from '@heroicons/react/solid'
import type { GetStaticProps, NextPage } from 'next'
import Link from 'next/link'
import { useState } from 'react'

import { useTranslation } from '@dao-dao/i18n'
import { serverSideTranslations } from '@dao-dao/i18n/serverSideTranslations'
import { ArrowUpRight } from '@dao-dao/icons'
import {
  Button,
  GradientWrapper,
  LoadingScreen,
  Logo,
  RotatableLogo,
  SuspenseLoader,
} from '@dao-dao/ui'
import { SITE_TITLE } from '@dao-dao/utils'

import {
  AnouncementCard,
  EnterAppButton,
  FeaturedDaos,
  HomepageCards,
  StatsCard,
} from '@/components'

const Home: NextPage = () => {
  const { t } = useTranslation()

  const [tvl, setTVL] = useState<string | undefined>(undefined)
  const [daos, setDaos] = useState<string | undefined>(undefined)
  const [proposals, setProposals] = useState<string | undefined>(undefined)

  fetch('https://dao-stats.withoutdoing.com/mainnet/balances.json')
    .then((response) => response.json())
    .then((data) => setTVL(data[data.length - 1].value))
  fetch('https://dao-stats.withoutdoing.com/mainnet/count.json')
    .then((response) => response.json())
    .then((data) => setDaos(data[data.length - 1].value))
  fetch('https://dao-stats.withoutdoing.com/mainnet/proposals.json')
    .then((response) => response.json())
    .then((data) => setProposals(data[data.length - 1].value))

  return (
    <SuspenseLoader fallback={<LoadingScreen />}>
      <GradientWrapper>
        <nav className="w-full border-b border-inactive bg-opacity-40 bg-clip-padding py-4 px-6 backdrop-blur-xl backdrop-filter">
          <div className="mx-auto flex max-w-screen-lg items-center justify-between">
            <Link href="/" passHref>
              <a className="flex items-center">
                <div className="mr-3">
                  <Logo alt={`${SITE_TITLE} Logo`} height={32} width={32} />
                </div>
                <p className="mr-1 font-medium">DAO</p>
                <p
                  className="font-semibold text-secondary"
                  style={{ transform: 'scaleY(-1) scaleX(-1)' }}
                >
                  DAO
                </p>
              </a>
            </Link>
            <div className="flex items-center gap-4">
              <a
                className="flex items-center gap-2"
                href="https://docs.daodao.zone"
              >
                {t('splash.documentation')}
                <ArrowUpRight color="currentColor" height="10px" width="10px" />
              </a>
              <div className="hidden md:block">
                <EnterAppButton small />
              </div>
            </div>
          </div>
        </nav>
        <h1 className="hero-text mt-16 text-center md:mt-[33vh]">
          {t('splash.shortTagline')}
        </h1>
        <p className="my-10 mx-auto max-w-lg px-4 text-center text-lg text-secondary">
          {t('splash.longTagline')}
        </p>
        <div className="mx-auto">
          <EnterAppButton />
        </div>
        <div className="my-12 mx-auto md:my-20">
          <AnouncementCard />
        </div>

        <FeaturedDaos />

        <div className="flex grid-cols-3 flex-col justify-around gap-6 divide-focus py-6 md:grid md:gap-3 md:divide-x md:py-8">
          <StatsCard>
            <h3 className="header-text">
              {tvl ? '$' + tvl.toLocaleString() : t('info.loading')}
            </h3>
            <p className="caption-text">{t('splash.usdcTotalValue')}</p>
          </StatsCard>
          <StatsCard>
            <h3 className="header-text">
              {daos ? daos.toLocaleString() : t('info.loading')}
            </h3>
            <p className="caption-text">{t('splash.daosCreated')}</p>
          </StatsCard>
          <StatsCard>
            <h3 className="header-text">
              {proposals ? proposals.toLocaleString() : t('info.loading')}
            </h3>
            <p className="caption-text">{t('splash.proposalsCreated')}</p>
          </StatsCard>
        </div>

        <div className="-mt-8 px-3">
          <div className="mt-12 flex w-full justify-center gap-4 md:mt-28 md:px-3">
            <RotatableLogo initialRotation={135} />
            <RotatableLogo initialRotation={90} />
            <RotatableLogo initialRotation={45} />
          </div>
          <h2 className="header-text mt-12 w-full px-4 text-center">
            {t('splash.transparentGovernanceOnChain')}
          </h2>
          <p className="primary-text mx-auto mt-4 max-w-xl px-4 text-center text-tertiary">
            {t('splash.transparencyExplanation')}
          </p>
          <div className="mt-12">
            <HomepageCards />
          </div>
          <div className="my-12 flex flex-col items-center gap-4">
            <h2 className="header-text mx-4 max-w-xl text-center">
              {t('splash.createExploreJoin')}
            </h2>
            <Link href="/home">
              <a>
                <Button size="lg">
                  {t('splash.cta')}
                  <ArrowUpRight
                    color="currentColor"
                    height="10px"
                    width="10px"
                  />
                </Button>
              </a>
            </Link>
          </div>
          <div className="caption-text my-10 grid grid-cols-1 gap-2 font-mono md:grid-cols-3">
            <div className="mx-2 flex flex-wrap items-center gap-6 text-xs">
              <p>
                {t('info.productVersion', {
                  versionNumber: process.env.NEXT_PUBLIC_DAO_DAO_VERSION,
                })}
              </p>
              <a
                className="transition hover:text-primary"
                href="https://www.junonetwork.io/"
                rel="noreferrer"
                target="_blank"
              >
                {t('splash.poweredByJuno')}
                <ArrowNarrowRightIcon
                  className="mb-0.5 inline h-4 w-6 font-light"
                  style={{ transform: 'rotateY(0deg) rotate(-45deg)' }}
                />
              </a>
            </div>
          </div>
        </div>
      </GradientWrapper>
    </SuspenseLoader>
  )
}

export default Home

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['translation'])),
  },
})
