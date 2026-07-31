import { useState, useEffect } from "react";
import { MessageSquare, Mail, Phone, Clock, Check, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_ENQUIRIES } from "@/lib/demo-enquiries";

interface Enquiry {
  id: string;
  listingId: string;
  listingName: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "unread" | "read" | "replied";
  reply?: string;
  createdAt: any;
  repliedAt?: any;
}

interface EnquiryInboxProps {
  listings?: Array<{ id: string; name: string }>;
}

const EnquiryInbox = ({ listings = [] }: EnquiryInboxProps) => {
  const { user, isDevMode } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState("all");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (isDevMode) {
      setEnquiries(DEMO_ENQUIRIES);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "enquiries"),
      where("ownerId", "==", user.uid)
    );
    const prevIdsRef = { current: new Set<string>() } as { current: Set<string> };
    let isFirst = true;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Enquiry))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (!isFirst) {
          const newOnes = items.filter(i => !prevIdsRef.current.has(i.id) && i.status === "unread");
          if (newOnes.length > 0) {
            toast.success(
              newOnes.length === 1
                ? `New enquiry from ${newOnes[0].name}`
                : `${newOnes.length} new enquiries received`
            );
          }
        }
        prevIdsRef.current = new Set(items.map(i => i.id));
        isFirst = false;
        setEnquiries(items);
        setLoading(false);
      },
      () => {
        toast.error("Failed to load enquiries");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, isDevMode]);

  const markRead = async (id: string) => {
    if (isDevMode) {
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: "read" } : e));
      return;
    }
    try {
      await updateDoc(doc(db, "enquiries", id), { status: "read" });
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: "read" } : e));
    } catch {}
  };

  const toggleExpand = (enq: Enquiry) => {
    if (expandedId === enq.id) {
      setExpandedId(null);
      setReplyText("");
    } else {
      setExpandedId(enq.id);
      setReplyText(enq.reply || "");
      if (enq.status === "unread") markRead(enq.id);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) { toast.error("Please write a reply"); return; }
    setReplying(true);
    if (isDevMode) {
      setEnquiries(prev => prev.map(e =>
        e.id === id ? { ...e, status: "replied", reply: replyText.trim() } : e
      ));
      toast.success("Note saved");
      setExpandedId(null);
      setReplyText("");
      setReplying(false);
      return;
    }
    try {
      await updateDoc(doc(db, "enquiries", id), {
        status: "replied",
        reply: replyText.trim().slice(0, 2000),
        repliedAt: new Date(),
      });
      setEnquiries(prev => prev.map(e =>
        e.id === id ? { ...e, status: "replied", reply: replyText.trim() } : e
      ));
      toast.success("Note saved");
      setExpandedId(null);
      setReplyText("");
    } catch {
      toast.error("Failed to save reply");
    }
    setReplying(false);
  };

  const listingNames = new Map(listings.map(listing => [listing.id, listing.name]));
  const visibleEnquiries = selectedListingId === "all"
    ? enquiries
    : enquiries.filter(enquiry => enquiry.listingId === selectedListingId);
  const unreadCount = visibleEnquiries.filter(e => e.status === "unread").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading enquiries...</div>
      </div>
    );
  }

  if (enquiries.length === 0) {
    return (
      <div className="text-center py-16 bg-background rounded-2xl border border-border">
        <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium text-foreground">No enquiries yet</p>
        <p className="text-sm text-muted-foreground">Enquiries from customers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-col gap-3 mb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">Enquiry Inbox</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {visibleEnquiries.length} {visibleEnquiries.length === 1 ? "enquiry" : "enquiries"}
          </span>
        </div>
        {listings.length > 1 && (
          <div className="space-y-1">
            <Label htmlFor="enquiry-business" className="text-xs">Business</Label>
            <select
              id="enquiry-business"
              value={selectedListingId}
              onChange={(event) => {
                setSelectedListingId(event.target.value);
                setExpandedId(null);
                setReplyText("");
              }}
              className="h-9 min-w-52 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="all">All businesses</option>
              {listings.map(listing => (
                <option key={listing.id} value={listing.id}>{listing.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Enquiry list */}
      <div className="space-y-3">
        {visibleEnquiries.length === 0 && (
          <div className="text-center py-12 bg-background rounded-xl border border-border">
            <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No enquiries for this business</p>
          </div>
        )}
        {visibleEnquiries.map(enq => {
          const isExpanded = expandedId === enq.id;
          const time = enq.createdAt?.seconds
            ? new Date(enq.createdAt.seconds * 1000).toLocaleDateString("en-SG", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })
            : "Unknown date";

          return (
            <div
              key={enq.id}
              className={`bg-background rounded-xl border transition-all ${
                enq.status === "unread"
                  ? "border-primary/40 shadow-sm"
                  : "border-border"
              }`}
            >
              {/* Header row */}
              <button
                onClick={() => toggleExpand(enq)}
                className="w-full p-4 text-left flex items-start gap-3"
              >
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  enq.status === "unread" ? "bg-primary" :
                  enq.status === "replied" ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm text-foreground">{enq.name}</span>
                    <Badge variant={enq.status === "unread" ? "default" : enq.status === "replied" ? "outline" : "secondary"} className="text-[10px] h-5">
                      {enq.status === "unread" ? "New" : enq.status === "replied" ? "Handled" : "Read"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Business: <span className="font-medium">{enq.listingName || listingNames.get(enq.listingId) || "Unknown business"}</span>
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{enq.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">{time}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4">
                  <div className="pt-3 space-y-2">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{enq.message}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{enq.email}</span>
                      {enq.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{enq.phone}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                    </div>
                  </div>

                  {/* Previously recorded response */}
                  {enq.reply && enq.status === "replied" && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800/40">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Saved note</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{enq.reply}</p>
                    </div>
                  )}

                  {/* Manual response record — this does not send a message */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-semibold">Add a note</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Record what you told the customer. This does not send a message.
                      </p>
                    </div>
                    <Textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Example: Called customer and confirmed the booking"
                      rows={3}
                      className="text-sm"
                      maxLength={2000}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        Only you can see this note
                      </p>
                      <Button size="sm" onClick={() => sendReply(enq.id)} disabled={replying} className="h-8 text-xs">
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {replying ? "Saving..." : enq.status === "replied" ? "Update Note" : "Save Note"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnquiryInbox;
