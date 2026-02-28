'use client'

import siteMetadata from '@/data/siteMetadata'

interface ShareButtonProps {
  title: string
  url: string
}

const ShareButton = ({ title, url }: ShareButtonProps) => {
  const handleShare = async () => {
    const shareUrl = `${siteMetadata.siteUrl}/${url}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: title,
          url: shareUrl,
        })
      } catch (error) {
        console.log('Share cancelled or failed')
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  return (
    <button
      aria-label="Share"
      onClick={handleShare}
      className="rounded-full bg-gray-200 p-2 text-gray-500 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
      </svg>
    </button>
  )
}

export default ShareButton
