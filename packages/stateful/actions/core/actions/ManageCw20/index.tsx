import { useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  constSelector,
  useRecoilValue,
  useRecoilValueLoadable,
  waitForAll,
} from 'recoil'

import { Cw20BaseSelectors } from '@dao-dao/state'
import { DaoDaoCoreSelectors } from '@dao-dao/state/recoil'
import { ActionBase, TokenEmoji, useActionOptions } from '@dao-dao/stateless'
import { UnifiedCosmosMsg } from '@dao-dao/types'
import {
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
} from '@dao-dao/types/actions'
import { TokenInfoResponse } from '@dao-dao/types/contracts/Cw20Base'
import {
  CW20_ITEM_KEY_PREFIX,
  POLYTONE_CW20_ITEM_KEY_PREFIX,
  getChainForChainId,
  isValidBech32Address,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { ManageStorageItemsAction } from '../ManageStorageItems'
import {
  ManageCw20Data,
  ManageCw20Component as StatelessManageCw20Component,
} from './Component'

const Component: ActionComponent = (props) => {
  const {
    address,
    chain: { chainId: currentChainId },
  } = useActionOptions()

  const { t } = useTranslation()
  const { fieldNamePrefix } = props

  const { watch } = useFormContext()

  const chainId = watch((fieldNamePrefix + 'chainId') as 'chainId')
  const { bech32Prefix } = getChainForChainId(chainId)

  const adding = watch(fieldNamePrefix + 'adding')
  const tokenAddress = watch(fieldNamePrefix + 'address')

  const tokenInfoLoadable = useRecoilValueLoadable(
    tokenAddress && isValidBech32Address(tokenAddress, bech32Prefix)
      ? Cw20BaseSelectors.tokenInfoSelector({
          contractAddress: tokenAddress,
          chainId,
          params: [],
        })
      : constSelector(undefined)
  )

  const existingTokenAddresses = useRecoilValue(
    DaoDaoCoreSelectors.allCw20TokensSelector({
      contractAddress: address,
      chainId: currentChainId,
    })
  )[chainId]?.tokens
  const existingTokenInfos = useRecoilValue(
    waitForAll(
      existingTokenAddresses?.map((token) =>
        Cw20BaseSelectors.tokenInfoSelector({
          contractAddress: token,
          chainId,
          params: [],
        })
      ) ?? []
    )
  )
  const existingTokens = useMemo(
    () =>
      (existingTokenAddresses
        ?.map((address, idx) => ({
          address,
          info: existingTokenInfos[idx],
        }))
        // If undefined token info response, ignore the token.
        .filter(({ info }) => !!info) ?? []) as {
        address: string
        info: TokenInfoResponse
      }[],
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
          ? t('error.notCw20Address')
          : noTokensWhenRemoving
            ? t('error.noCw20Tokens')
            : // Should never happen.
              t('error.unexpectedError')
      )
    }
  }, [
    tokenInfoLoadable.state,
    existingTokens.length,
    t,
    additionalAddressError,
    adding,
  ])

  return (
    <StatelessManageCw20Component
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

export class ManageCw20Action extends ActionBase<ManageCw20Data> {
  public readonly key = ActionKey.ManageCw20
  public readonly Component = Component

  private manageStorageItemsAction: ManageStorageItemsAction

  constructor(options: ActionOptions) {
    if (options.context.type !== ActionContextType.Dao) {
      throw new Error('Not DAO context')
    }

    const manageStorageItemsAction = new ManageStorageItemsAction(options)

    super(options, {
      Icon: TokenEmoji,
      label: options.t('title.manageTreasuryTokens'),
      description: options.t('info.manageTreasuryTokensDescription'),
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

  encode({ chainId, adding, address }: ManageCw20Data): UnifiedCosmosMsg {
    return this.manageStorageItemsAction.encode({
      setting: adding,
      // Use cross-chain prefix if necessary.
      key:
        chainId === this.options.chain.chainId
          ? CW20_ITEM_KEY_PREFIX + address
          : POLYTONE_CW20_ITEM_KEY_PREFIX + chainId + ':' + address,
      value: '1',
    })
  }

  match(messages: ProcessedMessage[]): ActionMatch {
    // Check if manage storage items matches.
    const manageStorageItemsMatch =
      this.manageStorageItemsAction.match(messages)
    if (manageStorageItemsMatch) {
      // Ensure this is setting or removing a cw20 item.
      const { key } = this.manageStorageItemsAction.decode(messages)
      return (
        (key.startsWith(CW20_ITEM_KEY_PREFIX) && key.split(':').length === 2) ||
        (key.startsWith(POLYTONE_CW20_ITEM_KEY_PREFIX) &&
          key.split(':').length === 3)
      )
    }

    // Otherwise check if it's the regular update message.
    const { decodedMessage } = messages[0]
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update_cw20_list: {
                to_add: {},
                to_remove: {},
              },
            },
          },
        },
      }) &&
      // Ensure only one token is being added or removed, but not both, and not
      // more than one token. Ideally this component lets you add or remove
      // multiple tokens at once, but that's not supported yet.
      ((decodedMessage.wasm.execute.msg.update_cw20_list.to_add.length === 1 &&
        decodedMessage.wasm.execute.msg.update_cw20_list.to_remove.length ===
          0) ||
        (decodedMessage.wasm.execute.msg.update_cw20_list.to_add.length === 0 &&
          decodedMessage.wasm.execute.msg.update_cw20_list.to_remove.length ===
            1))
    )
  }

  decode(messages: ProcessedMessage[]): ManageCw20Data {
    // If manage storage items, decode cross-chain cw20 key.
    const manageStorageItemsMatch =
      this.manageStorageItemsAction.match(messages)
    if (manageStorageItemsMatch) {
      const { setting, key } = this.manageStorageItemsAction.decode(messages)
      if (key.startsWith(CW20_ITEM_KEY_PREFIX)) {
        // format is `prefix:[address]`
        return {
          chainId: messages[0].account.chainId,
          adding: setting,
          address: key.split(':')[1],
        }
      } else if (key.startsWith(POLYTONE_CW20_ITEM_KEY_PREFIX)) {
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
        decodedMessage.wasm.execute.msg.update_cw20_list.to_add.length === 1,
      address:
        decodedMessage.wasm.execute.msg.update_cw20_list.to_add.length === 1
          ? decodedMessage.wasm.execute.msg.update_cw20_list.to_add[0]
          : decodedMessage.wasm.execute.msg.update_cw20_list.to_remove[0],
    }
  }
}
