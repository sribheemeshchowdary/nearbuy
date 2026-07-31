import { useState } from "react";
import { Eye, Copy, Check, Store, Code2 } from "lucide-react";
import type { Listing } from "@/components/ListingCard";

/**
 * Per-business tracking pixels. Each listing gets its own 1x1 pixel URL the
 * owner can embed anywhere (website, email, link-in-bio) to count views for
 * that specific business, shown individually alongside its view total.
 */
export const TrackingPixels = ({
  listings,
  viewCounts,
}: {
  listings: Listing[];
  viewCounts: Record<string, number>;
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://nearbuy.sg";
  const pixelUrl = (id: string) => `${origin}/api/pixel?id=${id}`;
  const snippet = (id: string) =>
    `<img src="${pixelUrl(id)}" width="1" height="1" alt="" style="display:none" />`;

  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(snippet(id));
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch { /* ignore */ }
  };

  if (listings.length === 0) return null;

  return (
    <div className="relative w-full max-w-full overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[hsl(var(--primary))] opacity-40" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-4 h-4 text-[hsl(var(--primary))]" />
          <h3 className="font-semibold text-foreground text-sm">Tracking Pixels</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Each business has its own pixel. Paste its snippet on your website, email, or
          link-in-bio to count views for that specific business.
        </p>

        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="rounded-xl border border-border/50 bg-background/60 p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {listing.logoUrl ? (
                    <img src={listing.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-border/50" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.08)] flex items-center justify-center shrink-0">
                      <Store className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{listing.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{listing.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {(viewCounts[listing.id] || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch gap-2 min-w-0">
                <code className="flex-1 min-w-0 overflow-x-auto rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">
                  {snippet(listing.id)}
                </code>
                <button
                  onClick={() => copy(listing.id)}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 sm:py-0 text-xs font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition"
                >
                  {copied === listing.id ? (
                    <><Check className="w-3.5 h-3.5" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
