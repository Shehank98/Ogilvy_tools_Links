// Shown instantly while a page's data loads, so navigation feels immediate.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[7.6rem]" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="skeleton h-6 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton h-[7.6rem]" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  );
}
