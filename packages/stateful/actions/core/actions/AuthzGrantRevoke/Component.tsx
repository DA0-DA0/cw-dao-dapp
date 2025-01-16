import { Check, Close } from '@mui/icons-material'
import JSON5 from 'json5'
import { ComponentType } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  Button,
  CodeMirrorInput,
  FormSwitchCard,
  InputErrorMessage,
  InputLabel,
  NativeCoinSelector,
  NumericInput,
  RadioInput,
  SegmentedControlsTitle,
  SelectInput,
  StatusCard,
  TextInput,
  useChain,
} from '@dao-dao/stateless'
import {
  AddressInputProps,
  GenericTokenBalance,
  LoadingData,
} from '@dao-dao/types'
import { ActionComponent } from '@dao-dao/types/actions'
import { GenericAuthorization } from '@dao-dao/types/protobuf/codegen/cosmos/authz/v1beta1/authz'
import { SendAuthorization } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/authz'
import {
  AcceptedMessageKeysFilter,
  AcceptedMessagesFilter,
  CombinedLimit,
  ContractExecutionAuthorization,
  ContractMigrationAuthorization,
  MaxCallsLimit,
  MaxFundsLimit,
} from '@dao-dao/types/protobuf/codegen/cosmwasm/wasm/v1/authz'
import {
  getNativeTokenForChainId,
  makeValidateAddress,
  makeWasmMessage,
  validateCosmosMsgForChain,
  validateNonNegative,
  validateRequired,
} from '@dao-dao/utils'

import {
  ACTION_TYPES,
  AUTHORIZATION_TYPES,
  AuthzGrantRevokeData,
  FILTER_TYPES,
  LIMIT_TYPES,
} from './types'

export type AuthzGrantRevokeOptions = {
  AddressInput: ComponentType<AddressInputProps<AuthzGrantRevokeData>>
  balances: LoadingData<GenericTokenBalance[]>
}

export const AuthzGrantRevokeComponent: ActionComponent<
  AuthzGrantRevokeOptions
> = ({
  fieldNamePrefix,
  errors,
  isCreating,
  options: { AddressInput, balances },
}) => {
  const { t } = useTranslation()
  const { chainId, bech32Prefix } = useChain()

  const { control, register, setValue, getValues, watch } =
    useFormContext<AuthzGrantRevokeData>()

  const {
    fields: coins,
    append: appendCoin,
    remove: removeCoin,
  } = useFieldArray({
    control,
    name: (fieldNamePrefix + 'funds') as 'funds',
  })

  const mode = watch((fieldNamePrefix + 'mode') as 'mode')
  const authorizationTypeUrl = watch(
    (fieldNamePrefix + 'authorizationTypeUrl') as 'authorizationTypeUrl'
  )
  const customTypeUrl = watch(
    (fieldNamePrefix + 'customTypeUrl') as 'customTypeUrl'
  )
  const filterTypeUrl = watch(
    (fieldNamePrefix + 'filterTypeUrl') as 'filterTypeUrl'
  )
  const limitTypeUrl = watch(
    (fieldNamePrefix + 'limitTypeUrl') as 'limitTypeUrl'
  )

  const nativeToken = getNativeTokenForChainId(chainId)

  return (
    <>
      <SegmentedControlsTitle
        editable={isCreating}
        fieldName={fieldNamePrefix + 'mode'}
        tabs={[
          {
            label: t('form.grantAuthorizationOption'),
            value: 'grant',
          },
          {
            label: t('form.revokeAuthorizationOption'),
            value: 'revoke',
          },
        ]}
      />

      {mode === 'grant' && (
        <StatusCard content={t('info.authzWarning')} style="warning" />
      )}

      <div className="flex flex-col gap-1">
        <InputLabel
          name={t('form.granteeAddress')}
          tooltip={t('form.granteeAddressTooltip')}
        />
        <AddressInput
          disabled={!isCreating}
          error={errors?.grantee}
          fieldName={(fieldNamePrefix + 'grantee') as 'grantee'}
          placeholder={!isCreating ? t('info.none') : undefined}
          register={register}
          validation={[makeValidateAddress(bech32Prefix)]}
        />
        <InputErrorMessage error={errors?.grantee} />
      </div>

      {mode === 'grant' && (
        <div className="flex flex-col gap-1">
          <InputLabel
            name={t('form.authzType')}
            tooltip={t('form.authzTypeDescription')}
          />
          <SelectInput
            disabled={!isCreating}
            fieldName={
              (fieldNamePrefix +
                'authorizationTypeUrl') as 'authorizationTypeUrl'
            }
            register={register}
          >
            {AUTHORIZATION_TYPES.map(({ type: { typeUrl }, i18nKey }) => (
              <option key={typeUrl} value={typeUrl}>
                {t(i18nKey)}
              </option>
            ))}
          </SelectInput>
        </div>
      )}

      {(authorizationTypeUrl === GenericAuthorization.typeUrl ||
        mode === 'revoke') && (
        <>
          {!customTypeUrl ? (
            <div className="flex flex-col gap-1">
              <InputLabel
                name={t('form.messageType')}
                tooltip={t('form.authzMessageType')}
              />
              <SelectInput
                disabled={!isCreating}
                fieldName={(fieldNamePrefix + 'msgTypeUrl') as 'msgTypeUrl'}
                register={register}
              >
                {ACTION_TYPES.map(({ type: { typeUrl }, i18nKey }) => (
                  <option key={typeUrl} value={typeUrl}>
                    {t(i18nKey)}
                  </option>
                ))}
              </SelectInput>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <InputLabel name={t('form.messageType')} />
              <TextInput
                disabled={!isCreating}
                error={errors?.msgTypeUrl}
                fieldName={(fieldNamePrefix + 'msgTypeUrl') as 'msgTypeUrl'}
                placeholder={
                  !isCreating ? t('info.none') : t('form.messageType')
                }
                register={register}
                validation={[validateRequired]}
              />
              <InputErrorMessage error={errors?.msgTypeUrl} />
            </div>
          )}

          {(isCreating || customTypeUrl) && (
            <FormSwitchCard
              containerClassName="self-start"
              fieldName={(fieldNamePrefix + 'customTypeUrl') as 'customTypeUrl'}
              label={t('form.authzUseCustomMessageType')}
              onToggle={
                // Reset message type URL if customTypeUrl is disabled.
                (customTypeUrl) =>
                  !customTypeUrl &&
                  setValue(
                    (fieldNamePrefix + 'msgTypeUrl') as 'msgTypeUrl',
                    ACTION_TYPES[0].type.typeUrl
                  )
              }
              readOnly={!isCreating}
              setValue={setValue}
              sizing="sm"
              tooltip={t('form.authzCustomMessageTypeTooltip')}
              tooltipIconSize="sm"
              value={watch(
                (fieldNamePrefix + 'customTypeUrl') as 'customTypeUrl'
              )}
            />
          )}
        </>
      )}

      {authorizationTypeUrl === SendAuthorization.typeUrl &&
        mode === 'grant' && (
          <div className="flex flex-col gap-1">
            <InputLabel
              name={t('form.spendingAllowance')}
              tooltip={t('form.spendingAllowanceDescription')}
            />

            {isCreating || coins.length > 0 ? (
              <div className="flex flex-col items-stretch gap-1">
                {coins.map(({ id }, index) => (
                  <NativeCoinSelector
                    key={id + index}
                    chainId={chainId}
                    errors={errors?.funds?.[index]}
                    fieldNamePrefix={fieldNamePrefix + `funds.${index}.`}
                    isCreating={isCreating}
                    noBalanceWarning
                    onRemove={isCreating ? () => removeCoin(index) : undefined}
                    tokens={balances}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-text-tertiary">
                {t('info.none')}
              </p>
            )}

            {isCreating && (
              <Button
                className="mt-2 self-start"
                onClick={() =>
                  appendCoin({
                    amount: '1',
                    denom: nativeToken.denomOrAddress,
                    decimals: nativeToken.decimals,
                  })
                }
                variant="secondary"
              >
                {t('button.addAllowance')}
              </Button>
            )}
          </div>
        )}

      {(authorizationTypeUrl === ContractExecutionAuthorization.typeUrl ||
        authorizationTypeUrl === ContractMigrationAuthorization.typeUrl) &&
        mode === 'grant' && (
          <>
            <div className="flex flex-col gap-1">
              <InputLabel name={t('form.smartContractAddress')} />
              <AddressInput
                disabled={!isCreating}
                error={errors?.contract}
                fieldName={(fieldNamePrefix + 'contract') as 'contract'}
                register={register}
                type="contract"
                validation={[makeValidateAddress(bech32Prefix)]}
              />
              <InputErrorMessage error={errors?.contract} />
            </div>

            <div className="flex flex-col gap-1">
              <InputLabel
                name={t('form.contractPermissions')}
                tooltip={t('form.contractPermissionsDescription')}
              />

              <RadioInput
                disabled={!isCreating}
                fieldName={
                  (fieldNamePrefix + 'filterTypeUrl') as 'filterTypeUrl'
                }
                options={FILTER_TYPES.map(({ type: { typeUrl }, i18nKey }) => ({
                  label: t(i18nKey),
                  value: typeUrl,
                }))}
                setValue={setValue}
                watch={watch}
              />
            </div>

            {filterTypeUrl === AcceptedMessageKeysFilter.typeUrl && (
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('form.allowedMethods')}
                  tooltip={t('form.allowedMethodsDescription')}
                />

                <TextInput
                  disabled={!isCreating}
                  error={errors?.filterKeys}
                  fieldName={(fieldNamePrefix + 'filterKeys') as 'filterKeys'}
                  register={register}
                  validation={[validateRequired]}
                />

                <InputErrorMessage error={errors?.filterKeys} />
              </div>
            )}

            {filterTypeUrl === AcceptedMessagesFilter.typeUrl && (
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('form.smartContractMessage')}
                  tooltip={t('form.smartContractMessageDescription')}
                />

                <CodeMirrorInput
                  control={control}
                  error={errors?.filterMsgs}
                  fieldName={(fieldNamePrefix + 'filterMsgs') as 'filterMsgs'}
                  readOnly={!isCreating}
                  validation={[
                    (v: string) => {
                      let msg
                      try {
                        msg = JSON5.parse(v)
                      } catch (err) {
                        return err instanceof Error ? err.message : `${err}`
                      }

                      const msgs = (Array.isArray(msg) ? msg : [msg]).map(
                        (msg) =>
                          makeWasmMessage({
                            wasm: {
                              execute: {
                                contract_addr: '',
                                funds: [],
                                msg,
                              },
                            },
                          })
                      )

                      msgs.forEach((msg, index) => {
                        try {
                          validateCosmosMsgForChain(chainId, msg)
                        } catch (err) {
                          return (
                            `Message ${index + 1}: ` +
                            (err instanceof Error ? err.message : `${err}`)
                          )
                        }
                      })

                      return true
                    },
                  ]}
                />

                {errors?.filterMsgs ? (
                  <p className="mt-1 flex items-center gap-1 text-sm text-text-interactive-error">
                    <Close className="!h-5 !w-5" />{' '}
                    <span>{errors.filterMsgs.message}</span>
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-sm text-text-interactive-valid">
                    <Check className="!h-5 !w-5" /> {t('info.jsonIsValid')}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <InputLabel
                name={t('form.limits')}
                tooltip={t('form.authzLimitsDescription')}
              />

              <RadioInput
                disabled={!isCreating}
                fieldName={(fieldNamePrefix + 'limitTypeUrl') as 'limitTypeUrl'}
                options={LIMIT_TYPES.map(({ type: { typeUrl }, i18nKey }) => ({
                  label: t(i18nKey),
                  value: typeUrl,
                }))}
                setValue={setValue}
                watch={watch}
              />
            </div>

            {(limitTypeUrl === MaxCallsLimit.typeUrl ||
              limitTypeUrl === CombinedLimit.typeUrl) && (
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('form.calls')}
                  tooltip={t('form.callsDescription')}
                />

                <NumericInput
                  containerClassName="grow"
                  disabled={!isCreating}
                  error={errors?.calls}
                  fieldName={(fieldNamePrefix + 'calls') as 'calls'}
                  getValues={getValues}
                  min={0}
                  numericValue
                  register={register}
                  setValue={setValue}
                  sizing="md"
                  step={1}
                  validation={[validateRequired, validateNonNegative]}
                />
                <InputErrorMessage error={errors?.calls} />
              </div>
            )}

            {(limitTypeUrl === MaxFundsLimit.typeUrl ||
              limitTypeUrl === CombinedLimit.typeUrl) && (
              <div className="flex flex-col gap-1">
                <InputLabel
                  name={t('form.spendingAllowance')}
                  tooltip={t('form.spendingAllowanceDescription')}
                />

                {isCreating || coins.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {coins.map(({ id }, index) => (
                      <NativeCoinSelector
                        key={id + index}
                        chainId={chainId}
                        errors={errors?.funds?.[index]}
                        fieldNamePrefix={fieldNamePrefix + `funds.${index}.`}
                        isCreating={isCreating}
                        noBalanceWarning
                        onRemove={
                          isCreating ? () => removeCoin(index) : undefined
                        }
                        tokens={balances}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-text-tertiary">
                    {t('info.none')}
                  </p>
                )}

                {isCreating && (
                  <Button
                    className="mt-2 self-start"
                    onClick={() =>
                      appendCoin({
                        amount: '1',
                        denom: nativeToken.denomOrAddress,
                        decimals: nativeToken.decimals,
                      })
                    }
                    variant="secondary"
                  >
                    {t('button.addAllowance')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
    </>
  )
}
