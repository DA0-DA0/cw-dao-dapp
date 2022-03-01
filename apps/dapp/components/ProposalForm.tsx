import { useState } from 'react'

import { useRecoilValue } from 'recoil'

import { EyeIcon, EyeOffIcon, PlusIcon, XIcon } from '@heroicons/react/outline'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'

import { walletAddress } from 'selectors/treasury'
import {
  MessageTemplate,
  messageTemplates,
  ContractSupport,
} from 'templates/templateList'
import { contractConfigSelector } from 'util/contractConfigWrapper'
import { validateRequired } from 'util/formValidation'

import SvgAirplane from './icons/Airplane'
import { InputErrorMessage } from './input/InputErrorMessage'
import { InputLabel } from './input/InputLabel'
import { TextareaInput } from './input/TextAreaInput'
import { TextInput } from './input/TextInput'
import { MarkdownPreview } from './MarkdownPreview'

export interface ProposalData {
  title: string
  description: string
  messages: MessageTemplate[]
}

export function ProposalForm({
  onSubmit,
  contractAddress,
  loading,
  multisig,
}: {
  onSubmit: (data: ProposalData) => void
  contractAddress: string
  loading: boolean
  multisig?: boolean
}) {
  const wallet = useRecoilValue(walletAddress)
  const contractConfig = useRecoilValue(
    contractConfigSelector({ contractAddress, multisig: !!multisig })
  )

  const formMethods = useForm()

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

  const proposalDescription = watch('description')
  const proposalTitle = watch('title')

  const { fields, append, remove } = useFieldArray({
    name: 'messages',
    control,
    shouldUnregister: true,
  })

  return (
    <FormProvider {...formMethods}>
      <form
        className=""
        onSubmit={handleSubmit<ProposalData>((d) =>
          onSubmit(d as ProposalData)
        )}
      >
        <div className={`max-w-prose ${!showPreview && 'hidden'}`}>
          <h1 className="text-4xl font-medium font-semibold my-6">
            {proposalTitle}
          </h1>
        </div>
        <div className={`my-6 ${!showPreview && 'hidden'}`}>
          <MarkdownPreview markdown={proposalDescription} />
        </div>
        <div className={`${showPreview && 'hidden'}`}>
          <div className="form-control">
            <InputLabel name="Title" />
            <TextInput
              label="title"
              register={register}
              error={errors.title}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errors.title} />
          </div>
          <div className="form-control">
            <InputLabel name="Description" />
            <TextareaInput
              label="description"
              register={register}
              error={errors.description}
              validation={[validateRequired]}
            />
            <InputErrorMessage error={errors.description} />
          </div>
        </div>
        <ul className="list-none">
          {fields.map((data, index) => {
            const label = (data as any).label
            const template = messageTemplates.find(
              (template) => template.label === label
            )
            if (!template) {
              // We guarentee by construction that this should never
              // happen but might as well make it pretty if it does.
              return (
                <div className="text-error p-2 border border-error rounded-lg my-3 flex items-center justify-between">
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
                  onRemove={() => remove(index)}
                  getLabel={(fieldName) => `messages.${index}.${fieldName}`}
                  errors={(errors.messages && errors.messages[index]) || {}}
                  multisig={multisig}
                />
              </li>
            )
          })}
        </ul>
        <div className="dropdown dropdown-right mt-2">
          <div
            tabIndex={0}
            className="m-1 btn normal-case btn-sm rounded-md bg-base-300 text-primary border-none hover:bg-base-200"
          >
            <PlusIcon className="h-5 inline mr-1" /> Add message
          </div>
          <ul
            tabIndex={0}
            className="p-2 shadow menu dropdown-content rounded-md bg-base-300 border border-secondary w-max"
          >
            {messageTemplates
              .filter(({ contractSupport }) => {
                switch (contractSupport) {
                  case ContractSupport.Both:
                    return true
                  case ContractSupport.Multisig:
                    return multisig
                  case ContractSupport.DAO:
                    return !multisig
                }
              })
              .map(({ label, getDefaults }, index) => (
                <li
                  key={index}
                  className="transition hover:bg-base-200 text-lg p-1 rounded"
                >
                  <button
                    className="text-left"
                    onClick={() =>
                      append({ ...getDefaults(wallet, contractConfig), label })
                    }
                    type="button"
                  >
                    {label}
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <div className="mt-4 flex gap-2">
          <div
            className={!wallet ? 'tooltip' : ''}
            data-tip="Connect your wallet to submit"
          >
            <button
              type="submit"
              className={`btn btn-sm normal-case bg-primary text-primary-content hover:bg-primary-content hover:text-primary ${
                loading ? 'loading' : ''
              } ${!wallet ? 'btn-disabled' : ''}`}
            >
              Submit{' '}
              {!loading && (
                <SvgAirplane className="inline stroke-current ml-2" />
              )}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline normal-case hover:bg-primary hover:text-primary-content"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? (
              <>
                Hide preview
                <EyeOffIcon className="inline h-5 stroke-current ml-2" />
              </>
            ) : (
              <>
                Preview
                <EyeIcon className="inline h-5 stroke-current ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
