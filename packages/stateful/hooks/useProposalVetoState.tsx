import { ThumbDownOutlined } from '@mui/icons-material'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { getDao } from '@dao-dao/state/clients'
import {
  ProposalStatusAndInfoProps,
  Tooltip,
  useConfiguredChainContext,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import {
  ActionKey,
  EntityType,
  NeutronTimelockOverrule,
  ProposalStatusEnum,
  ProposalStatusKey,
  cwMsgToEncodeObject,
} from '@dao-dao/types'
import { VetoConfig } from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import {
  CHAIN_GAS_MULTIPLIER,
  SECRET_GAS,
  getDaoProposalSinglePrefill,
  isSecretNetwork,
  makeCw1WhitelistExecuteMessage,
  makeExecuteSmartContractMessage,
  processError,
} from '@dao-dao/utils'

import { ButtonLink, EntityDisplay } from '../components'
import { useProposalModuleAdapterOptions } from '../proposal-module-adapter'
import { useEntity } from './useEntity'
import { useOnSecretNetworkPermitUpdate } from './useOnSecretNetworkPermitUpdate'
import { useWallet } from './useWallet'

export type UseProposalVetoStateOptions = {
  statusKey: ProposalStatusKey
  vetoConfig: VetoConfig | null | undefined
  neutronTimelockOverrule?: NeutronTimelockOverrule
  onVetoSuccess: () => void | Promise<void>
  onExecuteSuccess: () => void | Promise<void>
}

export type UseProposalVetoStateReturn = {
  vetoEnabled: boolean
  canBeVetoed: boolean
  vetoOrEarlyExecute: ProposalStatusAndInfoProps['vetoOrEarlyExecute']
  vetoInfoItems: ProposalStatusAndInfoProps['info']
}

/**
 * This hook is used in the proposal module adapters' ProposalStatusAndInfo
 * components to load the veto configuration and handle when the current wallet
 * has the power to veto/early-execute.
 */
export const useProposalVetoState = ({
  statusKey,
  vetoConfig,
  neutronTimelockOverrule,
  onVetoSuccess,
  onExecuteSuccess,
}: UseProposalVetoStateOptions): UseProposalVetoStateReturn => {
  const { t } = useTranslation()
  const router = useRouter()
  const {
    chain: { chainId },
  } = useConfiguredChainContext()
  const { coreAddress } = useDao()
  const { getDaoProposalPath } = useDaoNavHelpers()
  const { proposalModule, proposalNumber } = useProposalModuleAdapterOptions()
  const { address: walletAddress = '', getSigningClient } = useWallet()
  const queryClient = useQueryClient()

  const vetoEnabled = !!vetoConfig || !!neutronTimelockOverrule
  const [vetoLoading, setVetoLoading] = useState<
    'veto' | 'earlyExecute' | false
  >(false)
  const { entity: vetoerEntity } = useEntity(
    vetoConfig?.vetoer || neutronTimelockOverrule?.dao || ''
  )
  const { vetoerEntities, vetoerDaoEntities, vetoerDaoClients } =
    useMemo(() => {
      // Flatten vetoer entities in case a cw1-whitelist is the vetoer.
      const vetoerEntities = !vetoerEntity.loading
        ? vetoerEntity.data.type === EntityType.Cw1Whitelist
          ? vetoerEntity.data.entities
          : [vetoerEntity.data]
        : []

      const vetoerDaoEntities = vetoerEntities.filter(
        (entity) => entity.type === EntityType.Dao
      )

      const vetoerDaoClients = vetoerDaoEntities.map((entity) =>
        getDao({
          queryClient,
          chainId,
          coreAddress: entity.address,
        })
      )

      return {
        vetoerEntities,
        vetoerDaoEntities,
        vetoerDaoClients,
      }
    }, [chainId, queryClient, vetoerEntity])

  // This is the voting power the current wallet has in each of the DAO vetoers.
  const walletDaoVetoerMemberships = useQueries({
    queries: walletAddress
      ? vetoerDaoClients.map((dao) => dao.getVotingPowerQuery(walletAddress))
      : [],
  })
  // Make sure this component re-renders if the Secret Network permit changes so
  // the voting queries above refresh.
  useOnSecretNetworkPermitUpdate({
    dao: vetoerDaoClients,
  })

  const canBeVetoed =
    vetoEnabled &&
    (statusKey === 'veto_timelock' ||
      (statusKey === ProposalStatusEnum.Open &&
        !!vetoConfig?.veto_before_passed) ||
      statusKey === ProposalStatusEnum.NeutronTimelocked)
  // Find matching vetoer for this wallet, which is either the wallet itself or
  // a DAO this wallet is a member of. If a matching vetoer is found, this
  // wallet can veto.
  const matchingWalletVetoer =
    canBeVetoed && !vetoerEntity.loading
      ? // Find wallet that matches address.
        vetoerEntities.find(
          (entity) =>
            entity.type === EntityType.Wallet &&
            entity.address === walletAddress
        ) ||
        // Find DAO where wallet is a member.
        vetoerDaoEntities.find((_, index) => {
          const membershipQuery = walletDaoVetoerMemberships[index]
          return (
            !!membershipQuery &&
            !membershipQuery.isPending &&
            !membershipQuery.isError &&
            membershipQuery.data.power !== '0'
          )
        })
      : undefined
  const walletCanEarlyExecute =
    !!matchingWalletVetoer &&
    statusKey === 'veto_timelock' &&
    !!vetoConfig?.early_execute
  const onVeto = useCallback(async () => {
    if (vetoerEntity.loading || !matchingWalletVetoer) {
      return
    }

    setVetoLoading('veto')
    try {
      // For Neutron timelocked proposals, just navigate to the overrule
      // proposal.
      if (neutronTimelockOverrule) {
        router.push(
          getDaoProposalPath(
            neutronTimelockOverrule.dao,
            neutronTimelockOverrule.proposalModulePrefix +
              neutronTimelockOverrule.proposal.id.toString()
          )
        )
      } else if (
        vetoerEntity.data.type === EntityType.Wallet ||
        (vetoerEntity.data.type === EntityType.Cw1Whitelist &&
          matchingWalletVetoer.type === EntityType.Wallet)
      ) {
        const msg = makeExecuteSmartContractMessage({
          chainId,
          sender: vetoerEntity.data.address,
          contractAddress: proposalModule.address,
          msg: {
            veto: {
              proposal_id: proposalNumber,
            },
          },
        })

        await (
          await getSigningClient()
        ).signAndBroadcast(
          walletAddress,
          [
            cwMsgToEncodeObject(
              chainId,
              vetoerEntity.data.type === EntityType.Wallet
                ? msg
                : makeCw1WhitelistExecuteMessage({
                    chainId,
                    sender: walletAddress,
                    cw1WhitelistContract: vetoerEntity.data.address,
                    msg,
                  }),
              walletAddress
            ),
          ],
          isSecretNetwork(chainId) ? SECRET_GAS.VETO : CHAIN_GAS_MULTIPLIER
        )

        await onVetoSuccess()
      } else if (matchingWalletVetoer.type === EntityType.Dao) {
        router.push(
          getDaoProposalPath(matchingWalletVetoer.address, 'create', {
            prefill: getDaoProposalSinglePrefill({
              actions: [
                {
                  actionKey: ActionKey.VetoProposal,
                  data: {
                    chainId,
                    coreAddress,
                    proposalModuleAddress: proposalModule.address,
                    proposalId: proposalNumber,
                  },
                },
              ],
            }),
          })
        )
      }
    } catch (err) {
      console.error(err)
      toast.error(processError(err))

      // Stop loading if errored.
      setVetoLoading(false)
    }

    // Loading will stop on success when status refreshes.
  }, [
    vetoerEntity,
    matchingWalletVetoer,
    neutronTimelockOverrule,
    router,
    getDaoProposalPath,
    getSigningClient,
    proposalModule.address,
    proposalNumber,
    onVetoSuccess,
    walletAddress,
    chainId,
    coreAddress,
  ])
  const onVetoEarlyExecute = useCallback(async () => {
    if (vetoerEntity.loading || !matchingWalletVetoer) {
      return
    }

    setVetoLoading('earlyExecute')
    try {
      if (
        vetoerEntity.data.type === EntityType.Wallet ||
        (vetoerEntity.data.type === EntityType.Cw1Whitelist &&
          matchingWalletVetoer.type === EntityType.Wallet)
      ) {
        const msg = makeExecuteSmartContractMessage({
          chainId,
          sender: vetoerEntity.data.address,
          contractAddress: proposalModule.address,
          msg: {
            execute: {
              proposal_id: proposalNumber,
            },
          },
        })

        await (
          await getSigningClient()
        ).signAndBroadcast(
          walletAddress,
          [
            cwMsgToEncodeObject(
              chainId,
              vetoerEntity.data.type === EntityType.Wallet
                ? msg
                : makeCw1WhitelistExecuteMessage({
                    chainId,
                    sender: walletAddress,
                    cw1WhitelistContract: vetoerEntity.data.address,
                    msg,
                  }),
              walletAddress
            ),
          ],
          isSecretNetwork(chainId) ? SECRET_GAS.VETO : CHAIN_GAS_MULTIPLIER
        )

        await onExecuteSuccess()
      } else if (matchingWalletVetoer.type === EntityType.Dao) {
        router.push(
          getDaoProposalPath(matchingWalletVetoer.address, 'create', {
            prefill: getDaoProposalSinglePrefill({
              actions: [
                {
                  actionKey: ActionKey.ExecuteProposal,
                  data: {
                    chainId,
                    coreAddress,
                    proposalModuleAddress: proposalModule.address,
                    proposalId: proposalNumber,
                  },
                },
              ],
            }),
          })
        )
      }
    } catch (err) {
      console.error(err)
      toast.error(processError(err))

      // Stop loading if errored.
      setVetoLoading(false)
    }

    // Loading will stop on success when status refreshes.
  }, [
    vetoerEntity,
    matchingWalletVetoer,
    getSigningClient,
    proposalModule.address,
    proposalNumber,
    onExecuteSuccess,
    walletAddress,
    router,
    getDaoProposalPath,
    chainId,
    coreAddress,
  ])

  return {
    vetoEnabled,
    canBeVetoed,
    vetoOrEarlyExecute: matchingWalletVetoer
      ? {
          loading: vetoLoading,
          onVeto,
          onEarlyExecute: walletCanEarlyExecute
            ? onVetoEarlyExecute
            : undefined,
          isVetoerDaoMember: matchingWalletVetoer.type === EntityType.Dao,
          isNeutronOverrule: !!neutronTimelockOverrule,
        }
      : undefined,
    vetoInfoItems:
      canBeVetoed ||
      statusKey === ProposalStatusEnum.Vetoed ||
      statusKey === ProposalStatusEnum.NeutronOverruled
        ? neutronTimelockOverrule
          ? ([
              {
                Icon: ThumbDownOutlined,
                label: t('title.overrule'),
                Value: (props) => (
                  <Tooltip
                    morePadding
                    title={
                      <EntityDisplay
                        address={neutronTimelockOverrule.dao}
                        noCopy
                      />
                    }
                  >
                    <ButtonLink
                      href={getDaoProposalPath(
                        neutronTimelockOverrule.dao,
                        neutronTimelockOverrule.proposalModulePrefix +
                          neutronTimelockOverrule.proposal.id.toString()
                      )}
                      variant="underline"
                      {...props}
                    >
                      {t('title.proposalId', {
                        id: neutronTimelockOverrule.proposal.id,
                      })}
                    </ButtonLink>
                  </Tooltip>
                ),
              },
            ] as ProposalStatusAndInfoProps['info'])
          : (vetoerEntities.map((entity) => ({
              Icon: ThumbDownOutlined,
              label: t('title.vetoer'),
              Value: (props) => (
                <EntityDisplay {...props} address={entity.address} noCopy />
              ),
            })) as ProposalStatusAndInfoProps['info'])
        : [],
  }
}
