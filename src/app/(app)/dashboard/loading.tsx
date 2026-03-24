import { StatCardSkeleton } from '@/components/ui/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="p-5 space-y-5 max-w-5xl">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <div className="space-y-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  )
}
