import { Cw4VotingModule } from '@dao-dao/state/clients/voting-module/Cw4VotingModule'
import { SecretCw4VotingModule } from '@dao-dao/state/clients/voting-module/Cw4VotingModule.secret'
import { DaoCreatorGetInstantiateInfo } from '@dao-dao/types'
import { Member } from '@dao-dao/types/contracts/DaoVotingCw4'
import { isSecretNetwork } from '@dao-dao/utils'

import { CreatorData } from './types'

export const getInstantiateInfo: DaoCreatorGetInstantiateInfo<CreatorData> = ({
  chainConfig: { chainId },
  data: { tiers },
}) =>
  (isSecretNetwork(chainId)
    ? SecretCw4VotingModule
    : Cw4VotingModule
  ).generateModuleInstantiateInfo(chainId, {
    new: {
      members: tiers.flatMap(({ weight, members }) =>
        members.map(
          ({ address }): Member => ({
            addr: address,
            weight,
          })
        )
      ),
    },
  })
