import { Image } from '@mui/icons-material'
import { WalletConnectionStatus, useWallet } from '@noahsaso/cosmodal'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import {
  ImageSelectorModal,
  ModalLoader,
  ModalProps,
  NftSelectionModal,
  NoContent,
  ProfileImage,
  Tooltip,
  useAppContext,
  useCachedLoadingWithError,
  useSupportedChainContext,
} from '@dao-dao/stateless'
import { NftCardInfo } from '@dao-dao/types'
import {
  InstantiateMsg,
  MintMsgForNullable_Empty,
} from '@dao-dao/types/contracts/Cw721Base'
import {
  MAINNET,
  getDisplayNameForChainId,
  processError,
  uploadNft,
} from '@dao-dao/utils'

import { useInstantiateAndExecute, useWalletInfo } from '../hooks'
import { walletNativeAndStargazeNftsSelector } from '../recoil'
import { SuspenseLoader } from './SuspenseLoader'
import { Trans } from './Trans'

export type PfpkNftSelectionModalProps = Pick<
  Required<ModalProps>,
  'onClose' | 'visible'
>

// TODO(chain-unify): Show NFTs from all.
export const InnerPfpkNftSelectionModal = ({
  onClose,
  visible,
}: PfpkNftSelectionModalProps) => {
  const { t } = useTranslation()
  const {
    address: walletAddress,
    status: walletStatus,
    error: walletError,
  } = useWallet()
  const { chain, config } = useSupportedChainContext()

  const getIdForNft = (nft: NftCardInfo) =>
    `${nft.collection.address}:${nft.tokenId}`

  const nfts = useCachedLoadingWithError(
    // Don't load NFTs until visible.
    walletAddress && visible
      ? walletNativeAndStargazeNftsSelector({
          chainId: chain.chain_id,
          walletAddress,
        })
      : undefined
  )

  const {
    walletProfileData,
    updateProfileNft,
    updatingProfile,
    backupImageUrl,
    refreshBalances,
  } = useWalletInfo()
  // Initialize to selected NFT.
  const [selected, setSelected] = useState<string | undefined>(
    !walletProfileData.loading && walletProfileData.profile.nft
      ? `${walletProfileData.profile.nft.collectionAddress}:${walletProfileData.profile.nft.tokenId}`
      : undefined
  )
  const selectedNft =
    !nfts.loading && !nfts.errored && selected
      ? nfts.data.find((nft) => selected === getIdForNft(nft))
      : undefined
  // If nonce changes, set selected NFT.
  const [lastNonce, setLastNonce] = useState(
    walletProfileData.loading ? 0 : walletProfileData.profile.nonce
  )
  useEffect(() => {
    if (
      !walletProfileData.loading &&
      walletProfileData.profile.nft &&
      walletProfileData.profile.nonce > lastNonce
    ) {
      setSelected(
        `${walletProfileData.profile.nft.collectionAddress}:${walletProfileData.profile.nft.tokenId}`
      )
      setLastNonce(walletProfileData.profile.nonce)
    }
  }, [lastNonce, walletProfileData])

  const onAction = useCallback(async () => {
    if (nfts.loading) {
      toast.error(t('error.noNftsSelected'))
      return
    }

    // Only give error about no NFTs if something should be selected. This
    // should never happen...
    if (selected && !selectedNft) {
      toast.error(t('error.noNftsSelected'))
      return
    }

    try {
      // Update NFT only.
      await updateProfileNft(
        selectedNft
          ? {
              chainId: selectedNft.chainId,
              collectionAddress: selectedNft.collection.address,
              tokenId: selectedNft.tokenId,
            }
          : // Clear NFT if nothing selected.
            null
      )
      // Close on successful update.
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(
        processError(err, {
          forceCapture: false,
        })
      )
    }
  }, [nfts, selected, selectedNft, t, updateProfileNft, onClose])

  const [showImageSelector, setShowImageSelector] = useState(false)
  const { register, setValue, watch } = useForm<{ image: string }>()
  const image = watch('image')

  const [uploadingImage, setUploadingImage] = useState(false)
  const { ready: instantiateAndExecuteReady, instantiateAndExecute } =
    useInstantiateAndExecute(config.codeIds.Cw721Base)
  const uploadImage = useCallback(async () => {
    if (!image) {
      toast.error(t('error.noImage'))
    }

    setUploadingImage(true)
    try {
      const { cid, metadataUrl } = await uploadNft(
        'DAO DAO Profile Picture',
        '',
        undefined,
        // Use image URL directly instead of uploading a file.
        JSON.stringify({
          image,
        })
      )

      // Instantiate and execute cw721 mint.
      const { contractAddress } = await instantiateAndExecute({
        instantiate: {
          admin: walletAddress,
          funds: [],
          label: 'DAO DAO Profile Picture',
          msg: {
            minter: walletAddress,
            name: 'DAO DAO Profile Picture',
            symbol: 'PIC',
          } as InstantiateMsg,
        },
        executes: [
          {
            funds: [],
            msg: {
              mint: {
                owner: walletAddress,
                token_id: cid,
                token_uri: metadataUrl,
              } as MintMsgForNullable_Empty,
            },
          },
        ],
      })

      // On success, hide image selector, select new collection and token ID,
      // and refresh NFT list.
      setShowImageSelector(false)
      setSelected(`${contractAddress}:${cid}`)
      refreshBalances()
    } catch (err) {
      console.error(err)
      toast.error(
        processError(err, {
          forceCapture: false,
        })
      )
    } finally {
      setUploadingImage(false)
    }
  }, [image, instantiateAndExecute, refreshBalances, t, walletAddress])

  return (
    <>
      <NftSelectionModal
        action={{
          loading: updatingProfile,
          label: t('button.save'),
          onClick: onAction,
        }}
        allowSelectingNone
        getIdForNft={getIdForNft}
        header={{
          title: t('title.chooseProfilePicture'),
          subtitle: t('info.chooseProfilePictureSubtitle', {
            nativeChainName: getDisplayNameForChainId(chain.chain_id),
          }),
        }}
        nfts={
          walletStatus === WalletConnectionStatus.ReadyForConnection &&
          walletError
            ? { loading: false, errored: true, error: walletError }
            : nfts
        }
        noneDisplay={
          MAINNET ? (
            <NoContent
              Icon={Image}
              body={t('info.nothingHereYet')}
              buttonLabel={t('button.uploadImage')}
              className="grow justify-center"
              onClick={() => setShowImageSelector(true)}
            />
          ) : undefined
        }
        onClose={onClose}
        onNftClick={(nft) =>
          setSelected(
            selected === getIdForNft(nft) ? undefined : getIdForNft(nft)
          )
        }
        secondaryAction={
          // Only mainnet NFTs are supported in PFPK. No testnets.
          MAINNET
            ? {
                loading: !instantiateAndExecuteReady,
                label: t('button.uploadImage'),
                onClick: () => setShowImageSelector(true),
              }
            : undefined
        }
        selectedDisplay={
          <Tooltip title={t('title.preview')}>
            <div>
              <ProfileImage
                imageUrl={
                  !nfts.loading
                    ? selectedNft
                      ? selectedNft.imageUrl
                      : backupImageUrl
                    : undefined
                }
                loading={nfts.loading}
                size="sm"
              />
            </div>
          </Tooltip>
        }
        selectedIds={selected ? [selected] : []}
        visible={visible}
      />

      {/* Only mainnet NFTs are supported in PFPK. No testnets. */}
      {MAINNET && (
        <ImageSelectorModal
          Trans={Trans}
          buttonLabel={t('button.save')}
          fieldName="image"
          imageClassName="!rounded-2xl"
          loading={uploadingImage}
          onClose={(done) =>
            done ? uploadImage() : setShowImageSelector(false)
          }
          register={register}
          setValue={setValue}
          visible={showImageSelector}
          watch={watch}
        />
      )}
    </>
  )
}

export const PfpkNftSelectionModal = () => {
  const { updateProfileNft } = useAppContext()

  return (
    <SuspenseLoader
      fallback={<ModalLoader onClose={updateProfileNft.toggle} />}
    >
      <InnerPfpkNftSelectionModal
        onClose={updateProfileNft.toggle}
        visible={updateProfileNft.visible}
      />
    </SuspenseLoader>
  )
}
