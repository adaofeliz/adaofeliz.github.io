'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PostMindmapProps {
  svgPath: string
  title: string
}

const MIN_SCALE = 0.3
const MAX_SCALE = 4

export default function PostMindmap({ svgPath, title }: PostMindmapProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const scaleRef = useRef(1)
  const translateRef = useRef({ x: 0, y: 0 })
  const initialPinchRef = useRef<number | null>(null)
  const initialScaleRef = useRef(1)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panTranslateRef = useRef({ x: 0, y: 0 })
  const fitScaleRef = useRef(1)

  useEffect(() => {
    fetch(svgPath)
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => setSvgContent(null))
  }, [svgPath])

  const updateZoomState = useCallback(() => {
    setIsZoomed(scaleRef.current > fitScaleRef.current * 1.05)
  }, [])

  const applyTransform = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const s = scaleRef.current
    const t = translateRef.current
    el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${s})`
  }, [])

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const svg = content.querySelector('svg')
    if (!svg) return

    const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number)
    const svgW = vb && vb.length === 4 ? vb[2] : svg.clientWidth || 800
    const svgH = vb && vb.length === 4 ? vb[3] : svg.clientHeight || 400
    const cw = container.clientWidth
    const ch = container.clientHeight || 300

    const scale = Math.min(cw / svgW, ch / svgH, 1)
    fitScaleRef.current = scale
    scaleRef.current = scale
    translateRef.current = {
      x: (cw - svgW * scale) / 2,
      y: (ch - svgH * scale) / 2,
    }

    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.style.width = `${svgW}px`
    svg.style.height = `${svgH}px`

    applyTransform()
    updateZoomState()
  }, [applyTransform, updateZoomState])

  useEffect(() => {
    if (isExpanded && svgContent) {
      requestAnimationFrame(() => fitToContainer())
    }
  }, [isExpanded, svgContent, fitToContainer])

  const clampTranslate = useCallback(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return
    const svg = content.querySelector('svg')
    if (!svg) return

    const s = scaleRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const sw = svg.clientWidth * s
    const sh = svg.clientHeight * s
    const t = translateRef.current

    if (sw <= cw) {
      t.x = (cw - sw) / 2
    } else {
      t.x = Math.min(0, Math.max(cw - sw, t.x))
    }
    if (sh <= ch) {
      t.y = (ch - sh) / 2
    } else {
      t.y = Math.min(0, Math.max(ch - sh, t.y))
    }
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      const oldScale = scaleRef.current
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * delta))

      const t = translateRef.current
      t.x = px - ((px - t.x) / oldScale) * newScale
      t.y = py - ((py - t.y) / oldScale) * newScale
      scaleRef.current = newScale

      clampTranslate()
      applyTransform()
      updateZoomState()
    },
    [applyTransform, clampTranslate, updateZoomState]
  )

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      initialPinchRef.current = Math.hypot(dx, dy)
      initialScaleRef.current = scaleRef.current
      isPanningRef.current = false
    } else if (e.touches.length === 1) {
      isPanningRef.current = true
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      panTranslateRef.current = { ...translateRef.current }
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 2 && initialPinchRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const ratio = dist / initialPinchRef.current
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScaleRef.current * ratio))

        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
          const oldScale = scaleRef.current
          const t = translateRef.current
          t.x = cx - ((cx - t.x) / oldScale) * newScale
          t.y = cy - ((cy - t.y) / oldScale) * newScale
        }

        scaleRef.current = newScale
        clampTranslate()
        applyTransform()
        updateZoomState()
      } else if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - panStartRef.current.x
        const dy = e.touches[0].clientY - panStartRef.current.y
        translateRef.current = {
          x: panTranslateRef.current.x + dx,
          y: panTranslateRef.current.y + dy,
        }
        clampTranslate()
        applyTransform()
      }
    },
    [applyTransform, clampTranslate, updateZoomState]
  )

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchRef.current = null
    }
    if (e.touches.length === 0) {
      isPanningRef.current = false
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    isPanningRef.current = true
    panStartRef.current = { x: e.clientX, y: e.clientY }
    panTranslateRef.current = { ...translateRef.current }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return
      e.preventDefault()
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      translateRef.current = {
        x: panTranslateRef.current.x + dx,
        y: panTranslateRef.current.y + dy,
      }
      clampTranslate()
      applyTransform()
    },
    [applyTransform, clampTranslate]
  )

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  const toggle = () => setIsExpanded((prev) => !prev)

  return (
    <div className="my-4">
      <button
        onClick={toggle}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? `Hide mindmap for ${title}` : `View mindmap for ${title}`}
        data-testid="mindmap-toggle"
        className="hover:text-primary-500 dark:hover:text-primary-400 flex cursor-pointer items-center gap-2 text-sm text-gray-500 transition-colors duration-150 dark:text-gray-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="5" y2="17" />
          <line x1="12" y1="7" x2="19" y2="17" />
          <line x1="5" y1="19" x2="19" y2="19" />
        </svg>
        <span>{isExpanded ? 'Hide mindmap' : 'View mindmap'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {svgContent && (
            <div // eslint-disable-line jsx-a11y/no-static-element-interactions
              ref={containerRef}
              aria-label={`Mindmap: ${title}`}
              data-testid="post-mindmap"
              className="relative mt-3 h-[300px] w-full cursor-grab touch-none overflow-hidden rounded-lg border border-gray-200 select-none active:cursor-grabbing sm:h-[400px] dark:border-gray-700"
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                ref={contentRef}
                className="origin-top-left"
                style={{ transformOrigin: '0 0' }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              {isZoomed && (
                <button
                  onClick={fitToContainer}
                  aria-label="Reset zoom to fit"
                  className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-gray-900/80 px-3 py-1.5 text-xs text-gray-100 backdrop-blur-sm transition-opacity hover:bg-gray-900/90 dark:bg-gray-100/80 dark:text-gray-900 dark:hover:bg-gray-100/90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                  Fit to view
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
