'use client'

import { useRef, useState, useEffect } from 'react'
import { useAudioHighlight } from './AudioHighlightContext'

export default function InlineAudio({ src }: { src: string }) {
  const highlightCtx = useAudioHighlight()
  const setHighlightTime = highlightCtx?.setCurrentTime
  const setHighlightPlaying = highlightCtx?.setIsPlaying
  const audioRef = useRef<HTMLAudioElement>(null)
  const syncRafRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const stopSyncLoop = () => {
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current)
        syncRafRef.current = null
      }
    }

    const syncCurrentTime = () => {
      if (!audio.paused) {
        setHighlightTime?.(audio.currentTime)
        syncRafRef.current = requestAnimationFrame(syncCurrentTime)
      } else {
        stopSyncLoop()
      }
    }

    const startSyncLoop = () => {
      stopSyncLoop()
      syncRafRef.current = requestAnimationFrame(syncCurrentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setHighlightPlaying?.(true)
      startSyncLoop()
    }
    const handlePause = () => {
      setIsPlaying(false)
      setHighlightPlaying?.(false)
      stopSyncLoop()
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setHighlightPlaying?.(false)
      stopSyncLoop()
    }
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    const handleSeeked = () => setHighlightTime?.(audio.currentTime)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('seeked', handleSeeked)

    if (audio.readyState >= 1) {
      setDuration(audio.duration)
    }

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('seeked', handleSeeked)
      stopSyncLoop()
    }
  }, [setHighlightPlaying, setHighlightTime])

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }

  const formatTime = (time: number | null) => {
    if (time === null || isNaN(time)) return '--:--'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Calculate circular progress
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progressPercent = duration ? currentTime / duration : 0
  const strokeDashoffset = circumference - progressPercent * circumference

  return (
    <div className="inline-flex items-center gap-2" title="Listen to article">
      <button
        onClick={togglePlay}
        className="text-primary-600 focus:ring-primary-500 dark:text-primary-400 group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        aria-label={isPlaying ? 'Pause audio' : 'Listen to article'}
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
          {/* Background circle */}
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            className="group-hover:text-primary-100 dark:group-hover:text-primary-900/40 text-gray-200 transition-colors dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100 ease-linear"
          />
        </svg>

        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 ml-0.5 h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {isPlaying || currentTime > 0
          ? `${formatTime(currentTime)} / ${formatTime(duration)}`
          : formatTime(duration)}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden">
        <track kind="captions" />
      </audio>
    </div>
  )
}
