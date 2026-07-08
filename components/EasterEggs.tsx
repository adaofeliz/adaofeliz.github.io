'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createKeyBuffer, isEditableTarget } from '@/lib/keybuffer'

declare global {
  var __adflzBanner: boolean | undefined
}

const MAIN_FADE_CLASSES = [
  'transition-opacity',
  'duration-700',
  'opacity-0',
  'pointer-events-none',
] as const

const BANNER_STYLE = 'color: #14b8a6; font-weight: bold; font-size: 14px; font-family: monospace'
const HINT_STYLE = 'color: #6b7280; font-size: 12px; font-family: monospace'

export default function EasterEggs() {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)
  const savedMainClassNameRef = useRef<string | null>(null)
  const overlayVisibleRef = useRef(false)
  const showOverlayTimeoutRef = useRef<number | null>(null)
  const hideOverlayTimeoutRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (showOverlayTimeoutRef.current !== null) {
      window.clearTimeout(showOverlayTimeoutRef.current)
      showOverlayTimeoutRef.current = null
    }

    if (hideOverlayTimeoutRef.current !== null) {
      window.clearTimeout(hideOverlayTimeoutRef.current)
      hideOverlayTimeoutRef.current = null
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
  }, [teardownOverlay])

  const showOverlay = useCallback(() => {
    overlayVisibleRef.current = true
    setIsOverlayVisible(true)
  }, [])

  const triggerOverlay = useCallback(() => {
    teardownOverlay()

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const main = document.querySelector('main')

    mainRef.current = main instanceof HTMLElement ? main : null
    savedMainClassNameRef.current = mainRef.current?.className ?? null

    if (reduceMotion || mainRef.current === null) {
      showOverlay()
    } else {
      mainRef.current.classList.add(...MAIN_FADE_CLASSES)
      showOverlayTimeoutRef.current = window.setTimeout(() => {
        showOverlay()
      }, 900)
    }

    hideOverlayTimeoutRef.current = window.setTimeout(() => {
      hideOverlay()
    }, 1600)
  }, [hideOverlay, showOverlay, teardownOverlay])

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

  return (
    <div
      aria-label="Dismiss easter egg overlay"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={hideOverlay}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          hideOverlay()
        }
      }}
      role="button"
      tabIndex={-1}
    >
      <div
        aria-live="polite"
        role="status"
        className="rounded-sm border border-gray-800 bg-gray-950/85 p-6 font-mono text-sm text-gray-300 shadow-[0_0_0_1px_rgba(24,24,27,0.35)]"
      >
        <p>$ sudo rm -rf /</p>
        <p>rm: descending into /...</p>
        <p>rm: cannot remove '/': Permission denied</p>
        <p>restoring from backup... done</p>
      </div>
    </div>
  )
}
