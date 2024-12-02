import {
  Check,
  CheckRounded,
  CopyAll,
  HomeOutlined,
  InboxOutlined,
} from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecoilState } from 'recoil'
import useDeepCompareEffect from 'use-deep-compare-effect'

import { navigatingToHrefAtom } from '@dao-dao/state'
import { useDao, useDaoNavHelpers } from '@dao-dao/stateless'
import { AccountType, ContractVersion, Feature } from '@dao-dao/types'
import {
  CommandModalContextMaker,
  CommandModalContextSection,
  CommandModalContextWrapper,
  CommandModalDaoInfo,
} from '@dao-dao/types/command'
import { getDisplayNameForChainId, getFallbackImage } from '@dao-dao/utils'

import { DaoProviders } from '../../../components'
import {
  useDaoTabs,
  useFollowingDaos,
  useGovDaoTabs,
  useQueryLoadingData,
} from '../../../hooks'
import { daoQueries } from '../../../queries'

export const makeGenericDaoContext: CommandModalContextMaker<{
  dao: CommandModalDaoInfo
  /**
   * Whether or not this context is being used on a DAO page. Defaults to false.
   */
  onDaoPage?: boolean
}> = ({
  dao: { chainId, coreAddress, coreVersion, name, imageUrl },
  onDaoPage,
  ...options
}) => {
  const useLoadingTabs =
    coreVersion === ContractVersion.Gov ? useGovDaoTabs : useDaoTabs

  const useSections = () => {
    const { t } = useTranslation()
    const { getDaoPath, getDaoProposalPath, router } = useDaoNavHelpers()
    const dao = useDao()
    const loadingTabs = useLoadingTabs()

    const { isFollowing, setFollowing, setUnfollowing, updatingFollowing } =
      useFollowingDaos()
    const following = isFollowing({
      chainId,
      coreAddress,
    })

    const [copied, setCopied] = useState<number | undefined>()
    // Debounce clearing copied.
    useEffect(() => {
      const timeout = setTimeout(() => setCopied(undefined), 2000)
      return () => clearTimeout(timeout)
    }, [copied])

    const [navigatingToHref, setNavigatingToHref] =
      useRecoilState(navigatingToHrefAtom)
    const daoPageHref = getDaoPath(coreAddress)
    const createProposalHref = getDaoProposalPath(coreAddress, 'create')

    const queryClient = useQueryClient()
    const subDaosLoading = useQueryLoadingData(
      coreVersion === ContractVersion.Gov
        ? daoQueries.chainSubDaoInfos(queryClient, {
            chainId,
          })
        : {
            ...daoQueries.subDaoInfos(queryClient, {
              chainId,
              coreAddress,
            }),
            enabled: dao.supports(Feature.SubDaos),
          },
      []
    )

    // Pre-fetch routes.
    const routes = [
      daoPageHref,
      createProposalHref,
      ...(loadingTabs.loading
        ? []
        : loadingTabs.data.map(({ id }) => getDaoPath(coreAddress, id))),
    ]
    useDeepCompareEffect(() => {
      routes.forEach((url) => router.prefetch(url))
    }, [routes])

    const actionsSection: CommandModalContextSection<
      { href: string } | { onChoose: () => void }
    > = {
      name: t('title.actions'),
      onChoose: (item) => {
        if ('onChoose' in item) {
          return item.onChoose()
        }

        //! 'href' in item
        // Open remote links in new tab.
        if (item.href.startsWith('http')) {
          window.open(item.href, '_blank')
        } else {
          // Navigate to local links.
          router.push(item.href)

          // If not on destination page, set navigating state. If already there,
          // do nothing.
          if (router.asPath !== item.href) {
            setNavigatingToHref(item.href)
          }
        }
      },
      items: [
        ...(!onDaoPage
          ? [
              {
                name: t('button.goToDaoPage'),
                Icon: HomeOutlined,
                href: daoPageHref,
                loading: navigatingToHref === daoPageHref,
              },
            ]
          : []),
        {
          name: t('button.createAProposal'),
          Icon: InboxOutlined,
          href: createProposalHref,
          loading: navigatingToHref === createProposalHref,
          keywords: ['new'],
        },
        {
          name: following ? t('button.unfollow') : t('button.follow'),
          Icon: CheckRounded,
          onChoose: () =>
            (following ? setUnfollowing : setFollowing)({
              chainId,
              coreAddress,
            }),
          loading: updatingFollowing,
        },
        ...dao.accounts.map(({ chainId, address, type }, accountIndex) => ({
          name:
            copied === accountIndex
              ? t('info.copiedChainAddress', {
                  chain:
                    getDisplayNameForChainId(chainId) +
                    (type === AccountType.Valence ? ' (Valence)' : ''),
                })
              : t('button.copyChainAddress', {
                  chain:
                    getDisplayNameForChainId(chainId) +
                    (type === AccountType.Valence ? ' (Valence)' : ''),
                }),
          Icon: copied === accountIndex ? Check : CopyAll,
          onChoose: () => {
            navigator.clipboard.writeText(address)
            setCopied(accountIndex)
          },
        })),
      ],
    }

    const pagesSection: CommandModalContextSection<{ href: string }> = {
      name: t('title.pages'),
      onChoose: ({ href }) => {
        router.push(href)

        // If not on destination page, set navigating state. If already there,
        // do nothing.
        if (router.asPath !== href) {
          setNavigatingToHref(href)
        }
      },
      loading: loadingTabs.loading || loadingTabs.updating,
      items: (loadingTabs.loading ? [] : loadingTabs.data).map(
        ({ id, label, Icon }) => {
          const href = getDaoPath(coreAddress, id)

          return {
            name: label,
            Icon,
            href,
            loading: navigatingToHref === href,
          }
        }
      ),
    }

    const subDaosSection: CommandModalContextSection<CommandModalDaoInfo> = {
      name: t('title.subDaos'),
      onChoose: (dao) =>
        options.openContext(
          makeGenericDaoContext({
            ...options,
            dao,
          })
        ),
      loading: subDaosLoading.loading || subDaosLoading.updating,
      items: subDaosLoading.loading
        ? []
        : subDaosLoading.data.map(
            ({
              chainId,
              coreAddress,
              coreVersion,
              name,
              imageUrl,
            }): CommandModalDaoInfo => ({
              chainId,
              coreAddress,
              coreVersion,
              name,
              imageUrl: imageUrl || getFallbackImage(coreAddress),
            })
          ),
    }

    return onDaoPage
      ? [pagesSection, actionsSection, subDaosSection]
      : [actionsSection, pagesSection, subDaosSection]
  }

  const Wrapper: CommandModalContextWrapper = ({ children }) => (
    <DaoProviders chainId={chainId} coreAddress={coreAddress}>
      {children}
    </DaoProviders>
  )

  return {
    name,
    imageUrl,
    useSections,
    Wrapper,
  }
}
