import { Link } from '@/components/link'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { clsx } from 'clsx'

interface BreadcrumbItem {
  name: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={clsx('flex items-center space-x-2 text-sm text-zinc-500', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRightIcon className="mx-2 h-4 w-4 flex-shrink-0 text-zinc-400" />
          )}
          {item.href ? (
            <Link 
              href={item.href}
              className="text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              {item.name}
            </Link>
          ) : (
            <span className="font-medium text-zinc-900">{item.name}</span>
          )}
        </div>
      ))}
    </nav>
  )
} 