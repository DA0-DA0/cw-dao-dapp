import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ErrorPage404 } from './ErrorPage404'

export default {
  title: 'DAO DAO / packages / stateless / components / error / ErrorPage404',
  component: ErrorPage404,
} as ComponentMeta<typeof ErrorPage404>

const Template: ComponentStory<typeof ErrorPage404> = (args) => (
  <ErrorPage404 {...args} />
)

export const Default = Template.bind({})
