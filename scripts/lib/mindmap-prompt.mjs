/**
 * Builds the AI prompt for mindmap generation.
 * @param {string} title - Post title
 * @param {string} plainText - Plain text content of the post
 * @returns {string} The prompt to send to the AI model
 */
export function buildPrompt(title, plainText) {
  return `You are creating a structured mindmap that mirrors a blog post's actual content layout.

Post Title: "${title}"

Post Content:
${plainText.slice(0, 8000)}

Your task: Build a tree that follows the post's structure IN THE SAME ORDER as the text.

Structure rules:
- depth 0: The post title (exactly 1 root node)
- depth 1: The section headings / main topics of the post, in the order they appear in the text
- depth 2: Key ideas within each section, in text order (1-3 per section)
- depth 3-4: Supporting details, examples, or sub-ideas within a depth-2 idea (only when the content warrants it, 1-2 per parent)

Ordering is critical: nodes at the same depth under the same parent MUST follow the order they appear in the post. Readers will use this mindmap alongside the text, so the sequence must match.

Constraints:
- Total nodes: 8 to 20
- Each label: concise, plain text only, max 30 characters
- Every child has exactly one parent
- No cycles, no disconnected nodes
- Node IDs: "n1", "n2", "n3", etc. in sequential order matching text flow

Return ONLY valid JSON, no explanation:
{
  "title": "post title (max 50 chars)",
  "nodes": [
    { "id": "n1", "label": "Post Title", "depth": 0 },
    { "id": "n2", "label": "First Section", "depth": 1 },
    { "id": "n3", "label": "Key idea in section", "depth": 2 },
    { "id": "n4", "label": "Supporting detail", "depth": 3 },
    { "id": "n5", "label": "Second Section", "depth": 1 }
  ],
  "edges": [
    { "from": "n1", "to": "n2" },
    { "from": "n2", "to": "n3" },
    { "from": "n3", "to": "n4" },
    { "from": "n1", "to": "n5" }
  ]
}`
}
