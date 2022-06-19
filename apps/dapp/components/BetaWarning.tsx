import { ChevronRightIcon } from '@heroicons/react/outline'
import { FC } from 'react'

import i18n, { useTranslation } from '@dao-dao/i18n'
import { Button } from '@dao-dao/ui'

interface BetaWarningModalProps {
  onAccept: () => void
}

export const BetaWarningModal: FC<BetaWarningModalProps> = ({ onAccept }) => {
  const { t } = useTranslation()

  return (
    <div className="flex fixed z-10 justify-center items-center w-screen h-full backdrop-blur-sm backdrop-filter">
      <div className="p-6 max-w-md h-min bg-white rounded-lg border border-focus">
        <div className="mb-6 rounded-md prose prose-sm dark:prose-invert">
          <h2>{i18n.t('Watch out!')}</h2>
          <p>{i18n.t('Beta warning')}</p>
          <p>{i18n.t('Terms of service')}</p>
        </div>
        <Button onClick={onAccept}>
          {t('acceptTerms')}
          <ChevronRightIcon className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
