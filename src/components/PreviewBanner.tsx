import { Eye } from "lucide-react";

/**
 * Shown to a listing owner when they view their own listing that isn't
 * publicly live yet (pending approval or rejected). The page is only
 * reachable by the owner — the public sees "Business Not Found".
 */
export const PreviewBanner = ({ status }: { status?: string }) => {
  const rejected = status === "rejected";
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        rejected
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          rejected ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600"
        }`}
      >
        <Eye className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {rejected ? "Preview · Not approved" : "Preview · To be approved"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {rejected
            ? "Only you can see this page — this listing was not approved. Edit it from your dashboard and resubmit."
            : "Only you can see this page. It becomes public once an admin approves it."}
        </p>
      </div>
    </div>
  );
};

/** Compact inline badge — "Preview · To be approved" — for cards and lists. */
export const PreviewBadge = ({
  status,
  className = "",
}: {
  status?: string;
  className?: string;
}) => {
  const rejected = status === "rejected";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        rejected
          ? "bg-red-500/90 text-white"
          : "bg-amber-500/90 text-white"
      } ${className}`}
    >
      <Eye className="h-2.5 w-2.5" />
      {rejected ? "Preview · Not approved" : "Preview · To be approved"}
    </span>
  );
};
