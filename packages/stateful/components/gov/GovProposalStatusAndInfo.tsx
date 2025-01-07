import { EncodeObject } from '@cosmjs/proto-signing'
import {
  AccountCircleOutlined,
  AttachMoney,
  HourglassTopRounded,
  PaidOutlined,
  RotateRightOutlined,
} from '@mui/icons-material'
import clsx from 'clsx'
import { ComponentProps, ComponentType, useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import { genericTokenSelector } from '@dao-dao/state/recoil'
import {
  GOV_PROPOSAL_STATUS_I18N_KEY_MAP,
  Logo,
  NumericInput,
  ProposalStatusAndInfoProps,
  ProposalStatusAndInfo as StatelessProposalStatusAndInfo,
  Tooltip,
  useCachedLoading,
  useChain,
  useConfiguredChainContext,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import {
  GenericToken,
  GovProposalVersion,
  GovProposalWithMetadata,
  TokenType,
} from '@dao-dao/types'
import { ProposalStatus } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import { MsgDeposit } from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/tx'
import {
  CHAIN_GAS_MULTIPLIER,
  formatPercentOf100,
  getDisplayNameForChainId,
  processError,
} from '@dao-dao/utils'

import {
  useLoadingGovProposal,
  useRefreshGovProposals,
  useWallet,
} from '../../hooks'
import { ButtonLink } from '../ButtonLink'
import { EntityDisplay } from '../EntityDisplay'
import { SuspenseLoader } from '../SuspenseLoader'
import { GovProposalVoter } from './GovProposalVoter'

export type GovProposalStatusAndInfoProps = {
  inline?: boolean
  proposalId: string
}

export const GovProposalStatusAndInfo = (
  props: GovProposalStatusAndInfoProps
) => {
  const { chainId } = useChain()

  const loadingProposal = useLoadingGovProposal(props.proposalId)
  const depositToken = useCachedLoading(
    loadingProposal.loading
      ? undefined
      : genericTokenSelector({
          chainId,
          type: TokenType.Native,
          // Allow depositing first deposit token.
          denomOrAddress: loadingProposal.data.minDeposit[0].denom,
        }),
    undefined
  )

  return (
    <SuspenseLoader
      fallback={<InnerProposalStatusAndInfoLoader {...props} />}
      forceFallback={loadingProposal.loading}
    >
      {!loadingProposal.loading &&
        !depositToken.loading &&
        !!depositToken.data && (
          <InnerGovProposalStatusAndInfo
            {...props}
            depositToken={depositToken.data}
            proposal={loadingProposal.data}
          />
        )}
    </SuspenseLoader>
  )
}

const InnerGovProposalStatusAndInfo = ({
  proposal,
  depositToken,
  ...props
}: GovProposalStatusAndInfoProps & {
  proposal: GovProposalWithMetadata
  depositToken: GenericToken
}) => {
  const { t } = useTranslation()
  const {
    chain: { chainId },
    config: { name: chainConfigName },
  } = useConfiguredChainContext()
  const {
    isWalletConnected,
    address: walletAddress = '',
    getSigningStargateClient,
  } = useWallet()
  const { getDaoPath } = useDaoNavHelpers()

  const {
    id: proposalId,
    proposal: { status, totalDeposit },
    minDeposit,
    timestampInfo,
    votesInfo: {
      turnoutYesPercent,
      thresholdReached,
      quorumReached,
      vetoReached,
    },
  } = proposal

  const minDepositAmount = minDeposit.find(
    (d) => d.denom === depositToken.denomOrAddress
  )!.amount
  const currentDepositAmount = totalDeposit.find(
    (d) => d.denom === depositToken.denomOrAddress
  )!.amount

  const missingDeposit =
    HugeDecimal.from(minDepositAmount).minus(currentDepositAmount)

  const info: ProposalStatusAndInfoProps['info'] = [
    {
      Icon: (props) => <Logo {...props} />,
      label: t('title.dao'),
      Value: (props) => (
        <ButtonLink
          href={getDaoPath(chainConfigName)}
          variant="underline"
          {...props}
        >
          {getDisplayNameForChainId(chainId)}
        </ButtonLink>
      ),
    },
    ...(proposal.version === GovProposalVersion.V1 && proposal.proposal.proposer
      ? ([
          {
            Icon: AccountCircleOutlined,
            label: t('title.creator'),
            Value: (props) => (
              <EntityDisplay {...props} address={proposal.proposal.proposer} />
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
    {
      Icon: RotateRightOutlined,
      label: t('title.status'),
      Value: (props) => (
        <p {...props}>{t(GOV_PROPOSAL_STATUS_I18N_KEY_MAP[status])}</p>
      ),
    },
    {
      Icon: PaidOutlined,
      label: t('title.deposited'),
      Value: (props) => (
        <p {...props}>
          {t('format.token', {
            amount: HugeDecimal.from(
              currentDepositAmount
            ).toInternationalizedHumanReadableString({
              decimals: depositToken.decimals,
            }),
            symbol: depositToken.symbol,
          })}
        </p>
      ),
    },
    ...(timestampInfo.display
      ? ([
          {
            Icon: HourglassTopRounded,
            label: timestampInfo.display.label,
            Value: (props) => (
              <Tooltip title={timestampInfo.display!.tooltip}>
                <p {...props}>{timestampInfo.display!.content}</p>
              </Tooltip>
            ),
          },
        ] as ProposalStatusAndInfoProps['info'])
      : []),
  ]

  const statusText =
    status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD
      ? t('info.proposalStatus.depositPeriod')
      : status === ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD
        ? !quorumReached
          ? t('info.proposalStatus.willFailBadQuorum')
          : vetoReached
            ? t('info.proposalStatus.willVeto')
            : thresholdReached
              ? t('info.proposalStatus.willPass')
              : t('info.proposalStatus.willFailBadThreshold')
        : t('info.proposalStatus.govNotOpen', {
            turnoutYesPercent: formatPercentOf100(turnoutYesPercent),
          })

  const refreshProposal = useRefreshGovProposals()

  const [depositValue, setDepositValue] = useState(missingDeposit)
  const [depositing, setDepositing] = useState(false)
  const deposit = useCallback(async () => {
    if (!isWalletConnected) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setDepositing(true)
    try {
      const client = await getSigningStargateClient()

      const encodeObject: EncodeObject = {
        typeUrl: MsgDeposit.typeUrl,
        value: {
          proposalId,
          depositor: walletAddress,
          amount: depositValue.toCoins(depositToken.denomOrAddress),
        },
      }

      await client.signAndBroadcast(
        walletAddress,
        [encodeObject],
        CHAIN_GAS_MULTIPLIER
      )

      toast.success(
        t('success.deposited', {
          amount: depositValue.toInternationalizedHumanReadableString({
            decimals: depositToken.decimals,
          }),
          tokenSymbol: depositToken.symbol,
        })
      )
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      refreshProposal()
      setDepositing(false)
    }
  }, [
    depositToken.decimals,
    depositToken.denomOrAddress,
    depositToken.symbol,
    depositValue,
    getSigningStargateClient,
    isWalletConnected,
    proposalId,
    refreshProposal,
    t,
    walletAddress,
  ])

  const Voter = useCallback(
    (props: ComponentProps<Required<ProposalStatusAndInfoProps>['Voter']>) => (
      <GovProposalVoter {...props} proposalId={proposalId.toString()} />
    ),
    [proposalId]
  )

  return (
    <StatelessProposalStatusAndInfo
      {...props}
      Voter={
        status === ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD &&
        // Will be loading if not logged in. Only show if logged in.
        !proposal.walletVoteInfo.loading
          ? Voter
          : undefined
      }
      action={
        status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD
          ? {
              header: (
                <NumericInput
                  containerClassName="-mb-1"
                  max={missingDeposit.toHumanReadableString(
                    depositToken.decimals
                  )}
                  min={HugeDecimal.one.toHumanReadableNumber(
                    depositToken.decimals
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      deposit()
                    }
                  }}
                  setValue={(_, value) =>
                    setDepositValue(
                      HugeDecimal.fromHumanReadable(
                        value,
                        depositToken.decimals
                      )
                    )
                  }
                  step={HugeDecimal.one.toHumanReadableNumber(
                    depositToken.decimals
                  )}
                  unit={'$' + depositToken.symbol}
                  value={depositValue.toHumanReadableString(
                    depositToken.decimals
                  )}
                />
              ),
              label: t('button.deposit'),
              Icon: AttachMoney,
              loading: depositing,
              doAction: deposit,
            }
          : undefined
      }
      info={info}
      status={statusText}
    />
  )
}

const InnerProposalStatusAndInfoLoader = (
  props: GovProposalStatusAndInfoProps
) => {
  const { t } = useTranslation()
  const {
    config: { name },
    chain,
  } = useConfiguredChainContext()
  const { getDaoPath } = useDaoNavHelpers()

  const LoaderP: ComponentType<{ className: string }> = ({ className }) => (
    <p className={clsx('animate-pulse', className)}>...</p>
  )
  const info: ProposalStatusAndInfoProps['info'] = [
    {
      Icon: (props) => <Logo {...props} />,
      label: t('title.dao'),
      Value: (props) => (
        <ButtonLink href={getDaoPath(name)} variant="underline" {...props}>
          {getDisplayNameForChainId(chain.chainId)}
        </ButtonLink>
      ),
    },
    {
      Icon: AccountCircleOutlined,
      label: t('title.creator'),
      Value: LoaderP,
    },
    {
      Icon: RotateRightOutlined,
      label: t('title.status'),
      Value: LoaderP,
    },
    {
      Icon: HourglassTopRounded,
      label: t('title.date'),
      Value: LoaderP,
    },
  ]

  return (
    <StatelessProposalStatusAndInfo
      {...props}
      info={info}
      status={t('info.loading')}
    />
  )
}
