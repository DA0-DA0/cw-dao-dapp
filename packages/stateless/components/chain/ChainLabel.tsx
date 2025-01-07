import clsx from 'clsx'

import { getDisplayNameForChainId } from '@dao-dao/utils'

import { ChainLogo } from './ChainLogo'

export type ChainLabelProps = {
  /**
   * Chain ID.
   */
  chainId: string
  /**
   * Whether or not to display in header mode. Defaults to false.
   */
  header?: boolean
  /**
   * Whether or not to display in title mode. Defaults to false.
   */
  title?: boolean
  /**
   * Optional container class name.
   */
  className?: string
}

export const ChainLabel = ({
  chainId,
  header,
  title,
  className,
}: ChainLabelProps) => (
  <div
    className={clsx(
      'flex flex-row items-center gap-2',
      header && 'xs:gap-3',
      className
    )}
  >
    {header ? (
      <>
        <ChainLogo chainId={chainId} className="xs:hidden" size={22} />
        <ChainLogo chainId={chainId} className="hidden xs:block" size={28} />
      </>
    ) : (
      <ChainLogo chainId={chainId} size={title ? 28 : 20} />
    )}

    <p
      className={clsx(
        header
          ? 'title-text xs:header-text'
          : title
            ? 'title-text'
            : 'primary-text'
      )}
    >
      {getDisplayNameForChainId(chainId)}
    </p>
  </div>
)
