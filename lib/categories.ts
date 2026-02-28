/**
 * Single source of truth for blog categories
 */

export const ALLOWED_CATEGORIES = ['technology', 'fitness', 'life', 'others'] as const

export type Category = (typeof ALLOWED_CATEGORIES)[number]

/**
 * Display labels for categories (Title Case)
 */
export const CATEGORY_LABELS: Record<Category, string> = {
  technology: 'Technology',
  fitness: 'Fitness',
  life: 'Life',
  others: 'Others',
}

/**
 * Tailwind CSS classes for each category
 * Includes base styles, hover states, and dark mode support
 */
export const CATEGORY_STYLES: Record<Category, string> = {
  technology:
    'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800',
  fitness:
    'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800',
  life: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800',
  others:
    'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800',
}

/**
 * Extract category from post tags
 * Returns the single category when tags.length === 1 and it's allowed
 * Otherwise returns 'others' and warns in development
 */
export function getPostCategory(tags: string[] | undefined): Category {
  if (!tags || tags.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('getPostCategory: No tags provided, defaulting to "others"')
    }
    return 'others'
  }

  if (tags.length > 1) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `getPostCategory: Multiple tags provided [${tags.join(', ')}], defaulting to "others"`
      )
    }
    return 'others'
  }

  const tag = tags[0].toLowerCase()

  if (ALLOWED_CATEGORIES.includes(tag as Category)) {
    return tag as Category
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `getPostCategory: Tag "${tags[0]}" is not an allowed category [${ALLOWED_CATEGORIES.join(', ')}], defaulting to "others"`
    )
  }

  return 'others'
}
