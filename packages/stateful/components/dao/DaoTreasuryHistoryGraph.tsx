import {
  CategoryScale,
  ChartDataset,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  TooltipModel,
} from 'chart.js'
import clsx from 'clsx'
import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useTranslation } from 'react-i18next'

import {
  Loader,
  WarningCard,
  useCachedLoadingWithError,
  useDaoInfoContext,
  useNamedThemeColor,
} from '@dao-dao/stateless'
import {
  DISTRIBUTION_COLORS,
  formatDate,
  transformIbcSymbol,
} from '@dao-dao/utils'

import { daoTreasuryValueHistorySelector } from '../../recoil'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export type DaoTreasuryHistoryGraphProps = {
  className?: string
}

export const DaoTreasuryHistoryGraph = ({
  className,
}: DaoTreasuryHistoryGraphProps) => {
  const { t } = useTranslation()
  const { chainId, coreAddress } = useDaoInfoContext()

  const textColor = useNamedThemeColor('text-tertiary')
  const borderColor = useNamedThemeColor('border-primary')

  // TODO(treasury-history): make these configurable
  // Initialize to 30 days ago.
  const [startTimeUnixMs, _setStartTimeUnixMs] = useState(
    () => -30 * 24 * 60 * 60 * 1000
  )
  // Initialize to 4 hours.
  const [intervalMs, _setIntervalMs] = useState(() => 4 * 60 * 60 * 1000)

  const treasuryValueHistory = useCachedLoadingWithError(
    daoTreasuryValueHistorySelector({
      chainId,
      coreAddress,
      startTimeUnixMs,
      intervalMs,
    })
  )

  const datasets: ChartDataset<'line', (number | null)[]>[] =
    treasuryValueHistory.loading || treasuryValueHistory.errored
      ? []
      : [
          ...treasuryValueHistory.data.tokens.flatMap(
            ({ symbol, values, currentValue }) => {
              // If all values are null/0, do not include this token.
              if (!values.every((d) => !d) && !currentValue) {
                return []
              }

              return {
                order: 2,
                label: '$' + transformIbcSymbol(symbol).tokenSymbol + ' Value',
                data: [...values, currentValue],
              }
            }
          ),
          // Total value.
          {
            order: 1,
            label: t('title.totalValue'),
            data: [
              ...treasuryValueHistory.data.total.values,
              treasuryValueHistory.data.total.currentValue,
            ],
          },
        ].map((data, index) => ({
          ...data,

          borderColor: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
          backgroundColor:
            DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],

          pointRadius: 2.5,

          // Accentuate the total.
          ...(data.order === 1 && {
            pointRadius: 4,
          }),
        }))

  const [tooltipData, setTooltipData] = useState<TooltipModel<'line'>>()

  return (
    <div
      className={clsx('relative flex max-h-[20rem] flex-col gap-4', className)}
    >
      {treasuryValueHistory.loading ? (
        <Loader />
      ) : treasuryValueHistory.errored ? (
        <WarningCard
          className="mx-8 my-4"
          content={
            treasuryValueHistory.error instanceof Error
              ? treasuryValueHistory.error.message
              : `${treasuryValueHistory.error}`
          }
        />
      ) : (
        <Line
          data={{
            labels: [
              ...treasuryValueHistory.data.timestamps.map((timestamp) =>
                formatDate(timestamp)
              ),
              t('title.now'),
            ],
            datasets,
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            // animation: false,
            plugins: {
              title: {
                display: false,
              },
              tooltip: {
                // Show all x-axis values in one tooltip.
                mode: 'index',
                enabled: false,
                external: ({ tooltip }) =>
                  setTooltipData(tooltip.opacity === 0 ? undefined : tooltip),
                callbacks: {
                  label: (item) =>
                    `${item.dataset.label}: $${Number(item.raw).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}`,
                },
              },
            },
            scales: {
              x: {
                display: true,
                ticks: {
                  color: textColor,
                },
                grid: {
                  color: borderColor,
                  tickColor: 'transparent',
                },
              },
              y: {
                display: true,
                title: {
                  text: 'Est. USD Value',
                  display: true,
                  color: textColor,
                },
                ticks: {
                  color: textColor,
                },
                grid: {
                  color: borderColor,
                  tickColor: 'transparent',
                },
              },
            },
          }}
        />
      )}

      {tooltipData && (
        <div
          className="absolute flex animate-fade-in flex-col gap-1 rounded-md border border-border-component-primary bg-component-tooltip py-2 px-3 text-text-component-primary"
          style={{
            left: tooltipData.x,
            top: tooltipData.y,
          }}
        >
          <p className="!primary-text mb-1">{tooltipData.title}</p>

          {[...tooltipData.dataPoints]
            .sort((a, b) => Number(b.raw) - Number(a.raw))
            .map((point, index) => (
              <div
                key={index}
                className="flex flex-row items-center justify-between gap-6"
              >
                <div className="flex flex-row items-center gap-2">
                  <div
                    className="h-4 w-6"
                    style={{
                      borderColor: point.dataset.borderColor as string,
                      backgroundColor: point.dataset.backgroundColor as string,
                    }}
                  />
                  <p className="secondary-text">{point.dataset.label}:</p>
                </div>

                <p className="font-mono">
                  $
                  {Number(point.raw).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
