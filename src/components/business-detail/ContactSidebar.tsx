import { Phone, Mail, Globe, ExternalLink, Instagram, Twitter, Youtube } from "lucide-react";
import { resolveInstagram, resolveWebsite } from "@/lib/contact-links";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface ContactSidebarProps {
  listing: {
    phone?: string;
    email?: string;
    ownerEmail?: string;
    contactEmail?: string;
    website?: string;
    address: string;
    uen: string;
    whatsapp?: string;
    instagramUrl?: string;
    contactDetails?: {
      whatsapp?: string;
      whatsappMessage?: string;
      website?: string;
      instagram?: string;
      twitter?: string;
      youtube?: string;
      secondary?: { method: string; value: string } | null;
    };
  };
}

const ContactSidebar = ({ listing }: ContactSidebarProps) => {
  const whatsappNumber = listing.contactDetails?.whatsapp || listing.whatsapp || listing.phone;
  const whatsappMessage = listing.contactDetails?.whatsappMessage || "";
  const displayEmail = listing.email || listing.contactEmail || listing.ownerEmail;
  const displayWebsite = resolveWebsite(listing.contactDetails, listing.website);

  const instagramValue = resolveInstagram(listing.contactDetails, listing.instagramUrl);
  const instagramHref = instagramValue
    ? (/^https?:\/\//i.test(instagramValue) ? instagramValue : `https://instagram.com/${instagramValue.replace(/^@/, "")}`)
    : "";

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const cleaned = whatsappNumber.replace(/[^0-9]/g, "");
    const msgParam = whatsappMessage ? `&text=${encodeURIComponent(whatsappMessage)}` : "";
    window.open(`https://wa.me/${cleaned}?${msgParam}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Airbnb-style Action/Contact Card */}
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.09)] transition-all duration-300 transform hover:-translate-y-0.5">
        <div className="mb-4">
          <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Business Actions</span>
        </div>

        <div className="space-y-3">
          {/* WhatsApp Primary CTA */}
          {whatsappNumber && (
            <button
              onClick={openWhatsApp}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold transition-all duration-200 active:scale-[0.98] shadow-[0_4px_12px_rgba(37,211,102,0.2)] hover:shadow-[0_6px_16px_rgba(37,211,102,0.3)] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              Chat on WhatsApp
            </button>
          )}

          {/* Instagram CTA — shown alongside WhatsApp */}
          {instagramHref && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold transition-all duration-200 active:scale-[0.98] shadow-[0_4px_12px_rgba(221,42,123,0.2)] hover:shadow-[0_6px_16px_rgba(221,42,123,0.3)]"
              style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)" }}
            >
              <Instagram className="w-5 h-5 shrink-0" />
              Message on Instagram
            </a>
          )}

          {/* Call Secondary CTA */}
          {listing.phone && (
            <a
              href={`tel:${listing.phone}`}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-foreground/10 hover:border-foreground/20 bg-card text-foreground font-semibold transition-all duration-200 hover:bg-secondary/40 active:scale-[0.98]"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              Call {listing.phone}
            </a>
          )}

          {/* Email CTA */}
          {displayEmail && (
            <a
              href={`mailto:${displayEmail}`}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-foreground/10 hover:border-foreground/20 bg-card text-foreground font-semibold transition-all duration-200 hover:bg-secondary/40 active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 text-muted-foreground" />
              Send Email Inquiry
            </a>
          )}

          {/* Website CTA */}
          {displayWebsite && (
            <a
              href={displayWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-foreground/10 hover:border-foreground/20 bg-card text-foreground font-semibold transition-all duration-200 hover:bg-secondary/40 active:scale-[0.98]"
            >
              <Globe className="w-4 h-4 text-muted-foreground" />
              Visit Website
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60" />
            </a>
          )}
        </div>
      </div>

      {/* Social Profiles Card */}
      {(() => {
        const cd = listing.contactDetails || {};
        const buildUrl = (val: string | undefined, baseHandle: string) => {
          if (!val) return "";
          const v = val.trim();
          if (!v) return "";
          if (/^https?:\/\//i.test(v)) return v;
          const handle = v.replace(/^@/, "");
          return `${baseHandle}${handle}`;
        };
        // Instagram is shown as a primary action button above, so it's omitted
        // here to avoid duplication; the Follow Us card keeps the other socials.
        const socials = [
          { key: "twitter", label: "X (Twitter)", url: buildUrl(cd.twitter, "https://x.com/"), Icon: Twitter, bg: "hover:bg-foreground/[0.08] hover:text-foreground border-foreground/10 text-muted-foreground" },
          { key: "youtube", label: "YouTube", url: buildUrl(cd.youtube, "https://youtube.com/@"), Icon: Youtube, bg: "hover:bg-red-500/[0.08] hover:text-red-600 border-red-500/10 text-muted-foreground" },
        ].filter(s => s.url);
        if (socials.length === 0) return null;
        return (
          <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Follow Us</h3>
            <div className="flex items-center gap-3">
              {socials.map(({ key, label, url, Icon, bg }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex-1"
                >
                  <div className={`h-11 rounded-xl border flex items-center justify-center transition-all duration-200 active:scale-95 ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ContactSidebar;
