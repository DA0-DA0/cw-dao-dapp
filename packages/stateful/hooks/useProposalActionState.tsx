import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { toUtf8 } from '@cosmjs/encoding'
import { OfflineSigner } from '@cosmjs/proto-signing'
import { CancelOutlined, Key, Send } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { usePlausible } from 'next-plausible'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilValue } from 'recoil'

import {
  DaoProposalSingleCommonSelectors,
  makeGetSignerOptions,
} from '@dao-dao/state'
import {
  ProposalCrossChainRelayStatus,
  ProposalStatusAndInfoProps,
  TextInput,
  useDao,
} from '@dao-dao/stateless'
import {
  ChainId,
  LoadingData,
  PlausibleEvents,
  PreProposeModuleType,
  ProposalStatusEnum,
  ProposalStatusKey,
} from '@dao-dao/types'
import { ExtensionData } from '@dao-dao/types/protobuf/codegen/gaia/metaprotocols/extensions'
import {
  DAO_CORE_ALLOW_MEMO_ON_EXECUTE_ITEM_KEY,
  NEUTRON_GOVERNANCE_DAO,
  extractProposalDescriptionAndMetadata,
  getRpcForChainId,
  processError,
} from '@dao-dao/utils'

import { ProfileProposalCard } from '../components'
import { useProposalModuleAdapterContext } from '../proposal-module-adapter'
import { useMembership } from './useMembership'
import { UseProposalRelayStateReturn } from './useProposalRelayState'
import { useWallet } from './useWallet'

export type UseProposalActionStateOptions = {
  /**
   * Proposal description, for decoding additional execution metadata.
   */
  description: string
  relayState: UseProposalRelayStateReturn
  statusKey: ProposalStatusKey
  loadingExecutionTxHash: LoadingData<string | undefined>
  onExecuteSuccess: () => void | Promise<void>
  onCloseSuccess: () => void | Promise<void>
}

export type UseProposalActionStateReturn = Pick<
  ProposalStatusAndInfoProps,
  'action' | 'footer'
>

/**
 * This hook determines the action and footer to show on a proposal based on its
 * status. It is used in the proposal module adapters' ProposalStatusAndInfo
 * components.
 */
export const useProposalActionState = ({
  description,
  relayState,
  statusKey,
  loadingExecutionTxHash,
  onExecuteSuccess,
  onCloseSuccess,
}: UseProposalActionStateOptions): UseProposalActionStateReturn => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const dao = useDao()
  const {
    options: { proposalNumber },
    proposalModule,
  } = useProposalModuleAdapterContext()
  const {
    isWalletConnected,
    address: walletAddress = '',
    getSigningClient,
    getOfflineSignerDirect,
    getOfflineSigner,
  } = useWallet()
  const { isMember = false } = useMembership()
  const plausible = usePlausible<PlausibleEvents>()

  const config = useRecoilValue(
    DaoProposalSingleCommonSelectors.configSelector({
      chainId: proposalModule.chainId,
      contractAddress: proposalModule.address,
    })
  )

  const [actionLoading, setActionLoading] = useState(false)
  // On proposal status update, stop loading. This ensures the action button
  // doesn't stop loading too early, before the status has refreshed.
  useEffect(() => {
    setActionLoading(false)
  }, [statusKey])

  const { metadata } = extractProposalDescriptionAndMetadata(description)

  // If enabled, the user will be shown an input field to enter a memo for the
  // execution transaction, unless a memo is already set in the metadata.
  const allowMemoOnExecute = metadata?.memo
    ? false
    : !!dao.info.items[DAO_CORE_ALLOW_MEMO_ON_EXECUTE_ITEM_KEY]
  const [memo, setMemo] = useState('')

  const onExecute = useCallback(async () => {
    if (!isWalletConnected) {
      return
    }

    setActionLoading(true)
    try {
      const { metadata } = extractProposalDescriptionAndMetadata(description)

      // if gaia metaprotocols extension data exists, must use direct signer.
      // amino signing does not support it i guess...
      let signingClientGetter = getSigningClient
      if (metadata?.gaiaMetaprotocolsExtensionData?.length) {
        try {
          let signer: OfflineSigner
          try {
            signer = getOfflineSignerDirect()
          } catch {
            // fallback to signer if direct signer function is unavailable. this
            // may or may not be a direct signer, so verify
            signer = getOfflineSigner()
            if (!('signDirect' in signer)) {
              throw new Error('Direct signer not available.')
            }
          }

          signingClientGetter = async () =>
            await SigningCosmWasmClient.connectWithSigner(
              getRpcForChainId(proposalModule.chainId),
              signer,
              makeGetSignerOptions(queryClient)(
                proposalModule.dao.chain.chainName
              )
            )
        } catch (err) {
          console.error(
            'Failed to retrieve direct signer for Gaia Metaprotocols Extension proposal execution.',
            err
          )

          throw new Error(
            t('error.browserExtensionWalletRequiredForProposalExecution')
          )
        }
      }

      await proposalModule.execute({
        proposalId: proposalNumber,
        getSigningClient: signingClientGetter,
        sender: walletAddress,
        memo: metadata?.memo || (allowMemoOnExecute && memo ? memo : undefined),
        nonCriticalExtensionOptions:
          metadata?.gaiaMetaprotocolsExtensionData?.map(
            ({ protocolId, protocolVersion, data }) => ({
              typeUrl: ExtensionData.typeUrl,
              value: ExtensionData.fromPartial({
                protocolId,
                protocolVersion,
                data: toUtf8(data),
              }),
            })
          ),
      })

      plausible('daoProposalExecute', {
        props: {
          chainId: dao.chainId,
          dao: dao.coreAddress,
          walletAddress,
          proposalModule: proposalModule.address,
          proposalModuleType: proposalModule.contractName,
          proposalNumber: proposalNumber,
        },
      })

      await onExecuteSuccess()
    } catch (err) {
      console.error(err)
      toast.error(processError(err))

      // Stop loading if errored.
      setActionLoading(false)
    }

    // Loading will stop on success when status refreshes.
  }, [
    isWalletConnected,
    description,
    getSigningClient,
    proposalModule,
    proposalNumber,
    walletAddress,
    allowMemoOnExecute,
    memo,
    onExecuteSuccess,
    getOfflineSignerDirect,
    getOfflineSigner,
    queryClient,
    t,
    plausible,
    dao,
  ])

  const onClose = useCallback(async () => {
    if (!isWalletConnected) {
      return
    }

    setActionLoading(true)

    try {
      await proposalModule.close({
        proposalId: proposalNumber,
        getSigningClient,
        sender: walletAddress,
      })

      plausible('daoProposalClose', {
        props: {
          chainId: dao.chainId,
          dao: dao.coreAddress,
          walletAddress,
          proposalModule: proposalModule.address,
          proposalModuleType: proposalModule.contractName,
          proposalNumber: proposalNumber,
        },
      })

      await onCloseSuccess()
    } catch (err) {
      console.error(err)
      toast.error(processError(err))

      // Stop loading if errored.
      setActionLoading(false)
    }

    // Loading will stop on success when status refreshes.
  }, [
    isWalletConnected,
    proposalModule,
    proposalNumber,
    getSigningClient,
    walletAddress,
    onCloseSuccess,
    plausible,
    dao,
  ])

  const showRelayStatus =
    !relayState.loading &&
    statusKey === ProposalStatusEnum.Executed &&
    relayState.data.hasCrossChainMessages

  return {
    action:
      statusKey === ProposalStatusEnum.Passed &&
      // Show if anyone can execute OR if the wallet is a member, once
      // polytone messages that need relaying are done loading.
      (!config.only_members_execute || isMember) &&
      !relayState.loading
        ? {
            label: t('button.execute'),
            Icon: Key,
            loading: actionLoading,
            doAction: relayState.data.needsSelfRelay
              ? relayState.data.openSelfRelay
              : onExecute,
            header: allowMemoOnExecute ? (
              <TextInput
                onChange={(e) => setMemo(e.target.value)}
                placeholder={t('info.memoPlaceholder')}
                value={memo}
              />
            ) : undefined,
          }
        : statusKey === ProposalStatusEnum.Rejected &&
            // Don't show for Neutron overrule proposals.
            !(
              dao.chainId === ChainId.NeutronMainnet &&
              dao.coreAddress === NEUTRON_GOVERNANCE_DAO &&
              proposalModule.prePropose?.type ===
                PreProposeModuleType.NeutronOverruleSingle
            )
          ? {
              label: t('button.close'),
              Icon: CancelOutlined,
              loading: actionLoading,
              doAction: onClose,
            }
          : // If executed and has polytone messages that need relaying...
            statusKey === ProposalStatusEnum.Executed &&
              !relayState.loading &&
              relayState.data.needsSelfRelay &&
              !loadingExecutionTxHash.loading &&
              loadingExecutionTxHash.data
            ? {
                label: t('button.relay'),
                Icon: Send,
                loading: actionLoading,
                doAction: relayState.data.openSelfRelay,
                description: t('error.polytoneExecutedNoRelay'),
              }
            : undefined,
    footer: (showRelayStatus || isWalletConnected) && (
      <div className="flex flex-col gap-6">
        {showRelayStatus && (
          <ProposalCrossChainRelayStatus state={relayState.data} />
        )}

        {isWalletConnected && <ProfileProposalCard />}
      </div>
    ),
  }
}
