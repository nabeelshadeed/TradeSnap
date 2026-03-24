import { TableSkeleton } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function JobsLoading() {
  return (
    <div className="p-5 max-w-3xl space-y-4">
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <TableSkeleton rows={6} />
    </div>
  )
}
