import { ComponentMeta, ComponentStory } from '@storybook/react'

import { AddressInput } from '@dao-dao/stateless'
import {
  makeDaoInfo,
  makeDaoProvidersDecorator,
  makeReactHookFormDecorator,
} from '@dao-dao/storybook/decorators'
import { TokenType } from '@dao-dao/types'
import { NATIVE_DENOM } from '@dao-dao/utils'

import {
  AuthorizationTypeUrl,
  AuthzData,
  FilterTypes,
  LimitTypes,
} from '../actions/AuthzAuthorization'
import { AuthzAuthorizationComponent } from './AuthzAuthorization'

export default {
  title:
    'DAO DAO / packages / stateful / actions / components / AuthzAuthorization',
  component: AuthzAuthorizationComponent,
  decorators: [
    makeReactHookFormDecorator<AuthzData>({
      authorizationTypeUrl: AuthorizationTypeUrl.Generic,
      customTypeUrl: false,
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      grantee: 'juno1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8lyv94w',
      msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      contract: '',
      filterType: FilterTypes.All,
      filterKeys: '',
      filterMsg: '{}',
      funds: [],
      limitType: LimitTypes.Calls,
      calls: 10,
    }),
    makeDaoProvidersDecorator(makeDaoInfo()),
  ],
} as ComponentMeta<typeof AuthzAuthorizationComponent>

const Template: ComponentStory<typeof AuthzAuthorizationComponent> = (args) => (
  <AuthzAuthorizationComponent {...args} />
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
    AddressInput,
    balances: {
      loading: false,
      data: [
        {
          token: {
            type: TokenType.Native,
            denomOrAddress: NATIVE_DENOM,
            decimals: 6,
            symbol: 'JUNO',
            imageUrl: '',
          },
          balance: '1231245124',
        },
        {
          token: {
            type: TokenType.Native,
            denomOrAddress: 'uatom',
            decimals: 6,
            symbol: 'ATOM',
            imageUrl: '',
          },
          balance: '984129741',
        },
      ],
    },
  },
}
