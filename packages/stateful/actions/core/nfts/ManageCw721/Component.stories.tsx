import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ReactHookFormDecorator } from '@dao-dao/storybook'

import { ManageCw721Component } from './Component'

export default {
  title: 'DAO DAO / packages / stateful / actions / core / nfts / ManageCw721',
  component: ManageCw721Component,
  decorators: [ReactHookFormDecorator],
} as ComponentMeta<typeof ManageCw721Component>

const Template: ComponentStory<typeof ManageCw721Component> = (args) => (
  <ManageCw721Component {...args} />
)

export const Default = Template.bind({})
Default.args = {
  fieldNamePrefix: '',
  allActionsWithData: [],
  index: 0,
  data: {},
  isCreating: true,
  errors: {},
  options: {
    existingTokens: [],
    formattedJsonDisplayProps: {
      title: 'Token info',
      jsonLoadable: {
        state: 'loading',
      } as any,
    },
  },
}
