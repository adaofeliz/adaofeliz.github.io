'use client'

import { useId, useState } from 'react'
import { roadmapData } from '@/data/stream/roadmap'

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function StreamRoadmapReveal() {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  const doneRoadmap = sortByDateDesc([...roadmapData.done])
  const inProgressRoadmap = sortByDateDesc([...roadmapData.inProgress])

  return (
    <div className="space-y-2 border-b border-gray-200 pt-6 pb-8 md:space-y-5 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg text-gray-500 dark:text-gray-400">
        <span className="text-primary-500">$</span>
        <span>tail -f ~/.stream/*.log</span>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isOpen ? 'Hide roadmap kernel' : 'Reveal roadmap kernel'}
          onClick={() => setIsOpen((open) => !open)}
          className="group relative inline-flex items-center rounded-sm px-2 py-1 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none dark:focus:ring-gray-600 dark:focus:ring-offset-gray-950"
        >
          <span
            className={`inline-block h-5 w-2 transition-all ${
              isOpen
                ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                : 'bg-primary-500 animate-pulse motion-reduce:animate-none'
            } group-hover:bg-primary-400 group-hover:animate-none`}
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute top-1/2 left-full ml-3 max-w-[min(16rem,calc(100vw-6rem))] -translate-y-1/2 overflow-hidden text-xs text-ellipsis whitespace-nowrap text-gray-400 opacity-0 transition-all group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-gray-500">
            {isOpen ? '[kill: roadmap.sh]' : '[run: ./roadmap.sh]'}
          </span>
        </button>
      </div>

      <p className="pl-5 text-xs text-gray-400 dark:text-gray-500">
        <span className="text-primary-500">#</span> the prompt is not fully idle.
      </p>

      {isOpen && (
        <div id={panelId} aria-hidden={!isOpen} className="overflow-hidden">
          <div className="mt-4 space-y-6 rounded-sm border border-gray-800 bg-gray-950/85 p-4 text-sm shadow-[0_0_0_1px_rgba(24,24,27,0.35)]">
            <p className="text-xs tracking-[0.2em] text-gray-500 uppercase">
              &gt; executing ./roadmap.sh <span className="text-primary-500">[ok]</span>
            </p>

            <section className="space-y-3">
              <p className="text-xs tracking-[0.18em] text-emerald-400 uppercase">
                [status: 0] completed
              </p>
              <ul className="space-y-4 text-gray-300">
                {doneRoadmap.map((item) => (
                  <li key={`${item.date}-${item.title}`} className="space-y-1">
                    <p className="text-sm text-gray-100">├── {item.title}</p>
                    <p className="pl-5 text-xs text-gray-500">├─ date: {item.date}</p>
                    <p className="pl-5 text-xs text-gray-400">├─ why: {item.why}</p>
                    <p className="text-primary-400 pl-5 text-xs">└─ stack: {item.stack}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <p className="text-xs tracking-[0.18em] text-amber-300 uppercase">
                [pid: active] running
              </p>
              <ul className="space-y-4 text-gray-300">
                {inProgressRoadmap.map((item) => (
                  <li key={`${item.date}-${item.title}`} className="space-y-1">
                    <p className="text-sm text-gray-100">├── {item.title}</p>
                    <p className="pl-5 text-xs text-gray-500">├─ date: {item.date}</p>
                    <p className="pl-5 text-xs text-gray-400">├─ why: {item.why}</p>
                    <p className="text-primary-400 pl-5 text-xs">└─ stack: {item.stack}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <p className="text-xs tracking-[0.18em] text-gray-400 uppercase">
                [allocated] queued
              </p>
              <ul className="space-y-2 text-gray-400">
                {roadmapData.future.map((item, index) => (
                  <li key={item} className="text-xs">
                    <span className="text-primary-500">
                      {index === roadmapData.future.length - 1 ? '└─' : '├─'}
                    </span>{' '}
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
