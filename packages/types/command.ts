import { ComponentType, ReactNode } from 'react'
import { TFunction } from 'react-i18next'

import { ContractVersion } from './features'

export type StatefulCommandModalProps = {
  visible: boolean
  setVisible: (visible: boolean) => void
  // Root context maker can take no extra options.
  makeRootContext: CommandModalContextMaker
}

export type CommandModalContextSectionItem<
  ExtraItemProperties extends {} = {},
> = ExtraItemProperties & {
  name: string
  tooltip?: string
  className?: string
  disabled?: boolean
  loading?: boolean
  // If true, sorts last even if it matches search.
  sortLast?: boolean
  /**
   * Optional set of additional keywords to match.
   */
  keywords?: string[]
} & (
    | {
        imageUrl: string
        Icon?: never
      }
    | {
        imageUrl?: never
        Icon: ComponentType<{ className: string }>
      }
  )

export type CommandModalContextSection<ExtraItemProperties extends {} = {}> = {
  name: string
  items: CommandModalContextSectionItem<ExtraItemProperties>[]
  onChoose: (item: CommandModalContextSectionItem<ExtraItemProperties>) => void
  loading?: boolean
}

export type CommandModalContextUseSectionsOptions = {
  filter: string
}

export type CommandModalContextUseSections = (
  options: CommandModalContextUseSectionsOptions
) => CommandModalContextSection[]

export type CommandModalContext = {
  useSections: CommandModalContextUseSections
  name: string
  imageUrl?: string
  // If defined, will wrap the context with this component around where
  // `useSections` will be called.
  Wrapper?: CommandModalContextWrapper
}

export type CommandModalContextWrapper = ComponentType<{ children: ReactNode }>

export type CommandModalContextMakerOptions<MakerOptions extends {} = {}> =
  MakerOptions & {
    t: TFunction
    openContext: (context: CommandModalContext) => void
  }

export type CommandModalContextMaker<MakerOptions extends {} = {}> = (
  options: CommandModalContextMakerOptions<MakerOptions>
) => CommandModalContext

export type CommandModalDaoInfo = {
  chainId: string
  coreAddress: string
  coreVersion: ContractVersion | undefined
  name: string
  imageUrl: string
}
