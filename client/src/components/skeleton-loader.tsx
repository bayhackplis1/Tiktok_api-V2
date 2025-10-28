export function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg" />
        <div className="h-64 bg-gradient-to-br from-pink-500/10 to-cyan-500/10 rounded-lg" />
      </div>

      <div className="h-48 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-lg" />
    </div>
  );
}
