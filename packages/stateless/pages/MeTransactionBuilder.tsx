import {
  ArrowOutwardRounded,
  ClearRounded,
  Key,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import cloneDeep from 'lodash.clonedeep'
import { useCallback, useState } from 'react'
import {
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  MeTransactionBuilderProps,
  MeTransactionForm,
  MeTransactionSave,
} from '@dao-dao/types'
import { CosmosMsgFor_Empty } from '@dao-dao/types/contracts/common'
import {
  CHAIN_TXN_URL_PREFIX,
  decodedMessagesString,
  validateRequired,
} from '@dao-dao/utils'

import {
  ActionCardLoader,
  ActionSelector,
  Button,
  ButtonLink,
  CopyToClipboard,
  CosmosMessageDisplay,
  IconButton,
  InputErrorMessage,
  Modal,
  TextAreaInput,
  TextInput,
  Tooltip,
} from '../components'

enum SubmitValue {
  Preview = 'Preview',
  Submit = 'Submit',
}

export const MeTransactionBuilder = ({
  actions,
  loadedActions,
  formMethods,
  execute,
  loading,
  SuspenseLoader,
  error,
  txHash,
  saves,
  save,
  deleteSave,
  saving,
}: MeTransactionBuilderProps) => {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = formMethods

  const watchActions = watch('actions')

  const { append, remove } = useFieldArray({
    name: 'actions',
    control,
    shouldUnregister: true,
  })

  const [showPreview, setShowPreview] = useState(false)
  const [showSubmitErrorNote, setShowSubmitErrorNote] = useState(false)

  const onSubmitForm: SubmitHandler<MeTransactionForm> = useCallback(
    ({ actions }, event) => {
      setShowSubmitErrorNote(false)

      const nativeEvent = event?.nativeEvent as SubmitEvent
      const submitterValue = (nativeEvent?.submitter as HTMLInputElement)?.value

      if (submitterValue === SubmitValue.Preview) {
        setShowPreview((p) => !p)
        return
      }

      const messages = actions
        .map(({ key, data }) => loadedActions[key]?.transform(data))
        // Filter out undefined messages.
        .filter(Boolean) as CosmosMsgFor_Empty[]

      execute(messages)
    },
    [execute, loadedActions]
  )

  const onSubmitError: SubmitErrorHandler<MeTransactionForm> = useCallback(
    (errors) => {
      console.error('Form errors', errors)

      setShowSubmitErrorNote(true)
    },
    [setShowSubmitErrorNote]
  )

  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const {
    watch: saveWatch,
    register: saveRegister,
    handleSubmit: saveHandleSubmit,
    reset: saveReset,
    formState: { errors: saveErrors },
  } = useForm<Omit<MeTransactionSave, 'actions'>>({
    defaultValues: {
      name: '',
      description: '',
    },
  })
  const watchSaveName = saveWatch('name')
  const onSave = async (data: Omit<MeTransactionSave, 'actions'>) => {
    if (
      await save({
        ...data,
        // Clone the actions since the save gets cached. We don't want this form
        // to affect the save once it's been saved.
        actions: cloneDeep(watchActions),
      })
    ) {
      setSaveModalVisible(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="secondary-text">
        {t('info.transactionBuilderDescription')}
      </p>

      <FormProvider {...formMethods}>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmitForm, onSubmitError)}
        >
          {watchActions.length > 0 && (
            <div className="flex flex-col gap-2">
              {watchActions.map(({ key, data }, index) => {
                const Component = loadedActions[key]?.action?.Component
                if (!Component) {
                  return null
                }

                return (
                  <SuspenseLoader key={index} fallback={<ActionCardLoader />}>
                    <Component
                      addAction={append}
                      allActionsWithData={watchActions}
                      data={data}
                      errors={errors.actions?.[index]?.data || {}}
                      fieldNamePrefix={`actions.${index}.data.`}
                      index={index}
                      isCreating
                      onRemove={() => remove(index)}
                    />
                  </SuspenseLoader>
                )
              })}
            </div>
          )}

          <div>
            <ActionSelector
              actions={actions}
              onSelectAction={({ key }) => {
                append({
                  key,
                  data: loadedActions[key]?.defaults ?? {},
                })
              }}
            />
          </div>

          <div className="mt-4 flex flex-row items-center justify-between gap-6 border-y border-border-secondary py-6">
            <p className="title-text text-text-body">
              {t('info.reviewYourTransaction')}
            </p>

            <div className="flex flex-row items-center justify-end gap-2">
              <Button
                disabled={
                  loading || (watchActions.length === 0 && !showPreview)
                }
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

              <Button
                disabled={watchActions.length === 0}
                loading={loading}
                type="submit"
                value={SubmitValue.Submit}
              >
                {t('button.execute') + ' '}
                <Key className="!h-5 !w-5" />
              </Button>
            </div>
          </div>

          {showSubmitErrorNote && (
            <p className="secondary-text max-w-prose self-end text-right text-base text-text-interactive-error">
              {t('error.correctErrorsAbove')}
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

              <ButtonLink href={CHAIN_TXN_URL_PREFIX + txHash} variant="ghost">
                {t('button.openInChainExplorer')}{' '}
                <ArrowOutwardRounded className="!h-4 !w-4" />
              </ButtonLink>
            </div>
          )}

          {showPreview && (
            <CosmosMessageDisplay
              value={decodedMessagesString(
                watchActions
                  .map(({ key, data }) => loadedActions[key]?.transform(data))
                  // Filter out undefined messages.
                  .filter(Boolean) as CosmosMsgFor_Empty[]
              )}
            />
          )}
        </form>
      </FormProvider>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row items-center justify-between gap-4">
            <p className="title-text">{t('title.saved')}</p>

            <Button
              disabled={loading || watchActions.length === 0}
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
