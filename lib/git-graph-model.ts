import { slug } from 'github-slugger'
import type { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'

/**
 * Layout constants for git graph visualization
 */
export const LAYOUT_CONSTANTS = {
  /** Vertical spacing between commits (pixels) */
  ROW_HEIGHT: 48,
  /** Top padding of the graph area */
  PADDING_TOP: 24,
  /** Bottom padding of the graph area */
  PADDING_BOTTOM: 24,
  /** X position of the main branch rail */
  MAIN_X: 150,
  /** Horizontal spacing between branch rails */
  BRANCH_SPACING: 80,
  /** Width reserved for branch labels on the left */
  LABEL_WIDTH: 100,
} as const

/**
 * Represents a branch in the git graph visualization
 */
export interface Branch {
  /** Branch identifier (slugified tag name or 'main') */
  id: string
  /** Display name (original tag text or 'main') */
  name: string
  /** Dynamic color assignment (not guaranteed stable across renders) */
  color: string
  /** X position of the branch rail */
  x?: number
}

/**
 * Types of nodes in the git graph
 */
export type NodeType = 'commit' | 'merge' | 'separator' | 'today'

/**
 * Base node interface for all graph nodes
 */
interface BaseNode {
  /** Unique identifier for the node */
  id: string
  /** Type of node */
  type: NodeType
  /** X-position (assigned by layout engine) */
  x?: number
  /** Y-position (assigned by layout engine) */
  y?: number
}

/**
 * Commit node - represents a blog post on a branch or main
 */
export interface CommitNode extends BaseNode {
  type: 'commit'
  /** Branch this commit belongs to */
  branch: string
  /** Post slug for navigation */
  slug: string
  /** Post title */
  title: string
  /** Post summary (may be undefined) */
  summary?: string
  /** Post date */
  date: string
  'data-testid'?: string
  'data-slug'?: string
  'data-branch'?: string
}

/**
 * Merge node - synthetic dot on main for tagged posts
 */
export interface MergeNode extends BaseNode {
  type: 'merge'
  /** Always 'main' for merge dots */
  branch: 'main'
  /** Post slug for navigation (same as branch commit) */
  slug: string
  /** Date (same as branch commit) */
  date: string
}

/**
 * Separator node - month/year boundary marker
 */
export interface SeparatorNode extends BaseNode {
  type: 'separator'
  /** Label text (e.g., "2026", "Jan 2026") */
  label: string
  /** Separator kind */
  kind: 'year' | 'month'
}

/**
 * Today marker node
 */
export interface TodayNode extends BaseNode {
  type: 'today'
  /** Current date */
  date: string
}

/**
 * Union type for all node types
 */
export type GraphNode = CommitNode | MergeNode | SeparatorNode | TodayNode

/**
 * Edge connecting nodes in the graph
 */
export interface Edge {
  /** Unique identifier for the edge */
  id: string
  /** Source node ID */
  from: string
  /** Target node ID */
  to: string
  /** Edge type */
  type: 'merge-connector' | 'rail'
}

/**
 * Complete graph model
 */
export interface GraphModel {
  /** All branches in the graph (sorted alphabetically) */
  branches: Branch[]
  /** All nodes in the graph */
  nodes: GraphNode[]
  /** All edges in the graph */
  edges: Edge[]
}

/**
 * Maps Contentlayer posts to a git graph model
 *
 * Rules:
 * - Excludes drafts (draft === true)
 * - Primary branch = tags[0] when present; otherwise "main"
 * - For tagged posts: creates branch commit + synthetic merge dot on main + connector edge
 * - For untagged posts: creates main commit node
 * - Posts already sorted newest first (from sortPosts)
 *
 * @param posts - Array of CoreContent<Blog> from Contentlayer (sorted newest first)
 * @returns GraphModel with branches, nodes, and edges
 */
export function mapPostsToGraph(posts: CoreContent<Blog>[]): GraphModel {
  // Filter out drafts
  const publishedPosts = posts.filter((post) => !post.draft)

  // Collect all unique tags (primary branches)
  const tagSet = new Set<string>()
  publishedPosts.forEach((post) => {
    if (post.tags && post.tags.length > 0) {
      tagSet.add(post.tags[0])
    }
  })

  // Sort tags alphabetically (case-insensitive) and create branches
  const sortedTags = Array.from(tagSet).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )

  const branches: Branch[] = [
    { id: 'main', name: 'main', color: '#6b7280', x: LAYOUT_CONSTANTS.MAIN_X },
    ...sortedTags.map((tag, index) => ({
      id: slug(tag),
      name: tag,
      color: getBranchColor(index),
      x: LAYOUT_CONSTANTS.MAIN_X - (sortedTags.length - index) * LAYOUT_CONSTANTS.BRANCH_SPACING,
    })),
  ]

  const nodes: GraphNode[] = []
  const edges: Edge[] = []

  const branchMap = new Map(branches.map((b) => [b.id, b]))

  publishedPosts.forEach((post, index) => {
    const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null
    const branchId = primaryTag ? slug(primaryTag) : 'main'
    const branch = branchMap.get(branchId)
    const y = LAYOUT_CONSTANTS.PADDING_TOP + index * LAYOUT_CONSTANTS.ROW_HEIGHT

    if (primaryTag && branch) {
      const commitId = `commit-${branchId}-${post.slug}`
      const mergeId = `merge-${post.slug}`

      nodes.push({
        id: commitId,
        type: 'commit',
        branch: branchId,
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        date: post.date,
        x: branch.x,
        y,
        'data-testid': 'git-commit-node',
        'data-slug': post.slug,
        'data-branch': branchId,
      })

      nodes.push({
        id: mergeId,
        type: 'merge',
        branch: 'main',
        slug: post.slug,
        date: post.date,
        x: LAYOUT_CONSTANTS.MAIN_X,
        y,
      })

      edges.push({
        id: `edge-${commitId}-${mergeId}`,
        from: commitId,
        to: mergeId,
        type: 'merge-connector',
      })
    } else {
      const commitId = `commit-main-${post.slug}`
      nodes.push({
        id: commitId,
        type: 'commit',
        branch: 'main',
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        date: post.date,
        x: LAYOUT_CONSTANTS.MAIN_X,
        y,
        'data-testid': 'git-commit-node',
        'data-slug': post.slug,
        'data-branch': 'main',
      })
    }
  })

  // Add month/year separators
  let lastYear: number | null = null
  let lastMonth: number | null = null

  publishedPosts.forEach((post, index) => {
    const postDate = new Date(post.date)
    const year = postDate.getFullYear()
    const month = postDate.getMonth()
    const y = LAYOUT_CONSTANTS.PADDING_TOP + index * LAYOUT_CONSTANTS.ROW_HEIGHT

    // Skip separator for the first post (no previous post to separate from)
    if (index > 0) {
      // Year separator
      if (lastYear !== null && year !== lastYear) {
        const separatorId = `separator-year-${year}`
        nodes.push({
          id: separatorId,
          type: 'separator',
          label: String(year),
          kind: 'year',
          x: 0,
          y: y - LAYOUT_CONSTANTS.ROW_HEIGHT / 2,
        })
      }

      // Month separator (only if year is same but month changed)
      if (lastMonth !== null && month !== lastMonth && year === lastYear) {
        const separatorId = `separator-month-${year}-${month}`
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ]
        nodes.push({
          id: separatorId,
          type: 'separator',
          label: `${monthNames[month]} ${year}`,
          kind: 'month',
          x: 0,
          y: y - LAYOUT_CONSTANTS.ROW_HEIGHT / 2,
        })
      }
    }

    lastYear = year
    lastMonth = month
  })

  // Add "today" marker
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day

  // Find the position for today marker
  let todayY: number | null = null

  if (publishedPosts.length > 0) {
    const newestPost = publishedPosts[0]
    const newestDate = new Date(newestPost.date)
    newestDate.setHours(0, 0, 0, 0)

    if (today.getTime() > newestDate.getTime()) {
      // Today is after newest post - find the first post <= today
      for (let i = 0; i < publishedPosts.length; i++) {
        const postDate = new Date(publishedPosts[i].date)
        postDate.setHours(0, 0, 0, 0)
        if (postDate.getTime() <= today.getTime()) {
          todayY = LAYOUT_CONSTANTS.PADDING_TOP + i * LAYOUT_CONSTANTS.ROW_HEIGHT
          break
        }
      }
    } else {
      // Today is on or before newest post - place at the newest post position
      todayY = LAYOUT_CONSTANTS.PADDING_TOP
    }
  } else {
    // No posts - place at default position
    todayY = LAYOUT_CONSTANTS.PADDING_TOP
  }

  // Only add today marker if we have a valid position
  if (todayY !== null && todayY > 0) {
    nodes.push({
      id: 'today-marker',
      type: 'today',
      date: today.toISOString().split('T')[0],
      x: 0,
      y: todayY,
    })
  }

  return {
    branches,
    nodes,
    edges,
  }
}

/**
 * Get a color for a branch based on its index
 * Uses a simple palette with good contrast in light/dark modes
 */
function getBranchColor(index: number): string {
  const colors = [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
  ]
  return colors[index % colors.length]
}
