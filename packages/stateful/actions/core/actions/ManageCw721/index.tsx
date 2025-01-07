import { useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  constSelector,
  useRecoilValue,
  useRecoilValueLoadable,
  waitForNone,
} from 'recoil'

import { CommonNftSelectors, DaoDaoCoreSelectors } from '@dao-dao/state/recoil'
import { ActionBase, ImageEmoji, useActionOptions } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { ContractInfoResponse } from '@dao-dao/types/contracts/Cw721Base'
import {
  CW721_ITEM_KEY_PREFIX,
  POLYTONE_CW721_ITEM_KEY_PREFIX,
  getChainForChainId,
  isValidBech32Address,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { ManageStorageItemsAction } from '../ManageStorageItems'
import {
  ManageCw721Data,
  ManageCw721Component as StatelessManageCw721Component,
} from './Component'

const Component: ActionComponent = (props) => {
  const {
    address,
    chain: { chainId: currentChainId },
  } = useActionOptions()

  const { t } = useTranslation()
  const { fieldNamePrefix } = props

  const { watch, setValue } = useFormContext()

  const chainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const { bech32Prefix } = getChainForChainId(chainId)

  const adding = watch(fieldNamePrefix + 'adding')
  const tokenAddress = watch(fieldNamePrefix + 'address')
  const workaround = watch(fieldNamePrefix + 'workaround')

  const tokenInfoLoadable = useRecoilValueLoadable(
    tokenAddress && isValidBech32Address(tokenAddress, bech32Prefix)
      ? CommonNftSelectors.contractInfoSelector({
          contractAddress: tokenAddress,
          chainId,
          params: [],
        })
      : constSelector(undefined)
  )

  // If token info is improperly formatted, use workaround.
  useEffect(() => {
    if (tokenInfoLoadable.state !== 'hasValue' || !tokenInfoLoadable.contents) {
      return
    }

    // We expect keys to contain exactly `name` and `symbol`. If it contains
    // anything else, use the workaround.
    const keys = Object.keys(tokenInfoLoadable.contents)
    if (
      keys.length !== 2 ||
      !keys.includes('name') ||
      !keys.includes('symbol')
    ) {
      if (!workaround) {
        setValue(fieldNamePrefix + 'workaround', true)
      }
    } else {
      if (workaround) {
        setValue(fieldNamePrefix + 'workaround', false)
      }
    }
  }, [fieldNamePrefix, setValue, tokenInfoLoadable, workaround])

  const existingTokenAddresses = useRecoilValue(
    DaoDaoCoreSelectors.allCw721CollectionsSelector({
      contractAddress: address,
      chainId: currentChainId,
    })
  )[chainId]?.collectionAddresses
  const existingTokenInfos = useRecoilValue(
    waitForNone(
      existingTokenAddresses?.map((token) =>
        CommonNftSelectors.contractInfoSelector({
          contractAddress: token,
          chainId,
          params: [],
        })
      ) ?? []
    )
  )
  const existingTokens = useMemo(
    () =>
      (existingTokenAddresses || []).flatMap((address, idx) =>
        existingTokenInfos[idx].state === 'hasValue' &&
        existingTokenInfos[idx].contents
          ? {
              address,
              info: existingTokenInfos[idx].contents as ContractInfoResponse,
            }
          : []
      ),
    [existingTokenAddresses, existingTokenInfos]
  )

  const [additionalAddressError, setAdditionalAddressError] = useState<string>()
  useEffect(() => {
    const tokenInfoErrored = tokenInfoLoadable.state === 'hasError'
    const noTokensWhenRemoving = !adding && existingTokens.length === 0

    if (!tokenInfoErrored && !noTokensWhenRemoving) {
      if (additionalAddressError) {
        setAdditionalAddressError(undefined)
      }
      return
    }

    if (!additionalAddressError) {
      setAdditionalAddressError(
        tokenInfoErrored
          ? t('error.notCw721Address')
          : noTokensWhenRemoving
            ? t('error.noNftCollections')
            : // Should never happen.
              t('error.unexpectedError')
      )
    }
  }, [
    tokenInfoLoadable.state,
    t,
    additionalAddressError,
    existingTokens,
    adding,
  ])

  return (
    <StatelessManageCw721Component
      {...props}
      options={{
        additionalAddressError,
        existingTokens,
        formattedJsonDisplayProps: {
          title: t('form.tokenInfo'),
          jsonLoadable: tokenInfoLoadable,
        },
      }}
    />
  )
}

export class ManageCw721Action extends ActionBase<ManageCw721Data> {
  public readonly key = ActionKey.ManageCw721
  public readonly Component = Component

  private manageStorageItemsAction: ManageStorageItemsAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    const manageStorageItemsAction = new ManageStorageItemsAction(options)

    super(options, {
      Icon: ImageEmoji,
      label: options.t('title.manageTreasuryNfts'),
      description: options.t('info.manageTreasuryNftsDescription'),
      // Match just before manage storage items since this action uses that
      // under the hood.
      matchPriority: manageStorageItemsAction.metadata.matchPriority! + 1,
    })

    this.manageStorageItemsAction = manageStorageItemsAction

    this.defaults = {
      chainId: options.chain.chainId,
      adding: true,
      address: '',
    }
  }

  setup() {
    return this.manageStorageItemsAction.setup()
  }

  encode({ chainId, adding, address }: ManageCw721Data): UnifiedCosmosMsg {
    return this.manageStorageItemsAction.encode({
      setting: adding,
      // Use cross-chain prefix if necessary.
      key:
        chainId === this.options.chain.chainId
          ? CW721_ITEM_KEY_PREFIX + address
          : POLYTONE_CW721_ITEM_KEY_PREFIX + chainId + ':' + address,
      value: '1',
    })
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    // Check if manage storage items matches.
    const manageStorageItemsMatch =
      this.manageStorageItemsAction.match(messages)
    if (manageStorageItemsMatch) {
      // Ensure this is setting or removing a cw721 item.
      const { key } = this.manageStorageItemsAction.decode(messages)
      return (
        (key.startsWith(CW721_ITEM_KEY_PREFIX) &&
          key.split(':').length === 2) ||
        (key.startsWith(POLYTONE_CW721_ITEM_KEY_PREFIX) &&
          key.split(':').length === 3)
      )
    }

    // Otherwise check if it's the regular update message. We no longer support
    // creating actions with this, but for backwards compatibility, we should
    // still detect and display them.
    const { decodedMessage } = messages[0]
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update_cw721_list: {
                to_add: {},
                to_remove: {},
              },
            },
          },
        },
      }) &&
      // Ensure only one collection is being added or removed, but not both, and
      // not more than one collection.
      ((decodedMessage.wasm.execute.msg.update_cw721_list.to_add.length === 1 &&
        decodedMessage.wasm.execute.msg.update_cw721_list.to_remove.length ===
          0) ||
        (decodedMessage.wasm.execute.msg.update_cw721_list.to_add.length ===
          0 &&
          decodedMessage.wasm.execute.msg.update_cw721_list.to_remove.length ===
            1))
    )
  }

  decode(messages: ProcessedMessage[]): ManageCw721Data {
    // If manage storage items, decode cw721 key, cross-chain or not.
    const manageStorageItemsMatch =
      this.manageStorageItemsAction.match(messages)
    if (manageStorageItemsMatch) {
      const { setting, key } = this.manageStorageItemsAction.decode(messages)
      if (key.startsWith(CW721_ITEM_KEY_PREFIX)) {
        // format is `prefix:[address]`
        return {
          chainId: messages[0].account.chainId,
          adding: setting,
          address: key.split(':')[1],
        }
      } else if (key.startsWith(POLYTONE_CW721_ITEM_KEY_PREFIX)) {
        // format is `prefix:[chainId]:[address]`
        return {
          chainId: key.split(':')[1],
          adding: setting,
          address: key.split(':')[2],
        }
      } else {
        // Should never happen as this is validated in match above.
        throw new Error('Unexpected key format')
      }
    }

    // Otherwise it's a regular update message. We no longer support creating
    // actions with this, but for backwards compatibility, we should still
    // detect and display them.
    const {
      decodedMessage,
      account: { chainId },
    } = messages[0]
    return {
      chainId,
      adding:
        decodedMessage.wasm.execute.msg.update_cw721_list.to_add.length === 1,
      address:
        decodedMessage.wasm.execute.msg.update_cw721_list.to_add.length === 1
          ? decodedMessage.wasm.execute.msg.update_cw721_list.to_add[0]
          : decodedMessage.wasm.execute.msg.update_cw721_list.to_remove[0],
    }
  }
}
