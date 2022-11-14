import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ReactHookFormDecorator } from '@dao-dao/storybook'

import { AddCw20Component } from './AddCw20'

export default {
  title: 'DAO DAO / packages / stateful / actions / components / AddCw20',
  component: AddCw20Component,
  decorators: [ReactHookFormDecorator],
} as ComponentMeta<typeof AddCw20Component>

const Template: ComponentStory<typeof AddCw20Component> = (args) => (
  <AddCw20Component {...args} />
)

export const Default = Template.bind({})
Default.args = {
  fieldNamePrefix: '',
  allActionsWithData: [],
  index: 0,
  data: {},
  isCreating: true,
  onRemove: () => alert('remove'),
  errors: {},
  options: {
    formattedJsonDisplayProps: {
      jsonLoadable: {
        state: 'loading',
      } as any,
    },
  },
}
