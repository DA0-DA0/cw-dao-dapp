import { ComponentMeta, ComponentStory } from '@storybook/react'
import { useState } from 'react'

import { IconButtonLink } from '../icon_buttons'
import { LinkWrapper } from '../LinkWrapper'
import { DaoCard } from './DaoCard'
import { Default as FeaturedDaosStory } from './FeaturedDaos.stories'
import { PinnedDaos } from './PinnedDaos'

export default {
  title: 'DAO DAO / packages / stateless / components / dao / PinnedDaos',
  component: PinnedDaos,
} as ComponentMeta<typeof PinnedDaos>

const Template: ComponentStory<typeof PinnedDaos> = (args) => {
  const [pinned, setPinned] = useState<string[]>([])

  return (
    <PinnedDaos
      {...args}
      DaoCard={(props) => (
        <DaoCard
          {...props}
          IconButtonLink={IconButtonLink}
          LinkWrapper={LinkWrapper}
          onPin={() =>
            setPinned((current) =>
              current.includes(props.coreAddress)
                ? current.filter((a) => a !== props.coreAddress)
                : [...current, props.coreAddress]
            )
          }
          pinned={pinned.includes(props.coreAddress)}
        />
      )}
    />
  )
}

export const Default = Template.bind({})
Default.args = {
  pinnedDaos: FeaturedDaosStory.args!.featuredDaos!,
}
