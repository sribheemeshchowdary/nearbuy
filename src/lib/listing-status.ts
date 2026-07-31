const PRIVATE_LISTING_STATUSES = new Set([
  "pending",
  "pending_approval",
  "rejected",
  "draft",
  "deleted",
  "disabled",
  "inactive",
  "suspended",
  "archived",
]);

export const PUBLIC_LISTING_STATUS_QUERY_VALUES = [
  "approved",
  "Approved",
  "APPROVED",
  "active",
  "Active",
  "ACTIVE",
  "published",
  "Published",
  "PUBLISHED",
  "live",
  "Live",
  "LIVE",
  "visible",
  "Visible",
  "VISIBLE",
  "public",
  "Public",
  "PUBLIC",
  "enabled",
  "Enabled",
  "verified",
  "Verified",
  "listed",
  "Listed",
] as const;

export const chunkListingStatusesForFirestore = () => {
  const chunks: string[][] = [];
  for (let i = 0; i < PUBLIC_LISTING_STATUS_QUERY_VALUES.length; i += 10) {
    chunks.push([...PUBLIC_LISTING_STATUS_QUERY_VALUES.slice(i, i + 10)]);
  }
  return chunks;
};

export const isPubliclyVisibleListing = (listing: { status?: unknown }) => {
  const status = typeof listing.status === "string" ? listing.status.trim().toLowerCase() : "";
  return !PRIVATE_LISTING_STATUSES.has(status);
};

export const isLiveListingStatus = (status?: unknown) => {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
  return !PRIVATE_LISTING_STATUSES.has(normalized);
};
