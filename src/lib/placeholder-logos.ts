import biz1 from "@/assets/placeholder-logos/biz-placeholder-1.png";
import biz2 from "@/assets/placeholder-logos/biz-placeholder-2.png";
import biz3 from "@/assets/placeholder-logos/biz-placeholder-3.png";
import biz4 from "@/assets/placeholder-logos/biz-placeholder-4.png";
import biz5 from "@/assets/placeholder-logos/biz-placeholder-5.png";

const PLACEHOLDER_LOGOS = [biz1, biz2, biz3, biz4, biz5];

/** Returns a deterministic placeholder logo based on the business name/id */
export function getPlaceholderLogo(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
    hash |= 0;
  }
  return PLACEHOLDER_LOGOS[Math.abs(hash) % PLACEHOLDER_LOGOS.length];
}
