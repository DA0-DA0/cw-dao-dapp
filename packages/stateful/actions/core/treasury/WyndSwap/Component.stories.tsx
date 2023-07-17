import { ComponentMeta, ComponentStory } from '@storybook/react'

import {
  CHAIN_ID,
  makeDaoInfo,
  makeDaoProvidersDecorator,
  makeReactHookFormDecorator,
} from '@dao-dao/storybook'
import { getNativeIbcUsdc, getNativeTokenForChainId } from '@dao-dao/utils'

import { AddressInput } from '../../../../components'
import { WyndSwapComponent, WyndSwapData } from './Component'

export default {
  title: 'DAO DAO / packages / stateful / actions / core / treasury / WyndSwap',
  component: WyndSwapComponent,
  decorators: [
    makeReactHookFormDecorator<WyndSwapData>({
      tokenIn: getNativeTokenForChainId(CHAIN_ID),
      tokenInAmount: 0,
      tokenOut: getNativeIbcUsdc(CHAIN_ID)!,
      tokenOutAmount: 0,
      minOutAmount: 0,
      swapOperations: undefined,
      receiver: '',
    }),
    makeDaoProvidersDecorator(makeDaoInfo()),
  ],
} as ComponentMeta<typeof WyndSwapComponent>

const Template: ComponentStory<typeof WyndSwapComponent> = (args) => (
  <WyndSwapComponent {...args} />
)

export const Default = Template.bind({})
Default.args = {
  fieldNamePrefix: '',
  allActionsWithData: [],
  index: 0,
  options: {
    loadingBalances: {
      loading: false,
      data: [],
    },
    loadingWyndTokens: {
      loading: false,
      data: [],
    },
    simulatingValue: undefined,
    estUsdPrice: { loading: true },
    AddressInput,
  },
  isCreating: true,
  errors: {},
}
