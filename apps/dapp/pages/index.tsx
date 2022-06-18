import { ArrowRightIcon } from '@heroicons/react/outline'
import { ArrowNarrowRightIcon } from '@heroicons/react/solid'
import type { NextPage } from 'next'
import Link from 'next/link'
import { ReactNode, useState } from 'react'

import { useTranslation } from '@dao-dao/i18n'
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

import { FeaturedDaos, HomepageCards } from '@/components'

const EnterAppButton = ({ small }: { small?: boolean }) => {
  const { t } = useTranslation('splash')

  return (
    <Link href="/home">
      <a>
        <Button size={small ? 'sm' : 'lg'}>
          {t('cta')}
          <ArrowUpRight color="currentColor" height="10px" width="10px" />
        </Button>
      </a>
    </Link>
  )
}

const AnouncementCard = () => {
  const { t } = useTranslation('splash')

  return (
    <div
      className="flex flex-row flex-wrap gap-2 justify-between py-7 px-8 mx-2 max-w-[780px] rounded"
      style={{
        backgroundImage:
          'linear-gradient(rgba(var(--brand), 0.1), rgba(var(--brand), 0.1)), linear-gradient(rgba(var(--light), 0.7), rgba(var(--light), 0.7))',
      }}
    >
      <div className="flex flex-col gap-1">
        <h3 className="primary-text">{t('whatIsADao')}</h3>
        <p className="body-text">{t('whatIsADaoExplanation')}</p>
      </div>
      <a
        className="flex flex-row gap-1 items-center secondary-text"
        href="https://nickmerrill.substack.com/p/what-are-daos"
        rel="noopener noreferrer"
        target="_blank"
      >
        <p>{t('readMore')}</p>
        <ArrowRightIcon className="w-4 h-3" />
      </a>
    </div>
  )
}

const StatsCard = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-1 items-center px-6 md:px-6">
    {children}
  </div>
)

const Home: NextPage = () => {
  const { t } = useTranslation('splash')

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
        <nav className="py-4 px-6 w-full bg-clip-padding bg-opacity-40 border-b border-inactive backdrop-blur-xl backdrop-filter">
          <div className="flex justify-between items-center mx-auto max-w-screen-lg">
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
            <div className="flex gap-4 items-center">
              <a
                className="flex gap-2 items-center"
                href="https://docs.daodao.zone"
              >
                {t('documentation')}
                <ArrowUpRight color="currentColor" height="10px" width="10px" />
              </a>
              <div className="hidden md:block">
                <EnterAppButton small />
              </div>
            </div>
          </div>
        </nav>
        <h1 className="mt-16 text-center md:mt-[33vh] hero-text">
          {t('shortTagline')}
        </h1>
        <p className="px-4 my-10 mx-auto max-w-lg text-lg text-center text-secondary">
          {t('longTagline')}
        </p>
        <div className="mx-auto">
          <EnterAppButton />
        </div>
        <div className="my-12 mx-auto md:my-20">
          <AnouncementCard />
        </div>

        <FeaturedDaos />

        <div className="flex flex-col grid-cols-3 gap-6 justify-around py-6 divide-focus md:grid md:gap-3 md:py-8 md:divide-x">
          <StatsCard>
            <h3 className="header-text">
              {tvl ? '$' + tvl.toLocaleString() : 'loading..'}
            </h3>
            <p className="caption-text">{t('usdcTotalValue')}</p>
          </StatsCard>
          <StatsCard>
            <h3 className="header-text">
              {daos ? daos.toLocaleString() : 'loading..'}
            </h3>
            <p className="caption-text">{t('daosCreated')}</p>
          </StatsCard>
          <StatsCard>
            <h3 className="header-text">
              {proposals ? proposals.toLocaleString() : 'loading..'}
            </h3>
            <p className="caption-text">{t('proposalsCreated')}</p>
          </StatsCard>
        </div>

        <div className="px-3 -mt-8">
          <div className="flex gap-4 justify-center mt-12 w-full md:px-3 md:mt-28">
            <RotatableLogo initialRotation={135} />
            <RotatableLogo initialRotation={90} />
            <RotatableLogo initialRotation={45} />
          </div>
          <h2 className="px-4 mt-12 w-full text-center header-text">
            {t('transparentGovernanceOnChain')}
          </h2>
          <p className="px-4 mx-auto mt-4 max-w-xl text-center text-tertiary primary-text">
            {t('transparencyExplanation')}
          </p>
          <div className="mt-12">
            <HomepageCards />
          </div>
          <div className="flex flex-col gap-4 items-center my-12">
            <h2 className="mx-4 max-w-xl text-center header-text">
              {t('createExploreJoin')}
            </h2>
            <Link href="/home">
              <a>
                <Button size={'lg'}>
                  {t('cta')}
                  <ArrowUpRight
                    color="currentColor"
                    height="10px"
                    width="10px"
                  />
                </Button>
              </a>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 my-10 font-mono md:grid-cols-3 caption-text">
            <div className="flex flex-wrap gap-6 items-center mx-2 text-xs">
              <p>DAO DAO v{process.env.NEXT_PUBLIC_DAO_DAO_VERSION}</p>
              <a
                className="hover:text-primary transition"
                href="https://www.junonetwork.io/"
                rel="noreferrer"
                target="_blank"
              >
                {t('poweredByJuno')}
                <ArrowNarrowRightIcon
                  className="inline mb-0.5 w-6 h-4 font-light"
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
