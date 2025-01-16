import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { HugeDecimal } from '@dao-dao/math'
import {
  contractQueries,
  daoPreProposeMultipleQueries,
  genericTokenSelector,
  tokenQueries,
} from '@dao-dao/state'
import { ActionBase, GearEmoji, useActionOptions } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionKey,
  ActionMatch,
  ActionOptions,
  DepositRefundPolicy,
  Feature,
  IProposalModuleBase,
  PreProposeModule,
  ProcessedMessage,
  TokenType,
  UnifiedCosmosMsg,
} from '@dao-dao/types'
import {
  ExecuteMsg,
  UncheckedDepositInfo,
} from '@dao-dao/types/contracts/DaoPreProposeMultiple'
import {
  DAO_PRE_PROPOSE_MULTIPLE_CONTRACT_NAMES,
  getNativeTokenForChainId,
  isFeatureSupportedByVersion,
  isValidBech32Address,
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
  tokensEqual,
} from '@dao-dao/utils'

import { useDaoGovernanceToken } from '../../../../../../hooks'
import {
  UpdatePreProposeConfigComponent,
  UpdatePreProposeConfigData,
} from './UpdatePreProposeConfigComponent'

const Component: ActionComponent = (props) => {
  const { t } = useTranslation()
  const {
    chain: { chainId, bech32Prefix },
  } = useActionOptions()

  const governanceToken = useDaoGovernanceToken() ?? undefined

  const { fieldNamePrefix } = props

  const { setValue, watch } = useFormContext()

  const depositInfo: UpdatePreProposeConfigData['depositInfo'] = watch(
    fieldNamePrefix + 'depositInfo'
  )

  const tokenLoadable = useRecoilValueLoadable(
    depositInfo.type === 'cw20' &&
      depositInfo.denomOrAddress &&
      isValidBech32Address(depositInfo.denomOrAddress, bech32Prefix)
      ? genericTokenSelector({
          chainId,
          type: TokenType.Cw20,
          denomOrAddress: depositInfo.denomOrAddress,
        })
      : depositInfo.type === 'native'
        ? genericTokenSelector({
            chainId,
            type: TokenType.Native,
            denomOrAddress: depositInfo.denomOrAddress,
          })
        : depositInfo.type === 'voting_module_token'
          ? constSelector(governanceToken)
          : constSelector(undefined)
  )

  // Update token and cw20 address error.
  const [cw20AddressError, setCw20AddressError] = useState<string>()
  useEffect(() => {
    // Update token in data for transforming to cosmos message.
    if (tokenLoadable.state === 'hasValue') {
      setValue(fieldNamePrefix + 'depositInfo.token', tokenLoadable.contents)
    }

    if (tokenLoadable.state !== 'hasError' || depositInfo.type !== 'cw20') {
      if (cw20AddressError) {
        setCw20AddressError(undefined)
      }
      return
    }

    if (!cw20AddressError && depositInfo.type === 'cw20') {
      setCw20AddressError(t('error.notCw20Address'))
    }
  }, [
    fieldNamePrefix,
    setValue,
    tokenLoadable,
    t,
    cw20AddressError,
    depositInfo.type,
  ])

  return (
    <UpdatePreProposeConfigComponent
      {...props}
      options={{
        governanceToken,
        cw20AddressError,
      }}
    />
  )
}

export class DaoProposalMultipleUpdatePreProposeConfigAction extends ActionBase<UpdatePreProposeConfigData> {
  public readonly key = ActionKey.UpdatePreProposeConfig
  public readonly Component = Component

  private prePropose: PreProposeModule

  constructor(
    options: ActionOptions,
    private proposalModule: IProposalModuleBase
  ) {
    // Only when pre propose address present.
    if (!proposalModule.prePropose) {
      throw new Error(
        'Pre-propose config can only be updated when a pre-propose module is being used.'
      )
    }

    super(options, {
      Icon: GearEmoji,
      label: options.t('proposalModuleLabel.DaoProposalMultiple'),
      // Unused.
      description: '',
    })

    this.prePropose = proposalModule.prePropose
  }

  async setup() {
    const governanceToken = this.proposalModule.dao.votingModule
      .getGovernanceTokenQuery
      ? await this.options.queryClient.fetchQuery(
          this.proposalModule.dao.votingModule.getGovernanceTokenQuery()
        )
      : undefined

    const config = await this.options.queryClient.fetchQuery(
      daoPreProposeMultipleQueries.config(this.options.queryClient, {
        chainId: this.proposalModule.chainId,
        contractAddress: this.prePropose.address,
      })
    )

    // The config response only contains `native` or `cw20`, as
    // `voting_module_token` is only passed in on execution.
    const token = config.deposit_info
      ? await this.options.queryClient.fetchQuery(
          tokenQueries.info(this.options.queryClient, {
            chainId: this.proposalModule.chainId,
            type:
              'native' in config.deposit_info.denom
                ? TokenType.Native
                : TokenType.Cw20,
            denomOrAddress:
              'native' in config.deposit_info.denom
                ? config.deposit_info.denom.native
                : config.deposit_info.denom.cw20,
          })
        )
      : undefined

    const isVotingModuleToken =
      governanceToken && token && tokensEqual(governanceToken, token)

    const depositRequired = !!config.deposit_info
    const depositInfo: UpdatePreProposeConfigData['depositInfo'] =
      config.deposit_info
        ? {
            amount: HugeDecimal.from(
              config.deposit_info.amount
            ).toHumanReadableString(token?.decimals ?? 0),
            type: isVotingModuleToken
              ? 'voting_module_token'
              : 'native' in config.deposit_info.denom
                ? 'native'
                : 'cw20',
            denomOrAddress: isVotingModuleToken
              ? governanceToken.denomOrAddress
              : 'native' in config.deposit_info.denom
                ? config.deposit_info.denom.native
                : config.deposit_info.denom.cw20,
            token,
            refundPolicy: config.deposit_info.refund_policy,
          }
        : {
            amount: '1',
            type: 'native',
            denomOrAddress: getNativeTokenForChainId(
              this.proposalModule.chainId
            ).denomOrAddress,
            token: undefined,
            refundPolicy: DepositRefundPolicy.OnlyPassed,
          }

    this.defaults = {
      depositRequired,
      depositInfo,
      anyoneCanPropose: isFeatureSupportedByVersion(
        Feature.GranularSubmissionPolicy,
        this.prePropose.version
      )
        ? !!config.submission_policy && 'anyone' in config.submission_policy
        : !!config.open_proposal_submission,
    }
  }

  async encode({
    depositRequired,
    depositInfo,
    anyoneCanPropose,
  }: UpdatePreProposeConfigData): Promise<UnifiedCosmosMsg> {
    const votingModuleTokenType =
      depositRequired && depositInfo.type === 'voting_module_token'
        ? depositInfo.token?.type
        : false
    if (votingModuleTokenType === undefined) {
      throw new Error('Voting module token not loaded.')
    }

    const updateConfigMessage: ExecuteMsg = {
      update_config: {
        deposit_info: depositRequired
          ? {
              amount: HugeDecimal.fromHumanReadable(
                depositInfo.amount,
                depositInfo.token?.decimals ?? 0
              ).toString(),
              denom:
                depositInfo.type === 'voting_module_token'
                  ? {
                      voting_module_token: {
                        token_type:
                          votingModuleTokenType === TokenType.Native
                            ? 'native'
                            : votingModuleTokenType === TokenType.Cw20
                              ? 'cw20'
                              : // Cause a chain error. Should never happen.
                                ('invalid' as never),
                      },
                    }
                  : {
                      token: {
                        denom:
                          depositInfo.type === 'native'
                            ? {
                                native: depositInfo.denomOrAddress,
                              }
                            : // depositInfo.type === 'cw20'
                              {
                                cw20: depositInfo.denomOrAddress,
                              },
                      },
                    },
              refund_policy: depositInfo.refundPolicy,
            }
          : null,
        ...(isFeatureSupportedByVersion(
          Feature.GranularSubmissionPolicy,
          this.prePropose.version
        )
          ? {
              submission_policy: anyoneCanPropose
                ? {
                    anyone: {
                      denylist: [],
                    },
                  }
                : {
                    specific: {
                      dao_members: true,
                      allowlist: [],
                      denylist: [],
                    },
                  },
            }
          : {
              open_proposal_submission: anyoneCanPropose,
            }),
      },
    }

    return makeExecuteSmartContractMessage({
      chainId: this.proposalModule.chainId,
      contractAddress: this.prePropose.address,
      sender: this.options.address,
      msg: updateConfigMessage,
    })
  }

  async match([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<ActionMatch> {
    return (
      objectMatchesStructure(decodedMessage, {
        wasm: {
          execute: {
            contract_addr: {},
            funds: {},
            msg: {
              update_config: {},
            },
          },
        },
      }) &&
      chainId === this.proposalModule.chainId &&
      (await this.options.queryClient.fetchQuery(
        contractQueries.isContract(this.options.queryClient, {
          chainId,
          address: decodedMessage.wasm.execute.contract_addr,
          nameOrNames: DAO_PRE_PROPOSE_MULTIPLE_CONTRACT_NAMES,
        })
      ))
    )
  }

  async decode([
    {
      decodedMessage,
      account: { chainId },
    },
  ]: ProcessedMessage[]): Promise<UpdatePreProposeConfigData> {
    const config = decodedMessage.wasm.execute.msg.update_config
    const configDepositInfo = config.deposit_info as
      | UncheckedDepositInfo
      | null
      | undefined

    const token = configDepositInfo
      ? 'voting_module_token' in configDepositInfo.denom
        ? this.proposalModule.dao.votingModule.getGovernanceTokenQuery
          ? await this.options.queryClient.fetchQuery(
              this.proposalModule.dao.votingModule.getGovernanceTokenQuery()
            )
          : undefined
        : await this.options.queryClient.fetchQuery(
            tokenQueries.info(this.options.queryClient, {
              chainId,
              type:
                'native' in configDepositInfo.denom.token.denom
                  ? TokenType.Native
                  : TokenType.Cw20,
              denomOrAddress:
                'native' in configDepositInfo.denom.token.denom
                  ? configDepositInfo.denom.token.denom.native
                  : configDepositInfo.denom.token.denom.cw20,
            })
          )
      : undefined

    const anyoneCanPropose =
      // < v2.5.0
      'open_proposal_submission' in config
        ? !!config.open_proposal_submission
        : // >= v2.5.0
          'submission_policy' in config
          ? 'anyone' in config.submission_policy
          : undefined

    // anyoneCanPropose should be defined
    if (anyoneCanPropose === undefined) {
      throw new Error('Invalid config update message.')
    }

    if (!configDepositInfo || !token) {
      return {
        depositRequired: false,
        depositInfo: {
          amount: '1',
          type: 'native',
          denomOrAddress: getNativeTokenForChainId(chainId).denomOrAddress,
          refundPolicy: DepositRefundPolicy.OnlyPassed,
        },
        anyoneCanPropose,
      }
    }

    const type: UpdatePreProposeConfigData['depositInfo']['type'] =
      'voting_module_token' in configDepositInfo.denom
        ? 'voting_module_token'
        : 'native' in configDepositInfo.denom.token.denom
          ? 'native'
          : 'cw20'

    const depositInfo: UpdatePreProposeConfigData['depositInfo'] = {
      amount: HugeDecimal.from(configDepositInfo.amount).toHumanReadableString(
        token.decimals
      ),
      type,
      denomOrAddress: token.denomOrAddress,
      token,
      refundPolicy: configDepositInfo.refund_policy,
    }

    return {
      depositRequired: true,
      depositInfo,
      anyoneCanPropose,
    }
  }
}
