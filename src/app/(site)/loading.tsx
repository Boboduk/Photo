import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page pt-10 sm:pt-14" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="masonry mt-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: `${220 + ((i * 67) % 160)}px` }} />
        ))}
      </div>
    </div>
  );
}
