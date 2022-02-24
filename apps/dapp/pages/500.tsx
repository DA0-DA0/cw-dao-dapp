import type { NextPage } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'

const Custom500: NextPage = () => {
  const router = useRouter()

  return (
    <div className="max-w-prose break-words p-6">
      <h1 className="text-3xl font-bold">500 - Internal Server Error</h1>
      <p className="mt-3">
        An internal server error occured while trying to access{' '}
        <code>{router.asPath}</code>. Consider returning{' '}
        <Link href="/">
          <a className="link">home</a>
        </Link>
      </p>
    </div>
  )
}

export default Custom500
