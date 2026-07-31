import { useState } from "react";
import { useRateLimit } from "@/hooks/useRateLimit";
import { Mail, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import SEOHead from "@/components/SEOHead";
import { clearAutoReloadDirtyState } from "@/hooks/useAutoPageReload";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const checkLimit = useRateLimit(3, 60000);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const { allowed, waitSec } = checkLimit();
    if (!allowed) {
      toast.error(`Too many attempts. Please wait ${waitSec}s before trying again.`);
      return;
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "contact_messages"), {
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 255),
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 2000),
        createdAt: serverTimestamp(),
        status: "unread",
      });
      clearAutoReloadDirtyState(form);
      toast.success("Message sent! We'll get back to you soon.");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch {
      toast.error("Failed to send message. Please try again.");
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Contact Us" description="Get in touch with Nearbuy. We're here to help with questions, feedback, or business listing support." />

      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-3">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">Have a question or feedback? We'd love to hear from you.</p>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-foreground/[0.06] rounded-2xl p-6 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mx-auto">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Email</h3>
            <p className="text-xs text-muted-foreground font-medium">hello@nearbuy.sg</p>
          </div>

          <div className="bg-card border border-foreground/[0.06] rounded-2xl p-6 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mx-auto">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Location</h3>
            <p className="text-xs text-muted-foreground font-medium">Singapore</p>
          </div>

          <div className="bg-card border border-foreground/[0.06] rounded-2xl p-6 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground text-sm">Response Time</h3>
            <p className="text-xs text-muted-foreground font-medium">Within 24 hours</p>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="bg-card border border-foreground/[0.06] rounded-3xl p-8 md:p-10 max-w-2xl mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80">Name *</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Your name" 
                  maxLength={100}
                  className="h-11 rounded-xl border-foreground/10 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80">Email *</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  maxLength={255} 
                  className="h-11 rounded-xl border-foreground/10 focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80">Subject</Label>
              <Input 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                placeholder="What is this regarding?" 
                maxLength={200} 
                className="h-11 rounded-xl border-foreground/10 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80">Message *</Label>
              <Textarea 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                placeholder="How can we help you?" 
                rows={5} 
                maxLength={2000} 
                className="rounded-xl border-foreground/10 focus-visible:ring-primary/30"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center gap-2" 
              disabled={sending}
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
