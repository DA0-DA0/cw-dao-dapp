import { ComponentMeta, ComponentStory } from '@storybook/react'

import { makeAppLayoutDecorator } from '@dao-dao/storybook/decorators'

import {
  ProfileHomeCard,
  ProfileHomeCardProps,
  ProposalLine,
  ProposalLineProps,
} from '../components'
import { DefaultArgs as NavigationStoryArgs } from '../components/layout/Navigation.stories'
import { Default as ProfileHomeCardStory } from '../components/profile/ProfileHomeCard.stories'
import { makeProps as makeProposalLineProps } from '../components/proposal/ProposalLine.ProposalLine.stories'
import { Inbox } from './Inbox'

export default {
  title: 'DAO DAO / packages / stateless / pages / Inbox',
  component: Inbox,
  decorators: [makeAppLayoutDecorator()],
} as ComponentMeta<typeof Inbox>

const Template: ComponentStory<typeof Inbox<ProposalLineProps>> = (args) => (
  <Inbox {...args} />
)

export const Default = Template.bind({})
Default.args = {
  daosWithProposals: {
    loading: false,
    data: NavigationStoryArgs.pinnedDaos.loading
      ? []
      : NavigationStoryArgs.pinnedDaos.data.map((dao) => ({
          dao,
          // Generate between 1 and 3 proposals.
          proposals: [...Array(Math.floor(Math.random() * 3) + 1)].map(() => {
            // Random time in the next 3 days.
            const secondsRemaining = Math.floor(
              Math.random() * 3 * 24 * 60 * 60
            )
            return makeProposalLineProps(secondsRemaining)
          }),
        })),
  },
  rightSidebarContent: (
    <ProfileHomeCard {...(ProfileHomeCardStory.args as ProfileHomeCardProps)} />
  ),
  ProposalLine,
}
Default.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/DAO-DAO-2.0?node-id=308%3A29063',
  },
  nextRouter: {
    asPath: '/inbox',
  },
}

export const Loading = Template.bind({})
Loading.args = {
  daosWithProposals: {
    loading: true,
  },
  rightSidebarContent: (
    <ProfileHomeCard {...(ProfileHomeCardStory.args as ProfileHomeCardProps)} />
  ),
  ProposalLine,
}
