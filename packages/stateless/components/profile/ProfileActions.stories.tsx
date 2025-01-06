import { ComponentMeta, ComponentStory } from '@storybook/react'
import { FormProvider, useForm } from 'react-hook-form'

import { SuspenseLoader, WalletChainSwitcher } from '@dao-dao/stateful'
import {
  WalletActionsProviderDecorator,
  WalletProviderDecorator,
  makeDappLayoutDecorator,
} from '@dao-dao/storybook/decorators'
import { AccountTxForm, ActionKey } from '@dao-dao/types'

import { ProfileActions } from './ProfileActions'

export default {
  title: 'DAO DAO / packages / stateless / pages / ProfileActions',
  component: ProfileActions,
  decorators: [
    WalletProviderDecorator,
    makeDappLayoutDecorator(),
    WalletActionsProviderDecorator,
  ],
} as ComponentMeta<typeof ProfileActions>

const Template: ComponentStory<typeof ProfileActions> = (args) => {
  const formMethods = useForm<AccountTxForm>({
    mode: 'onChange',
    defaultValues: {
      actions: [],
    },
  })

  return (
    <FormProvider {...formMethods}>
      <ProfileActions {...args} />
    </FormProvider>
  )
}

export const Default = Template.bind({})
Default.args = {
  execute: async (data) => {
    console.log('execute!', data)
    alert('executed')
  },
  SuspenseLoader,
  saves: {
    loading: false,
    data: [
      {
        name: 'Deposit $10',
        description:
          'Send $10 USDC to my DAO. This is a very long description. I wish it were shorter.',
        actions: [
          {
            _id: 'spend1',
            actionKey: ActionKey.Spend,
            data: {},
          },
        ],
      },
    ],
  },
  save: async (data) => {
    alert('save ' + JSON.stringify(data, null, 2))
    return true
  },
  deleteSave: async (data) => {
    alert('delete ' + JSON.stringify(data, null, 2))
    return true
  },
  saving: false,
  WalletChainSwitcher,
}

export const LoadingSaves = Template.bind({})
LoadingSaves.args = {
  ...Default.args,
  saves: {
    loading: true,
  },
}

export const NoSaves = Template.bind({})
NoSaves.args = {
  ...Default.args,
  saves: {
    loading: false,
    data: [],
  },
}
