import { Loader2 } from "lucide-react";

/** Full-viewport fallback shown while a lazily-loaded route chunk is fetched. */
const PageLoader = () => (
  <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3 py-24">
    <Loader2 className="w-7 h-7 animate-spin text-primary" aria-hidden="true" />
    <span className="text-sm font-medium text-muted-foreground">Loading…</span>
    <span className="sr-only">Loading page</span>
  </div>
);

export default PageLoader;
