import { ArrowDropDown, ArrowForwardIos, Close } from '@mui/icons-material'
import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BreadcrumbsProps, DaoPageMode } from '@dao-dao/types'

import { useDaoIfAvailable } from '../../contexts'
import { useDaoNavHelpers } from '../../hooks'
import { Button } from '../buttons/Button'
import { IconButton } from '../icon_buttons/IconButton'
import { LinkWrapper } from '../LinkWrapper'
import { Tooltip } from '../tooltip'
import { useAppContext } from './AppContext'

export const Breadcrumbs = ({
  home = false,
  override = false,
  homeTab,
  current,
  dao: _dao,
  className,
}: BreadcrumbsProps) => {
  const { t } = useTranslation()
  const { mode } = useAppContext()
  const { getDaoPath } = useDaoNavHelpers()

  // Allow using Breadcrumbs outside of DaoPageWrapper.
  const dao = useDaoIfAvailable() || _dao

  const [responsive, setResponsive] = useState(false)

  const crumbs =
    mode === DaoPageMode.Dapp
      ? home || !dao
        ? [{ href: '/', label: t('title.home') }]
        : [
            {
              href:
                // Link to home tab if available.
                getDaoPath(dao.coreAddress, homeTab?.id),
              label: dao.name,
            },
          ]
      : // SDA
        home || !dao
        ? []
        : [
            {
              href:
                // Link to home tab if available.
                getDaoPath(dao.coreAddress, homeTab?.id),
              label: homeTab?.sdaLabel || t('title.home'),
            },
          ]

  const hasCrumbs = crumbs.length > 0

  return (
    <>
      <div
        className={clsx(
          'header-text flex flex-row items-center gap-2 overflow-hidden text-text-secondary animate-fade-in',
          className
        )}
      >
        {crumbs.map(({ href, label }, idx) => {
          // If not first or last crumb, show ellipsis.
          const firstOrLast = idx === 0 || idx === crumbs.length - 1

          return (
            <div
              key={idx}
              className="hidden min-w-0 shrink-0 flex-row items-center gap-2 md:flex"
            >
              <Tooltip title={firstOrLast ? undefined : label}>
                <div className="flex min-w-0 flex-row overflow-hidden">
                  <LinkWrapper
                    className="transition-opacity hover:opacity-80"
                    containerClassName={clsx(
                      'min-w-0 truncate',
                      // When there are at least 3 crumbs, and this is the last
                      // crumb, set max width so it doesn't take up too much
                      // space.
                      idx === crumbs.length - 1 &&
                        crumbs.length > 2 &&
                        'max-w-[12rem]'
                    )}
                    href={href}
                  >
                    {firstOrLast ? label : '...'}
                  </LinkWrapper>
                </div>
              </Tooltip>

              <ArrowForwardIos className="!h-5 !w-5 shrink-0 text-icon-tertiary" />
            </div>
          )
        })}

        {override ? (
          current
        ) : (
          <Button
            // Disable touch interaction when not responsive. Flex items have
            // min-width set to auto by default, which prevents text ellipses
            // since this will overflow its parent. Set min-width to 0 so this
            // cannot overflow its parent, and the child text can truncate.
            className={clsx(
              'min-w-0 text-text-primary md:pointer-events-none',
              // Disable touch interaction when no crumbs.
              !hasCrumbs && 'pointer-events-none'
            )}
            contentContainerClassName="justify-center"
            onClick={() => setResponsive(true)}
            size="none"
            variant="none"
          >
            <p className="truncate">{current}</p>

            {/* When no crumbs, no dropdown/arrow. */}
            {hasCrumbs && (
              <ArrowDropDown className="!h-6 !w-6 shrink-0 text-icon-primary md:!hidden" />
            )}
          </Button>
        )}
      </div>

      <div
        className={clsx(
          'header-text fixed top-0 right-0 bottom-0 left-0 z-20 flex flex-col bg-background-base transition-opacity p-safe',
          responsive && hasCrumbs
            ? 'opacity-100 md:pointer-events-none md:opacity-0'
            : 'pointer-events-none opacity-0'
        )}
        // Close after any click inside this container.
        onClick={() => setResponsive(false)}
      >
        <div
          className="relative"
          style={{
            // h-20 = 5rem height. Add 1 more for `current` since `crumbs` are
            // only previous pages.
            height: `${(crumbs.length + 1) * 5}rem`,
          }}
        >
          {crumbs.map(({ href, label }, idx) => (
            <div
              key={idx}
              className={clsx(
                'absolute right-0 left-0 flex h-20 flex-row items-center justify-center gap-3 text-text-secondary transition-all',
                responsive ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                // h-20 = 5rem height. Animate sliding from top to its
                // destination.
                top: responsive ? `${idx * 5}rem` : 0,
              }}
            >
              <LinkWrapper
                className="transition-opacity hover:opacity-80"
                href={href}
              >
                {label}
              </LinkWrapper>

              <p>/</p>
            </div>
          ))}

          <div
            className={clsx(
              'absolute right-0 left-0 flex h-20 flex-row items-center justify-center transition-all',
              responsive ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              // h-20 = 5rem height. Animate sliding from top to its
              // destination.
              top: responsive ? `${crumbs.length * 5}rem` : 0,
            }}
          >
            <Button
              className="text-text-primary"
              onClick={() => setResponsive(false)}
              size="none"
              variant="none"
            >
              <p>{current}</p>
            </Button>
          </div>
        </div>

        <div className="flex grow items-center justify-center">
          <IconButton
            Icon={Close}
            circular
            onClick={() => setResponsive(false)}
            size="lg"
            variant="secondary"
          />
        </div>
      </div>
    </>
  )
}
