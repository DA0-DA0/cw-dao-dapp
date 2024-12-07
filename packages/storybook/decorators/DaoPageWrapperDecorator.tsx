import { DecoratorFn } from '@storybook/react'
import { useMemo } from 'react'

import { DaoPageWrapper } from '@dao-dao/stateful'
import { AccountType, ChainId, ContractVersion, DaoInfo } from '@dao-dao/types'

export const makeDaoInfo = (): DaoInfo => ({
  chainId: ChainId.JunoMainnet,
  coreAddress: 'junoDaoCoreAddress',
  coreVersion: ContractVersion.V2Alpha,
  votingModuleAddress: 'votingModuleAddress',
  votingModuleInfo: {
    contract: 'crates.io:dao-voting-cw20-staked',
    version: ContractVersion.V2Alpha,
  },
  proposalModules: [
    {
      address: 'proposalModuleAddress',
      prefix: 'A',
      status: 'enabled',
      info: {
        contract: 'crates.io:dao-proposal-single',
        version: ContractVersion.V2Alpha,
      },
    },
  ],
  name: 'A Very Real DAO',
  description:
    'This DAO does really important stuff. And sometimes **things**. But *mostly* stuff.',
  imageUrl: 'https://moonphase.is/image.svg',
  // Random date in the past 12 months.
  created:
    Date.now() - Math.floor(Math.random() * 12 * 30 * 24 * 60 * 60 * 1000),
  isActive: true,
  activeThreshold: null,
  items: {},
  polytoneProxies: {},
  accounts: [
    {
      type: AccountType.Base,
      chainId: ChainId.JunoMainnet,
      address: 'junoDaoCoreAddress',
    },
  ],
  parentDao: null,
  admin: '',
  contractAdmin: null,
})

export const DaoPageWrapperDecorator: DecoratorFn = (Story) => {
  const info: DaoInfo = useMemo(makeDaoInfo, [])

  return (
    <DaoPageWrapper
      description={info.description}
      info={info}
      title={info.name}
    >
      <Story />
    </DaoPageWrapper>
  )
}
