import { Link } from "react-router-dom";
import { Building2, Search, Shield, Star, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const features = [
  { icon: Search, title: "Easy Discovery", desc: "Search by category, location, or keyword to find exactly what you need in seconds." },
  { icon: Shield, title: "UEN Verified", desc: "Every featured business is verified with their official Unique Entity Number." },
  { icon: Star, title: "Trusted Listings", desc: "Browse curated ratings and genuine customer feedback you can count on." },
  { icon: Zap, title: "Free Listings", desc: "Business owners can list for free and instantly reach local customers." },
  { icon: Users, title: "Community Driven", desc: "Built for Singaporeans, by Singaporeans — supporting local businesses." },
  { icon: Building2, title: "Spacious Directory", desc: "From tuition to bakeries, music classes to wellness — we list it all." },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="About Us" description="Learn about Nearbuy — Singapore's trusted business directory helping you discover verified local businesses." />

    <div className="container mx-auto px-6 py-16 max-w-5xl">
      {/* Hero section */}
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">About Nearbuy</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Singapore's clean and verified local business directory — designed to make discovering local shops and service providers incredibly easy and fast.
        </p>
      </div>

      {/* Main Mission Panel */}
      <div className="bg-card border border-foreground/[0.06] rounded-2xl p-8 md:p-12 shadow-[0_6px_20px_rgba(0,0,0,0.03)] mb-16 relative overflow-hidden group hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 transform translate-x-12 -translate-y-12" />
        <div className="max-w-3xl space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Nearbuy was created to bridge the gap between neighborhood businesses and local residents. 
            Whether you are looking for a reliable home baker, a nearby math tutor, or a pet grooming service down the street, our catalog helps you find them instantly.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            We believe in transparency and trust. That's why we verify our businesses using their Unique Entity Number (UEN), ensuring you always interact with registered, legitimate providers.
          </p>
        </div>
      </div>

      {/* Grid of features */}
      <div className="space-y-10">
        <h2 className="text-3xl font-bold text-foreground text-center">Why Nearbuy?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div 
              key={f.title} 
              className="bg-card border border-foreground/[0.06] rounded-2xl p-6 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center mt-20 pt-8 border-t border-foreground/[0.06]">
        <h3 className="text-2xl font-bold text-foreground mb-4">Own a neighborhood business?</h3>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Get discovered by thousands of customers searching nearby. Create your listing in minutes.</p>
        <Link to="/add-listing">
          <Button size="lg" className="rounded-full px-8 py-6 text-sm font-semibold transition-all duration-200 active:scale-[0.98] shadow-md hover:shadow-lg">
            List Your Business Free
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

export default About;
