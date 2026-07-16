import { cn } from '@/lib/cn';

/**
 * Skeletons, nunca spinners (requisito do briefing). A regra prática: o skeleton
 * deve ter a MESMA geometria do conteúdo que vai substituir, senão ele vira só
 * um spinner retangular e o layout pula quando o dado chega.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <Skeleton className="h-3 w-24 rounded-pill" />
      <Skeleton className="h-6 w-2/3 rounded-pill" />
      <Skeleton className="h-3 w-full rounded-pill" />
      <Skeleton className="h-3 w-4/5 rounded-pill" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32 rounded-pill" />
        <Skeleton className="h-6 w-20 rounded-pill" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-2 flex-1 rounded-pill" />
        ))}
      </div>
    </div>
  );
}

export function PhotoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}
