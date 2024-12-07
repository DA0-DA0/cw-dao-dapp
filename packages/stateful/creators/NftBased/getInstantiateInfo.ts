import {
  Cw721StakedVotingModule,
  OnftStakedVotingModule,
} from '@dao-dao/state/clients'
import { SecretSnip721StakedVotingModule } from '@dao-dao/state/clients/voting-module/Snip721StakedVotingModule.secret'
import { ChainId, DaoCreatorGetInstantiateInfo } from '@dao-dao/types'
import {
  convertDurationWithUnitsToDuration,
  isSecretNetwork,
} from '@dao-dao/utils'

import { CreatorData } from './types'

export const getInstantiateInfo: DaoCreatorGetInstantiateInfo<CreatorData> = ({
  chainConfig: { chainId },
  data: {
    existingGovernanceNftCollectionAddress,
    secretCodeHash,
    unstakingDuration,
    activeThreshold,
  },
}) => {
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
              count: BigInt(activeThreshold.value).toString(),
            },
          }
      : null,

    unstakingDuration: convertDurationWithUnitsToDuration(unstakingDuration),
  }

  if (isSecretNetwork(chainId)) {
    if (!secretCodeHash) {
      throw new Error('SNIP721 code hash is missing')
    }

    return SecretSnip721StakedVotingModule.generateModuleInstantiateInfo(
      chainId,
      {
        ...commonConfig,
        nft: {
          existing: {
            address: existingGovernanceNftCollectionAddress,
            codeHash: secretCodeHash,
          },
        },
      }
    )
  } else if (
    chainId === ChainId.OmniflixHubMainnet ||
    chainId === ChainId.OmniflixHubTestnet
  ) {
    return OnftStakedVotingModule.generateModuleInstantiateInfo(chainId, {
      ...commonConfig,
      onft: {
        existing: {
          id: existingGovernanceNftCollectionAddress,
        },
      },
    })
  } else {
    return Cw721StakedVotingModule.generateModuleInstantiateInfo(chainId, {
      ...commonConfig,
      nft: {
        existing: {
          address: existingGovernanceNftCollectionAddress,
        },
      },
    })
  }
}
