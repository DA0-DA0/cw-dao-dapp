import { AckWithMetadata } from '@confio/relayer'
import { PacketWithMetadata } from '@confio/relayer/build/lib/endpoint'
import { IbcClient } from '@confio/relayer/build/lib/ibcclient'
import { Link } from '@confio/relayer/build/lib/link'
import {
  parseAcksFromTxEvents,
  parsePacketsFromTendermintEvents,
} from '@confio/relayer/build/lib/utils'
import { toHex } from '@cosmjs/encoding'
import { DirectSecp256k1HdWallet, EncodeObject } from '@cosmjs/proto-signing'
import {
  IndexedTx,
  SigningStargateClient,
  calculateFee,
  coins,
  fromTendermintEvent,
} from '@cosmjs/stargate'
import { ChainWalletBase } from '@cosmos-kit/core'
import { Check, Close, Send, Verified } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { MsgGrant as MsgGrantEncoder } from 'cosmjs-types/cosmos/authz/v1beta1/tx'
import uniq from 'lodash.uniq'
import { Fragment, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilCallback, waitForAll } from 'recoil'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import { HugeDecimal } from '@dao-dao/math'
import { tokenQueries } from '@dao-dao/state/query'
import {
  genericTokenBalanceSelector,
  nativeDenomBalanceSelector,
  refreshIbcDataAtom,
  refreshPolytoneListenerResultsAtom,
  refreshWalletBalancesIdAtom,
} from '@dao-dao/state/recoil'
import { DynamicGasPrice } from '@dao-dao/state/utils'
import {
  Button,
  FlyingAnimation,
  Loader,
  Modal,
  SteppedWalkthrough,
  TokenAmountDisplay,
  Tooltip,
  useCachedLoadingWithError,
  useSupportedChainContext,
  useUpdatingRef,
} from '@dao-dao/stateless'
import {
  AnyChain,
  ChainId,
  GenericToken,
  SelfRelayExecuteModalProps,
  TokenType,
  cwMsgToEncodeObject,
} from '@dao-dao/types'
import { MsgGrant } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/tx'
import { SendAuthorization } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/authz'
import { toTimestamp } from '@dao-dao/types/protobuf/codegen/helpers'
import {
  CHAIN_GAS_MULTIPLIER,
  getChainForChainId,
  getDisplayNameForChainId,
  getFallbackImage,
  getImageUrlForChainId,
  getRpcForChainId,
  makeBankMessage,
  processError,
  retry,
} from '@dao-dao/utils'

import { useWallet } from '../hooks'

enum RelayStatus {
  Uninitialized,
  Initializing,
  Funding,
  Executing,
  Relaying,
  Refunding,
  RefundingErrored,
  Success,
  RelayErrored,
  Canceled,
}

const RELAYER_FUNDS_NEEDED: Partial<Record<ChainId | string, number>> = {
  [ChainId.CosmosHubMainnet]: 0.06 * 10 ** 6,
  [ChainId.JunoMainnet]: 1 * 10 ** 6,
  [ChainId.OsmosisMainnet]: 0.1 * 10 ** 6,
  [ChainId.StargazeMainnet]: 2 * 10 ** 6,
  [ChainId.NeutronMainnet]: 0.5 * 10 ** 6,
  [ChainId.TerraMainnet]: 0.1 * 10 ** 6,
  [ChainId.MigalooMainnet]: 40 * 10 ** 6,
  [ChainId.KujiraMainnet]: 0.1 * 10 ** 6,
  [ChainId.OraichainMainnet]: 0.1 * 10 ** 6,
  [ChainId.ChihuahuaMainnet]: 1000 * 10 ** 6,
  [ChainId.ArchwayMainnet]: 1 * 10 ** 18,
  [ChainId.InjectiveMainnet]: 0.03 * 10 ** 18,
  [ChainId.TerraClassicMainnet]: 1000 * 10 ** 6,
  [ChainId.OmniflixHubMainnet]: 1 * 10 ** 6,
  [ChainId.BitsongMainnet]: 10 * 10 ** 6,
  [ChainId.NobleMainnet]: 0.1 * 10 ** 6,
}

type Relayer = {
  chain: AnyChain
  chainImageUrl: string
  feeToken: GenericToken
  wallet: {
    address: string
    signingStargateClient: SigningStargateClient
  }
  relayerAddress: string
  client: IbcClient
}

export const SelfRelayExecuteModal = ({
  uniqueId,
  chainIds: _chainIds,
  crossChainPackets,
  transaction,
  onSuccess,
  onClose,
  visible,
}: SelfRelayExecuteModalProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const mnemonicKey = `relayer_mnemonic_${uniqueId}`

  // Current chain.
  const {
    chain: { chainId: currentChainId },
  } = useSupportedChainContext()

  // All chains, including current.
  const chainIds = [currentChainId, ..._chainIds]
  const chains = uniq(chainIds).map(getChainForChainId)

  const { isWalletConnected, chainWallet, connect } = useWallet()
  const chainWalletList = chainWallet?.mainWallet?.getChainWalletList(false)
  const chainWallets = chainIds.map((chainId) =>
    chainWalletList?.find((cw) => cw.chainId === chainId)
  )

  const [status, setStatus] = useState<RelayStatus>(RelayStatus.Uninitialized)
  const [relayError, setRelayError] = useState<string>()
  const [relayers, setRelayers] = useState<Relayer[]>()

  // Relayer chain IDs currently being funded.
  const [fundingRelayer, setFundingRelayer] = useState<Record<string, boolean>>(
    {}
  )
  // Amount funded once funding is complete.
  const [fundedAmount, setFundedAmount] = useState<
    Record<string, HugeDecimal | undefined>
  >({})
  const [executeTx, setExecuteTx] =
    useState<Pick<IndexedTx, 'events' | 'height'>>()
  const [relaying, setRelaying] = useState<{
    type: 'packet' | 'ack'
    relayer: Relayer
  }>()
  // Amount refunded once refunding is complete.
  const [refundedAmount, setRefundedAmount] = useState<
    Record<string, HugeDecimal | undefined>
  >({})

  // If relay fails and user decides to refund and cancel, this will be set to
  // true.
  const [canceling, setCanceling] = useState(false)

  // If relay fails due to insufficient funds, this multiplier is applied to the
  // funds needed that is defined at the top.
  const [fundsNeededRetryMultiplier, setFundsNeededRetryMultiplier] =
    useState(1)

  // When the modal is closed, reset state.
  useEffect(() => {
    if (visible) {
      return
    }

    // Reset state after a short delay to allow the modal to close.
    setTimeout(() => {
      setStatus(RelayStatus.Uninitialized)
      setRelayers(undefined)
      setFundingRelayer({})
      setFundedAmount({})
      setExecuteTx(undefined)
      setRefundedAmount({})
      setRelaying(undefined)
      setCanceling(false)
    }, 500)
  }, [visible])

  // Prevent accidentally closing the tab/window in the middle of the process.
  useEffect(() => {
    if (
      !visible ||
      status === RelayStatus.Uninitialized ||
      status === RelayStatus.Success
    ) {
      return
    }

    const listener = (event: BeforeUnloadEvent) => {
      event.returnValue = t('info.completeRelayOrLoseFunds')
    }

    window.addEventListener('beforeunload', listener)
    return () => window.removeEventListener('beforeunload', listener)
  }, [visible, status, t])

  // Refresh balances for the wallet and relayer wallet.
  const refreshBalances = useRecoilCallback(
    ({ set }) =>
      ({ wallet, relayerAddress }: Relayer) => {
        set(refreshWalletBalancesIdAtom(wallet.address), (id) => id + 1)
        set(refreshWalletBalancesIdAtom(relayerAddress), (id) => id + 1)
      },
    []
  )
  // Refresh balances every 10 seconds.
  useEffect(() => {
    if (!relayers) {
      return
    }
    const interval = setInterval(() => {
      relayers?.forEach(refreshBalances)
    }, 10000)
    return () => clearInterval(interval)
  }, [relayers, refreshBalances])

  // Create memoized function that returns the relayer funds for a chain,
  // adjusting for number of packets.
  const getRelayerFundsRef = useUpdatingRef(
    (chainId: string): number =>
      // Use relayer funds as base, increase by 5% per packet, and apply retry
      // multiplier.
      (RELAYER_FUNDS_NEEDED[chainId] ?? 0) *
      (1 + crossChainPackets.length * 0.05) *
      fundsNeededRetryMultiplier
  )

  const walletFunds = useCachedLoadingWithError(
    relayers
      ? waitForAll(
          relayers.map(({ chain: { chainId }, feeToken, wallet }) =>
            genericTokenBalanceSelector({
              chainId,
              type: feeToken.type,
              denomOrAddress: feeToken.denomOrAddress,
              address: wallet.address,
            })
          )
        )
      : undefined
  )
  const walletFundsSufficient =
    !walletFunds.loading && !walletFunds.errored && relayers
      ? walletFunds.data.map(
          ({ balance }, index) =>
            Number(balance) >=
            getRelayerFundsRef.current(relayers[index].chain.chainId)
        )
      : undefined

  const relayerFunds = useCachedLoadingWithError(
    relayers
      ? waitForAll(
          relayers.map(({ chain: { chainId }, feeToken, relayerAddress }) =>
            nativeDenomBalanceSelector({
              chainId,
              walletAddress: relayerAddress,
              denom: feeToken.denomOrAddress,
            })
          )
        )
      : undefined
  )
  // Whether or not all relayers have enough funds to pay fees, except current.
  const allReceivingRelayersFunded =
    !relayerFunds.loading &&
    !relayerFunds.errored &&
    relayers &&
    relayerFunds.data
      .slice(1)
      .every(
        ({ amount }, index) =>
          Number(amount) >=
          getRelayerFundsRef.current(relayers[index + 1].chain.chainId)
      )

  const setupRelayer = async () => {
    if (status !== RelayStatus.Uninitialized) {
      toast.error(t('error.relayerAlreadySetUp'))
      return
    }

    // Should never happen...
    const unsupportedChains = chains.filter((_, index) => !chainWallets[index])
    if (unsupportedChains.length > 0) {
      toast.error(
        t('error.unsupportedChains', {
          count: unsupportedChains.length,
          chains: unsupportedChains
            .map(({ chainId }) => getDisplayNameForChainId(chainId))
            .join(', '),
        })
      )
      return
    }

    // Connect to all disconnected chain wallets.
    const relayerChainWallets = chainWallets as ChainWalletBase[]
    try {
      await Promise.all(
        relayerChainWallets.map(
          async (wallet) =>
            wallet.isWalletConnected || (await wallet.connect(false))
        )
      )

      // Make sure all wallets are connected. Should never happen...
      if (relayerChainWallets.some((wallet) => !wallet.isWalletConnected)) {
        throw new Error('unexpected wallet not connected')
      }
    } catch (err) {
      console.error(err)
      toast.error(t('error.failedToConnect'))
      return
    }

    setStatus(RelayStatus.Initializing)
    try {
      // Find the mnemonic if it exists, or generate a new one.
      const mnemonic =
        localStorage.getItem(mnemonicKey) ||
        (await DirectSecp256k1HdWallet.generate(24)).mnemonic

      const relayers = await Promise.all(
        chains.map(async (chain, index): Promise<Relayer> => {
          const chainImageUrl =
            getImageUrlForChainId(chain.chainId) ||
            getFallbackImage(chain.chainId)

          const feeDenom = chain.chainRegistry?.fees?.fee_tokens[0]?.denom
          if (!feeDenom) {
            throw new Error(t('error.feeTokenNotFound'))
          }

          const feeToken = await queryClient.fetchQuery(
            tokenQueries.info(queryClient, {
              chainId: chain.chainId,
              type: TokenType.Native,
              denomOrAddress: feeDenom,
            })
          )

          // Connect wallet to chain so we can send tokens.
          const { address, getSigningStargateClient } =
            relayerChainWallets[index]
          if (!address) {
            throw new Error(t('error.chainNotConnected'))
          }

          const signingStargateClient = await getSigningStargateClient()

          // Create relayer signer.
          const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: chain.bech32Prefix,
          })
          const relayerAddress = (await signer.getAccounts())[0].address

          // Create IBC client with newly created signer.
          const client = await retry(10, (attempt) =>
            IbcClient.connectWithSigner(
              getRpcForChainId(chain.chainId, attempt - 1),
              signer,
              relayerAddress,
              {
                // How long it waits in between checking for a new block.
                estimatedBlockTime: 3000,
                // How long it waits until looking for acks.
                estimatedIndexerTime: 3000,
                gasPrice: new DynamicGasPrice(queryClient, chain),
              }
            )
          )

          return {
            chain,
            chainImageUrl,
            feeToken,
            wallet: {
              address,
              // cosmos-kit has an older version of the package. This is a
              // workaround.
              signingStargateClient:
                signingStargateClient as unknown as SigningStargateClient,
            },
            relayerAddress,
            client,
          }
        })
      )

      // Save mnemonic in case of an error. This gets cleared when the relayer
      // succeeds and all wallets are refunded successfully.
      localStorage.setItem(mnemonicKey, mnemonic)

      setRelayers(relayers)
      setStatus(RelayStatus.Funding)
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
      setStatus(RelayStatus.Uninitialized)
    }
  }

  // Send fee tokens to relayer wallet.
  const fundRelayer = async (chainId: string, withExecuteRelay = false) => {
    const relayer = relayers?.find(({ chain }) => chainId === chain.chainId)
    if (!relayers || !relayer) {
      toast.error(t('error.relayerNotSetUp'))
      return
    }

    // Should never happen, but just to be safe.
    if (withExecuteRelay && relayer.chain.chainId !== currentChainId) {
      toast.error(
        t('error.unexpectedError') +
          ' Relay can only happen when funding the current chain.'
      )
      return
    }

    setFundingRelayer((prev) => ({
      ...prev,
      [chainId]: true,
    }))
    try {
      if (withExecuteRelay) {
        setStatus(RelayStatus.Executing)
      }

      // Get current balance of relayer wallet.
      const currentBalance = await relayer.client.query.bank.balance(
        relayer.relayerAddress,
        relayer.feeToken.denomOrAddress
      )

      const fundsNeeded =
        // Give a little extra to cover the authz tx fee.
        HugeDecimal.from(getRelayerFundsRef.current(chainId) * 1.2).minus(
          currentBalance
        )

      let msgs: EncodeObject[] = fundsNeeded.isPositive()
        ? // Send tokens to relayer wallet if needed.
          [
            cwMsgToEncodeObject(
              chainId,
              {
                bank: {
                  send: {
                    amount: fundsNeeded.toCoins(
                      relayer.feeToken.denomOrAddress
                    ),
                    to_address: relayer.relayerAddress,
                  },
                },
              },
              relayer.wallet.address
            ),
          ]
        : []

      // Add execute message if executing and has not already executed.
      if (withExecuteRelay && !executeTx && transaction.type === 'execute') {
        msgs.push(
          ...transaction.msgs.map((msg) =>
            cwMsgToEncodeObject(chainId, msg, relayer.wallet.address)
          )
        )
      }

      // Execute fund and execute messages. Fund should only happen if the
      // relayer wallet needs funding, and execute should only happen if this is
      // the current chain. There will be none if this is not the current chain
      // and the relayer wallet is already funded.
      let newExecuteTxResult
      if (msgs.length > 0) {
        newExecuteTxResult =
          await relayer.wallet.signingStargateClient.signAndBroadcast(
            relayer.wallet.address,
            msgs,
            CHAIN_GAS_MULTIPLIER
          )
      }

      // Get new balance of relayer wallet.
      const newBalance = HugeDecimal.from(
        await relayer.client.query.bank.balance(
          relayer.relayerAddress,
          relayer.feeToken.denomOrAddress
        )
      )
      setFundedAmount((prev) => ({
        ...prev,
        [chainId]: newBalance,
      }))

      // Authorize the user's wallet to be able to send funds on behalf of the
      // relayer wallet, in case anything goes wrong, so they can recover the
      // funds.

      // Set expiration to 10 years.
      const expiration = new Date()
      expiration.setFullYear(expiration.getFullYear() + 10)
      // Encoder needs a whole number of seconds.
      expiration.setMilliseconds(0)

      await relayer.client.sign.signAndBroadcast(
        relayer.relayerAddress,
        [
          {
            typeUrl: MsgGrant.typeUrl,
            value: {
              granter: relayer.relayerAddress,
              grantee: relayer.wallet.address,
              grant: {
                authorization: SendAuthorization.toProtoMsg(
                  SendAuthorization.fromPartial({
                    spendLimit: coins(
                      newBalance.toString(),
                      relayer.feeToken.denomOrAddress
                    ),
                  })
                ),
                expiration: toTimestamp(expiration),
              },
            } as MsgGrantEncoder,
          },
        ],
        CHAIN_GAS_MULTIPLIER
      )

      // Begin relay.
      if (withExecuteRelay) {
        if (transaction.type === 'execute') {
          setExecuteTx(newExecuteTxResult)
          relay(newExecuteTxResult)
        } else {
          const tx = await relayer.client.sign.getTx(transaction.hash)
          if (!tx) {
            throw new Error(t('error.txNotFound'))
          }

          setExecuteTx(tx)
          relay(tx)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setFundingRelayer((prev) => ({
        ...prev,
        [chainId]: false,
      }))
      refreshBalances(relayer)
    }
  }

  const refreshPolytoneResults = useRecoilCallback(
    ({ set }) =>
      () => {
        chainIds.forEach((chainId) =>
          set(refreshIbcDataAtom(chainId), (id) => id + 1)
        )
        set(refreshPolytoneListenerResultsAtom, (id) => id + 1)
      },
    useDeepCompareMemoize([chainIds])
  )

  const relay = async (_executeTx?: typeof executeTx) => {
    const currentExecuteTx = _executeTx || executeTx

    if (!relayers || !mnemonicKey) {
      toast.error(t('error.relayerNotSetUp'))
      return
    }

    if (!currentExecuteTx) {
      toast.error(t('error.txNotFound'))
      return
    }

    setStatus(RelayStatus.Relaying)
    setRelayError(undefined)
    setRelaying({
      type: 'packet',
      relayer: relayers[1],
    })

    try {
      // Parse the packets from the execution TX events.
      const txPackets = parsePacketsFromTendermintEvents(
        currentExecuteTx.events
      ).map((packet) => ({
        packet,
        height: currentExecuteTx.height,
      }))

      // Wait a few seconds for the TX to be indexed.
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // First relayer is current chain that is sending packets. The rest of the
      // relayers are the chains that are receiving packets. Relay and ack
      // packets sequentially, one chain at a time, since a wallet can only
      // submit one TX at a time.
      await relayers.slice(1).reduce(async (prev, relayer) => {
        // Wait for previous chain to finish relaying packets.
        await prev

        const { chain, client } = relayer

        // Get packets for this chain that need relaying.
        const packets = crossChainPackets.filter(
          ({ data: { chainId } }) => chainId === chain.chainId
        )

        // Choose TX packets that match packets we want to relay.
        const chainPackets = txPackets.filter(({ packet }) =>
          packets.some(
            ({ srcPort, dstPort }) =>
              packet.sourcePort === srcPort &&
              packet.destinationPort === dstPort
          )
        )
        if (!chainPackets.length) {
          return
        }

        setRelaying({
          type: 'packet',
          relayer,
        })

        // Get unique source channels and connections.
        const srcConnections = (
          await Promise.all(
            uniq(chainPackets.map(({ packet }) => packet.sourceChannel)).map(
              async (channel) => ({
                channel,
                connection: (
                  await relayers[0].client.query.ibc.channel.channel(
                    chainPackets.find(
                      ({ packet }) => packet.sourceChannel === channel
                    )!.packet.sourcePort,
                    channel
                  )
                ).channel?.connectionHops[0],
              })
            )
          )
        ).flatMap(({ channel, connection }) =>
          connection ? { channel, connection } : []
        )

        // Get connections for channels.
        const connections = (
          await Promise.all(
            srcConnections
              .reduce(
                (acc, { channel, connection }) => {
                  let existing = acc.find((a) => a.src === connection)
                  if (!existing) {
                    existing = {
                      src: connection,
                      packets: [],
                    }
                    acc.push(existing)
                  }

                  // Find packets coming from the same channel.
                  existing.packets.push(
                    ...chainPackets.filter(
                      ({ packet }) => packet.sourceChannel === channel
                    )
                  )

                  return acc
                },
                [] as { src: string; packets: PacketWithMetadata[] }[]
              )
              .map(async (data) => ({
                ...data,
                dst: (
                  await relayers[0].client.query.ibc.connection.connection(
                    data.src
                  )
                ).connection?.counterparty.connectionId,
              }))
          )
        ).flatMap(({ src, dst, packets }) => (dst ? { src, dst, packets } : []))

        if (!connections.length) {
          throw new Error(t('error.failedToLoadIbcConnection'))
        }

        // Run relay process for each connection pair on this chain.
        for (const {
          src: srcConnection,
          dst: dstConnection,
          packets,
        } of connections) {
          const link = await Link.createWithExistingConnections(
            // First relayer is current chain sending packets.
            relayers[0].client,
            client,
            srcConnection,
            dstConnection
          )

          // Get packets with unique source channel/port and destination
          // channel/port combinations.
          const uniquePackets = uniq(
            packets.map((p) =>
              [
                p.packet.sourceChannel,
                p.packet.sourcePort,
                p.packet.destinationChannel,
                p.packet.destinationPort,
              ].join('/')
            )
          ).map((key) => {
            const [srcChannel, srcPort, dstChannel, dstPort] = key.split('/')
            return {
              srcChannel,
              srcPort,
              dstChannel,
              dstPort,
            }
          })

          setRelaying({
            type: 'packet',
            relayer,
          })

          const packetSequences = packets.map(({ packet }) =>
            Number(packet.sequence)
          )

          // Relay packets. Try 5 times.
          let tries = 5
          while (tries) {
            try {
              const unrelayedPackets = (
                await Promise.all(
                  uniquePackets.map(
                    async ({ dstChannel, dstPort }) =>
                      (
                        await client.query.ibc.channel.unreceivedPackets(
                          dstPort,
                          dstChannel,
                          packetSequences
                        )
                      ).sequences
                  )
                )
              ).flat()

              const packetsNeedingRelay = packets.filter(({ packet }) =>
                unrelayedPackets.includes(packet.sequence)
              )

              // Relay only the packets that need relaying.
              if (packetsNeedingRelay.length) {
                await link.relayPackets('A', packetsNeedingRelay)
              }

              break
            } catch (err) {
              // If relayer wallet out of funds, throw immediately since they
              // need to top up.
              if (
                err instanceof Error &&
                err.message.includes('insufficient funds')
              ) {
                // Refresh all balances.
                relayers.map(refreshBalances)
                console.error(err)
                // Increase multipler by 25% so we retry with more funds than
                // before.
                setFundsNeededRetryMultiplier((m) => m + 0.25)
                throw new Error(t('error.relayerWalletNeedsFunds'))
              }

              tries -= 1

              console.error(
                t('error.failedToRelayPackets', {
                  chain: getDisplayNameForChainId(chain.chainId),
                }) + (tries > 0 ? ' ' + t('info.tryingAgain') : ''),
                err
              )

              // If no more tries, rethrow error.
              if (tries === 0) {
                throw err
              }

              // Wait a few seconds before trying again.
              await new Promise((resolve) => setTimeout(resolve, 5000))
            }
          }

          // Wait a few seconds for the packets to be indexed.
          await new Promise((resolve) => setTimeout(resolve, 5000))

          setRelaying({
            type: 'ack',
            relayer,
          })

          // Relay acks. Try 5 times.
          tries = 5
          while (tries) {
            try {
              // Find acks that need relaying.
              const smallestSequenceNumber = Math.min(...packetSequences)
              const largestSequenceNumber = Math.max(...packetSequences)
              const txSearch = (
                await Promise.all(
                  uniquePackets.map(
                    async ({ srcChannel, srcPort }) =>
                      // Just search one page (instead of all pages via
                      // txSearchAll) because it incorrectly paginates sometimes
                      // and throws an error.
                      (
                        await link.endB.client.tm.txSearch({
                          query: `write_acknowledgement.packet_connection='${dstConnection}' AND write_acknowledgement.packet_src_port='${srcPort}' AND write_acknowledgement.packet_src_channel='${srcChannel}' AND write_acknowledgement.packet_sequence>=${smallestSequenceNumber} AND write_acknowledgement.packet_sequence<=${largestSequenceNumber}`,
                        })
                      ).txs
                  )
                )
              ).flat()

              const allAcks = txSearch.flatMap(({ height, result, hash }) => {
                const events = result.events.map(fromTendermintEvent)
                return parseAcksFromTxEvents(events).map(
                  (ack): AckWithMetadata => ({
                    height,
                    txHash: toHex(hash).toUpperCase(),
                    txEvents: events,
                    ...ack,
                  })
                )
              })

              const unrelayedAcks = (
                await Promise.all(
                  uniquePackets.map(
                    async ({ srcChannel, srcPort }) =>
                      // First relayer is current chain sending packets/getting
                      // acks.
                      (
                        await relayers[0].client.query.ibc.channel.unreceivedAcks(
                          srcPort,
                          srcChannel,
                          allAcks.map(({ originalPacket }) =>
                            Number(originalPacket.sequence)
                          )
                        )
                      ).sequences
                  )
                )
              ).flat()

              const acksNeedingRelay = allAcks.filter(({ originalPacket }) =>
                unrelayedAcks.includes(originalPacket.sequence)
              )

              // Acknowledge only the packets that need relaying.
              if (acksNeedingRelay.length) {
                await link.relayAcks('B', acksNeedingRelay)
              }

              break
            } catch (err) {
              // If relayer wallet out of funds, throw immediately since they
              // need to top up.
              if (
                err instanceof Error &&
                err.message.includes('insufficient funds')
              ) {
                // Refresh all balances.
                relayers.map(refreshBalances)
                console.error(err)
                // Increase multipler by 25% so we retry with more funds than
                // before.
                setFundsNeededRetryMultiplier((m) => m + 0.25)
                throw new Error(t('error.relayerWalletNeedsFunds'))
              }

              tries -= 1

              console.error(
                t('error.failedToRelayAcks', {
                  chain: getDisplayNameForChainId(chain.chainId),
                }) + (tries > 0 ? ' ' + t('info.tryingAgain') : ''),
                err
              )

              // If no more tries, rethrow error.
              if (tries === 0) {
                throw err
              }

              // Wait a few seconds before trying again.
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  // If redundant packets detected, a relayer already relayed
                  // these acks. In that case, wait a bit longer to let it
                  // finish. The ack relayer above tries to check which acks
                  // have not yet been received, so if a relayer takes care of
                  // the acks, we will safely continue.
                  err instanceof Error && err.message.includes('redundant')
                    ? 10 * 1000
                    : 5 * 1000
                )
              )
            }
          }
        }
      }, Promise.resolve())

      // If packets and acks were relayed successfully, execute was successful.
      setExecuteTx(undefined)
      setRelaying(undefined)
    } catch (err) {
      console.error(err)
      setRelayError(processError(err))
      setStatus(RelayStatus.RelayErrored)
      return
    } finally {
      // Refresh all balances.
      relayers.map(refreshBalances)

      // Refresh all polytone results.
      refreshPolytoneResults()
    }

    await refundAllRelayers()
  }

  // Refund all relayers that have remaining tokens.
  const refundAllRelayers = async (cancel = false) => {
    if (!relayers || !mnemonicKey) {
      toast.error(t('error.relayerNotSetUp'))
      return
    }

    if (cancel) {
      setCanceling(true)
    }

    // If relay was successful, refund remaining tokens from relayer wallet back
    // to user on all chains.
    setStatus(RelayStatus.Refunding)
    try {
      await Promise.all(
        relayers.map(({ chain }) => refundRelayer(chain.chainId))
      )

      // Clear mnemonic from local storage since all wallets should be empty now
      // (if all refunds completed successfully).
      localStorage.removeItem(mnemonicKey)

      setStatus(
        cancel || canceling ? RelayStatus.Canceled : RelayStatus.Success
      )
    } catch (err) {
      setStatus(RelayStatus.RefundingErrored)

      console.error(err)
      toast.error(processError(err))
    }
  }

  // Return remaining tokens from IBC client relayer wallet back to user.
  const refundRelayer = async (chainId: string) => {
    const relayer = relayers?.find(({ chain }) => chain.chainId === chainId)
    if (!relayer) {
      throw new Error(t('error.relayerNotSetUp'))
    }

    const { chain, client, relayerAddress, wallet } = relayer

    const feeDenom = chain.chainRegistry?.fees?.fee_tokens[0]?.denom
    if (!feeDenom) {
      throw new Error(t('error.feeTokenNotFound'))
    }

    try {
      const remainingTokens = await client.query.bank.balance(
        relayerAddress,
        feeDenom
      )
      if (remainingTokens.amount === '0') {
        return
      }

      // Compute fees needed to send and subtract from remaining tokens.
      const gasUsed = await client.sign.simulate(
        relayerAddress,
        [
          cwMsgToEncodeObject(
            chain.chainId,
            {
              bank: makeBankMessage(
                remainingTokens.amount,
                wallet.address,
                feeDenom
              ),
            },
            relayerAddress
          ),
        ],
        undefined
      )
      const fee = calculateFee(
        Math.round(gasUsed * CHAIN_GAS_MULTIPLIER),
        // @ts-ignore
        client.gasPrice
      )
      const remainingTokensAfterFee = HugeDecimal.from(remainingTokens).minus(
        fee.amount[0]
      )

      // Send remaining tokens if there are more than enough to pay the fee.
      if (remainingTokensAfterFee.isPositive()) {
        await client.sign.sendTokens(
          relayerAddress,
          wallet.address,
          remainingTokensAfterFee.toCoins(feeDenom),
          fee
        )

        setRefundedAmount((prev) => ({
          ...prev,
          [chainId]: remainingTokensAfterFee,
        }))
      }
      // Don't catch error. Throw to caller.
    } finally {
      refreshBalances(relayer)
    }
  }

  const RelayIcon = !relaying || relaying.type === 'packet' ? Send : Verified

  return (
    <Modal
      containerClassName="w-full !max-w-lg"
      header={{
        title: t('title.relay'),
        subtitle: t('info.selfRelayDescription'),
      }}
      onClose={
        // Only allow closing if execution and relaying has not begun. This
        // prevents accidentally closing the modal in the middle of the process.
        status === RelayStatus.Uninitialized ||
        status === RelayStatus.Initializing ||
        status === RelayStatus.Funding
          ? onClose
          : undefined
      }
      visible={visible}
    >
      <SteppedWalkthrough
        className="w-full"
        stepIndex={
          status === RelayStatus.Uninitialized ||
          status === RelayStatus.Initializing
            ? 0
            : status === RelayStatus.Funding || status === RelayStatus.Executing
              ? 1
              : status === RelayStatus.Relaying ||
                  status === RelayStatus.RelayErrored
                ? 2
                : status === RelayStatus.Refunding ||
                    status === RelayStatus.RefundingErrored
                  ? 3
                  : 4
        }
        steps={[
          {
            label: t('title.start'),
            content: () => (
              <div className="flex flex-col gap-4">
                <p>
                  To execute this proposal, you must relay a message from the
                  source chain to the destination chain
                  {chains.length > 2 ? 's' : ''}.
                </p>

                <p>
                  A new relayer wallet will be created, which you will have to
                  fund with tokens to pay transaction fees on{' '}
                  {chains.length > 2 ? 'all' : 'both'} chains.
                </p>

                <p>
                  Once the relaying process is complete, the remaining tokens
                  will be sent back to your wallet.
                </p>

                <Button
                  className="self-end"
                  loading={status === RelayStatus.Initializing}
                  onClick={isWalletConnected ? setupRelayer : connect}
                >
                  {isWalletConnected ? t('button.begin') : t('button.connect')}
                </Button>
              </div>
            ),
          },
          {
            label: t('title.fundAndExecute'),
            // Show when this step is current or past. This makes sure the
            // funded balances are visible once the relayer is funded.
            overrideShowStepContentStatuses: ['current', 'past'],
            content: (stepStatus) => (
              <div className="flex flex-col gap-4">
                <p>
                  Fund the relayer wallet with tokens to pay transaction fees on
                  {' ' + (chains.length > 2 ? 'all' : 'both')} chains. The last
                  one will{' '}
                  {transaction.type === 'execute' ? 'execute and ' : ''}start
                  the relayer. Remaining fees will be refunded to your wallet
                  once relaying is complete.
                </p>

                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                  {[
                    // Receiving chains first.
                    ...(relayers?.slice(1) ?? []),
                    // Current chain last. This includes the execute.
                    ...(relayers ? [relayers[0]] : []),
                  ].map(({ chain: { chainId }, chainImageUrl }, index) => {
                    // Adjust the index to reflect the reordering above.
                    index = (index + 1) % relayers!.length

                    const fundTokenWithBalance =
                      walletFunds.loading || walletFunds.errored
                        ? undefined
                        : walletFunds.data[index]

                    const walletCannotAfford =
                      !walletFunds.loading &&
                      !(walletFundsSufficient?.[index] ?? false)

                    const funds =
                      !relayerFunds.loading && !relayerFunds.errored
                        ? HugeDecimal.from(relayerFunds.data[index])
                        : // Use the previously funded amount if the step is past.
                          (fundedAmount[chainId] ?? HugeDecimal.zero)
                    const empty = funds.isZero()

                    const funded = funds.gte(
                      getRelayerFundsRef.current(chainId)
                    )

                    const isExecute = index === 0
                    // If this is the execute, we need to make sure all
                    // receiving relayers are funded first.
                    const cannotExecuteUntilFunded =
                      isExecute && !allReceivingRelayersFunded

                    const showFundOrExecuteButton =
                      stepStatus === 'current' && (!funded || isExecute)

                    return (
                      <Fragment key={chainId}>
                        <div className="flex flex-row items-center gap-2">
                          <div
                            className="h-6 w-6 bg-contain bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url(${chainImageUrl})`,
                            }}
                          ></div>

                          <p className="primary-text shrink-0">
                            {getDisplayNameForChainId(chainId)}
                          </p>
                        </div>

                        {showFundOrExecuteButton ? (
                          <Tooltip
                            title={
                              walletCannotAfford && fundTokenWithBalance
                                ? t('error.insufficientWalletBalance', {
                                    amount: HugeDecimal.from(
                                      fundTokenWithBalance.balance
                                    ).toInternationalizedHumanReadableString({
                                      decimals:
                                        fundTokenWithBalance.token.decimals,
                                    }),
                                    tokenSymbol:
                                      fundTokenWithBalance.token.symbol,
                                  })
                                : cannotExecuteUntilFunded
                                  ? `Fund the other relayer${
                                      chains.length > 2 ? 's' : ''
                                    } before executing.`
                                  : undefined
                            }
                          >
                            <Button
                              center
                              className="w-36 justify-self-end"
                              disabled={
                                walletCannotAfford || cannotExecuteUntilFunded
                              }
                              loading={
                                !!fundingRelayer[chainId] ||
                                walletFunds.loading ||
                                walletFunds.errored
                              }
                              onClick={() => fundRelayer(chainId, isExecute)}
                            >
                              {isExecute
                                ? funded
                                  ? transaction.type === 'execute'
                                    ? t('button.execute')
                                    : t('button.relay')
                                  : transaction.type === 'execute'
                                    ? t('button.fundAndExecute')
                                    : t('button.fundAndRelay')
                                : empty
                                  ? t('button.fund')
                                  : t('button.topUp')}
                            </Button>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <TokenAmountDisplay
                              amount={funds}
                              decimals={
                                fundTokenWithBalance?.token.decimals ?? 0
                              }
                              symbol={
                                fundTokenWithBalance?.token.symbol ?? '...'
                              }
                            />

                            <Tooltip title={t('info.funded')}>
                              <Check className="text-icon-interactive-valid !h-4 !w-4" />
                            </Tooltip>
                          </div>
                        )}
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            ),
          },
          {
            OverrideIcon:
              status === RelayStatus.RelayErrored ? Close : undefined,
            iconContainerClassName:
              status === RelayStatus.RelayErrored
                ? '!bg-icon-interactive-error'
                : undefined,
            label: t('title.relay'),
            content: () =>
              status === RelayStatus.RelayErrored ? (
                <div className="flex flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4">
                  <p className="text-text-interactive-error break-all">
                    {relayError}
                  </p>

                  <div className="flex grow flex-row items-stretch justify-end gap-2">
                    <Button
                      onClick={() => refundAllRelayers(true)}
                      variant="secondary"
                    >
                      {t('button.refundAndCancel')}
                    </Button>

                    <Button onClick={() => setStatus(RelayStatus.Funding)}>
                      {t('button.retry')}
                    </Button>
                  </div>
                </div>
              ) : (
                relayers &&
                relaying && (
                  <FlyingAnimation
                    destination={
                      <Tooltip
                        title={getDisplayNameForChainId(
                          relaying.relayer.chain.chainId
                        )}
                      >
                        <div className="bg-background-base flex items-center justify-center rounded-l-full p-1">
                          <div
                            className="h-8 w-8 rounded-full bg-contain bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url(${relaying.relayer.chainImageUrl})`,
                            }}
                          ></div>
                        </div>
                      </Tooltip>
                    }
                    flyer={
                      <RelayIcon className="text-icon-interactive-primary !h-5 !w-5" />
                    }
                    reversed={relaying.type === 'ack'}
                    source={
                      // First chain is current source chain.
                      <Tooltip
                        title={getDisplayNameForChainId(
                          relayers[0].chain.chainId
                        )}
                      >
                        <div className="bg-background-base flex items-center justify-center rounded-r-full p-1">
                          <div
                            className="h-8 w-8 rounded-full bg-contain bg-center bg-no-repeat"
                            style={{
                              backgroundImage: `url(${relayers[0].chainImageUrl})`,
                            }}
                          ></div>
                        </div>
                      </Tooltip>
                    }
                  />
                )
              ),
          },
          {
            label: t('title.refund'),
            // Show when this step is current or past. This makes sure the
            // refund balances are visible once the success step is reached.
            overrideShowStepContentStatuses: ['current', 'past'],
            content: (stepStatus) => (
              <div className="flex flex-col gap-4">
                <p>
                  Refund your wallet with the remaining tokens from the relayer
                  wallet.
                </p>

                <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                  {[
                    // Match the order of the funding step above with the
                    // current chain execute last.

                    // Receiving chains first.
                    ...(relayers?.slice(1) ?? []),
                    // Current chain last.
                    ...(relayers ? [relayers[0]] : []),
                  ].map(
                    (
                      { chain: { chainId }, chainImageUrl, feeToken },
                      index
                    ) => {
                      // Adjust the index to reflect the reordering above.
                      index = (index + 1) % relayers!.length

                      const funds =
                        !relayerFunds.loading && !relayerFunds.errored
                          ? HugeDecimal.from(relayerFunds.data[index])
                          : HugeDecimal.zero
                      const empty = funds.isZero()

                      const refunded =
                        refundedAmount[chainId] ?? HugeDecimal.zero

                      return (
                        <Fragment key={chainId}>
                          <div className="flex flex-row items-center gap-2">
                            <div
                              className="h-6 w-6 bg-contain bg-center bg-no-repeat"
                              style={{
                                backgroundImage: `url(${chainImageUrl})`,
                              }}
                            ></div>

                            <p className="primary-text shrink-0">
                              {getDisplayNameForChainId(chainId)}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <TokenAmountDisplay
                              amount={empty ? refunded : funds}
                              decimals={feeToken.decimals}
                              symbol={feeToken.symbol}
                            />

                            {empty ? (
                              <Tooltip title="Refunded">
                                <Check className="text-icon-interactive-valid !h-4 !w-4" />
                              </Tooltip>
                            ) : (
                              <Loader fill={false} size={20} />
                            )}
                          </div>
                        </Fragment>
                      )
                    }
                  )}
                </div>

                {stepStatus === 'current' && (
                  <Button
                    className="self-end"
                    loading={status === RelayStatus.Refunding}
                    onClick={() => refundAllRelayers()}
                    size="sm"
                  >
                    {t('button.retry')}
                  </Button>
                )}
              </div>
            ),
          },
          {
            label: canceling ? t('title.canceled') : t('title.success'),
            content: () => (
              <div className="flex flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4">
                <p>
                  The execution and relay{' '}
                  {canceling ? 'was canceled' : 'succeeded'}.
                </p>

                <Button
                  onClick={() => {
                    status === RelayStatus.Success && onSuccess()
                    onClose?.()
                  }}
                >
                  {t('button.close')}
                </Button>
              </div>
            ),
          },
        ]}
        textClassName="!title-text"
      />
    </Modal>
  )
}
