import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  daoVoteDelegationQueries,
  delegationsQueries,
  indexerQueries,
} from '@dao-dao/state/query'
import {
  DaoVoteDelegationCard as StatelessDaoVoteDelegationCard,
  useDao,
} from '@dao-dao/stateless'
import {
  DelegationForm,
  StatefulDaoVoteDelegationCardProps,
  VoteDelegationWidgetData,
  WidgetId,
} from '@dao-dao/types'
import {
  executeSmartContract,
  executeSmartContracts,
  processError,
} from '@dao-dao/utils'

import {
  useAwaitNextBlock,
  useQueryLoadingDataWithError,
  useWallet,
} from '../../hooks'
import { useWidget } from '../../widgets'
import { Trans } from '../Trans'

// TODO(delegations): stream delegation updates via websockets
// TODO(delegations): add delegated VP to member proposal voting power card
// TODO(delegations): separate delegated VP from personal VP in vote cast list
export const DaoVoteDelegationCard = (
  props: StatefulDaoVoteDelegationCardProps
) => {
  const { t } = useTranslation()
  const dao = useDao()
  const queryClient = useQueryClient()
  const { address: walletAddress, getSigningClient } = useWallet()

  const voteDelegation = useWidget<VoteDelegationWidgetData>(
    WidgetId.VoteDelegation
  )
  if (!voteDelegation?.daoWidget.values?.address) {
    throw new Error('Vote delegation widget not set up')
  }
  const chainId = dao.chainId
  const { address } = voteDelegation.daoWidget.values

  const totalVotingPower = useQueryLoadingDataWithError(
    dao.getTotalVotingPowerQuery(),
    (data) => HugeDecimal.from(data.power)
  )

  const delegates = useQueryLoadingDataWithError(
    delegationsQueries.listAllDelegates(queryClient, {
      chainId,
      address,
    })
  )

  const delegations = useQueryLoadingDataWithError(
    walletAddress
      ? delegationsQueries.listAllDelegations(queryClient, {
          chainId,
          address,
          delegator: walletAddress,
        })
      : undefined
  )

  const registration = useQueryLoadingDataWithError(
    walletAddress
      ? daoVoteDelegationQueries.registration(queryClient, {
          chainId,
          contractAddress: address,
          args: {
            delegate: walletAddress,
          },
        })
      : undefined
  )

  const awaitNextBlock = useAwaitNextBlock()

  const [loadingRegistration, setLoadingRegistration] = useState(false)
  const updateRegistration = async (register: boolean) => {
    if (!walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setLoadingRegistration(true)
    try {
      // Ensure there are no delegations when registering.
      const delegations = register
        ? await queryClient.fetchQuery(
            delegationsQueries.listAllDelegations(queryClient, {
              chainId,
              address,
              delegator: walletAddress,
            })
          )
        : []

      await executeSmartContracts({
        client: getSigningClient,
        sender: walletAddress,
        instructions: [
          // Undelegate all existing delegations when registering.
          ...delegations.map(({ delegate }) => ({
            contractAddress: address,
            msg: {
              undelegate: {
                delegate,
              },
            },
          })),
          // Register or unregister.
          {
            contractAddress: address,
            msg: register
              ? {
                  register: {},
                }
              : {
                  unregister: {},
                },
          },
        ],
      })

      // Wait one block.
      await awaitNextBlock()

      // Refetch the indexer query first, and then the contract query.
      await Promise.all([
        queryClient
          .refetchQueries({
            queryKey: indexerQueries.queryContract(queryClient, {
              chainId,
              contractAddress: address,
              formula: 'daoVoteDelegation/registration',
              args: {
                delegate: walletAddress,
              },
            }).queryKey,
          })
          .then(() =>
            queryClient.refetchQueries({
              queryKey: daoVoteDelegationQueries.registration(queryClient, {
                chainId,
                contractAddress: address,
                args: {
                  delegate: walletAddress,
                },
              }).queryKey,
            })
          ),
        queryClient
          .refetchQueries({
            queryKey: indexerQueries.queryContract(queryClient, {
              chainId,
              contractAddress: address,
              formula: 'daoVoteDelegation/delegates',
            }).queryKey,
          })
          .then(() =>
            queryClient.refetchQueries({
              queryKey: daoVoteDelegationQueries.delegates(queryClient, {
                chainId,
                contractAddress: address,
                args: {},
              }).queryKey,
            })
          )
          .then(() =>
            queryClient.refetchQueries({
              queryKey: delegationsQueries.listAllDelegates(queryClient, {
                chainId,
                address,
              }).queryKey,
            })
          ),
        queryClient
          .refetchQueries({
            queryKey: indexerQueries.queryContract(queryClient, {
              chainId,
              contractAddress: address,
              formula: 'daoVoteDelegation/delegations',
              args: {
                delegator: walletAddress,
              },
            }).queryKey,
          })
          .then(() =>
            queryClient.refetchQueries({
              queryKey: daoVoteDelegationQueries.delegations(queryClient, {
                chainId,
                contractAddress: address,
                args: {
                  delegator: walletAddress,
                },
              }).queryKey,
            })
          )
          .then(() =>
            queryClient.refetchQueries({
              queryKey: delegationsQueries.listAllDelegations(queryClient, {
                chainId,
                address,
                delegator: walletAddress,
              }).queryKey,
            })
          ),
      ])

      if (register) {
        toast.success(t('success.registered'))
      } else {
        toast.success(t('success.unregistered'))
      }
    } catch (error) {
      console.error(error)
      toast.error(processError(error))
    } finally {
      setLoadingRegistration(false)
    }
  }

  const [loadingDelegate, setLoadingDelegate] = useState(false)
  const delegate = async ({ delegate, percent }: DelegationForm) => {
    if (!walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setLoadingDelegate(true)
    try {
      await executeSmartContract(getSigningClient, walletAddress, address, {
        delegate: {
          delegate,
          percent: HugeDecimal.from(percent).div(100).toString(),
        },
      })

      // Wait one block.
      await awaitNextBlock()

      // Refetch the indexer query first, and then the contract query.
      await queryClient
        .refetchQueries({
          queryKey: indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'daoVoteDelegation/delegations',
            args: {
              delegator: walletAddress,
            },
          }).queryKey,
        })
        .then(() =>
          queryClient.refetchQueries({
            queryKey: daoVoteDelegationQueries.delegations(queryClient, {
              chainId,
              contractAddress: address,
              args: {
                delegator: walletAddress,
              },
            }).queryKey,
          })
        )
        .then(() =>
          queryClient.refetchQueries({
            queryKey: delegationsQueries.listAllDelegations(queryClient, {
              chainId,
              address,
              delegator: walletAddress,
            }).queryKey,
          })
        )

      toast.success(t('success.delegated'))
    } catch (error) {
      console.error(error)
      toast.error(processError(error))
    } finally {
      setLoadingDelegate(false)
    }
  }

  const [loadingUndelegate, setLoadingUndelegate] = useState(false)
  const undelegate = async (delegate: string) => {
    if (!walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setLoadingUndelegate(true)
    try {
      await executeSmartContract(getSigningClient, walletAddress, address, {
        undelegate: {
          delegate,
        },
      })

      // Wait one block.
      await awaitNextBlock()

      // Refetch the indexer query first, and then the contract query.
      await queryClient
        .refetchQueries({
          queryKey: indexerQueries.queryContract(queryClient, {
            chainId,
            contractAddress: address,
            formula: 'daoVoteDelegation/delegations',
            args: {
              delegator: walletAddress,
            },
          }).queryKey,
        })
        .then(() =>
          queryClient.refetchQueries({
            queryKey: daoVoteDelegationQueries.delegations(queryClient, {
              chainId,
              contractAddress: address,
              args: {
                delegator: walletAddress,
              },
            }).queryKey,
          })
        )
        .then(() =>
          queryClient.refetchQueries({
            queryKey: delegationsQueries.listAllDelegations(queryClient, {
              chainId,
              address,
              delegator: walletAddress,
            }).queryKey,
          })
        )

      toast.success(t('success.undelegated'))
    } catch (error) {
      console.error(error)
      toast.error(processError(error))
    } finally {
      setLoadingUndelegate(false)
    }
  }

  return (
    <StatelessDaoVoteDelegationCard
      {...props}
      Trans={Trans}
      delegate={delegate}
      delegates={delegates}
      delegations={delegations}
      loadingDelegate={loadingDelegate}
      loadingRegistration={loadingRegistration}
      loadingUndelegate={loadingUndelegate}
      registration={registration}
      totalVotingPower={totalVotingPower}
      undelegate={undelegate}
      updateRegistration={updateRegistration}
    />
  )
}
