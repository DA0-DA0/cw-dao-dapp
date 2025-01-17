import { ComponentType, ReactNode } from 'react'

import { IconButtonProps } from './IconButtonifier'
import { LinkWrapperProps } from './LinkWrapper'

export type CollapsibleProps = {
  label: string
  tooltip?: string
  imageUrl?: string
  link?: {
    href: string
    LinkWrapper: ComponentType<LinkWrapperProps>
  }
  defaultCollapsed?: boolean
  onExpand?: (expanded: boolean) => void
  indentDropdownSize?: number
  /**
   * Whether or not to indent the dropdown header.
   */
  noHeaderIndent?: boolean
  /**
   * Whether or not to indent the dropdown content.
   */
  noContentIndent?: boolean
  /**
   * Hide the placeholder dot when there are no children and thus no dropdown.
   */
  noPlaceholderDot?: boolean
  /**
   * Override the dropdown icon size. Defaults to `sm`.
   */
  dropdownIconSize?: IconButtonProps['size']
  selected?: boolean
  children?: ReactNode | ReactNode[]
  containerClassName?: string
  headerClassName?: string
  imageClassName?: string
  labelClassName?: string
  labelContainerClassName?: string
  dropdownContainerClassName?: string
  contentContainerClassName?: string
}
