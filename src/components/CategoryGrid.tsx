import { useNavigate } from "react-router-dom";
import { toSlug } from "@/lib/url-helpers";

const CATEGORIES = [
  { name: "Tuition", emoji: "📚", color: "bg-blue-500/10 text-blue-600" },
  { name: "Baking", emoji: "🧁", color: "bg-amber-500/10 text-amber-600" },
  { name: "Music/Art/Craft", emoji: "🎨", color: "bg-purple-500/10 text-purple-600" },
  { name: "Home Food", emoji: "🍱", color: "bg-orange-500/10 text-orange-600" },
  { name: "Wellness", emoji: "🧘", color: "bg-teal-500/10 text-teal-600" },
  { name: "Beauty", emoji: "💅", color: "bg-pink-500/10 text-pink-600" },
  { name: "Pet Services", emoji: "🐾", color: "bg-emerald-500/10 text-emerald-600" },
  { name: "Event Services", emoji: "🎉", color: "bg-rose-500/10 text-rose-600" },
  { name: "Tailoring", emoji: "🧵", color: "bg-violet-500/10 text-violet-600" },
  { name: "Cleaning", emoji: "🧹", color: "bg-sky-500/10 text-sky-600" },
  { name: "Handyman", emoji: "🔧", color: "bg-amber-500/10 text-amber-600" },
  { name: "Photography / Videography", emoji: "📸", color: "bg-slate-500/10 text-slate-600" },
  { name: "Sports", emoji: "⚽", color: "bg-green-500/10 text-green-600" },
  { name: "Retail", emoji: "🛍️", color: "bg-indigo-500/10 text-indigo-600" },
];

const CategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          Browse by Category
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => navigate(`/singapore/${toSlug(cat.name)}`)}
            className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-foreground/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 active:scale-[0.97]"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${cat.color}`}>
              <span className="text-2xl">{cat.emoji}</span>
            </div>
            <span className="text-[12px] font-semibold text-foreground text-center leading-snug line-clamp-2">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
