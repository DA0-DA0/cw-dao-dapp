// eslint-disable-next-line regex/invalid
import { ComponentType, FunctionComponent } from 'react'
import { FieldErrors } from 'react-hook-form'

import { LoaderProps, LogoProps } from '@dao-dao/ui'

import { ContractVersion } from './contract'
import { CosmosMsgFor_Empty } from './contracts/common'

export enum ActionKey {
  Spend = 'spend',
  Mint = 'mint',
  Stake = 'stake',
  AuthzAuthorization = 'authzAuthorization',
  AuthzExec = 'authzExec',
  AddCw20 = 'addCw20',
  CreateValidator = 'createValidator',
  EditValidator = 'editValidator',
  UnjailValidator = 'unjailValidator',
  RemoveCw20 = 'removeCw20',
  AddCw721 = 'addCw721',
  RemoveCw721 = 'removeCw721',
  ManageMembers = 'manageMembers',
  ManageSubDaos = 'manageSubDaos',
  UpdateInfo = 'updateInfo',
  UpdateProposalConfig = 'updateProposalConfig',
  Instantiate = 'instantiate',
  Execute = 'execute',
  Migrate = 'migrate',
  UpdateAdmin = 'updateAdmin',
  Custom = 'custom',
}

export interface ActionAndData {
  action: Action
  data: any
}

export interface ActionKeyAndData {
  key: ActionKey
  data: any
}

// A component which will render an action's input form.
export type ActionComponentProps<T = undefined, D = any> = {
  coreAddress: string
  fieldNamePrefix: string
  allActionsWithData: ActionKeyAndData[]
  index: number
  data: D
  Loader: ComponentType<LoaderProps>
  Logo: ComponentType<LogoProps>
} & (
  | {
      isCreating: true
      onRemove: () => void
      errors: FieldErrors
    }
  | {
      isCreating: false
      onRemove?: undefined
      errors?: undefined
    }
) &
  (T extends undefined ? {} : { options: T })

// eslint-disable-next-line regex/invalid
export type ActionComponent<T = undefined, D = any> = FunctionComponent<
  ActionComponentProps<T, D>
>

export type UseDefaults<D extends {} = any> = (coreAddress: string) => D

export type UseTransformToCosmos<D extends {} = any> = (
  coreAddress: string
) => (data: D) => CosmosMsgFor_Empty | { stargate: any } | undefined

export interface DecodeCosmosMsgNoMatch {
  match: false
  data?: never
}
export interface DecodeCosmosMsgMatch<D extends {} = any> {
  match: true
  data: D
}
export type UseDecodedCosmosMsg<D extends {} = any> = (
  msg: Record<string, any>,
  coreAddress: string
) => DecodeCosmosMsgNoMatch | DecodeCosmosMsgMatch<D>

// Defines a new action.
export interface Action<Data extends {} = any, Options extends {} = any> {
  key: ActionKey
  Icon: ComponentType
  label: string
  description: string
  Component: ActionComponent<Options>
  // Hook to get default fields for form display.
  useDefaults: UseDefaults<Data>
  // Hook to make function to convert action data to CosmosMsgFor_Empty.
  useTransformToCosmos: UseTransformToCosmos<Data>
  // Hook to make function to convert decoded msg to form display fields.
  useDecodedCosmosMsg: UseDecodedCosmosMsg<Data>
  // Optionally support only these coreVersions.
  supportedCoreVersions?: ContractVersion[]
}
