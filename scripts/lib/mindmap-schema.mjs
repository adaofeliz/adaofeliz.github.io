export function validateMindmapGraph(json) {
  const errors = []

  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { valid: false, errors: ['json must be an object'] }
  }

  if (typeof json.title !== 'string' || json.title.trim() === '')
    errors.push('title must be a non-empty string')
  if (!Array.isArray(json.nodes) || json.nodes.length < 3 || json.nodes.length > 20)
    errors.push('nodes must be an array with 3-20 items')
  if (!Array.isArray(json.edges)) errors.push('edges must be an array')

  if (Array.isArray(json.nodes)) {
    const ids = new Set()
    let rootCount = 0

    for (const [index, node] of json.nodes.entries()) {
      if (node === null || typeof node !== 'object' || Array.isArray(node)) {
        errors.push(`node ${index} must be an object`)
        continue
      }

      if (typeof node.id !== 'string' || node.id.trim() === '')
        errors.push(`node ${index} id must be a non-empty string`)
      if (typeof node.label !== 'string' || node.label.trim() === '')
        errors.push(`node ${index} label must be a non-empty string`)
      if (!Number.isInteger(node.depth) || node.depth < 0)
        errors.push(`node ${index} depth must be an integer >= 0`)
      if (node.depth === 0) rootCount += 1

      if (typeof node.id === 'string' && node.id.trim() !== '') {
        if (ids.has(node.id)) errors.push(`duplicate node id: ${node.id}`)
        ids.add(node.id)
      }
    }

    if (rootCount !== 1) errors.push('there must be exactly 1 root node with depth 0')

    if (Array.isArray(json.edges)) {
      for (const [index, edge] of json.edges.entries()) {
        if (edge === null || typeof edge !== 'object' || Array.isArray(edge)) {
          errors.push(`edge ${index} must be an object`)
          continue
        }
        if (typeof edge.from !== 'string' || !ids.has(edge.from))
          errors.push(`edge ${index} from must reference an existing node id`)
        if (typeof edge.to !== 'string' || !ids.has(edge.to))
          errors.push(`edge ${index} to must reference an existing node id`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
