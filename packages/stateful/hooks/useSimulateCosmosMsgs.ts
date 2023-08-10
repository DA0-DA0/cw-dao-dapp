import { useCallback } from 'react'
import { constSelector, useRecoilValue, waitForAll } from 'recoil'

import { cosmos } from '@dao-dao/protobuf'
import { SignMode } from '@dao-dao/protobuf/codegen/cosmos/tx/signing/v1beta1/signing'
import { SimulateRequest } from '@dao-dao/protobuf/codegen/cosmos/tx/v1beta1/service'
import {
  AuthInfo,
  Fee,
  Tx,
  TxBody,
} from '@dao-dao/protobuf/codegen/cosmos/tx/v1beta1/tx'
import { Any } from '@dao-dao/protobuf/codegen/google/protobuf/any'
import {
  DaoCoreV2Selectors,
  cosmosRpcClientForChainSelector,
} from '@dao-dao/state/recoil'
import { useChain } from '@dao-dao/stateless'
import { CosmosMsgFor_Empty } from '@dao-dao/types'
import {
  cwMsgToEncodeObject,
  decodeMessages,
  decodePolytoneExecuteMsg,
  isValidContractAddress,
  typesRegistry,
} from '@dao-dao/utils'

// Simulate executing Cosmos messages on-chain. We can't just use the simulate
// function on SigningCosmWasmClient or SigningStargateClient because they
// include signer info from the wallet. We may want to simulate these messages
// coming from a DAO, so we don't want wallet signing info included. Those
// simulate functions internally call this function:
// https://github.com/cosmos/cosmjs/blob/2c3b27eeb3622a6108086267ba6faf3984251be3/packages/stargate/src/modules/tx/queries.ts#L47
// We can copy this simulate function and leave out the wallet-specific fields
// (i.e. sequence) and unnecessary fields (i.e. publicKey, memo) to simulate
// these messages from a DAO address.
export const useSimulateCosmosMsgs = (senderAddress: string) => {
  const { chain_id: chainId, bech32_prefix: bech32Prefix } = useChain()

  const cosmosRpcClient = useRecoilValue(
    cosmosRpcClientForChainSelector(chainId)
  )
  const polytoneProxies = useRecoilValue(
    isValidContractAddress(senderAddress, bech32Prefix)
      ? DaoCoreV2Selectors.polytoneProxiesSelector({
          chainId,
          contractAddress: senderAddress,
        })
      : constSelector(undefined)
  )
  const polytoneChainIds = Object.keys(polytoneProxies ?? {})
  const polytoneRpcClients = useRecoilValue(
    waitForAll(
      polytoneChainIds.map((chainId) =>
        cosmosRpcClientForChainSelector(chainId)
      )
    )
  )

  const simulate = useCallback(
    async (msgs: CosmosMsgFor_Empty[]): Promise<void> => {
      // If no messages, nothing to simulate.
      if (msgs.length === 0) {
        return
      }

      await doSimulation(cosmosRpcClient, msgs, senderAddress)

      if (!polytoneProxies) {
        return
      }

      // Also simulate polytone messages on receiving chains.
      const decodedPolytoneMessages = decodeMessages(msgs)
        .map((msg) => {
          const decoded = decodePolytoneExecuteMsg(chainId, msg, 'oneOrZero')
          return decoded.match && decoded.cosmosMsg ? decoded : undefined
        })
        .filter(Boolean)
        .map((decoded) => decoded!)

      if (decodedPolytoneMessages.length === 0) {
        return
      }

      const polytoneGroupedByChainId = polytoneChainIds.reduce(
        (acc, chainId) => ({
          ...acc,
          [chainId]: [
            ...(acc[chainId] ?? []),
            ...decodedPolytoneMessages
              .filter((decoded) => decoded.chainId === chainId)
              .map(({ cosmosMsg }) => cosmosMsg!),
          ],
        }),
        {} as Record<string, CosmosMsgFor_Empty[] | undefined>
      )

      await Promise.all(
        polytoneChainIds.map(async (chainId, index) => {
          const msgs = polytoneGroupedByChainId[chainId]
          const polytoneProxy = polytoneProxies[chainId]
          const cosmosRpcClient = polytoneRpcClients[index]
          if (!polytoneProxy || !msgs) {
            return
          }

          await doSimulation(cosmosRpcClient, msgs, polytoneProxy)
        })
      )
    },
    [
      chainId,
      cosmosRpcClient,
      polytoneChainIds,
      polytoneProxies,
      polytoneRpcClients,
      senderAddress,
    ]
  )

  return simulate
}

const doSimulation = async (
  cosmosRpcClient: Awaited<
    ReturnType<typeof cosmos.ClientFactory.createRPCQueryClient>
  >['cosmos'],
  msgs: CosmosMsgFor_Empty[],
  senderAddress: string
) => {
  const encodedMsgs = msgs.map((msg) => {
    const encoded = cwMsgToEncodeObject(msg, senderAddress)
    return typesRegistry.encodeAsAny(encoded)
  })

  // Simulate messages separately.
  await encodedMsgs.reduce(async (p, encoded) => {
    await p

    console.log('Simulating:', encoded)
    await simulateMessages(cosmosRpcClient, [encoded])
  }, Promise.resolve())

  // Simulate messages together.
  console.log('Simulating all')
  await simulateMessages(cosmosRpcClient, encodedMsgs)
}

const simulateMessages = async (
  cosmosRpcClient: Awaited<
    ReturnType<typeof cosmos.ClientFactory.createRPCQueryClient>
  >['cosmos'],
  messages: Any[]
) => {
  const tx = Tx.fromPartial({
    authInfo: AuthInfo.fromPartial({
      fee: Fee.fromPartial({}),
      signerInfos: [
        // @ts-ignore
        {
          modeInfo: {
            single: {
              mode: SignMode.SIGN_MODE_DIRECT,
            },
          },
        },
      ],
    }),
    body: TxBody.fromPartial({
      messages,
      memo: '',
    }),
    signatures: [new Uint8Array()],
  })

  const request = SimulateRequest.fromPartial({
    txBytes: Tx.encode(tx).finish(),
  })

  await cosmosRpcClient.tx.v1beta1.simulate(request)
}
