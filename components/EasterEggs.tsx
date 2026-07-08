'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createKeyBuffer, isEditableTarget } from '@/lib/keybuffer'

declare global {
  var __adflzBanner: boolean | undefined
}

const MAIN_FADE_CLASSES = [
  'transition-opacity',
  'duration-[2500ms]',
  'opacity-0',
  'pointer-events-none',
] as const

const DELETE_LINES = [
  '$ sudo rm -rf /',
  "rm: descending into '/'...",
  "rm: removing '/etc'...",
  "rm: removing '/usr'...",
  "rm: removing '/home'...",
  "rm: removing '/var'...",
  "rm: cannot remove '/': Permission denied",
  '',
  'restoring from backup... done',
] as const

const LINE_INTERVAL_MS = 550

const BANNER_STYLE = 'color: #14b8a6; font-weight: bold; font-size: 14px; font-family: monospace'
const HINT_STYLE = 'color: #6b7280; font-size: 12px; font-family: monospace'

export default function EasterEggs() {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const [visibleLineCount, setVisibleLineCount] = useState(0)
  const mainRef = useRef<HTMLElement | null>(null)
  const savedMainClassNameRef = useRef<string | null>(null)
  const overlayVisibleRef = useRef(false)
  const showOverlayTimeoutRef = useRef<number | null>(null)
  const lineIntervalRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (showOverlayTimeoutRef.current !== null) {
      window.clearTimeout(showOverlayTimeoutRef.current)
      showOverlayTimeoutRef.current = null
    }

    if (lineIntervalRef.current !== null) {
      window.clearInterval(lineIntervalRef.current)
      lineIntervalRef.current = null
    }
  }, [])

  const restoreMain = useCallback(() => {
    if (mainRef.current !== null && savedMainClassNameRef.current !== null) {
      mainRef.current.className = savedMainClassNameRef.current
    }

    mainRef.current = null
    savedMainClassNameRef.current = null
  }, [])

  const teardownOverlay = useCallback(() => {
    clearTimers()
    restoreMain()
    overlayVisibleRef.current = false
  }, [clearTimers, restoreMain])

  const hideOverlay = useCallback(() => {
    teardownOverlay()
    setIsOverlayVisible(false)
    setVisibleLineCount(0)
  }, [teardownOverlay])

  const showOverlay = useCallback((instant: boolean) => {
    overlayVisibleRef.current = true
    setIsOverlayVisible(true)

    if (instant) {
      setVisibleLineCount(DELETE_LINES.length)
      return
    }

    let nextLine = 0
    lineIntervalRef.current = window.setInterval(() => {
      nextLine += 1
      setVisibleLineCount(nextLine)

      if (nextLine >= DELETE_LINES.length && lineIntervalRef.current !== null) {
        window.clearInterval(lineIntervalRef.current)
        lineIntervalRef.current = null
      }
    }, LINE_INTERVAL_MS)
  }, [])

  const triggerOverlay = useCallback(() => {
    teardownOverlay()

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const main = document.querySelector('main')

    mainRef.current = main instanceof HTMLElement ? main : null
    savedMainClassNameRef.current = mainRef.current?.className ?? null

    if (reduceMotion || mainRef.current === null) {
      showOverlay(reduceMotion)
    } else {
      mainRef.current.classList.add(...MAIN_FADE_CLASSES)
      showOverlayTimeoutRef.current = window.setTimeout(() => {
        showOverlay(false)
      }, 2500)
    }
  }, [showOverlay, teardownOverlay])

  useEffect(() => {
    if (globalThis.__adflzBanner) {
      return
    }

    globalThis.__adflzBanner = true

    console.log('%c$ ~/_adflz', BANNER_STYLE)
    console.log('terminal-native digital garden')
    console.log('%cpsst: try typing "sudo rm -rf /" anywhere on this site', HINT_STYLE)
    console.log('')
  }, [])

  useEffect(() => {
    const buf = createKeyBuffer('sudo rm -rf /')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && overlayVisibleRef.current) {
        hideOverlay()
        return
      }

      if (overlayVisibleRef.current) {
        return
      }

      if (isEditableTarget(document.activeElement)) {
        return
      }

      if (buf.push(event)) {
        triggerOverlay()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      teardownOverlay()
    }
  }, [hideOverlay, teardownOverlay, triggerOverlay])

  if (!isOverlayVisible) {
    return null
  }

  const hasFinishedPrinting = visibleLineCount >= DELETE_LINES.length

  return (
    <div
      aria-label="Easter egg overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        aria-live="polite"
        role="status"
        className="w-full max-w-md rounded-sm border border-gray-800 bg-gray-950/95 p-6 font-mono text-sm text-gray-300 shadow-[0_0_0_1px_rgba(24,24,27,0.35)]"
      >
        <div className="min-h-[11rem] space-y-1">
          {DELETE_LINES.slice(0, visibleLineCount).map((line, index) => (
            <p key={index} className={line === '' ? 'h-3' : undefined}>
              {line}
              {index === visibleLineCount - 1 && !hasFinishedPrinting && (
                <span
                  aria-hidden="true"
                  className="text-primary-500 ml-1 animate-pulse motion-reduce:animate-none"
                >
                  _
                </span>
              )}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={hideOverlay}
          disabled={!hasFinishedPrinting}
          className="text-primary-500 hover:text-primary-400 mt-4 flex items-center gap-2 border-t border-gray-800 pt-4 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">$</span> cd ~ && get back
          <span aria-hidden="true" className="ml-1 animate-pulse motion-reduce:animate-none">
            _
          </span>
        </button>
      </div>
    </div>
  )
}
