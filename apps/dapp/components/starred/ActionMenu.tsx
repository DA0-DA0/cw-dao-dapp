import { PlusIcon, MapIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import { ReactNode } from 'react'

const ActionItem = ({
  href,
  icon,
  text,
}: {
  href: string
  icon: ReactNode
  text: string
}) => (
  <div className="py-0.5 px-2 hover:bg-secondary rounded-md link-text">
    <Link href={href}>
      <a className="flex gap-2 items-center">
        {icon}
        {text}
      </a>
    </Link>
  </div>
)

export const ActionMenu = () => (
  <div className="p-4 bg-primary rounded-md border border-transparent hover:border-btn-secondary">
    <div className="flex flex-col gap-1 font-medium md:gap-0 text-md">
      <ActionItem
        href="/org/create"
        icon={<PlusIcon className="w-4" />}
        text="Create an Org"
      />
      <ActionItem
        href="/org/explore"
        icon={<MapIcon className="w-4" />}
        text="Explore all Orgs"
      />
    </div>
  </div>
)
