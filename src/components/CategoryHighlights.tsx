import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toSlug } from "@/lib/url-helpers";
import foodImg from "@/assets/highlights/food.png";
import beautyImg from "@/assets/highlights/beauty.png";
import cleaningImg from "@/assets/highlights/cleaning.png";
import petservicesImg from "@/assets/highlights/petservices.png";

const highlights = [
  {
    title: "HOME FOOD",
    subtitle: "Fresh & Home-cooked",
    bg: "from-blue-600 to-indigo-700 shadow-[0_4px_20px_rgba(37,99,235,0.25)]",
    image: foodImg,
    category: "Home Food",
  },
  {
    title: "BEAUTY",
    subtitle: "Book Services Now",
    bg: "from-emerald-600 to-teal-700 shadow-[0_4px_20px_rgba(5,150,105,0.25)]",
    image: beautyImg,
    category: "Beauty",
  },
  {
    title: "CLEANING",
    subtitle: "Professional Care",
    bg: "from-purple-600 to-pink-700 shadow-[0_4px_20px_rgba(147,51,234,0.25)]",
    image: cleaningImg,
    category: "Cleaning",
  },
  {
    title: "PET SERVICES",
    subtitle: "Grooming & Walking",
    bg: "from-rose-600 to-pink-700 shadow-[0_4px_20px_rgba(225,29,72,0.25)]",
    image: petservicesImg,
    category: "Pet Services",
  },
];

const CategoryHighlights = () => {
  const navigate = useNavigate();

  return (
    <section className="mb-4 md:mb-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {highlights.map((item, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${item.bg} cursor-pointer active:scale-[0.98] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg min-h-[160px] md:min-h-[220px] flex flex-col justify-between p-5 group`}
            onClick={() => navigate(`/singapore/${toSlug(item.category)}`)}
          >
            <div className="relative z-10 space-y-1">
              <h3 className="font-extrabold text-white text-base md:text-lg leading-tight tracking-tight">
                {item.title}
              </h3>
              <p className="text-white/80 text-xs md:text-sm font-medium">
                {item.subtitle}
              </p>
            </div>

            <div className="relative z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-all duration-300">
                <ArrowRight className="w-4 h-4 text-white group-hover:text-foreground transition-colors" />
              </div>
            </div>

            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              width={512}
              height={512}
              className="absolute bottom-0 right-0 w-[55%] md:w-[60%] h-auto object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryHighlights;
