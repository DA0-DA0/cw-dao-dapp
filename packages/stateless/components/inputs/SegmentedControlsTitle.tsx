import clsx from 'clsx'
import { FieldValues, Path, useFormContext } from 'react-hook-form'

import { SegmentedControlsProps } from '@dao-dao/types'

import { SegmentedControls } from './SegmentedControls'

export type SegmentedControlsTitleProps<
  T extends unknown,
  FV extends FieldValues,
  FieldName extends Path<FV>,
> = Omit<SegmentedControlsProps<T>, 'selected' | 'onSelect'> & {
  editable: boolean
  fieldName: FieldName
}

// Show segmented controls when editing and title of selected tab otherwise.
export const SegmentedControlsTitle = <
  T extends unknown,
  FV extends FieldValues,
  FieldName extends Path<FV>,
>({
  editable,
  fieldName,
  ...props
}: SegmentedControlsTitleProps<T, FV, FieldName>) => {
  const { watch, setValue } = useFormContext<FV>()
  const value = watch(fieldName)

  const selectedTab = props.tabs.find((tab) => tab.value === value)

  return (
    <>
      {editable ? (
        <SegmentedControls<T>
          {...props}
          onSelect={(value) => setValue(fieldName, value as any)}
          selected={value}
        />
      ) : (
        <p className={clsx('title-text', props.className)}>
          {selectedTab?.label}
        </p>
      )}
    </>
  )
}
