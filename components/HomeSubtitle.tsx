'use client'

import { useEffect, useRef, useState } from 'react'
import Link from '@/components/Link'
import { formatLogTimestamp } from '@/lib/latestPost'

const COMMAND_TEXT = 'ls -t ~/blog | head -3'
const MISSING_BLOG_TEXT = "ls: cannot access '~/blog': No such file or directory"
const TYPE_INTERVAL_MS = 40
const SESSION_STORAGE_KEY = 'adflz-home-typed'

type HomeSubtitleLatest = Readonly<{
  title: string
  slug: string
  date: string
}>

type HomeSubtitleProps = Readonly<{
  latest: ReadonlyArray<HomeSubtitleLatest>
}>

export default function HomeSubtitle({ latest }: HomeSubtitleProps) {
  const [visibleText, setVisibleText] = useState(COMMAND_TEXT)
  const [hasFinishedTyping, setHasFinishedTyping] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasTypedInSession = sessionStorage.getItem(SESSION_STORAGE_KEY) === '1'

    if (prefersReducedMotion || hasTypedInSession) {
      return () => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current)
        }
      }
    }

    setVisibleText('')
    setHasFinishedTyping(false)

    let nextIndex = 0

    const typeNextCharacter = () => {
      timeoutRef.current = setTimeout(() => {
        nextIndex += 1
        setVisibleText(COMMAND_TEXT.slice(0, nextIndex))

        if (nextIndex < COMMAND_TEXT.length) {
          typeNextCharacter()
          return
        }

        setHasFinishedTyping(true)
        sessionStorage.setItem(SESSION_STORAGE_KEY, '1')
      }, TYPE_INTERVAL_MS)
    }

    typeNextCharacter()

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <span className="sr-only">{COMMAND_TEXT}</span>
      <span className="sr-only">
        {latest.length > 0
          ? `Latest posts: ${latest
              .slice(0, 3)
              .map((post) => `${formatLogTimestamp(post.date)} ${post.title}`)
              .join(', ')}`
          : MISSING_BLOG_TEXT}
      </span>
      <p
        aria-hidden="true"
        className="min-h-[2.5rem] font-mono text-xs text-gray-500 sm:text-sm dark:text-gray-400"
      >
        <span className="text-primary-500">$</span> {visibleText}
        <span
          aria-hidden="true"
          className="text-primary-500 ml-1 animate-pulse motion-reduce:animate-none"
        >
          _
        </span>
      </p>
      <div
        className={`font-mono text-xs transition-opacity duration-500 sm:text-sm ${
          hasFinishedTyping ? 'opacity-100' : 'invisible opacity-0'
        }`}
      >
        {latest.length > 0 ? (
          <div className="space-y-1">
            {latest.slice(0, 3).map((post) => (
              <div key={post.slug} className="flex items-baseline gap-1.5">
                <span className="shrink-0 whitespace-nowrap text-gray-400 dark:text-gray-500">
                  [{formatLogTimestamp(post.date)}]
                </span>
                <span aria-hidden="true" className="text-primary-500 shrink-0">
                  &gt;
                </span>
                <Link
                  href={`/blog/${post.slug}/`}
                  className="hover:text-primary-600 dark:hover:text-primary-400 min-w-0 truncate text-[#1e1e1e] dark:text-gray-100"
                >
                  {post.title}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          MISSING_BLOG_TEXT
        )}
      </div>
    </div>
  )
}
