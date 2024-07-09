import {
  constSelector,
  selectorFamily,
  waitForAll,
  waitForAllSettled,
} from 'recoil'

import {
  Account,
  AccountType,
  GenericToken,
  GenericTokenBalanceWithOwner,
  IcaAccount,
  TokenType,
  WithChainId,
} from '@dao-dao/types'
import {
  ICA_CHAINS_TX_PREFIX,
  POLYTONE_CONFIG_PER_CHAIN,
  getConfiguredChainConfig,
  tokensEqual,
} from '@dao-dao/utils'

import { moduleAddressSelector } from './chain'
import {
  isDaoSelector,
  isPolytoneProxySelector,
  isValenceAccountSelector,
} from './contract'
import { DaoDaoCoreSelectors, PolytoneProxySelectors } from './contracts'
import { icaRemoteAddressSelector } from './ica'
import {
  genericTokenBalanceSelector,
  genericTokenBalancesSelector,
  genericTokenDelegatedBalanceSelector,
  genericTokenUndelegatingBalancesSelector,
} from './token'
import { valenceAccountSelector, valenceAccountsSelector } from './valence'

// Get accounts controlled by this address, including its native chain, all
// polytone proxies, registered ICA accounts, and all valence accounts.
export const accountsSelector = selectorFamily<
  Account[],
  WithChainId<{
    address: string
    // Chain IDs to include ICAs from.
    includeIcaChains?: string[]
  }>
>({
  key: 'accounts',
  get:
    ({ chainId, address, includeIcaChains }) =>
    ({ get }) => {
      const chainConfig = getConfiguredChainConfig(chainId)
      // In case address is the name of a chain, get the gov module address.
      if (chainConfig?.name === address) {
        address = get(
          moduleAddressSelector({
            chainId,
            name: 'gov',
          })
        )
      }

      const [isDao, isPolytoneProxy, isValenceAccount] = get(
        waitForAll([
          isDaoSelector({
            chainId,
            address,
          }),
          isPolytoneProxySelector({
            chainId,
            address,
          }),
          isValenceAccountSelector({
            chainId,
            address,
          }),
        ])
      )

      // If this is a DAO, get its polytone proxies and registered ICAs.
      const [polytoneProxies, registeredIcas] = isDao
        ? get(
            waitForAll([
              DaoDaoCoreSelectors.polytoneProxiesSelector({
                chainId,
                contractAddress: address,
              }),
              DaoDaoCoreSelectors.listAllItemsWithPrefixSelector({
                chainId,
                contractAddress: address,
                prefix: ICA_CHAINS_TX_PREFIX,
              }),
            ])
          )
        : []

      const mainAccount: Account = isValenceAccount
        ? // If this is a valence account, get its config.
          get(
            valenceAccountSelector({
              chainId,
              address,
            })
          )
        : {
            chainId,
            address,
            type: isPolytoneProxy ? AccountType.Polytone : AccountType.Native,
          }

      const allAccounts: Account[] = [
        // Main account.
        mainAccount,
        // Polytone.
        ...Object.entries(polytoneProxies || {}).map(
          ([chainId, address]): Account => ({
            chainId,
            address,
            type: AccountType.Polytone,
          })
        ),
      ]

      // If main account is native, load ICA accounts.
      const icaChains =
        mainAccount.type === AccountType.Native
          ? [
              ...(registeredIcas || []).map(([key]) => key),
              ...(includeIcaChains || []),
            ]
          : []

      // Get ICA addresses controlled by native account.
      const icas = icaChains.length
        ? get(
            waitForAllSettled(
              icaChains.map((chainId) =>
                icaRemoteAddressSelector({
                  srcChainId: mainAccount.chainId,
                  address: mainAccount.address,
                  destChainId: chainId,
                })
              )
            )
          ).flatMap((addressLoadable, index): IcaAccount | [] =>
            addressLoadable.state === 'hasValue'
              ? {
                  type: AccountType.Ica,
                  chainId: icaChains[index],
                  address: addressLoadable.valueMaybe()!,
                }
              : []
          )
        : []

      // Add ICA accounts.
      allAccounts.push(...icas)

      // Get valence accounts controlled by all non-valence accounts.
      const valenceAccounts = get(
        waitForAllSettled(
          allAccounts
            .filter(({ type }) => type !== AccountType.Valence)
            .map(({ chainId, address }) =>
              valenceAccountsSelector({
                address,
                chainId,
              })
            )
        )
      ).flatMap((loadable) => loadable.valueMaybe() || [])

      // Add valence accounts.
      allAccounts.push(...valenceAccounts)

      return allAccounts
    },
})

export const allBalancesSelector = selectorFamily<
  GenericTokenBalanceWithOwner[],
  WithChainId<{
    address: string
    // If account is a DAO, set this to the denom of its native governance
    // token.
    nativeGovernanceTokenDenom?: string
    // If account is a DAO, set this to the address of its cw20 governance
    // token.
    cw20GovernanceTokenAddress?: string
    // Chain IDs to include ICAs from.
    includeIcaChains?: string[]
    // Only get balances for this token type.
    filter?: TokenType
    // Additional tokens to fetch balances for.
    additionalTokens?: Pick<
      GenericToken,
      'chainId' | 'type' | 'denomOrAddress'
    >[]
    // Ignore staked and unstaking tokens.
    ignoreStaked?: boolean
    // Include only these account types.
    includeAccountTypes?: AccountType[]
    // Exclude these account types.
    excludeAccountTypes?: AccountType[]
  }>
>({
  key: 'allBalances',
  get:
    ({
      chainId: mainChainId,
      address: mainAddress,
      nativeGovernanceTokenDenom,
      cw20GovernanceTokenAddress,
      includeIcaChains,
      filter,
      additionalTokens,
      ignoreStaked,
      includeAccountTypes,
      excludeAccountTypes = [AccountType.Valence],
    }) =>
    ({ get }) => {
      const allAccounts = get(
        accountsSelector({
          chainId: mainChainId,
          address: mainAddress,
          includeIcaChains,
        })
      ).filter(({ type }) => {
        if (includeAccountTypes) {
          return includeAccountTypes.includes(type)
        }
        if (excludeAccountTypes) {
          return !excludeAccountTypes.includes(type)
        }
        return true
      })

      const accountBalances = get(
        waitForAll(
          allAccounts.map(({ address, chainId }) =>
            waitForAllSettled([
              // All unstaked
              genericTokenBalancesSelector({
                chainId: mainChainId,
                address: mainAddress,
                nativeGovernanceTokenDenom:
                  chainId === mainChainId
                    ? nativeGovernanceTokenDenom
                    : undefined,
                cw20GovernanceTokenAddress:
                  chainId === mainChainId
                    ? cw20GovernanceTokenAddress
                    : undefined,
                filter: {
                  tokenType: filter,
                  account: {
                    chainId,
                    address,
                  },
                },
              }),
              // Additional unstaked tokens on this account's chain.
              waitForAllSettled(
                (additionalTokens || [])
                  .filter((token) => token.chainId === chainId)
                  .map((token) =>
                    genericTokenBalanceSelector({
                      ...token,
                      address,
                    })
                  )
              ),
              // Native staked
              (!filter || filter === TokenType.Native) && !ignoreStaked
                ? genericTokenDelegatedBalanceSelector({
                    chainId,
                    address,
                  })
                : constSelector(undefined),
              // Native unstaking
              (!filter || filter === TokenType.Native) && !ignoreStaked
                ? genericTokenUndelegatingBalancesSelector({
                    chainId,
                    address,
                  })
                : constSelector(undefined),
            ])
          )
        )
      )

      return allAccounts.flatMap((owner, index) => {
        // All unstaked
        const unstakedBalances = accountBalances[index][0].valueMaybe() || []
        // Additional unstaked
        const additionalUnstakedBalances =
          accountBalances[index][1]
            .valueMaybe()
            ?.flatMap((loadable) => loadable.valueMaybe() || [])
            // Remove any tokens that are already in unstakedBalances.
            .filter(
              (a) =>
                !unstakedBalances.some((b) => tokensEqual(a.token, b.token))
            ) || []

        // Native staked
        const stakedBalance = accountBalances[index][2].valueMaybe()
        // Native unstaking
        const unstakingBalances = accountBalances[index][3].valueMaybe()

        const balances = [
          ...unstakedBalances,
          ...additionalUnstakedBalances,
          ...(stakedBalance ? [stakedBalance] : []),
          ...(unstakingBalances ?? []),
        ]

        return balances.map(
          (balance): GenericTokenBalanceWithOwner => ({
            ...balance,
            owner,
          })
        )
      })
    },
})

/**
 * Given a polytone proxy, get the source chain, address, and polytone note.
 */
export const reverseLookupPolytoneProxySelector = selectorFamily<
  | {
      chainId: string
      address: string
      note: string
    }
  | undefined,
  WithChainId<{ proxy: string }>
>({
  key: 'reverseLookupPolytoneProxy',
  get:
    ({ proxy, chainId }) =>
    ({ get }) => {
      // Get voice for this proxy on destination chain.
      const voice = get(
        PolytoneProxySelectors.instantiatorSelector({
          chainId,
          contractAddress: proxy,
          params: [],
        })
      )
      if (!voice) {
        return
      }

      // Get source address for this voice.
      const address = get(
        PolytoneProxySelectors.remoteControllerForPolytoneProxySelector({
          chainId,
          voice,
          proxy,
        })
      )
      if (!address) {
        return
      }

      // Get source polytone connection, where the note lives for this voice.
      const srcPolytoneInfo = POLYTONE_CONFIG_PER_CHAIN.find(([, config]) =>
        Object.entries(config).some(
          ([destChainId, connection]) =>
            destChainId === chainId && connection.voice === voice
        )
      )
      if (!srcPolytoneInfo) {
        return
      }

      return {
        chainId: srcPolytoneInfo[0],
        address,
        note: srcPolytoneInfo[1][chainId].note,
      }
    },
})
