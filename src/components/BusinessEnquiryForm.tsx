import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { useRateLimit } from "@/hooks/useRateLimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { clearAutoReloadDirtyState } from "@/hooks/useAutoPageReload";

interface BusinessEnquiryFormProps {
  listingId: string;
  listingName: string;
  ownerId: string;
}

const BusinessEnquiryForm = ({ listingId, listingName, ownerId }: BusinessEnquiryFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const checkLimit = useRateLimit(3, 60000);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { allowed, waitSec } = checkLimit();
    if (!allowed) {
      toast.error(`Too many attempts. Please wait ${waitSec}s before trying again.`);
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Please fill in name and mobile number");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "enquiries"), {
        listingId,
        listingName,
        ownerId,
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 255),
        phone: phone.trim().slice(0, 20),
        message: message.trim().slice(0, 2000),
        createdAt: serverTimestamp(),
        status: "unread",
      });
      clearAutoReloadDirtyState(form);
      setSent(true);
      toast.success("Enquiry sent successfully!");
    } catch {
      toast.error("Failed to send enquiry. Please try again.");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
          <Send className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Enquiry Sent!</h3>
        <p className="text-sm text-muted-foreground mb-3">The business owner will get back to you soon.</p>
        <Button variant="outline" size="sm" onClick={() => { setSent(false); setName(""); setEmail(""); setPhone(""); setMessage(""); }}>
          Send Another
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        Send Enquiry
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="h-9 text-sm" maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mobile Number *</Label>
          <div className="flex">
            <span className="inline-flex items-center px-2.5 h-9 rounded-l-lg border-2 border-r-0 border-border bg-muted text-xs font-medium text-muted-foreground select-none">+65</span>
            <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8888 8888" className="h-9 text-sm rounded-l-none rounded-r-lg" maxLength={8} inputMode="numeric" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com (optional)" className="h-9 text-sm" maxLength={255} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="I'd like to enquire about... (optional)" rows={3} className="text-sm" maxLength={2000} />
        </div>
        <Button type="submit" className="w-full h-9 text-sm" disabled={sending}>
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {sending ? "Sending..." : "Send Enquiry"}
        </Button>
      </form>
    </div>
  );
};

export default BusinessEnquiryForm;
