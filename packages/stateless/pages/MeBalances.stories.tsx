import { ComponentMeta, ComponentStory } from '@storybook/react'

import { WalletTokenLine } from '@dao-dao/stateful'
import { TokenCardProps } from '@dao-dao/types'

import { NftCard, NftCardProps } from '../components/NftCard'
import { makeProps as makeNftCardProps } from '../components/NftCard.stories'
import { makeProps as makeTokenCardProps } from '../components/token/TokenCard.stories'
import { MeBalances } from './MeBalances'

export default {
  title: 'DAO DAO / packages / stateless / pages / MeBalances',
  component: MeBalances,
} as ComponentMeta<typeof MeBalances<TokenCardProps, NftCardProps>>

const Template: ComponentStory<
  typeof MeBalances<TokenCardProps, NftCardProps>
> = (args) => <MeBalances {...args} />

export const Default = Template.bind({})
Default.args = {
  tokens: {
    loading: false,
    data: [makeTokenCardProps(true), makeTokenCardProps()],
  },
  hiddenTokens: {
    loading: false,
    data: [],
  },
  TokenLine: WalletTokenLine,
  nfts: {
    loading: false,
    data: [
      makeNftCardProps(),
      makeNftCardProps(),
      makeNftCardProps(),
      makeNftCardProps(),
      makeNftCardProps(),
    ],
  },
  NftCard,
}

export const Loading = Template.bind({})
Loading.args = {
  tokens: { loading: true },
  hiddenTokens: { loading: true },
  TokenLine: WalletTokenLine,
  nfts: { loading: true },
  NftCard,
}
