export default function Loading() {
  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-3">
        <div className="h-2.5 w-24 animate-pulse rounded-full bg-sand" />
        <div className="h-8 w-40 animate-pulse rounded-full bg-sand" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-sand/70" />
        ))}
      </div>
    </div>
  )
}
