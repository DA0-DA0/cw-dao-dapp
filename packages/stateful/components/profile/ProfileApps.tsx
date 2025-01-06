import { StdSignDoc } from '@cosmjs/amino'
import { DirectSignDoc } from '@cosmos-kit/core'
import { useIframe } from '@cosmos-kit/react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState } from 'recoil'

import { meTransactionAtom } from '@dao-dao/state/recoil'
import {
  ActionCardLoader,
  ActionMatcherProvider,
  AppsRenderer,
  ChainProvider,
  ErrorPage,
  Modal,
  ProfileImage,
  ProfileNameDisplayAndEditor,
  useActionMatcher,
  useChain,
  useLoadingPromise,
} from '@dao-dao/stateless'
import {
  ActionKeyAndData,
  UnifiedCosmosMsg,
  decodedStargateMsgToCw,
  getAminoTypes,
  protobufToCwMsg,
} from '@dao-dao/types'
import { TxBody } from '@dao-dao/types/protobuf/codegen/cosmos/tx/v1beta1/tx'
import {
  SITE_TITLE,
  SITE_URL,
  getChainForChainId,
  getDisplayNameForChainId,
} from '@dao-dao/utils'

import { useProfile } from '../../hooks'
import { ConnectWallet } from '../ConnectWallet'
import { ProfileActions } from './ProfileActions'

export const ProfileApps = () => {
  const { t } = useTranslation()
  const [state, setState] = useState<{
    chainId: string
    msgs: UnifiedCosmosMsg[]
  }>()
  const close = useCallback(() => setState(undefined), [])

  const [fullScreen, setFullScreen] = useState(false)

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

    setState({
      chainId: signDoc.chainId,
      msgs: messages,
    })
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

    setState({
      chainId: signDoc.chain_id,
      msgs: messages,
    })
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
      // addChain: async (record: ChainRecord) => {
      //   await wallet.client?.addChain?.(record)
      //   return {
      //     type: 'success',
      //   }
      // },
      sign: () => ({
        type: 'error',
        value: 'Unsupported.',
      }),
      signArbitrary: () => ({
        type: 'error',
        value: 'Unsupported.',
      }),
      suggestToken: () => ({
        type: 'success',
      }),
      connect: async (_chainIds: string | string[]) => {
        const chainIds = [_chainIds].flat()
        const allChainWallets = wallet.getChainWalletList(false)
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

  return (
    <>
      <AppsRenderer
        fullScreen={fullScreen}
        iframeRef={iframeRef}
        setFullScreen={setFullScreen}
      />

      {state && (
        <ChainProvider chainId={state.chainId}>
          <ActionMatcherProvider messages={state.msgs}>
            <InnerProfileApps close={close} />
          </ActionMatcherProvider>
        </ChainProvider>
      )}
    </>
  )
}

type InnerProfileAppsMatcherProps = {
  close: () => void
  actionKeysAndData: ActionKeyAndData[]
}

const InnerProfileApps = (
  props: Omit<InnerProfileAppsMatcherProps, 'actionKeysAndData'>
) => {
  const matcher = useActionMatcher()
  const data = useLoadingPromise({
    promise: async () =>
      matcher.ready
        ? Promise.all(
            matcher.matches.map(
              async (decoder, index): Promise<ActionKeyAndData> => ({
                _id: index.toString(),
                actionKey: decoder.action.key,
                data: await decoder.decode(),
              })
            )
          )
        : ([] as ActionKeyAndData[]),
    deps: [matcher.status],
  })

  return data.loading ? (
    <div className="flex flex-col gap-2">
      <ActionCardLoader />
      <ActionCardLoader />
      <ActionCardLoader />
    </div>
  ) : data.errored ? (
    <ErrorPage error={data.error} />
  ) : (
    <InnerProfileAppsMatcher {...props} actionKeysAndData={data.data} />
  )
}

const InnerProfileAppsMatcher = ({
  close,
  actionKeysAndData,
}: InnerProfileAppsMatcherProps) => {
  const { t } = useTranslation()
  const { connected, profile } = useProfile()
  const { chainId } = useChain()

  // Initialized as false, and set to true once transaction atom is set. This
  // tells us to stop loading and show the actions in the modal.
  const [ready, setReady] = useState(false)
  const setWalletTransactionAtom = useSetRecoilState(meTransactionAtom(chainId))

  // Set transaction atom once actions are loaded.
  useEffect(() => {
    setWalletTransactionAtom({
      actions: actionKeysAndData,
    })
    setReady(true)
  }, [chainId, actionKeysAndData, setWalletTransactionAtom])

  return (
    <Modal
      backdropClassName="!z-[39]"
      containerClassName="sm:!max-w-[min(90dvw,64rem)] !w-full"
      footerContainerClassName="flex flex-row justify-end"
      footerContent={
        connected ? (
          <>
            <div className="flex min-w-0 flex-row items-center gap-2">
              {/* Image */}
              <ProfileImage
                imageUrl={profile.loading ? undefined : profile.data.imageUrl}
                loading={profile.loading}
                size="sm"
              />

              {/* Name */}
              <ProfileNameDisplayAndEditor profile={profile} />
            </div>
          </>
        ) : (
          <ConnectWallet size="md" />
        )
      }
      header={{
        title: t('title.reviewTransaction'),
      }}
      onClose={close}
      visible
    >
      {ready ? (
        <ProfileActions />
      ) : (
        <div className="flex flex-col gap-2">
          <ActionCardLoader />
          <ActionCardLoader />
          <ActionCardLoader />
        </div>
      )}
    </Modal>
  )
}
