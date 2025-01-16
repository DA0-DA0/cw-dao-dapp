import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  ProposalModuleAdapterBothProviders,
  ProposalModuleAdapterProvider,
  useProposalModuleAdapterContext,
} from '@dao-dao/stateful/proposal-module-adapter'
import {
  Popup,
  Proposal,
  ProposalNotFound,
  ProposalProps,
  ProposalVotesPrivate,
  useDao,
} from '@dao-dao/stateless'
import {
  CommonProposalInfo,
  DaoTabId,
  PreProposeModuleType,
  ProposalStatusEnum,
  SelfRelayExecuteModalProps,
} from '@dao-dao/types'
import { isSecretNetwork } from '@dao-dao/utils'

import { useOnCurrentDaoWebSocketMessage, useWallet } from '../../hooks'
import { useProposalModuleAdapterCommonContext } from '../../proposal-module-adapter/react/context'
import { PageHeaderContent } from '../PageHeaderContent'
import { SelfRelayExecuteModal } from '../SelfRelayExecuteModal'
import { DaoApproverProposalContentDisplay } from './DaoApproverProposalContentDisplay'
import { DaoProposalProps } from './DaoPageWrapper'
import { DaoPreProposeApprovalProposalContentDisplay } from './DaoPreProposeApprovalProposalContentDisplay'
import { DaoProposalContentDisplay } from './DaoProposalContentDisplay'

interface InnerDaoProposalProps {
  proposalInfo: CommonProposalInfo
}

const InnerDaoProposal = ({ proposalInfo }: InnerDaoProposalProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { address } = useWallet()

  const proposalModuleAdapterContext = useProposalModuleAdapterContext()
  const proposalModuleAdapterCommonContext =
    useProposalModuleAdapterCommonContext()

  const {
    options: { proposalModule, isPreProposeApprovalProposal },
    adapter: {
      components: {
        ProposalStatusAndInfo,
        ProposalVoter,
        PreProposeApprovalProposalStatusAndInfo,
        ProposalVoteTally,
        ProposalVotes,
      },
      hooks: { useProposalRefreshers, useLoadingWalletVoteInfo },
    },
  } = proposalModuleAdapterContext

  const { refreshProposalAndAll } = useProposalRefreshers()
  const loadingWalletVoteInfo = useLoadingWalletVoteInfo()
  const alreadyVoted =
    loadingWalletVoteInfo &&
    !loadingWalletVoteInfo.loading &&
    !!loadingWalletVoteInfo.data.vote
  const canVote =
    loadingWalletVoteInfo &&
    !loadingWalletVoteInfo.loading &&
    loadingWalletVoteInfo.data.canVote

  const [selfRelayExecuteProps, setSelfRelayExecuteProps] =
    useState<
      Pick<SelfRelayExecuteModalProps, 'uniqueId' | 'chainIds' | 'transaction'>
    >()

  const setVoteOpenRef = useRef<
    (Dispatch<SetStateAction<boolean>> | null) | null
  >(null)

  // Vote listener. Show alerts and refresh accordingly.
  const { listening: listeningForVote, fallback: onVoteSuccess } =
    useOnCurrentDaoWebSocketMessage(
      'vote',
      ({ proposalId, voter }) => {
        // If vote made on current proposal...
        if (proposalId === proposalInfo.id) {
          refreshProposalAndAll()

          // If the current user voted on current proposal, show a success
          // toast.
          if (voter === address) {
            toast.success(t('success.voteCast'))

            // Close vote popup in case it's open.
            setVoteOpenRef.current?.(false)
          }
        }
      },
      {
        proposalId: proposalInfo.id,
        voter: address,
      }
    )

  // Proposal status listener. Show alerts and refresh accordingly.
  const {
    listening: listeningForProposal,
    fallback: onProposalUpdateFallback,
  } = useOnCurrentDaoWebSocketMessage(
    'proposal',
    async ({ status, proposalId }, fallback) => {
      // If using self-relay execute, don't show toast or reload page until
      // manually called via fallback. Once the self-relay is complete, this
      // will be called manually to show the toast and reload the page.
      if (selfRelayExecuteProps && !fallback) {
        return
      }

      // If the current proposal updated...
      if (proposalId === proposalInfo.id) {
        refreshProposalAndAll()

        // On execute, revalidate and refresh page.
        if (status === ProposalStatusEnum.Executed) {
          // Show loading since page will reload shortly.
          toast.loading(t('success.proposalExecuted'))

          // Manually revalidate DAO static props.
          await fetch(
            `/api/revalidate?d=${dao.coreAddress}&p=${proposalInfo.id}`
          )

          // Refresh entire app since any DAO config may have changed.
          window.location.reload()
        }
        // On close, show success toast.
        else if (status === ProposalStatusEnum.Closed) {
          toast.success(t('success.proposalClosed'))
        }
        // On veto, show success toast.
        else if (status === ProposalStatusEnum.Vetoed) {
          toast.success(t('success.proposalVetoed'))
        }
        // On overrule, show success toast.
        else if (status === ProposalStatusEnum.NeutronOverruled) {
          toast.success(t('success.proposalOverruled'))
        }
      }
    }
  )

  // Fallback if the listener above is not listening.
  const onExecuteSuccess = useCallback(
    () =>
      onProposalUpdateFallback({
        status: ProposalStatusEnum.Executed,
        proposalId: proposalInfo.id,
      }),
    [onProposalUpdateFallback, proposalInfo.id]
  )

  // Fallback if the listener above is not listening.
  const onVetoSuccess = useCallback(
    () =>
      onProposalUpdateFallback({
        status: ProposalStatusEnum.Vetoed,
        proposalId: proposalInfo.id,
      }),
    [onProposalUpdateFallback, proposalInfo.id]
  )

  // Fallback if the listener above is not listening.
  const onCloseSuccess = useCallback(
    () =>
      onProposalUpdateFallback({
        status: ProposalStatusEnum.Closed,
        proposalId: proposalInfo.id,
      }),
    [onProposalUpdateFallback, proposalInfo.id]
  )

  // Fallback if both listeners above are offline, refresh every 30 seconds.
  useEffect(() => {
    if (listeningForVote || listeningForProposal) {
      return
    }

    const interval = setInterval(refreshProposalAndAll, 30 * 1000)
    return () => clearInterval(interval)
  }, [listeningForProposal, listeningForVote, refreshProposalAndAll])

  // Memoize ProposalStatusAndInfo so it doesn't re-render when the proposal
  // refreshes. The cached loadable it uses internally depends on the
  // component's consistency. If we inline the component definition in the props
  // below, it gets redefined on every render, and the hook cache is reset.
  const CachedProposalStatusAndInfo = useCallback(
    (props: ComponentProps<ProposalProps['ProposalStatusAndInfo']>) => (
      <ProposalStatusAndInfo
        {...props}
        onCloseSuccess={onCloseSuccess}
        onExecuteSuccess={onExecuteSuccess}
        onVetoSuccess={onVetoSuccess}
        openSelfRelayExecute={setSelfRelayExecuteProps}
        voter={{
          onVoteSuccess,
        }}
      />
    ),
    [
      ProposalStatusAndInfo,
      onCloseSuccess,
      onExecuteSuccess,
      onVetoSuccess,
      onVoteSuccess,
    ]
  )

  return (
    <>
      <PageHeaderContent
        breadcrumbs={{
          homeTab: {
            id: DaoTabId.Proposals,
            sdaLabel: t('title.proposals'),
          },
          current: `${t('title.proposal')} ${proposalInfo.id}`,
          dao,
        }}
        rightNode={
          canVote ? (
            <Popup
              popupClassName="min-w-56 max-w-lg p-3"
              position="left"
              setOpenRef={setVoteOpenRef}
              trigger={{
                type: 'button',
                props: {
                  className: 'animate-fade-in',
                  contentContainerClassName: 'text-base',
                  variant: 'brand_ghost',
                  children: alreadyVoted
                    ? t('button.changeVote')
                    : t('title.vote'),
                },
              }}
            >
              {/* Voter is rendered in page header outside of the current context, so this needs to be wrapped in another provider. */}
              <ProposalModuleAdapterBothProviders
                commonContext={proposalModuleAdapterCommonContext}
                context={proposalModuleAdapterContext}
              >
                <ProposalVoter onVoteSuccess={onVoteSuccess} />
              </ProposalModuleAdapterBothProviders>
            </Popup>
          ) : undefined
        }
      />

      <Proposal
        ProposalStatusAndInfo={
          isPreProposeApprovalProposal &&
          PreProposeApprovalProposalStatusAndInfo
            ? PreProposeApprovalProposalStatusAndInfo
            : CachedProposalStatusAndInfo
        }
        VotesCast={
          isPreProposeApprovalProposal
            ? undefined
            : isSecretNetwork(dao.chainId)
              ? ProposalVotesPrivate
              : ProposalVotes
        }
        contentDisplay={
          proposalModule.prePropose?.type === PreProposeModuleType.Approver ? (
            <DaoApproverProposalContentDisplay proposalInfo={proposalInfo} />
          ) : isPreProposeApprovalProposal ? (
            <DaoPreProposeApprovalProposalContentDisplay
              proposalInfo={proposalInfo}
            />
          ) : (
            <DaoProposalContentDisplay proposalInfo={proposalInfo} />
          )
        }
        voteTally={
          isPreProposeApprovalProposal ? undefined : <ProposalVoteTally />
        }
      />

      <SelfRelayExecuteModal
        // Placeholders that get overridden when the modal is opened.
        chainIds={[]}
        crossChainPackets={[]}
        transaction={{
          type: 'execute',
          msgs: [],
        }}
        uniqueId=""
        {...selfRelayExecuteProps}
        onClose={() => setSelfRelayExecuteProps(undefined)}
        onSuccess={() =>
          onProposalUpdateFallback(
            {
              status: ProposalStatusEnum.Executed,
              proposalId: proposalInfo.id,
            },
            // Force call the fallback, and don't wait for a block to pass.
            {
              onlyIfNotListening: false,
              skipWait: true,
            }
          )
        }
        visible={!!selfRelayExecuteProps}
      />
    </>
  )
}

export const DaoProposal = ({ proposalInfo }: DaoProposalProps) => {
  const dao = useDao()

  return proposalInfo ? (
    <ProposalModuleAdapterProvider
      key={
        // Make sure to refresh when the DAO or proposal ID changes. In case we
        // redirect to a proposal in the same DAO, this is necessary to refresh
        // for some reason.
        dao.coreAddress + proposalInfo.id
      }
      proposalId={proposalInfo.id}
    >
      <InnerDaoProposal proposalInfo={proposalInfo} />
    </ProposalModuleAdapterProvider>
  ) : (
    <ProposalNotFound PageHeaderContent={PageHeaderContent} />
  )
}
