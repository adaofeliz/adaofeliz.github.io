'use client'

import { useEffect, useRef, useState } from 'react'
import Link from '@/components/Link'

const TYPE_INTERVAL_MS = 40
const QUOTE_DELAY_MS = 5000
const SESSION_STORAGE_KEY = 'adflz-quotes-typed'

type HomeQuotesProps = Readonly<{
  quotes: ReadonlyArray<{
    readonly text: string
    readonly slug: string
    readonly title: string
  }>
}>

export default function HomeQuotes({ quotes }: HomeQuotesProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
  const [visibleText, setVisibleText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCancelledRef = useRef(false)

  useEffect(() => {
    const firstQuote = quotes[0]

    if (firstQuote === undefined) {
      return () => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current)
        }
      }
    }

    isCancelledRef.current = false

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasTypedInSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY) === '1'

    if (prefersReducedMotion || hasTypedInSession) {
      setCurrentQuoteIndex(0)
      setVisibleText(firstQuote.text)
      setIsTyping(false)

      return () => {
        isCancelledRef.current = true

        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current)
        }
      }
    }

    let quoteIndex = 0

    const typeQuote = () => {
      const quote = quotes[quoteIndex]

      if (quote === undefined || isCancelledRef.current) {
        return
      }

      setCurrentQuoteIndex(quoteIndex)
      setVisibleText('')
      setIsTyping(true)

      let charIndex = 0

      const typeCharacter = () => {
        timeoutRef.current = setTimeout(() => {
          if (isCancelledRef.current) {
            return
          }

          charIndex += 1
          setVisibleText(quote.text.slice(0, charIndex))

          if (charIndex < quote.text.length) {
            typeCharacter()
            return
          }

          setIsTyping(false)
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, '1')

          timeoutRef.current = setTimeout(() => {
            if (isCancelledRef.current) {
              return
            }

            quoteIndex = (quoteIndex + 1) % quotes.length
            typeQuote()
          }, QUOTE_DELAY_MS)
        }, TYPE_INTERVAL_MS)
      }

      typeCharacter()
    }

    typeQuote()

    return () => {
      isCancelledRef.current = true

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [quotes])

  if (quotes.length === 0) {
    return null
  }

  const currentQuote = quotes[currentQuoteIndex] ?? quotes[0]

  if (currentQuote === undefined) {
    return null
  }

  return (
    <section className="py-16">
      <h2 className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-widest uppercase">
        QUOTES
      </h2>
      <div className="mt-8 space-y-6">
        <blockquote key={currentQuote.slug} className="border-primary-500 border-l-4 pl-4">
          <p className="font-mono text-lg text-gray-600 italic dark:text-gray-400">
            <span className="text-primary-500">$</span>{' '}
            <span className="text-[#1e1e1e] dark:text-gray-100">{visibleText}</span>
            {isTyping ? (
              <span
                aria-hidden="true"
                className="text-primary-500 ml-1 animate-pulse motion-reduce:animate-none"
              >
                _
              </span>
            ) : null}
          </p>
          <footer className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            —{' '}
            <Link
              href={`/blog/${currentQuote.slug}/`}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {currentQuote.title}
            </Link>
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
