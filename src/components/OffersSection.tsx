import { Clock, Tag, Gift } from "lucide-react";

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  code?: string;
}

interface OffersSectionProps {
  offers: Offer[];
}

const DEMO_OFFERS: Offer[] = [
  {
    id: "o1",
    title: "Grand Opening Special",
    description: "Enjoy special discounts on all services for the month of March.",
    discount: "20% OFF",
    validUntil: "2026-03-31",
    code: "OPEN20",
  },
  {
    id: "o2",
    title: "Refer a Friend",
    description: "Get $10 credit when you refer a friend who makes a purchase.",
    discount: "$10 Credit",
    validUntil: "2026-06-30",
  },
];

const OffersSection = ({ offers: propOffers }: OffersSectionProps) => {
  const offers = propOffers.length > 0 ? propOffers : DEMO_OFFERS;

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className="group rounded-2xl bg-card border border-border/60 p-5 transition-all duration-300 hover:shadow-lg hover:border-border"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left content */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground text-[15px] leading-tight tracking-tight">
                  {offer.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {offer.description}
                </p>
                <div className="flex items-center flex-wrap gap-3 mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Valid until {new Date(offer.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {offer.code && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/70 bg-muted px-2.5 py-1 rounded-lg border border-border/50">
                      <Tag className="w-3 h-3" />
                      {offer.code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Discount badge */}
            <div className="shrink-0">
              <div className="bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-xl tracking-tight">
                {offer.discount}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OffersSection;
