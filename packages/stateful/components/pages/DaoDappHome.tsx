import { Add } from '@mui/icons-material'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DaoDappTabbedHome,
  FollowingToggle,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import {
  ActionKey,
  DaoDappTabbedHomeProps,
  DaoTabId,
  DaoTabWithComponent,
  Feature,
  FollowState,
  LoadingData,
} from '@dao-dao/types'
import { getDaoProposalSinglePrefill } from '@dao-dao/utils'

import {
  useDaoTabs,
  useFollowingDaos,
  useGovDaoTabs,
  useMembership,
} from '../../hooks'
import { ButtonLink } from '../ButtonLink'
import { LinkWrapper } from '../LinkWrapper'
import { PageHeaderContent } from '../PageHeaderContent'
import { SuspenseLoader } from '../SuspenseLoader'

export type InnerDaoDappHomeProps = Pick<
  DaoDappTabbedHomeProps,
  'parentProposalRecognizeSubDaoHref' | 'proposeUpdateAdminToParentHref'
> & {
  loadingTabs: LoadingData<DaoTabWithComponent[]>
}

export const InnerDaoDappHome = ({
  loadingTabs,
  ...props
}: InnerDaoDappHomeProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { getDaoPath, getDaoProposalPath, router } = useDaoNavHelpers()

  const { isFollowing, setFollowing, setUnfollowing, updatingFollowing } =
    useFollowingDaos()
  const following = isFollowing({
    chainId: dao.chainId,
    coreAddress: dao.coreAddress,
  })

  // Just a type-check because some tabs are loaded at the beginning.
  const tabs = loadingTabs.loading ? undefined : loadingTabs.data
  // Default to proposals tab for type-check, but should never happen as some
  // tabs are loaded at the beginning.
  const firstTabId = tabs?.[0].id || DaoTabId.Proposals

  // Pre-fetch tabs.
  useEffect(() => {
    tabs?.forEach((tab) => {
      router.prefetch(getDaoPath(dao.coreAddress, tab.id))
    })
  }, [dao.coreAddress, getDaoPath, router, tabs])

  const slug = (router.query.slug || []) as string[]
  const checkedSlug = useRef(false)
  useEffect(() => {
    // Only check one time, in case they load the page with no slug. This
    // prevents a bug where sometimes this would reset the page to the current
    // DAO when clicking on a SubDAO before the SubDAO loads.
    if (checkedSlug.current) {
      return
    }
    checkedSlug.current = true

    // If no slug and on current DAO, redirect to first tab.
    if (slug.length === 0) {
      router.replace(getDaoPath(dao.coreAddress, firstTabId), undefined, {
        shallow: true,
      })
    }
  }, [dao.coreAddress, getDaoPath, router, slug.length, firstTabId])

  const tabId =
    slug.length > 0 && tabs?.some(({ id }) => id === slug[0])
      ? slug[0]
      : // If tab is invalid, default to first tab.
        firstTabId
  const onSelectTabId = (tabId: string) =>
    router.replace(getDaoPath(dao.coreAddress, tabId), undefined, {
      shallow: true,
    })

  const follow: FollowState = {
    following,
    onFollow: () =>
      (following ? setUnfollowing : setFollowing)({
        chainId: dao.chainId,
        coreAddress: dao.coreAddress,
      }),
    updatingFollowing,
  }

  return (
    <>
      <PageHeaderContent
        breadcrumbs={{
          home: true,
          current: dao.name,
          dao,
        }}
        rightNode={
          <>
            {/* Show propose button on desktop. */}
            <ButtonLink
              className="hidden md:block"
              contentContainerClassName="text-text-body text-base !gap-1.5"
              href={getDaoProposalPath(dao.coreAddress, 'create')}
              variant="ghost"
            >
              <Add className="!h-5 !w-5 !text-icon-primary" />
              {t('button.propose')}
            </ButtonLink>

            {/* Show follow button on mobile. */}
            <FollowingToggle
              {...follow}
              className="md:hidden"
              contentContainerClassName="text-text-body text-sm"
              variant="ghost"
            />
          </>
        }
      />

      <DaoDappTabbedHome
        {...props}
        ButtonLink={ButtonLink}
        LinkWrapper={LinkWrapper}
        SuspenseLoader={SuspenseLoader}
        follow={follow}
        onSelectTabId={onSelectTabId}
        selectedTabId={tabId}
        tabs={tabs || []}
      />
    </>
  )
}

export const DaoDappHome = () => {
  const { t } = useTranslation()
  const { getDaoProposalPath } = useDaoNavHelpers()

  const dao = useDao()
  const {
    chainId,
    coreAddress,
    name,
    info: { contractAdmin, parentDao },
  } = dao

  const { isMember = false } = useMembership()
  // We won't use this value unless there's a parent, so the undefined DAO
  // override (which loads the current DAO) will be ignored.
  const { isMember: isMemberOfParent = false } = useMembership({
    dao: parentDao || undefined,
  })

  const parentProposalRecognizeSubDaoHref =
    // Only show this prefill proposal link if the wallet is a member of the
    // parent.
    isMemberOfParent &&
    // Only v2+ DAOs support SubDAOs.
    dao.supports(Feature.SubDaos) &&
    // Only show if the parent has not already registered this as a SubDAO.
    parentDao &&
    !parentDao.registeredSubDao
      ? getDaoProposalPath(parentDao.coreAddress, 'create', {
          prefill: getDaoProposalSinglePrefill({
            title: t('title.recognizeSubDao', {
              name: name,
            }),
            description: t('info.recognizeSubDaoDescription', {
              name: name,
            }),
            actions: [
              {
                actionKey: ActionKey.ManageSubDaos,
                data: {
                  toAdd: [
                    {
                      addr: coreAddress,
                    },
                  ],
                  toRemove: [],
                },
              },
            ],
          }),
        })
      : undefined

  const proposeUpdateAdminToParentHref =
    // Only show if this DAO has a parent DAO but its contract-level admin is
    // set to itself. Only the current contract-level admin can change it.
    parentDao && contractAdmin === coreAddress
      ? // Make proposal in SubDAO if current wallet is a member of the SubDAO or not a member of the parent DAO (just to make it clear that this is a prompt to fix it).
        isMember || !isMemberOfParent
        ? getDaoProposalPath(coreAddress, 'create', {
            prefill: getDaoProposalSinglePrefill({
              title: t('title.setAdminToParent', {
                parent: parentDao.name,
              }),
              description:
                t('info.parentDaoNotAdmin', {
                  child: name,
                  parent: parentDao.name,
                }) +
                ' ' +
                t('info.proposalFixesChildAdmin', {
                  child: name,
                  parent: parentDao.name,
                }),
              actions: [
                {
                  actionKey: ActionKey.UpdateAdmin,
                  data: {
                    chainId,
                    contract: coreAddress,
                    newAdmin: parentDao.coreAddress,
                  },
                },
              ],
            }),
          })
        : // Make proposal in parent DAO if current wallet is a member.
          isMemberOfParent
          ? getDaoProposalPath(parentDao.coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                title: t('title.fixChildAdmin', {
                  child: name,
                }),
                description:
                  t('info.parentDaoNotAdmin', {
                    child: name,
                    parent: parentDao.name,
                  }) +
                  ' ' +
                  t('info.proposalFixesChildAdmin', {
                    child: name,
                    parent: parentDao.name,
                  }),
                actions: [
                  {
                    actionKey: ActionKey.DaoAdminExec,
                    data: {
                      coreAddress: coreAddress,
                      msgs: [],
                      _actionData: [
                        {
                          actionKey: ActionKey.UpdateAdmin,
                          data: {
                            chainId,
                            contract: coreAddress,
                            newAdmin: parentDao.coreAddress,
                          },
                        },
                      ],
                    },
                  },
                ],
              }),
            })
          : undefined
      : undefined

  const loadingTabs = useDaoTabs()

  return (
    <InnerDaoDappHome
      loadingTabs={loadingTabs}
      parentProposalRecognizeSubDaoHref={parentProposalRecognizeSubDaoHref}
      proposeUpdateAdminToParentHref={proposeUpdateAdminToParentHref}
    />
  )
}

export const ChainGovernanceDappHome = () => {
  const loadingTabs = useGovDaoTabs()
  return <InnerDaoDappHome loadingTabs={loadingTabs} />
}
