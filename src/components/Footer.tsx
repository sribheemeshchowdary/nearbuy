import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Linkedin, Mail } from "lucide-react";
import { toSlug } from "@/lib/url-helpers";
import nearbuyLogo from "@/assets/nearbuy-logo.png";

const Footer = () => {
  return (
    <footer className="border-t-2 border-foreground/8 bg-secondary/30 retro-dot-bg">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <div
                role="img"
                aria-label="NearBuy"
                className="h-9 bg-primary"
                style={{
                  width: "92px",
                  WebkitMaskImage: `url(${nearbuyLogo})`,
                  maskImage: `url(${nearbuyLogo})`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskPosition: "left center",
                  maskPosition: "left center",
                }}
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Singapore's trusted business directory. Discover, connect, and grow with local businesses.
            </p>
            <div className="flex items-center gap-2.5">
              {[
                { Icon: Facebook, href: "#", label: "Facebook", color: "text-[#1877F2]", tint: "bg-[#1877F2]/10 border-[#1877F2]/20", hover: "hover:bg-[#1877F2] hover:border-[#1877F2]" },
                { Icon: Instagram, href: "https://www.instagram.com/nearbuy.sg", label: "Instagram", color: "text-[#E1306C]", tint: "bg-[#E1306C]/10 border-[#E1306C]/20", hover: "hover:bg-gradient-to-br hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:border-transparent" },
                { Icon: Twitter, href: "#", label: "Twitter", color: "text-[#1DA1F2]", tint: "bg-[#1DA1F2]/10 border-[#1DA1F2]/20", hover: "hover:bg-[#1DA1F2] hover:border-[#1DA1F2]" },
                { Icon: Linkedin, href: "#", label: "LinkedIn", color: "text-[#0A66C2]", tint: "bg-[#0A66C2]/10 border-[#0A66C2]/20", hover: "hover:bg-[#0A66C2] hover:border-[#0A66C2]" },
              ].map(({ Icon, href, label, color, tint, hover }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={label}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:text-white ${color} ${tint} ${hover}`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: "Home", to: "/" },
                { label: "About Us", to: "/about" },
                { label: "Contact Us", to: "/contact" },
                { label: "Add Business", to: "/add-listing" },
                { label: "Dashboard", to: "/dashboard" },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2">
              {["Tuition", "Beauty", "Wellness", "Music/Art/Craft", "Home Food", "Baking", "Pet Services", "Event Services", "Tailoring", "Cleaning", "Sports", "Retail"].map((cat) => (
                <li key={cat}>
                  <Link to={`/singapore/${toSlug(cat)}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-xs text-foreground mb-3 uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <span>hello@nearbuy.sg</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-border/60">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Nearbuy.SG. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
