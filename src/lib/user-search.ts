export interface UserSearchFields {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

/** A user's best available display name (email/password users often have none). */
export const getUserDisplayName = (u: Pick<UserSearchFields, "name" | "displayName">) =>
  (u.name || u.displayName || "").trim();

/**
 * Admin user-directory search: matches a user against a query by name,
 * email, or mobile number. Case-insensitive; phone matching ignores
 * formatting (spaces, +, dashes) so "8888" finds "+65 8888 1234".
 */
export const matchesUserSearch = (u: UserSearchFields, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const name = getUserDisplayName(u).toLowerCase();
  const email = (u.email || "").toLowerCase();
  const phone = (u.phone || "").toLowerCase();
  const phoneDigits = (u.phone || "").replace(/\D/g, "");
  return (
    name.includes(q) ||
    email.includes(q) ||
    phone.includes(q) ||
    (digits.length > 0 && phoneDigits.includes(digits))
  );
};
