import uniq from 'lodash.uniq'
import { selectorFamily, waitForAll, waitForAllSettled } from 'recoil'

import {
  Account,
  AccountType,
  GenericTokenBalanceWithOwner,
  WithChainId,
} from '@dao-dao/types'

import { isDaoSelector } from './contract'
import { DaoCoreV2Selectors } from './contracts'
import {
  genericTokenBalancesSelector,
  genericTokenDelegatedBalanceSelector,
} from './token'
import { valenceAccountsSelector } from './valence'

// Get accounts controlled by this address, including its native chain, all
// polytone proxies, and all valence accounts.
export const accountsSelector = selectorFamily<
  Account[],
  WithChainId<{ address: string }>
>({
  key: 'accounts',
  get:
    ({ chainId, address }) =>
    ({ get }) => {
      const isDao = get(
        isDaoSelector({
          chainId,
          address,
        })
      )

      const polytoneProxies = isDao
        ? Object.entries(
            get(
              DaoCoreV2Selectors.polytoneProxiesSelector({
                chainId,
                contractAddress: address,
              })
            )
          )
        : []

      const allAccounts: Account[] = [
        // Current chain.
        {
          chainId,
          address,
          type: AccountType.Native,
        },
        // Polytone.
        ...polytoneProxies.map(
          ([chainId, address]): Account => ({
            chainId,
            address,
            type: AccountType.Polytone,
          })
        ),
      ]

      // Get valence accounts on each potential chain.
      const valenceAccounts = get(
        waitForAll(
          allAccounts.map(({ chainId, address }) =>
            valenceAccountsSelector({
              address,
              chainId,
            })
          )
        )
      ).flat()

      // Add valence accounts.
      allAccounts.push(...valenceAccounts)

      return allAccounts
    },
})

export const allBalancesSelector = selectorFamily<
  // Map chain ID to token balances on that chain.
  Record<string, GenericTokenBalanceWithOwner[]>,
  WithChainId<{
    address: string
    // If account is a DAO, set this to the address of its governance token.
    cw20GovernanceTokenAddress?: string
  }>
>({
  key: 'allBalances',
  get:
    ({ address, cw20GovernanceTokenAddress, chainId }) =>
    ({ get }) => {
      const allAccounts = get(
        accountsSelector({
          chainId,
          address,
        })
      )

      const accountBalances = get(
        waitForAll(
          allAccounts.map(({ address, chainId }) =>
            waitForAllSettled([
              // All unstaked
              genericTokenBalancesSelector({
                chainId,
                address,
                cw20GovernanceTokenAddress,
              }),
              // Native staked
              genericTokenDelegatedBalanceSelector({
                chainId,
                walletAddress: address,
              }),
            ])
          )
        )
      )

      const uniqueChainIds = uniq(allAccounts.map(({ chainId }) => chainId))

      return uniqueChainIds.reduce((acc, chainId) => {
        // Get accounts and balances per account on this chain.
        const chainAccountBalances = allAccounts.flatMap((account, index) => {
          // All unstaked
          const unstakedBalances = accountBalances[index][0].valueMaybe() || []
          // Native staked
          const stakedBalance = accountBalances[index][1].valueMaybe()

          return account.chainId === chainId
            ? {
                account,
                balances: [
                  ...unstakedBalances,
                  ...(stakedBalance
                    ? [
                        {
                          ...stakedBalance,
                          staked: true,
                        },
                      ]
                    : []),
                ],
              }
            : []
        })

        return {
          ...acc,
          [chainId]: chainAccountBalances.flatMap(({ account, balances }) =>
            balances.map(
              (balance): GenericTokenBalanceWithOwner => ({
                ...balance,
                owner: account,
              })
            )
          ),
        }
      }, {} as Record<string, GenericTokenBalanceWithOwner[]>)
    },
})
