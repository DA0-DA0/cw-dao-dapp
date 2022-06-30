import { FC } from 'react'

import { useTranslation } from '@dao-dao/i18n'
import { MemberCheck } from '@dao-dao/icons'
import { CopyToClipboardMobile, HeartButton, Logo } from '@dao-dao/ui'
import { HEADER_IMAGES_ENABLED } from '@dao-dao/utils'

export interface MobileHeaderProps {
  imageUrl?: string
  name: string
  member: boolean
  pinned: boolean
  onPin: () => void
  contractAddress: string
}

export const MobileHeader: FC<MobileHeaderProps> = ({
  imageUrl,
  name,
  member,
  pinned,
  onPin,
  contractAddress,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-row flex-wrap justify-around gap-6 p-6">
      <div className="relative">
        {imageUrl && HEADER_IMAGES_ENABLED ? (
          <div
            aria-label={t('info.daosLogo')}
            className="h-[72px] w-[72px] rounded-full bg-cover bg-center"
            role="img"
            style={{
              backgroundImage: `url(${imageUrl})`,
            }}
          ></div>
        ) : (
          <Logo alt={t('info.daodaoLogo')} height={72} width={72} />
        )}
        <div
          className="absolute -right-[10px] -bottom-1 rounded-full border border-light bg-center"
          style={{
            width: '32px',
            height: '32px',
            backgroundImage: 'url(/daotoken.jpg)',
          }}
        ></div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-row justify-between">
          <h1 className="header-text">{name}</h1>
          <div className="flex gap-5">
            {member && (
              <div className="flex flex-row items-center gap-2">
                <MemberCheck fill="currentColor" width="16px" />
              </div>
            )}
            <HeartButton onPin={onPin} pinned={pinned} />
          </div>
        </div>
        <CopyToClipboardMobile value={contractAddress} />
      </div>
    </div>
  )
}

export const MobileHeaderLoader: FC<{ contractAddress: string }> = ({
  contractAddress,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-row flex-wrap justify-around gap-6 p-6">
      <div className="relative">
        <div className="animate-spin-medium">
          <Logo alt={t('info.daodaoLogo')} height={72} width={72} />
        </div>
        <div
          className="absolute -right-[10px] -bottom-1 rounded-full border border-light bg-center"
          style={{
            width: '32px',
            height: '32px',
            backgroundImage: 'url(/daotoken.jpg)',
          }}
        ></div>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-row justify-between">
          <h1 className="header-text mr-3 w-full animate-pulse rounded-sm bg-dark"></h1>
          <div className="flex gap-5">
            <HeartButton onPin={() => null} pinned={false} />
          </div>
        </div>
        <CopyToClipboardMobile value={contractAddress} />
      </div>
    </div>
  )
}
