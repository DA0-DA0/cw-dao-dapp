import { DataObject } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  ActionCardLoader,
  ActionsMatchAndRender,
  Button,
  ProposalExecutionMetadataRenderer,
  RawActionsRenderer,
  useDao,
} from '@dao-dao/stateless'
import {
  ActionKeyAndData,
  BaseProposalInnerContentDisplayProps,
  ChainId,
  SingleChoiceNewProposalForm,
} from '@dao-dao/types'
import { Proposal } from '@dao-dao/types/contracts/CwProposalSingle.v1'
import { SingleChoiceProposal } from '@dao-dao/types/contracts/DaoProposalSingle.v2'
import {
  decodeMessages,
  extractProposalDescriptionAndMetadata,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { SuspenseLoader } from '../../../../components'
import { useLoadingProposal } from '../hooks'

export const ProposalInnerContentDisplay = (
  props: BaseProposalInnerContentDisplayProps<SingleChoiceNewProposalForm>
) => {
  const loadingProposal = useLoadingProposal()

  return (
    <SuspenseLoader
      fallback={<ActionCardLoader />}
      forceFallback={loadingProposal.loading}
    >
      {!loadingProposal.loading && (
        <InnerProposalInnerContentDisplay
          {...props}
          proposal={loadingProposal.data}
        />
      )}
    </SuspenseLoader>
  )
}

const InnerProposalInnerContentDisplay = ({
  setDuplicateFormData,
  proposal,
}: BaseProposalInnerContentDisplayProps<SingleChoiceNewProposalForm> & {
  proposal: Proposal | SingleChoiceProposal
}) => {
  const { t } = useTranslation()
  const [showRaw, setShowRaw] = useState(false)
  const { chainId } = useDao()

  const actionMessagesToDisplay = useMemo(() => {
    let messages = proposal.msgs
    const decodedMessages = decodeMessages(messages)

    // Unwrap `timelock_proposal` execute in Neutron SubDAOs.
    try {
      if (chainId === ChainId.NeutronMainnet) {
        if (
          decodedMessages.length === 1 &&
          objectMatchesStructure(decodedMessages[0], {
            wasm: {
              execute: {
                contract_addr: {},
                funds: {},
                msg: {
                  timelock_proposal: {
                    proposal_id: {},
                    msgs: {},
                  },
                },
              },
            },
          })
        ) {
          const innerDecoded = decodeMessages(
            decodedMessages[0].wasm.execute.msg.timelock_proposal.msgs
          )
          if (
            innerDecoded.length === 1 &&
            objectMatchesStructure(innerDecoded[0], {
              wasm: {
                execute: {
                  contract_addr: {},
                  funds: {},
                  msg: {
                    execute_timelocked_msgs: {
                      msgs: {},
                    },
                  },
                },
              },
            })
          ) {
            messages =
              innerDecoded[0].wasm.execute.msg.execute_timelocked_msgs.msgs
          }
        }
      }
    } catch (error) {
      console.error('Neutron timelock_proposal unwrap error', error)
    }

    return messages
  }, [chainId, proposal.msgs])

  const { description, metadata } = extractProposalDescriptionAndMetadata(
    proposal.description
  )

  const onLoad =
    setDuplicateFormData &&
    ((data: ActionKeyAndData[]) =>
      setDuplicateFormData({
        title: proposal.title,
        description,
        actionData: data,
        metadata: metadata && {
          enabled: true,
          ...metadata,
        },
      }))

  return (
    <div className="flex flex-col gap-3">
      {actionMessagesToDisplay.length ? (
        <>
          <ActionsMatchAndRender
            SuspenseLoader={SuspenseLoader}
            messages={actionMessagesToDisplay}
            onCopyLink={() => toast.success(t('info.copiedLinkToClipboard'))}
            onLoad={onLoad}
          />

          <Button
            className="self-start"
            onClick={() => setShowRaw((s) => !s)}
            variant="ghost"
          >
            <DataObject className="text-icon-secondary" />
            <p className="secondary-text">
              {showRaw ? t('button.hideRawData') : t('button.showRawData')}
            </p>
          </Button>

          {showRaw && <RawActionsRenderer messages={proposal.msgs} />}
        </>
      ) : (
        <p className="caption-text italic">{t('info.noProposalActions')}</p>
      )}

      <ProposalExecutionMetadataRenderer className="mt-3" metadata={metadata} />
    </div>
  )
}
