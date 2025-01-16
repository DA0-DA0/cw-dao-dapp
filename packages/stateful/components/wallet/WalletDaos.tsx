import uniqBy from 'lodash.uniqby'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  constSelector,
  useSetRecoilState,
  waitForAll,
  waitForAny,
} from 'recoil'

import {
  commandModalVisibleAtom,
  lazyWalletDaosSelector,
  lazyWalletFollowingDaosSelector,
} from '@dao-dao/state/recoil'
import {
  WalletDaos as StatelessWalletDaos,
  useCachedLoadingWithError,
  useChain,
} from '@dao-dao/stateless'
import { StatefulWalletDaosProps } from '@dao-dao/types'
import { getSupportedChains, serializeDaoSource } from '@dao-dao/utils'

import { useProfile } from '../../hooks/useProfile'
import { LazyDaoCard } from '../dao'
import { ProfileAddChains } from '../profile/ProfileAddChains'

export const WalletDaos = ({ address }: StatefulWalletDaosProps) => {
  const { t } = useTranslation()

  const { chainId } = useChain()
  const { connected, chains, uniquePublicKeys } = useProfile({
    address,
  })

  const missingChains =
    !chains.loading && chains.data.length < getSupportedChains().length

  const walletDaos = useCachedLoadingWithError(
    chains.loading || uniquePublicKeys.loading
      ? undefined
      : // If no chains and an address is passed, just use the current chain.
        chains.data.length === 0 && address
        ? waitForAll([
            waitForAny([
              lazyWalletDaosSelector({
                chainId,
                address,
              }),
            ]),
            // Can't load following DAOs if there are no chains and thus no public
            // key to load from.
            constSelector([]),
          ])
        : waitForAll([
            waitForAny(
              chains.data.map(({ chainId, address }) =>
                lazyWalletDaosSelector({
                  chainId,
                  address,
                })
              )
            ),
            // If wallet connected, load following.
            connected
              ? waitForAll(
                  uniquePublicKeys.data.map(({ publicKey }) =>
                    lazyWalletFollowingDaosSelector({
                      walletPublicKey: publicKey,
                    })
                  )
                )
              : constSelector([]),
          ]),
    ([memberOfLoadable, allFollowing]) => {
      const memberOf = memberOfLoadable.flatMap((l) => l.valueMaybe() || [])
      const following = allFollowing.flat()

      const memberDaos = new Set(
        memberOf.map((dao) => serializeDaoSource(dao.info))
      )
      const followingDaos = new Set(
        following.map((dao) => serializeDaoSource(dao.info))
      )

      // Combine DAOs and remove duplicates.
      return uniqBy([...memberOf, ...following], (dao) =>
        serializeDaoSource(dao.info)
      )
        .map((props) => ({
          ...props,
          isMember: memberDaos.has(serializeDaoSource(props.info)),
          isFollowed: followingDaos.has(serializeDaoSource(props.info)),
        }))
        .sort((a, b) => a.info.name.localeCompare(b.info.name))
    }
  )

  const setCommandModalVisible = useSetRecoilState(commandModalVisibleAtom)
  const openSearch = useCallback(
    () => setCommandModalVisible(true),
    [setCommandModalVisible]
  )

  return (
    <div className="flex flex-col gap-4">
      <StatelessWalletDaos
        LazyDaoCard={LazyDaoCard}
        daos={walletDaos}
        includesFollowing={!address}
        openSearch={address ? undefined : openSearch}
      />

      {missingChains && connected && (
        <ProfileAddChains
          className="self-end"
          prompt={t('button.addChains')}
          promptTooltip={t('info.supportedChainDaosNotShowingUpPrompt')}
        />
      )}
    </div>
  )
}
