import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useSetRecoilState, waitForAll } from 'recoil'

import { genericTokenWithUsdPriceSelector } from '@dao-dao/state/recoil'
import {
  Loader,
  useCachedLoadable,
  useChain,
  useDaoInfoContext,
  useDaoNavHelpers,
} from '@dao-dao/stateless'
import { TokenType } from '@dao-dao/types'

import {
  EntityDisplay,
  ProposalList,
  SuspenseLoader,
} from '../../../../../../components'
import {
  useDaoProposalSinglePublishProposal,
  useEntity,
  useWallet,
} from '../../../../../../hooks'
import { NewProposalData } from '../../../../../../proposal-module-adapter/adapters/DaoProposalSingle/types'
import { refreshStatusAtom } from '../../atoms'
import { usePostRequest } from '../../hooks/usePostRequest'
import { statusSelector } from '../../selectors'
import { CompleteRatings } from '../../types'
import {
  ProposalCreationFormData,
  ProposalCreationForm as StatelessProposalCreationForm,
  ProposalCreationFormProps as StatelessProposalCreationFormProps,
} from '../stateless/ProposalCreationForm'

type ProposalCreationFormProps = {
  data: CompleteRatings
} & Pick<
  StatelessProposalCreationFormProps,
  'weightByVotingPower' | 'setWeightByVotingPower'
>

export const ProposalCreationForm = ({
  data,
  ...props
}: ProposalCreationFormProps) => {
  const { t } = useTranslation()
  const { chain_id: chainId } = useChain()
  const { goToDaoProposal } = useDaoNavHelpers()
  const { coreAddress } = useDaoInfoContext()
  const { address: walletAddress = '', hexPublicKey } = useWallet({
    loadAccount: true,
  })

  const postRequest = usePostRequest()

  const statusLoadable = useCachedLoadable(
    !hexPublicKey.loading
      ? statusSelector({
          daoAddress: coreAddress,
          walletPublicKey: hexPublicKey.data,
        })
      : undefined
  )
  const setRefreshStatus = useSetRecoilState(
    refreshStatusAtom({
      daoAddress: coreAddress,
    })
  )

  const publishProposal = useDaoProposalSinglePublishProposal()

  const [loading, setLoading] = useState(false)
  const onComplete = useCallback(
    async (formData: ProposalCreationFormData) => {
      if (!data) {
        toast.error(t('error.loadingData'))
        return
      }
      if (!publishProposal) {
        toast.error(t('error.noSingleChoiceProposalModule'))
        return
      }

      setLoading(true)

      try {
        let proposalId = ''
        if (formData.type === 'new') {
          // Propose.
          const proposalData: NewProposalData = {
            ...formData.newProposal,
            msgs: data.cosmosMsgs,
          }

          proposalId = (await publishProposal(proposalData)).proposalId
          toast.success(t('success.proposalCreatedCompleteCompensationCycle'))
        } else if (formData.type === 'existing') {
          proposalId = formData.existing
        }
        // 'none' will leave the proposal ID empty

        // Complete with proposal ID.
        await postRequest(`/${coreAddress}/complete`, { proposalId })
        toast.success(
          t('success.compensationCycleCompleted', {
            context: proposalId ? 'withProposal' : 'noProposal',
          })
        )

        // Reload status on success.
        setRefreshStatus((id) => id + 1)

        // Navigate to proposal if set.
        if (proposalId) {
          goToDaoProposal(coreAddress, proposalId)
        }

        // Don't stop loading on success since we are now navigating.
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : JSON.stringify(err))
        setLoading(false)
      }
    },
    [
      data,
      publishProposal,
      t,
      postRequest,
      coreAddress,
      setRefreshStatus,
      goToDaoProposal,
    ]
  )

  const tokenPrices = useCachedLoadable(
    statusLoadable.state === 'hasValue' && statusLoadable.contents
      ? waitForAll(
          statusLoadable.contents.survey.attributes.flatMap(
            ({ nativeTokens, cw20Tokens }) => [
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
            ]
          )
        )
      : undefined
  )
  const { entity: walletEntity } = useEntity(walletAddress)

  return (
    <SuspenseLoader
      fallback={<Loader />}
      forceFallback={
        statusLoadable.state === 'loading' || tokenPrices.state === 'loading'
      }
    >
      {statusLoadable.state === 'hasValue' &&
        !!statusLoadable.contents &&
        tokenPrices.state === 'hasValue' && (
          <StatelessProposalCreationForm
            EntityDisplay={EntityDisplay}
            ProposalList={ProposalList}
            completeRatings={data}
            entity={walletEntity}
            loading={loading || statusLoadable.updating}
            onComplete={onComplete}
            status={statusLoadable.contents}
            tokenPrices={tokenPrices.contents}
            walletAddress={walletAddress}
            {...props}
          />
        )}
    </SuspenseLoader>
  )
}
