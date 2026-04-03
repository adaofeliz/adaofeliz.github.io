'use client'

import { useState, useCallback } from 'react'
import siteMetadata from '@/data/siteMetadata'

interface ShareButtonProps {
  title: string
  url: string
}

const ShareButton = ({ title, url }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const shareUrl = `${siteMetadata.siteUrl}/${url}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: title,
          url: shareUrl,
        })
      } catch {
        // Share cancelled by user
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }, [title, url])

  return (
    <button
      aria-label={copied ? 'Link copied' : 'Share this post'}
      onClick={handleShare}
      className="group inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
    >
      {copied ? (
        <>
          <svg className="text-primary-500 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-primary-500">Copied!</span>
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  )
}

export default ShareButton
