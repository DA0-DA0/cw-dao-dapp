import { ArrowUpIcon, LinkIcon } from '@heroicons/react/outline'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'

import { Apr, Dollar, Staked } from '@dao-dao/icons'
import { formatPercentOf100 } from '@dao-dao/utils'

import { HeroStat, HeroStatLink } from './Stat'

const formatZeroes = (num: number) => new Intl.NumberFormat().format(num)

export interface HeroStatsProps {
  data?: {
    denom?: string
    totalSupply?: number
    stakedPercent?: number
    aprReward?: number
    unstakingDuration?: string
    link?: {
      url: string
      title: string
    }
  }
}

export const HeroStats: FC<HeroStatsProps> = ({ data }) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 justify-center items-center py-8 px-6 w-full">
      {(!data ||
        (data.totalSupply !== undefined && data.denom !== undefined)) && (
        <HeroStat
          Icon={Dollar}
          title={t('title.totalSupply') + ':'}
          value={
            data ? `${formatZeroes(data.totalSupply!)} ${data.denom!}` : ''
          }
        />
      )}
      {(!data || data.stakedPercent !== undefined) && (
        <HeroStat
          Icon={Staked}
          title={t('title.staked') + ':'}
          value={data ? formatPercentOf100(data.stakedPercent!) : ''}
        />
      )}
      {(!data || data.unstakingDuration !== undefined) && (
        <HeroStat
          Icon={ArrowUpIcon}
          title={t('title.unstakingPeriod') + '+'}
          value={data ? data.unstakingDuration! : ''}
        />
      )}
      {(!data || data.aprReward !== undefined) && (
        <HeroStat
          Icon={Apr}
          title={t('title.apr') + ':'}
          value={data ? data.aprReward!.toLocaleString() + '%' : ''}
        />
      )}
      {(!data || data.link !== undefined) && (
        <HeroStatLink
          Icon={LinkIcon}
          title={data ? data.link!.title : ''}
          value={data ? data.link!.url : '#'}
        />
      )}
    </div>
  )
}
