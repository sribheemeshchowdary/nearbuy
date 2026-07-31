import { Building2, Layers, FileText, Info } from "lucide-react";

interface QuickInfoProps {
  listing: {
    name: string;
    uen: string;
    description?: string;
    category: string;
  };
}

const QuickInfo = ({ listing }: QuickInfoProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground mb-5">Quick Information</h3>

        {/* Summary */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Business Summary</p>
              <p className="text-sm text-foreground leading-relaxed">{listing.description || "No description available."}</p>
            </div>
          </div>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Category</p>
            <p className="text-sm font-semibold text-foreground">{listing.category}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">UEN</p>
            <p className="text-sm font-semibold text-foreground">{listing.uen}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickInfo;
