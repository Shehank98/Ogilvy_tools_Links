export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-5">
      <div className="skeleton h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20" style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
