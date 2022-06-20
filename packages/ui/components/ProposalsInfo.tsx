import clsx from 'clsx'
import { ComponentType, FC } from 'react'

import { useTranslation } from '@dao-dao/i18n'
import { Dollar, Pie } from '@dao-dao/icons'

export interface ProposalsInfoProps {
  data?: {
    denom: string
    macroDeposit: string
    depositRefunds: boolean
    passingThresholdString: string
    quorumString?: string
  }
  className?: string
}

export const ProposalsInfo: FC<ProposalsInfoProps> = ({ data, className }) => {
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        'flex flex-wrap gap-x-8 gap-y-4 justify-around items-center p-5 rounded border border-inactive',
        className
      )}
    >
      <ProposalInfoStat
        Icon={Dollar}
        title={t('Proposal deposit')}
        value={data?.macroDeposit ?? ''}
      />
      <ProposalInfoStat
        Icon={Dollar}
        title={t('Proposal deposit refund')}
        value={data ? (data.depositRefunds ? 'Yes' : 'No') : ''}
      />
      <ProposalInfoStat
        Icon={Pie}
        title={t('Passing threshold')}
        value={data?.passingThresholdString ?? ''}
      />
      <ProposalInfoStat
        Icon={Pie}
        title={t('Quorum')}
        value={data?.quorumString ?? ''}
      />
    </div>
  )
}

export const ProposalsInfoLoader: FC = () => <ProposalsInfo />

interface ProposalInfoStatProps {
  Icon: ComponentType<{ className: string }>
  title: string
  value: string
}

const ProposalInfoStat: FC<ProposalInfoStatProps> = ({
  Icon,
  value,
  title,
}) => (
  <div className="flex gap-3 items-center">
    <Icon className="h-3 fill-current secondary-text" />
    <div className="flex gap-2 items-center">
      <span className="secondary-text">{title}</span>
      <span className="link-text">{value ? value : '..'}</span>
    </div>
  </div>
)
