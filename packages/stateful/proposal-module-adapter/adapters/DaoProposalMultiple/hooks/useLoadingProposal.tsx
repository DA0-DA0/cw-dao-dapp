import { useTranslation } from 'react-i18next'
import TimeAgo from 'react-timeago'

import {
  DaoProposalMultipleSelectors,
  blockHeightSelector,
  blocksPerYearSelector,
} from '@dao-dao/state'
import {
  useCachedLoadable,
  useCachedLoading,
  useTranslatedTimeDeltaFormatter,
} from '@dao-dao/stateless'
import {
  LoadingData,
  ProposalStatusEnum,
  ProposalTimestampInfo,
} from '@dao-dao/types'
import {
  convertExpirationToDate,
  formatDate,
  formatDateTimeTz,
} from '@dao-dao/utils'

import { useProposalModuleAdapterOptions } from '../../../react'
import { ProposalWithMetadata } from '../types'

// Returns a proposal wrapped in a LoadingData object to allow the UI to respond
// to its loading state.
export const useLoadingProposal = (): LoadingData<ProposalWithMetadata> => {
  const { t } = useTranslation()
  const {
    proposalModule: { address: proposalModuleAddress },
    proposalNumber,
    chain: { chainId },
  } = useProposalModuleAdapterOptions()

  const loadingProposalResponse = useCachedLoading(
    DaoProposalMultipleSelectors.proposalSelector({
      contractAddress: proposalModuleAddress,
      chainId,
      params: [
        {
          proposalId: proposalNumber,
        },
      ],
    }),
    undefined,
    // If proposal undefined (due to a selector error), an error will be thrown.
    () => {
      throw new Error(t('error.loadingData'))
    }
  )

  const timeAgoFormatter = useTranslatedTimeDeltaFormatter({ words: false })

  const blocksPerYearLoadable = useCachedLoadable(
    blocksPerYearSelector({
      chainId,
    })
  )
  const blockHeightLoadable = useCachedLoadable(
    blockHeightSelector({
      chainId,
    })
  )
  // Since an error will be thrown on a selector error, this .data check is just
  // a typecheck. It will not return loading forever if the selector fails.
  if (
    loadingProposalResponse.loading ||
    !loadingProposalResponse.data ||
    blocksPerYearLoadable.state !== 'hasValue' ||
    blockHeightLoadable.state !== 'hasValue'
  ) {
    return { loading: true }
  }

  // Indexer may provide dates.
  const { proposal, completedAt, executedAt, closedAt } =
    loadingProposalResponse.data

  const expirationDate = convertExpirationToDate(
    blocksPerYearLoadable.contents,
    proposal.expiration,
    blockHeightLoadable.contents
  )

  const vetoTimelockExpiration =
    typeof proposal.status === 'object' && 'veto_timelock' in proposal.status
      ? convertExpirationToDate(
          blocksPerYearLoadable.contents,
          proposal.status.veto_timelock.expiration,
          blockHeightLoadable.contents
        )
      : undefined

  // Votes can be cast up to the expiration date, even if the decision has
  // finalized due to sufficient votes cast.
  const votingOpen =
    // `expirationDate` will be undefined if expiration is set to never, which
    // the contract does not allow, so this is just a typecheck.
    expirationDate
      ? expirationDate.getTime() > Date.now()
      : proposal.status === ProposalStatusEnum.Open

  const completionDate =
    typeof completedAt === 'string' && new Date(completedAt)
  const executionDate = typeof executedAt === 'string' && new Date(executedAt)
  const closeDate = typeof closedAt === 'string' && new Date(closedAt)

  const dateDisplay: ProposalTimestampInfo['display'] | undefined = votingOpen
    ? expirationDate && expirationDate.getTime() > Date.now()
      ? {
          label: vetoTimelockExpiration
            ? t('title.votingTimeLeft')
            : t('title.timeLeft'),
          tooltip: formatDateTimeTz(expirationDate),
          content: (
            <TimeAgo date={expirationDate} formatter={timeAgoFormatter} />
          ),
        }
      : 'at_height' in proposal.expiration &&
          proposal.expiration.at_height > blockHeightLoadable.contents
        ? {
            label: t('title.votingEndBlock'),
            tooltip: t('info.votingEndBlockTooltip'),
            content: BigInt(proposal.expiration.at_height).toLocaleString(),
          }
        : undefined
    : executionDate
      ? {
          label: t('proposalStatusTitle.executed'),
          tooltip: formatDateTimeTz(executionDate),
          content: formatDate(executionDate),
        }
      : closeDate
        ? {
            label: t('proposalStatusTitle.closed'),
            tooltip: formatDateTimeTz(closeDate),
            content: formatDate(closeDate),
          }
        : completionDate
          ? {
              label: t('info.completed'),
              tooltip: formatDateTimeTz(completionDate),
              content: formatDate(completionDate),
            }
          : expirationDate
            ? {
                label:
                  // If voting is closed, expiration should not be in the future, but
                  // just in case...
                  expirationDate.getTime() > Date.now()
                    ? t('title.expires')
                    : t('title.completed'),
                tooltip: formatDateTimeTz(expirationDate),
                content: formatDate(expirationDate),
              }
            : 'at_height' in proposal.expiration
              ? {
                  label: t('title.blockCompleted'),
                  tooltip: t('info.votingEndedBlockTooltip'),
                  content: BigInt(
                    proposal.expiration.at_height
                  ).toLocaleString(),
                }
              : undefined

  const timestampInfo: ProposalTimestampInfo = {
    display: dateDisplay,
    expirationDate,
  }

  return {
    loading: false,
    updating:
      !loadingProposalResponse.loading && loadingProposalResponse.updating,
    data: {
      ...proposal,
      timestampInfo,
      votingOpen,
      executedAt:
        typeof executedAt === 'string' ? new Date(executedAt) : undefined,
      vetoTimelockExpiration,
    },
  }
}
