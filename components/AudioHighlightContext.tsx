'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react'

/**
 * Word-level timestamp data from ElevenLabs API.
 * Each word has start and end times in seconds.
 */
export interface TimestampWord {
  word: string
  start: number
  end: number
}

/**
 * Timestamp data structure matching the JSON format from generate-audio.mjs
 */
export interface TimestampData {
  version: number
  words: TimestampWord[]
  sourceText: string
}

/**
 * Context value for audio highlight synchronization.
 */
interface AudioHighlightContextValue {
  /** Current playback time in seconds */
  currentTime: number
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Timestamp data with word-level timing information */
  timestampData: TimestampData | null
  /** Index of the currently active word in timestampData.words */
  activeWordIndex: number
  /** Update current playback time */
  setCurrentTime: (time: number) => void
  /** Update playing state */
  setIsPlaying: (playing: boolean) => void
  /** Set timestamp data directly */
  setTimestampData: (data: TimestampData | null) => void
}

const AudioHighlightContext = createContext<AudioHighlightContextValue | null>(null)

/**
 * Hook to access audio highlight context.
 * Returns null when used outside of AudioHighlightProvider.
 */
export function useAudioHighlight(): AudioHighlightContextValue | null {
  return useContext(AudioHighlightContext)
}

/**
 * Find the index of the word that is active at the given time.
 * Uses binary search with optimization starting from last known index.
 * Returns -1 if no word is active.
 */
function findActiveWordIndex(
  words: TimestampWord[],
  currentTime: number,
  lastIndex: number
): number {
  if (words.length === 0) return -1

  // Optimization: check if the last index is still valid (likely nearby)
  if (lastIndex >= 0 && lastIndex < words.length) {
    const word = words[lastIndex]
    if (word.start <= currentTime && currentTime < word.end) {
      return lastIndex
    }
    // Check next word (forward progression is most common)
    if (lastIndex + 1 < words.length) {
      const nextWord = words[lastIndex + 1]
      if (nextWord.start <= currentTime && currentTime < nextWord.end) {
        return lastIndex + 1
      }
    }
  }

  // Binary search for the active word
  let left = 0
  let right = words.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const word = words[mid]

    if (word.start <= currentTime) {
      if (currentTime < word.end) {
        // Found the active word
        result = mid
        break
      }
      // Current time is after this word, search right
      left = mid + 1
    } else {
      // Current time is before this word, search left
      right = mid - 1
    }
  }

  return result
}

interface AudioHighlightProviderProps {
  children: ReactNode
  /** URL to fetch timestamp JSON from */
  timestampUrl?: string
}

/**
 * Provider component for audio highlight synchronization.
 * Fetches timestamp data and computes active word index based on current time.
 */
export function AudioHighlightProvider({ children, timestampUrl }: AudioHighlightProviderProps) {
  const [currentTime, setCurrentTimeState] = useState(0)
  const [isPlaying, setIsPlayingState] = useState(false)
  const [timestampData, setTimestampDataState] = useState<TimestampData | null>(null)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)

  const lastIndexRef = useRef(-1)
  const currentTimeRef = useRef(0)
  const timestampDataRef = useRef<TimestampData | null>(null)

  const setCurrentTime = useCallback((time: number) => {
    currentTimeRef.current = time
    setCurrentTimeState(time)

    const data = timestampDataRef.current
    if (!data || data.words.length === 0) {
      return
    }

    const newIndex = findActiveWordIndex(data.words, time, lastIndexRef.current)
    if (newIndex !== lastIndexRef.current) {
      lastIndexRef.current = newIndex
      setActiveWordIndex(newIndex)
    }
  }, [])

  const setIsPlaying = useCallback((playing: boolean) => {
    setIsPlayingState(playing)
  }, [])

  const setTimestampData = useCallback((data: TimestampData | null) => {
    timestampDataRef.current = data
    setTimestampDataState(data)

    if (!data || data.words.length === 0) {
      lastIndexRef.current = -1
      setActiveWordIndex(-1)
      return
    }

    const newIndex = findActiveWordIndex(data.words, currentTimeRef.current, lastIndexRef.current)
    lastIndexRef.current = newIndex
    setActiveWordIndex(newIndex)
  }, [])

  useEffect(() => {
    if (!timestampUrl) {
      setTimestampData(null)
      return
    }

    const url = timestampUrl
    let isMounted = true

    async function fetchTimestamps() {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch timestamps: ${response.status}`)
        }
        const data: TimestampData = await response.json()
        if (isMounted) {
          setTimestampData(data)
        }
      } catch (error) {
        console.error('Error fetching timestamp data:', error)
        if (isMounted) {
          setTimestampData(null)
        }
      }
    }

    fetchTimestamps()

    return () => {
      isMounted = false
    }
  }, [timestampUrl, setTimestampData])

  const value: AudioHighlightContextValue = {
    currentTime,
    isPlaying,
    timestampData,
    activeWordIndex,
    setCurrentTime,
    setIsPlaying,
    setTimestampData,
  }

  return <AudioHighlightContext.Provider value={value}>{children}</AudioHighlightContext.Provider>
}

export { AudioHighlightContext }
