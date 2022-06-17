import {
  ArrowRightIcon,
  MenuAlt1Icon,
  MenuIcon,
  SearchIcon,
} from '@heroicons/react/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { FC, useState } from 'react'
import { useSetRecoilState } from 'recoil'

import { ConnectWalletButton } from '@dao-dao/common'
import { Logo, SuspenseLoader } from '@dao-dao/ui'

import { Loader } from './Loader'
import { NavListItem } from './NavListItem'
import { MobilePinnedDAONavList } from './PinnedDAONavList'
import { searchVisibleAtom } from '@/atoms'

interface SmallScreenNavProps {
  className?: string
}

export const SmallScreenNav: FC<SmallScreenNavProps> = ({ className }) => {
  const [expanded, setExpanded] = useState(false)
  const setSearchVisible = useSetRecoilState(searchVisibleAtom)

  return (
    <div
      className={clsx(
        'flex flex-col gap-4 py-2 px-6 lg:hidden',
        {
          'h-16': !expanded,
          'pb-6 border-b border-inactive': expanded,
        },
        className
      )}
    >
      <div className="flex gap-6 justify-between items-center">
        <Link href="/home" passHref>
          <a>
            <Logo height={28} width={28} />
          </a>
        </Link>
        <ConnectWalletButton mobile />
        <button onClick={() => setExpanded((e) => !e)} type="button">
          {!expanded && <MenuIcon className="w-5" />}
          {expanded && <MenuAlt1Icon className="w-5" />}
        </button>
      </div>
      {expanded && (
        <div>
          <button
            className="flex gap-2 items-center p-2 mb-5 w-full bg-primary rounded-lg link-text"
            onClick={() => setSearchVisible(true)}
          >
            <SearchIcon className="w-4 h-4" /> Search
          </button>

          <div className="ml-1">
            <h3 className="mb-2 font-mono caption-text">DAOs</h3>
            <SuspenseLoader
              fallback={<Loader className="!justify-start ml-2" size={20} />}
            >
              <MobilePinnedDAONavList />
            </SuspenseLoader>

            <ul className="mt-2 list-none">
              <NavListItem
                href="/dao/explore"
                icon={ArrowRightIcon}
                text="All DAOs"
              />
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
