import uniq from 'lodash.uniq'
import { useEffect, useMemo } from 'react'
import {
  constSelector,
  useRecoilCallback,
  waitForAll,
  waitForAllSettled,
} from 'recoil'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import {
  PolytoneListenerSelectors,
  ibcAckReceivedSelector,
  ibcUnreceivedAcksSelector,
  ibcUnreceivedPacketsSelector,
  refreshIbcDataAtom,
  refreshPolytoneListenerResultsAtom,
  transactionPacketsSelector,
} from '@dao-dao/state/recoil'
import {
  useCachedLoading,
  useCachedLoadingWithError,
  useDao,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import {
  BaseProposalStatusAndInfoProps,
  CrossChainPacketInfoState,
  CrossChainPacketInfoStatus,
  LoadingData,
  ProposalRelayState,
  ProposalStatus,
  ProposalStatusEnum,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import { ExecutionResponse } from '@dao-dao/types/contracts/PolytoneListener'
import {
  decodeCrossChainMessages,
  makeWasmMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

export type UseProposalRelayStateOptions = {
  msgs: UnifiedCosmosMsg[]
  status: ProposalStatus
  executedAt: Date | undefined
  proposalModuleAddress: string
  proposalNumber: number
  openSelfRelayExecute: BaseProposalStatusAndInfoProps['openSelfRelayExecute']
  loadingTxHash: LoadingData<string | undefined>
}

export type UseProposalRelayStateReturn = LoadingData<ProposalRelayState>

/**
 * This hook uses information about a proposal and produces all the necessary
 * state for the status of polytone message relays. It is used in the
 * `useProposalActionState` hook.
 */
export const useProposalRelayState = ({
  msgs,
  status,
  executedAt,
  proposalModuleAddress,
  proposalNumber,
  openSelfRelayExecute,
  loadingTxHash,
}: UseProposalRelayStateOptions): UseProposalRelayStateReturn => {
  const { coreAddress } = useDao()
  const {
    chain: { chainId: srcChainId },
  } = useSupportedChainContext()

  const packetsLoadable = useCachedLoadingWithError(
    loadingTxHash.loading || !loadingTxHash.data
      ? constSelector(undefined)
      : transactionPacketsSelector({
          chainId: srcChainId,
          txHash: loadingTxHash.data,
        })
  )

  // Decoded cross-chain execute messages.
  const { crossChainPackets, dstChainIds } = useMemo(() => {
    const crossChainPackets = decodeCrossChainMessages(
      srcChainId,
      coreAddress,
      msgs
    )

    const dstChainIds = uniq(
      crossChainPackets.map(({ data: { chainId } }) => chainId)
    )

    return {
      crossChainPackets,
      dstChainIds,
    }
  }, [msgs, srcChainId, coreAddress])

  // Get unreceived packets and acks.
  const unreceivedPackets = useCachedLoading(
    packetsLoadable.loading || packetsLoadable.errored
      ? undefined
      : waitForAll(
          crossChainPackets.map(({ data: { chainId }, srcPort, dstPort }) => {
            const packetsToCommit = (packetsLoadable.data || []).filter(
              (packet) =>
                packet.sourcePort === srcPort &&
                packet.destinationPort === dstPort
            )

            return waitForAll(
              packetsToCommit.map((packet) =>
                ibcUnreceivedPacketsSelector({
                  chainId,
                  portId: dstPort,
                  channelId: packet.destinationChannel,
                  packetCommitmentSequences: [Number(packet.sequence)],
                })
              )
            )
          })
        ),
    []
  )
  const unreceivedAcks = useCachedLoading(
    packetsLoadable.loading || packetsLoadable.errored
      ? undefined
      : waitForAll(
          crossChainPackets.map(({ srcPort, dstPort }) => {
            const packetsToAck = (packetsLoadable.data || []).filter(
              (packet) =>
                packet.sourcePort === srcPort &&
                packet.destinationPort === dstPort
            )

            return waitForAll(
              packetsToAck.map((packet) =>
                ibcUnreceivedAcksSelector({
                  chainId: srcChainId,
                  portId: srcPort,
                  channelId: packet.sourceChannel,
                  packetAckSequences: [Number(packet.sequence)],
                })
              )
            )
          })
        ),
    []
  )
  const acksReceived = useCachedLoading(
    packetsLoadable.loading || packetsLoadable.errored
      ? undefined
      : waitForAll(
          crossChainPackets.map(({ data: { chainId }, srcPort, dstPort }) => {
            const packetsToAck = (packetsLoadable.data || []).filter(
              (packet) =>
                packet.sourcePort === srcPort &&
                packet.destinationPort === dstPort
            )

            return waitForAll(
              packetsToAck.map((packet) =>
                ibcAckReceivedSelector({
                  chainId,
                  portId: dstPort,
                  channelId: packet.destinationChannel,
                  sequence: Number(packet.sequence),
                })
              )
            )
          })
        ),
    []
  )

  // Polytone relay results.
  const polytoneRelayResults = useCachedLoading(
    waitForAllSettled(
      crossChainPackets.map((decoded) =>
        decoded.type === 'polytone'
          ? PolytoneListenerSelectors.resultSelector({
              chainId: srcChainId,
              contractAddress: decoded.data.polytoneConnection.listener,
              params: [
                {
                  initiator: decoded.sender,
                  initiatorMsg: decoded.data.initiatorMsg,
                },
              ],
            })
          : constSelector(undefined)
      )
    ),
    []
  )

  // Get packet states.
  const states = useMemo((): ProposalRelayState['states'] => {
    const packetStates =
      packetsLoadable.loading ||
      packetsLoadable.errored ||
      unreceivedPackets.loading ||
      unreceivedAcks.loading ||
      acksReceived.loading ||
      polytoneRelayResults.loading
        ? []
        : crossChainPackets.flatMap(
            (packet, index): CrossChainPacketInfoState | [] => {
              if (packet.type === 'polytone') {
                const result = polytoneRelayResults.data[index]

                return result.state === 'hasError' &&
                  result.contents instanceof Error &&
                  result.contents.message.includes(
                    'polytone::callbacks::CallbackMessage not found'
                  )
                  ? {
                      packet,
                      status: CrossChainPacketInfoStatus.Pending,
                    }
                  : result.state === 'hasValue'
                    ? objectMatchesStructure(result.contents, {
                        callback: {
                          result: {
                            execute: {
                              Ok: {},
                            },
                          },
                        },
                      })
                      ? {
                          packet,
                          status: CrossChainPacketInfoStatus.Relayed,
                          msgResponses: (
                            (result.contents as any)!.callback.result.execute
                              .Ok as ExecutionResponse
                          ).result.map(({ events }) => ({ events })),
                        }
                      : objectMatchesStructure(result.contents, {
                            callback: {
                              result: {
                                execute: {
                                  Err: {},
                                },
                              },
                            },
                          })
                        ? (result.contents?.callback.result as any).execute
                            .Err === 'timeout'
                          ? {
                              packet,
                              status: CrossChainPacketInfoStatus.TimedOut,
                            }
                          : {
                              packet,
                              status: CrossChainPacketInfoStatus.Errored,
                              error: (result.contents as any).callback.result
                                .execute.Err,
                            }
                        : objectMatchesStructure(result.contents, {
                              callback: {
                                result: {
                                  fatal_error: {},
                                },
                              },
                            })
                          ? {
                              packet,
                              status: CrossChainPacketInfoStatus.Errored,
                              error: (result.contents as any).callback.result
                                .fatal_error,
                            }
                          : []
                    : []
              }

              if (packet.type === 'ica') {
                // Get latest timeout of packets from this source.
                const latestPacketTimeout = Math.max(
                  0,
                  ...(packetsLoadable.data || [])
                    .filter((p) => p.sourcePort === packet.srcPort)
                    .map((p) => Number(p.timeoutTimestamp))
                )

                return acksReceived.data[index]?.length &&
                  acksReceived.data[index].every(Boolean)
                  ? {
                      packet,
                      status: CrossChainPacketInfoStatus.Relayed,
                      // Cannot reliably fetch message events from ICA yet.
                      msgResponses: [],
                    }
                  : unreceivedPackets.data[index]?.length &&
                      unreceivedPackets.data[index].some(Boolean)
                    ? Date.now() > Number(latestPacketTimeout) / 1e6
                      ? {
                          packet,
                          status: CrossChainPacketInfoStatus.TimedOut,
                        }
                      : {
                          packet,
                          status: CrossChainPacketInfoStatus.Pending,
                        }
                    : unreceivedAcks.data[index]?.length &&
                        unreceivedAcks.data[index].some(Boolean)
                      ? {
                          packet,
                          status: CrossChainPacketInfoStatus.Pending,
                        }
                      : // If could not find ack or packet, assume pending.
                        {
                          packet,
                          status: CrossChainPacketInfoStatus.Pending,
                        }
              }

              return []
            }
          )

    return {
      all: packetStates,
      pending: packetStates.flatMap((state, index) =>
        state.status === CrossChainPacketInfoStatus.Pending
          ? {
              ...state,
              index,
            }
          : []
      ),
      relayed: packetStates.flatMap((state, index) =>
        state.status === CrossChainPacketInfoStatus.Relayed
          ? {
              ...state,
              index,
            }
          : []
      ),
      errored: packetStates.flatMap((state, index) =>
        state.status === CrossChainPacketInfoStatus.Errored
          ? {
              ...state,
              index,
            }
          : []
      ),
      timedOut: packetStates.flatMap((state, index) =>
        state.status === CrossChainPacketInfoStatus.TimedOut
          ? {
              ...state,
              index,
            }
          : []
      ),
    }
  }, [
    unreceivedPackets,
    unreceivedAcks,
    acksReceived,
    polytoneRelayResults,
    crossChainPackets,
    packetsLoadable,
  ])

  // Refresh every 10 seconds while anything is unrelayed.
  const refreshIbcData = useRecoilCallback(
    ({ set }) =>
      () => {
        set(refreshIbcDataAtom(srcChainId), (id) => id + 1)
        dstChainIds.forEach((chainId) =>
          set(refreshIbcDataAtom(chainId), (id) => id + 1)
        )
        set(refreshPolytoneListenerResultsAtom, (id) => id + 1)
      },
    useDeepCompareMemoize([srcChainId, dstChainIds])
  )
  const anyPending = states.pending.length > 0
  useEffect(() => {
    if (!anyPending) {
      return
    }

    const interval = setInterval(refreshIbcData, 10 * 1000)
    return () => clearInterval(interval)
  }, [anyPending, refreshIbcData])

  const executedOverOneMinuteAgo =
    status === ProposalStatusEnum.Executed &&
    executedAt !== undefined &&
    // If executed over 1 minute ago...
    Date.now() - executedAt.getTime() > 1 * 60 * 1000
  const messagesNeedingSelfRelay =
    unreceivedPackets.loading ||
    unreceivedAcks.loading ||
    acksReceived.loading ||
    polytoneRelayResults.loading
      ? undefined
      : crossChainPackets.filter(
          (packet) =>
            // Not yet relayed.
            states.pending.some((p) => p.packet === packet) &&
            // Executed a few minutes ago and still has not been relayed, or the
            // Polytone connection needs self-relay.
            (executedOverOneMinuteAgo ||
              (packet.type === 'polytone' &&
                !!packet.data.polytoneConnection.needsSelfRelay))
        )
  const hasCrossChainMessagesNeedingSelfRelay =
    !!messagesNeedingSelfRelay?.length

  const openSelfRelay = (transactionHash?: string) =>
    hasCrossChainMessagesNeedingSelfRelay &&
    openSelfRelayExecute({
      uniqueId: `${srcChainId}:${proposalModuleAddress}:${proposalNumber}`,
      transaction: transactionHash
        ? {
            type: 'exists',
            hash: transactionHash,
          }
        : {
            type: 'execute',
            msgs: [
              makeWasmMessage({
                wasm: {
                  execute: {
                    contract_addr: proposalModuleAddress,
                    funds: [],
                    msg: {
                      execute: {
                        proposal_id: proposalNumber,
                      },
                    },
                  },
                },
              }),
            ],
          },
      crossChainPackets: messagesNeedingSelfRelay,
      chainIds: uniq(
        messagesNeedingSelfRelay.map(({ data: { chainId } }) => chainId)
      ),
    })

  return unreceivedPackets.loading ||
    unreceivedAcks.loading ||
    acksReceived.loading ||
    polytoneRelayResults.loading ||
    packetsLoadable.loading
    ? {
        loading: true,
      }
    : {
        loading: false,
        data: {
          hasCrossChainMessages: crossChainPackets.length > 0,
          states,
          needsSelfRelay: hasCrossChainMessagesNeedingSelfRelay,
          openSelfRelay: () =>
            status === ProposalStatusEnum.Executed && !loadingTxHash.loading
              ? openSelfRelay(loadingTxHash.data)
              : openSelfRelay(),
        },
      }
}
