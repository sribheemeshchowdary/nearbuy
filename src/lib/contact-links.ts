// ── Public contact-link resolution ──
//
// The AddListing sign-up form stores a business's socials in TWO shapes:
//   • the dedicated `instagram` / `website` fields — only populated when that
//     channel is the owner's PRIMARY contact method, and
//   • a single `secondary: { method, value }` slot — the "Social Media /
//     Website (optional)" field owners fill when their primary contact is
//     WhatsApp (the common case).
//
// The public business page historically read only the dedicated fields, so an
// Instagram (or website) added in the secondary slot never appeared to visitors
// even after admin approval. These resolvers merge both shapes so whatever the
// owner submitted becomes visible.

export interface ContactDetailsLike {
  instagram?: string;
  website?: string;
  twitter?: string;
  youtube?: string;
  secondary?: { method: string; value: string } | null;
}

const clean = (v?: string) => (v ? v.trim() : "");

/** Effective public Instagram handle/URL. Checks every place a business's
 *  Instagram can live: the dedicated `contactDetails.instagram` (primary), the
 *  `secondary` slot when it holds an Instagram value, and the top-level
 *  `instagramUrl` field (set via admin edit / legacy / seed data). */
export function resolveInstagram(cd?: ContactDetailsLike, topLevel?: string): string {
  const direct = clean(cd?.instagram);
  if (direct) return direct;
  if (cd?.secondary && cd.secondary.method === "instagram") {
    const sec = clean(cd.secondary.value);
    if (sec) return sec;
  }
  return clean(topLevel);
}

/** Effective public website, from a top-level field, the primary
 *  contactDetails.website, or an explicit website in the secondary slot. */
export function resolveWebsite(cd?: ContactDetailsLike, topLevel?: string): string {
  const top = clean(topLevel);
  if (top) return top;
  const direct = clean(cd?.website);
  if (direct) return direct;
  if (cd?.secondary && cd.secondary.method === "website") return clean(cd.secondary.value);
  return "";
}
