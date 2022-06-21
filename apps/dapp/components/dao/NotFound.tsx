import { Trans, useTranslation } from '@dao-dao/i18n'
import { ErrorPage, LinkText } from '@dao-dao/ui'

import { useDAOInfoContext } from '../DAOPageWrapper'

export const DAONotFound = () => {
  const { t } = useTranslation()

  return (
    <ErrorPage title={t('error.DAONotFound')}>
      <p>
        <Trans i18nKey="couldntFindDAO">
          We couldn&apos;t find a DAO with that address. Search DAOs on the{' '}
          <LinkText aProps={{ className: 'underline link-text' }} href="/home">
            home page
          </LinkText>
          .
        </Trans>
      </p>
    </ErrorPage>
  )
}

export const ProposalNotFound = () => {
  const { t } = useTranslation()
  const { coreAddress } = useDAOInfoContext()

  return (
    <ErrorPage title={t('error.proposalNotFound')}>
      <p>
        <Trans i18nKey="couldntFindProposal">
          We couldn&apos;t find a proposal with that ID. See all proposals on
          the{' '}
          <LinkText
            aProps={{ className: 'underline link-text' }}
            href={`/dao/${coreAddress}`}
          >
            DAO&apos;s home page
          </LinkText>
          .
        </Trans>
      </p>
    </ErrorPage>
  )
}
