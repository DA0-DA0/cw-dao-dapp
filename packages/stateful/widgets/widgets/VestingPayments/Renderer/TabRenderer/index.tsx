import { useEffect } from 'react'
import { useSetRecoilState } from 'recoil'

import { refreshVestingAtom } from '@dao-dao/state/recoil'
import {
  useCachedLoadable,
  useDaoInfoContext,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import { ActionKey, WidgetRendererProps } from '@dao-dao/types'
import {
  getDaoProposalSinglePrefill,
  loadableToLoadingData,
} from '@dao-dao/utils'

import { useActionForKey } from '../../../../../actions'
import { ButtonLink, EntityDisplay, Trans } from '../../../../../components'
import { useMembership } from '../../../../../hooks/useMembership'
import { VestingPaymentCard } from '../../components/VestingPaymentCard'
import { VestingPaymentsData } from '../../types'
import { vestingInfosSelector } from '../state'
import { TabRenderer as StatelessTabRenderer } from './TabRenderer'

export const TabRenderer = ({
  variables: { factory },
}: WidgetRendererProps<VestingPaymentsData>) => {
  const { coreAddress, chainId } = useDaoInfoContext()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const { isMember = false } = useMembership({
    coreAddress,
    chainId,
  })

  const setRefresh = useSetRecoilState(refreshVestingAtom(''))
  // Refresh vesting data every 30 seconds.
  useEffect(() => {
    const interval = setInterval(() => setRefresh((id) => id + 1), 30000)
    return () => clearInterval(interval)
  }, [setRefresh])

  const vestingPaymentsLoading = loadableToLoadingData(
    useCachedLoadable(
      vestingInfosSelector({
        factory,
        chainId,
      })
    ),
    []
  )

  const vestingAction = useActionForKey(ActionKey.ManageVesting)
  const vestingActionDefaults = vestingAction?.action.useDefaults()

  // Vesting payments that need a slash registered.
  const vestingPaymentsNeedingSlashRegistration = vestingPaymentsLoading.loading
    ? []
    : vestingPaymentsLoading.data.filter(
        ({ hasUnregisteredSlashes }) => hasUnregisteredSlashes
      )

  return (
    <StatelessTabRenderer
      ButtonLink={ButtonLink}
      EntityDisplay={EntityDisplay}
      Trans={Trans}
      VestingPaymentCard={VestingPaymentCard}
      createVestingPaymentHref={
        vestingAction
          ? getDaoProposalPath(coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                actions: [
                  {
                    actionKey: vestingAction.action.key,
                    data: vestingActionDefaults,
                  },
                ],
              }),
            })
          : undefined
      }
      isMember={isMember}
      registerSlashesHref={
        vestingAction && vestingPaymentsNeedingSlashRegistration.length > 0
          ? getDaoProposalPath(coreAddress, 'create', {
              prefill: getDaoProposalSinglePrefill({
                actions: vestingPaymentsNeedingSlashRegistration.flatMap(
                  ({
                    vestingContractAddress,
                    slashes: validatorsWithSlashes,
                  }) =>
                    validatorsWithSlashes.flatMap(
                      ({ validatorOperatorAddress, slashes }) =>
                        slashes
                          .filter((slash) => slash.unregisteredAmount > 0)
                          .map((slash) => ({
                            action: vestingAction,
                            data: {
                              ...vestingActionDefaults,
                              mode: 'registerSlash',
                              registerSlash: {
                                address: vestingContractAddress,
                                validator: validatorOperatorAddress,
                                // Milliseconds to nanoseconds.
                                time: (slash.timeMs * 1e6).toString(),
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
      vestingPaymentsLoading={vestingPaymentsLoading}
    />
  )
}
