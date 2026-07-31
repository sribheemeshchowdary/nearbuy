import { Button } from "@/components/ui/button";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface CatalogueItem {
  id: string;
  title: string;
  description: string;
  price: string;
  image?: string;
}

interface CatalogueSectionProps {
  items?: CatalogueItem[];
  whatsappNumber?: string;
  businessName?: string;
  defaultMessage?: string;
}

const CatalogueSection = ({ items, whatsappNumber, businessName, defaultMessage }: CatalogueSectionProps) => {
  const catalogue = items ?? [];

  const handleEnquire = (item: CatalogueItem) => {
    const sanitized = (whatsappNumber || "").replace(/[^0-9+]/g, "");
    const itemBlock = `📦 *${item.title}*\n💰 ${item.price}`;
    const message = defaultMessage && defaultMessage.trim()
      ? `${defaultMessage.trim()}\n\n${itemBlock}`
      : `Hi${businessName ? ` ${businessName}` : ""},\n\nI'm interested in:\n${itemBlock}\n\nCould you share more details?\n\nThank you!`;
    const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Catalogue</h3>
        {catalogue.length > 0 && <Button variant="link" className="text-primary text-sm p-0 h-auto">View all</Button>}
      </div>
      {catalogue.length === 0 ? (
        <p className="text-sm text-muted-foreground">This business hasn't added any catalogue items yet.</p>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogue.map((item) => (
          <div key={item.id} className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
            {item.image && (
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4 space-y-3">
              <h4 className="font-semibold text-foreground text-sm line-clamp-2">{item.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
              <p className="text-sm font-semibold text-foreground">{item.price}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                onClick={() => handleEnquire(item)}
              >
                <WhatsAppIcon className="w-[17px] h-[17px] mr-1.5 shrink-0" />
                Enquire Now
              </Button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default CatalogueSection;
