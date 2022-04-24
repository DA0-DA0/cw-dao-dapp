import { useState } from 'react'

import { Airplane } from '@dao-dao/icons'
import { useWallet } from '@dao-dao/state'
import { CosmosMsgFor_Empty } from '@dao-dao/types/contracts/cw3-dao'
import {
  Button,
  Tooltip,
  MarkdownPreview,
  CosmosMessageDisplay,
} from '@dao-dao/ui'
import {
  InputErrorMessage,
  InputLabel,
  TextareaInput,
  TextInput,
} from '@dao-dao/ui'
import { ToCosmosMsgProps } from '@dao-dao/ui/components/templates'
import { validateRequired, decodedMessagesString } from '@dao-dao/utils'
import { EyeIcon, EyeOffIcon, PlusIcon, XIcon } from '@heroicons/react/outline'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'

import { templates, templateToCosmosMsg } from './templates'
import { TemplateSelector } from './TemplateSelector'

interface TemplateLabelAndData {
  label: string
  data: any
}

interface FormProposalData {
  title: string
  description: string
  messages: TemplateLabelAndData[]
}

export interface ProposalData extends Omit<FormProposalData, 'messages'> {
  messages: CosmosMsgFor_Empty[]
}

interface ProposalFormProps {
  onSubmit: (data: ProposalData) => void
  contractAddress: string
  loading: boolean
  toCosmosMsgProps: ToCosmosMsgProps
}

export const ProposalForm = ({
  onSubmit,
  contractAddress,
  loading,
  toCosmosMsgProps,
}: ProposalFormProps) => {
  const { connected, address: walletAddress } = useWallet()

  const formMethods = useForm<FormProposalData>()

  // Unpack here because we use these at the top level as well as
  // inside of nested components.
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = formMethods

  const [showPreview, setShowPreview] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  const proposalDescription = watch('description')
  const proposalTitle = watch('title')
  const proposalMessages = watch('messages')

  const {
    fields: messageFields,
    append,
    remove,
  } = useFieldArray({
    name: 'messages',
    control,
    shouldUnregister: true,
  })

  return (
    <FormProvider {...formMethods}>
      <form
        className="mx-auto max-w-[800px]"
        onSubmit={handleSubmit((d) =>
          onSubmit({
            ...d,
            messages: d.messages
              .map(({ label, data }) =>
                templateToCosmosMsg(label, data, toCosmosMsgProps)
              )
              // Filter out undefined messages.
              .filter(Boolean) as CosmosMsgFor_Empty[],
          })
        )}
      >
        {showPreview && (
          <>
            <div className="max-w-prose">
              <h1 className="my-6 text-xl header-text">{proposalTitle}</h1>
            </div>
            <div className="mt-[22px] mb-[36px]">
              <MarkdownPreview markdown={proposalDescription} />
            </div>
            <CosmosMessageDisplay
              value={decodedMessagesString(
                proposalMessages
                  .map(({ label, data }) =>
                    templateToCosmosMsg(label, data, toCosmosMsgProps)
                  )
                  // Filter out undefined messages.
                  .filter(Boolean) as CosmosMsgFor_Empty[]
              )}
            />
          </>
        )}
        <div className={showPreview ? 'hidden' : ''}>
          {showTemplateSelector && (
            <TemplateSelector
              onClose={() => setShowTemplateSelector(false)}
              onLabelSelect={(label, getDefaults) => {
                append({
                  ...getDefaults({ walletAddress }),
                  label,
                })
                setShowTemplateSelector(false)
              }}
              templates={templates}
            />
          )}

          <div className="flex flex-col gap-1 my-3">
            <InputLabel name="Title" />
            <TextInput
              error={errors.title}
              label="title"
              register={register}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errors.title} />
          </div>
          <div className="flex flex-col gap-1 my-3">
            <InputLabel name="Description" />
            <TextareaInput
              error={errors.description}
              label="description"
              register={register}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errors.description} />
          </div>
          <ul className="list-none">
            {messageFields.map((data, index) => {
              const label = (data as any).label
              const template = templates.find(
                (template) => template.label === label
              )
              if (!template) {
                // We guarantee by construction that this should never
                // happen but might as well make it pretty if it does.
                return (
                  <div className="flex justify-between items-center p-2 my-3 text-error rounded-lg border border-error">
                    <p>Internal error finding template for message.</p>
                    <button onClick={() => remove(index)} type="button">
                      <XIcon className="h-4" />
                    </button>
                  </div>
                )
              }
              const Component = template.component
              return (
                <li key={index}>
                  <Component
                    contractAddress={contractAddress}
                    errors={(errors.messages && errors.messages[index]) || {}}
                    getLabel={(fieldName) =>
                      `messages.${index}.data.${fieldName}`
                    }
                    onRemove={() => remove(index)}
                  />
                </li>
              )
            })}
          </ul>
          <div className="mt-2">
            <Button
              onClick={() => setShowTemplateSelector((s) => !s)}
              type="button"
              variant="secondary"
            >
              <PlusIcon className="inline h-4" /> Add component
            </Button>
            {showTemplateSelector && (
              <TemplateSelector
                onClose={() => setShowTemplateSelector(false)}
                onLabelSelect={(label, getDefaults) => {
                  append({
                    ...getDefaults({ walletAddress }),
                    label,
                  })
                  setShowTemplateSelector(false)
                }}
                templates={templates}
              />
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Tooltip
            label={!connected ? 'Connect your wallet to submit' : undefined}
          >
            <Button loading={loading} type="submit">
              Publish{' '}
              <Airplane color="currentColor" height="14px" width="14px" />
            </Button>
          </Tooltip>
          <Button
            onClick={() => setShowPreview((p) => !p)}
            type="button"
            variant="secondary"
          >
            {showPreview ? (
              <>
                Hide preview
                <EyeOffIcon className="inline ml-2 h-5 stroke-current" />
              </>
            ) : (
              <>
                Preview
                <EyeIcon className="inline ml-2 h-5 stroke-current" />
              </>
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
