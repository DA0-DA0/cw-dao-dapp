import { constSelector, waitForAny } from 'recoil'

import {
  accountsSelector,
  hiddenBalancesSelector,
  walletTokenCardInfosSelector,
} from '@dao-dao/state/recoil'
import {
  ProfileWallet as StatelessProfileWallet,
  useCachedLoadingWithError,
  useInitializedActionForKey,
} from '@dao-dao/stateless'
import { ActionKey, StatefulProfileWalletProps } from '@dao-dao/types'
import { getActionBuilderPrefillPath } from '@dao-dao/utils'

import { useProfile } from '../../hooks'
import { ButtonLink } from '../ButtonLink'
import { IconButtonLink } from '../IconButtonLink'
import { TreasuryHistoryGraph } from '../TreasuryHistoryGraph'
import { WalletTokenLineReadonly } from '../wallet'
import { WalletTokenLine } from '../wallet/WalletTokenLine'
import { ProfileAddChains } from './ProfileAddChains'

export const ProfileWallet = ({ address }: StatefulProfileWalletProps = {}) => {
  // Read-only if address is defined.
  const readOnly = !!address

  const { chains, uniquePublicKeys } = useProfile({
    address,
  })

  const accounts = useCachedLoadingWithError(
    chains.loading
      ? undefined
      : chains.data.length > 0
        ? waitForAny(
            chains.data.map(({ chainId, address }) =>
              accountsSelector({
                chainId,
                address,
              })
            )
          )
        : constSelector([]),
    (chainLoadables) => chainLoadables.flatMap((l) => l.valueMaybe() || [])
  )

  const tokens = useCachedLoadingWithError(
    chains.loading
      ? undefined
      : chains.data.length > 0
        ? waitForAny(
            chains.data.map(({ chainId, address }) =>
              walletTokenCardInfosSelector({
                chainId,
                walletAddress: address,
              })
            )
          )
        : constSelector([]),
    (chainLoadables) => chainLoadables.flatMap((l) => l.valueMaybe() || [])
  )

  const hiddenTokens = useCachedLoadingWithError(
    uniquePublicKeys.loading
      ? undefined
      : uniquePublicKeys.data.length > 0
        ? waitForAny(
            uniquePublicKeys.data.map(({ publicKey }) =>
              hiddenBalancesSelector(publicKey)
            )
          )
        : constSelector([]),
    (chainLoadables) => chainLoadables.flatMap((l) => l.valueMaybe() || [])
  )

  const configureRebalancerAction = useInitializedActionForKey(
    ActionKey.ConfigureRebalancer
  )

  return (
    <StatelessProfileWallet
      ButtonLink={ButtonLink}
      IconButtonLink={IconButtonLink}
      ProfileAddChains={ProfileAddChains}
      TokenLine={readOnly ? WalletTokenLineReadonly : WalletTokenLine}
      TreasuryHistoryGraph={TreasuryHistoryGraph}
      accounts={accounts}
      configureRebalancerHref={
        !readOnly &&
        !configureRebalancerAction.loading &&
        !configureRebalancerAction.errored
          ? getActionBuilderPrefillPath([
              {
                actionKey: configureRebalancerAction.data.key,
                data: configureRebalancerAction.data.defaults,
              },
            ])
          : undefined
      }
      hiddenTokens={hiddenTokens}
      readOnly={readOnly}
      tokens={tokens}
    />
  )
}
