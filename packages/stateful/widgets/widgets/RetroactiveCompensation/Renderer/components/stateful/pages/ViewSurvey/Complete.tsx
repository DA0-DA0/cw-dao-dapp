import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { waitForAll } from 'recoil'

import { genericTokenWithUsdPriceSelector } from '@dao-dao/state/recoil'
import {
  Loader,
  useCachedLoadable,
  useChain,
  useDao,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import { TokenType, UnifiedCosmosMsg } from '@dao-dao/types'
import {
  makeBankMessage,
  makeWasmMessage,
  secp256k1PublicKeyToBech32Address,
} from '@dao-dao/utils'

import {
  EntityDisplay,
  ProposalList,
  SuspenseLoader,
} from '../../../../../../../../components'
import {
  useDaoProposalSinglePublishProposal,
  useEntity,
  useWallet,
} from '../../../../../../../../hooks'
import { NewProposalData } from '../../../../../../../../proposal-module-adapter/adapters/DaoProposalSingle/types'
import { usePostRequest } from '../../../../hooks/usePostRequest'
import { retroactiveCompensationQueries } from '../../../../queries'
import {
  CompleteRatings,
  Contribution,
  ContributionWithCompensation,
  Rating,
  RatingsResponse,
  RatingsResponseWithIdentities,
} from '../../../../types'
import { computeCompensation } from '../../../../utils'
import {
  ProposalCreationFormData,
  Complete as StatelessComplete,
} from '../../../stateless/pages/ViewSurvey/Complete'
import { ViewSurveyPageProps } from './types'

export const Complete = ({
  status,
  refreshRef,
  isMember,
}: ViewSurveyPageProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const { goToDaoProposal } = useDaoNavHelpers()
  const { chainId, bech32Prefix } = useChain()
  const { address: walletAddress = '' } = useWallet()
  const postRequest = usePostRequest()
  const queryClient = useQueryClient()

  const publishProposal = useDaoProposalSinglePublishProposal()

  const [weightByVotingPower, setWeightByVotingPower] = useState<boolean>(true)
  const [completeRatings, setCompleteRatings] = useState<CompleteRatings>()

  const [loadingRatings, setLoadingRatings] = useState(false)

  const [ratingsResponse, setRatingsResponse] =
    useState<RatingsResponseWithIdentities>()

  const updateProposalCreationFormData = useCallback(
    (response: RatingsResponseWithIdentities | undefined = ratingsResponse) => {
      if (!response) {
        return
      }

      const { contributions: _contributions, ratings } = response

      // Get max voting power so we can normalize weights.
      const maxVotingPower = ratings.length
        ? Math.max(...ratings.map((r) => Number(r.raterVotingPower)))
        : 0

      // Compute compensation.
      const compensationPerContribution = computeCompensation(
        _contributions.map(({ id }) => id),
        ratings.flatMap((rating) => {
          // Normalize a rater's ratings to be between 0 and 100, where 100 is
          // the highest score they gave. If they ranked everyone 20, then
          // they will all be normalized to 100.
          const maxPerAttribute = status.survey.attributes.map((_, index) =>
            Math.max(
              0,
              ...rating.contributions.map(
                ({ attributes }) => attributes[index] || 0
              )
            )
          )

          return rating.contributions.map(({ id, attributes }) => ({
            contributionId: id,
            // Normalize weights to prevent them from getting too large and
            // causing an overflow when summed together.
            weight: weightByVotingPower
              ? maxVotingPower === 0
                ? 0
                : Number(rating.raterVotingPower) / maxVotingPower
              : // Set weight to 1 if not weighting by voting power.
                1,
            attributes: attributes.map((attribute, i) =>
              attribute === null
                ? null
                : maxPerAttribute[i] === 0
                  ? 0
                  : (attribute / maxPerAttribute[i]) * 100
            ),
          }))
        }),
        status.survey.attributes
      )

      const contributions = _contributions.map(
        (c, index): ContributionWithCompensation => ({
          ...c,
          compensation: compensationPerContribution[index],
        })
      )

      const cosmosMsgs: UnifiedCosmosMsg[] = contributions.flatMap(
        ({ contributor, compensation }) =>
          compensation.compensationPerAttribute.flatMap(
            ({ nativeTokens, cw20Tokens }): UnifiedCosmosMsg[] => [
              ...nativeTokens
                .filter(({ amount }) => amount !== '0')
                .map(
                  ({ denomOrAddress, amount }): UnifiedCosmosMsg => ({
                    bank: makeBankMessage(
                      amount,
                      contributor.address,
                      denomOrAddress
                    ),
                  })
                ),
              ...cw20Tokens
                .filter(({ amount }) => amount !== '0')
                .map(
                  ({ denomOrAddress, amount }): UnifiedCosmosMsg =>
                    makeWasmMessage({
                      wasm: {
                        execute: {
                          contract_addr: denomOrAddress,
                          funds: [],
                          msg: {
                            transfer: {
                              recipient: contributor.address,
                              amount,
                            },
                          },
                        },
                      },
                    })
                ),
            ]
          )
      )

      const completeRatings: CompleteRatings = {
        contributions,
        ratings,
        cosmosMsgs,
      }

      setCompleteRatings(completeRatings)
    },
    [ratingsResponse, status.survey.attributes, weightByVotingPower]
  )

  const loadRatings = useCallback(async () => {
    setLoadingRatings(true)

    try {
      // Fetch ratings.
      const response: RatingsResponse = await postRequest(
        `/${dao.coreAddress}/${status.survey.uuid}/ratings`
      )

      // Get addresses for contributor and rater public keys.
      const [contributions, ratings] = await Promise.all([
        Promise.all(
          response.contributions.map(
            async ({
              contributor: publicKey,
              ...contribution
            }): Promise<Contribution> => {
              const address = await secp256k1PublicKeyToBech32Address(
                publicKey,
                bech32Prefix
              )

              return {
                ...contribution,
                contributor: {
                  publicKey,
                  address,
                },
              }
            }
          )
        ),
        Promise.all(
          response.ratings.map(
            async ({ rater: publicKey, ...rating }): Promise<Rating> => {
              const address = await secp256k1PublicKeyToBech32Address(
                publicKey,
                bech32Prefix
              )

              return {
                ...rating,
                rater: {
                  publicKey,
                  address,
                },
              }
            }
          )
        ),
      ])

      const responseWithIdentities: RatingsResponseWithIdentities = {
        contributions,
        ratings,
      }

      setRatingsResponse(responseWithIdentities)
      updateProposalCreationFormData(responseWithIdentities)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setLoadingRatings(false)
    }
  }, [
    postRequest,
    dao.coreAddress,
    status.survey.uuid,
    updateProposalCreationFormData,
    bech32Prefix,
  ])

  // If proposal creation form data is defined and weight by vote power changes,
  // recompute based on same ratings response.
  useEffect(() => {
    if (!completeRatings) {
      return
    }

    updateProposalCreationFormData()

    // Only update when weight by voting power changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightByVotingPower])

  const [completing, setCompleting] = useState(false)
  const onComplete = async (formData: ProposalCreationFormData) => {
    if (!completeRatings) {
      toast.error(t('error.loadingData'))
      return
    }
    if (!publishProposal) {
      toast.error(t('error.noSingleChoiceProposalModule'))
      return
    }

    setCompleting(true)

    try {
      let proposalId = ''
      if (formData.type === 'new') {
        // Propose.
        const proposalData: NewProposalData = {
          ...formData.newProposal,
          msgs: completeRatings.cosmosMsgs,
        }

        proposalId = (await publishProposal(proposalData)).proposalId
        toast.success(t('success.proposalCreatedCompleteCompensationCycle'))
      } else if (formData.type === 'existing') {
        proposalId = formData.existing
      }
      // 'none' will leave the proposal ID empty

      // Complete with proposal ID.
      await postRequest(`/${dao.coreAddress}/${status.survey.uuid}/complete`, {
        proposalId,
      })
      toast.success(
        t('success.compensationCycleCompleted', {
          context: proposalId ? 'withProposal' : 'noProposal',
        })
      )

      // Reload survey list on success and also individual survey.
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: retroactiveCompensationQueries.listSurveys(queryClient, {
            daoAddress: dao.coreAddress,
          }).queryKey,
        }),
        refreshRef.current(),
      ])

      // Navigate to proposal if set.
      if (proposalId) {
        goToDaoProposal(dao.coreAddress, proposalId)
        // Don't stop loading on success since we are now navigating.
      } else {
        setCompleting(false)
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : JSON.stringify(err))
      setCompleting(false)
    }
  }

  const tokenPrices = useCachedLoadable(
    waitForAll(
      status.survey.attributes.flatMap(({ nativeTokens, cw20Tokens }) => [
        ...nativeTokens.map(({ denom }) =>
          genericTokenWithUsdPriceSelector({
            chainId,
            type: TokenType.Native,
            denomOrAddress: denom,
          })
        ),
        ...cw20Tokens.map(({ address }) =>
          genericTokenWithUsdPriceSelector({
            chainId,
            type: TokenType.Cw20,
            denomOrAddress: address,
          })
        ),
      ])
    )
  )
  const { entity: walletEntity } = useEntity(walletAddress)

  return (
    <SuspenseLoader
      fallback={<Loader />}
      forceFallback={tokenPrices.state === 'loading'}
    >
      {tokenPrices.state === 'hasValue' && (
        <StatelessComplete
          EntityDisplay={EntityDisplay}
          ProposalList={ProposalList}
          canComplete={isMember}
          completeRatings={completeRatings}
          completing={completing}
          entity={walletEntity}
          loadRatings={loadRatings}
          loadingRatings={loadingRatings}
          onComplete={onComplete}
          setWeightByVotingPower={setWeightByVotingPower}
          status={status}
          tokenPrices={tokenPrices.contents}
          walletAddress={walletAddress}
          weightByVotingPower={weightByVotingPower}
        />
      )}
    </SuspenseLoader>
  )
}
