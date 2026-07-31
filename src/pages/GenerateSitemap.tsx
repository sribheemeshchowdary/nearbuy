import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { CITIES } from "@/lib/cities";
import { toSlug, getBusinessUrl } from "@/lib/url-helpers";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw, FileText } from "lucide-react";

const DOMAIN = "https://nearbuy.sg";

const CATEGORIES = [
  "Tuition", "Baking", "Music, Art & Craft", "Home Food", "Wellness", "Beauty",
  "Pet Services", "Event Services", "Tailoring", "Cleaning", "Handyman",
  "Photography & Videography", "Sports", "Retail",
];

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
  { path: "/add-listing", changefreq: "monthly", priority: "0.6" },
];

interface ListingData {
  name: string;
  category: string;
  district: string;
  customSlug?: string;
  updatedAt?: { seconds: number };
  createdAt?: { seconds: number };
}

const toISO = (ts?: { seconds: number }) =>
  ts ? new Date(ts.seconds * 1000).toISOString().split("T")[0] : undefined;

const buildUrl = (path: string, changefreq: string, priority: string, lastmod?: string) =>
  `  <url>\n    <loc>${DOMAIN}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

export default function GenerateSitemap() {
  const { isAdmin } = useAuth();
  const [xml, setXml] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ listings: 0, total: 0 });

  const generate = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "listings"), where("status", "==", "approved")));
      const listings = snap.docs.map((d) => ({ ...d.data() } as ListingData));

      const urls: string[] = [];

      // Static pages
      STATIC_PAGES.forEach((p) => urls.push(buildUrl(p.path, p.changefreq, p.priority)));

      // City pages
      CITIES.forEach((c) => urls.push(buildUrl(`/${c.slug}`, "daily", "0.9")));

      // City + Category pages
      CITIES.forEach((c) =>
        CATEGORIES.forEach((cat) =>
          urls.push(buildUrl(`/${c.slug}/${toSlug(cat)}`, "daily", "0.8"))
        )
      );

      // Individual business pages
      listings.forEach((l) => {
        const path = getBusinessUrl({ district: l.district, category: l.category, name: l.name, customSlug: l.customSlug });
        const lastmod = toISO(l.updatedAt || l.createdAt);
        urls.push(buildUrl(path, "weekly", "0.7", lastmod));
      });

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
      setXml(sitemap);
      setStats({ listings: listings.length, total: urls.length });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Sitemap Generator</h1>
          <p className="text-sm text-muted-foreground">Fetch all approved listings and generate a complete sitemap.xml</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {loading ? "Generating…" : "Generate Sitemap"}
        </Button>
        {xml && (
          <Button variant="outline" onClick={download}>
            <Download className="w-4 h-4 mr-2" /> Download sitemap.xml
          </Button>
        )}
      </div>

      {xml && (
        <>
          <div className="text-sm text-muted-foreground">
            {stats.listings} approved listings · {stats.total} total URLs
          </div>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto max-h-[60vh] border">{xml}</pre>
        </>
      )}
    </div>
  );
}
