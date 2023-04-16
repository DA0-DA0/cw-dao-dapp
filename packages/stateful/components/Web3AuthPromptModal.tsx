import { SignData } from '@noahsaso/cosmodal/dist/wallets/web3auth/types'
import { TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ActionsRenderer,
  Button,
  CosmosMessageDisplay,
  Modal,
} from '@dao-dao/stateless'
import { CategorizedActionAndData } from '@dao-dao/types'
import { decodeMessages, protobufToCwMsg } from '@dao-dao/utils'

import { useActionsForMatching } from '../actions'
import { WalletActionsProvider } from '../actions/react/provider'
import { SuspenseLoader } from './SuspenseLoader'

type Web3AuthPromptModalProps = {
  signData?: SignData
  resolve?: (value: boolean) => void
}

export const Web3AuthPromptModal = ({
  signData,
  resolve,
}: Web3AuthPromptModalProps) => {
  const { t } = useTranslation()

  const decoded = useMemo(() => {
    if (!signData) {
      return
    }

    if (signData.type === 'direct') {
      const messages = decodeMessages(
        TxBody.decode(signData.value.bodyBytes).messages.map(
          (msg) => protobufToCwMsg(msg).msg
        )
      )

      return {
        type: 'cw' as const,
        messages,
      }
    } else if (signData.type === 'amino') {
      return {
        type: 'amino' as const,
        messages: signData.value.msgs,
      }
    }
  }, [signData])

  // Re-create when messages change so that hooks are called in the same order.
  const WalletActionsRenderer = useMemo(
    () =>
      makeWalletActionsRenderer(decoded?.type === 'cw' ? decoded.messages : []),
    [decoded]
  )

  return (
    <Modal
      containerClassName="!w-[48rem] !max-w-[90vw]"
      footerContainerClassName="flex flex-row gap-4 justify-between"
      footerContent={
        <>
          <Button
            center
            className="grow"
            onClick={() => resolve?.(false)}
            variant="secondary"
          >
            {t('button.reject')}
          </Button>

          <Button
            center
            className="grow"
            onClick={() => resolve?.(true)}
            variant="primary"
          >
            {t('button.approve')}
          </Button>
        </>
      }
      header={{
        title: t('title.reviewTransaction'),
      }}
      onClose={() => resolve?.(false)}
      visible={!!signData && !!resolve}
    >
      {decoded &&
        (decoded.type === 'cw' ? (
          <WalletActionsProvider>
            <WalletActionsRenderer />
          </WalletActionsProvider>
        ) : (
          <CosmosMessageDisplay
            value={JSON.stringify(decoded.messages, undefined, 2)}
          />
        ))}
    </Modal>
  )
}

const makeWalletActionsRenderer = (messages: Record<string, any>[]) =>
  function WalletActionsRenderer() {
    const { t } = useTranslation()
    const actionsForMatching = useActionsForMatching({ isCreating: false })

    // Call relevant action hooks in the same order every time.
    const actionData: CategorizedActionAndData[] = messages.map((message) => {
      const actionMatch = actionsForMatching
        .map(({ category, action }) => ({
          category,
          action,
          ...action.useDecodedCosmosMsg(message),
        }))
        .find(({ match }) => match)

      // There should always be a match since custom matches all. This should
      // never happen as long as the Custom action exists.
      if (!actionMatch?.match) {
        throw new Error(t('error.loadingData'))
      }

      return {
        category: actionMatch.category,
        action: actionMatch.action,
        data: actionMatch.data,
      }
    })

    return (
      <ActionsRenderer
        SuspenseLoader={SuspenseLoader}
        actionData={actionData}
        hideCopyLink
      />
    )
  }
