export const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const getBusinessUrl = (listing: {
  district: string;
  category: string;
  name: string;
  customSlug?: string;
}) => {
  const area = toSlug(listing.district);
  const industry = toSlug(listing.category);
  const business = listing.customSlug || toSlug(listing.name);
  return `/${area}/${industry}/${business}`;
};
