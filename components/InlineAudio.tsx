'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useAudioHighlight } from './AudioHighlightContext'

const SPEED_OPTIONS = [0.75, 0.9, 1, 1.5]

export default function InlineAudio({ src }: { src: string }) {
  const highlightCtx = useAudioHighlight()
  const setHighlightTime = highlightCtx?.setCurrentTime
  const setHighlightPlaying = highlightCtx?.setIsPlaying
  const isAutoScrollEnabled = highlightCtx?.isAutoScrollEnabled ?? false
  const toggleAutoScroll = highlightCtx?.toggleAutoScroll
  const audioRef = useRef<HTMLAudioElement>(null)
  const syncRafRef = useRef<number | null>(null)
  const speedIndexRef = useRef(2) // default to 1x (index 2)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [speedIndex, setSpeedIndex] = useState(2) // default 1x
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isScrolledPast = useRef(false)

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
      if (audioRef.current) {
        audioRef.current.playbackRate = SPEED_OPTIONS[speedIndexRef.current]
      }
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

  const hasStarted = currentTime > 0
  const hasEnded = duration !== null && currentTime >= duration

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isScrolledPast.current = !entry.isIntersecting
        setIsSticky(!entry.isIntersecting && hasStarted && !hasEnded)
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasStarted, hasEnded])

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

  const cycleSpeed = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length
    setSpeedIndex(nextIndex)
    speedIndexRef.current = nextIndex
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[nextIndex]
    }
  }

  const toggleTimeline = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsTimelineExpanded((prev) => !prev)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
    setCurrentTime(newTime)
    setHighlightTime?.(newTime)
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
    <>
      <div ref={sentinelRef} className={isSticky ? 'h-10' : 'h-0 w-0'} aria-hidden="true" />
      <div
        ref={playerRef}
        className={`${isSticky ? 'fixed top-0 right-0 left-0 z-40 bg-white shadow-md dark:bg-gray-950' : ''}`}
        title="Listen to article"
      >
        <div
          className={`flex items-center gap-2 ${isSticky ? 'mx-auto max-w-3xl px-4 py-2 sm:px-6 xl:max-w-5xl xl:px-0' : ''}`}
        >
          <button
            onClick={togglePlay}
            className="text-primary-600 focus:ring-primary-500 dark:text-primary-400 group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
            aria-label={isPlaying ? 'Pause audio' : 'Listen to article'}
          >
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                className="group-hover:text-primary-100 dark:group-hover:text-primary-900/40 text-gray-200 transition-colors dark:text-gray-700"
              />
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

          <button
            onClick={cycleSpeed}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={`Playback speed ${SPEED_OPTIONS[speedIndex]}x. Click to change.`}
            title={`Speed: ${SPEED_OPTIONS[speedIndex]}x`}
          >
            {SPEED_OPTIONS[speedIndex]}x
          </button>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleAutoScroll?.()
            }}
            className={`rounded px-1 py-0.5 transition-colors ${
              isAutoScrollEnabled
                ? 'text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label={isAutoScrollEnabled ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            aria-pressed={isAutoScrollEnabled}
            title={isAutoScrollEnabled ? 'Auto-scroll: on' : 'Auto-scroll: off'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={toggleTimeline}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={isTimelineExpanded ? 'Collapse timeline' : 'Expand timeline'}
            aria-expanded={isTimelineExpanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              {isTimelineExpanded ? (
                <path
                  fillRule="evenodd"
                  d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>

          {isTimelineExpanded && duration && (
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="accent-primary-500 h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700"
              aria-label="Seek audio position"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
          )}

          <audio ref={audioRef} src={src} preload="metadata" className="hidden">
            <track kind="captions" />
          </audio>
        </div>
      </div>
    </>
  )
}
