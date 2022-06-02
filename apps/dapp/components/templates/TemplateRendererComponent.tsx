import { FunctionComponent } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { useGovernanceTokenInfo } from '@dao-dao/state'
import { CosmosMessageDisplay } from '@dao-dao/ui'
import {
  TemplateRendererComponentProps,
  TemplateComponentLoader,
} from '@dao-dao/ui/components/templates'

import { templateAndDataForDecodedCosmosMsg } from '.'
import { useOrgInfoContext } from '../OrgPageWrapper'
import { SuspenseLoader } from '../SuspenseLoader'

const InnerTemplateRendererComponent: FunctionComponent<
  TemplateRendererComponentProps
> = ({ message }) => {
  const { coreAddress } = useOrgInfoContext()
  const { governanceTokenInfo } = useGovernanceTokenInfo(coreAddress)

  // TODO: Add cw4-voting support.
  const { template = undefined, data = undefined } = governanceTokenInfo
    ? templateAndDataForDecodedCosmosMsg(message, {
        govTokenDecimals: governanceTokenInfo.decimals ?? 1,
      }) ?? {}
    : {}
  const formMethods = useForm({ defaultValues: data ?? {} })

  // If could not load required state or did not match template, just
  // display raw message.
  if (!template || !data) {
    return (
      <CosmosMessageDisplay value={JSON.stringify(message, undefined, 2)} />
    )
  }

  const { Component } = template

  return (
    <FormProvider {...formMethods}>
      <form>
        <Component getLabel={(field: string) => field} readOnly />
      </form>
    </FormProvider>
  )
}

export const TemplateRendererComponent: FunctionComponent<
  TemplateRendererComponentProps
> = (props) => (
  <SuspenseLoader fallback={<TemplateComponentLoader />}>
    <InnerTemplateRendererComponent {...props} />
  </SuspenseLoader>
)
