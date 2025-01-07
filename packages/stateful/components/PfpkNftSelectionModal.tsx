import { Image } from '@mui/icons-material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilState, useRecoilValue } from 'recoil'

import {
  allWalletNftsSelector,
  nftCardInfosForKeyAtom,
  updateProfileNftVisibleAtom,
} from '@dao-dao/state/recoil'
import {
  ImageSelectorModal,
  ModalLoader,
  ModalProps,
  NoContent,
  ProfileImage,
  Tooltip,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import { ChainId } from '@dao-dao/types'
import {
  InstantiateMsg,
  MintMsgForNullable_Empty,
} from '@dao-dao/types/contracts/Cw721Base'
import {
  MAINNET,
  getDisplayNameForChainId,
  getNftKey,
  getSupportedChainConfig,
  getSupportedChains,
  isSecretNetwork,
  processError,
  uploadNft,
} from '@dao-dao/utils'

import {
  useInstantiateAndExecute,
  useManageProfile,
  useProfile,
  useWallet,
} from '../hooks'
import { NftSelectionModal } from './nft'
import { ProfileAddChains } from './profile'
import { SuspenseLoader } from './SuspenseLoader'
import { Trans } from './Trans'

export type PfpkNftSelectionModalProps = Pick<
  Required<ModalProps>,
  'onClose' | 'visible'
>

export const InnerPfpkNftSelectionModal = ({
  onClose,
  visible,
}: PfpkNftSelectionModalProps) => {
  const { t } = useTranslation()
  const {
    isWalletError,
    message: walletErrorMessage,
    chain,
    refreshBalances,
  } = useWallet({
    attemptConnection: visible,
  })

  const { chains } = useProfile({
    onlySupported: true,
  })

  const allChainsAdded =
    !chains.loading && chains.data.length === getSupportedChains().length

  // Don't load NFTs until visible for the first time. This avoids having to use
  // visible directly in the cached loading hook below, which causes a flicker
  // on close.
  const wasVisibleOnce = useRef(visible)
  if (visible) {
    wasVisibleOnce.current = true
  }

  const nfts = useCachedLoadingWithError(
    wasVisibleOnce.current && !chains.loading
      ? // Load NFTs for all DAO DAO-supported chains.
        allWalletNftsSelector(
          chains.data.map(({ chainId, address }) => ({
            chainId,
            walletAddress: address,
          }))
        )
      : undefined
  )

  const {
    profile,
    updateProfile: { updating: updatingProfile, go: updateProfile },
  } = useManageProfile()
  // Initialize to selected NFT.
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    !profile.loading && profile.data.nft
      ? getNftKey(
          profile.data.nft.chainId,
          profile.data.nft.collectionAddress,
          profile.data.nft.tokenId
        )
      : undefined
  )
  const selectedNft =
    !nfts.loading && !nfts.errored && selectedKey
      ? nfts.data.find((nft) => selectedKey === nft.key)
      : undefined
  // If nonce changes, set selected NFT.
  const [lastNonce, setLastNonce] = useState(
    profile.loading ? 0 : profile.data.nonce
  )
  useEffect(() => {
    if (
      !profile.loading &&
      profile.data.nft &&
      profile.data.nonce > lastNonce
    ) {
      setSelectedKey(
        getNftKey(
          profile.data.nft.chainId,
          profile.data.nft.collectionAddress,
          profile.data.nft.tokenId
        )
      )
      setLastNonce(profile.data.nonce)
    }
  }, [lastNonce, profile])

  const onAction = useCallback(async () => {
    // Only give error about no NFTs if something should be selected. This
    // should never happen...
    if (nfts.loading || (selectedKey && !selectedNft)) {
      toast.error(t('error.noNftsSelected'))
      return
    }

    try {
      // Update NFT only.
      await updateProfile({
        nft: selectedNft
          ? {
              chainId: selectedNft.chainId,
              collectionAddress: selectedNft.collectionAddress,
              tokenId: selectedNft.tokenId,
            }
          : // Clear NFT if nothing selected.
            null,
      })
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
  }, [nfts.loading, selectedKey, selectedNft, t, updateProfile, onClose])

  const [showImageSelector, setShowImageSelector] = useState(false)
  const { register, setValue, watch } = useForm<{ image: string }>()
  const image = watch('image')

  const [uploadingImage, setUploadingImage] = useState(false)

  // Upload profile photos to Juno mainnet when on a chain without the cw721
  // code ID (like Stargaze) or on Secret Network (since it doesn't support
  // instantiate2). Otherwise, just use the currently connected chain. Stargaze
  // uses sg721 instead of cw721 NFTs, and sg721 costs STARS to mint. We don't
  // want to list user's profile photos on the Stargaze marketplace nor charge
  // them for uploading a profile photo.
  const uploadWallet = useWallet({
    chainId:
      !isSecretNetwork(chain.chainId) &&
      getSupportedChainConfig(chain.chainId)?.codeIds?.Cw721Base
        ? chain.chainId
        : ChainId.JunoMainnet,
    // Attempt connection to upload wallet chain when image selector is visible.
    attemptConnection: showImageSelector,
  })
  const { ready: instantiateAndExecuteReady, instantiateAndExecute } =
    useInstantiateAndExecute(
      uploadWallet.chain.chainId,
      // Should be defined since we chose a chain ID above with this set.
      getSupportedChainConfig(uploadWallet.chain.chainId)?.codeIds.Cw721Base ||
        -1
    )

  const uploadImage = useCallback(async () => {
    setUploadingImage(true)
    try {
      if (!uploadWallet.isWalletConnected) {
        await uploadWallet.connect()
        return
      }

      if (!instantiateAndExecuteReady) {
        toast.error(t('error.loadingData'))
        return
      }

      if (!image) {
        toast.error(t('error.noImageSelected'))
        return
      }

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
          admin: uploadWallet.address,
          funds: [],
          label: 'DAO DAO Profile Picture',
          msg: {
            minter: uploadWallet.address,
            name: 'DAO DAO Profile Picture',
            symbol: 'PIC',
          } as InstantiateMsg,
        },
        executes: [
          {
            funds: [],
            msg: {
              mint: {
                owner: uploadWallet.address,
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
      setSelectedKey(getNftKey(chain.chainId, contractAddress, cid))
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
  }, [
    chain.chainId,
    image,
    instantiateAndExecute,
    instantiateAndExecuteReady,
    refreshBalances,
    t,
    uploadWallet,
  ])

  const nftCardInfosForKey = useRecoilValue(nftCardInfosForKeyAtom)

  return (
    <>
      <NftSelectionModal
        action={{
          loading: updatingProfile,
          label: t('button.save'),
          onClick: onAction,
        }}
        allowSelectingNone
        header={{
          title: t('title.chooseProfilePicture'),
          subtitle: t('info.chooseProfilePictureSubtitle'),
        }}
        headerContent={
          chains.loading ? undefined : (
            <ProfileAddChains
              className="self-start"
              disabled={allChainsAdded}
              onlySupported
              prompt={
                allChainsAdded
                  ? t('info.allNftSupportedChainsAddedPrompt')
                  : t('info.supportedChainNftsNotShowingUpPrompt')
              }
              promptClassName={allChainsAdded ? '!italic' : undefined}
              promptTooltip={
                allChainsAdded
                  ? t('info.allNftSupportedChainsAddedPromptTooltip')
                  : t('info.supportedChainNftsNotShowingUpPromptTooltip')
              }
              size="sm"
              textPrompt
            />
          )
        }
        nfts={
          isWalletError && walletErrorMessage
            ? {
                loading: false,
                errored: true,
                error: new Error(walletErrorMessage),
              }
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
          setSelectedKey(selectedKey === nft.key ? undefined : nft.key)
        }
        secondaryAction={
          // Only mainnet NFTs are supported in PFPK. No testnets.
          MAINNET
            ? {
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
                      ? nftCardInfosForKey[selectedNft.key]?.imageUrl
                      : profile.loading
                        ? undefined
                        : profile.data.backupImageUrl
                    : undefined
                }
                loading={
                  nfts.loading ||
                  // If selected NFT but info not yet loaded, we're loading.
                  (selectedNft
                    ? !nftCardInfosForKey[selectedNft.key]?.imageUrl
                    : profile.loading)
                }
                size="md"
              />
            </div>
          </Tooltip>
        }
        selectedKeys={selectedKey ? [selectedKey] : []}
        visible={visible}
      />

      {/* Only mainnet NFTs are supported in PFPK. No testnets. */}
      {MAINNET && (
        <ImageSelectorModal
          Trans={Trans}
          buttonLabel={
            uploadWallet.isWalletConnected
              ? t('button.save')
              : t('button.connectToChain', {
                  chainName: getDisplayNameForChainId(
                    uploadWallet.chain.chainId
                  ),
                })
          }
          fieldName="image"
          imageClassName="!rounded-2xl"
          loading={uploadingImage}
          onCloseOrDone={(done) =>
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
  const [updateProfileNftVisible, setUpdateProfileNftVisible] = useRecoilState(
    updateProfileNftVisibleAtom
  )
  const onClose = () => setUpdateProfileNftVisible(false)

  return (
    <SuspenseLoader fallback={<ModalLoader onClose={onClose} />}>
      <InnerPfpkNftSelectionModal
        onClose={onClose}
        visible={updateProfileNftVisible}
      />
    </SuspenseLoader>
  )
}
