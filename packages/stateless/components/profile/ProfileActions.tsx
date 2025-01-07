import {
  ArrowOutwardRounded,
  ClearRounded,
  Key,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import cloneDeep from 'lodash.clonedeep'
import { ComponentType, useCallback, useState } from 'react'
import {
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  useFormContext,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  AccountTxForm,
  AccountTxSave,
  ActionEncodeContext,
  LoadingData,
  SuspenseLoaderProps,
  UnifiedCosmosMsg,
  WalletChainSwitcherProps,
} from '@dao-dao/types'
import {
  convertActionKeysAndDataToActions,
  encodeActions,
  processError,
  validateRequired,
} from '@dao-dao/utils'

import { useActionsContext, useChainContext } from '../../contexts'
import { useHoldingKey } from '../../hooks'
import { ActionsEditor, ActionsRenderer, RawActionsRenderer } from '../actions'
import { Button, ButtonLink } from '../buttons'
import { CopyToClipboard } from '../CopyToClipboard'
import { IconButton } from '../icon_buttons'
import { InputErrorMessage, TextAreaInput, TextInput } from '../inputs'
import { Modal } from '../modals'
import { Tooltip } from '../tooltip'

enum SubmitValue {
  Preview = 'Preview',
  Submit = 'Submit',
}

export type ProfileActionsProps = {
  execute: (messages: UnifiedCosmosMsg[]) => Promise<void>
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
  error?: string
  txHash?: string
  saves: LoadingData<AccountTxSave[]>
  save: (save: AccountTxSave) => Promise<boolean>
  deleteSave: (save: AccountTxSave) => Promise<boolean>
  saving: boolean
  holdingAltForDirectSign: boolean
  WalletChainSwitcher: ComponentType<WalletChainSwitcherProps>
  actionEncodeContext: ActionEncodeContext
  actionsReadOnlyMode?: boolean
}

export const ProfileActions = ({
  execute,
  SuspenseLoader,
  error,
  txHash,
  saves,
  save,
  deleteSave,
  saving,
  holdingAltForDirectSign,
  WalletChainSwitcher,
  actionEncodeContext,
  actionsReadOnlyMode,
}: ProfileActionsProps) => {
  const { t } = useTranslation()
  const { config } = useChainContext()
  const { actionMap } = useActionsContext()

  const {
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    getValues,
  } = useFormContext<AccountTxForm>()

  const actionData = watch('actions') || []

  const [showPreview, setShowPreview] = useState(false)
  const [showSubmitErrorNote, setShowSubmitErrorNote] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const holdingShiftForForce = useHoldingKey({ key: 'shift' })

  const [loading, setLoading] = useState(false)

  const onSubmitForm: SubmitHandler<AccountTxForm> = useCallback(
    async ({ actions }, event) => {
      setShowSubmitErrorNote(false)
      setSubmitError('')

      const nativeEvent = event?.nativeEvent as SubmitEvent
      const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

      if (submitterValue === SubmitValue.Preview) {
        setShowPreview((p) => !p)
        return
      }

      setLoading(true)
      try {
        const msgs = await encodeActions({
          actionMap,
          encodeContext: actionEncodeContext,
          data: actions,
        })
        await execute(msgs)
      } catch (err) {
        console.error(err)
        setSubmitError(
          processError(err, {
            forceCapture: false,
          })
        )
      } finally {
        setLoading(false)
      }
    },
    [actionMap, actionEncodeContext, execute]
  )

  const onSubmitError: SubmitErrorHandler<AccountTxForm> = useCallback(
    async (errors) => {
      console.error('Form errors', errors)

      // Attempt submit anyways if forcing.
      if (holdingShiftForForce) {
        setLoading(true)
        try {
          const msgs = await encodeActions({
            actionMap,
            encodeContext: actionEncodeContext,
            data: getValues('actions'),
          })
          await execute(msgs)
        } catch (err) {
          console.error(err)
          setSubmitError(
            processError(err, {
              forceCapture: false,
            })
          )
        } finally {
          setLoading(false)
        }

        // If not forcing, show error to check for errors.
      } else {
        setShowSubmitErrorNote(true)
        setSubmitError('')
      }
    },
    [actionMap, actionEncodeContext, execute, getValues, holdingShiftForForce]
  )

  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const {
    watch: saveWatch,
    register: saveRegister,
    handleSubmit: saveHandleSubmit,
    reset: saveReset,
    formState: { errors: saveErrors },
  } = useForm<Omit<AccountTxSave, 'actions'>>({
    defaultValues: {
      name: '',
      description: '',
    },
  })
  const watchSaveName = saveWatch('name')
  const onSave = async (data: Omit<AccountTxSave, 'actions'>) => {
    if (
      await save({
        ...data,
        // Clone the actions since the save gets cached. We don't want this form
        // to affect the save once it's been saved.
        actions: cloneDeep(actionData),
      })
    ) {
      setSaveModalVisible(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {!actionsReadOnlyMode && (
        <div className="flex flex-row justify-between">
          <p className="secondary-text">
            {t('info.transactionBuilderDescription')}
          </p>

          <WalletChainSwitcher headerMode type="configured" />
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        noValidate={holdingShiftForForce}
        onSubmit={handleSubmit(onSubmitForm, onSubmitError)}
      >
        {actionsReadOnlyMode ? (
          <ActionsRenderer
            SuspenseLoader={SuspenseLoader}
            actionData={convertActionKeysAndDataToActions(
              actionMap,
              actionData
            )}
          />
        ) : (
          <ActionsEditor
            SuspenseLoader={SuspenseLoader}
            actionDataErrors={errors?.actions}
            actionDataFieldName="actions"
          />
        )}

        <div className="mt-4 flex flex-row items-center justify-between gap-6 border-y border-border-secondary py-6">
          <p className="title-text text-text-body">
            {t('info.reviewYourTransaction')}
          </p>

          <div className="flex flex-row items-center justify-end gap-2">
            <Button
              disabled={loading || (actionData.length === 0 && !showPreview)}
              type="submit"
              value={SubmitValue.Preview}
              variant="secondary"
            >
              {showPreview ? (
                <>
                  {t('button.hidePreview')}
                  <VisibilityOff className="!h-5 !w-5" />
                </>
              ) : (
                <>
                  {t('button.preview')}
                  <Visibility className="!h-5 !w-5" />
                </>
              )}
            </Button>

            <Tooltip
              title={
                holdingShiftForForce ? t('info.forceExecuteTooltip') : undefined
              }
            >
              <Button
                disabled={actionData.length === 0}
                loading={loading}
                type="submit"
                value={SubmitValue.Submit}
              >
                {(holdingShiftForForce
                  ? t('button.forceExecute')
                  : t('button.execute')) +
                  (holdingAltForDirectSign ? ` (${t('info.direct')})` : '')}
                <Key className="!h-5 !w-5" />
              </Button>
            </Tooltip>
          </div>
        </div>

        {showSubmitErrorNote && (
          <p className="secondary-text max-w-prose self-end text-right text-base text-text-interactive-error">
            {t('error.correctErrorsAbove')}
          </p>
        )}

        {!!submitError && (
          <p className="secondary-text self-end text-right text-text-interactive-error">
            {submitError}
          </p>
        )}

        {error && (
          <p className="secondary-text max-w-prose self-end text-right text-sm text-text-interactive-error">
            {error}
          </p>
        )}

        {txHash && (
          <div className="flex flex-col items-end gap-2 self-end text-text-interactive-valid">
            <CopyToClipboard takeAll value={txHash} />

            {!!config?.explorerUrlTemplates?.tx && (
              <ButtonLink
                href={config.explorerUrlTemplates.tx.replace('REPLACE', txHash)}
                variant="ghost"
              >
                {t('button.openInChainExplorer')}{' '}
                <ArrowOutwardRounded className="!h-4 !w-4" />
              </ButtonLink>
            )}
          </div>
        )}

        {showPreview && (
          <RawActionsRenderer
            actionKeysAndData={actionData}
            encodeContext={actionEncodeContext}
          />
        )}
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between gap-4">
            <p className="title-text">{t('title.saved')}</p>

            <Button
              disabled={loading || actionData.length === 0}
              onClick={() => {
                // Clear form and open.
                saveReset()
                setSaveModalVisible(true)
              }}
              variant="secondary"
            >
              {t('button.save')}
              <Save className="!h-5 !w-5" />
            </Button>
          </div>

          <p className="secondary-text">{t('info.txSavesDescription')}</p>
        </div>

        {!saves.loading && saves.data.length > 0 ? (
          <div className="flex flex-row flex-wrap gap-2">
            {saves.data.map((save, index) => (
              <Button
                key={index}
                contentContainerClassName="flex flex-col !items-stretch !gap-0 max-w-[16rem] text-left"
                onClick={() =>
                  reset({
                    // Clone the actions to prevent mutating the original
                    // save.
                    actions: cloneDeep(save.actions),
                  })
                }
                variant="secondary"
              >
                <div className="flex flex-row items-center justify-between gap-4">
                  <p className="body-text">{save.name}</p>

                  <Tooltip title={t('button.delete')}>
                    <IconButton
                      Icon={ClearRounded}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSave(save)
                      }}
                      size="xs"
                      variant="ghost"
                    />
                  </Tooltip>
                </div>
                {save.description && (
                  <p className="secondary-text">{save.description}</p>
                )}

                <p className="caption-text mt-2">
                  {t('info.actions', { count: save.actions.length })}
                </p>
              </Button>
            ))}
          </div>
        ) : (
          <p className="caption-text">{t('info.nothingFound')}</p>
        )}
      </div>

      {/* Save modal */}
      <Modal
        header={{
          title: t('title.saveTransaction'),
          subtitle: t('info.saveTransactionDescription'),
        }}
        onClose={() => setSaveModalVisible(false)}
        visible={saveModalVisible}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={saveHandleSubmit(onSave)}
        >
          <div className="flex grow flex-col gap-1">
            <TextInput
              error={saveErrors.name}
              fieldName="name"
              placeholder={t('form.name')}
              register={saveRegister}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={saveErrors.name} />

            {!saves.loading &&
              saves.data?.some(({ name }) => name === watchSaveName) && (
                <p className="caption-text">{t('info.overwritingSave')}</p>
              )}
          </div>

          <div className="flex flex-col">
            <TextAreaInput
              error={saveErrors.description}
              fieldName="description"
              placeholder={t('form.descriptionOptional')}
              register={saveRegister}
              rows={3}
            />
            <InputErrorMessage error={saveErrors.description} />
          </div>

          <Button className="mt-2 self-end" loading={saving} type="submit">
            {t('button.save')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
