import {
  AddRounded,
  ArrowOutwardRounded,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  TagRounded,
} from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DaoPageMode, DaoTabId } from '@dao-dao/types'
import { SdaNavigationProps } from '@dao-dao/types/components/SdaNavigation'
import { MAINNET, getDaoPath as baseGetDaoPath } from '@dao-dao/utils'

import { useDao } from '../../contexts'
import { useDaoNavHelpers } from '../../hooks'
import { DaoImage } from '../dao/DaoImage'
import { IconButton, ThemeToggle } from '../icon_buttons'
import { Tooltip } from '../tooltip/Tooltip'
import { useAppContext } from './AppContext'
import { Footer } from './Footer'
import { PageHeader } from './PageHeader'
import { Row } from './Row'

// Width of `lg` tailwind selector. Don't change this without changing the
// compact button media query class that shows the compact toggle at the very
// bottom, so the user can toggle between compact and not compact mode when it
// is not forced.
const FORCE_COMPACT_NAVIGATION_AT_WIDTH = 1024
// Width of `md` tailwind selector. Don't change this without changing all of
// the `md:` tailwind class media queries since they are set based on when it is
// in responsive mobile mode.
const FORCE_MOBILE_NAVIGATION_AT_WIDTH = 768

// Force off when in responsive mobile mode since it displays full width when
// open and we can show all details. Force on when larger than mobile but still
// not very wide since it takes up a lot of space.
const getForceCompact = () =>
  window.innerWidth < FORCE_MOBILE_NAVIGATION_AT_WIDTH
    ? false
    : window.innerWidth < FORCE_COMPACT_NAVIGATION_AT_WIDTH
      ? true
      : undefined

const DAPP_URL_PREFIX = `https://${MAINNET ? '' : 'testnet.'}daodao.zone`

export const SdaNavigation = ({
  tabs,
  compact,
  setCompact,
  mountedInBrowser,
  LinkWrapper,
  SidebarWallet,
}: SdaNavigationProps) => {
  const daoInfo = useDao()
  const { t } = useTranslation()
  const {
    getDaoPath,
    getDaoProposalPath,
    router: { asPath },
  } = useDaoNavHelpers()
  const {
    responsiveNavigation: {
      enabled: responsiveEnabled,
      toggle: toggleResponsive,
    },
  } = useAppContext()

  // Get the path to the DAO page on main DAO DAO.
  const daoDaoPath = asPath.startsWith(getDaoPath(''))
    ? asPath.replace(getDaoPath(''), baseGetDaoPath(DaoPageMode.Dapp, ''))
    : undefined

  // Use screen resize to determine when compact should be forced on or off.
  const [forceCompact, setForceCompact] = useState<boolean | undefined>(
    // Initialize not compact to prevent hydration errors (since it takes at
    // least 1 render to update this).
    false
  )
  useEffect(() => {
    // Only run in browser.
    if (typeof window === 'undefined' || !mountedInBrowser) {
      return
    }

    const updateForceCompact = () => setForceCompact(getForceCompact())

    // Update on initialization.
    updateForceCompact()

    window.addEventListener('resize', updateForceCompact)
    // Clean up on umount
    return () => window.removeEventListener('resize', updateForceCompact)
  }, [mountedInBrowser])

  // If forceCompact is set to a boolean, override compact.
  if (forceCompact !== undefined) {
    compact = forceCompact
  }

  return (
    <>
      {/* Layer underneath that allows closing the responsive navigation by tapping on visible parts of the page. */}
      {responsiveEnabled && (
        <div
          className="absolute top-0 right-0 bottom-0 left-0 z-[19] cursor-pointer md:hidden"
          onClick={() => responsiveEnabled && toggleResponsive()}
        ></div>
      )}

      <nav
        className={clsx(
          // General
          'no-scrollbar flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-background-base pb-6 text-lg',
          // If compact, items will manage their own padding so that highlighted
          // rows fill the whole width.
          compact ? 'pl-safe' : 'pr-6 pl-safe-or-[1.5rem]',
          // Responsive
          'absolute top-0 bottom-0 z-20 w-[96dvw] max-w-sm shadow-dp8 transition-all duration-200 pt-safe',
          responsiveEnabled ? 'left-0' : '-left-full',
          // Large
          'md:relative md:left-0 md:pt-0 md:shadow-none md:transition-[padding-left]',
          compact ? 'md:w-min' : 'md:w-72'
        )}
      >
        <PageHeader
          centerNode={
            <LinkWrapper
              className={clsx(
                'flex flex-row items-center gap-2 overflow-hidden',
                // Make room for rightNode switch button.
                daoDaoPath && !compact && 'px-12 md:pl-0'
              )}
              href={getDaoPath(daoInfo.coreAddress)}
            >
              <DaoImage
                LinkWrapper={LinkWrapper}
                coreAddress={daoInfo.coreAddress}
                daoName={daoInfo.name}
                hideRing
                imageUrl={daoInfo.imageUrl}
                size="md"
              />

              {!compact && (
                <Tooltip title={daoInfo.name}>
                  <p className="header-text truncate">{daoInfo.name}</p>
                </Tooltip>
              )}
            </LinkWrapper>
          }
          forceCenter={compact}
          noBorder={compact}
        />

        <SidebarWallet />

        <div className={clsx(!compact && 'pt-2')}>
          {tabs.map((tab) => {
            const isOnProposalsTab =
              tab.id === DaoTabId.Proposals && asPath.includes('/proposals/')
            const isCreatingProposal = asPath.startsWith(
              getDaoProposalPath(daoInfo.coreAddress, 'create')
            )

            const isCreatingSubDao =
              tab.id === DaoTabId.SubDaos &&
              asPath.startsWith(getDaoPath(daoInfo.coreAddress, 'create'))

            return (
              <Row
                key={tab.id}
                LinkWrapper={LinkWrapper}
                compact={compact}
                forceExpanded
                href={getDaoPath(daoInfo.coreAddress, tab.id)}
                shallow
                {...tab}
              >
                {isOnProposalsTab && (
                  <Row
                    Icon={isCreatingProposal ? AddRounded : TagRounded}
                    LinkWrapper={LinkWrapper}
                    compact={compact}
                    href={asPath}
                    label={
                      isCreatingProposal
                        ? t('title.createProposal')
                        : `${t('title.proposal')} ${asPath.split('/').pop()}`
                    }
                  />
                )}
                {isCreatingSubDao && (
                  <Row
                    Icon={AddRounded}
                    LinkWrapper={LinkWrapper}
                    compact={compact}
                    href={asPath}
                    label={t('title.createASubDao')}
                  />
                )}
              </Row>
            )
          })}

          {/* Go to DAO DAO Page. */}
          {daoDaoPath && !compact && (
            <Row
              Icon={ArrowOutwardRounded}
              LinkWrapper={LinkWrapper}
              containerClassName="opacity-60"
              href={DAPP_URL_PREFIX + daoDaoPath}
              label={t('button.viewOnDaoDao')}
            />
          )}
        </div>

        <div className={clsx('mt-8 flex grow flex-col justify-end gap-2')}>
          {!compact && <Footer />}

          <div
            className={clsx(
              'mt-4 flex shrink-0 gap-2',
              compact ? 'mx-6 flex-col' : 'flex-row items-center'
            )}
          >
            <Tooltip title={t('button.toggleTheme')}>
              <ThemeToggle />
            </Tooltip>

            <IconButton
              Icon={
                compact ? KeyboardDoubleArrowRight : KeyboardDoubleArrowLeft
              }
              circular
              className="hidden lg:flex"
              onClick={() => setCompact(!compact)}
              size={compact ? 'default' : 'xl'}
              variant="secondary"
            />
          </div>
        </div>
      </nav>
    </>
  )
}
