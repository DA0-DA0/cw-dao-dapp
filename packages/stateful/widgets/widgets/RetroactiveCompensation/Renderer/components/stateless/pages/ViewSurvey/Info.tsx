import { ArrowOutward, Download } from '@mui/icons-material'
import { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, Tooltip, useDao, useDaoNavHelpers } from '@dao-dao/stateless'
import { ButtonLinkProps, LoadingDataWithError } from '@dao-dao/types'
import { formatDateTimeTz } from '@dao-dao/utils'

import { SurveyWithMetadata } from '../../../../types'

export type InfoProps = {
  /**
   * Survey.
   */
  status: SurveyWithMetadata
  /**
   * Whether or not the current wallet can download the survey CSV.
   */
  canDownload: LoadingDataWithError<boolean>
  /**
   * Callback to download CSV.
   */
  download: () => void
  /**
   * Whether or not CSV is downloading.
   */
  downloading: boolean
  /**
   * Stateful button link component.
   */
  ButtonLink: ComponentType<ButtonLinkProps>
}

export const Info = ({
  status: {
    survey: { name, contributionsOpenAt, proposalId, contributionCount },
  },
  canDownload,
  download,
  downloading,
  ButtonLink,
}: InfoProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()

  return (
    <div>
      <div className="space-y-1 break-words">
        <p className="hero-text">{name}</p>
        <p className="caption-text italic">
          {formatDateTimeTz(new Date(contributionsOpenAt))}
        </p>
      </div>

      <p className="primary-text mt-4">
        {t('info.numSubmissions', { count: contributionCount })}
      </p>

      <div className="mt-6 flex flex-row gap-2 items-stretch">
        {!!proposalId && (
          <ButtonLink
            href={getDaoProposalPath(dao.coreAddress, proposalId)}
            openInNewTab
          >
            {t('button.openProposal')}
            <ArrowOutward className="!h-5 !w-5" />
          </ButtonLink>
        )}

        <Tooltip
          title={
            canDownload.errored
              ? t('error.failedToLoadMembershipRefreshPage')
              : !canDownload.loading && !canDownload.data
                ? t('error.cantDownloadRetroactiveSurveyCsv')
                : undefined
          }
        >
          <Button
            disabled={
              canDownload.errored || (!canDownload.loading && !canDownload.data)
            }
            loading={canDownload.loading || downloading}
            onClick={download}
            variant="secondary"
          >
            {t('button.downloadResultsCsv')}
            <Download className="!h-5 !w-5" />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
