import clsx from 'clsx'
import { useRouter } from 'next/router'
import { FC, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Logo } from '@dao-dao/ui'
import { ActionHit, DaoActionHit } from './SearchModal'

type Hit = DaoHit | ActionHit | DaoActionHit

interface DaoHit {
  id: string
  name: string
  description: string
  image_url: string | undefined
  proposal_count: number
  treasury_balance: string
  hit_type: 'dao'
}

const HitView = ({ hit, selected }: { hit: Hit; selected: boolean }) => {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div
      className={clsx(
        'flex gap-2 py-2 px-1 font-medium text-tertiary hover:text-primary items-center align-middle hover:bg-primary rounded-md cursor-pointer',
        selected && 'text-primary bg-primary'
      )}
      onClick={() => router.push(`/dao/${hit.id}`)}
    >
      {hit.hit_type == 'dao' ? hit.image_url ? (
        <div
          aria-label={t('daosLogo')}
          className="w-[24px] h-[24px] bg-center bg-cover rounded-full"
          role="img"
          style={{
            backgroundImage: `url(${hit.image_url})`,
          }}
        ></div>
      ) : (
        <Logo alt={hit.name} height={24} width={24} />
      ): <div className="w-[24px] h-[24px] flex justify-center items-center text-lg">
          {hit.icon}
        </div>}
        <div>
      {hit.name}
      </div>
    </div>
  )
}

// Need to use `any` here as instantsearch does't export the required
// types.
const HitsInternal: FC<any> = ({ hits, onEnter }) => {
  const router = useRouter()
  const [selection, setSelection] = useState(0)

  const handleKeyPress = useCallback(
    (event) => {
      switch (event.key) {
        case 'ArrowUp':
          setSelection((selection) => Math.max(selection - 1, 0))
          router.prefetch(`/dao/${hits[selection].id}`)
          break
        case 'ArrowDown':
          setSelection((selection) => Math.min(selection + 1, hits.length - 1))
          router.prefetch(`/dao/${hits[selection].id}`)
          break
        case 'Enter':
          onEnter(hits[selection])
          break
      }
    },
    [hits, selection, router]
  )

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress)

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  return (
    <>
      <div className="flex overflow-hidden overflow-y-auto flex-col grow justify-start py-2 px-4">
        <div className="py-1 font-medium text-gray-400">DAOs</div>
        {hits.map((hit: DaoHit, index: number) => (
          <HitView key={hit.id} hit={hit} selected={index === selection} />
        ))}
      </div>
    </>
  )
}

export const SearchHits = HitsInternal
