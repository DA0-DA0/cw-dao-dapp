import { useCallback, useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import {
  Cw1WhitelistSelectors,
  DaoProposalMultipleSelectors,
} from '@dao-dao/state/recoil'
import {
  BallotDepositEmoji,
  useCachedLoadingWithError,
} from '@dao-dao/stateless'
import {
  ActionChainContextType,
  ActionComponent,
  ActionContextType,
  ActionKey,
  ActionMaker,
  Feature,
  ProposalModule,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types'
import { InstantiateMsg as Cw1WhitelistInstantiateMsg } from '@dao-dao/types/contracts/Cw1Whitelist'
import {
  ExecuteMsg,
  PercentageThreshold,
  VotingStrategy,
} from '@dao-dao/types/contracts/DaoProposalMultiple'
import {
  DAO_PROPOSAL_MULTIPLE_CONTRACT_NAMES,
  convertCosmosVetoConfigToVeto,
  convertDurationToDurationWithUnits,
  convertDurationWithUnitsToDuration,
  convertVetoConfigToCosmos,
  instantiateSmartContract,
  isFeatureSupportedByVersion,
  isValidBech32Address,
  makeWasmMessage,
  processError,
} from '@dao-dao/utils'

import {
  useActionOptions,
  useMsgExecutesContract,
} from '../../../../../../actions'
import { AddressInput, Trans } from '../../../../../../components'
import { useWallet } from '../../../../../../hooks'
import {
  UpdateProposalConfigComponent,
  UpdateProposalConfigData,
} from './UpdateProposalConfigComponent'

const votingStrategyToProcessedQuorum = (
  votingStrategy: VotingStrategy
): Pick<UpdateProposalConfigData, 'quorumType' | 'quorumPercentage'> => {
  if (!('single_choice' in votingStrategy)) {
    throw new Error('unrecognized voting_strategy')
  }

  const quorum: PercentageThreshold = votingStrategy.single_choice.quorum

  const quorumType: UpdateProposalConfigData['quorumType'] =
    'majority' in quorum ? 'majority' : '%'
  const quorumPercentage: UpdateProposalConfigData['quorumPercentage'] =
    'majority' in quorum ? undefined : Number(quorum.percent) * 100

  return {
    quorumType,
    quorumPercentage,
  }
}

const typePercentageToPercentageThreshold = (
  t: 'majority' | '%',
  p: number | undefined
) => {
  if (t === 'majority') {
    return { majority: {} }
  } else {
    if (p === undefined) {
      throw new Error(
        'internal erorr: an undefined percent was configured with a non-majority threshold.'
      )
    }
    return {
      percent: (p / 100).toString(),
    }
  }
}

export const makeUpdateProposalConfigActionMaker = ({
  version,
  address: proposalModuleAddress,
}: ProposalModule): ActionMaker<UpdateProposalConfigData> => {
  const Component: ActionComponent = (props) => {
    const { t } = useTranslation()
    const { address: walletAddress, getSigningCosmWasmClient } = useWallet()
    const { getValues, setValue, setError, clearErrors, watch, trigger } =
      useFormContext<UpdateProposalConfigData>()

    const vetoAddressesLength = watch(
      (props.fieldNamePrefix + 'veto.addresses') as 'veto.addresses'
    ).length
    const vetoCw1WhitelistAddress = watch(
      (props.fieldNamePrefix +
        'veto.cw1WhitelistAddress') as 'veto.cw1WhitelistAddress'
    )

    const { chainContext } = useActionOptions()
    if (chainContext.type !== ActionChainContextType.Supported) {
      throw new Error('Unsupported chain context')
    }

    const [creatingCw1WhitelistVetoers, setCreatingCw1WhitelistVetoers] =
      useState(false)
    const createCw1WhitelistVetoers = async () => {
      if (!walletAddress) {
        toast.error(t('error.logInToContinue'))
        return
      }

      setCreatingCw1WhitelistVetoers(true)
      try {
        // Trigger veto address field validations.
        await trigger(
          (props.fieldNamePrefix + 'veto.addresses') as 'veto.addresses',
          {
            shouldFocus: true,
          }
        )

        const veto = getValues((props.fieldNamePrefix + 'veto') as 'veto')
        if (veto.cw1WhitelistAddress) {
          throw new Error(t('error.accountListAlreadySaved'))
        }
        if (veto.addresses.length < 2) {
          throw new Error(t('error.enterAtLeastTwoAccounts'))
        }
        const admins = veto.addresses.map(({ address }) => address)
        if (
          admins.some(
            (admin) =>
              !isValidBech32Address(admin, chainContext.chain.bech32_prefix)
          )
        ) {
          throw new Error(t('error.invalidAccount'))
        }

        const contractAddress = await instantiateSmartContract(
          await getSigningCosmWasmClient(),
          walletAddress,
          chainContext.config.codeIds.Cw1Whitelist,
          'Cw1Whitelist',
          {
            admins,
            mutable: false,
          } as Cw1WhitelistInstantiateMsg
        )

        setValue(
          (props.fieldNamePrefix +
            'veto.cw1WhitelistAddress') as 'veto.cw1WhitelistAddress',
          contractAddress
        )

        toast.success(t('success.saved'))
      } catch (err) {
        console.error(err)
        toast.error(
          processError(err, {
            forceCapture: false,
          })
        )
      } finally {
        setCreatingCw1WhitelistVetoers(false)
      }
    }

    // Prevent action from being submitted if the cw1-whitelist contract has not
    // yet been created and it needs to be.
    useEffect(() => {
      if (vetoAddressesLength > 1 && !vetoCw1WhitelistAddress) {
        setError(
          (props.fieldNamePrefix +
            'veto.cw1WhitelistAddress') as 'veto.cw1WhitelistAddress',
          {
            type: 'manual',
            message: t('error.accountListNeedsSaving'),
          }
        )
      } else {
        clearErrors(
          (props.fieldNamePrefix +
            'veto.cw1WhitelistAddress') as 'veto.cw1WhitelistAddress'
        )
      }
    }, [
      setError,
      clearErrors,
      t,
      props.fieldNamePrefix,
      vetoAddressesLength,
      vetoCw1WhitelistAddress,
    ])

    return (
      <UpdateProposalConfigComponent
        {...props}
        options={{
          version,
          createCw1WhitelistVetoers,
          creatingCw1WhitelistVetoers,
          AddressInput,
          Trans,
        }}
      />
    )
  }

  return ({ t, context, chain: { chain_id: chainId } }) => {
    const useDefaults: UseDefaults<UpdateProposalConfigData> = () => {
      const proposalModuleConfig = useCachedLoadingWithError(
        DaoProposalMultipleSelectors.configSelector({
          chainId,
          contractAddress: proposalModuleAddress,
        })
      )

      // Attempt to load cw1-whitelist admins if the vetoer is set. Will only
      // succeed if the vetoer is a cw1-whitelist contract. Otherwise it returns
      // undefined.
      const cw1WhitelistAdminsLoadable = useRecoilValueLoadable(
        !proposalModuleConfig.loading &&
          !proposalModuleConfig.errored &&
          proposalModuleConfig.data.veto
          ? Cw1WhitelistSelectors.adminsIfCw1Whitelist({
              chainId,
              contractAddress: proposalModuleConfig.data.veto.vetoer,
            })
          : constSelector(undefined)
      )

      if (
        proposalModuleConfig.loading ||
        cw1WhitelistAdminsLoadable.state === 'loading'
      ) {
        return
      } else if (proposalModuleConfig.errored) {
        return proposalModuleConfig.error
      } else if (cw1WhitelistAdminsLoadable.state === 'hasError') {
        return cw1WhitelistAdminsLoadable.contents
      }

      const onlyMembersExecute = proposalModuleConfig.data.only_members_execute

      const allowRevoting = proposalModuleConfig.data.allow_revoting
      const votingStrategy = proposalModuleConfig.data.voting_strategy

      return {
        onlyMembersExecute,
        votingDuration: convertDurationToDurationWithUnits(
          proposalModuleConfig.data.max_voting_period
        ),
        allowRevoting,
        veto: convertCosmosVetoConfigToVeto(
          proposalModuleConfig.data.veto,
          cw1WhitelistAdminsLoadable.valueMaybe()
        ),
        ...votingStrategyToProcessedQuorum(votingStrategy),
      }
    }

    const useTransformToCosmos: UseTransformToCosmos<
      UpdateProposalConfigData
    > = () => {
      const proposalModuleConfig = useCachedLoadingWithError(
        DaoProposalMultipleSelectors.configSelector({
          chainId,
          contractAddress: proposalModuleAddress,
        })
      )

      return useCallback(
        (data: UpdateProposalConfigData) => {
          if (proposalModuleConfig.loading) {
            return
          } else if (proposalModuleConfig.errored) {
            throw proposalModuleConfig.error
          }

          const updateConfigMessage: ExecuteMsg = {
            update_config: {
              voting_strategy: {
                single_choice: {
                  quorum: typePercentageToPercentageThreshold(
                    data.quorumType,
                    data.quorumPercentage
                  ),
                },
              },
              max_voting_period: convertDurationWithUnitsToDuration(
                data.votingDuration
              ),
              only_members_execute: data.onlyMembersExecute,
              allow_revoting: data.allowRevoting,
              // If veto is supported...
              ...(version &&
                isFeatureSupportedByVersion(Feature.Veto, version) && {
                  veto: convertVetoConfigToCosmos(data.veto),
                }),
              // Pass through because we don't support changing them yet.
              dao: proposalModuleConfig.data.dao,
              close_proposal_on_execution_failure:
                proposalModuleConfig.data.close_proposal_on_execution_failure,
              min_voting_period: proposalModuleConfig.data.min_voting_period,
            },
          }

          return makeWasmMessage({
            wasm: {
              execute: {
                contract_addr: proposalModuleAddress,
                funds: [],
                msg: updateConfigMessage,
              },
            },
          })
        },
        [proposalModuleConfig]
      )
    }

    const useDecodedCosmosMsg: UseDecodedCosmosMsg<UpdateProposalConfigData> = (
      msg: Record<string, any>
    ) => {
      const isUpdateConfig = useMsgExecutesContract(
        msg,
        DAO_PROPOSAL_MULTIPLE_CONTRACT_NAMES,
        {
          wasm: {
            execute: {
              contract_addr: {},
              funds: {},
              msg: {
                update_config: {
                  allow_revoting: {},
                  close_proposal_on_execution_failure: {},
                  dao: {},
                  max_voting_period: {},
                  min_voting_period: {},
                  only_members_execute: {},
                  voting_strategy: {
                    single_choice: {
                      quorum: {},
                    },
                  },
                },
              },
            },
          },
        }
      )

      // Attempt to load cw1-whitelist admins if the vetoer is set. Will only
      // succeed if the vetoer is a cw1-whitelist contract. Otherwise it returns
      // undefined.
      const cw1WhitelistAdminsLoadable = useRecoilValueLoadable(
        isUpdateConfig && msg.wasm.execute.msg.update_config.veto
          ? Cw1WhitelistSelectors.adminsIfCw1Whitelist({
              chainId,
              contractAddress: msg.wasm.execute.msg.update_config.veto.vetoer,
            })
          : constSelector(undefined)
      )

      if (!isUpdateConfig || cw1WhitelistAdminsLoadable.state !== 'hasValue') {
        return { match: false }
      }

      const {
        allow_revoting: allowRevoting,
        only_members_execute: onlyMembersExecute,
        max_voting_period,
        voting_strategy: votingStrategy,
        veto,
      } = msg.wasm.execute.msg.update_config

      return {
        match: true,
        data: {
          allowRevoting,
          onlyMembersExecute,
          votingDuration: convertDurationToDurationWithUnits(max_voting_period),
          proposalDurationUnits: 'seconds',
          veto: convertCosmosVetoConfigToVeto(
            veto,
            cw1WhitelistAdminsLoadable.valueMaybe()
          ),
          ...votingStrategyToProcessedQuorum(votingStrategy),
        },
      }
    }

    return {
      key: ActionKey.UpdateProposalMultipleConfig,
      Icon: BallotDepositEmoji,
      label: t('form.updateVotingConfigTitle', {
        context:
          // If more than one proposal module, specify which one this is.
          context.type === ActionContextType.Dao &&
          context.info.proposalModules.length > 1
            ? 'multipleChoice'
            : undefined,
      }),
      description: t('info.updateVotingConfigActionDescription'),
      notReusable: true,
      Component,
      useDefaults,
      useTransformToCosmos,
      useDecodedCosmosMsg,
    }
  }
}
