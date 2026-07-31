/**
 * Loading placeholder that mirrors ListingCard structure to prevent layout shift.
 * Use while fetching listings on home or category pages.
 */
const ListingCardSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading business listing"
      className="rounded-2xl bg-white border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-3 last:mb-0"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary" />
      {/* Mobile */}
      <div className="flex gap-3 p-4 md:hidden">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-secondary animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-secondary rounded animate-pulse" />
          <div className="flex gap-2 pt-1">
            <div className="h-6 flex-1 bg-secondary rounded-xl animate-pulse" />
            <div className="h-6 flex-1 bg-secondary rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
      {/* Desktop */}
      <div className="hidden md:flex items-start gap-4 px-5 py-4">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-secondary animate-pulse" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-1/2 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-1/3 bg-secondary rounded animate-pulse" />
          <div className="h-3 w-2/5 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default ListingCardSkeleton;
