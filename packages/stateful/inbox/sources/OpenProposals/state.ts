import { selectorFamily, waitForAll } from 'recoil'

import {
  blockHeightSelector,
  blocksPerYearSelector,
  openProposalsSelector,
} from '@dao-dao/state/recoil'
import {
  DaoPageMode,
  InboxSourceDaoWithItems,
  InboxSourceItem,
  WithChainId,
} from '@dao-dao/types'
import { convertExpirationToDate, getDaoProposalPath } from '@dao-dao/utils'

import { ProposalLineProps } from '../../../components/ProposalLine'
import { followingDaosWithProposalModulesSelector } from '../../../recoil'

export const inboxOpenProposalsSelector = selectorFamily<
  InboxSourceDaoWithItems[],
  WithChainId<{ wallet?: { address: string; hexPublicKey: string } }>
>({
  key: 'inboxOpenProposals',
  get:
    ({ wallet, chainId }) =>
    ({ get }) => {
      const blocksPerYear = get(
        blocksPerYearSelector({
          chainId,
        })
      )
      const currentBlockHeight = get(
        blockHeightSelector({
          chainId,
        })
      )

      // Need proposal modules for the proposal line props.
      const followingDaosWithProposalModules = wallet
        ? get(
            followingDaosWithProposalModulesSelector({
              walletPublicKey: wallet.hexPublicKey,
              chainId,
            })
          )
        : []

      const openProposalsPerDao = get(
        waitForAll(
          followingDaosWithProposalModules.map(({ coreAddress }) =>
            openProposalsSelector({
              coreAddress,
              address: wallet?.address,
              chainId,
            })
          )
        )
      )

      // Match up open proposals per DAO with their proposal modules.
      return followingDaosWithProposalModules.map(
        (
          { coreAddress, proposalModules },
          index
        ): InboxSourceDaoWithItems<ProposalLineProps> => {
          const proposalModulesWithOpenProposals = openProposalsPerDao[index]

          return {
            coreAddress,
            items: proposalModules.flatMap(
              (proposalModule) =>
                proposalModulesWithOpenProposals
                  .find(
                    ({ proposalModuleAddress }) =>
                      proposalModuleAddress === proposalModule.address
                  )
                  ?.proposals.map(
                    ({
                      id,
                      proposal: { expiration },
                      voted,
                    }): InboxSourceItem<ProposalLineProps> => ({
                      props: {
                        coreAddress,
                        proposalId: `${proposalModule.prefix}${id}`,
                        proposalModules,
                        proposalViewUrl: getDaoProposalPath(
                          DaoPageMode.Dapp,
                          coreAddress,
                          `${proposalModule.prefix}${id}`
                        ),
                      },
                      pending: !voted,
                      order: convertExpirationToDate(
                        blocksPerYear,
                        expiration,
                        currentBlockHeight
                      )?.getTime(),
                    })
                  ) ?? []
            ),
          }
        }
      )
    },
})
