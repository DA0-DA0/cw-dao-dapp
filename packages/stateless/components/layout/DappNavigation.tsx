import {
  Add,
  CheckRounded,
  Home,
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  Search,
} from '@mui/icons-material'
import { isMobile } from '@walletconnect/browser-utils'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DappNavigationProps } from '@dao-dao/types'
import { SITE_TITLE, getSupportedChains } from '@dao-dao/utils'

import { usePlatform } from '../../hooks'
import { ChainLogo } from '../chain/ChainLogo'
import { DaoDropdown } from '../dao'
import { IconButton, ThemeToggle } from '../icon_buttons'
import { Logo } from '../logo/Logo'
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

export const DappNavigation = ({
  setCommandModalVisible,
  followingDaos,
  walletConnected,
  compact,
  setCompact,
  mountedInBrowser,
  LinkWrapper,
}: DappNavigationProps) => {
  const { t } = useTranslation()
  const { isMac } = usePlatform()
  const {
    responsiveNavigation: {
      enabled: responsiveEnabled,
      toggle: toggleResponsive,
    },
  } = useAppContext()
  const { pathname, query } = useRouter()

  const isHome = pathname === '/[[...tab]]'
  const homeTabPath =
    isHome && query?.tab && Array.isArray(query?.tab) ? query.tab[0] : undefined
  const homeSelectedChainId = homeTabPath
    ? getSupportedChains().find(({ name }) => name === homeTabPath)?.chainId
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

  const [showFollowingTopBorder, setShowFollowingTopBorder] = useState(false)
  const [showFollowingBottomBorder, setShowFollowingBottomBorder] =
    useState(false)
  const scrollableFollowingContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const ref = scrollableFollowingContainerRef.current
    if (!ref) {
      return
    }

    const updateBorders = () => {
      const { scrollTop, scrollHeight, clientHeight } = ref

      // 0.5rem (~8px) padding before the top of the first sub DAO image, and a
      // couple extra pixels so the first element actually looks covered.
      const contentHiddenOnTop = scrollTop > 11
      setShowFollowingTopBorder(contentHiddenOnTop)

      // 1rem (~16px) padding before the bottom of the last sub DAO image, and
      // a couple extra pixels so the last element actually looks covered.
      const contentHiddenOnBottom = scrollTop < scrollHeight - clientHeight - 19
      setShowFollowingBottomBorder(contentHiddenOnBottom)
    }

    updateBorders()

    // Add listener on mount, remove on cleanup.
    ref.addEventListener('scroll', updateBorders)
    return () => ref.removeEventListener('scroll', updateBorders)
    // Update when compact is changed since positioning is different.
  }, [scrollableFollowingContainerRef, compact])

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
                'flex flex-row items-center',
                // Increase space between logo and name if on chain-specific
                // home page with offset overlayed chain icon.
                homeSelectedChainId ? 'gap-3' : 'gap-2'
              )}
              href="/"
            >
              <div className="w-7 h-7 relative">
                <Logo size={28} />

                {/* Overlay chain icon on chain-specific home page. */}
                {homeSelectedChainId && (
                  <ChainLogo
                    chainId={homeSelectedChainId}
                    className="absolute -bottom-1.5 -right-1.5"
                    size={18}
                  />
                )}
              </div>

              {!compact && <p className="header-text">{SITE_TITLE}</p>}
            </LinkWrapper>
          }
          forceCenter={compact}
          noBorder={compact}
        />

        {/* If not compact, add some spacing. */}
        <div className={clsx(!compact && 'pt-2')}>
          <Row
            Icon={Search}
            LinkWrapper={LinkWrapper}
            compact={compact}
            label={t('title.search')}
            onClick={setCommandModalVisible}
            rightNode={
              !isMobile() && (
                <div className="legend-text flex flex-row items-center gap-1 text-icon-primary">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background-interactive-disabled">
                    <p>{isMac ? '⌘' : '⌃'}</p>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background-interactive-disabled">
                    <p>k</p>
                  </div>
                </div>
              )
            }
          />

          <Row
            Icon={Home}
            LinkWrapper={LinkWrapper}
            compact={compact}
            href="/"
            label={t('title.home')}
            selected={isHome}
          />

          {/* Only show following when connected and following DAOs loaded. */}
          {walletConnected &&
            !followingDaos.loading &&
            followingDaos.data.length > 0 && (
              <Row
                Icon={CheckRounded}
                LinkWrapper={LinkWrapper}
                compact={compact}
                defaultExpanded
                label={t('title.following')}
                loading={followingDaos.updating}
              >
                <div
                  className={clsx(
                    // 36rem is about the absolute height of all other elements
                    // in the sidebar, so the remaining space is used for the
                    // following DAOs. This number will need tweaking if the
                    // sidebar changes.
                    'no-scrollbar relative md:max-h-[calc(100dvh-36rem)] overflow-y-auto',
                    compact && 'mt-1 w-min'
                  )}
                  ref={scrollableFollowingContainerRef}
                >
                  {/* Top border */}
                  <div
                    className={clsx(
                      'sticky top-0 right-0 left-0 h-[1px] bg-border-primary transition-opacity',
                      showFollowingTopBorder ? 'opacity-100' : 'opacity-0'
                    )}
                  ></div>

                  {/* DAOs */}
                  {followingDaos.data.map((dao, index) => (
                    <DaoDropdown
                      key={index}
                      LinkWrapper={LinkWrapper}
                      compact={compact}
                      dao={dao}
                      imageClassName="h-6 w-6"
                      labelClassName="text-sm"
                      labelContainerClassName="gap-2"
                    />
                  ))}

                  {/* Bottom border */}
                  <div
                    className={clsx(
                      'sticky right-0 bottom-0 left-0 h-[1px] bg-border-primary transition-opacity',
                      showFollowingBottomBorder ? 'opacity-100' : 'opacity-0'
                    )}
                  ></div>
                </div>
              </Row>
            )}

          <Row
            Icon={Add}
            LinkWrapper={LinkWrapper}
            compact={compact}
            href="/dao/create"
            label={t('button.create')}
          />
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
              className="hidden shrink-0 lg:flex"
              onClick={() => setCompact(!compact)}
              variant="secondary"
            />
          </div>
        </div>
      </nav>
    </>
  )
}
