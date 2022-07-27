import { CheckIcon, XIcon } from '@heroicons/react/outline'
import clsx from 'clsx'
import { FunctionComponent } from 'react'
import { useTranslation } from 'react-i18next'

import { Abstain } from '@dao-dao/icons'
import { Vote } from '@dao-dao/state/clients/cw-proposal-single'

export const VoteDisplay: FunctionComponent<{
  vote: Vote
  className?: string
}> = ({ vote, className }) => {
  const { t } = useTranslation()
  const commonClassNames = clsx(
    'inline-flex gap-1 items-center font-mono text-sm',
    className
  )

  return vote === Vote.Yes ? (
    <p className={clsx(commonClassNames, 'text-valid')}>
      <CheckIcon className="inline w-4" /> {t('info.yes')}
    </p>
  ) : vote === Vote.No ? (
    <p className={clsx(commonClassNames, 'text-error')}>
      <XIcon className="inline w-4" /> {t('info.no')}
    </p>
  ) : vote === Vote.Abstain ? (
    <p className={clsx(commonClassNames, 'text-secondary')}>
      <Abstain fill="currentColor" /> {t('info.abstain')}
    </p>
  ) : (
    // Should never happen.
    <p className={clsx(commonClassNames, 'inline text-secondary break-words')}>
      {vote}
    </p>
  )
}
