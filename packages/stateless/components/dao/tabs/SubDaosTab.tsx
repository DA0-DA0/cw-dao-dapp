import { Add, EscalatorWarning, Upgrade } from '@mui/icons-material'
import { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ButtonLinkProps,
  ContractVersion,
  DaoInfo,
  Feature,
  LoadingDataWithError,
  StatefulDaoCardProps,
} from '@dao-dao/types'

import { useDao } from '../../../contexts'
import { useDaoNavHelpers } from '../../../hooks'
import { ErrorPage } from '../../error'
import { GridCardContainer } from '../../GridCardContainer'
import { NoContent } from '../../NoContent'
import { Tooltip } from '../../tooltip'
import { DaoCardLoader } from '../DaoCard'

export interface SubDaosTabProps {
  DaoCard: ComponentType<StatefulDaoCardProps>
  subDaos: LoadingDataWithError<DaoInfo[]>
  isMember: boolean
  createSubDaoHref?: string
  upgradeToV2Href?: string
  ButtonLink: ComponentType<ButtonLinkProps>
}

export const SubDaosTab = ({
  DaoCard,
  subDaos,
  isMember,
  createSubDaoHref,
  upgradeToV2Href,
  ButtonLink,
}: SubDaosTabProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { getDaoPath } = useDaoNavHelpers()

  const subDaosSupported =
    dao.coreVersion === ContractVersion.Gov || dao.supports(Feature.SubDaos)

  return (
    <>
      {/* header min-height of 3.5rem standardized across all tabs */}
      <div className="flex min-h-[3.5rem] flex-row items-center justify-between gap-8 pb-6">
        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
          <p className="title-text text-text-body">{t('title.subDaos')}</p>
          <p className="secondary-text">{t('info.subDaoExplanation')}</p>
        </div>

        <Tooltip
          title={
            !subDaosSupported
              ? t('error.daoFeatureUnsupported', {
                  name: dao.name,
                  feature: t('title.subDaos'),
                })
              : !isMember
              ? t('error.mustBeMemberToCreateSubDao')
              : undefined
          }
        >
          <ButtonLink
            className="shrink-0"
            disabled={!isMember || !subDaosSupported}
            href={getDaoPath(dao.coreAddress, 'create')}
          >
            <Add className="!h-4 !w-4" />
            <span className="hidden md:inline">{t('button.newSubDao')}</span>
            <span className="md:hidden">{t('button.new')}</span>
          </ButtonLink>
        </Tooltip>
      </div>

      {!subDaosSupported ? (
        <NoContent
          Icon={Upgrade}
          actionNudge={t('info.submitUpgradeProposal')}
          body={t('error.daoFeatureUnsupported', {
            name: dao.name,
            feature: t('title.subDaos'),
          })}
          buttonLabel={t('button.proposeUpgrade')}
          href={isMember ? upgradeToV2Href : undefined}
        />
      ) : subDaos.errored ? (
        <ErrorPage error={subDaos.error} />
      ) : subDaos.loading || subDaos.data.length > 0 ? (
        <>
          <p className="title-text mb-6 border-t border-border-secondary pt-6 text-text-body">
            {subDaos.loading
              ? t('title.loadingSubDaos')
              : t('title.numSubDaos', { count: subDaos.data.length })}
          </p>

          <GridCardContainer>
            {subDaos.loading
              ? [...Array(3)].map((_, index) => <DaoCardLoader key={index} />)
              : subDaos.data.map((info, index) => (
                  <DaoCard key={index} info={info} />
                ))}
          </GridCardContainer>
        </>
      ) : (
        <NoContent
          Icon={EscalatorWarning}
          actionNudge={t('info.createFirstOneQuestion')}
          body={t('info.noSubDaosYet')}
          buttonLabel={t('button.newSubDao')}
          href={isMember ? createSubDaoHref : undefined}
        />
      )}
    </>
  )
}
