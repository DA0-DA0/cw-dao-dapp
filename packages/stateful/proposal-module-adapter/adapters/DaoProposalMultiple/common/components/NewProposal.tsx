import { FlagOutlined, Timelapse } from '@mui/icons-material'
import { usePlausible } from 'next-plausible'
import { useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useRecoilCallback, useRecoilValueLoadable } from 'recoil'

import {
  DaoDaoCoreSelectors,
  DaoProposalMultipleSelectors,
  blocksPerYearSelector,
} from '@dao-dao/state'
import {
  NewProposalTitleDescriptionHeader,
  NewProposal as StatelessNewProposal,
  NewProposalProps as StatelessNewProposalProps,
  useActionsContext,
  useCachedLoadable,
  useDao,
} from '@dao-dao/stateless'
import {
  BaseNewProposalProps,
  IProposalModuleBase,
  PlausibleEvents,
} from '@dao-dao/types'
import {
  MAX_NUM_PROPOSAL_CHOICES,
  convertExpirationToDate,
  dateToWdhms,
  descriptionWithPotentialProposalMetadata,
  encodeActions,
  processError,
} from '@dao-dao/utils'

import { useActionEncodeContext } from '../../../../../actions'
import { useMembership, useWallet } from '../../../../../hooks'
import { makeGetProposalInfo } from '../../functions'
import {
  NewProposalData,
  NewProposalForm,
  UsePublishProposal,
} from '../../types'
import { useProcessQ } from '../hooks'
import { NewProposalMain } from './NewProposalMain'
import { NewProposalPreview } from './NewProposalPreview'

export type NewProposalProps = BaseNewProposalProps<NewProposalForm> & {
  proposalModule: IProposalModuleBase
  usePublishProposal: UsePublishProposal
}

export const NewProposal = ({
  onCreateSuccess,
  proposalModule,
  usePublishProposal,
  ...props
}: NewProposalProps) => {
  const { t } = useTranslation()
  const {
    name: daoName,
    imageUrl: daoImageUrl,
    coreAddress,
    info: { isActive, activeThreshold },
  } = useDao()
  const { address, isWalletConnecting, isWalletConnected, getStargateClient } =
    useWallet()

  const { watch } = useFormContext<NewProposalForm>()
  const proposalTitle = watch('title')
  const choices = watch('choices') ?? []

  const { isMember = false, loading: membershipLoading } = useMembership()

  // Info about if the DAO is paused. This selector depends on blockHeight,
  // which is refreshed periodically, so use a loadable to avoid unnecessary
  // re-renders.
  const pauseInfo = useCachedLoadable(
    DaoDaoCoreSelectors.pauseInfoSelector({
      chainId: proposalModule.chainId,
      contractAddress: coreAddress,
      params: [],
    })
  )
  const isPaused =
    pauseInfo.state === 'hasValue' &&
    ('paused' in pauseInfo.contents || 'Paused' in pauseInfo.contents)

  const processQ = useProcessQ()

  const blocksPerYearLoadable = useRecoilValueLoadable(
    blocksPerYearSelector({
      chainId: proposalModule.chainId,
    })
  )

  const {
    simulateProposal,
    publishProposal,
    cannotProposeReason,
    depositUnsatisfied,
    simulationBypassExpiration,
  } = usePublishProposal()

  const plausible = usePlausible<PlausibleEvents>()
  const createProposal = useRecoilCallback(
    ({ snapshot }) =>
      async (newProposalData: NewProposalData) => {
        if (!isWalletConnected || !address) {
          toast.error(t('error.logInToContinue'))
          return
        }

        if (blocksPerYearLoadable.state !== 'hasValue') {
          toast.error(t('error.loadingData'))
          return
        }
        const blocksPerYear = blocksPerYearLoadable.contents

        try {
          const { proposalNumber, proposalId } = await publishProposal(
            newProposalData,
            {
              // On failed simulation, allow the user to bypass the simulation
              // and create the proposal anyway for 3 seconds.
              failedSimulationBypassSeconds: 3,
            }
          )

          plausible('daoProposalCreate', {
            props: {
              chainId: proposalModule.chainId,
              dao: proposalModule.dao.coreAddress,
              walletAddress: address,
              proposalModule: proposalModule.address,
              proposalModuleType: proposalModule.contractName,
              proposalNumber,
              proposalId,
              approval: false,
            },
          })

          const proposalInfo = await makeGetProposalInfo({
            chain: proposalModule.dao.chain,
            coreAddress: proposalModule.dao.coreAddress,
            proposalModule: proposalModule.info,
            proposalNumber,
            proposalId,
            isPreProposeApprovalProposal: false,
          })()
          const expirationDate =
            proposalInfo?.expiration &&
            convertExpirationToDate(
              blocksPerYear,
              proposalInfo.expiration,
              (await (await getStargateClient()).getBlock()).header.height
            )

          const proposal = (
            await snapshot.getPromise(
              DaoProposalMultipleSelectors.proposalSelector({
                chainId: proposalModule.chainId,
                contractAddress: proposalModule.address,
                params: [
                  {
                    proposalId: proposalNumber,
                  },
                ],
              })
            )
          ).proposal

          const { quorum } = processQ(proposal.voting_strategy)

          onCreateSuccess(
            proposalInfo
              ? {
                  id: proposalId,
                  title: newProposalData.title,
                  description: newProposalData.description,
                  info: [
                    {
                      Icon: FlagOutlined,
                      label: `${t('title.quorum')}: ${quorum.display}`,
                    },
                    ...(expirationDate
                      ? [
                          {
                            Icon: Timelapse,
                            label: dateToWdhms(expirationDate),
                          },
                        ]
                      : []),
                  ],
                  dao: {
                    name: daoName,
                    coreAddress,
                    imageUrl: daoImageUrl,
                  },
                }
              : {
                  id: proposalId,
                  title: newProposalData.title,
                  description: newProposalData.description,
                  info: [],
                  dao: {
                    name: daoName,
                    coreAddress,
                    imageUrl: daoImageUrl,
                  },
                }
          )
        } catch (err) {
          console.error(err)
          toast.error(processError(err))
        }
      },
    [
      isWalletConnected,
      t,
      publishProposal,
      proposalModule,
      blocksPerYearLoadable,
      getStargateClient,
      processQ,
      onCreateSuccess,
      daoName,
      coreAddress,
      daoImageUrl,
      plausible,
      address,
    ]
  )

  const { actionMap } = useActionsContext()
  const encodeContext = useActionEncodeContext()

  const getProposalDataFromFormData: StatelessNewProposalProps<
    NewProposalForm,
    NewProposalData
  >['getProposalDataFromFormData'] = async ({
    title,
    description,
    choices,
    vote,
  }) => ({
    title,
    description,
    choices: {
      options: await Promise.all(
        choices.map(async (option) => ({
          title: option.title,
          description: descriptionWithPotentialProposalMetadata(
            option.description,
            option.metadata
          ),
          // Type mismatch between Cosmos msgs and Secret Network Cosmos msgs.
          // The contract execution will fail if the messages are invalid, so
          // this is safe. The UI should ensure that the correct messages are
          // used for the given chain anyways.
          msgs: (await encodeActions({
            actionMap,
            encodeContext,
            data: option.actionData,
          })) as any,
        }))
      ),
    },
    vote,
  })

  return (
    <StatelessNewProposal<NewProposalForm, NewProposalData>
      activeThreshold={activeThreshold}
      additionalSubmitError={
        choices.length < 2
          ? t('error.tooFewChoices')
          : choices.length > MAX_NUM_PROPOSAL_CHOICES
          ? t('error.tooManyChoices', {
              count: MAX_NUM_PROPOSAL_CHOICES,
            })
          : undefined
      }
      cannotProposeReason={cannotProposeReason}
      connected={isWalletConnected}
      content={{
        Header: NewProposalTitleDescriptionHeader,
        Main: NewProposalMain,
        Preview: NewProposalPreview,
      }}
      createProposal={createProposal}
      depositUnsatisfied={depositUnsatisfied}
      getProposalDataFromFormData={getProposalDataFromFormData}
      isActive={isActive}
      isMember={
        membershipLoading
          ? { loading: true }
          : { loading: false, data: isMember }
      }
      isPaused={isPaused}
      isWalletConnecting={isWalletConnecting}
      proposalTitle={proposalTitle}
      simulateProposal={simulateProposal}
      simulationBypassExpiration={simulationBypassExpiration}
      {...props}
    />
  )
}
