import { useTranslation } from 'react-i18next'
import { Formatter, Suffix, Unit } from 'react-timeago'

export interface UseTranslatedTimeDeltaFormatterOptions {
  // Whether or not to show words around the time delta. If false, the time is
  // just rendered as the value (e.g. 1 day). If true, the time would be
  // rendered as "1 day ago", "1 day left", or "in 1 day".
  words: boolean
  // If date is in the future, use either "left" suffix or "in" prefix.
  futureMode?: 'left' | 'in'
}

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const WEEK = DAY * 7
const MONTH = DAY * 30
const YEAR = DAY * 365

export const useTranslatedTimeDeltaFormatter = ({
  words,
  futureMode = 'left',
}: UseTranslatedTimeDeltaFormatterOptions): Formatter => {
  const { t } = useTranslation()

  const timeDeltaFormatter = (
    _value: number,
    _unit: Unit,
    suffix: Suffix,
    epochMiliseconds: number,
    _nextFormatter: Formatter,
    now: () => number
  ) => {
    const seconds = Math.round(Math.abs(now() - epochMiliseconds) / 1000)
    const lessThanOneMinute = seconds < MINUTE

    // Manually improve granularity over default timeago formatter.
    const [value, unit] = lessThanOneMinute
      ? [1, 'minute']
      : seconds < HOUR
        ? [Math.round(seconds / MINUTE), 'minute']
        : seconds < DAY
          ? [Math.round(seconds / HOUR), 'hour']
          : seconds < MONTH
            ? [Math.round(seconds / DAY), 'day']
            : seconds < YEAR
              ? [Math.round(seconds / WEEK), 'week']
              : [Math.round(seconds / MONTH), 'month']

    return t(
      words
        ? suffix === 'ago'
          ? 'format.timeAgo'
          : futureMode === 'left'
            ? 'format.timeLeft'
            : 'format.inTime'
        : 'format.time',
      {
        value: lessThanOneMinute ? '< 1' : value,
        unit: t(`unit.${unit}s`, { count: value }).toLocaleLowerCase(),
      }
    )
  }

  return timeDeltaFormatter as Formatter
}
