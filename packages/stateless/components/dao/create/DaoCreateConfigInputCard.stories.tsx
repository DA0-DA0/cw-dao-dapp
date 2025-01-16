import { ComponentMeta, ComponentStory } from '@storybook/react'
import { useForm } from 'react-hook-form'

import { SuspenseLoader, makeDefaultNewDao } from '@dao-dao/stateful'
import { VotingDurationInput } from '@dao-dao/stateful/components/dao/commonVotingConfig/VotingDurationVotingConfigItem'
import { CHAIN_ID } from '@dao-dao/storybook'
import { NewDao } from '@dao-dao/types'

import { HourglassEmoji } from '../../emoji'
import { DaoCreateConfigInputCard } from './DaoCreateConfigInputCard'

export default {
  title:
    'DAO DAO / packages / stateless / components / dao / create / DaoCreateConfigInputCard',
  component: DaoCreateConfigInputCard,
  decorators: [],
} as ComponentMeta<typeof DaoCreateConfigInputCard>

const Template: ComponentStory<typeof DaoCreateConfigInputCard> = (args) => {
  const { register, watch, setValue, getValues } = useForm<NewDao>({
    defaultValues: makeDefaultNewDao(CHAIN_ID),
    mode: 'onChange',
  })

  const newDao = watch()

  return (
    <div className="max-w-xs">
      <DaoCreateConfigInputCard
        {...args}
        input={
          <VotingDurationInput
            data={newDao.proposalModuleAdapters[0].data}
            fieldNamePrefix="proposalModuleAdapters.0.data."
            getValues={(fieldNameOrNames?: string | readonly string[]) =>
              fieldNameOrNames === undefined
                ? getValues()
                : typeof fieldNameOrNames === 'string'
                  ? getValues(
                      ('proposalModuleAdapters.0.data.' +
                        fieldNameOrNames) as `proposalModuleAdapters.${number}.data.${string}`
                    )
                  : getValues(
                      fieldNameOrNames.map(
                        (fieldName) =>
                          ('proposalModuleAdapters.0.data.' +
                            fieldName) as `proposalModuleAdapters.${number}.data.${string}`
                      )
                    )
            }
            newDao={newDao}
            register={(fieldName, options) =>
              register(
                (`proposalModuleAdapters.0.data.` +
                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                options
              )
            }
            setValue={(fieldName, value, options) =>
              setValue(
                (`proposalModuleAdapters.0.data.` +
                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`,
                value,
                options
              )
            }
            watch={(fieldName) =>
              watch(
                (`proposalModuleAdapters.0.data.` +
                  fieldName) as `proposalModuleAdapters.${number}.data.${string}`
              )
            }
          />
        }
      />
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  Icon: HourglassEmoji,
  name: 'Voting duration',
  description:
    'The amount of time proposals are open for voting. A low proposal duration may increase the speed at which your DAO can pass proposals. Setting the duration too low may make it diffcult for proposals to pass as voters will have limited time to vote. After this time elapses, the proposal will either pass or fail.',
  SuspenseLoader,
}
Default.parameters = {
  design: {
    type: 'figma',
    url: 'https://www.figma.com/file/ZnQ4SMv8UUgKDZsR5YjVGH/Dao-2.0?node-id=782%3A46355',
  },
}
