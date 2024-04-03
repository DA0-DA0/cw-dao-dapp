import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Button,
  InputLabel,
  NativeCoinSelector,
  NativeCoinSelectorProps,
  useChain,
} from '@dao-dao/stateless'
import { GenericTokenBalance, LoadingData } from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { getNativeTokenForChainId } from '@dao-dao/utils'

export type CreateValenceAccountData = {
  chainId: string
  funds: { denom: string; amount: number }[]
}

export type CreateValenceAccountOptions = {
  nativeBalances: LoadingData<GenericTokenBalance[]>
}

export const CreateValenceAccountComponent: ActionComponent<
  CreateValenceAccountOptions
> = (props) => {
  const { t } = useTranslation()
  const { chain_id: chainId } = useChain()

  const { control, watch } = useFormContext<CreateValenceAccountData>()
  const {
    fields: coins,
    append: appendCoin,
    remove: removeCoin,
  } = useFieldArray({
    control,
    name: (props.fieldNamePrefix + 'funds') as 'funds',
  })

  return (
    <>
      <div className="flex flex-col gap-2">
        <InputLabel name={t('form.initialBalances')} primary />

        {props.isCreating && (
          <p className="secondary-text mb-1">
            {t('info.minBalanceToCreateAccount', {
              balance: t('format.token', {
                amount: 10,
                symbol: 'NTRN',
              }),
            })}
          </p>
        )}

        {coins.map(({ id }, index) => {
          const isNtrn =
            watch(
              (props.fieldNamePrefix +
                `funds.${index}.denom`) as `funds.${number}.denom`
            ) === 'untrn'

          return (
            <NativeCoinSelector
              key={id + index}
              {...({
                ...props,
                chainId,
                onRemove:
                  // Don't allow removing the first token.
                  props.isCreating && coins.length > 1
                    ? () => removeCoin(index)
                    : undefined,
              } as NativeCoinSelectorProps)}
              errors={props.errors?.funds?.[index]}
              fieldNamePrefix={props.fieldNamePrefix + `funds.${index}.`}
              min={
                // Minimum balance of 10 $NTRN.
                isNtrn ? 10 : undefined
              }
            />
          )
        })}

        {!props.isCreating && coins.length === 0 && (
          <p className="-mt-1 text-xs italic text-text-tertiary">
            {t('info.none')}
          </p>
        )}

        {props.isCreating && (
          <Button
            className="self-start"
            onClick={() =>
              appendCoin({
                amount: 1,
                denom: getNativeTokenForChainId(chainId).denomOrAddress,
              })
            }
            variant="secondary"
          >
            {t('button.addToken')}
          </Button>
        )}
      </div>
    </>
  )
}