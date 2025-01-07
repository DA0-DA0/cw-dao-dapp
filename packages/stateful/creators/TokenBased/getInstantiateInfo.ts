import { HugeDecimal } from '@dao-dao/math'
import {
  ChainId,
  DaoCreatorGetInstantiateInfo,
  TokenType,
} from '@dao-dao/types'
import { ExecuteMsg as BtsgFtFactoryExecuteMsg } from '@dao-dao/types/contracts/BtsgFtFactory'
import { InitialBalance } from '@dao-dao/types/contracts/DaoVotingTokenStaked'
import {
  NEW_DAO_TOKEN_DECIMALS,
  convertDurationWithUnitsToDuration,
  isSecretNetwork,
} from '@dao-dao/utils'

import { Cw20StakedVotingModule } from '../../clients/voting-module/Cw20StakedVotingModule'
import { SecretSnip20StakedVotingModule } from '../../clients/voting-module/Snip20StakedVotingModule.secret'
import { TokenStakedVotingModule } from '../../clients/voting-module/TokenStakedVotingModule'
import { SecretTokenStakedVotingModule } from '../../clients/voting-module/TokenStakedVotingModule.secret'
import { CreatorData, GovernanceTokenType } from './types'

export const getInstantiateInfo: DaoCreatorGetInstantiateInfo<CreatorData> = ({
  chainConfig: { tokenCreationFactoryAddress },
  newDao: { chainId },
  data: {
    tiers,
    govTokenType,
    selectedTokenType,
    newInfo: {
      initialSupply,
      maxSupply,
      imageUrl,
      metadataUrl,
      metadataUrlImageUrl,
      symbol,
      name,
    },
    existingTokenDenomOrAddress,
    existingToken,
    unstakingDuration: unstakingDurationWithUnits,
    customStakingAddress,
    customStakingCodeHash,
    activeThreshold,
    tokenFactoryDenomCreationFee,
  },
  t,
}) => {
  const isNative = selectedTokenType === TokenType.Native
  const isSecret = isSecretNetwork(chainId)

  const commonConfig = {
    activeThreshold: activeThreshold?.enabled
      ? !activeThreshold.type || activeThreshold.type === 'percent'
        ? {
            percentage: {
              percent: (Number(activeThreshold.value) / 100).toString(),
            },
          }
        : {
            absolute_count: {
              count: HugeDecimal.fromHumanReadable(
                activeThreshold.value,
                govTokenType === GovernanceTokenType.New
                  ? NEW_DAO_TOKEN_DECIMALS
                  : (existingToken?.decimals ?? 0)
              ).toString(),
            },
          }
      : null,
  }
  const unstakingDuration =
    unstakingDurationWithUnits.value === 0
      ? null
      : convertDurationWithUnitsToDuration(unstakingDurationWithUnits)

  if (govTokenType === GovernanceTokenType.New) {
    const microInitialBalances: InitialBalance[] = tiers.flatMap(
      ({ weight, members }) =>
        members.map(({ address }) => ({
          address,
          // Governance Token-based DAOs distribute tier weights evenly amongst
          // members.
          amount: HugeDecimal.fromHumanReadable(
            initialSupply,
            NEW_DAO_TOKEN_DECIMALS
          )
            .times(weight)
            .div(members.length)
            .div(100)
            .toFixed(0),
        }))
    )
    // To prevent rounding issues, treasury balance becomes the remaining tokens
    // after the member weights are distributed.
    const microInitialTreasuryBalance = HugeDecimal.fromHumanReadable(
      initialSupply,
      NEW_DAO_TOKEN_DECIMALS
    )
      .minus(
        microInitialBalances.reduce(
          (acc, { amount }) => acc.plus(amount),
          HugeDecimal.zero
        )
      )
      .toString()

    // Secret Network only supports creating new CW20 DAOs (SNIP20). Native
    // tokens are supported on other chains. This should never happen, but just
    // in case...
    if (isSecret && isNative) {
      throw new Error(
        'Creating native tokens is not supported on Secret Network.'
      )
    }

    if (isNative) {
      // New BitSong Fantoken
      if (
        chainId === ChainId.BitsongMainnet ||
        chainId === ChainId.BitsongTestnet
      ) {
        if (!tokenCreationFactoryAddress) {
          throw new Error('tokenCreationFactoryAddress not set')
        }

        if (!maxSupply || maxSupply === '0') {
          throw new Error('Max supply not set')
        }

        if (imageUrl && (imageUrl !== metadataUrlImageUrl || !metadataUrl)) {
          throw new Error('Image metadata URL not properly set')
        }

        const fantokenExecute: BtsgFtFactoryExecuteMsg = {
          issue: {
            symbol: symbol.toLowerCase(),
            name,
            max_supply: HugeDecimal.fromHumanReadable(
              maxSupply,
              NEW_DAO_TOKEN_DECIMALS
            ).toString(),
            uri: metadataUrl || '',
            initial_balances: microInitialBalances,
            initial_dao_balance: microInitialTreasuryBalance,
          },
        }

        return TokenStakedVotingModule.generateModuleInstantiateInfo(chainId, {
          ...commonConfig,
          unstakingDuration,
          token: {
            factory: {
              address: tokenCreationFactoryAddress,
              message: fantokenExecute,
              funds: tokenFactoryDenomCreationFee,
            },
          },
        })
      } else {
        // New tokenfactory token
        return TokenStakedVotingModule.generateModuleInstantiateInfo(chainId, {
          ...commonConfig,
          unstakingDuration,
          token: {
            new: {
              symbol,
              decimals: NEW_DAO_TOKEN_DECIMALS,
              name,
              initialBalances: microInitialBalances,
              initialDaoBalance: microInitialTreasuryBalance,
              funds: tokenFactoryDenomCreationFee,
            },
          },
        })
      }
    } else {
      // New CW20 / SNIP20
      return (
        isSecret ? SecretSnip20StakedVotingModule : Cw20StakedVotingModule
      ).generateModuleInstantiateInfo(chainId, {
        ...commonConfig,
        token: {
          new: {
            symbol,
            decimals: NEW_DAO_TOKEN_DECIMALS,
            name,
            initialBalances: microInitialBalances,
            initialDaoBalance: microInitialTreasuryBalance,
            marketingInfo: imageUrl ? { logo: { url: imageUrl } } : null,
            unstakingDuration,
          },
        },
      })
    }
  } else {
    if (!existingTokenDenomOrAddress || !existingToken) {
      throw new Error(t('error.missingGovernanceTokenDenom'))
    }

    if (isSecret && !isNative && !existingToken.snip20CodeHash) {
      throw new Error('SNIP20 code hash not found')
    }
    if (isSecret && !isNative && !customStakingCodeHash) {
      throw new Error('Custom staking contract code hash not found')
    }

    return isNative
      ? (isSecret
          ? SecretTokenStakedVotingModule
          : TokenStakedVotingModule
        ).generateModuleInstantiateInfo(chainId, {
          ...commonConfig,
          unstakingDuration,
          token: {
            existing: {
              denom: existingTokenDenomOrAddress,
            },
          },
        })
      : isSecret
        ? SecretSnip20StakedVotingModule.generateModuleInstantiateInfo(
            chainId,
            {
              ...commonConfig,
              token: {
                existing: {
                  address: existingTokenDenomOrAddress,
                  // Type-checked above.
                  codeHash: existingToken!.snip20CodeHash!,
                  stakingContract:
                    customStakingAddress !== undefined
                      ? {
                          existing: {
                            address: customStakingAddress,
                            // Type-checked above.
                            codeHash: customStakingCodeHash!,
                          },
                        }
                      : {
                          new: {
                            unstakingDuration,
                          },
                        },
                },
              },
            }
          )
        : Cw20StakedVotingModule.generateModuleInstantiateInfo(chainId, {
            ...commonConfig,
            token: {
              existing: {
                address: existingTokenDenomOrAddress,
                stakingContract:
                  customStakingAddress !== undefined
                    ? {
                        existing: {
                          address: customStakingAddress,
                        },
                      }
                    : {
                        new: {
                          unstakingDuration,
                        },
                      },
              },
            },
          })
  }
}
