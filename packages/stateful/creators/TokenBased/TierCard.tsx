import { Add, Close } from '@mui/icons-material'
import {
  Control,
  FormState,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  useFieldArray,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { HugeDecimal } from '@dao-dao/math'
import {
  Button,
  IconButton,
  InputErrorMessage,
  InputLabel,
  NumericInput,
  TextInput,
  TooltipInfoIcon,
  useChain,
} from '@dao-dao/stateless'
import { NewDao } from '@dao-dao/types'
import {
  DISTRIBUTION_COLORS,
  NEW_DAO_TOKEN_DECIMALS,
  formatPercentOf100,
  makeValidateAddress,
  validatePercent,
  validatePositive,
  validateRequired,
} from '@dao-dao/utils'

import { AddressInput } from '../../components/AddressInput'
import { CreatorData } from './types'

export interface TierCardProps {
  data: CreatorData
  tierIndex: number
  // Display color dots next to each member instead of each tier.
  // When there is only one tier, all members are displayed on the chart,
  // so the colors correspond to members instead of tiers.
  showColorDotOnMember: boolean
  control: Control<NewDao<CreatorData>>
  register: UseFormRegister<NewDao<CreatorData>>
  watch: UseFormWatch<NewDao<CreatorData>>
  errors: FormState<NewDao<CreatorData>>['errors']
  setValue: UseFormSetValue<NewDao<CreatorData>>
  getValues: UseFormGetValues<NewDao<CreatorData>>
  remove?: () => void
}

export const TierCard = ({
  // Don't pass along to member.
  remove,

  ...props
}: TierCardProps) => {
  const {
    data,
    tierIndex,
    control,
    register,
    watch,
    errors,
    setValue,
    getValues,
    showColorDotOnMember,
  } = props

  const { t } = useTranslation()
  const { bech32Prefix } = useChain()

  const {
    fields: members,
    append: appendMember,
    remove: removeMember,
  } = useFieldArray({
    control,
    name: `creator.data.tiers.${tierIndex}.members`,
  })

  const tierColor = DISTRIBUTION_COLORS[tierIndex % DISTRIBUTION_COLORS.length]
  const tierVotingWeight = data.tiers?.[tierIndex]?.weight ?? 0

  return (
    <div className="rounded-lg bg-background-tertiary">
      <div className="flex h-14 flex-row items-center justify-between border-b border-border-base p-4">
        <div className="flex flex-row items-center gap-3">
          {!showColorDotOnMember && (
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: tierColor,
              }}
            ></div>
          )}

          <p className="primary-text text-text-body">
            {data.tiers[tierIndex].name.trim() ||
              t('title.tierNum', { tier: tierIndex + 1 })}
          </p>
        </div>

        {remove && (
          <IconButton
            Icon={Close}
            iconClassName="text-icon-secondary"
            onClick={remove}
            variant="ghost"
          />
        )}
      </div>

      <div className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
        <div className="flex grow flex-col border-b border-border-secondary p-6 sm:border-r sm:border-b-0">
          <InputLabel
            containerProps={{ className: 'mb-2' }}
            name={t('form.tierNameTitle')}
            tooltip={t('form.tierNameTooltip')}
          />

          <TextInput
            error={errors.creator?.data?.tiers?.[tierIndex]?.name}
            fieldName={`creator.data.tiers.${tierIndex}.name`}
            placeholder={t('form.tierNameTitle') + '...'}
            register={register}
            validation={[validateRequired]}
          />

          <InputErrorMessage
            error={errors.creator?.data?.tiers?.[tierIndex]?.name}
          />
        </div>

        <div className="flex grow flex-col p-6">
          <InputLabel
            containerProps={{ className: 'mb-2' }}
            name={t('form.percentOfTotalSupply')}
            tooltip={t('form.percentOfTotalSupplyTooltip', {
              weight: formatPercentOf100(tierVotingWeight),
            })}
          />

          <div className="flex flex-row items-center gap-2">
            <NumericInput
              containerClassName="grow"
              error={errors.creator?.data?.tiers?.[tierIndex]?.weight}
              fieldName={`creator.data.tiers.${tierIndex}.weight`}
              getValues={getValues}
              max={100}
              min={0}
              numericValue
              register={register}
              setValue={setValue}
              validation={[validatePercent, validatePositive, validateRequired]}
            />
            <InputLabel name="%" />
          </div>

          <InputErrorMessage
            error={errors.creator?.data?.tiers?.[tierIndex]?.weight}
          />
        </div>
      </div>

      <div className="flex flex-col border-t border-border-secondary p-6">
        <InputLabel
          containerProps={{ className: 'mb-2' }}
          name={t('title.members')}
        />

        <div className="flex flex-col items-stretch gap-1">
          {members.map(({ id }, memberIndex) => (
            <div
              key={id}
              className="flex flex-row items-center gap-4 rounded-lg bg-background-secondary p-4"
            >
              <div className="grow">
                <div className="flex flex-row items-center gap-4">
                  {showColorDotOnMember && (
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          DISTRIBUTION_COLORS[
                            memberIndex % DISTRIBUTION_COLORS.length
                          ],
                      }}
                    ></div>
                  )}

                  <AddressInput
                    containerClassName="grow"
                    error={
                      errors.creator?.data?.tiers?.[tierIndex]?.members?.[
                        memberIndex
                      ]?.address
                    }
                    fieldName={`creator.data.tiers.${tierIndex}.members.${memberIndex}.address`}
                    placeholder={t('form.membersAddress')}
                    register={register}
                    setValue={setValue}
                    validation={[
                      validateRequired,
                      makeValidateAddress(bech32Prefix),
                    ]}
                    watch={watch}
                  />
                </div>

                <InputErrorMessage
                  error={
                    errors.creator?.data?.tiers?.[tierIndex]?.members?.[
                      memberIndex
                    ]?.address
                  }
                />
              </div>

              <TooltipInfoIcon
                title={t('info.tierMemberGovTokenAllocationTooltip', {
                  tokens: HugeDecimal.fromHumanReadable(
                    data.newInfo.initialSupply,
                    NEW_DAO_TOKEN_DECIMALS
                  )
                    .times(tierVotingWeight)
                    .div(members.length)
                    .div(100)
                    .toFormattedString({
                      decimals: NEW_DAO_TOKEN_DECIMALS,
                    }),
                  tokenSymbol: data.newInfo.symbol || t('info.tokens'),
                })}
              />

              <IconButton
                Icon={Close}
                iconClassName="text-icon-secondary"
                onClick={() => removeMember(memberIndex)}
                size="sm"
                variant="ghost"
              />
            </div>
          ))}

          <Button
            className="mt-1 self-start"
            onClick={() => appendMember({ address: '' })}
            variant="ghost"
          >
            <Add className="!h-6 !w-6 text-icon-secondary" />
            <p>{t('button.addMember')}</p>
          </Button>

          <InputErrorMessage
            error={errors.creator?.data?.tiers?.[tierIndex]?._error}
          />
        </div>
      </div>
    </div>
  )
}
