import { AccountData, StdSignDoc } from '@cosmjs/amino'
import { fromBech32, fromHex } from '@cosmjs/encoding'
import {
  COSMIFRAME_KEYSTORECHANGE_EVENT,
  DirectSignDoc,
  SimpleAccount,
  WalletAccount,
} from '@cosmos-kit/core'
import { useIframe } from '@cosmos-kit/react-lite'
import { useQueryClient } from '@tanstack/react-query'
import {
  ComponentType,
  RefCallback,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { OverrideHandler } from '@dao-dao/cosmiframe'
import { chainQueries } from '@dao-dao/state/query'
import {
  ActionMatcherProvider,
  AppsRendererExecutionType,
  ChainProvider,
  DaoSupportedChainPickerInput,
  AppsRenderer as StatelessAppsRenderer,
  useActionForKey,
  useActionMatcher,
  useChain,
  useDaoIfAvailable,
  useLoadingPromise,
} from '@dao-dao/stateless'
import {
  AccountType,
  ActionKey,
  ActionKeyAndData,
  EntityType,
  LoadingDataWithError,
  UnifiedCosmosMsg,
  decodedStargateMsgToCw,
  getAminoTypes,
  protobufToCwMsg,
} from '@dao-dao/types'
import { TxBody } from '@dao-dao/types/protobuf/codegen/cosmos/tx/v1beta1/tx'
import {
  EMPTY_PUB_KEY,
  SITE_TITLE,
  SITE_URL,
  getChainAddressForActionOptions,
  getChainForChainId,
  getDaoAddressForChainId,
  getDisplayNameForChainId,
  isValidBech32Address,
} from '@dao-dao/utils'

import { AuthzExecAction, DaoAdminExecAction } from '../../actions/core/actions'
import { useQueryLoadingDataWithError, useWallet } from '../../hooks'
import { entityQueries } from '../../queries'
import { AddressInput } from '../AddressInput'
import { WalletChainSwitcher } from '../wallet'

export type AppsRendererProps = {
  /**
   * Whether this is being used in a DAO or a wallet.
   */
  mode: 'dao' | 'wallet'
  /**
   * Executor component.
   */
  Executor: ComponentType<AppsRendererExecutorProps>
}

export type AppsRendererExecutorProps = {
  /**
   * Callback to close or cancel the execution.
   */
  onClose: () => void
  /**
   * The loading data with actions to execute.
   */
  data: LoadingDataWithError<ActionKeyAndData[]>
}

export const AppsRenderer = ({ mode, ...props }: AppsRendererProps) => {
  const dao = useDaoIfAvailable()
  if (mode === 'dao' && !dao) {
    throw new Error('DAO context not loaded.')
  }

  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { chainId: contextChainId } = useChain()
  const {
    address: walletAddress,
    chainWallet,
    account,
  } = useWallet({
    loadAccount: true,
  })
  const [finalMessages, setFinalMessages] = useState<UnifiedCosmosMsg[]>()
  const close = useCallback(() => setFinalMessages(undefined), [])

  const [fullScreen, setFullScreen] = useState(false)

  const [executionType, setExecutionType] =
    useState<AppsRendererExecutionType>('normal')
  const [otherAddress, setOtherAddress] = useState('')
  const [otherChainId, setOtherChainId] = useState(contextChainId)

  // This is the chain we will use for the app. For a wallet, the chain switcher
  // will set the wallet chain ID atom which affects the whole app context, so
  // this shouldn't matter. For a DAO, this can differ from the DAO's chain ID
  // if the target address is on a different chain.
  const appChainId = executionType === 'normal' ? contextChainId : otherChainId
  const appChain = getChainForChainId(appChainId)

  // This is the other address for non-normal execution types (authz and DAO
  // admin execute).
  const validOtherAddress =
    executionType !== 'normal' &&
    otherAddress &&
    isValidBech32Address(otherAddress, appChain.bech32Prefix)
      ? otherAddress
      : undefined

  // This is the address that is using the Apps interface, either the DAO or
  // wallet.
  const executorAddress = mode === 'dao' ? dao?.coreAddress : walletAddress
  // This is the address we will use for the app and is the account the app
  // thinks is using it.
  const appAddress = validOtherAddress || executorAddress

  // This is the entity we will use for the app.
  const appEntity = useQueryLoadingDataWithError(
    appAddress
      ? entityQueries.info(queryClient, {
          chainId: appChainId,
          address: appAddress,
        })
      : undefined
  )

  const authzExecAction = useActionForKey(ActionKey.AuthzExec) as
    | AuthzExecAction
    | undefined
  const daoAdminExecAction = useActionForKey(ActionKey.DaoAdminExec) as
    | DaoAdminExecAction
    | undefined

  // Handle decoded messages, wrapping in the necessary actions.
  const onDecode = (
    chainId: string,
    sender: string,
    msgs: UnifiedCosmosMsg[]
  ) => {
    if (appEntity.loading || appEntity.errored) {
      throw new Error('Entity not yet loaded.')
    }

    if (chainId !== appChainId) {
      throw new Error('App chain ID mismatch.')
    }

    // Potentially wrap in authz execute or DAO admin execute based on the
    // execution type.
    if (executionType === 'authzExec') {
      if (!authzExecAction) {
        throw new Error('Authz exec action not found.')
      }

      const executor = getChainAddressForActionOptions(
        authzExecAction.options,
        chainId
      )

      if (!executor) {
        throw new Error('Authz exec executor not found.')
      }

      msgs = authzExecAction.encode({
        chainId,
        address: sender,
        msgs,
      })
    } else if (executionType === 'daoAdminExec') {
      if (!daoAdminExecAction) {
        throw new Error('DAO admin exec action not found.')
      }

      const executor = getChainAddressForActionOptions(
        daoAdminExecAction.options,
        chainId
      )

      if (!executor) {
        throw new Error('DAO admin exec executor not found.')
      }

      msgs = daoAdminExecAction.encode({
        chainId,
        coreAddress: sender,
        msgs,
      })
    }

    // // Potentially wrap in a cross-chain execute action for DAOs.
    // if (mode === 'dao' && dao) {
    //   const account = dao.accounts.find(
    //     (a) => a.chainId === chainId && a.address === sender
    //   )
    //   // Should never happen.
    //   if (!account) {
    //     throw new Error(
    //       `DAO account not found for sender ${sender} on chain ${chainId}.`
    //     )
    //   }

    //   if (account.type === AccountType.Polytone) {
    //     sender = dao.coreAddress
    //     msgs = maybeMakePolytoneExecuteMessages(dao.chainId, chainId, msgs)
    //   } else if (account.type === AccountType.Ica) {
    //     sender = dao.coreAddress
    //     msgs = maybeMakeIcaExecuteMessages(
    //       dao.chainId,
    //       chainId,
    //       sender,
    //       account.address,
    //       msgs
    //     )
    //   } else if (account.type !== AccountType.Base) {
    //     throw new Error(
    //       `Cannot execute with DAO account of type '${account.type}' (${sender} on chain ${chainId}).`
    //     )
    //   }
    // }

    setFinalMessages(msgs)
  }

  const decodeDirect = (sender: string, signDoc: DirectSignDoc) => {
    if (!signDoc?.bodyBytes || !signDoc?.chainId) {
      return
    }

    const encodedMessages = TxBody.decode(signDoc.bodyBytes).messages
    const messages = encodedMessages.flatMap(
      (msg) =>
        protobufToCwMsg(getChainForChainId(signDoc.chainId!), msg, false).msg
    )

    console.log('APP DIRECT DECODING', {
      chainId: signDoc.chainId,
      sender,
      encodedMessages,
      messages,
    })

    onDecode(signDoc.chainId, sender, messages)
  }

  const decodeAmino = (sender: string, signDoc: StdSignDoc) => {
    const messages = signDoc.msgs.flatMap(
      (msg) =>
        decodedStargateMsgToCw(
          getChainForChainId(signDoc.chain_id),
          getAminoTypes().fromAmino(msg)
        ).msg
    )

    console.log('APP AMINO DECODING', {
      chainId: signDoc.chain_id,
      sender,
      signDoc,
      messages,
    })

    onDecode(signDoc.chain_id, sender, messages)
  }

  const daoEnableAndConnect = (chainIds: string | string[]): OverrideHandler =>
    [chainIds].flat().some((chainId) => {
      if (!dao) {
        throw new Error('DAO context not loaded.')
      }

      try {
        // Throws error if account not found.
        getDaoAddressForChainId(dao.info, chainId)

        return true
      } catch {
        return false
      }
    })
      ? {
          type: 'success',
        }
      : {
          type: 'error',
          error: t('error.daoMissingAccountsOnChains', {
            daoName: name,
            chains: [chainIds]
              .flat()
              .map(
                (chainId) => `${getDisplayNameForChainId(chainId)} (${chainId})`
              )
              .join(', '),
            count: [chainIds].flat().length,
          }),
        }

  const walletConnect = async (_chainIds: string | string[]) => {
    if (!chainWallet) {
      return {
        type: 'error',
        error: 'Wallet not connected.',
      }
    }

    if (chainWallet.isWalletDisconnected) {
      await chainWallet.connect(false)
    }

    const chainIds = [_chainIds].flat()
    const allChainWallets = chainWallet.mainWallet.getChainWalletList(false)
    const chainWallets = chainIds.map(
      (chainId) => allChainWallets.find((cw) => cw.chainId === chainId)!
    )

    // Stop if missing chain wallets.
    const missingChainWallets = chainIds.filter(
      (_, index) => !chainWallets[index]
    )
    if (missingChainWallets.length > 0) {
      throw new Error(
        t('error.unexpectedlyMissingChains', {
          chains: missingChainWallets
            .map((chainId) => getDisplayNameForChainId(chainId))
            .join(', '),
        })
      )
    }

    // Connect to all chain wallets.
    await Promise.all(
      chainWallets.map((w) => !w.isWalletConnected && w.connect(false))
    )

    return {
      type: 'success',
    }
  }

  const { wallet, iframeRef } = useIframe({
    metadata: {
      name: SITE_TITLE,
      imageUrl: SITE_URL + '/daodao.png',
    },
    walletClientOverrides: {
      // @ts-ignore
      signAmino: (_chainId: string, signer: string, signDoc: StdSignDoc) => {
        decodeAmino(signer, signDoc)
      },
      // @ts-ignore
      signDirect: (
        _chainId: string,
        signer: string,
        signDoc: DirectSignDoc
      ) => {
        decodeDirect(signer, signDoc)
      },
      enable: mode === 'dao' ? daoEnableAndConnect : undefined,
      connect: mode === 'dao' ? daoEnableAndConnect : walletConnect,
      sign:
        mode === 'dao' || executionType !== 'normal'
          ? () => ({
              type: 'error',
              value: 'Unsupported.',
            })
          : undefined,
      signArbitrary:
        mode === 'dao' || executionType !== 'normal'
          ? () => ({
              type: 'error',
              value: 'Unsupported.',
            })
          : undefined,
      suggestToken:
        mode === 'dao'
          ? () => ({
              type: 'success',
            })
          : undefined,
      addChain:
        mode === 'dao'
          ? () => ({
              type: 'success',
            })
          : undefined,
      getAccount: async (chainId: string) => {
        if (appEntity.loading || appEntity.errored) {
          return {
            type: 'error',
            error: 'Entity not yet loaded.',
          }
        }

        if (appEntity.data.type === EntityType.Wallet) {
          if (chainId !== appEntity.data.chainId) {
            return {
              type: 'error',
              error: `Expected chain ID ${appEntity.data.chainId}, got ${chainId}.`,
            }
          }

          if (appEntity.data.address === walletAddress && account) {
            return {
              type: 'success',
              value: {
                address: account.address,
                algo: account.algo,
                pubkey: account.pubkey,
                username:
                  appEntity.data.name ||
                  account.username ||
                  appEntity.data.address,
                isNanoLedger: false,
                isSmartContract: false,
              } satisfies WalletAccount,
            }
          }

          const pubkey = fromHex(
            await queryClient.fetchQuery(
              chainQueries.walletHexPublicKey({
                chainId,
                address: appEntity.data.address,
              })
            )
          )

          if (!pubkey) {
            return {
              type: 'error',
              error: 'Pubkey not found.',
            }
          }

          return {
            type: 'success',
            value: {
              address: appEntity.data.address,
              algo: 'secp256k1',
              pubkey,
              username: appEntity.data.name || appEntity.data.address,
              isNanoLedger: false,
              isSmartContract: false,
            } satisfies WalletAccount,
          }
        } else if (appEntity.data.type === EntityType.Dao) {
          return {
            type: 'success',
            value: {
              address: getDaoAddressForChainId(appEntity.data.daoInfo, chainId),
              algo: 'secp256k1',
              pubkey: EMPTY_PUB_KEY,
              username: appEntity.data.name || appEntity.data.address,
              isNanoLedger: false,
              isSmartContract: false,
            } satisfies WalletAccount,
          }
        }

        return {
          type: 'error',
          error: 'Unknown entity type.',
        }
      },
      getSimpleAccount: (chainId: string) => {
        if (appEntity.loading || appEntity.errored) {
          return {
            type: 'error',
            error: 'Entity not yet loaded.',
          }
        }

        if (appEntity.data.type === EntityType.Wallet) {
          if (chainId !== appEntity.data.chainId) {
            return {
              type: 'error',
              error: `Expected chain ID ${appEntity.data.chainId}, got ${chainId}.`,
            }
          }

          return {
            type: 'success',
            value: {
              namespace: 'cosmos',
              chainId,
              address: appEntity.data.address,
              username: appEntity.data.name || appEntity.data.address,
            } satisfies SimpleAccount,
          }
        } else if (appEntity.data.type === EntityType.Dao) {
          return {
            type: 'success',
            value: {
              namespace: 'cosmos',
              chainId,
              address: getDaoAddressForChainId(appEntity.data.daoInfo, chainId),
              username: appEntity.data.name || appEntity.data.address,
            } satisfies SimpleAccount,
          }
        }

        return {
          type: 'error',
          error: 'Unknown entity type.',
        }
      },
      // Needed by Graz and other Keplr clients.
      getKey: async (chainId: string) => {
        if (appEntity.loading || appEntity.errored) {
          return {
            type: 'error',
            error: 'Entity not yet loaded.',
          }
        }

        if (appEntity.data.type === EntityType.Wallet) {
          if (chainId !== appEntity.data.chainId) {
            return {
              type: 'error',
              error: `Expected chain ID ${appEntity.data.chainId}, got ${chainId}.`,
            }
          }

          if (appEntity.data.address === walletAddress && account) {
            return {
              type: 'success',
              value: {
                name:
                  appEntity.data.name ||
                  account.username ||
                  appEntity.data.address,
                algo: 'secp256k1',
                pubkey: account.pubkey,
                pubKey: account.pubkey,
                address: fromBech32(appEntity.data.address).data,
                bech32Address: appEntity.data.address,
                isNanoLedger: false,
                isSmartContract: false,
                isKeystone: false,
              },
            }
          }

          const pubkey = fromHex(
            await queryClient.fetchQuery(
              chainQueries.walletHexPublicKey({
                chainId,
                address: appEntity.data.address,
              })
            )
          )

          if (!pubkey) {
            return {
              type: 'error',
              error: 'Pubkey not found.',
            }
          }

          return {
            type: 'success',
            value: {
              name: appEntity.data.name || appEntity.data.address,
              algo: 'secp256k1',
              pubkey,
              pubKey: pubkey,
              address: fromBech32(appEntity.data.address).data,
              bech32Address: appEntity.data.address,
              isNanoLedger: false,
              isSmartContract: false,
              isKeystone: false,
            },
          }
        } else if (appEntity.data.type === EntityType.Dao) {
          // Ignore invalid chains for now.
          let bech32Address = ''
          try {
            bech32Address = getDaoAddressForChainId(
              appEntity.data.daoInfo,
              chainId
            )
          } catch {}

          return {
            type: 'success',
            value: {
              name: appEntity.data.name,
              algo: 'secp256k1',
              pubkey: EMPTY_PUB_KEY,
              pubKey: EMPTY_PUB_KEY,
              address: fromBech32(bech32Address).data,
              bech32Address,
              isNanoLedger: false,
              isSmartContract: false,
              isKeystone: false,
            },
          }
        }

        return {
          type: 'error',
          error: 'Unknown entity type.',
        }
      },
    },
    signerOverrides: {
      signDirect: (signerAddress, signDoc) => {
        decodeDirect(signerAddress, signDoc)

        return {
          type: 'error',
          error: 'Handled by DAO DAO.',
        }
      },
      signAmino: (signerAddress, signDoc) => {
        decodeAmino(signerAddress, signDoc)

        return {
          type: 'error',
          error: 'Handled by DAO DAO.',
        }
      },
      getAccounts: async () => {
        if (appEntity.loading || appEntity.errored) {
          return {
            type: 'error',
            error: 'Entity not yet loaded.',
          }
        }

        if (appEntity.data.type === EntityType.Wallet) {
          if (appEntity.data.address === walletAddress && account) {
            return {
              type: 'success',
              value: [
                {
                  address: account.address,
                  algo: account.algo,
                  pubkey: account.pubkey,
                } satisfies AccountData,
              ],
            }
          }

          const pubkey = fromHex(
            await queryClient.fetchQuery(
              chainQueries.walletHexPublicKey({
                chainId: appEntity.data.chainId,
                address: appEntity.data.address,
              })
            )
          )

          if (!pubkey) {
            return {
              type: 'error',
              error: 'Pubkey not found.',
            }
          }

          return {
            type: 'success',
            value: [
              {
                address: appEntity.data.address,
                algo: 'secp256k1',
                pubkey,
              } satisfies AccountData,
            ],
          }
        } else {
          return {
            type: 'success',
            value: [
              {
                address: appEntity.data.address,
                algo: 'secp256k1',
                pubkey: EMPTY_PUB_KEY,
              } satisfies AccountData,
            ],
          }
        }
      },
    },
  })

  // Connect to iframe wallet on load if disconnected.
  const connectingRef = useRef(false)
  useEffect(() => {
    if (wallet && !wallet.isWalletConnected && !connectingRef.current) {
      connectingRef.current = true
      try {
        wallet.connect(false)
      } finally {
        connectingRef.current = false
      }
    }
  }, [wallet])

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null)
  const myIframeRef: RefCallback<HTMLIFrameElement | null> = useCallback(
    (ref) => {
      setIframe(ref)
      iframeRef(ref)
    },
    [iframeRef]
  )

  // If app entity changes, refresh iframe app wallet.
  const appEntityData =
    appEntity.loading || appEntity.errored ? undefined : appEntity.data
  useEffect(() => {
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          event: COSMIFRAME_KEYSTORECHANGE_EVENT,
        },
        '*'
      )
    }
  }, [appEntityData, iframe])

  return (
    <>
      <ChainProvider chainId={appChainId}>
        <StatelessAppsRenderer
          AddressInput={AddressInput}
          chainPicker={
            mode === 'dao' ? (
              <DaoSupportedChainPickerInput
                accountTypes={[AccountType.Polytone, AccountType.Ica]}
                hideFormLabel
                onChange={setOtherChainId}
                selected={otherChainId}
              />
            ) : (
              <WalletChainSwitcher type="configured" />
            )
          }
          executionType={executionType}
          fullScreen={fullScreen}
          iframeRef={myIframeRef}
          otherAddress={otherAddress}
          setExecutionType={setExecutionType}
          setFullScreen={setFullScreen}
          setOtherAddress={setOtherAddress}
        />
      </ChainProvider>

      {finalMessages && (
        <ActionMatcherProvider messages={finalMessages}>
          <InnerAppsRenderer onClose={close} {...props} />
        </ActionMatcherProvider>
      )}
    </>
  )
}

type InnerAppsRendererProps = {
  /**
   * Callback to close or cancel the execution.
   */
  onClose: () => void
  /**
   * Executor component.
   */
  Executor: ComponentType<AppsRendererExecutorProps>
}

const InnerAppsRenderer = ({ onClose, Executor }: InnerAppsRendererProps) => {
  const matcher = useActionMatcher()
  const data = useLoadingPromise({
    promise: async () =>
      !matcher.ready
        ? // Never resolve while matcher is not ready.
          new Promise<ActionKeyAndData[]>(() => {})
        : await Promise.all(
            matcher.matches.map(
              async (decoder, index): Promise<ActionKeyAndData> => ({
                _id: index.toString(),
                actionKey: decoder.action.key,
                data: await decoder.decode(),
              })
            )
          ),
    deps: [matcher.status],
  })

  return <Executor data={data} onClose={onClose} />
}
