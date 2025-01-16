import clsx from 'clsx'
import {
  ComponentPropsWithoutRef,
  RefCallback,
  forwardRef,
  useCallback,
} from 'react'

import { useDetectTruncate } from '../../hooks/useDetectTruncate'
import { Tooltip } from './Tooltip'

export type TextWithTooltipWhenTruncatedProps = ComponentPropsWithoutRef<'p'>

export const TextWithTooltipWhenTruncated = forwardRef<
  HTMLParagraphElement,
  TextWithTooltipWhenTruncatedProps
>(function TextWithTooltipWhenTruncated(
  { className, children, ...props },
  forwardedRef
) {
  const { textRef, truncated } = useDetectTruncate()

  const ref: RefCallback<HTMLParagraphElement> = useCallback(
    (ref) => {
      textRef(ref)

      if (typeof forwardedRef === 'function') {
        forwardedRef(ref)
      } else if (forwardedRef) {
        forwardedRef.current = ref
      }
    },
    [forwardedRef, textRef]
  )

  return (
    <Tooltip title={truncated ? (children ?? undefined) : undefined}>
      <p {...props} className={clsx('truncate', className)} ref={ref}>
        {children}
      </p>
    </Tooltip>
  )
})
