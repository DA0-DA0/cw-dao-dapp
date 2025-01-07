import { ArrowOutward, Dangerous, HowToVote } from '@mui/icons-material'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { usePlausible } from 'next-plausible'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  daoVotingSgCommunityNftExtraQueries,
  daoVotingSgCommunityNftQueries,
  indexerQueries,
} from '@dao-dao/state/query'
import { Button, useDao } from '@dao-dao/stateless'
import {
  BaseProfileCardMemberInfoProps,
  LoadingDataWithError,
  PlausibleEvents,
} from '@dao-dao/types'
import {
  CHAIN_GAS_MULTIPLIER,
  executeSmartContract,
  formatPercentOf100,
  processError,
} from '@dao-dao/utils'

import { ButtonLink } from '../../../../components/ButtonLink'
import {
  useAwaitNextBlock,
  useQueryLoadingDataWithError,
  useWallet,
} from '../../../../hooks'

export const ProfileCardMemberInfo = ({
  cantVoteOnProposal,
}: BaseProfileCardMemberInfoProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const {
    address: walletAddress = '',
    isWalletConnected,
    getSigningClient,
  } = useWallet()
  const queryClient = useQueryClient()
  const plausible = usePlausible<PlausibleEvents>()

  const loadingWalletHasNft = useQueryLoadingDataWithError({
    ...daoVotingSgCommunityNftExtraQueries.walletHasNft(queryClient, {
      chainId: dao.chainId,
      votingModuleAddress: dao.votingModule.address,
      walletAddress,
    }),
    enabled: !!walletAddress,
  })
  const loadingWalletRegistered = useQueryLoadingDataWithError({
    ...daoVotingSgCommunityNftQueries.registeredNft(queryClient, {
      chainId: dao.chainId,
      contractAddress: dao.votingModule.address,
      args: {
        address: walletAddress,
      },
    }),
    enabled: !!walletAddress,
  })

  const walletHasNoNft =
    !loadingWalletHasNft.loading &&
    (loadingWalletHasNft.errored || !loadingWalletHasNft.data)

  const votingPowerPercent = useQueries({
    queries: [
      dao.votingModule.getVotingPowerQuery(walletAddress),
      dao.votingModule.getTotalVotingPowerQuery(),
    ],
    combine: ([votingPower, totalPower]): LoadingDataWithError<number> => {
      if (votingPower.isError) {
        return {
          loading: false,
          errored: true,
          error: votingPower.error,
        }
      } else if (totalPower.isError) {
        return {
          loading: false,
          errored: true,
          error: totalPower.error,
        }
      }

      if (votingPower.isPending || totalPower.isPending) {
        return {
          loading: true,
          errored: false,
        }
      }

      return {
        loading: false,
        errored: false,
        updating: votingPower.isRefetching || totalPower.isRefetching,
        data:
          Number(totalPower.data.power) === 0
            ? 0
            : (Number(votingPower.data.power) / Number(totalPower.data.power)) *
              100,
      }
    },
  })

  const refreshState = useCallback(async () => {
    await Promise.all([
      // Refetch indexer query first.
      queryClient
        .refetchQueries({
          queryKey: indexerQueries.queryContract(queryClient, {
            chainId: dao.chainId,
            contractAddress: dao.votingModule.address,
            formula: 'daoVotingSgCommunityNft/votingPowerAtHeight',
            args: {
              address: walletAddress || '',
            },
          }).queryKey,
        })
        .finally(() =>
          queryClient.refetchQueries({
            queryKey:
              dao.votingModule.getVotingPowerQuery(walletAddress).queryKey,
          })
        ),

      // Invalidate indexer query first.
      queryClient
        .refetchQueries({
          queryKey: indexerQueries.queryContract(queryClient, {
            chainId: dao.chainId,
            contractAddress: dao.votingModule.address,
            formula: 'daoVotingSgCommunityNft/totalPowerAtHeight',
          }).queryKey,
        })
        .finally(() =>
          queryClient.refetchQueries({
            queryKey: dao.votingModule.getTotalVotingPowerQuery().queryKey,
          })
        ),

      queryClient.refetchQueries({
        queryKey: daoVotingSgCommunityNftExtraQueries.allVoters(queryClient, {
          chainId: dao.chainId,
          address: dao.votingModule.address,
        }).queryKey,
      }),

      // Refetch indexer query first.
      queryClient
        .refetchQueries({
          queryKey: indexerQueries.queryContract(queryClient, {
            chainId: dao.chainId,
            contractAddress: dao.votingModule.address,
            formula: 'daoVotingSgCommunityNft/registeredNft',
            args: {
              address: walletAddress || '',
            },
          }).queryKey,
        })
        .finally(() =>
          queryClient.refetchQueries({
            queryKey: daoVotingSgCommunityNftQueries.registeredNft(
              queryClient,
              {
                chainId: dao.chainId,
                contractAddress: dao.votingModule.address,
                args: {
                  address: walletAddress || '',
                },
              }
            ).queryKey,
          })
        ),
    ])
  }, [dao.chainId, dao.votingModule, queryClient, walletAddress])

  const awaitNextBlock = useAwaitNextBlock()

  const [loading, setLoading] = useState(false)

  const onRegister = useCallback(async () => {
    if (!isWalletConnected || !walletAddress) {
      return toast.error(t('error.logInToContinue'))
    }

    setLoading(true)
    try {
      await executeSmartContract(
        getSigningClient,
        walletAddress,
        dao.votingModule.address,
        {
          register: {},
        },
        undefined,
        CHAIN_GAS_MULTIPLIER
      )

      plausible('daoVotingStake', {
        props: {
          chainId: dao.chainId,
          dao: dao.coreAddress,
          walletAddress,
          votingModule: dao.votingModule.address,
          votingModuleType: dao.votingModule.contractName,
        },
      })

      // Voting power will not appear until the next block.
      await awaitNextBlock()

      // Wait for refresh to complete before displaying toast and stopping load.
      await refreshState()

      toast.success(t('success.registered'))
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setLoading(false)
    }
  }, [
    isWalletConnected,
    walletAddress,
    t,
    getSigningClient,
    dao.votingModule.address,
    dao.votingModule.contractName,
    dao.chainId,
    dao.coreAddress,
    plausible,
    awaitNextBlock,
    refreshState,
  ])

  const onUnregister = useCallback(async () => {
    if (!isWalletConnected || !walletAddress) {
      return toast.error(t('error.logInToContinue'))
    }

    setLoading(true)
    try {
      await executeSmartContract(
        getSigningClient,
        walletAddress,
        dao.votingModule.address,
        {
          unregister: {},
        },
        undefined,
        CHAIN_GAS_MULTIPLIER
      )

      plausible('daoVotingUnstake', {
        props: {
          chainId: dao.chainId,
          dao: dao.coreAddress,
          walletAddress,
          votingModule: dao.votingModule.address,
          votingModuleType: dao.votingModule.contractName,
        },
      })

      // Voting power will not appear until the next block.
      await awaitNextBlock()

      // Wait for refresh to complete before displaying toast and stopping load.
      await refreshState()

      toast.success(t('success.unregistered'))
    } catch (err) {
      console.error(err)
      toast.error(processError(err))
    } finally {
      setLoading(false)
    }
  }, [
    isWalletConnected,
    walletAddress,
    t,
    getSigningClient,
    dao.votingModule.address,
    dao.votingModule.contractName,
    dao.chainId,
    dao.coreAddress,
    plausible,
    awaitNextBlock,
    refreshState,
  ])

  // If the user visits the Stargaze Loyalty Program page, automatically refresh
  // to check if they acquired an NFT for 5 minutes.
  const [visitedStargazeLoyaltyProgram, setVisitedStargazeLoyaltyProgram] =
    useState<number | undefined>()
  useEffect(() => {
    if (!visitedStargazeLoyaltyProgram) {
      return
    }
    // Don't poll if the user has an NFT (meaning it's been detected).
    if (
      !loadingWalletHasNft.loading &&
      !loadingWalletHasNft.errored &&
      loadingWalletHasNft.data
    ) {
      setVisitedStargazeLoyaltyProgram(undefined)
      return
    }

    // Every 10 seconds, re-check if the user has an NFT.
    const interval = setInterval(() => {
      // cw721-base tokens query that the next query depends on
      queryClient.invalidateQueries({
        queryKey: [
          {
            method: 'tokens',
            args: {
              owner: walletAddress || '',
            },
          },
        ],
      })
      // query to check if wallet has NFT, depends on the above
      queryClient.invalidateQueries({
        queryKey: daoVotingSgCommunityNftExtraQueries.walletHasNft(
          queryClient,
          {
            chainId: dao.chainId,
            votingModuleAddress: dao.votingModule.address,
            walletAddress: walletAddress || '',
          }
        ).queryKey,
      })

      // If we've been polling for over 5 minutes, stop.
      if (Date.now() - visitedStargazeLoyaltyProgram > 5 * 60 * 1000) {
        setVisitedStargazeLoyaltyProgram(undefined)
      }
    }, 10 * 1000)

    return () => clearInterval(interval)
  }, [
    dao.chainId,
    dao.votingModule.address,
    loadingWalletHasNft,
    queryClient,
    visitedStargazeLoyaltyProgram,
    walletAddress,
    walletHasNoNft,
  ])

  return cantVoteOnProposal ? (
    <p className="caption-text">
      {t('info.notMemberForProposal', {
        daoName: dao.name,
      })}
    </p>
  ) : (
    <>
      <div className="body-text flex flex-row items-center justify-between">
        <p>{t('title.votingPower')}</p>
        <p
          className={clsx(
            'font-mono text-text-brand-secondary',
            votingPowerPercent.loading && 'animate-pulse'
          )}
        >
          {votingPowerPercent.loading
            ? '...'
            : votingPowerPercent.errored
              ? // eslint-disable-next-line i18next/no-literal-string
                '<error>'
              : formatPercentOf100(votingPowerPercent.data)}
        </p>
      </div>

      {!loadingWalletRegistered.loading && !loadingWalletRegistered.errored ? (
        loadingWalletRegistered.data.token_id ? (
          <Button
            center
            className="w-full mt-4"
            loading={
              loading ||
              votingPowerPercent.loading ||
              loadingWalletHasNft.loading
            }
            onClick={onUnregister}
            size="lg"
            variant="secondary"
          >
            {t('button.leaveDao')}
            <Dangerous className="!h-5 !w-5" />
          </Button>
        ) : walletHasNoNft ? (
          <ButtonLink
            center
            className="w-full mt-4"
            href="https://stargaze.zone"
            onClick={() => setVisitedStargazeLoyaltyProgram(Date.now())}
            size="lg"
            variant="brand"
            // eslint-disable-next-line i18next/no-literal-string
          >
            Stargaze Loyalty Program
            <ArrowOutward className="!h-5 !w-5" />
          </ButtonLink>
        ) : (
          <Button
            center
            className="w-full mt-4"
            loading={
              loading ||
              votingPowerPercent.loading ||
              loadingWalletHasNft.loading
            }
            onClick={onRegister}
            size="lg"
            variant="brand"
          >
            {t('button.registerToVote')}
            <HowToVote className="!h-5 !w-5" />
          </Button>
        )
      ) : (
        <Button
          center
          className="w-full mt-4"
          loading
          size="lg"
          variant="secondary"
        >
          {t('info.loading')}
        </Button>
      )}
    </>
  )
}
