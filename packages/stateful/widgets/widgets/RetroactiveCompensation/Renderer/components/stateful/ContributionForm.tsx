import { useWallet } from '@noahsaso/cosmodal'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState, waitForAll } from 'recoil'

import { genericTokenWithUsdPriceSelector } from '@dao-dao/state/recoil'
import {
  EntityDisplay,
  Loader,
  useCachedLoadable,
  useDaoInfoContext,
} from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'

import { SuspenseLoader } from '../../../../../../components'
import { useEntity } from '../../../../../../hooks'
import { refreshStatusAtom } from '../../atoms'
import { usePostRequest } from '../../hooks/usePostRequest'
import { statusSelector } from '../../selectors'
import { ContributionForm as StatelessContributionForm } from '../stateless/ContributionForm'
import { ContributionFormData } from '../stateless/ContributionFormInput'

export const ContributionForm = () => {
  const { t } = useTranslation()
  const { coreAddress, chainId } = useDaoInfoContext()
  const { address: walletAddress = '', publicKey: walletPublicKey } =
    useWallet()
  const walletEntity = useEntity({
    address: walletAddress,
    chainId,
  })

  const postRequest = usePostRequest()

  const statusLoadable = useCachedLoadable(
    walletPublicKey?.hex
      ? statusSelector({
          daoAddress: coreAddress,
          walletPublicKey: walletPublicKey.hex,
        })
      : undefined
  )
  const setRefreshStatus = useSetRecoilState(
    refreshStatusAtom({
      daoAddress: coreAddress,
    })
  )

  const [loading, setLoading] = useState(false)
  const onSubmit = useCallback(
    async (data: ContributionFormData) => {
      setLoading(true)

      try {
        await postRequest(`/${coreAddress}/contribution`, data)
        toast.success(t('success.contributionSubmitted'))
        // Reload status on success.
        setRefreshStatus((id) => id + 1)
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : JSON.stringify(err))
      } finally {
        setLoading(false)
      }
    },
    [coreAddress, postRequest, setRefreshStatus, t]
  )

  const tokenPrices = useCachedLoadable(
    statusLoadable.state === 'hasValue' && statusLoadable.contents
      ? waitForAll(
          statusLoadable.contents.survey.attributes.flatMap(
            ({ nativeTokens, cw20Tokens }) => [
              ...nativeTokens.map(({ denom }) =>
                genericTokenWithUsdPriceSelector({
                  type: TokenType.Native,
                  denomOrAddress: denom,
                })
              ),
              ...cw20Tokens.map(({ address }) =>
                genericTokenWithUsdPriceSelector({
                  type: TokenType.Cw20,
                  denomOrAddress: address,
                })
              ),
            ]
          )
        )
      : undefined
  )

  return (
    <SuspenseLoader
      fallback={<Loader />}
      forceFallback={
        statusLoadable.state === 'loading' ||
        walletEntity.loading ||
        tokenPrices.state === 'loading'
      }
    >
      {statusLoadable.state === 'hasValue' &&
        !!statusLoadable.contents &&
        !walletEntity.loading &&
        tokenPrices.state === 'hasValue' && (
          <StatelessContributionForm
            EntityDisplay={() => (
              <EntityDisplay
                address={walletAddress}
                loadingEntity={walletEntity}
              />
            )}
            entity={walletEntity.data}
            loading={loading || statusLoadable.updating}
            onSubmit={onSubmit}
            status={statusLoadable.contents}
            tokenPrices={tokenPrices.contents}
          />
        )}
    </SuspenseLoader>
  )
}
