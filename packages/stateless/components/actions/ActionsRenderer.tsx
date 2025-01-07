import { Check, Link } from '@mui/icons-material'
import { ComponentType, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { SuspenseLoaderProps, UnifiedCosmosMsg } from '@dao-dao/types'
import {
  Action,
  ActionAndData,
  ActionKeyAndData,
  IActionDecoder,
} from '@dao-dao/types/actions'

import { useActionMatcher } from '../../contexts'
import { useLoadingPromise, useUpdatingRef } from '../../hooks'
import { ActionMatcherProvider } from '../../providers'
import { ErrorPage } from '../error'
import { IconButton } from '../icon_buttons'
import { Loader } from '../logo'
import { ActionCard, ActionCardLoader } from './ActionCard'

export const ACTIONS_PER_PAGE = 20

export type ActionsRendererProps = {
  /**
   * Array of actions with data or action decoders from the matcher.
   */
  actionData: (ActionAndData | IActionDecoder)[]
  hideCopyLink?: boolean
  onCopyLink?: () => void
  /**
   * Callback when all actions and data are loaded.
   */
  onLoad?: (data: ActionKeyAndData[]) => void
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
}

// Groups actions together and renders uneditable cards.
export const ActionsRenderer = ({
  actionData,
  hideCopyLink,
  onCopyLink,
  onLoad,
  SuspenseLoader,
}: ActionsRendererProps) => {
  const [copied, setCopied] = useState<number>()
  // Unset copied after 2 seconds.
  useEffect(() => {
    const timeout = setTimeout(() => setCopied(undefined), 2000)
    // Cleanup on unmount.
    return () => clearTimeout(timeout)
  }, [copied])

  const loadingAllActionsWithData = useLoadingPromise({
    promise: () =>
      Promise.all(
        actionData.map(async (data, index): Promise<ActionKeyAndData> => {
          if ('decode' in data) {
            return {
              _id: index.toString(),
              actionKey: data.action.key,
              data: await data.decode().catch(() => ({})),
            }
          } else {
            return {
              _id: index.toString(),
              actionKey: data.action.key,
              data: data.data,
            }
          }
        })
      ),
    deps: [actionData],
  })

  // Call onLoad callback once all actions and data are loaded.
  const onLoadRef = useUpdatingRef(onLoad)
  const onLoadDefined = !!onLoad
  useEffect(() => {
    if (
      !loadingAllActionsWithData.loading &&
      !loadingAllActionsWithData.errored &&
      !loadingAllActionsWithData.updating
    ) {
      onLoadRef.current?.(loadingAllActionsWithData.data)
    }
  }, [
    loadingAllActionsWithData,
    onLoadRef,
    // Make sure to re-run the effect if the callback becomes defined.
    onLoadDefined,
  ])

  return (
    <div className="flex flex-col gap-2">
      {actionData.map((data, index) => (
        <div key={index} className="group/action relative" id={`A${index + 1}`}>
          <ActionRenderer
            key={
              // Re-render when the action at a given position changes so the
              // form resets. If the action changed and the data in the form was
              // updated in a `useEffect`, the new action may try to render the
              // past action's data and error in unexpected ways. The data in
              // the form needs to match the action being rendered at all times,
              // thus re-render the entire component (and reset the form) when
              // the action changes. This is necessary because the component
              // expects to exist inside a FormProvider, and a FormProvider
              // depends on a `useForm` hook return value. Also re-render when
              // the number of action data in the action changes.
              `${index}-${data.action.key}`
            }
            SuspenseLoader={SuspenseLoader}
            action={data.action}
            allActionsWithData={
              loadingAllActionsWithData.loading ||
              loadingAllActionsWithData.errored
                ? []
                : loadingAllActionsWithData.data
            }
            index={index}
            {...('decode' in data
              ? {
                  decoder: data,
                }
              : {
                  data: data.data,
                })}
          />

          {!hideCopyLink && (
            <IconButton
              Icon={copied === index ? Check : Link}
              className="group-hover/action:opacity-100 absolute top-1 right-1 opacity-0 transition-opacity"
              onClick={() => {
                const url = new URL(window.location.href)
                url.hash = '#' + `A${index + 1}`
                navigator.clipboard.writeText(url.href)
                setCopied(index)
                onCopyLink?.()
              }}
              size="sm"
              variant="none"
            />
          )}
        </div>
      ))}
    </div>
  )
}

export type ActionRendererProps<
  Data extends Record<string, any> = Record<string, any>,
> = ({
  action: Action<Data>
} & (
  | {
      data: Data
      decoder?: never
    }
  | {
      decoder: IActionDecoder<Data>
      data?: never
    }
)) &
  Omit<InnerActionRendererProps<Data>, 'data'>

// Renders an action.
export const ActionRenderer = <
  Data extends Record<string, any> = Record<string, any>,
>({
  action,
  ...props
}: ActionRendererProps<Data>) => {
  const { t } = useTranslation()
  const data = useLoadingPromise({
    promise: async () => {
      if (props.decoder) {
        try {
          return await props.decoder.decode()
        } catch (err) {
          console.error(
            `Decoder error for ${action.key} at index ${props.index}`,
            err
          )
          throw err
        }
      } else {
        return props.data
      }
    },
    deps: [props.data, props.decoder],
  })

  return data.loading ? (
    <ActionCard action={action}>
      <Loader />
    </ActionCard>
  ) : data.errored ? (
    <ActionCard action={action}>
      <ErrorPage error={data.error} title={t('title.decoderError')} />
    </ActionCard>
  ) : (
    <InnerActionRenderer<Data> {...props} action={action} data={data.data} />
  )
}

type InnerActionRendererProps<
  Data extends Record<string, any> = Record<string, any>,
> = {
  action: Action<Data>
  data: Data
  index: number
  allActionsWithData: ActionKeyAndData[]
  SuspenseLoader: ComponentType<SuspenseLoaderProps>
}

const InnerActionRenderer = <
  Data extends Record<string, any> = Record<string, any>,
>({
  action,
  data,
  index,
  allActionsWithData,
  SuspenseLoader,
}: InnerActionRendererProps<Data>) => {
  const form = useForm({
    defaultValues: {
      data: data as any,
    },
  })

  return (
    <FormProvider {...form}>
      <ActionCard action={action}>
        <SuspenseLoader fallback={<Loader />}>
          <action.Component
            allActionsWithData={allActionsWithData}
            data={data}
            fieldNamePrefix="data."
            index={index}
            isCreating={false}
          />
        </SuspenseLoader>
      </ActionCard>
    </FormProvider>
  )
}

export type ActionsMatchAndRenderProps = Omit<
  ActionsRendererProps,
  'actionData'
> & {
  /**
   * The messages to match.
   */
  messages: UnifiedCosmosMsg[]
  /**
   * Callback when all actions and data are loaded.
   */
  onLoad?: (data: ActionKeyAndData[]) => void
}

/**
 * An ActionsRenderer wrapper that renders the ActionsRenderer component with
 * matched actions for the provided messages, or loading/error appropriately.
 */
export const ActionsMatchAndRender = ({
  messages,
  ...props
}: ActionsMatchAndRenderProps) => (
  <ActionMatcherProvider messages={messages}>
    <InnerActionsMatchAndRender {...props} />
  </ActionMatcherProvider>
)

const InnerActionsMatchAndRender = (
  props: Omit<ActionsMatchAndRenderProps, 'messages'>
) => {
  const matcher = useActionMatcher()
  return (
    <>
      {matcher.errored ? (
        <ErrorPage error={matcher.error} />
      ) : matcher.ready ? (
        <ActionsRenderer {...props} actionData={matcher.matches} />
      ) : (
        <div className="flex flex-col gap-2">
          <ActionCardLoader />
          <ActionCardLoader />
          <ActionCardLoader />
        </div>
      )}
    </>
  )
}
