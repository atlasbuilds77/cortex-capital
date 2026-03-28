import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'rectangular' | 'circular' | 'text'
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-800'
  
  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4',
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 bg-surface rounded-xl">
      <Skeleton variant="text" className="w-24 mb-2" />
      <Skeleton variant="text" className="w-32 h-8 mb-1" />
      <Skeleton variant="text" className="w-16" />
    </div>
  )
}

export function PositionCardSkeleton() {
  return (
    <div className="p-4 bg-surface rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton variant="text" className="w-16 mb-2" />
          <Skeleton variant="text" className="w-20" />
        </div>
        <div className="text-right">
          <Skeleton variant="text" className="w-24 mb-2" />
          <Skeleton variant="text" className="w-16 ml-auto" />
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="p-6 bg-surface rounded-xl">
      <Skeleton variant="text" className="w-40 mb-4" />
      <Skeleton className="w-full h-72" />
    </div>
  )
}
