import { Entity } from '../entity'
import { LoadingData } from '../misc'

export type EntityDisplayProps = {
  address: string
  loadingEntity: LoadingData<Entity>
  imageSize?: number
  hideImage?: boolean
  size?: 'default' | 'lg' | 'custom'
  className?: string
  textClassName?: string
  noCopy?: boolean
  noUnderline?: boolean
  showFullAddress?: boolean
  noLink?: boolean
  openInNewTab?: boolean
}

export type StatefulEntityDisplayProps = Omit<
  EntityDisplayProps,
  'loadingEntity'
> &
  Partial<Pick<EntityDisplayProps, 'loadingEntity'>>
