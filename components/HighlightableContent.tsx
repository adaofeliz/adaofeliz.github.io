'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { useAudioHighlight } from './AudioHighlightContext'

interface HighlightableContentProps {
  children: ReactNode
}

/**
 * Component that wraps MDX children and applies word-level highlighting
 * based on audio context using direct DOM manipulation for performance.
 */
export default function HighlightableContent({ children }: HighlightableContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const context = useAudioHighlight()
  const lastActiveIndexRef = useRef<number>(-1)
  const isWrappedRef = useRef(false)

  // On mount, wrap text words in spans with data-word-index
  useEffect(() => {
    const container = containerRef.current
    if (!container || isWrappedRef.current) return

    // Graceful degradation: if no context or no timestampData, don't wrap
    if (!context?.timestampData?.words?.length) return

    const words = context.timestampData.words
    let wordIndex = 0

    // Use TreeWalker to find all text nodes
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip empty text nodes
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT
        }

        // Check if parent or ancestor should be skipped
        let parent = node.parentElement
        while (parent && parent !== container) {
          const tagName = parent.tagName.toLowerCase()
          // Skip pre, code, and elements with data-no-highlight
          if (tagName === 'pre' || tagName === 'code' || parent.hasAttribute('data-no-highlight')) {
            return NodeFilter.FILTER_REJECT
          }
          parent = parent.parentElement
        }

        return NodeFilter.FILTER_ACCEPT
      },
    })

    const textNodes: Text[] = []
    let currentNode: Node | null
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode as Text)
    }

    // Process each text node
    for (const textNode of textNodes) {
      const text = textNode.textContent
      if (!text) continue

      const parent = textNode.parentNode
      if (!parent) continue

      // Split text into words (preserving whitespace)
      const fragments = text.split(/(\s+)/)
      const newNodes: Node[] = []

      for (const fragment of fragments) {
        if (!fragment) continue

        if (/^\s+$/.test(fragment)) {
          // Whitespace - keep as text node
          newNodes.push(document.createTextNode(fragment))
        } else if (wordIndex < words.length) {
          // Word - wrap in span
          const span = document.createElement('span')
          span.className = 'audio-word'
          span.setAttribute('data-word-index', String(wordIndex))
          span.textContent = fragment
          newNodes.push(span)
          wordIndex++
        } else {
          // More words in text than in timestamp data - keep as text
          newNodes.push(document.createTextNode(fragment))
        }
      }

      for (const newNode of newNodes) {
        parent.insertBefore(newNode, textNode)
      }
      parent.removeChild(textNode)
    }

    isWrappedRef.current = true
  }, [context?.timestampData])

  // On activeWordIndex change, update highlighting via direct DOM manipulation
  useEffect(() => {
    if (!context?.timestampData?.words?.length) return
    if (!isWrappedRef.current) return

    const container = containerRef.current
    if (!container) return

    const activeIndex = context.activeWordIndex
    const lastIndex = lastActiveIndexRef.current

    if (lastIndex >= 0) {
      const prevWord = container.querySelector(`[data-word-index="${lastIndex}"]`)
      if (prevWord) {
        prevWord.classList.remove('audio-word-active')
      }
    }

    // Add highlight to current word
    if (activeIndex >= 0) {
      const currentWord = container.querySelector(`[data-word-index="${activeIndex}"]`)
      if (currentWord) {
        currentWord.classList.add('audio-word-active')
      }
    }

    lastActiveIndexRef.current = activeIndex
  }, [context?.activeWordIndex, context?.timestampData])

  return <div ref={containerRef}>{children}</div>
}
