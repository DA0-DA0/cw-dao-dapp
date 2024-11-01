import {
  ActionCategoryKey,
  ActionCategoryMaker,
  ActionKey,
} from '@dao-dao/types'

export const makeCommonlyUsedCategory: ActionCategoryMaker = ({ t }) => ({
  key: ActionCategoryKey.CommonlyUsed,
  label: t('actionCategory.commonlyUsedLabel'),
  description: t('actionCategory.commonlyUsedDescription'),
  actionKeys: [
    ActionKey.FixRewardDistributor,
    ActionKey.UpgradeV1ToV2,
    ActionKey.Spend,
    ActionKey.ManageStaking,
    ActionKey.CreateCrossChainAccount,
    ActionKey.ManageVesting,
    ActionKey.AuthzGrantRevoke,
    ActionKey.GovernanceVote,
    ActionKey.Execute,
    ActionKey.Instantiate,
    ActionKey.ConfigureVestingPayments,
  ],
})
