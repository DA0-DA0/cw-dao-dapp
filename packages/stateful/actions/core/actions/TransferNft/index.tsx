import { useQueries, useQueryClient } from '@tanstack/react-query'
import JSON5 from 'json5'
import { useFormContext } from 'react-hook-form'

import { nftQueries } from '@dao-dao/state/query'
import {
  lazyNftCardInfosForDaoSelector,
  walletLazyNftCardInfosSelector,
} from '@dao-dao/state/recoil'
import {
  ActionBase,
  BoxEmoji,
  useActionOptions,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  LazyNftCardInfo,
  LoadingDataWithError,
  ProcessedMessage,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  combineLoadingDataWithErrors,
  decodeJsonFromBase64,
  encodeJsonToBase64,
  getChainAddressForActionOptions,
  makeCombineQueryResultsIntoLoadingDataWithError,
  makeExecuteSmartContractMessage,
  maybeMakePolytoneExecuteMessages,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { AddressInput, NftSelectionModal } from '../../../../components'
import { useCw721CommonGovernanceTokenInfoIfExists } from '../../../../voting-module-adapter'
import { TransferNftComponent, TransferNftData } from './Component'

const Component: ActionComponent = (props) => {
  const {
    context,
    address,
    chain: { chainId: currentChainId },
  } = useActionOptions()
  const queryClient = useQueryClient()
  const { watch } = useFormContext<TransferNftData>()
  const { denomOrAddress: governanceCollectionAddress } =
    useCw721CommonGovernanceTokenInfoIfExists() ?? {}

  const chainId = watch((props.fieldNamePrefix + 'chainId') as 'chainId')
  const nfts = watch((props.fieldNamePrefix + 'nfts') as 'nfts')

  const options = useCachedLoadingWithError(
    props.isCreating
      ? context.type === ActionContextType.Wallet
        ? walletLazyNftCardInfosSelector({
            walletAddress: address,
            chainId: currentChainId,
          })
        : lazyNftCardInfosForDaoSelector({
            chainId: currentChainId,
            coreAddress: address,
            governanceCollectionAddress,
          })
      : undefined
  )
  const nftInfos = useQueries({
    queries:
      chainId && nfts.length
        ? nfts.map(({ collection, tokenId }) =>
            nftQueries.cardInfo(queryClient, { chainId, collection, tokenId })
          )
        : [],
    combine: makeCombineQueryResultsIntoLoadingDataWithError(),
  })

  const allChainOptions =
    options.loading || options.errored
      ? options
      : combineLoadingDataWithErrors(
          ...Object.values(options.data).filter(
            (data): data is LoadingDataWithError<LazyNftCardInfo[]> => !!data
          )
        )

  return (
    <TransferNftComponent
      {...props}
      options={{
        options: allChainOptions,
        nftInfos: chainId && nfts.length ? nftInfos : undefined,
        AddressInput,
        NftSelectionModal,
      }}
    />
  )
}

export class TransferNftAction extends ActionBase<TransferNftData> {
  public readonly key = ActionKey.TransferNft
  public readonly Component = Component

  constructor(options: ActionOptions) {
    super(options, {
      Icon: BoxEmoji,
      label: options.t('title.transferNfts'),
      description: options.t('info.transferNftsDescription', {
        context: options.context.type,
      }),
    })

    this.defaults = {
      chainId: options.chain.chainId,
      nfts: [],
      recipient: '',
      executeSmartContract: false,
      smartContractMsg: '{}',
    }
  }

  encode({
    chainId,
    nfts,
    recipient,
    executeSmartContract,
    smartContractMsg,
  }: TransferNftData): UnifiedCosmosMsg[] {
    const sender = getChainAddressForActionOptions(this.options, chainId)
    if (!sender) {
      throw new Error('No sender found for chain.')
    }

    return maybeMakePolytoneExecuteMessages(
      this.options.chain.chainId,
      chainId,
      nfts.map(({ collection, tokenId }) =>
        makeExecuteSmartContractMessage({
          chainId,
          sender,
          contractAddress: collection,
          msg: executeSmartContract
            ? {
                send_nft: {
                  contract: recipient,
                  msg: encodeJsonToBase64(JSON5.parse(smartContractMsg)),
                  token_id: tokenId,
                },
              }
            : {
                transfer_nft: {
                  recipient,
                  token_id: tokenId,
                },
              },
        })
      )
    )
  }

  // This should match one or more identical transfers or one
  // wrapped/cross-chain message with one or more idential transfers. The only
  // thing that can differ is the NFT being transferred.
  handleMessages(_messages: ProcessedMessage[]) {
    const messages = _messages[0].isWrapped
      ? _messages[0].wrappedMessages
      : _messages

    // Detect all transfers.
    const all = messages.map(({ decodedMessage, account: { chainId } }) =>
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              transfer_nft: {
                recipient: {},
                token_id: {},
              },
            },
          },
        },
      })
        ? {
            chainId,
            collection: decodedMessage.wasm.execute.contract_addr,
            tokenId: decodedMessage.wasm.execute.msg.transfer_nft.token_id,
            recipient: decodedMessage.wasm.execute.msg.transfer_nft.recipient,
            executeSmartContract: false,
            smartContractMsg: '{}',
          }
        : objectMatchesStructure(decodedMessage, {
              wasm: {
                execute: {
                  contract_addr: {},
                  funds: {},
                  msg: {
                    send_nft: {
                      contract: {},
                      msg: {},
                      token_id: {},
                    },
                  },
                },
              },
            })
          ? {
              chainId,
              collection: decodedMessage.wasm.execute.contract_addr,
              tokenId: decodedMessage.wasm.execute.msg.send_nft.token_id,
              recipient: decodedMessage.wasm.execute.msg.send_nft.contract,
              executeSmartContract: true,
              smartContractMsg: JSON.stringify(
                decodeJsonFromBase64(
                  decodedMessage.wasm.execute.msg.send_nft.msg,
                  true
                ),
                null,
                2
              ),
            }
          : null
    )

    // If the first is not a transfer, match none.
    if (!all.length || !all[0]) {
      return []
    }

    // Select all identical adjacent transfers starting with the first. Once one
    // does not match, stop.
    const transfers = [all[0]]
    for (const transfer of all.slice(1)) {
      // If the chainId, recipient, executeSmartContract, and smartContractMsg
      // don't match the first transfer, stop.
      if (
        !transfer ||
        transfer.chainId !== transfers[0].chainId ||
        transfer.recipient !== transfers[0].recipient ||
        transfer.executeSmartContract !== transfers[0].executeSmartContract ||
        transfer.smartContractMsg !== transfers[0].smartContractMsg
      ) {
        break
      }

      transfers.push(transfer)
    }

    return transfers
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    const transfers = this.handleMessages(messages)
    // If wrapped execute, only match the one wrapped execute that contains the
    // other transfers, and only if all messages are transfers.
    return messages[0].isWrapped &&
      transfers.length === messages[0].wrappedMessages.length
      ? 1
      : transfers.length
  }

  decode(messages: ProcessedMessage[]): TransferNftData {
    const transfers = this.handleMessages(messages)
    return {
      chainId: transfers[0].chainId,
      nfts: transfers.map(({ collection, tokenId }) => ({
        collection,
        tokenId,
      })),
      recipient: transfers[0].recipient,
      executeSmartContract: transfers[0].executeSmartContract,
      smartContractMsg: transfers[0].smartContractMsg,
    }
  }
}
