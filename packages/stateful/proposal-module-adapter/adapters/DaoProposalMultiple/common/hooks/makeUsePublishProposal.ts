import { coins } from '@cosmjs/stargate'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import { Cw20BaseSelectors, nativeDenomBalanceSelector } from '@dao-dao/state'
import { useCachedLoadable } from '@dao-dao/stateless'
import { Feature } from '@dao-dao/types'
import {
  MAX_NUM_PROPOSAL_CHOICES,
  checkProposalSubmissionPolicy,
  expirationExpired,
  processError,
} from '@dao-dao/utils'

import {
  Cw20BaseHooks,
  useAwaitNextBlock,
  useMembership,
  useSimulateCosmosMsgs,
  useWallet,
} from '../../../../../hooks'
import {
  MakeUsePublishProposalOptions,
  NewProposalData,
  PublishProposal,
  SimulateProposal,
  UsePublishProposal,
} from '../../types'

export const makeUsePublishProposal =
  ({
    proposalModule,
    depositInfoSelector,
  }: MakeUsePublishProposalOptions): UsePublishProposal =>
  () => {
    const { t } = useTranslation()
    const {
      dao: { chainId, coreAddress },
      prePropose,
    } = proposalModule
    const {
      isWalletConnected,
      address: walletAddress,
      getSigningClient,
      refreshBalances,
    } = useWallet()
    const { isMember = false } = useMembership()

    const depositInfo = useRecoilValueLoadable(depositInfoSelector)
    const depositInfoCw20TokenAddress =
      depositInfo.state === 'hasValue' &&
      depositInfo.contents?.denom &&
      'cw20' in depositInfo.contents.denom
        ? depositInfo.contents.denom.cw20
        : undefined
    const depositInfoNativeTokenDenom =
      depositInfo.state === 'hasValue' &&
      depositInfo.contents?.denom &&
      'native' in depositInfo.contents.denom
        ? depositInfo.contents.denom.native
        : undefined
    const requiredProposalDeposit = HugeDecimal.from(
      depositInfo.valueMaybe()?.amount ?? 0
    )

    // For checking allowance and increasing if necessary.
    const cw20DepositTokenAllowanceResponseLoadable = useCachedLoadable(
      depositInfoCw20TokenAddress &&
        requiredProposalDeposit.isPositive() &&
        walletAddress
        ? Cw20BaseSelectors.allowanceSelector({
            chainId,
            contractAddress: depositInfoCw20TokenAddress,
            params: [
              {
                owner: walletAddress,
                // If pre-propose address set, give that one deposit allowance
                // instead of proposal module.
                spender: prePropose?.address || proposalModule.address,
              },
            ],
          })
        : constSelector(undefined)
    )
    const cw20DepositTokenAllowanceResponse =
      cw20DepositTokenAllowanceResponseLoadable.state === 'hasValue'
        ? cw20DepositTokenAllowanceResponseLoadable.contents
        : undefined

    const cw20DepositTokenBalanceLoadable = useCachedLoadable(
      requiredProposalDeposit.isPositive() &&
        walletAddress &&
        depositInfoCw20TokenAddress
        ? Cw20BaseSelectors.balanceSelector({
            chainId,
            contractAddress: depositInfoCw20TokenAddress,
            params: [{ address: walletAddress }],
          })
        : constSelector(undefined)
    )
    const cw20DepositTokenBalance =
      cw20DepositTokenBalanceLoadable.state === 'hasValue'
        ? cw20DepositTokenBalanceLoadable.contents
        : undefined

    const nativeDepositTokenBalanceLoadable = useCachedLoadable(
      requiredProposalDeposit.isPositive() &&
        walletAddress &&
        depositInfoNativeTokenDenom
        ? nativeDenomBalanceSelector({
            chainId,
            walletAddress,
            denom: depositInfoNativeTokenDenom,
          })
        : constSelector(undefined)
    )
    const nativeDepositTokenBalance =
      nativeDepositTokenBalanceLoadable.state === 'hasValue'
        ? nativeDepositTokenBalanceLoadable.contents
        : undefined

    // True if deposit is needed and cannot be paid.
    const depositUnsatisfied =
      // Requires deposit.
      requiredProposalDeposit.isPositive() &&
      // Has cw20 deposit and insufficient balance.
      ((!!depositInfoCw20TokenAddress &&
        (!cw20DepositTokenBalance ||
          requiredProposalDeposit.gt(cw20DepositTokenBalance.balance))) ||
        // Has native deposit and insufficient balance.
        (!!depositInfoNativeTokenDenom &&
          (!nativeDepositTokenBalance ||
            requiredProposalDeposit.gt(nativeDepositTokenBalance.amount))))

    const increaseCw20DepositAllowance = Cw20BaseHooks.useIncreaseAllowance({
      contractAddress: depositInfoCw20TokenAddress ?? '',
      sender: walletAddress ?? '',
    })

    const awaitNextBlock = useAwaitNextBlock()
    const simulateMsgs = useSimulateCosmosMsgs(coreAddress)

    // If simulation fails and `failedSimulationBypassDuration` is defined,
    // allow bypassing for a period of time by setting this to a date in the
    // future.
    const [simulationBypassExpiration, setSimulationBypassExpiration] =
      useState<Date>()
    // Clear bypass expiration when it expires to trigger re-renders.
    useEffect(() => {
      if (simulationBypassExpiration) {
        const timeout = setTimeout(
          () => setSimulationBypassExpiration(undefined),
          simulationBypassExpiration.getTime() - Date.now()
        )
        return () => clearTimeout(timeout)
      }
    }, [simulationBypassExpiration])

    const simulateProposal: SimulateProposal = useCallback(
      async ({ choices }) => {
        try {
          if (!choices.options.filter((c) => c.msgs.length > 0)) {
            throw new Error(t('error.noActionsToSimulate'))
          }

          // Simulate each option's message set separately. If the DAO only has
          // 1 $JUNO, and two options both contain spending all 1 $JUNO, the
          // simulation will fail because the DAO does not have sufficient
          // funds. Combining all the messages into one simulation will function
          // like all messages are executed together, but in reality, only one
          // choice will be executed. Thus, just make sure each individual set
          // of messages is valid together.
          await Promise.all(
            choices.options.map(({ msgs }) => simulateMsgs(msgs))
          )

          toast.success(t('success.proposalSimulation'))
        } catch (err) {
          console.error(err)
          toast.error(processError(err, { forceCapture: false }))
        }
      },
      [simulateMsgs, t]
    )

    const cannotProposeReason = checkProposalSubmissionPolicy({
      proposalModule: proposalModule.info,
      address: walletAddress,
      isMember,
      t,
    })

    const publishProposal: PublishProposal = useCallback(
      async (data, { failedSimulationBypassSeconds = 0 } = {}) => {
        if (!isWalletConnected || !walletAddress) {
          throw new Error(t('error.logInToContinue'))
        }
        if (cannotProposeReason) {
          throw new Error(cannotProposeReason)
        }
        if (depositUnsatisfied) {
          throw new Error(t('error.notEnoughForDeposit'))
        }

        if (data.choices.options.length < 2) {
          throw new Error(t('error.tooFewChoices'))
        }

        if (data.choices.options.length > MAX_NUM_PROPOSAL_CHOICES) {
          throw new Error(
            t('error.tooManyChoices', { count: MAX_NUM_PROPOSAL_CHOICES })
          )
        }

        // Only simulate messages if any exist. Allow proposals without
        // messages. Also allow bypassing simulation check for a period of time.
        if (
          data.choices.options.filter((c) => c.msgs.length > 0) &&
          (!simulationBypassExpiration ||
            simulationBypassExpiration < new Date())
        ) {
          try {
            // Throws error if simulation fails, indicating invalid message.
            //
            // Simulate each option's message set separately. If the DAO only
            // has 1 $JUNO, and two options both contain spending all 1 $JUNO,
            // the simulation will fail because the DAO does not have sufficient
            // funds. Combining all the messages into one simulation will
            // function like all messages are executed together, but in reality,
            // only one choice will be executed. Thus, just make sure each
            // individual set of messages is valid together.
            await Promise.all(
              data.choices.options.map(({ msgs }) => simulateMsgs(msgs))
            )
          } catch (err) {
            // If failed simulation bypass duration is set, allow bypassing
            // simulation check for a period of time.
            if (failedSimulationBypassSeconds > 0) {
              setSimulationBypassExpiration(
                new Date(Date.now() + failedSimulationBypassSeconds * 1000)
              )
            }

            throw new Error(
              `${t('error.simulationFailedInvalidProposalActions')} ${
                // Don't send to Sentry, but still format SDK errors nicely.
                processError(err, { forceCapture: false })
              }`
            )
          }
        }

        // Increase CW20 deposit token allowance if necessary.
        if (requiredProposalDeposit && depositInfoCw20TokenAddress) {
          // CW20 allowance response must be checked.
          if (!cw20DepositTokenAllowanceResponse) {
            throw new Error(t('error.loadingData'))
          }

          const remainingAllowanceNeeded = requiredProposalDeposit.minus(
            // If allowance expired, none.
            expirationExpired(
              cw20DepositTokenAllowanceResponse.expires,
              (await (await getSigningClient()).getBlock()).header.height
            )
              ? 0
              : cw20DepositTokenAllowanceResponse.allowance
          )

          // Request to increase the contract's allowance for the proposal
          // deposit if needed.
          if (remainingAllowanceNeeded.isPositive()) {
            try {
              await increaseCw20DepositAllowance({
                amount: remainingAllowanceNeeded.toString(),
                spender:
                  // If pre-propose address set, give that one deposit allowance
                  // instead of proposal module.
                  prePropose?.address || proposalModule.address,
              })

              // Allowances will not update until the next block has been added.
              awaitNextBlock().then(refreshBalances)
            } catch (err) {
              throw new Error(
                `Failed to increase allowance to pay proposal deposit: (${processError(
                  err,
                  // Don't send to Sentry, but still format SDK errors nicely.
                  { forceCapture: false }
                )})`
              )
            }
          }
        }

        // Native token deposit if exists.
        const proposeFunds =
          requiredProposalDeposit && depositInfoNativeTokenDenom
            ? coins(
                requiredProposalDeposit.toString(),
                depositInfoNativeTokenDenom
              )
            : undefined

        // Recreate form data with just the expected fields to remove any fields
        // added by other proposal module forms.
        const proposalData: NewProposalData = {
          title: data.title,
          description: data.description,
          choices: data.choices,
        }

        const response = await proposalModule.propose({
          data: proposalData,
          vote:
            isMember &&
            proposalModule.supports(Feature.CastVoteOnProposalCreation)
              ? data.vote
              : undefined,
          getSigningClient,
          sender: walletAddress,
          funds: proposeFunds,
        })

        if (proposeFunds?.length) {
          refreshBalances()
        }

        return response
      },
      [
        isWalletConnected,
        walletAddress,
        cannotProposeReason,
        depositUnsatisfied,
        simulationBypassExpiration,
        requiredProposalDeposit,
        depositInfoCw20TokenAddress,
        depositInfoNativeTokenDenom,
        isMember,
        getSigningClient,
        t,
        simulateMsgs,
        cw20DepositTokenAllowanceResponse,
        increaseCw20DepositAllowance,
        prePropose?.address,
        awaitNextBlock,
        refreshBalances,
      ]
    )

    return {
      simulateProposal,
      publishProposal,
      cannotProposeReason,
      depositUnsatisfied,
      simulationBypassExpiration,
    }
  }
