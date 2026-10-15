import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-6" aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="ml-auto h-10 w-64" />
      <Skeleton className="h-10 w-56" />
    </div>
  );
}
