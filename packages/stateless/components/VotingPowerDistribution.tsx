import clsx from 'clsx'
import { uniq } from 'lodash'
import { ComponentType, Fragment } from 'react'

import { LoadingData, StatefulEntityDisplayProps } from '@dao-dao/types'
import { DISTRIBUTION_COLORS_ORDERED, formatPercentOf100 } from '@dao-dao/utils'

const NUM_VERTICAL_BARS = 10

export type VotingPowerDistributionEntry = {
  address?: string
  label?: string
  votingPowerPercent: number | LoadingData<number>
  // Group by section. Undefined means no section, which is first.
  section?: number
  // Override default bar color.
  color?: string
}

export type VotingPowerDistributionProps = {
  data: VotingPowerDistributionEntry[]
  EntityDisplay: ComponentType<StatefulEntityDisplayProps>
  className?: string
}

export const VotingPowerDistribution = ({
  data,
  EntityDisplay,
  className,
}: VotingPowerDistributionProps) => {
  const sections = uniq(data.map(({ section }) => section)).map((section) =>
    data.filter((d) => d.section === section)
  )

  return (
    <div
      className={clsx(
        'grid grid-cols-[auto_1fr_auto] items-center gap-x-6 gap-y-1',
        className
      )}
    >
      {sections.map((data, index) => (
        <Fragment key={index}>
          {data.map(({ address, label, votingPowerPercent, color }, index) => {
            const percent =
              typeof votingPowerPercent === 'number'
                ? votingPowerPercent
                : votingPowerPercent.loading
                  ? 0
                  : votingPowerPercent.data

            return (
              <Fragment key={(address || '') + index}>
                {address ? (
                  <EntityDisplay address={address} />
                ) : (
                  label && (
                    <p className="primary-text font-bold text-text-secondary">
                      {label}
                    </p>
                  )
                )}

                <Bar
                  color={
                    color ||
                    DISTRIBUTION_COLORS_ORDERED[
                      index % DISTRIBUTION_COLORS_ORDERED.length
                    ]
                  }
                  percent={percent}
                />

                <p className="caption-text text-right font-mono text-text-tertiary">
                  {typeof votingPowerPercent !== 'number' &&
                  votingPowerPercent.loading
                    ? '...'
                    : formatPercentOf100(percent)}
                </p>
              </Fragment>
            )
          })}

          {/* Space row */}
          {index < sections.length - 1 && (
            <>
              <div></div>
              <Bar color="transparent" percent={0} />
              <div></div>
            </>
          )}
        </Fragment>
      ))}
    </div>
  )
}

type BarProps = {
  color: string
  percent: number
}

const Bar = ({ color, percent }: BarProps) => (
  <div className="relative flex h-8 w-full flex-row items-stretch justify-between">
    {/* Bar color */}
    <div
      className="absolute top-0 bottom-0 left-0"
      style={{
        backgroundColor: color,
        width: formatPercentOf100(percent),
      }}
    ></div>

    {/* Vertical bars */}
    {[...Array(NUM_VERTICAL_BARS)].map((_, index) => (
      <div
        key={index}
        className="-mt-[2px] -mb-[2px] w-[1px] bg-border-secondary"
      ></div>
    ))}
  </div>
)
