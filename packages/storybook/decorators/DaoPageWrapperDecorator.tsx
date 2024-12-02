import { DecoratorFn } from '@storybook/react'
import { useMemo } from 'react'

import { DaoPageWrapper } from '@dao-dao/stateful'
import {
  AccountType,
  ChainId,
  ContractVersion,
  DaoInfo,
  PreProposeModuleType,
  ProposalModuleType,
} from '@dao-dao/types'

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
      type: ProposalModuleType.Single,
      contractName: 'crates.io:dao-proposal-single',
      version: ContractVersion.V2Alpha,
      address: 'proposalModuleAddress',
      prefix: 'A',
      prePropose: {
        contractName: 'crates.io:dao-pre-propose-single',
        version: ContractVersion.V2Alpha,
        address: 'preProposeModuleAddress',
        type: PreProposeModuleType.Other,
        submissionPolicy: {
          specific: {
            dao_members: true,
            allowlist: [],
            denylist: [],
          },
        },
      },
      config: {
        veto: null,
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
