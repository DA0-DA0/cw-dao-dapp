import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  TooltipModel,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import clsx from 'clsx'
import { enUS } from 'date-fns/locale'
import { useRef, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { useTranslation } from 'react-i18next'
import useDeepCompareEffect from 'use-deep-compare-effect'

import { treasuryValueHistorySelector } from '@dao-dao/state'
import {
  Loader,
  SegmentedControls,
  StatusCard,
  useCachedLoadingWithError,
  useNamedThemeColor,
} from '@dao-dao/stateless'
import {
  AccountType,
  TokenPriceHistoryRange,
  TreasuryHistoryGraphProps,
} from '@dao-dao/types'
import {
  DISTRIBUTION_COLORS,
  formatDateTimeTz,
  formatPercentOf100,
  serializeTokenSource,
  shortenTokenSymbol,
  tokenSourcesEqual,
} from '@dao-dao/utils'

import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

// TODO(rebalancer): add way to set base price denom to use instead of USD
export const TreasuryHistoryGraph = ({
  chainId,
  address,
  account,
  showRebalancer = false,
  className,
  graphClassName,
  registerTokenColors,
  header,
}: TreasuryHistoryGraphProps) => {
  const { t } = useTranslation()

  const textColor = useNamedThemeColor('text-tertiary')
  const borderColor = useNamedThemeColor('border-primary')
  const brandColor = useNamedThemeColor('text-brand')
  const verticalLineColor = useNamedThemeColor('component-badge-valid')

  const [range, setRange] = useState<TokenPriceHistoryRange>(
    TokenPriceHistoryRange.Day
  )

  const treasuryValueHistory = useCachedLoadingWithError(
    treasuryValueHistorySelector({
      chainId,
      address,
      range,
      filter: account && {
        account: {
          type: account.type,
          chainId: account.chainId,
          address: account.address,
        },
        // Filter by rebalancer tokens.
        tokens:
          showRebalancer && account.type === AccountType.Valence
            ? account.config.rebalancer?.targets.map(
                ({ token: { chainId, type, denomOrAddress } }) => ({
                  chainId,
                  type,
                  denomOrAddress,
                })
              )
            : undefined,
      },
    })
  )

  // Map serialized token source to color.
  const tokenColors =
    treasuryValueHistory.loading || treasuryValueHistory.errored
      ? {}
      : treasuryValueHistory.data.tokens.reduce(
          (acc, { token }, index) => ({
            ...acc,
            [serializeTokenSource(token)]:
              DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
          }),
          {} as Record<string, string>
        )

  // Register token colors.
  useDeepCompareEffect(() => {
    registerTokenColors?.(tokenColors)
  }, [tokenColors])

  const tokenValues =
    treasuryValueHistory.loading || treasuryValueHistory.errored
      ? []
      : treasuryValueHistory.data.tokens.flatMap(({ token, values }) => {
          // If all values are null/0, do not include this token.
          if (!values.some((d) => d)) {
            return []
          }

          return {
            token,
            order: 2,
            label:
              '$' +
              shortenTokenSymbol(token.symbol).tokenSymbol +
              ' ' +
              t('title.value'),
            data: values,
            borderColor: tokenColors[serializeTokenSource(token)],
            backgroundColor: tokenColors[serializeTokenSource(token)],
            borderWidth: 2.5,
          }
        })

  const showTargets =
    !!account &&
    account.type === AccountType.Valence &&
    !!account.config.rebalancer?.targets.length &&
    showRebalancer &&
    !treasuryValueHistory.loading &&
    !treasuryValueHistory.errored

  // Show targets if rebalancer configured account.
  const targetValues = !showTargets
    ? []
    : (account.config.rebalancer?.targets || []).flatMap(
        ({ token, targets }) => {
          if (targets.length === 0) {
            return []
          }

          const data = treasuryValueHistory.data.timestamps.map(
            (_timestamp, timestampIndex) => {
              // Find first target that is after this timestamp so we can
              // choose the most recent target before it.
              let nextTargetIndex = targets.findIndex(
                (target) => target.timestamp > _timestamp.getTime()
              )
              const targetIndex =
                nextTargetIndex === -1
                  ? // If all targets are before, use last one.
                    targets.length - 1
                  : // If all targets are after, no target for this timestamp.
                    nextTargetIndex === 0
                    ? undefined
                    : // Otherwise use the previous one.
                      nextTargetIndex - 1
              if (targetIndex === undefined) {
                return null
              }

              // Get total value at this point in time.
              const totalValue =
                treasuryValueHistory.data.totals[timestampIndex]
              if (totalValue === null) {
                return null
              }

              const { percentage } = targets[targetIndex]

              // The target at this point is based on the total value.
              return totalValue * Number(percentage)
            }
          )

          return {
            token,
            order: 3,
            label:
              '$' +
              shortenTokenSymbol(token.symbol).tokenSymbol +
              ' ' +
              t('title.target'),
            data,
            borderDash: [2.5, 2.5],
            borderColor: tokenColors[serializeTokenSource(token)],
            backgroundColor: tokenColors[serializeTokenSource(token)],
            pointRadius: 0,
            pointHitRadius: 0,
            borderWidth: 2.5,
          }
        }
      )

  const totalValues =
    treasuryValueHistory.loading || treasuryValueHistory.errored
      ? []
      : [
          {
            token: undefined,
            order: 1,
            label: t('title.totalValue'),
            data: treasuryValueHistory.data.totals,
            borderColor: brandColor,
            backgroundColor: brandColor,
            borderWidth: 5,
          },
        ]

  const datasets = [...tokenValues, ...targetValues, ...totalValues]

  const [tooltipData, setTooltipData] = useState<TooltipModel<'line'>>()
  // Contains information on the data point that is currently hovered. Can be
  // used to retrieve the timestamp value (`.parsed.x`) and index in the dataset
  // (`.dataIndex`).
  const tooltipFirstDataPoint = tooltipData?.dataPoints[0]
  const tooltipTotalValue =
    tooltipData &&
    (tooltipData.dataPoints.find(
      ({ datasetIndex }) => datasetIndex === datasets.length - 1
    )?.raw as number | undefined)

  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {header}

      <div
        className={clsx('relative flex flex-col gap-4', graphClassName)}
        ref={containerRef}
      >
        <Line
          data={{
            labels:
              treasuryValueHistory.loading || treasuryValueHistory.errored
                ? []
                : treasuryValueHistory.data.timestamps.map((timestamp) =>
                    timestamp.getTime()
                  ),
            datasets,
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            elements: {
              point: {
                radius: 0,
                hoverRadius: 0,
                hitRadius: 0,
              },
            },
            plugins: {
              title: {
                display: false,
              },
              legend: {
                position: 'top',
                labels: {
                  filter: (item) => item.text.endsWith(' Value'),
                },
              },
              tooltip: {
                // Show all x-axis values in one tooltip.
                mode: 'index',
                enabled: false,
                // Show when hover on any part of the graph, not just a point.
                intersect: false,
                external: ({ tooltip }) => {
                  const shouldHide =
                    !tooltip.opacity || tooltip.dataPoints.length === 0
                  // Only update if we need to hide or the data point .
                  if (
                    // Needs to hide.
                    (shouldHide && !!tooltipData) ||
                    // Needs to show.
                    (!shouldHide &&
                      // Either nothing set or the data point is different.
                      (!tooltipFirstDataPoint ||
                        tooltip.dataPoints[0].dataIndex !==
                          tooltipFirstDataPoint.dataIndex))
                  ) {
                    setTooltipData(
                      tooltip.opacity === 0 || !tooltip.dataPoints[0]
                        ? undefined
                        : ({ ...tooltip } as any)
                    )
                  }
                },
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
              // Show vertical line when hovering over a timestamp and showing
              // the tooltip.
              annotation: tooltipFirstDataPoint && {
                annotations: {
                  verticalLine: {
                    type: 'line',
                    borderColor: verticalLineColor,
                    borderWidth: 2,
                    scaleID: 'x',
                    value: tooltipFirstDataPoint.parsed.x,
                  },
                },
              },
            },
            scales: {
              x: {
                display: true,
                ticks: {
                  color: textColor,
                  source:
                    treasuryValueHistory.loading ||
                    treasuryValueHistory.errored ||
                    treasuryValueHistory.data.timestamps.length === 0
                      ? 'labels'
                      : 'auto',
                },
                grid: {
                  color: borderColor,
                  tickColor: 'transparent',
                },
                type: 'time',
                adapters: {
                  date: {
                    locale: enUS,
                  },
                },
                time: {
                  minUnit: 'day',
                },
              },
              y: {
                display: true,
                title: {
                  text: t('title.estUsdValue'),
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

        {treasuryValueHistory.loading || treasuryValueHistory.updating ? (
          <div className="absolute top-0 bottom-0 right-0 left-0 flex animate-fade-in items-center justify-center">
            <div className="flex flex-col items-center rounded-md bg-component-tooltip-glass p-4 backdrop-blur-sm">
              <Loader size={32} />
            </div>
          </div>
        ) : treasuryValueHistory.errored ? (
          <div className="absolute top-0 bottom-0 right-0 left-0 flex animate-fade-in items-center justify-center">
            <StatusCard
              className="max-w-lg bg-background-primary"
              content={
                treasuryValueHistory.error instanceof Error
                  ? treasuryValueHistory.error.message
                  : `${treasuryValueHistory.error}`
              }
              style="warning"
              textClassName="break-words"
            />
          </div>
        ) : treasuryValueHistory.data.timestamps.length === 0 ? (
          <div className="absolute top-0 bottom-0 right-0 left-0 flex animate-fade-in items-center justify-center">
            <StatusCard
              className="max-w-lg bg-background-primary"
              content={t('error.noTreasuryHistory')}
              style="warning"
              textClassName="break-words"
            />
          </div>
        ) : null}

        {tooltipData && tooltipFirstDataPoint !== undefined && (
          <div
            className="pointer-events-none absolute z-10 flex w-max animate-fade-in flex-col gap-4 rounded-md border border-border-secondary bg-component-tooltip-glass p-4 text-text-component-primary backdrop-blur-sm sm:gap-2"
            ref={tooltipRef}
            style={{
              // Bias the x coordinate towards the center of the screen.
              left:
                !containerRef.current || !tooltipRef.current
                  ? tooltipData.x
                  : containerRef.current.clientWidth / 2 -
                    tooltipRef.current.clientWidth *
                      (1 -
                        tooltipFirstDataPoint.dataIndex /
                          tooltipFirstDataPoint.dataset.data.length),
              top: tooltipData.y,
            }}
          >
            <p className="!primary-text mb-1">
              {
                // This should always be defined if the tooltip is shown, but
                // fallback to title just in case.
                tooltipFirstDataPoint
                  ? formatDateTimeTz(new Date(tooltipFirstDataPoint.parsed.x))
                  : tooltipData.title
              }
            </p>

            {[
              totalValues[0],
              ...tokenValues.sort(
                (a, b) =>
                  Number(b.data[tooltipFirstDataPoint.dataIndex]) -
                  Number(a.data[tooltipFirstDataPoint.dataIndex])
              ),
            ].flatMap(
              (
                {
                  token,
                  data,
                  label,
                  borderWidth,
                  borderColor,
                  backgroundColor,
                },
                index
              ) => {
                const value = data[tooltipFirstDataPoint.dataIndex]
                if (value === null) {
                  return
                }

                const targetValue =
                  token &&
                  targetValues.find(({ token: t }) =>
                    tokenSourcesEqual(token, t)
                  )?.data[tooltipFirstDataPoint.dataIndex]

                return (
                  <div
                    key={index}
                    className={clsx(
                      'flex flex-col items-start justify-between gap-x-6 gap-y-1 sm:flex-row',
                      index === 0 && 'mb-2 sm:mb-4'
                    )}
                  >
                    <div className="flex shrink-0 flex-row items-center gap-2">
                      <div
                        className="h-4 w-10"
                        style={{
                          borderWidth,
                          borderColor,
                          backgroundColor,
                        }}
                      />
                      <p className="secondary-text">{label}:</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1 text-right font-mono">
                      <p className="primary-text leading-4">
                        $
                        {value?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>

                      {index > 0 && !!tooltipTotalValue && showTargets && (
                        <>
                          <p className="caption-text">
                            {formatPercentOf100(
                              (value / tooltipTotalValue) * 100
                            )}

                            {` (${
                              typeof targetValue === 'number'
                                ? `${t('info.target')}: ${formatPercentOf100(
                                    (targetValue / tooltipTotalValue) * 100
                                  )}`
                                : t('info.noTarget')
                            })`}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}
      </div>

      <SegmentedControls<TokenPriceHistoryRange>
        className="self-end"
        onSelect={(value) => setRange(value)}
        selected={range}
        tabs={[
          {
            label: 'D',
            value: TokenPriceHistoryRange.Day,
            tooltip: t('info.priceHistoryRange', {
              context: 'day',
            }),
          },
          {
            label: 'W',
            value: TokenPriceHistoryRange.Week,
            tooltip: t('info.priceHistoryRange', {
              context: 'week',
            }),
          },
          {
            label: 'M',
            value: TokenPriceHistoryRange.Month,
            tooltip: t('info.priceHistoryRange', {
              context: 'month',
            }),
          },
          {
            label: 'Y',
            value: TokenPriceHistoryRange.Year,
            tooltip: t('info.priceHistoryRange', {
              context: 'year',
            }),
          },
        ]}
      />
    </div>
  )
}
