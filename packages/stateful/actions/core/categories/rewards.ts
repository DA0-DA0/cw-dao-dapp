import {
  ActionCategoryKey,
  ActionCategoryMaker,
  ActionContextType,
  ActionKey,
} from '@dao-dao/types'

export const makeRewardsActionCategory: ActionCategoryMaker = ({
  t,
  context,
}) =>
  // Only DAOs.
  context.type === ActionContextType.Dao
    ? {
        key: ActionCategoryKey.Rewards,
        label: t('actionCategory.rewardsLabel'),
        description: t('actionCategory.rewardsDescription'),
        actionKeys: [
          ActionKey.FixRewardDistributor,
          ActionKey.CreateRewardDistribution,
          ActionKey.UpdateRewardDistribution,
          ActionKey.FundRewardDistribution,
          ActionKey.WithdrawRewardDistribution,
          ActionKey.PauseRewardDistribution,
          ActionKey.ResumeRewardDistribution,
        ],
      }
    : null
