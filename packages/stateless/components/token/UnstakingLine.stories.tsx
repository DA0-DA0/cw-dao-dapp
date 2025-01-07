import { ComponentMeta, ComponentStory } from '@storybook/react'

import { HugeDecimal } from '@dao-dao/math'

import { Button } from '../buttons/Button'
import { token } from './TokenCard.stories'
import { UnstakingLine, UnstakingLineProps } from './UnstakingLine'
import { UnstakingTaskStatus } from './UnstakingStatus'

export default {
  title: 'DAO DAO / packages / stateless / components / token / UnstakingLine',
  component: UnstakingLine,
  excludeStories: ['makeProps'],
} as ComponentMeta<typeof UnstakingLine>

const Template: ComponentStory<typeof UnstakingLine> = (args) => (
  <UnstakingLine {...args} />
)

export const makeProps = (
  status: UnstakingTaskStatus,
  tokenSymbol = 'DOG'
): UnstakingLineProps => ({
  task: {
    token: {
      ...token,
      symbol: tokenSymbol,
    },
    status,
    // Random number between 0 and 1000, with up to 6 decimals.
    amount: HugeDecimal.from(Math.floor(Math.random() * (1000 * 1e6) + 1e6)),
    date: new Date(
      Date.now() +
        Math.random() *
          // Random date in past 7 days.
          (status === UnstakingTaskStatus.ReadyToClaim
            ? -7
            : // Random date in past 3 months.
              status === UnstakingTaskStatus.Claimed
              ? -3 * 30
              : // Random date in next 14 days.
                14) *
          // 1 day in milliseconds
          24 *
          60 *
          60 *
          1000
    ),
  },
})

export const Unstaking = Template.bind({})
Unstaking.args = makeProps(UnstakingTaskStatus.Unstaking)
Unstaking.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/DAO-DAO-2.0?node-id=321%3A35845',
  },
}

export const ReadyToClaim = Template.bind({})
ReadyToClaim.args = makeProps(UnstakingTaskStatus.ReadyToClaim)
ReadyToClaim.parameters = Unstaking.parameters

export const Claimed = Template.bind({})
Claimed.args = {
  ...makeProps(UnstakingTaskStatus.Claimed),
  dateReplacement: <Button onClick={() => alert('claim')}>Claim</Button>,
}
Claimed.parameters = Unstaking.parameters
