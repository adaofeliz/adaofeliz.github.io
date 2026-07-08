'use client'

import { useEffect, useState } from 'react'
import Link from '@/components/Link'

const navLinkClass = 'text-primary-600 dark:text-primary-400 hover:underline'

export default function NotFound() {
  const [path, setPath] = useState('~')

  useEffect(() => {
    const requestedPath = window.location.pathname.replace(/\/$/, '')

    setPath(requestedPath === '' || requestedPath === '/' ? '~' : requestedPath)
  }, [])

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <p className="font-mono text-lg text-gray-500 dark:text-gray-400">
        <span className="text-primary-500">$</span> cd {path}
      </p>

      <p className="font-mono text-base text-gray-500 dark:text-gray-400">
        bash: cd: {path}: No such file or directory
      </p>

      <p className="font-mono text-lg text-gray-500 dark:text-gray-400">
        <span className="text-primary-500">$</span> ls ~
      </p>

      <p className="font-mono text-base">
        <Link href="/" className={navLinkClass}>
          home
        </Link>{' '}
        <Link href="/blog/" className={navLinkClass}>
          blog/
        </Link>{' '}
        <Link href="/stream/" className={navLinkClass}>
          stream/
        </Link>{' '}
        <Link href="/about/" className={navLinkClass}>
          about/
        </Link>
      </p>

      <p className="font-mono text-lg text-gray-500 dark:text-gray-400">
        <span className="text-primary-500">$</span>
        <span
          aria-hidden="true"
          className="text-primary-500 ml-1 animate-pulse motion-reduce:animate-none"
        >
          _
        </span>
      </p>
    </div>
  )
}
