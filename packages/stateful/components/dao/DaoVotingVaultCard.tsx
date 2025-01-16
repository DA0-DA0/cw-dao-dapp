import { HugeDecimal } from '@dao-dao/math'
import { neutronVaultQueries } from '@dao-dao/state'
import {
  DaoVotingVaultCard as StatelessDaoVotingVaultCard,
  useChain,
} from '@dao-dao/stateless'
import { StatefulDaoVotingVaultCardProps } from '@dao-dao/types'

import { useQueryLoadingDataWithError, useWallet } from '../../hooks'

export const DaoVotingVaultCard = (props: StatefulDaoVotingVaultCardProps) => {
  const { chainId } = useChain()
  const { address } = useWallet()

  const loadingWalletVotingPower = useQueryLoadingDataWithError(
    address
      ? neutronVaultQueries.votingPowerAtHeight({
          chainId,
          contractAddress: props.vault.address,
          args: {
            address,
          },
        })
      : undefined
  )

  return (
    <StatelessDaoVotingVaultCard
      vaultVotingPowerPercent={
        props.totalVotingPower.loading
          ? {
              loading: true,
            }
          : {
              loading: false,
              data:
                props.totalVotingPower.data === 0
                  ? 0
                  : props.vault.totalPower
                      .div(props.totalVotingPower.data)
                      .times(100)
                      .toNumber(),
            }
      }
      walletVotingPowerPercent={
        !address
          ? {
              loading: false,
              data: undefined,
            }
          : loadingWalletVotingPower.loading || loadingWalletVotingPower.errored
            ? {
                loading: true,
              }
            : {
                loading: false,
                data: props.vault.totalPower.isZero()
                  ? 0
                  : HugeDecimal.from(loadingWalletVotingPower.data.power)
                      .div(props.vault.totalPower)
                      .times(100)
                      .toNumber(),
              }
      }
      {...props}
    />
  )
}
