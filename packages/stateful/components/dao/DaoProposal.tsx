import { useWallet } from '@noahsaso/cosmodal'
import { ComponentProps, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilState } from 'recoil'

import { navigatingToHrefAtom } from '@dao-dao/state'
import {
  DaoProposalPageWrapperProps,
  ProfileDisconnectedCard,
  ProfileProposalCard,
  useAwaitNextBlock,
  useOnDaoWebSocketMessage,
  useWalletProfile,
} from '@dao-dao/stateful'
import { useCoreActions } from '@dao-dao/stateful/actions'
import {
  ProposalModuleAdapterProvider,
  useProposalModuleAdapterContext,
} from '@dao-dao/stateful/proposal-module-adapter'
import { useVotingModuleAdapter } from '@dao-dao/stateful/voting-module-adapter'
import {
  Proposal,
  ProposalNotFound,
  ProposalProps,
  useDaoInfo,
  useNavHelpers,
} from '@dao-dao/stateless'
import { ActionKey, CommonProposalInfo, CoreActionKey } from '@dao-dao/types'

interface InnerDaoProposalProps {
  proposalInfo: CommonProposalInfo
}

const InnerDaoProposal = ({ proposalInfo }: InnerDaoProposalProps) => {
  const { t } = useTranslation()
  const daoInfo = useDaoInfo()
  const { getDaoProposalPath, router } = useNavHelpers()
  const { connected, address } = useWallet()
  const {
    adapter: {
      components: {
        ProposalStatusAndInfo,
        ProposalActionDisplay,
        ProposalVoteTally,
        ProposalVotes,
      },
      hooks: { useProposalRefreshers },
    },
    common: {
      hooks: { useActions: useProposalModuleActions },
    },
  } = useProposalModuleAdapterContext()
  const {
    hooks: { useActions: useVotingModuleActions },
  } = useVotingModuleAdapter()

  const votingModuleActions = useVotingModuleActions()
  const proposalModuleActions = useProposalModuleActions()
  const actions = useCoreActions(
    useMemo(
      () => [...votingModuleActions, ...proposalModuleActions],
      [proposalModuleActions, votingModuleActions]
    )
  )

  const { profile: creatorProfile } = useWalletProfile({
    walletAddress: proposalInfo.createdByAddress,
  })

  // Ensure the last two actions are execute smart contract followed by
  // custom, since a lot of actions are smart contract executions, and custom
  // is a catch-all that will display any message. Do this by assigning values
  // and sorting the actions in ascending order.
  const orderedActions = useMemo(() => {
    const keyToValue = (key: ActionKey) =>
      key === CoreActionKey.Execute ? 1 : key === CoreActionKey.Custom ? 2 : 0

    return actions.sort((a, b) => {
      const aValue = keyToValue(a.key)
      const bValue = keyToValue(b.key)
      return aValue - bValue
    })
  }, [actions])

  const { refreshProposal, refreshProposalAndAll, refreshing } =
    useProposalRefreshers()

  const awaitNextBlock = useAwaitNextBlock()

  // On vote, refresh.
  const listeningForVote = useOnDaoWebSocketMessage(
    'vote',
    useCallback(
      ({ voter }) => {
        refreshProposalAndAll()

        // If the current user voted, show a success toast.
        if (voter === address) {
          toast.success(t('success.voteCast'))
        }
      },
      [address, refreshProposalAndAll, t]
    )
  )

  // Fallback if the listener above is offline when the vote happens.
  const onVoteSuccess = useCallback(async () => {
    // If listener is already listening, don't do anything here.
    if (listeningForVote) {
      return
    }

    // Wait a block for indexer to catch up.
    await awaitNextBlock()

    refreshProposalAndAll()
    toast.success(t('success.voteCast'))
  }, [awaitNextBlock, listeningForVote, refreshProposalAndAll, t])

  const onExecuteSuccess = useCallback(async () => {
    toast.loading(t('success.proposalExecuted'))

    // Wait a block for indexer to catch up.
    await awaitNextBlock()

    // Manually revalidate DAO static props. Don't await this promise since we
    // just want to tell the server to do it, and we're about to reload anyway.
    fetch(`/api/revalidate?d=${daoInfo.coreAddress}&p=${proposalInfo.id}`)

    // Refresh entire app since any DAO config may have changed.
    window.location.reload()
  }, [awaitNextBlock, daoInfo.coreAddress, proposalInfo.id, t])

  const onCloseSuccess = useCallback(async () => {
    // Wait a block for indexer to catch up.
    await awaitNextBlock()

    refreshProposalAndAll()
    toast.success(t('success.proposalClosed'))
  }, [awaitNextBlock, refreshProposalAndAll, t])

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
        onVoteSuccess={onVoteSuccess}
      />
    ),
    [ProposalStatusAndInfo, onCloseSuccess, onExecuteSuccess, onVoteSuccess]
  )

  const duplicateUrlPrefix = getDaoProposalPath(daoInfo.coreAddress, 'create', {
    prefill: '',
  })
  const [navigatingToHref, setNavigatingToHref] =
    useRecoilState(navigatingToHrefAtom)

  return (
    <Proposal
      ProposalStatusAndInfo={CachedProposalStatusAndInfo}
      actionDisplay={
        <ProposalActionDisplay
          availableActions={orderedActions}
          duplicateLoading={!!navigatingToHref?.startsWith(duplicateUrlPrefix)}
          onDuplicate={(data) => {
            const url =
              duplicateUrlPrefix + encodeURIComponent(JSON.stringify(data))
            router.push(url)
            // Show loading on duplicate button.
            setNavigatingToHref(url)
          }}
        />
      }
      creator={{
        name: creatorProfile.loading
          ? creatorProfile
          : {
              ...creatorProfile,
              data: creatorProfile.data.name,
            },
        address: proposalInfo.createdByAddress,
      }}
      onRefresh={refreshProposal}
      proposalInfo={proposalInfo}
      refreshing={refreshing}
      rightSidebarContent={
        connected ? <ProfileProposalCard /> : <ProfileDisconnectedCard />
      }
      voteTally={<ProposalVoteTally />}
      votesCast={<ProposalVotes />}
    />
  )
}

export const DaoProposal = ({
  proposalInfo,
  serializedInfo,
}: Pick<DaoProposalPageWrapperProps, 'proposalInfo' | 'serializedInfo'>) =>
  proposalInfo && serializedInfo ? (
    <ProposalModuleAdapterProvider
      initialOptions={{
        chainId: serializedInfo.chainId,
        coreAddress: serializedInfo.coreAddress,
      }}
      proposalId={proposalInfo.id}
      proposalModules={serializedInfo.proposalModules}
    >
      <InnerDaoProposal proposalInfo={proposalInfo} />
    </ProposalModuleAdapterProvider>
  ) : (
    <ProposalNotFound />
  )
