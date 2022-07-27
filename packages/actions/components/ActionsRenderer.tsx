import { CheckCircleIcon, LinkIcon } from '@heroicons/react/outline'
import { FC, FunctionComponent, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { SuspenseLoader } from '@dao-dao/ui'

import { ActionAndData, ActionCardLoader } from '..'

// The props needed to render an action from a message.
export interface ActionsRendererProps {
  coreAddress: string
  proposalId: number
  actionData: ActionAndData[]
}

export const ActionsRenderer: FC<ActionsRendererProps> = (props) => (
  <SuspenseLoader fallback={<ActionCardLoader />}>
    <InnerActionsRenderer {...props} />
  </SuspenseLoader>
)

const InnerActionsRenderer: FunctionComponent<ActionsRendererProps> = ({
  coreAddress,
  proposalId,
  actionData,
}) => {
  const formMethods = useForm({
    defaultValues: actionData.reduce(
      (acc, { data }, index) => ({
        ...acc,
        [index.toString()]: data,
      }),
      {}
    ),
  })

  const [copied, setCopied] = useState<number>()
  // Unset copied after 2 seconds.
  useEffect(() => {
    const timeout = setTimeout(() => setCopied(undefined), 2000)
    // Cleanup on unmount.
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <FormProvider {...formMethods}>
      <form>
        {actionData.map(({ action: { Component } }, index) => (
          <div key={index} className="group relative" id={`A${index + 1}`}>
            <Component
              allActionsWithData={actionData.map(
                ({ action: { key }, data }) => ({
                  key,
                  data,
                })
              )}
              coreAddress={coreAddress}
              getFieldName={(field: string) => `${index}.${field}`}
              index={index}
              proposalId={proposalId}
              readOnly
            />

            <button
              className="absolute top-1 -right-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                const url = new URL(window.location.href)
                url.hash = '#' + `A${index + 1}`
                navigator.clipboard.writeText(url.href)
                setCopied(index)
              }}
              type="button"
            >
              {copied === index ? (
                <CheckCircleIcon className="w-4" />
              ) : (
                <LinkIcon className="w-4" />
              )}
            </button>
          </div>
        ))}
      </form>
    </FormProvider>
  )
}
