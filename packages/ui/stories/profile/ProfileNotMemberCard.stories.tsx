import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ProfileNotMemberCard } from 'components/profile/ProfileNotMemberCard'

export default {
  title: 'DAO DAO UI V2 / profile / ProfileNotMemberCard',
  component: ProfileNotMemberCard,
} as ComponentMeta<typeof ProfileNotMemberCard>

const Template: ComponentStory<typeof ProfileNotMemberCard> = (args) => (
  <div className="max-w-[320px]">
    <ProfileNotMemberCard {...args} />
  </div>
)

export const Default = Template.bind({})
Default.args = {
  tokenSymbol: 'DOG',
  tokenBalance: 0,
  daoName: 'Dog Dao',
  walletName: '@Modern-Edamame',
  profileImgUrl: '/dog_nft.png',
  established: new Date(),
}

Default.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/DAO-DAO-2.0?node-id=94%3A14852',
  },
}
