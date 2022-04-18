import { FC } from 'react'

import { useThemeContext } from '../../theme'

export interface BalanceIconProps {
  iconURI?: string
}

export const BalanceIcon: FC<BalanceIconProps> = ({ iconURI }) => {
  const { accentColor } = useThemeContext()

  return (
    <div
      className="w-4 h-4 bg-brand bg-center bg-cover rounded-full"
      style={{
        ...(!!accentColor && { backgroundColor: accentColor }),
        backgroundImage: iconURI ? `url(${iconURI})` : '',
      }}
    ></div>
  )
}
