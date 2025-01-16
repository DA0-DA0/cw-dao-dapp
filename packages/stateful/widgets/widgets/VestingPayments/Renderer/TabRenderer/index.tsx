import { useQueries, useQueryClient } from '@tanstack/react-query'
import uniqBy from 'lodash.uniqby'

import {
  contractQueries,
  cwPayrollFactoryExtraQueries,
  cwVestingExtraQueries,
} from '@dao-dao/state/query'
import {
  useDao,
  useDaoNavHelpers,
  useInitializedActionForKey,
} from '@dao-dao/stateless'
import {
  ActionKey,
  VestingPaymentsWidgetData,
  WidgetRendererProps,
} from '@dao-dao/types'
import {
  getDaoProposalSinglePrefill,
  makeCombineQueryResultsIntoLoadingDataWithError,
} from '@dao-dao/utils'

import {
  ButtonLink,
  Trans,
  VestingPaymentCard,
  VestingPaymentLine,
} from '../../../../../components'
import { useMembership } from '../../../../../hooks/useMembership'
import { TabRenderer as StatelessTabRenderer } from './TabRenderer'

export const TabRenderer = ({
  variables: { factories, factory, oldFactories },
}: WidgetRendererProps<VestingPaymentsWidgetData>) => {
  const { chainId: defaultChainId, coreAddress, accounts } = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const { isMember = false } = useMembership()

  const queryClient = useQueryClient()
  const vestingContractsLoading = useQueries({
    queries: [
      // Factory or factory list depending on version.
      ...(factories
        ? Object.entries(factories).map(([chainId, { address }]) => ({
            chainId,
            address,
          }))
        : factory
          ? [
              {
                chainId: defaultChainId,
                address: factory,
              },
            ]
          : // Should never happen.
            []
      ).map(({ chainId, address }) =>
        cwPayrollFactoryExtraQueries.listAllVestingContracts(queryClient, {
          chainId,
          address,
        })
      ),

      // Old factories.
      ...(oldFactories || []).map(({ address }) =>
        cwPayrollFactoryExtraQueries.listAllVestingContracts(queryClient, {
          chainId: defaultChainId,
          address,
        })
      ),

      // Contracts owned by any of this DAO's accounts. This detects contracts
      // whose ownership was transferred to this DAO but that are still part of
      // a different factory.
      ...accounts.map(({ chainId, address }) =>
        contractQueries.listVestingContractsOwnedByAccount(queryClient, {
          chainId,
          address,
        })
      ),
    ],
    combine: makeCombineQueryResultsIntoLoadingDataWithError({
      firstLoad: 'one',
      // Ignore errors from any of the queries unless all of them error. This is
      // important in case the DAO has an account on a non-indexed chain, which
      // causes the last query to error.
      errorIf: 'all',
    }),
  })

  // Fetch infos individually so they refresh when data is updated elsewhere.
  const vestingInfosLoading = useQueries({
    queries:
      vestingContractsLoading.loading || vestingContractsLoading.errored
        ? []
        : vestingContractsLoading.data.flatMap(({ chainId, contracts }) =>
            contracts.map(({ contract }) =>
              cwVestingExtraQueries.info(queryClient, {
                chainId,
                address: contract,
              })
            )
          ),
    combine: makeCombineQueryResultsIntoLoadingDataWithError({
      firstLoad: 'one',
      // De-dupe since the ownership queries will overlap with the factory list
      // queries.
      transform: (infos) =>
        uniqBy(
          infos,
          (info) => info.chainId + ':' + info.vestingContractAddress
        ),
    }),
  })

  const vestingAction = useInitializedActionForKey(ActionKey.ManageVesting)

  // Vesting payments that need a slash registered.
  const vestingPaymentsNeedingSlashRegistration =
    vestingInfosLoading.loading || vestingInfosLoading.errored
      ? []
      : vestingInfosLoading.data.filter(
          ({ hasUnregisteredSlashes }) => hasUnregisteredSlashes
        )

  return (
    <StatelessTabRenderer
      ButtonLink={ButtonLink}
      Trans={Trans}
      VestingPaymentCard={VestingPaymentCard}
      VestingPaymentLine={VestingPaymentLine}
      createVestingPaymentHref={
        !vestingAction.loading && !vestingAction.errored
          ? getDaoProposalPath(coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                actions: [
                  {
                    actionKey: vestingAction.data.key,
                    data: vestingAction.data.defaults,
                  },
                ],
              }),
            })
          : undefined
      }
      isMember={isMember}
      registerSlashesHref={
        !vestingAction.loading &&
        !vestingAction.errored &&
        vestingPaymentsNeedingSlashRegistration.length > 0
          ? getDaoProposalPath(coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                actions: vestingPaymentsNeedingSlashRegistration.flatMap(
                  ({
                    chainId,
                    vestingContractAddress,
                    slashes: validatorsWithSlashes,
                  }) =>
                    validatorsWithSlashes.flatMap(
                      ({ validatorOperatorAddress, slashes }) =>
                        slashes
                          .filter((slash) => slash.unregisteredAmount > 0)
                          .map((slash) => ({
                            actionKey: vestingAction.data.key,
                            data: {
                              ...vestingAction.data.defaults,
                              mode: 'registerSlash',
                              registerSlash: {
                                chainId,
                                address: vestingContractAddress,
                                validator: validatorOperatorAddress,
                                // Milliseconds to nanoseconds.
                                time: BigInt(slash.timeMs * 1e6).toString(),
                                amount: slash.unregisteredAmount.toString(),
                                duringUnbonding: slash.duringUnbonding,
                              },
                            },
                          }))
                    )
                ),
              }),
            })
          : undefined
      }
      vestingPaymentsLoading={vestingInfosLoading}
    />
  )
}
