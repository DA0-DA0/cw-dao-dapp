import { Add } from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentType, Fragment, useRef, useState } from 'react'
import { CSVLink } from 'react-csv'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  ButtonLinkProps,
  LoadingDataWithError,
  StatefulDaoMemberCardProps,
  StatefulEntityDisplayProps,
  TypedOption,
} from '@dao-dao/types'

import { useQuerySyncedState } from '../../../hooks'
import { Button } from '../../buttons'
import { ErrorPage } from '../../error'
import { GridCardContainer } from '../../GridCardContainer'
import { Dropdown } from '../../inputs/Dropdown'
import { Loader } from '../../logo'
import { PAGINATION_MIN_PAGE, Pagination } from '../../Pagination'
import { Tooltip } from '../../tooltip'
import { TooltipInfoIcon } from '../../tooltip/TooltipInfoIcon'
import { VotingPowerDistribution } from '../../VotingPowerDistribution'

export interface MembersTabProps {
  DaoMemberCard: ComponentType<StatefulDaoMemberCardProps>
  members: LoadingDataWithError<StatefulDaoMemberCardProps[]>
  /**
   * URL to add a new member. Probably a prefilled proposal URL.
   */
  addMemberHref?: string
  /**
   * If the add member URL is set, then the button will be shown. If not a
   * member, the button will disabled but still visible.
   */
  isMember?: boolean
  ButtonLink: ComponentType<ButtonLinkProps>
  // If defined, will show the top voter distribution.
  topVoters:
    | {
        show: true
        EntityDisplay: ComponentType<StatefulEntityDisplayProps>
      }
    | {
        show: false
      }
}

// Store absolutes as negative numbers and percentages as positive numbers.
enum TopStakerState {
  TenAbsolute = -10,
  TenPercent = 10,
  TwentyPercent = 20,
  All = 100,
}

const MEMBERS_PER_PAGE = 100

export const MembersTab = ({
  DaoMemberCard,
  members,
  isMember,
  addMemberHref,
  ButtonLink,
  topVoters,
}: MembersTabProps) => {
  const { t } = useTranslation()

  const csvLinkRef = useRef<HTMLAnchorElement>()

  const [membersPage, setMembersPage] = useQuerySyncedState({
    param: 'mp',
    defaultValue: PAGINATION_MIN_PAGE,
  })

  const [topStakerState, setTopStakerState] = useState(
    TopStakerState.TenAbsolute
  )
  const topStakerStateOptions: TypedOption<TopStakerState>[] = [
    {
      label: t('title.topAbsolute', { count: -TopStakerState.TenAbsolute }),
      value: TopStakerState.TenAbsolute,
    },
    {
      label: t('title.topPercent', { percent: TopStakerState.TenPercent }),
      value: TopStakerState.TenPercent,
    },
    {
      label: t('title.topPercent', { percent: TopStakerState.TwentyPercent }),
      value: TopStakerState.TwentyPercent,
    },
    {
      label: t('title.all'),
      value: TopStakerState.All,
    },
  ]
  const topStakerStateOption = topStakerStateOptions.find(
    (option) => option.value === topStakerState
  )

  // If anyone's voting power is still loading, can't yet show the top members.
  const sortedMembers =
    members.loading || members.errored
      ? []
      : members.data.some((member) => member.votingPowerPercent.loading)
        ? []
        : members.data.sort(
            (a, b) =>
              (b.votingPowerPercent.loading ? 0 : b.votingPowerPercent.data) -
              (a.votingPowerPercent.loading ? 0 : a.votingPowerPercent.data)
          )

  // Get members that hold the top voting power.
  const topMemberUpperIndex =
    topStakerState < 0
      ? -topStakerState
      : sortedMembers.reduce(
          (acc, member, index) => ({
            total:
              acc.total +
              (member.votingPowerPercent.loading
                ? 0
                : member.votingPowerPercent.data),
            // If the current total is past the top x%, keep the index the same. This
            // index is the index of the last member in the top x% of voting power.
            index: acc.total >= topStakerState ? acc.index : index,
          }),
          { total: 0, index: 0 }
        ).index + 1

  const topMembers = sortedMembers.slice(0, topMemberUpperIndex)
  const topMembersVotingPowerPercent = topMembers.reduce(
    (acc, member) =>
      acc +
      (member.votingPowerPercent.loading ? 0 : member.votingPowerPercent.data),
    0
  )
  const otherVotingPowerPercent =
    members.loading || members.errored
      ? 0
      : members.data
          .slice(topMemberUpperIndex)
          .reduce(
            (acc, member) =>
              acc +
              (member.votingPowerPercent.loading
                ? 0
                : member.votingPowerPercent.data),
            0
          )

  return (
    <>
      {/* header min-height of 3.5rem standardized across all tabs */}
      {addMemberHref && (
        <div className="mb-6 flex min-h-[3.5rem] flex-row items-center justify-between gap-6 border-b border-b-border-secondary pb-6">
          <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <p className="title-text text-text-body">{t('title.newMember')}</p>
            <p className="secondary-text">{t('info.newMemberExplanation')}</p>
          </div>

          <Tooltip title={t('error.mustBeMemberToAddMember')}>
            <ButtonLink
              className="shrink-0"
              disabled={!isMember}
              href={addMemberHref}
            >
              <Add className="!h-4 !w-4" />
              <span className="hidden md:inline">{t('button.addMembers')}</span>
              <span className="md:hidden">{t('button.add')}</span>
            </ButtonLink>
          </Tooltip>
        </div>
      )}

      <div
        className={clsx(
          'pb-6',
          // header min-height of 3.5rem standardized across all tabs if add
          // members header is not showing at the top
          !addMemberHref && 'flex min-h-[3.5rem] flex-row items-center'
        )}
      >
        <p className="title-text text-text-body">
          {members.loading || members.errored
            ? t('title.members')
            : t('title.numMembers', { count: members.data.length })}
        </p>
      </div>

      {topVoters.show && topMembers.length > 0 && (
        <div className="mb-6 flex flex-col items-stretch rounded-lg bg-background-tertiary">
          <div className="flex grow flex-col gap-2 overflow-hidden p-6">
            <div className="mb-4 flex flex-row items-stretch justify-between gap-4">
              <div className="flex flex-row items-center gap-2">
                <p className="primary-text text-text-body">
                  {t('title.whoControlsDaoQuestion')}
                </p>

                <TooltipInfoIcon
                  size="sm"
                  title={t('info.percentagesRepresentVotingPower')}
                />
              </div>

              <Dropdown
                onSelect={setTopStakerState}
                options={topStakerStateOptions}
                selected={topStakerState}
              />
            </div>

            <VotingPowerDistribution
              EntityDisplay={topVoters.EntityDisplay}
              data={[
                ...topMembers,
                ...(topMembersVotingPowerPercent > 0
                  ? [
                      {
                        label: topStakerStateOption?.label ?? t('title.total'),
                        votingPowerPercent: topMembersVotingPowerPercent,
                        section: 2,
                        color: 'var(--text-tertiary)',
                      },
                    ]
                  : []),
                ...(otherVotingPowerPercent > 0
                  ? [
                      {
                        label: t('title.otherMembers'),
                        votingPowerPercent: otherVotingPowerPercent,
                        section: 2,
                        color: 'var(--text-interactive-disabled)',
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      )}

      {members.loading ? (
        <Loader />
      ) : members.errored ? (
        <ErrorPage error={members.error} />
      ) : members.data.length ? (
        <>
          <GridCardContainer className="xl:grid-cols-4">
            {members.data
              .slice(
                (membersPage - 1) * MEMBERS_PER_PAGE,
                membersPage * MEMBERS_PER_PAGE
              )
              .map((props, index) => (
                <DaoMemberCard {...props} key={index} />
              ))}
          </GridCardContainer>

          <Pagination
            className="mx-auto mt-12"
            page={membersPage}
            pageSize={MEMBERS_PER_PAGE}
            setPage={setMembersPage}
            total={members.data.length}
          />
        </>
      ) : (
        <p className="secondary-text">{t('error.noMembers')}</p>
      )}

      {!members.loading && !members.errored && members.data.length > 0 && (
        <>
          <Button
            className="caption-text mt-6 italic"
            disabled={false}
            onClick={() => csvLinkRef.current?.click()}
            variant="none"
          >
            {t('button.downloadMembersCsv')}
          </Button>

          <CSVLink
            className="hidden"
            data={[
              [
                'Member',
                members.data.length
                  ? members.data[0].balanceLabel +
                    (!members.data[0].balance.loading &&
                    members.data[0].balance.data.token
                      ? ` (${members.data[0].balance.data.token.symbol})`
                      : '')
                  : 'Balance',
                'Voting power',
              ],
              ...members.data.map(
                ({ address, balance, votingPowerPercent }) => [
                  address,
                  balance.loading
                    ? '...'
                    : HugeDecimal.from(
                        balance.data.amount
                      ).toHumanReadableString(
                        balance.data.token?.decimals ?? 0
                      ),
                  votingPowerPercent.loading ? '...' : votingPowerPercent.data,
                ]
              ),
            ]}
            filename="members.csv"
            ref={(ref: any) => (csvLinkRef.current = ref?.link ?? undefined)}
          />
        </>
      )}
    </>
  )
}
