import clsx from 'clsx'
import { ComponentPropsWithoutRef, forwardRef } from 'react'

import { LinkWrapper } from '../LinkWrapper'
import {
  ButtonifiedChildren,
  ButtonifierProps,
  getButtonifiedClassNames,
  getPassthroughProps,
} from './Buttonifier'

export type ButtonLinkProps = ComponentPropsWithoutRef<'a'> & ButtonifierProps

// Forward ref so we can use Tooltip with this element.
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink({ children, ...props }, ref) {
    const className = clsx(
      getButtonifiedClassNames(props),
      'inline-block',
      props.disabled && 'pointer-events-none'
    )

    return (
      <LinkWrapper
        {...getPassthroughProps(props)}
        className={className}
        ref={ref}
      >
        <ButtonifiedChildren {...props}>{children}</ButtonifiedChildren>
      </LinkWrapper>
    )
  }
)
