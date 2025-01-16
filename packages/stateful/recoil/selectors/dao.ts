import uniq from 'lodash.uniq'
import {
  constSelector,
  selectorFamily,
  waitForAll,
  waitForAllSettled,
} from 'recoil'

import {
  DaoDaoCoreSelectors,
  DaoVotingCw20StakedSelectors,
  accountsSelector,
  contractInfoSelector,
  daoDropdownInfoSelector,
  daoVetoableDaosSelector,
  followingDaosSelector,
  isDaoSelector,
  queryAccountIndexerSelector,
  queryClientAtom,
  refreshProposalsIdAtom,
} from '@dao-dao/state'
import { getDao } from '@dao-dao/state/clients'
import {
  DaoPageMode,
  DaoSource,
  DaoWithDropdownVetoableProposalList,
  DaoWithVetoableProposals,
  IDaoBase,
  IProposalModuleBase,
  IndexerDaoWithVetoableProposals,
  StatefulProposalLineProps,
  WithChainId,
} from '@dao-dao/types'
import {
  DaoVotingCw20StakedAdapterId,
  getDaoProposalPath,
  isConfiguredChainName,
} from '@dao-dao/utils'

import { matchAdapter as matchVotingModuleAdapter } from '../../voting-module-adapter'

export const followingDaosWithProposalModulesSelector = selectorFamily<
  (DaoSource & {
    proposalModules: IProposalModuleBase[]
  })[],
  {
    walletPublicKey: string
  }
>({
  key: 'followingDaosWithProposalModules',
  get:
    (params) =>
    ({ get }) => {
      const following = get(followingDaosSelector(params))

      const proposalModules = get(
        waitForAll(
          following.map(({ chainId, coreAddress }) =>
            isConfiguredChainName(chainId, coreAddress)
              ? constSelector([])
              : daoCoreProposalModulesSelector({
                  chainId,
                  coreAddress,
                })
          )
        )
      )

      return following.map((daoSource, index) => ({
        ...daoSource,
        proposalModules: proposalModules[index],
      }))
    },
})

export const daoClientSelector = selectorFamily<
  IDaoBase,
  WithChainId<{ coreAddress: string }>
>({
  key: 'daoClient',
  get:
    ({ chainId, coreAddress }) =>
    async ({ get }) => {
      const queryClient = get(queryClientAtom)
      const dao = getDao({
        queryClient,
        chainId,
        coreAddress,
      })
      await dao.init()
      return dao
    },
})

export const daoCoreProposalModulesSelector = selectorFamily<
  IProposalModuleBase[],
  WithChainId<{ coreAddress: string }>
>({
  key: 'daoCoreProposalModules',
  get:
    (params) =>
    ({ get }) => [...get(daoClientSelector(params)).proposalModules],
})

// Gets CW20 governance token address if this DAO uses the cw20-staked voting
// module adapter.
export const daoCw20GovernanceTokenAddressSelector = selectorFamily<
  string | undefined,
  WithChainId<{
    coreAddress: string
  }>
>({
  key: 'daoCw20GovernanceTokenAddress',
  get:
    ({ coreAddress, chainId }) =>
    ({ get }) => {
      const votingModuleAddress = get(
        DaoDaoCoreSelectors.votingModuleSelector({
          contractAddress: coreAddress,
          chainId,
          params: [],
        })
      )
      const votingModuleInfo = votingModuleAddress
        ? get(
            contractInfoSelector({
              contractAddress: votingModuleAddress,
              chainId,
            })
          )
        : undefined

      let usesCw20VotingModule
      try {
        usesCw20VotingModule =
          !!votingModuleInfo &&
          matchVotingModuleAdapter(votingModuleInfo.info.contract)?.id ===
            DaoVotingCw20StakedAdapterId
      } catch {
        usesCw20VotingModule = false
      }

      const cw20GovernanceTokenAddress =
        votingModuleAddress && usesCw20VotingModule
          ? get(
              DaoVotingCw20StakedSelectors.tokenContractSelector({
                contractAddress: votingModuleAddress,
                chainId,
                params: [],
              })
            )
          : undefined

      return cw20GovernanceTokenAddress
    },
})

/**
 * Proposals which this DAO can currently veto.
 */
export const daosWithVetoableProposalsSelector = selectorFamily<
  DaoWithVetoableProposals[],
  WithChainId<{
    coreAddress: string
    /**
     * Include even DAOs not added to the vetoable DAOs list. By default, this
     * will filter out DAOs not explicitly registered in the list.
     */
    includeAll?: boolean
  }>
>({
  key: 'daosWithVetoableProposals',
  get:
    ({ chainId, coreAddress, includeAll = false }) =>
    ({ get }) => {
      // Refresh this when all proposals refresh.
      const id = get(refreshProposalsIdAtom)

      const accounts = get(
        accountsSelector({
          chainId,
          address: coreAddress,
        })
      )

      // Load DAOs this DAO has enabled vetoable proposal listing for.
      const vetoableDaos =
        !includeAll &&
        get(
          isDaoSelector({
            chainId,
            address: coreAddress,
          })
        )
          ? get(
              waitForAllSettled([
                daoVetoableDaosSelector({
                  chainId,
                  coreAddress,
                }),
              ])
            )[0].valueMaybe() || []
          : []

      const daoVetoableProposalsPerChain = (
        get(
          waitForAll(
            accounts.map(({ chainId, address }) =>
              queryAccountIndexerSelector({
                chainId,
                walletAddress: address,
                formula: 'veto/vetoableProposals',
                id,
                noFallback: true,
              })
            )
          )
        ) as (IndexerDaoWithVetoableProposals[] | undefined)[]
      )
        .flatMap((data, index) =>
          (data || []).map((d) => ({
            chainId: accounts[index].chainId,
            ...d,
          }))
        )
        .filter(
          ({ chainId, dao }) =>
            includeAll ||
            vetoableDaos.some(
              (vetoable) =>
                vetoable.chainId === chainId && vetoable.coreAddress === dao
            )
        )

      const uniqueChainsAndDaos = uniq(
        daoVetoableProposalsPerChain.map(
          ({ chainId, dao }) => `${chainId}:${dao}`
        )
      )

      const daoConfigs = get(
        waitForAllSettled(
          uniqueChainsAndDaos.map((chainAndDao) => {
            const [chainId, coreAddress] = chainAndDao.split(':')
            return DaoDaoCoreSelectors.configSelector({
              chainId,
              contractAddress: coreAddress,
              params: [],
            })
          })
        )
      )

      return uniqueChainsAndDaos.flatMap((chainAndDao, index) => {
        const config = daoConfigs[index]

        return config.state === 'hasValue'
          ? {
              chainId: chainAndDao.split(':')[0],
              dao: chainAndDao.split(':')[1],
              name: config.contents.name,
              proposalsWithModule: daoVetoableProposalsPerChain.find(
                (vetoable) =>
                  `${vetoable.chainId}:${vetoable.dao}` === chainAndDao
              )!.proposalsWithModule,
            }
          : []
      })
    },
})

/**
 * Proposals which this DAO can currently veto grouped by DAO with dropdown
 * info.
 */
export const daosWithDropdownVetoableProposalListSelector = selectorFamily<
  DaoWithDropdownVetoableProposalList<StatefulProposalLineProps>[],
  WithChainId<{ coreAddress: string; daoPageMode: DaoPageMode }>
>({
  key: 'daosWithDropdownVetoableProposalList',
  get:
    ({ daoPageMode, ...params }) =>
    ({ get }) => {
      const daosWithVetoableProposals = get(
        daosWithVetoableProposalsSelector(params)
      )

      const daoDropdownInfos = get(
        waitForAllSettled(
          daosWithVetoableProposals.map(({ chainId, dao }) =>
            daoDropdownInfoSelector({
              chainId,
              coreAddress: dao,
            })
          )
        )
      )

      return daosWithVetoableProposals.flatMap(
        ({
          chainId,
          dao,
          proposalsWithModule,
        }):
          | DaoWithDropdownVetoableProposalList<StatefulProposalLineProps>
          | [] => {
          const dropdownInfo = daoDropdownInfos
            .find(
              (info) =>
                info.state === 'hasValue' &&
                info.contents.chainId === chainId &&
                info.contents.coreAddress === dao
            )
            ?.valueMaybe()

          if (!dropdownInfo) {
            return []
          }

          return {
            dao: dropdownInfo,
            proposals: proposalsWithModule.flatMap(
              ({ proposalModule: { prefix }, proposals }) =>
                proposals.map(
                  ({ id }): StatefulProposalLineProps => ({
                    chainId,
                    coreAddress: dao,
                    proposalId: `${prefix}${id}`,
                    proposalViewUrl: getDaoProposalPath(
                      daoPageMode,
                      dao,
                      `${prefix}${id}`
                    ),
                  })
                )
            ),
          }
        }
      )
    },
})
