import Link from 'next/link'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppLayoutContextIfAvailable } from '../layout/AppLayoutContext'
import { ErrorPage } from './ErrorPage'

export interface ErrorPage500Props {
  error: string
}

export const ErrorPage500 = ({ error }: ErrorPage500Props) => {
  const { t } = useTranslation()
  const PageHeader = useAppLayoutContextIfAvailable()?.PageHeader

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      {/* SDP does not have AppLayoutContext here. */}
      {PageHeader && <PageHeader title={t('title.500')} />}

      <ErrorPage>
        <p>
          {t('error.errorOccurredOnPage')}
          <br />
          <Link href="/">
            <a className="underline hover:no-underline">
              {t('info.considerReturningHome')}
            </a>
          </Link>
        </p>

        <pre className="mt-6 whitespace-pre-wrap text-xs text-text-interactive-error">
          {error}
        </pre>
      </ErrorPage>
    </>
  )
}
