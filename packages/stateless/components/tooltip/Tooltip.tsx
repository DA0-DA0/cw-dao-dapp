import {
  Tooltip as MaterialTooltip,
  TooltipProps as MaterialTooltipProps,
} from '@mui/material'
import clsx from 'clsx'

export interface TooltipProps extends Omit<MaterialTooltipProps, 'title'> {
  title: MaterialTooltipProps['title'] | undefined
  morePadding?: boolean
}

export const Tooltip = ({
  title,
  morePadding,
  arrow,
  children,
  classes,
  ...props
}: TooltipProps) =>
  !title ? (
    <>{children}</>
  ) : (
    <MaterialTooltip
      arrow={arrow ?? true}
      classes={{
        ...classes,
        arrow: classes?.arrow ?? '!text-component-tooltip',
        tooltip: clsx(
          classes?.tooltip ??
            '!rounded-md !border !border-border-component-primary !bg-component-tooltip !font-sans !text-xs !font-normal !text-text-component-primary',
          morePadding && '!p-2 xs:!p-3'
        ),
      }}
      leaveTouchDelay={
        // Show tooltips for 3 seconds on touch devices.
        3000
      }
      title={title}
      {...props}
    >
      {children}
    </MaterialTooltip>
  )
