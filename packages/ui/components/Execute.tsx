import Emoji from 'a11y-react-emoji'
import clsx from 'clsx'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Airplane } from '@dao-dao/icons'

import { Button } from './Button'

export interface ExecuteProps {
  onExecute: () => void
  messages: number
  loading: boolean
}

export const Execute: FC<ExecuteProps> = ({ onExecute, messages, loading }) => {
  const { t } = useTranslation()
  const [partyMode, setPartyMode] = useState(false)
  const [partyPhase, setPartyPhase] = useState(1)

  return (
    <>
      {!partyMode && (
        <div className="flex justify-between items-center p-4 max-w-3xl bg-primary rounded-lg border border-default">
          <div className="flex gap-2 items-center">
            <button
              className="mr-1 text-2xl"
              onClick={() => setPartyMode(true)}
            >
              <Emoji label={t('emoji.party')} symbol="🎉" />
            </button>
            <p className="primary-text">{t('info.passed')}</p>
            <p className="secondary-text">
              {t('info.numMessages', { count: messages })}
            </p>
          </div>
          <Button loading={loading} onClick={onExecute}>
            {t('button.execute')} <Airplane stroke="currentColor" />
          </Button>
        </div>
      )}
      {partyMode && (
        <div className="flex justify-between items-center p-4 max-w-3xl bg-primary rounded-lg border border-default">
          <div className="flex gap-2 items-center">
            <button
              className={clsx(
                'mr-1 text-2xl',
                [
                  '',
                  'rumble',
                  'rumble-fast',
                  'rumble-faster',
                  'rumble-fastest',
                ][partyPhase]
              )}
              onClick={() => {
                setPartyMode(false)
                setPartyPhase(1)
              }}
              type="button"
            >
              <Emoji label={t('emoji.rocketShip')} symbol="🚀" />
            </button>
            <p className="primary-text">{t('info.executing')}</p>
            <p className="secondary-text">
              {t('info.numMessages', { count: messages })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className={clsx('text-white bg-error hover:bg-error hover:ring', {
                invisible: partyPhase !== 1,
              })}
              onClick={() => setPartyPhase(2)}
              variant="secondary"
            >
              3
            </Button>
            <Button
              className={clsx('text-white bg-error hover:bg-error hover:ring', {
                invisible: partyPhase !== 2,
              })}
              onClick={() => setPartyPhase(3)}
              variant="secondary"
            >
              2
            </Button>
            <Button
              className={clsx('text-white bg-error hover:bg-error hover:ring', {
                invisible: partyPhase !== 3,
              })}
              onClick={() => setPartyPhase(4)}
              variant="secondary"
            >
              1
            </Button>

            <Button
              className={`${partyPhase !== 4 ? 'invisible' : ''}`}
              loading={loading}
              onClick={onExecute}
            >
              {t('button.execute')} <Airplane stroke="currentColor" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
