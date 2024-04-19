import {
  HomeOutlined,
  HomeRounded,
  Notifications,
  SearchOutlined,
  Sensors,
  WidgetsOutlined,
  WidgetsRounded,
} from '@mui/icons-material'
import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import { DappLayoutProps } from '@dao-dao/types'
import {
  PAGE_PADDING_BOTTOM_CLASSES,
  PAGE_PADDING_HORIZONTAL_CLASSES,
  PAGE_PADDING_TOP_CLASSES,
  getGovPath,
} from '@dao-dao/utils'

import { useConfiguredChainContext } from '../../hooks'
import { useDaoNavHelpers } from '../../hooks/useDaoNavHelpers'
import { ErrorBoundary } from '../error/ErrorBoundary'
import { useAppContext } from './AppContext'
import { DappDock } from './DappDock'
import { DappNavigation } from './DappNavigation'
import { IDockItem } from './DockItem'

export const DappLayout = ({
  navigationProps,
  inboxCount,
  connect,
  DockWallet,
  ButtonLink,
  children,
}: DappLayoutProps) => {
  const { router, getDaoPath, getDaoFromPath } = useDaoNavHelpers()
  const { responsiveNavigation, setPageHeaderRef } = useAppContext()
  const { config: chainConfig } = useConfiguredChainContext()

  const scrollableContainerRef = useRef<HTMLDivElement>(null)

  // On DAO or non-DAO route change, close responsive bars and scroll to top.
  // When staying on the same DAO page, likely switching between tabs, so no
  // need to reset scroll to the top.
  const scrollPathDelta = router.asPath.startsWith(getDaoPath(''))
    ? getDaoFromPath()
    : router.asPath
  useEffect(() => {
    responsiveNavigation.enabled && responsiveNavigation.toggle()

    // When on a page, and navigating to another page with a Link, we need to
    // make sure the scrollable container moves to the top since we may be
    // scrolled lower on the page. Next.js automatically does this for the html
    // tag, but we have a nested scrollable container, so we have to do this
    // manually.
    scrollableContainerRef.current?.scrollTo({
      top: 0,
    })

    // Only toggle on route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPathDelta])

  const chainsDockItem: IDockItem = {
    key: 'chains',
    href: getGovPath(chainConfig.name),
    pathnames: '/gov/[chain]/[[...slug]]',
    labelI18nKey: 'title.chains',
    IconUnselected: WidgetsOutlined,
    IconSelected: WidgetsRounded,
  }

  return (
    <div className="relative z-[1] mx-auto flex h-full w-full max-w-7xl flex-row items-stretch overflow-hidden pt-safe">
      <ErrorBoundary>
        <DappNavigation {...navigationProps} />
      </ErrorBoundary>

      <main
        className={clsx(
          'flex grow flex-col overflow-hidden transition-opacity md:border-l md:border-border-base',
          // After navigation bar responsive cutoff, it automatically displays.
          responsiveNavigation.enabled
            ? 'opacity-30 md:opacity-100'
            : 'opacity-100'
        )}
      >
        <div className="shrink-0 px-6" ref={setPageHeaderRef}></div>

        <div
          className={clsx(
            'no-scrollbar relative grow overflow-y-auto',
            PAGE_PADDING_TOP_CLASSES,
            PAGE_PADDING_BOTTOM_CLASSES,
            PAGE_PADDING_HORIZONTAL_CLASSES
          )}
          ref={scrollableContainerRef}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>

        {/* Mobile bottom bar */}
        <DappDock
          ButtonLink={ButtonLink}
          items={[
            {
              key: 'home',
              href: '/',
              pathnames: ['/[[...tab]]'],
              labelI18nKey: 'title.home',
              IconUnselected: navigationProps.walletConnected
                ? DockWallet
                : HomeOutlined,
              IconSelected: navigationProps.walletConnected
                ? DockWallet
                : HomeRounded,
              compact: navigationProps.walletConnected,
            },
            // TODO: move tabs from the profile home page to the bottom bar
            ...(navigationProps.walletConnected
              ? ([
                  {
                    key: 'notifications',
                    href: '/notifications',
                    pathnames: ['/notifications/[[...slug]]'],
                    labelI18nKey: 'title.notifications',
                    IconUnselected: Notifications,
                    IconSelected: Notifications,
                    badge: !inboxCount.loading && inboxCount.data > 0,
                  },
                  chainsDockItem,
                ] as IDockItem[])
              : ([
                  chainsDockItem,
                  {
                    key: 'login',
                    onClick: connect,
                    labelI18nKey: 'button.logIn',
                    IconUnselected: Sensors,
                    IconSelected: Sensors,
                    brand: true,
                  },
                ] as IDockItem[])),
            {
              key: 'search',
              onClick: navigationProps.setCommandModalVisible,
              labelI18nKey: 'title.search',
              IconUnselected: SearchOutlined,
              IconSelected: SearchOutlined,
            },
          ]}
        />
      </main>
    </div>
  )
}
