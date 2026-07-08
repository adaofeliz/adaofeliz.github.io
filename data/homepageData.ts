export interface HomepageData {
  readonly focusAreas: ReadonlyArray<{
    readonly id: string
    readonly title: string
    readonly description: string
  }>
  readonly featuredRepos: ReadonlyArray<{
    readonly name: string
    readonly description: string
    readonly url: string
    readonly language: string
  }>
}

const homepageData: HomepageData = {
  focusAreas: [
    {
      id: 'ev-charging-infrastructure',
      title: 'EV Infrastructure',
      description:
        'Leading technology strategy for 3,500+ charging locations and 15,000+ charging points with ownership of the OCPP and OCPI platforms that cover interoperability, tariffs, roaming, and security across Europe.',
    },
    {
      id: 'ai-enablement',
      title: 'AI Enablement',
      description:
        'Driving Autocharge contributions, Cloud Load Management thinking, and OCPP Gateway open-source efforts while publishing whitepapers and rallying the industry community to weave AI/automation into resilient climate tech.',
    },
    {
      id: 'networking-with-builders',
      title: 'Networking',
      description:
        'Meeting, working with, and hiring the people who build things that matter. My focus is building the best engineering teams in the industry, and that starts with real conversations and genuine collaboration.',
    },
  ],
  featuredRepos: [
    {
      name: 'slack-mcp-oauth-proxy',
      description:
        "OAuth 2.1 proxy that bridges Open WebUI's Dynamic Client Registration with Slack's MCP server so both clients can speak their preferred auth model.",
      url: 'https://github.com/adaofeliz/slack-mcp-oauth-proxy',
      language: 'TypeScript',
    },
    {
      name: 'manifest',
      description:
        'Smart model router for agents and AI apps that routes every query to the right provider, tracking costs and falling back when providers fail to save up to 70% on AI spend.',
      url: 'https://github.com/adaofeliz/manifest',
      language: 'TypeScript',
    },
    {
      name: 'bticino-door-entry-v1',
      description:
        'Home Assistant custom integration for BTicino CLASSE100X v1 firmware that opens doors, toggles the staircase light relay, and surfaces gateway diagnostics through the Eliot cloud.',
      url: 'https://github.com/adaofeliz/bticino-door-entry-v1',
      language: 'Python',
    },
    {
      name: 'life-in-weeks',
      description:
        'Interactive 90-year visualization with real-time stats, wallpaper automation, shareable links, and image APIs that let you carry your life progress everywhere.',
      url: 'https://github.com/adaofeliz/life-in-weeks',
      language: 'TypeScript',
    },
    {
      name: 'tududi-calendar-sync',
      description:
        'Next.js background orchestrator that ranks Tududi tasks by priority, type, project, and energy, then schedules them into Google Calendar gaps with Pomodoro-style breaks and health monitoring.',
      url: 'https://github.com/adaofeliz/tududi-calendar-sync',
      language: 'TypeScript',
    },
    {
      name: 'obsidian-mcp',
      description:
        'Archived MCP server that proxies Obsidian vault interactions through the Local REST API plugin so agents can list files, run commands, and patch notes via a REST surface.',
      url: 'https://github.com/adaofeliz/obsidian-mcp',
      language: 'Python',
    },
  ],
}

export default homepageData
