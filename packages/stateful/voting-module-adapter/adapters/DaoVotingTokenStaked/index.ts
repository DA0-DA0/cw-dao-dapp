import { PeopleAltOutlined, PeopleAltRounded } from '@mui/icons-material'

import { TokenStakedVotingModule } from '@dao-dao/state/clients'
import { MainDaoInfoCardsTokenLoader } from '@dao-dao/stateless'
import {
  ActionCategoryKey,
  ActionKey,
  ChainId,
  DaoTabId,
  VotingModuleAdapter,
} from '@dao-dao/types'
import {
  DAO_VOTING_NATIVE_STAKED_CONTRACT_NAMES,
  DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES,
  DaoVotingTokenStakedAdapterId,
  isSecretNetwork,
} from '@dao-dao/utils'

import {
  BitSongFantokenMintAction,
  DaoVotingNativeStakedMintAction,
  DaoVotingTokenStakedMintAction,
  UpdateStakingConfigAction,
} from './actions'
import { MembersTab, ProfileCardMemberInfo, StakingModal } from './components'
import { useMainDaoInfoCards } from './hooks'

export const DaoVotingTokenStakedAdapter: VotingModuleAdapter = {
  id: DaoVotingTokenStakedAdapterId,
  contractNames: [
    ...DAO_VOTING_TOKEN_STAKED_CONTRACT_NAMES,
    ...DAO_VOTING_NATIVE_STAKED_CONTRACT_NAMES,
  ],

  load: (votingModule) => ({
    // Hooks
    hooks: {
      useMainDaoInfoCards,
      useVotingModuleRelevantAddresses: () => [],
    },

    // Components
    components: {
      MainDaoInfoCardsLoader: MainDaoInfoCardsTokenLoader,
      ProfileCardMemberInfo,
      StakingModal,

      // Can't view members on Secret Network.
      extraTabs: isSecretNetwork(votingModule.chainId)
        ? undefined
        : [
            {
              id: DaoTabId.Members,
              labelI18nKey: 'title.members',
              Component: MembersTab,
              Icon: PeopleAltOutlined,
              IconFilled: PeopleAltRounded,
            },
          ],
    },

    // Functions
    fields: {
      actions: {
        actions: [
          ...(votingModule.chainId === ChainId.BitsongMainnet ||
          votingModule.chainId === ChainId.BitsongTestnet
            ? [BitSongFantokenMintAction]
            : [
                votingModule instanceof TokenStakedVotingModule
                  ? DaoVotingTokenStakedMintAction
                  : DaoVotingNativeStakedMintAction,
              ]),
          UpdateStakingConfigAction,
        ],
        categoryMakers: [
          // Add to DAO Governance category.
          () => ({
            key: ActionCategoryKey.DaoGovernance,
            actionKeys: [ActionKey.Mint, ActionKey.UpdateStakingConfig],
          }),
        ],
      },
    },
  }),
}
