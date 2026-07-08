export interface HomeQuote {
  readonly text: string
  readonly slug: string
  readonly title: string
}

const homeQuotes: readonly HomeQuote[] = [
  {
    text: 'Words carry energy. I learned this in human relationships. AI and LLMs have only reinforced it. The people who will thrive in this new world are not the ones who type the fastest. They are the ones who understand that the right sequence of words, delivered with the right intent, changes what happens next.',
    slug: 'my-take-on-scaling-ai-_-words-are-spells',
    title: 'My Take on Scaling AI: Words Are Spells',
  },
  {
    text: 'I have never been the kind of person who sits still. Even when sitting still was the financially correct thing to do.',
    slug: 'time-is-the-only-currency-that-matters',
    title: 'Time Is the only Currency that matters',
  },
  {
    text: 'I used to think power was loud. I was wrong. The more I pay attention to the world right now, the more I see that the real layers of power, influence, and wealth are the ones that stay quiet.',
    slug: 'the-quiet-layer',
    title: 'The Quiet Layer',
  },
  {
    text: 'Software engineering was my sixth choice in college. I wanted to study biology. None of what followed was planned. All of it was built one small opportunity at a time.',
    slug: 'connecting-the-dots',
    title: 'Connecting the Dots',
  },
  {
    text: 'Some days you just sit down and think and look at where you are, how you got here, and what you expect from what comes next.',
    slug: 'amor-fati-_-love-the-fate',
    title: 'Amor fati: Love the Fate',
  },
  {
    text: 'I spent all my life treating my body like a vehicle. It got me from home to the desk and back. That was its job. I never questioned whether it was up for anything more.',
    slug: 'from-work-grind-to-gym-gains-_-start-by-showing-up-every-day',
    title: 'From Work Grind to Gym Gains: Start by Showing Up Every Day',
  },
  {
    text: 'Until my early thirties, I felt immortal. I skipped doctors, ignored nutrition, and treated my body like it would just keep going. Then I started watching how people age, and I realized that getting older is not about living longer. It is about living with quality.',
    slug: 'the-privilege-of-sore-legs',
    title: 'The Privilege of Sore Legs',
  },
  {
    text: 'For months I trained like the race was the answer. More than a hundred kilometers running every month, three two-hour gym sessions a week, alarms at six in the morning. Most of it alone. This is what happened when the race finally came, and the answer did not.',
    slug: 'when-the-why-breaks',
    title: 'When the Why Breaks',
  },
  {
    text: 'I was in the best shape of my life. Then I got sick, a massive project landed at work, and everything I had built started to fall apart.',
    slug: 'when-discipline-falls-apart',
    title: 'When Discipline Falls Apart',
  },
  {
    text: 'Moving from personal experiments to company-wide agentic development. How I am building the playbook for AI enablement while still learning myself.',
    slug: 'my-journey-with-vibe-coding-_-agentic-development-at-scale',
    title: 'My Journey with Vibe Coding: Agentic Development at Scale',
  },
  {
    text: 'I have been in technology long enough to know that having multiple paths to a goal is normal. The danger is not in having options. It is in chasing all of them at once, without a strategy you can govern, monitor, and extend.',
    slug: 'my-state-of-ai-_-ai-enablement-as-an-engineering-problem',
    title: 'My state of AI: AI Enablement as an Engineering Problem',
  },
  {
    text: 'Every day, our operations team manually routes field technicians: prioritizing tickets, plotting maps, syncing calendars. We started with frontier models, hit a cost wall, then dove into multi-agent systems to fix it. The answer was not more agents. It was hiding the complexity entirely.',
    slug: 'my-state-of-ai-_-the-multi-agent-illusion',
    title: 'My state of AI: The multi-agent illusion',
  },
  {
    text: 'I wrote about killing the multi-agent illusion with smart routing. But routing is only the first layer. The harder problem is what sits between the model and the user: context injection, tool exposure, auth impersonation, and non-deterministic auditing.',
    slug: 'my-state-of-ai-_-the-harness-beneath-the-model',
    title: 'My state of AI: The harness beneath the model',
  },
  {
    text: 'Every productivity framework I tried failed within weeks. Not because the tools were bad. Because the maintenance was designed for someone more disciplined than me. AI fixed that part.',
    slug: 'time-management-_-the-system-that-maintains-itself',
    title: 'Time Management: The System That Maintains Itself',
  },
  {
    text: 'I spent months using AI the way most people do. I opened ChatGPT, typed a question, got an answer, and moved on. I never questioned what was happening underneath.',
    slug: 'my-state-of-ai-_-context-is-everything',
    title: 'My state of AI: Context is everything',
  },
  {
    text: 'Something changed in the kind of debt I carry after fifteen years in technology.',
    slug: 'my-journey-with-vibe-coding-_-from-technical-debt-to-cognitive-debt',
    title: 'My Journey with Vibe Coding: From Technical Debt to Cognitive Debt',
  },
  {
    text: 'We are not just writing code anymore. We are assembling teams that think and collaborate.',
    slug: 'my-journey-with-vibe-coding-_-the-tooling-evolution',
    title: 'My Journey with Vibe Coding: The Tooling Evolution',
  },
  {
    text: 'Watching machines do what used to require multiple separate humans and full attention.',
    slug: 'my-journey-with-vibe-coding-_-agentic-development',
    title: 'My Journey with Vibe Coding: Agentic Development',
  },
  {
    text: 'AI is consuming every logic abstraction I can see. From database layers to project management methodologies.',
    slug: 'my-state-of-ai-_-the-logic-layer-is-dissolving',
    title: 'My state of AI: The logic layer is dissolving',
  },
  {
    text: 'I never figured out journaling. Notebooks did not stick. Apps did not stick. What stuck was talking to myself in the car.',
    slug: 'how-this-blog-works',
    title: 'How This Blog Works',
  },
  {
    text: 'I have tried every productivity system I could find. None of them fit. Not completely. So I built my own.',
    slug: 'time_management-_-a-system-that-actually_fits-my_life',
    title: 'Time Management: A system that actually fits my Life',
  },
  {
    text: 'Every blog needs a first post. So here we are: Hello World!',
    slug: 'hello-world',
    title: 'Hello world',
  },
]

export default homeQuotes
