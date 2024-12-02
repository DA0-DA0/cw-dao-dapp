import { ComponentMeta, ComponentStory } from '@storybook/react'

import { CHAIN_ID } from '@dao-dao/storybook'
import { ContractVersion, DaoCardProps, DaoInfo } from '@dao-dao/types'

import { LinkWrapper } from '../LinkWrapper'
import { DaoCard } from './DaoCard'

export default {
  title: 'DAO DAO / packages / stateless / components / dao / DaoCard',
  component: DaoCard,
  excludeStories: ['makeDaoInfo', 'makeDaoCardProps'],
} as ComponentMeta<typeof DaoCard>

const Template: ComponentStory<typeof DaoCard> = (args) => (
  <div className="max-w-xs">
    <DaoCard {...args} />
  </div>
)

export const makeDaoInfo = (id = 1): DaoInfo => ({
  chainId: CHAIN_ID,
  coreAddress: 'coreAddress' + ++id,
  coreVersion: ContractVersion.V2Alpha,
  name: 'Modern DAO ' + id,
  description:
    'This approach allows us to implement a completely custom component design without writing a single line of custom CSS.',
  imageUrl: `/placeholders/${(id % 5) + 1}.svg`,
  polytoneProxies: {},
  parentDao: {
    chainId: CHAIN_ID,
    coreAddress: 'parent',
    coreVersion: ContractVersion.V2Alpha,
    name: 'parent',
    imageUrl: `/placeholders/${((id + 1) % 5) + 1}.svg`,
    admin: 'parent',
    registeredSubDao: true,
    parentDao: null,
    polytoneProxy: null,
  },
  votingModuleAddress: '',
  votingModuleInfo: {
    contract: '',
    version: '',
  },
  proposalModules: [],
  // Random date in the past 12 months.
  created:
    Date.now() - Math.floor(Math.random() * 12 * 30 * 24 * 60 * 60 * 1000),
  isActive: true,
  activeThreshold: null,
  items: {},
  accounts: [],
  admin: '',
  contractAdmin: null,
})

export const makeDaoCardProps = (id = 1): DaoCardProps => ({
  info: makeDaoInfo(id),
  follow: {
    following: false,
    onFollow: () => alert('follow'),
    updatingFollowing: false,
  },
  lazyData: {
    loading: false,
    errored: false,
    data: {
      proposalCount: 25,
      tokenWithBalance: {
        balance: 120,
        symbol: 'USD',
        decimals: 2,
      },
    },
  },
  isMember: true,
  LinkWrapper,
})

export const Default = Template.bind({})
Default.args = makeDaoCardProps()
Default.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/DAO-DAO-2.0?node-id=77%3A9575',
  },
}

export const Loading = Template.bind({})
Loading.args = {
  ...makeDaoCardProps(),
  lazyData: { loading: true, errored: false },
}
Loading.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/DAO-DAO-2.0?node-id=77%3A9575',
  },
}
