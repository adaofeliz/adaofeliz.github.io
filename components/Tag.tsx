import Link from 'next/link'
import { CATEGORY_LABELS, type Category } from '@/lib/categories'

interface Props {
  text: Category
  className?: string
}

const Tag = ({ text, className = '' }: Props) => {
  const label = CATEGORY_LABELS[text]
  const defaultStyles =
    'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'

  return (
    <Link href={`/?tag=${text}`} className={`${defaultStyles} ${className}`.trim()}>
      {label}
    </Link>
  )
}

export default Tag
