/* This example requires Tailwind CSS v2.0+ */
import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  HomeIcon,
  InboxIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
} from '@heroicons/react/outline'
import Logo from 'components/Logo'
import Link from 'next/link'
import { useSigningClient } from 'contexts/cosmwasm'
import ThemeToggle from 'components/ThemeToggle'
import NavContractLabel from 'components/NavContractLabel'
import TwitterLogo from 'components/TwitterLogo'
import GitHubLogo from 'components/GitHubLogo'

const PUBLIC_SITE_ICON_URL = process.env.NEXT_PUBLIC_SITE_ICON_URL || ''
const PUBLIC_SITE_TITLE = process.env.NEXT_PUBLIC_SITE_TITLE

const POWERED_BY_URL = 'https://junonetwork.io'
const TWITTER_URL = 'https://twitter.com/da0_da0'
const GITHUB_URL = 'https://github.com/DA0-DA0'

const navigation = [
  { name: 'DAOs', href: '/dao', icon: HomeIcon, current: true },
  { name: 'Multisigs', href: '/multisig', icon: UsersIcon, current: false },
]

// TODO move to util?
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const Sidebar = () => {
  const { walletAddress, connectWallet, disconnect } = useSigningClient()
  const handleConnect = () => {
    if (walletAddress.length === 0) {
      connectWallet()
    } else {
      disconnect()
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base border-r border-base px-2">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-4">
          <Link href="/">
            <a>
              <Logo height={32} width={32} alt={`${PUBLIC_SITE_TITLE} Logo`} />
            </a>
          </Link>
          <Link href="/">
            <a className="ml-1 md:ml-2 link link-hover font-semibold text-xl md:text-2xl align-top">
              {PUBLIC_SITE_TITLE}
            </a>
          </Link>
        </div>
        <div className="flex flex-grow-0 m-2">
          <button
            className={`block btn btn-outline btn-base w-full max-w-full truncate ${
              walletAddress.length > 0 ? 'lowercase' : ''
            }`}
            onClick={handleConnect}
          >
            {walletAddress || 'Connect Wallet'}
          </button>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <Link href={item.href} passHref>
              <a
                key={item.name}
                className={classNames(
                  item.current
                    ? 'bg-base-content hover:bg-base-content text-base-100'
                    : 'text-base hover:bg-base-content hover:bg-opacity-75',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-base p-4">
        <a href="#" className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-base">
                Powered by{' '}
                <a
                  className="link link-primary link-hover"
                  href={POWERED_BY_URL}
                >
                  Juno
                </a>
              </p>
              <p className="text-xs font-medium text-base opacity-75 flex">
                <a href={TWITTER_URL} className="hover:opacity-100">
                  <TwitterLogo />
                </a>
                <a href={GITHUB_URL} className="hover:opacity-100">
                  <GitHubLogo />
                </a>
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 flex z-40 md:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-base-100">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-base"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XIcon className="h-6 w-6 text-base" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <Sidebar />
              </div>
            </Transition.Child>
            <div className="flex-shrink-0 w-14" aria-hidden="true">
              {/* Force sidebar to shrink to fit close icon */}
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <Sidebar />
        </div>
        <div className="md:pl-64 flex flex-col flex-1">
          <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-base-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <main className="flex-1">
            <div className="py-6">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
