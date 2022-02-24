import { CosmosMsgFor_Empty } from '@dao-dao/types/contracts/cw3-dao'
import { FieldErrors } from 'react-hook-form'
import { Config } from 'util/contractConfigWrapper'
import {
  AddTokenComponent,
  addTokenDefaults,
  transformAddTokenToCosmos,
} from './addToken'
import {
  DAOConfigUpdateDefaults,
  DAOUpdateConfigComponent,
  transformDAOToConfigUpdateCosmos,
} from './configUpdate'
import {
  CustomComponent,
  customDefaults,
  transformCustomToCosmos,
} from './custom'
import { MintComponent, mintDefaults, transformMintToCosmos } from './mint'
import {
  RemoveTokenComponent,
  removeTokenDefaults,
  transformRemoveTokenToCosmos,
} from './removeToken'
import { SpendComponent, spendDefaults, transformSpendToCosmos } from './spend'

// Adding a template to this list will cause it to be avaliable
// across the UI.
export const messageTemplates: MessageTemplate[] = [
  {
    label: '💵 Spend',
    component: SpendComponent,
    multisigSupport: true,
    getDefaults: spendDefaults,
    toCosmosMsg: transformSpendToCosmos,
  },
  {
    label: '🍵 Mint',
    component: MintComponent,
    multisigSupport: false,
    getDefaults: mintDefaults,
    toCosmosMsg: transformMintToCosmos,
  },
  {
    label: '🤖 Custom',
    component: CustomComponent,
    multisigSupport: true,
    getDefaults: customDefaults,
    toCosmosMsg: transformCustomToCosmos,
  },
  {
    label: '🎭 Update Config',
    component: DAOUpdateConfigComponent,
    multisigSupport: false,
    getDefaults: DAOConfigUpdateDefaults,
    toCosmosMsg: transformDAOToConfigUpdateCosmos,
  },
  {
    label: '🔘 Add Treasury Token',
    component: AddTokenComponent,
    multisigSupport: true,
    getDefaults: addTokenDefaults,
    toCosmosMsg: transformAddTokenToCosmos,
  },
  {
    label: '⭕️ Remove Treasury Token',
    component: RemoveTokenComponent,
    multisigSupport: true,
    getDefaults: removeTokenDefaults,
    toCosmosMsg: transformRemoveTokenToCosmos,
  },
]

// A component which will render a template's input form.
export type TemplateComponent = React.FunctionComponent<{
  contractAddress: string
  getLabel: (field: string) => string
  onRemove: () => void
  errors: FieldErrors
  multisig?: boolean
}>

// Defines a new template.
export interface MessageTemplate {
  label: string
  component: TemplateComponent
  multisigSupport: boolean
  getDefaults: (walletAddress: string, contractConfig: Config) => any
  toCosmosMsg: (self: any, props: ToCosmosMsgProps) => CosmosMsgFor_Empty
}

// The contextual information provided to templates when transforming
// from form inputs to cosmos messages.
export interface ToCosmosMsgProps {
  sigAddress: string
  govAddress: string
  govDecimals: number
  multisig: boolean
}

// When template data is being passed around in a form it must carry
// a label with it so that we can find it's component and
// transformation function later. This type just encodes that.
export interface TemplateMessage {
  label: string
}
