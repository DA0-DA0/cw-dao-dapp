import clsx from 'clsx'
import { ReactNode } from 'react'

interface DaoCardContainerProps {
  children: ReactNode
  className?: string
}

export const DaoCardContainer = ({
  children,
  className,
}: DaoCardContainerProps) => (
  <div
    className={clsx(
      'grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 grid-rows-auto',
      className
    )}
  >
    {children}
  </div>
)
