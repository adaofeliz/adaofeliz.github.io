import { ReactNode } from 'react'
import InlineAudio from '@/components/InlineAudio'
import { AudioHighlightProvider } from '@/components/AudioHighlightContext'
import HighlightableContent from '@/components/HighlightableContent'

interface PostContentProps {
  children: ReactNode
  audio?: string
  audioTimestamps?: string
  proseClassName?: string
}

export default function PostContent({
  children,
  audio,
  audioTimestamps,
  proseClassName = 'pt-10 pb-8',
}: PostContentProps) {
  if (audio) {
    return (
      <AudioHighlightProvider timestampUrl={audioTimestamps}>
        <div className="pt-10 pb-4">
          <InlineAudio src={audio} />
        </div>
        <div className="prose dark:prose-invert max-w-none pt-2 pb-8">
          <HighlightableContent>{children}</HighlightableContent>
        </div>
      </AudioHighlightProvider>
    )
  }

  return <div className={`prose dark:prose-invert max-w-none ${proseClassName}`}>{children}</div>
}
