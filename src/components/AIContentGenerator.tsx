import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AIContentGeneratorProps {
  businessName: string;
  category: string;
  district: string;
  onGenerated: (content: string) => void;
}

const TEMPLATES = [
  { label: "Business Description", prompt: "professional business description" },
  { label: "Tagline", prompt: "catchy business tagline" },
  { label: "About Us", prompt: "about us section" },
];

const AIContentGenerator = ({ businessName, category, district, onGenerated }: AIContentGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [copied, setCopied] = useState(false);

  const generateContent = async () => {
    setLoading(true);
    try {
      // Simulated AI generation with realistic content
      // In production, this would call an edge function
      await new Promise((r) => setTimeout(r, 1500));

      const template = TEMPLATES[selectedTemplate];
      const descriptions: Record<string, string[]> = {
        "professional business description": [
          `${businessName} is a leading ${category.toLowerCase()} establishment located in the heart of ${district}, Singapore. With a commitment to excellence and customer satisfaction, we provide premium services tailored to meet the diverse needs of our clients. Our experienced team combines industry expertise with innovative approaches to deliver outstanding results consistently.`,
          `Established in ${district}, ${businessName} has quickly become a trusted name in the ${category.toLowerCase()} industry. We pride ourselves on delivering exceptional quality, personalised service, and competitive pricing. Whether you're a first-time customer or a long-standing patron, we ensure every interaction exceeds your expectations.`,
        ],
        "catchy business tagline": [
          `${businessName} — Where Quality Meets Excellence in ${district}`,
          `Experience the Best of ${category} with ${businessName}`,
          `Your Trusted ${category} Partner in Singapore`,
        ],
        "about us section": [
          `At ${businessName}, we believe in building lasting relationships with our customers. Based in ${district}, Singapore, our team of dedicated professionals brings years of experience in ${category.toLowerCase()} to every project. We are committed to innovation, sustainability, and creating value for the communities we serve. From our humble beginnings, we have grown into a respected business known for reliability, quality, and a genuine passion for what we do.`,
        ],
      };

      const options = descriptions[template.prompt] || descriptions["professional business description"];
      const result = options[Math.floor(Math.random() * options.length)];

      setGenerated(result);
      onGenerated(result);
    } catch {
      toast.error("Failed to generate content");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Content Generator</h3>
          <p className="text-xs text-muted-foreground">Generate professional descriptions for your business</p>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex gap-2 flex-wrap">
        {TEMPLATES.map((t, i) => (
          <button
            key={i}
            onClick={() => setSelectedTemplate(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === selectedTemplate
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Button
        onClick={generateContent}
        disabled={loading}
        className="w-full"
        size="sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-1.5" />
        )}
        {loading ? "Generating..." : `Generate ${TEMPLATES[selectedTemplate].label}`}
      </Button>

      {generated && (
        <div className="space-y-2 animate-fade-in">
          <Textarea
            value={generated}
            onChange={(e) => setGenerated(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onGenerated(generated)}>
              Use This
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContentGenerator;
