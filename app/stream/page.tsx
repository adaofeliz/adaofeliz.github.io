import { allStreams } from 'contentlayer/generated'
import type { Metadata } from 'next'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { roadmapData } from '@/data/stream/roadmap'
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

export const metadata: Metadata = {
  title: 'Stream - ' + siteMetadata.title,
  description: 'Micro-journaling, server logs, and quiet machine notes beneath the surface.',
}

function getRoadmapAuthToken(dateKey: string) {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  let seed = 0

  for (const char of dateKey) {
    seed = (seed * 131 + char.charCodeAt(0)) >>> 0
  }

  let token = ''

  for (let index = 0; index < 6; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    token += alphabet[seed % alphabet.length]
  }

  return token
}

export default function StreamPage() {
  const sortedStreams = [...allStreams].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const doneRoadmap = [...roadmapData.done].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const inProgressRoadmap = [...roadmapData.inProgress].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const now = new Date()
  const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  const roadmapAuthToken = getRoadmapAuthToken(dateKey)

  return (
    <div className="mx-auto max-w-3xl font-mono">
      <details className="space-y-2 border-b border-gray-200 pt-6 pb-8 md:space-y-5 dark:border-gray-800">
        <summary className="group flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-lg text-gray-500 marker:content-none focus:outline-none dark:text-gray-400">
          <span className="text-primary-500">$</span>
          <span>tail -f ~/.stream/*.log</span>
          <span
            aria-hidden="true"
            className="bg-primary-500 group-hover:bg-primary-400 inline-block h-5 w-2 animate-pulse transition-all group-hover:animate-none motion-reduce:animate-none"
          />
          <span className="max-w-[min(16rem,calc(100vw-6rem))] overflow-hidden text-xs text-ellipsis whitespace-nowrap text-gray-400 opacity-0 transition-all group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-gray-500">
            [run: ~/.stream/roadmap.sh --auth{' '}
            <span className="inline-block max-w-0 overflow-hidden align-bottom transition-all duration-700 ease-out group-hover:max-w-[6ch] group-focus-visible:max-w-[6ch]">
              {roadmapAuthToken}
            </span>
            ]
          </span>
        </summary>

        <p className="pl-5 text-xs text-gray-400 dark:text-gray-500">
          <span className="text-primary-500">#</span> the prompt is not fully idle.
        </p>

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
            <p className="text-xs tracking-[0.18em] text-gray-400 uppercase">[allocated] queued</p>
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
      </details>

      <div className="py-8">
        <div className="relative ml-3 border-l border-dashed border-gray-300 md:ml-4 dark:border-gray-700">
          {sortedStreams.map((stream, idx) => {
            return (
              <div key={stream.path} className="group relative mb-12 ml-8">
                <span className="group-hover:border-primary-500 absolute -left-[44.5px] flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-950">
                  <span className="group-hover:bg-primary-500 h-2 w-2 rounded-full bg-gray-400 transition-colors dark:bg-gray-600"></span>
                </span>

                <div className="mb-2 flex flex-col">
                  <time className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(stream.date, siteMetadata.locale)}
                  </time>
                  <h3 className="flex items-baseline gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                    <span className="text-primary-500 text-sm font-normal">
                      [{String(sortedStreams.length - 1 - idx).padStart(3, '0')}]
                    </span>
                    <span className="leading-tight">{stream.title}</span>
                  </h3>
                </div>

                {stream.tags && stream.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {stream.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-primary-600 dark:text-primary-400 text-xs before:content-['#']"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose dark:prose-invert mt-4 max-w-none rounded-sm border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50">
                  <MDXLayoutRenderer code={stream.body.code} components={components} />
                </div>
              </div>
            )
          })}
        </div>
        {sortedStreams.length === 0 && (
          <div className="mt-10 text-center text-gray-500 dark:text-gray-400">
            <span className="text-primary-500">$</span> grep -r "thoughts" /dev/null
            <br />
            [No entries found in stream log]
          </div>
        )}
      </div>
    </div>
  )
}
