import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, Home, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_CATEGORIES } from "@/lib/districts";
import { toSlug } from "@/lib/url-helpers";
import SEOHead from "@/components/SEOHead";

const POPULAR_CATEGORIES = [
  "Home Food",
  "Beauty",
  "Cleaning",
  "Tuition",
  "Handyman",
  "Pet Services",
  "Baking",
  "Photography / Videography",
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Browse popular categories or search Nearbuy Singapore's local business directory."
      />
      <div className="w-full max-w-2xl text-center">
        {/* Big 404 */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Compass className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-3">404</h1>
        <p className="text-lg text-foreground font-semibold mb-2">We couldn't find that page</p>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          The link may be broken or the listing may have been removed. Try searching or jump to a popular category below.
        </p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto mb-8">
          <div className="flex-1 flex items-center h-11 px-3 rounded-xl border-2 border-border/60 bg-card focus-within:border-primary/50 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses, categories, postal codes…"
              className="flex-1 ml-2 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" className="h-11 px-5 rounded-xl">
            Search
          </Button>
        </form>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Link to="/">
            <Button variant="outline" className="rounded-xl">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link to="/add-listing">
            <Button className="rounded-xl">
              List Your Business
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Popular categories */}
        <div className="border-t border-border/40 pt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Popular Categories
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/singapore/${toSlug(cat)}`}
                className="inline-flex items-center h-9 px-4 rounded-full border-2 border-border/60 bg-card text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
