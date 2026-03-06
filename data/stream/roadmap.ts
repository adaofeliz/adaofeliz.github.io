export type RoadmapDeliveredItem = {
  title: string
  date: string
  why: string
  stack: string
}

export type RoadmapActiveItem = {
  title: string
  date: string
  why: string
  stack: string
}

export type RoadmapData = {
  done: RoadmapDeliveredItem[]
  inProgress: RoadmapActiveItem[]
  future: readonly string[]
}

export const roadmapData: RoadmapData = {
  done: [
    {
      title: 'Roadmap Kernel inside /stream',
      date: '2026-03-06',
      why: 'Moved strategic planning out of GitHub-only docs and into the live blog experience with a hidden terminal reveal.',
      stack: 'Stream page status board + shell-themed roadmap readout + daily auth hint',
    },
    {
      title: 'GitOps Audio Generation Pipeline',
      date: '2026-03-05',
      why: 'Replaced fragile external automation with repository-native CI/CD.',
      stack: 'GitHub Actions + ElevenLabs + Cloudflare R2 + frontmatter patching',
    },
    {
      title: 'Inline Voice / Listen to Post',
      date: '2026-03-05',
      why: 'Makes reading more intimate with author voice and generated audio.',
      stack: 'InlineAudio + React hooks + Tailwind + cache-aware loading',
    },
    {
      title: 'Timeline in Weeks',
      date: '2026-03-03',
      why: 'Frames posts as a continuous journey instead of isolated dates.',
      stack: 'PostLayout/PostSimple date formatting + timeline sync',
    },
    {
      title: 'Stream Micro-Journal',
      date: '2026-03-01',
      why: 'Created a bare-metal operational log for low-friction AI updates.',
      stack: 'Contentlayer Stream type + terminal-inspired layout',
    },
  ] satisfies RoadmapDeliveredItem[],
  inProgress: [] satisfies RoadmapActiveItem[],
  future: [
    'Neural command palette (CMD+K semantic search + conversational fallback).',
    'Bare-metal infrastructure showcase page for self-hosted stack visibility.',
    'Agentic chat terminal to converse with site knowledge graph.',
    'Adaptive visual themes by daytime and post tags.',
    'Webmentions + IndieWeb support for decentralized interactions.',
    'Dynamic audio speed tuned to textual complexity.',
    'Interactive code playgrounds for technical posts.',
    'Automated OG image generation pipeline.',
    'Semantic related-post clustering map.',
  ] as const,
}
