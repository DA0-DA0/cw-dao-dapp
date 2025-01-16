import {
  Loadable,
  atomFamily,
  noWait,
  selectorFamily,
  waitForAll,
  waitForAny,
} from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  AccountTxSave,
  AccountType,
  ContractVersionInfo,
  GenericTokenBalance,
  LazyDaoCardProps,
  LazyNftCardInfo,
  TokenCardInfo,
  TokenType,
  WithChainId,
} from '@dao-dao/types'
import { Config as DaoDaoCoreConfig } from '@dao-dao/types/contracts/DaoDaoCore'
import {
  DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES,
  HIDDEN_BALANCE_PREFIX,
  INACTIVE_DAO_NAMES,
  KVPK_API_BASE,
  ME_SAVED_TX_PREFIX,
  getFallbackImage,
  getNativeTokenForChainId,
  loadableToLoadingData,
  parseContractVersion,
} from '@dao-dao/utils'

import {
  refreshHiddenBalancesAtom,
  refreshSavedTxsAtom,
  refreshWalletBalancesIdAtom,
} from '../atoms'
import { accountsSelector } from './account'
import { nativeBalancesSelector, nativeDelegatedBalanceSelector } from './chain'
import { isContractSelector } from './contract'
import { votingModuleSelector } from './contracts/DaoDaoCore'
import * as DaoVotingTokenStaked from './contracts/DaoVotingTokenStaked'
import { lazyDaoCardPropsSelector } from './dao'
import { followingDaosSelector } from './following'
import { queryAccountIndexerSelector } from './indexer'
import {
  walletLazyNftCardInfosSelector,
  walletStakedLazyNftCardInfosSelector,
} from './nft'
import { genericTokenSelector, tokenCardLazyInfoSelector } from './token'

// Get CW20 balances for a wallet from the indexer.
export const walletCw20BalancesSelector = selectorFamily<
  GenericTokenBalance[],
  WithChainId<{ walletAddress: string }>
>({
  key: 'walletCw20Balances',
  get:
    ({ walletAddress, chainId }) =>
    ({ get }) => {
      const id = get(refreshWalletBalancesIdAtom(walletAddress))

      const cw20Contracts: {
        contractAddress: string
        balance: string
      }[] =
        get(
          queryAccountIndexerSelector({
            chainId,
            walletAddress,
            formula: 'tokens/list',
            id,
            noFallback: true,
          })
        ) ?? []

      const tokens = get(
        waitForAll(
          cw20Contracts.map(({ contractAddress }) =>
            genericTokenSelector({
              type: TokenType.Cw20,
              denomOrAddress: contractAddress,
              chainId,
            })
          )
        )
      )

      return tokens.map((token, index) => ({
        token,
        balance: cw20Contracts[index].balance,
      }))
    },
})

export const walletTokenDaoStakedDenomsSelector = selectorFamily<
  readonly string[],
  WithChainId<{ walletAddress: string }>
>({
  key: 'walletTokenDaoStakedDenoms',
  get:
    ({ walletAddress, chainId }) =>
    ({ get }) => {
      // Get the DAOs that the wallet is a member of
      const daos = get(
        queryAccountIndexerSelector({
          chainId,
          walletAddress,
          formula: 'daos/memberOf',
          noFallback: true,
        })
      )
      if (!daos || !Array.isArray(daos) || daos.length === 0) {
        return []
      }

      // Get the token staked voting modules for each DAO
      const votingModules = get(
        waitForAll(
          daos.map(({ dao: contractAddress }) =>
            votingModuleSelector({
              contractAddress,
              chainId,
              params: [],
            })
          )
        )
      ).filter((contractAddress) =>
        get(
          isContractSelector({
            contractAddress,
            chainId,
            names: DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES,
          })
        )
      )

      if (votingModules.length === 0) {
        return []
      }

      // Get a list of denoms from the voting modules
      const denoms = get(
        waitForAll(
          votingModules.map((contractAddress) =>
            DaoVotingTokenStaked.denomSelector({
              contractAddress,
              chainId,
              params: [],
            })
          )
        )
      )

      // Create a Set from the denoms to ensure uniqueness
      const uniqueDenoms = new Set(denoms.map(({ denom }) => denom))

      // Convert the Set back into an array to return
      return [...uniqueDenoms]
    },
})

// This doesn't update right away due to Cloudflare KV Store latency, so this
// serves to keep track of all successful updates for the current session. This
// will be reset on page refresh. Set this right away so the UI can update
// immediately even if the API takes up to a minute or two. Though likely it
// only takes 10 seconds or so.
//
// Takes wallet public key as a parameter.
export const temporarySavedTxsAtom = atomFamily<
  Record<string, AccountTxSave | null>,
  string
>({
  key: 'temporarySavedTxs',
  default: {},
})

// Takes wallet public key as a parameter.
export const savedTxsSelector = selectorFamily<AccountTxSave[], string>({
  key: 'savedTxs',
  get:
    (walletPublicKey) =>
    async ({ get }) => {
      get(refreshSavedTxsAtom)

      const temporary = get(temporarySavedTxsAtom(walletPublicKey))

      const response = await fetch(
        KVPK_API_BASE + `/list/${walletPublicKey}/${ME_SAVED_TX_PREFIX}`
      )

      if (response.ok) {
        const { items } = (await response.json()) as {
          items: {
            key: string
            value: AccountTxSave
          }[]
        }

        const savedItems = Object.entries(temporary)
        // Add any items that are in the KV store but not in the temporary map.
        items.forEach(({ key, value }) => {
          if (!(key in temporary)) {
            savedItems.push([key, value])
          }
        })

        const saves = savedItems
          .map(([, value]) => value)
          // If the save is null, it came from the temporary map and means it
          // was deleted, so we need to remove it from the list.
          .filter((save): save is AccountTxSave => !!save)
          .sort((a, b) => a.name.localeCompare(b.name))

        return saves
      } else {
        throw new Error(
          `Failed to fetch tx saves: ${response.status}/${
            response.statusText
          } ${await response.text().catch(() => '')}`.trim()
        )
      }
    },
})

// This doesn't update right away due to Cloudflare KV Store latency, so this
// serves to keep track of all successful updates for the current session. This
// will be reset on page refresh. Set this right away so the UI can update
// immediately even if the API takes up to a minute or two. Though likely it
// only takes 10 seconds or so.
//
// Takes wallet public key as a parameter.
export const temporaryHiddenBalancesAtom = atomFamily<
  Record<string, number | null>,
  string
>({
  key: 'temporaryHiddenBalances',
  default: {},
})

// Takes wallet public key as a parameter. Return list of token denomOrAddress
// fields that are hidden.
export const hiddenBalancesSelector = selectorFamily<string[], string>({
  key: 'hiddenBalances',
  get:
    (walletPublicKey) =>
    async ({ get }) => {
      get(refreshHiddenBalancesAtom)

      const temporary = get(temporaryHiddenBalancesAtom(walletPublicKey))

      const response = await fetch(
        KVPK_API_BASE + `/list/${walletPublicKey}/${HIDDEN_BALANCE_PREFIX}`
      )

      if (response.ok) {
        const { items } = (await response.json()) as {
          items: {
            key: string
            value: number | null
          }[]
        }

        const hiddenBalances = Object.entries(temporary)
        // Add any items that are in the KV store but not in the temporary map.
        items.forEach(({ key, value }) => {
          if (!(key in temporary)) {
            hiddenBalances.push([key, value])
          }
        })

        const hidden = hiddenBalances
          .filter(([, value]) => value !== null)
          // Remove prefix so it's just the token's denomOrAddress.
          .map(([key]) => key.replace(HIDDEN_BALANCE_PREFIX, ''))

        return hidden
      } else {
        throw new Error(
          `Failed to fetch hidden balances: ${response.status}/${
            response.statusText
          } ${await response.text().catch(() => '')}`.trim()
        )
      }
    },
})

// lazyInfo must be loaded in the component separately, since it refreshes on a
// timer and we don't want this whole selector to reevaluate and load when that
// refreshes. Use `tokenCardLazyInfoSelector`.
export const walletTokenCardInfosSelector = selectorFamily<
  TokenCardInfo[],
  WithChainId<{
    walletAddress: string
  }>
>({
  key: 'walletTokenCardInfos',
  get:
    ({ walletAddress, chainId }) =>
    ({ get }) => {
      const id = get(refreshWalletBalancesIdAtom(walletAddress))

      const allAccounts = get(
        accountsSelector({
          chainId,
          address: walletAddress,
        })
      )

      const nativeBalances = get(
        waitForAll(
          allAccounts.map(({ chainId, address }) =>
            nativeBalancesSelector({
              address,
              chainId,
            })
          )
        )
      )
      const cw20ContractsLoadable: Loadable<
        | {
            contractAddress: string
            balance: string | undefined
          }[]
        | undefined
      > = get(
        noWait(
          queryAccountIndexerSelector({
            chainId,
            walletAddress,
            formula: 'tokens/list',
            id,
            noFallback: true,
          })
        )
      )
      const cw20Contracts =
        cw20ContractsLoadable.state === 'hasValue'
          ? (cw20ContractsLoadable.contents ?? [])
          : []
      const cw20s = get(
        noWait(
          waitForAny(
            cw20Contracts.map((c) =>
              genericTokenSelector({
                type: TokenType.Cw20,
                denomOrAddress: c.contractAddress,
                chainId,
              })
            )
          )
        )
      )

      const infos: TokenCardInfo[] = [
        ...nativeBalances.flatMap((accountBalances, accountIndex) =>
          accountBalances.map(({ token, balance }) => {
            // Staking info only exists for native token.
            const hasStakingInfo =
              token.denomOrAddress ===
                getNativeTokenForChainId(chainId).denomOrAddress &&
              // Check if anything staked.
              HugeDecimal.from(
                get(
                  nativeDelegatedBalanceSelector({
                    address: walletAddress,
                    chainId,
                  })
                ).amount
              ).isPositive()

            const owner = allAccounts[accountIndex]

            const lazyInfo = get(
              noWait(
                tokenCardLazyInfoSelector({
                  owner: owner.address,
                  token,
                  unstakedBalance: balance,
                })
              )
            )

            const info: TokenCardInfo = {
              owner,
              token,
              isGovernanceToken: false,
              unstakedBalance: HugeDecimal.from(balance),
              hasStakingInfo,
              lazyInfo: loadableToLoadingData(lazyInfo, {
                usdUnitPrice: undefined,
                stakingInfo: undefined,
                totalBalance: HugeDecimal.from(balance),
              }),
            }

            return info
          })
        ),
        ...(cw20s.valueMaybe() || []).flatMap((tokenLoadable, index) => {
          const token = tokenLoadable.valueMaybe()
          if (!token) {
            return []
          }

          const unstakedBalance = HugeDecimal.from(
            cw20Contracts[index].balance || 0
          )

          const lazyInfo = get(
            noWait(
              tokenCardLazyInfoSelector({
                owner: walletAddress,
                token,
                unstakedBalance: unstakedBalance.toString(),
              })
            )
          )

          const info: TokenCardInfo = {
            owner: {
              type: AccountType.Base,
              chainId,
              address: walletAddress,
            },
            token,
            isGovernanceToken: false,
            unstakedBalance,
            // No unstaking info for CW20.
            hasStakingInfo: false,
            lazyInfo: loadableToLoadingData(lazyInfo, {
              usdUnitPrice: undefined,
              stakingInfo: undefined,
              totalBalance: unstakedBalance,
            }),
          }

          return info
        }),
      ]

      return infos
    },
})

// Get NFTs for a wallet on many chains.
export const allWalletNftsSelector = selectorFamily<
  LazyNftCardInfo[],
  {
    chainId: string
    walletAddress: string
  }[]
>({
  key: 'allWalletNfts',
  get:
    (chainWallets) =>
    ({ get }) => {
      const nativeNfts = get(
        waitForAll(
          chainWallets.map(({ chainId, walletAddress }) =>
            walletLazyNftCardInfosSelector({
              chainId,
              walletAddress,
            })
          )
        )
      ).reduce(
        (acc, nftCardInfos) => [
          ...acc,
          ...Object.values(nftCardInfos).flatMap((data) =>
            !data || data.loading || data.errored ? [] : data.data
          ),
        ],
        [] as LazyNftCardInfo[]
      )

      const nativeStakedNfts = get(
        waitForAll(
          chainWallets.map(({ chainId, walletAddress }) =>
            walletStakedLazyNftCardInfosSelector({
              chainId,
              walletAddress,
            })
          )
        )
      ).flat()

      return [...nativeNfts, ...nativeStakedNfts]
    },
})

// Get lazy card info for DAOs this wallet is a member of.
export const lazyWalletDaosSelector = selectorFamily<
  LazyDaoCardProps[],
  WithChainId<{ address: string }>
>({
  key: 'lazyWalletDaos',
  get:
    ({ chainId, address }) =>
    ({ get }) => {
      const daos: {
        dao: string
        info: ContractVersionInfo
        config: DaoDaoCoreConfig
        proposalCount: number
      }[] = get(
        queryAccountIndexerSelector({
          chainId,
          walletAddress: address,
          formula: 'daos/memberOf',
          noFallback: true,
        })
      )
      if (!daos || !Array.isArray(daos)) {
        return []
      }

      const lazyDaoCards = daos.map(
        ({ dao, info, config, proposalCount }): LazyDaoCardProps => ({
          info: {
            chainId,
            coreAddress: dao,
            coreVersion: parseContractVersion(info.version),
            name: config.name,
            description: config.description,
            imageUrl: config.image_url || getFallbackImage(dao),
          },
          isInactive:
            INACTIVE_DAO_NAMES.includes(config.name) || proposalCount === 0,
        })
      )

      return lazyDaoCards
    },
})

// Get lazy card info for DAOs this wallet is following.
export const lazyWalletFollowingDaosSelector = selectorFamily<
  LazyDaoCardProps[],
  { walletPublicKey: string }
>({
  key: 'lazyWalletFollowingDaos',
  get:
    ({ walletPublicKey }) =>
    ({ get }) => {
      const daos = get(
        followingDaosSelector({
          walletPublicKey,
        })
      )

      return daos.length > 0
        ? get(
            waitForAny(daos.map((dao) => lazyDaoCardPropsSelector(dao)))
          ).flatMap((loadable) => loadable.valueMaybe() || [])
        : []
    },
})
