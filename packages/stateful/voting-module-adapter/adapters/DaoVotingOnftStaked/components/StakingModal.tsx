import { toUtf8 } from '@cosmjs/encoding'
import { usePlausible } from 'next-plausible'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilState } from 'recoil'

import { stakingLoadingAtom } from '@dao-dao/state'
import { ModalLoader, SegmentedControls, useDao } from '@dao-dao/stateless'
import {
  BaseStakingModalProps,
  LazyNftCardInfo,
  LoadingDataWithError,
  PlausibleEvents,
  StakingMode,
} from '@dao-dao/types'
import { MsgExecuteContract } from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/tx'
import { MsgTransferONFT } from '@dao-dao/types/protobuf/codegen/OmniFlix/onft/v1beta1/tx'
import {
  CHAIN_GAS_MULTIPLIER,
  executeSmartContract,
  getNftKey,
  processError,
} from '@dao-dao/utils'

import { NftSelectionModal, SuspenseLoader } from '../../../../components'
import {
  useAwaitNextBlock,
  useQueryLoadingDataWithError,
  useWallet,
} from '../../../../hooks'
import { useGovernanceCollectionInfo, useStakingInfo } from '../hooks'

export const StakingModal = (props: BaseStakingModalProps) => (
  <SuspenseLoader
    fallback={<ModalLoader onClose={props.onClose} visible={props.visible} />}
  >
    <InnerStakingModal {...props} />
  </SuspenseLoader>
)

const InnerStakingModal = ({
  onClose,
  visible,
  initialMode = StakingMode.Stake,
}: BaseStakingModalProps) => {
  const { t } = useTranslation()
  const dao = useDao()
  const {
    address: walletAddress,
    isWalletConnected,
    getSigningClient,
  } = useWallet({
    chainId: dao.chainId,
  })
  const plausible = usePlausible<PlausibleEvents>()

  const [mode, setMode] = useState<StakingMode>(initialMode)

  const [stakeTokenIds, setStakeTokenIds] = useState([] as string[])
  const [unstakeTokenIds, setUnstakeTokenIds] = useState([] as string[])

  const [stakingLoading, setStakingLoading] = useRecoilState(stakingLoadingAtom)

  const { collectionAddress, collectionInfo } = useGovernanceCollectionInfo({
    fetchWalletBalance: true,
  })
  const {
    stakingContractAddress,
    refreshTotals,
    loadingWalletStakedValue,
    refreshClaims,
    loadingWalletStakedNfts,
    loadingWalletUnstakedNfts,
    unstakingDuration,
  } = useStakingInfo({
    fetchClaims: true,
    fetchTotalStakedValue: false,
    fetchWalletStakedValue: true,
    fetchWalletUnstakedNfts: true,
  })

  const hasStake =
    loadingWalletStakedValue !== undefined &&
    !loadingWalletStakedValue.loading &&
    loadingWalletStakedValue.data.isPositive()

  const walletStakedBalanceLoading = useQueryLoadingDataWithError(
    dao.votingModule.getVotingPowerQuery(walletAddress)
  )
  const walletStakedBalance =
    !walletStakedBalanceLoading.loading && !walletStakedBalanceLoading.errored
      ? Number(walletStakedBalanceLoading.data.power)
      : undefined

  const awaitNextBlock = useAwaitNextBlock()

  const onAction = async () => {
    if (!isWalletConnected || !walletAddress) {
      toast.error(t('error.logInToContinue'))
      return
    }

    setStakingLoading(true)

    switch (mode) {
      case StakingMode.Stake: {
        setStakingLoading(true)

        try {
          await (
            await getSigningClient()
          ).signAndBroadcast(
            walletAddress,
            [
              // Prepare
              {
                typeUrl: MsgExecuteContract.typeUrl,
                value: MsgExecuteContract.fromPartial({
                  sender: walletAddress,
                  contract: stakingContractAddress,
                  msg: toUtf8(
                    JSON.stringify({
                      prepare_stake: {
                        token_ids: stakeTokenIds,
                      },
                    })
                  ),
                  funds: [],
                }),
              },
              // Transfer
              ...stakeTokenIds.map((id) => ({
                typeUrl: MsgTransferONFT.typeUrl,
                value: MsgTransferONFT.fromPartial({
                  id,
                  denomId: collectionAddress,
                  sender: walletAddress,
                  recipient: stakingContractAddress,
                }),
              })),
              // Confirm
              {
                typeUrl: MsgExecuteContract.typeUrl,
                value: MsgExecuteContract.fromPartial({
                  sender: walletAddress,
                  contract: stakingContractAddress,
                  msg: toUtf8(
                    JSON.stringify({
                      confirm_stake: {
                        token_ids: stakeTokenIds,
                      },
                    })
                  ),
                  funds: [],
                }),
              },
            ],
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

          // New balances will not appear until the next block.
          await awaitNextBlock()

          refreshTotals()

          toast.success(
            t('success.stakedTokens', {
              amount: stakeTokenIds.length,
              tokenSymbol: collectionInfo.symbol,
            })
          )
          setStakeTokenIds([])

          // Close once done.
          onClose()
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        } finally {
          setStakingLoading(false)
        }

        break
      }
      case StakingMode.Unstake: {
        if (walletStakedBalance === undefined) {
          toast.error(t('error.loadingData'))
          return
        }

        setStakingLoading(true)

        try {
          await executeSmartContract(
            getSigningClient,
            walletAddress,
            stakingContractAddress,
            {
              unstake: {
                token_ids: unstakeTokenIds,
              },
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

          // New balances will not appear until the next block.
          await awaitNextBlock()

          refreshTotals()
          refreshClaims?.()

          toast.success(
            t('success.unstakedTokens', {
              amount: unstakeTokenIds.length,
              tokenSymbol: collectionInfo.symbol,
            })
          )
          setUnstakeTokenIds([])

          // Close once done.
          onClose()
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        } finally {
          setStakingLoading(false)
        }

        break
      }
      default:
        toast.error('Internal error while staking. Unrecognized mode.')
    }
  }

  const currentTokenIds =
    mode === StakingMode.Stake ? stakeTokenIds : unstakeTokenIds
  const setCurrentTokenIds =
    mode === StakingMode.Stake ? setStakeTokenIds : setUnstakeTokenIds

  // Toggle on/off a token ID selection.
  const onNftClick = ({ tokenId }: LazyNftCardInfo) =>
    setCurrentTokenIds((tokenIds) =>
      tokenIds.includes(tokenId)
        ? tokenIds.filter((id) => id !== tokenId)
        : [...tokenIds, tokenId]
    )

  const onDeselectAll = () => setCurrentTokenIds([])

  const nfts: LoadingDataWithError<LazyNftCardInfo[]> = (mode ===
  StakingMode.Stake
    ? loadingWalletUnstakedNfts
    : mode === StakingMode.Unstake
      ? loadingWalletStakedNfts
      : undefined) ?? {
    loading: false,
    errored: true,
    error: new Error('Unexpected failure to load NFTs'),
  }

  const onSelectAll = () =>
    setCurrentTokenIds(
      !nfts.loading && !nfts.errored ? nfts.data.map((nft) => nft.tokenId) : []
    )

  return (
    <NftSelectionModal
      action={{
        loading: stakingLoading,
        label:
          mode === StakingMode.Stake
            ? t('button.stake')
            : mode === StakingMode.Unstake
              ? t('title.unstake')
              : '',
        onClick: onAction,
      }}
      header={{
        title: hasStake
          ? t('title.manageStaking')
          : t('title.stakingModeNfts.stake'),
        subtitle:
          mode === StakingMode.Stake
            ? t('title.stakingModeNfts.stakeHeaderSubtitle')
            : mode === StakingMode.Unstake
              ? t('title.stakingModeNfts.unstakeHeaderSubtitle')
              : '',
      }}
      headerDisplay={
        !(
          !hasStake ||
          mode === undefined ||
          setMode === undefined ||
          mode === StakingMode.Claim
        ) ? (
          <SegmentedControls
            onSelect={setMode}
            selected={mode}
            tabs={[
              {
                label: t(`title.stakingModeNfts.stake`),
                value: StakingMode.Stake,
              },
              {
                label: t(`title.stakingModeNfts.unstake`),
                value: StakingMode.Unstake,
              },
            ]}
          />
        ) : undefined
      }
      nfts={nfts}
      onClose={onClose}
      onDeselectAll={onDeselectAll}
      onNftClick={onNftClick}
      onSelectAll={onSelectAll}
      selectedKeys={currentTokenIds.map((tokenId) =>
        getNftKey(dao.chainId, collectionAddress, tokenId)
      )}
      unstakingDuration={unstakingDuration}
      visible={visible}
    />
  )
}
