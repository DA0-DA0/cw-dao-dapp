import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { ChainStatusProps } from '@dao-dao/types'
import { formatDateTimeTz } from '@dao-dao/utils'

import { ErrorPage } from '../error'
import { ChainLabel } from './ChainLabel'

export const ChainStatus = ({ chainId, upStatus }: ChainStatusProps) => {
  const { t } = useTranslation()

  return (
    <div
      key={chainId}
      className="flex flex-col gap-3 rounded-md bg-background-tertiary p-3 xs:gap-4 xs:p-4"
    >
      <div className="flex flex-row items-start justify-between gap-x-4 gap-y-2">
        <ChainLabel chainId={chainId} header />

        <div
          className={clsx(
            'flex flex-row items-center gap-2 rounded-full bg-background-overlay p-2 xs:p-3',
            upStatus.loading && 'animate-pulse'
          )}
        >
          <div
            className={clsx(
              'h-3 w-3 shrink-0 rounded-full xs:h-4 xs:w-4',
              upStatus.loading
                ? 'bg-icon-interactive-active'
                : !upStatus.errored && upStatus.data.caughtUp
                  ? 'bg-icon-interactive-valid'
                  : 'bg-icon-interactive-error'
            )}
          ></div>

          <p className="primary-text">
            {upStatus.loading
              ? t('info.loading')
              : upStatus.errored
                ? t('info.errored')
                : upStatus.data.caughtUp
                  ? t('info.upToDate')
                  : t('info.catchingUp')}
          </p>
        </div>
      </div>

      {!upStatus.loading && !upStatus.errored && !upStatus.data.caughtUp && (
        <div className="flex flex-row items-center justify-between gap-4">
          <p className="secondary-text text-text-interactive-error">
            {t('info.blocksBehind')}
          </p>

          <p className="font-mono text-text-interactive-error">
            {(
              upStatus.data.chainBlock.height -
              upStatus.data.indexerBlock.height
            ).toLocaleString()}
          </p>
        </div>
      )}

      <div className="flex flex-row items-start justify-between gap-3 xs:gap-4">
        <p className="secondary-text shrink-0">{t('info.lastBlock')}</p>

        <div
          className={clsx(
            'flex flex-col items-end gap-2 break-words text-right font-mono text-sm xs:text-base',
            upStatus.loading && 'animate-pulse'
          )}
        >
          <p>
            {!upStatus.loading && !upStatus.errored
              ? upStatus.data.indexerBlock.height.toLocaleString()
              : '...'}
          </p>

          <p>
            {!upStatus.loading && !upStatus.errored
              ? formatDateTimeTz(new Date(upStatus.data.indexerBlock.timestamp))
              : '...'}
          </p>
        </div>
      </div>

      {upStatus.errored && <ErrorPage error={upStatus.error} />}
    </div>
  )
}
