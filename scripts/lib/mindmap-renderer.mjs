const FONT_FAMILY = "'JetBrains Mono', ui-monospace, monospace"

const LEFT_MARGIN = 40
const COLUMN_SPACING = 240
const NODE_GAP = 12
const MIN_NODE_WIDTH = 100
const H_PADDING = 16
const V_PADDING = 10
const WRAP_CHARS = 22
const MAX_LINES = 3

const THEMES = {
  inline: {
    depth0Fill: 'var(--color-primary-500)',
    depth0Stroke: 'var(--color-primary-400)',
    depth1Fill: 'var(--color-primary-800)',
    depth1Stroke: 'var(--color-primary-700)',
    depth2Fill: 'var(--color-gray-800)',
    depth2Stroke: 'var(--color-gray-700)',
    text: 'var(--color-gray-50)',
    edge: 'var(--color-primary-700)',
  },
  og: {
    background: '#0c1017',
    depth0Fill: '#166534',
    depth0Stroke: '#22c55e',
    depth1Fill: '#14532d',
    depth1Stroke: '#15803d',
    depth2Fill: '#1e293b',
    depth2Stroke: '#334155',
    text: '#f8fafc',
    edge: '#15803d',
    title: '#94a3b8',
  },
}

function escapeXML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function getFontForDepth(depth) {
  if (depth === 0) return { size: 14, weight: '700', charWidth: 8.6 }
  if (depth === 1) return { size: 13, weight: '600', charWidth: 8 }
  if (depth >= 3) return { size: 11, weight: '400', charWidth: 6.8 }
  return { size: 12, weight: '400', charWidth: 7.4 }
}

function splitLongToken(token, chunkSize) {
  const parts = []
  let index = 0
  while (index < token.length) {
    parts.push(token.slice(index, index + chunkSize))
    index += chunkSize
  }
  return parts
}

function wrapLabel(label, maxChars = WRAP_CHARS, maxLines = MAX_LINES) {
  const clean = String(label || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean === '') return ['']

  const rawWords = clean.split(' ')
  const words = []
  for (const word of rawWords) {
    if (word.length > maxChars) words.push(...splitLongToken(word, maxChars))
    else words.push(word)
  }

  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (candidate.length <= maxChars) {
      line = candidate
      continue
    }

    if (line !== '') lines.push(line)
    line = word

    if (lines.length === maxLines - 1) break
  }

  if (lines.length < maxLines && line !== '') lines.push(line)

  if (lines.length > maxLines) lines.length = maxLines
  return lines
}

function measureNode(node) {
  const depth = Number.isInteger(node?.depth) && node.depth >= 0 ? node.depth : 0
  const font = getFontForDepth(depth)
  const lines = wrapLabel(node?.label ?? '')
  const lineHeight = Math.round(font.size * 1.3)
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)
  const width = Math.max(MIN_NODE_WIDTH, Math.ceil(maxLineLength * font.charWidth + H_PADDING * 2))
  const height = Math.ceil(lines.length * lineHeight + V_PADDING * 2)

  return {
    depth,
    lines,
    font,
    lineHeight,
    width,
    height,
  }
}

function getNodeStyles(depth, mode, theme) {
  if (depth === 0) return { fill: theme.depth0Fill, stroke: theme.depth0Stroke, fillOpacity: null }
  if (depth === 1) return { fill: theme.depth1Fill, stroke: theme.depth1Stroke, fillOpacity: null }
  if (depth >= 3)
    return {
      fill: theme.depth2Fill,
      stroke: theme.depth2Stroke,
      fillOpacity: mode === 'inline' ? '0.7' : '0.7',
    }
  return { fill: theme.depth2Fill, stroke: theme.depth2Stroke, fillOpacity: null }
}

function buildTree(nodes, edges) {
  const nodesById = new Map()
  for (const node of nodes) {
    if (node && typeof node.id === 'string' && node.id.trim() !== '') {
      nodesById.set(node.id, node)
    }
  }

  const childrenById = new Map()
  const parentById = new Map()
  for (const id of nodesById.keys()) childrenById.set(id, [])

  for (const edge of edges) {
    if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string') continue
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) continue
    const children = childrenById.get(edge.from)
    if (!children.includes(edge.to)) children.push(edge.to)
    if (!parentById.has(edge.to)) parentById.set(edge.to, edge.from)
  }

  const nodeOrder = new Map(nodes.map((n, i) => [n?.id, i]))
  for (const [id, children] of childrenById.entries()) {
    children.sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0))
    childrenById.set(id, children)
  }

  let root = nodes.find((node) => node?.depth === 0 && nodesById.has(node.id)) || null
  if (!root) {
    root =
      nodes.find((node) => !parentById.has(node?.id) && nodesById.has(node?.id)) || nodes[0] || null
  }

  return { rootId: root?.id || null, nodesById, childrenById }
}

function layoutTree(rootId, nodesById, childrenById, metricsById, topMargin) {
  const positionById = new Map()
  const visited = new Set()
  let cursorY = topMargin

  function placeNode(nodeId) {
    if (visited.has(nodeId)) return positionById.get(nodeId)
    visited.add(nodeId)

    const node = nodesById.get(nodeId)
    const metrics = metricsById.get(nodeId)
    if (!node || !metrics) return null

    const children = childrenById.get(nodeId) || []
    const childCenters = []

    for (const childId of children) {
      const childPos = placeNode(childId)
      if (childPos) childCenters.push(childPos.y)
    }

    let y
    if (childCenters.length === 0) {
      y = cursorY + metrics.height / 2
      cursorY += metrics.height + NODE_GAP
    } else {
      y = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
    }

    const depth = Number.isInteger(node.depth) && node.depth >= 0 ? node.depth : 0
    const x = LEFT_MARGIN + depth * COLUMN_SPACING
    const position = { x, y }
    positionById.set(nodeId, position)
    return position
  }

  if (rootId && nodesById.has(rootId)) placeNode(rootId)

  for (const nodeId of nodesById.keys()) {
    if (!positionById.has(nodeId)) placeNode(nodeId)
  }

  return positionById
}

function getBounds(nodes, positionById, metricsById) {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const pos = positionById.get(node.id)
    const metrics = metricsById.get(node.id)
    if (!pos || !metrics) continue

    const left = pos.x - metrics.width / 2
    const right = pos.x + metrics.width / 2
    const top = pos.y - metrics.height / 2
    const bottom = pos.y + metrics.height / 2

    minX = Math.min(minX, left)
    minY = Math.min(minY, top)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

function renderEdge(edge, positionById, metricsById, theme) {
  const fromPos = positionById.get(edge.from)
  const toPos = positionById.get(edge.to)
  const fromMetrics = metricsById.get(edge.from)
  const toMetrics = metricsById.get(edge.to)
  if (!fromPos || !toPos || !fromMetrics || !toMetrics) return ''

  const x1 = Math.round(fromPos.x + fromMetrics.width / 2)
  const y1 = Math.round(fromPos.y)
  const x2 = Math.round(toPos.x - toMetrics.width / 2)
  const y2 = Math.round(toPos.y)

  const dx = x2 - x1
  const cx1 = Math.round(x1 + dx * 0.4)
  const cy1 = y1
  const cx2 = Math.round(x1 + dx * 0.6)
  const cy2 = y2

  return `<path d="M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}" fill="none" stroke="${theme.edge}" stroke-width="1.5"/>`
}

function renderNode(node, position, metrics, mode, theme) {
  const styles = getNodeStyles(metrics.depth, mode, theme)
  const rectX = Math.round(position.x - metrics.width / 2)
  const rectY = Math.round(position.y - metrics.height / 2)
  const textX = rectX + H_PADDING
  const textBlockHeight = metrics.lines.length * metrics.lineHeight
  const firstLineY = Math.round(position.y - textBlockHeight / 2 + metrics.lineHeight * 0.82)

  const fillOpacityAttr = styles.fillOpacity ? ` fill-opacity="${styles.fillOpacity}"` : ''
  const tspans = metrics.lines
    .map((line, index) => {
      const y = Math.round(firstLineY + index * metrics.lineHeight)
      return `<tspan x="${textX}" y="${y}">${escapeXML(line)}</tspan>`
    })
    .join('')

  return `<g data-node-id="${escapeXML(node.id)}" data-node-depth="${metrics.depth}"><rect x="${rectX}" y="${rectY}" width="${Math.round(metrics.width)}" height="${Math.round(metrics.height)}" rx="6" ry="6" fill="${styles.fill}"${fillOpacityAttr} stroke="${styles.stroke}" stroke-width="1.5"/><text font-family="${FONT_FAMILY}" fill="${theme.text}" text-anchor="start" font-size="${metrics.font.size}" font-weight="${metrics.font.weight}">${tspans}</text></g>`
}

export function renderMindmapSVG(graph, mode = 'inline') {
  const theme = mode === 'og' ? THEMES.og : THEMES.inline
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []

  const metricsById = new Map()
  for (const node of nodes) metricsById.set(node.id, measureNode(node))

  const { rootId, nodesById, childrenById } = buildTree(nodes, edges)
  const topMargin = mode === 'og' ? 90 : 24
  const positionById = layoutTree(rootId, nodesById, childrenById, metricsById, topMargin)

  const edgeParts = edges.map((edge) => renderEdge(edge, positionById, metricsById, theme)).join('')
  const nodeParts = nodes
    .map((node) => {
      const pos = positionById.get(node.id)
      const metrics = metricsById.get(node.id)
      if (!pos || !metrics) return ''
      return renderNode(node, pos, metrics, mode, theme)
    })
    .join('')

  const bounds = getBounds(nodes, positionById, metricsById)

  if (mode === 'og') {
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX)
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY)
    const availableWidth = 1120
    const availableHeight = 510
    const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1)
    const tx = 40 + (availableWidth - contentWidth * scale) / 2 - bounds.minX * scale
    const ty = 90 + (availableHeight - contentHeight * scale) / 2 - bounds.minY * scale

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect x="0" y="0" width="1200" height="630" fill="${theme.background}"/><text x="600" y="34" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="14" fill="${theme.title}">${escapeXML(graph?.title || '')}</text><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})">${edgeParts}${nodeParts}</g></svg>`
  }

  const padding = 24
  const viewWidth = Math.ceil(Math.max(1, bounds.maxX - bounds.minX) + padding * 2)
  const viewHeight = Math.ceil(Math.max(1, bounds.maxY - bounds.minY) + padding * 2)
  const tx = padding - bounds.minX
  const ty = padding - bounds.minY

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}"><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})">${edgeParts}${nodeParts}</g></svg>`
}
