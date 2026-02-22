'use client'

import Link from 'next/link'
import { useRef, useEffect, useState, useMemo } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import { Blog } from 'contentlayer/generated'
import { mapPostsToGraph, LAYOUT_CONSTANTS } from '../lib/git-graph-model'

interface GitGraphProps {
  posts: CoreContent<Blog>[]
}

type HoveredNode = {
  title: string
  summary: string
  date: string
  x: number
  y: number
}

export default function GitGraph({ posts }: GitGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800) // Default width to ensure initial render
  const [mounted, setMounted] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<HoveredNode | null>(null)
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)

  useEffect(() => {
    // Mark component as mounted on client
    setMounted(true)

    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox implements `contentBoxSize` as a single content rect, rather than an array
          const contentBoxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize
          setWidth(contentBoxSize.inlineSize)
        } else {
          setWidth(entry.contentRect.width)
        }
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const graphData = useMemo(() => mapPostsToGraph(posts), [posts])

  const commitMetaBySlug = useMemo(() => {
    const map = new Map<string, { title: string; summary?: string; date: string }>()
    graphData.nodes.forEach((node) => {
      if (node.type === 'commit') {
        map.set(node.slug, { title: node.title, summary: node.summary, date: node.date })
      }
    })
    return map
  }, [graphData])

  const formatSummary = (summary?: string) => {
    const normalized = summary?.trim() || ''
    if (!normalized) return 'No summary available.'
    if (normalized.length <= 80) return normalized
    return `${normalized.slice(0, 77).trimEnd()}...`
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const showTooltip = (payload: {
    title: string
    summary?: string
    date: string
    x?: number
    y?: number
  }) => {
    if (payload.x === undefined || payload.y === undefined) return
    setHoveredNode({
      title: payload.title,
      summary: formatSummary(payload.summary),
      date: formatDate(payload.date),
      x: payload.x,
      y: payload.y,
    })
    setIsTooltipVisible(true)
  }

  const hideTooltip = () => {
    setIsTooltipVisible(false)
  }

  // Calculate vertical ranges for each branch to draw rails
  const branchRanges = useMemo(() => {
    const ranges = new Map<string, { minY: number; maxY: number }>()

    const lastNodeY =
      graphData.nodes.length > 0 ? graphData.nodes[graphData.nodes.length - 1].y || 0 : 0

    ranges.set('main', {
      minY: LAYOUT_CONSTANTS.PADDING_TOP,
      maxY: lastNodeY + LAYOUT_CONSTANTS.PADDING_BOTTOM,
    })

    graphData.nodes.forEach((node) => {
      if (node.type === 'commit' && node.branch !== 'main' && node.y !== undefined) {
        const current = ranges.get(node.branch) || { minY: Infinity, maxY: -Infinity }
        ranges.set(node.branch, {
          minY: Math.min(current.minY, node.y),
          maxY: Math.max(current.maxY, node.y),
        })
      }
    })
    return ranges
  }, [graphData])

  const height =
    graphData.nodes.length * LAYOUT_CONSTANTS.ROW_HEIGHT +
    LAYOUT_CONSTANTS.PADDING_TOP +
    LAYOUT_CONSTANTS.PADDING_BOTTOM

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto select-none">
      {!mounted && (
        <div
          data-testid="git-post-graph"
          className="min-h-96 w-full rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          style={{ height: `${height}px` }}
        >
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Loading graph...</p>
          </div>
        </div>
      )}

      {mounted && width > 0 && (
        <>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            data-testid="git-post-graph"
            className="overflow-visible font-sans"
          >
            <g className="rails">
              {graphData.branches.map((branch) => {
                const range = branchRanges.get(branch.id)
                if (!range || branch.x === undefined) return null

                const y1 = range.minY - (branch.id === 'main' ? 0 : 10)
                const y2 = range.maxY + (branch.id === 'main' ? 0 : 10)

                return (
                  <g key={`rail-${branch.id}`}>
                    <line
                      x1={branch.x}
                      y1={y1}
                      x2={branch.x}
                      y2={y2}
                      stroke={branch.color}
                      strokeWidth={2}
                      strokeOpacity={0.5}
                      strokeLinecap="round"
                    />
                    {branch.id !== 'main' && (
                      <text
                        x={branch.x}
                        y={y1 - 10}
                        textAnchor="middle"
                        fill={branch.color}
                        className="text-xs font-medium"
                        style={{ fontSize: '10px' }}
                      >
                        {branch.name}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>

            <g className="connectors">
              {graphData.edges.map((edge) => {
                const source = graphData.nodes.find((n) => n.id === edge.from)
                const target = graphData.nodes.find((n) => n.id === edge.to)

                if (
                  !source ||
                  !target ||
                  source.x === undefined ||
                  target.x === undefined ||
                  source.y === undefined ||
                  target.y === undefined
                )
                  return null

                const sourceBranchId =
                  source.type === 'commit' || source.type === 'merge' ? source.branch : undefined
                const branchColor = sourceBranchId
                  ? graphData.branches.find((b) => b.id === sourceBranchId)?.color
                  : '#9ca3af'

                return (
                  <path
                    key={edge.id}
                    d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                    stroke={branchColor || '#9ca3af'}
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                    fill="none"
                  />
                )
              })}
            </g>

            <g className="nodes">
              {graphData.nodes.map((node) => {
                if (node.x === undefined || node.y === undefined) return null

                const branchId =
                  node.type === 'commit' || node.type === 'merge' ? node.branch : undefined
                const branch = branchId
                  ? graphData.branches.find((b) => b.id === branchId)
                  : undefined
                const color = branch?.color || '#9ca3af'

                if (node.type === 'commit') {
                  const href = `/blog/${node.slug}`
                  return (
                    <Link
                      key={node.id}
                      href={href}
                      tabIndex={0}
                      role="button"
                      aria-label={`${node.title} — ${node.date}`}
                      className="cursor-pointer outline-none"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={6}
                        fill={color}
                        stroke="white"
                        strokeWidth={2}
                        className="cursor-pointer transition-transform hover:scale-125 dark:stroke-gray-900"
                        data-testid={node['data-testid']}
                        data-slug={node['data-slug']}
                        data-branch={node['data-branch']}
                        onMouseEnter={() =>
                          showTooltip({
                            title: node.title,
                            summary: node.summary,
                            date: node.date,
                            x: node.x,
                            y: node.y,
                          })
                        }
                        onMouseLeave={hideTooltip}
                      />
                    </Link>
                  )
                } else if (node.type === 'merge') {
                  const href = `/blog/${node.slug}`
                  const commitMeta = commitMetaBySlug.get(node.slug)
                  return (
                    <Link
                      key={node.id}
                      href={href}
                      tabIndex={0}
                      role="button"
                      aria-label={`View post: ${node.slug}`}
                      className="cursor-pointer outline-none"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={4}
                        fill={color}
                        fillOpacity={0.8}
                        className="cursor-pointer transition-transform hover:scale-125"
                        data-testid="git-merge-dot"
                        data-slug={node.slug}
                        onMouseEnter={() =>
                          commitMeta &&
                          showTooltip({
                            title: commitMeta.title,
                            summary: commitMeta.summary,
                            date: commitMeta.date,
                            x: node.x,
                            y: node.y,
                          })
                        }
                        onMouseLeave={hideTooltip}
                      />
                    </Link>
                  )
                } else if (node.type === 'separator') {
                  const isYear = node.kind === 'year'
                  return (
                    <g key={node.id} data-testid="git-separator">
                      <line
                        x1={20}
                        y1={node.y}
                        x2={width - 20}
                        y2={node.y}
                        stroke="#d1d5db"
                        strokeWidth={1}
                        strokeDasharray="4,4"
                        className="dark:stroke-gray-700"
                      />
                      <text
                        x={width - 30}
                        y={node.y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fill={isYear ? '#374151' : '#6b7280'}
                        className="text-xs font-semibold dark:text-gray-300"
                        style={{ fontSize: isYear ? '12px' : '10px' }}
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                } else if (node.type === 'today') {
                  return (
                    <g
                      key={node.id}
                      data-testid="git-today-marker"
                      pointerEvents="none"
                      className="pointer-events-none"
                    >
                      <line
                        x1={20}
                        y1={node.y}
                        x2={width - 20}
                        y2={node.y}
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeLinecap="round"
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={30}
                        y={node.y}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fill="#ef4444"
                        className="pointer-events-auto text-xs font-bold dark:text-red-400"
                        style={{ fontSize: '11px', pointerEvents: 'auto' }}
                      >
                        Today
                      </text>
                    </g>
                  )
                }
                return null
              })}
            </g>
          </svg>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute z-20 w-64 rounded-md bg-gray-900/95 p-3 text-left text-xs shadow-lg ring-1 ring-black/10 transition-all duration-150 dark:bg-gray-800/95 ${
              isTooltipVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
            }`}
            style={{
              left: hoveredNode ? hoveredNode.x + 12 : 0,
              top: hoveredNode ? hoveredNode.y - 12 : 0,
            }}
          >
            <p className="text-sm font-semibold text-gray-100">{hoveredNode?.title}</p>
            <p className="mt-1 text-gray-200">{hoveredNode?.summary}</p>
            <p className="mt-2 text-[11px] tracking-wide text-gray-300 uppercase">
              {hoveredNode?.date}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
