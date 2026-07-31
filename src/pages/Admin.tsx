import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { notifyImageApproval } from "@/lib/notify-image-approval";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Listing } from "@/components/ListingCard";
import { getUserDisplayName, matchesUserSearch } from "@/lib/user-search";
import { BrandMark, BrandLockup } from "@/components/BrandLockup";
import CategoryManager from "@/components/admin/CategoryManager";
import { useCategoryCatalog } from "@/hooks/useCategoryCatalog";
// Nearbuy admin console — branded shell
import { summarizeHours } from "@/pages/BusinessDashboard";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Check, X, ExternalLink, FileText, Building2, Clock,
  Loader2, AlertTriangle, LayoutDashboard, Inbox, Settings,
  LogOut, Search, Bell, Eye, Store, Trash2, Edit3, Upload, Image,
  MessageSquare, Mail, Phone, Menu, MoreHorizontal,
  ChevronRight, Activity, Users, Database, TrendingUp, ArrowUpRight,
  ChevronDown, Filter, RefreshCw, Zap, Download, BarChart3,
  Globe, Server, Cpu, HardDrive, Wifi, Star, Target, Layers,
  PieChart, ArrowUp, ArrowDown, Sparkles, CheckSquare, Square, MapPin,
  Shield, ShieldOff, Ban, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

/* ═══════════════════════════════════════════════════════════
   ENTERPRISE ADMIN CONSOLE — Azure/GCP inspired
   ═══════════════════════════════════════════════════════════ */

/**
 * SubmittedDetails — read-only panel that surfaces EVERY field a business owner
 * filled in during sign-up (AddListing), so admins/super-admins can review the
 * whole application. The approval card and edit modal only edit a handful of
 * fields; this makes the rest (Instagram, website, WhatsApp message, secondary
 * contact, UEN, owner name, subcategories, service locations, compliance,
 * working hours, unit/postal) visible instead of silently hidden.
 */
export const SubmittedDetails = ({ listing }: { listing: Listing }) => {
  const l = listing as any;
  const cd = listing.contactDetails || {};

  const instagram = cd.instagram || l.instagramHandle || listing.instagramUrl || "";
  const website = cd.website || listing.website || l.websiteUrl || "";
  const whatsapp = cd.whatsapp || l.whatsappNumber || listing.phone || "";
  const whatsappMessage = cd.whatsappMessage || l.whatsappMessage || "";
  const secondary = cd.secondary && cd.secondary.value
    ? `${cd.secondary.method}: ${cd.secondary.value}` : "";
  const email = listing.contactEmail || listing.email || listing.ownerEmail || l.contactEmail || "";

  const igHref = instagram
    ? (instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace(/^@/, "")}`)
    : "";
  const siteHref = website ? (website.startsWith("http") ? website : `https://${website}`) : "";

  const serviceLocations: string[] = Array.isArray(l.serviceLocations) ? l.serviceLocations : [];
  const subcats: string[] = Array.isArray(listing.subcategoryList) ? listing.subcategoryList : [];
  const compliance: string[] = l.complianceChecks && typeof l.complianceChecks === "object"
    ? Object.entries(l.complianceChecks).filter(([, v]) => v).map(([k]) => k)
    : [];
  const addressFull = [
    listing.address,
    l.unitNumber,
    listing.postalCode && `Singapore ${listing.postalCode}`,
    listing.district,
  ].filter(Boolean).join(", ");

  let hoursSummary = "";
  const hoursObj = listing.operatingHours || l.workingHours;
  if (hoursObj && typeof hoursObj === "object") {
    try {
      hoursSummary = summarizeHours(hoursObj as any)
        .map((h: any) => `${h.label}: ${h.closed ? "Closed" : h.time}`)
        .join(" · ");
    } catch { hoursSummary = ""; }
  }

  const rows: { label: string; value: ReactNode }[] = [];
  const pushText = (label: string, value?: any) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      rows.push({ label, value: String(value) });
    }
  };
  const linkClass = "text-[hsl(220,70%,50%)] hover:underline break-all";

  pushText("Owner name", listing.ownerName);
  pushText("UEN", listing.uen);
  pushText("Full address", addressFull);
  pushText("Short description", l.shortDescription || l.shortDescriptor);
  pushText("Email", email);
  pushText("Primary contact", l.primaryContact);
  if (whatsapp) rows.push({ label: "WhatsApp", value: whatsappMessage ? `${whatsapp} — "${whatsappMessage}"` : whatsapp });
  if (instagram) rows.push({ label: "Instagram", value: <a href={igHref} target="_blank" rel="noopener noreferrer" className={linkClass}>{instagram}</a> });
  if (website) rows.push({ label: "Website", value: <a href={siteHref} target="_blank" rel="noopener noreferrer" className={linkClass}>{website}</a> });
  pushText("Secondary contact", secondary);
  if (subcats.length) pushText("Subcategories", subcats.join(", "));
  if (serviceLocations.length) pushText("Service locations", serviceLocations.join(", "));
  pushText("Travel area", l.travelArea);
  pushText("Working hours", hoursSummary);
  if (compliance.length) pushText("Compliance confirmed", compliance.join(", "));

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <FileText className="w-3 h-3" /> Submitted Details
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
        {rows.map((r) => (
          <div key={r.label} className="text-[11px] flex flex-col gap-0.5">
            <span className="font-semibold text-foreground/60 uppercase tracking-wide text-[9px]">{r.label}</span>
            <span className="text-foreground break-words">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

type AdminTab = "dashboard" | "listings" | "enquiries" | "users" | "categories" | "analytics" | "activity" | "settings";

interface AppUser {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  createdAt?: any;
  disabled?: boolean;
}
type EnquiryStatus = "unread" | "contacted" | "qualified" | "not_qualified" | "converted" | "spam";

const ENQUIRY_STATUSES: { key: EnquiryStatus; label: string; color: string; dot: string }[] = [
  { key: "unread", label: "New", color: "bg-[hsl(220,70%,93%)] text-[hsl(220,70%,35%)]", dot: "bg-[hsl(220,70%,50%)]" },
  { key: "contacted", label: "Contacted", color: "bg-[hsl(210,70%,92%)] text-[hsl(210,70%,40%)]", dot: "bg-[hsl(210,70%,50%)]" },
  { key: "qualified", label: "Qualified", color: "bg-[hsl(152,50%,92%)] text-[hsl(152,69%,35%)]", dot: "bg-[hsl(152,69%,40%)]" },
  { key: "not_qualified", label: "Not Qualified", color: "bg-[hsl(38,70%,92%)] text-[hsl(38,80%,35%)]", dot: "bg-[hsl(38,85%,50%)]" },
  { key: "converted", label: "Converted", color: "bg-[hsl(152,60%,88%)] text-[hsl(152,80%,28%)]", dot: "bg-[hsl(152,80%,35%)]" },
  { key: "spam", label: "Spam", color: "bg-[hsl(0,60%,94%)] text-[hsl(0,70%,45%)]", dot: "bg-[hsl(0,70%,50%)]" },
];

interface Enquiry {
  id: string; listingId: string; listingName: string;
  name: string; email: string; phone?: string; message: string;
  status: EnquiryStatus; createdAt: any;
}

/* ── Sidebar Nav Item ─────────────────────────────────────── */
const NavItem = ({ icon: Icon, label, active, badge, onClick }: {
  icon: any; label: string; active?: boolean; badge?: number; onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]
      ${active
        ? "bg-primary/[0.08] text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
  >
    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />}
    <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110 ${active ? "text-primary" : "text-muted-foreground"}`} />
    {label && <span className="flex-1 text-left">{label}</span>}
    {badge !== undefined && badge > 0 && (
      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors
        ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </button>
);

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════════════ */
const Admin = () => {
  const { user, isAdmin, isSuperAdmin, loading: authLoading, isDevMode, devLogout } = useAuth();
  const { categoryNames } = useCategoryCatalog();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [adminUids, setAdminUids] = useState<Set<string>>(new Set());
  const [superadminUids, setSuperadminUids] = useState<Set<string>>(new Set());
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [listingFilter, setListingFilter] = useState<"all" | "approved" | "pending_approval" | "rejected">("pending_approval");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [adminEditData, setAdminEditData] = useState<Record<string, any>>({});
  const [adminSaving, setAdminSaving] = useState(false);
  const [viewingImages, setViewingImages] = useState<{ listing: Listing } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [enquiryFilter, setEnquiryFilter] = useState<"all" | EnquiryStatus>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notifOpen, setNotifOpen] = useState(false);
  // Welcome note shown once per session in the notifications panel.
  const [welcomeSeen, setWelcomeSeen] = useState(() => {
    try { return sessionStorage.getItem("admin_welcome_seen") === "1"; } catch { return false; }
  });
  const dismissWelcome = () => {
    setWelcomeSeen(true);
    try { sessionStorage.setItem("admin_welcome_seen", "1"); } catch { /* ignore */ }
  };
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const prevEnquiryCountRef = useRef<number | null>(null);
  const prevPendingCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element for notification sound (Web Audio API beep)
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {}
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    }
  }, []);

  const sendBrowserNotif = useCallback((title: string, body: string) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: `${import.meta.env.BASE_URL}favicon.png`,
          badge: `${import.meta.env.BASE_URL}favicon.png`,
          tag: "admin-notif",
        });
      } catch {}
    }
  }, []);

  const [settings, setSettings] = useState({
    autoApprove: false,
    emailNotifications: true,
    documentRequired: true,
    whatsappPrefill: "Hi {{name}}, thanks for your enquiry about {{business}}. ",
  });


  const handleDeleteEnquiry = async (enquiryId: string) => {
    if (!confirm("Delete this enquiry permanently?")) return;
    setActionLoading(enquiryId);
    try {
      await deleteDoc(doc(db, "enquiries", enquiryId));
      setEnquiries((prev) => prev.filter((e) => e.id !== enquiryId));
      toast.success("Enquiry deleted");
    } catch { toast.error("Failed to delete enquiry"); }
    setActionLoading(null);
  };

  const getWhatsAppUrl = (enquiry: Enquiry) => {
    const phone = (enquiry.phone || "").replace(/[^0-9]/g, "");
    if (!phone) return null;
    const msg = settings.whatsappPrefill.replace("{{name}}", enquiry.name).replace("{{business}}", enquiry.listingName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleEnquiryStatus = async (enquiryId: string, newStatus: EnquiryStatus) => {
    try {
      await updateDoc(doc(db, "enquiries", enquiryId), { status: newStatus });
      setEnquiries((prev) => prev.map((e) => e.id === enquiryId ? { ...e, status: newStatus } : e));
      toast.success(`Marked as ${ENQUIRY_STATUSES.find(s => s.key === newStatus)?.label}`);
    } catch { toast.error("Failed to update status"); }
  };

  const handleDeleteSingleImage = async (listingId: string, imageIndex: number, field: "imageUrls" | "pendingImageUrls") => {
    const listing = allListings.find(l => l.id === listingId) || pendingListings.find(l => l.id === listingId);
    if (!listing) return;
    if (!confirm("Remove this image permanently?")) return;
    const images = [...(listing[field] || [])];
    images.splice(imageIndex, 1);
    try {
      await updateDoc(doc(db, "listings", listingId), { [field]: images });
      const updater = (l: Listing) => l.id === listingId ? { ...l, [field]: images } : l;
      setAllListings(prev => prev.map(updater));
      setPendingListings(prev => prev.map(updater));
      toast.success("Image removed");
    } catch { toast.error("Failed to remove image"); }
  };

  const handleApproveSinglePendingImage = async (listingId: string, imageIndex: number) => {
    const listing = allListings.find(l => l.id === listingId) || pendingListings.find(l => l.id === listingId);
    if (!listing) return;
    const pending = [...(listing.pendingImageUrls || [])];
    const approved = [...(listing.imageUrls || [])];
    const [img] = pending.splice(imageIndex, 1);
    approved.push(img);
    try {
      await updateDoc(doc(db, "listings", listingId), { imageUrls: approved, pendingImageUrls: pending });
      const updater = (l: Listing) => l.id === listingId ? { ...l, imageUrls: approved, pendingImageUrls: pending } : l;
      setAllListings(prev => prev.map(updater));
      setPendingListings(prev => prev.map(updater));
      toast.success("Image approved");
    } catch { toast.error("Failed to approve image"); }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) { navigate("/", { replace: true }); return; }
    if (!authLoading && user && isAdmin) fetchData();
  }, [authLoading, user, isAdmin]);

  const fetchData = async () => {
    // Never retain enquiry data in the Super Admin session.
    setEnquiries([]);
    try {
      const allSnap = await getDocs(collection(db, "listings"));
      const all = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
      setAllListings(all);
      setPendingListings(all.filter((l) => l.status === "pending_approval"));
      try {
        const uSnap = await getDocs(collection(db, "users"));
        setAppUsers(uSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser)));
      } catch {}
      try {
        const aSnap = await getDocs(collection(db, "admins"));
        setAdminUids(new Set(aSnap.docs.map((d) => d.id)));
      } catch {}
      try {
        const sSnap = await getDocs(collection(db, "superadmins"));
        setSuperadminUids(new Set(sSnap.docs.map((d) => d.id)));
      } catch {}
    } catch {
      setAllListings([]);
      setPendingListings([]);
    }
    setLoading(false);
  };

  // Request notification permission on mount
  useEffect(() => { requestNotifPermission(); }, [requestNotifPermission]);

  // Detect new enquiries/pending and alert
  useEffect(() => {
    const enquiryCount = enquiries.filter(e => e.status === "unread").length;
    const pendingCount = pendingListings.length;

    if (prevEnquiryCountRef.current !== null && enquiryCount > prevEnquiryCountRef.current) {
      const diff = enquiryCount - prevEnquiryCountRef.current;
      playNotifSound();
      sendBrowserNotif("New Enquiry", `${diff} new enquir${diff > 1 ? "ies" : "y"} received`);
      toast.info(`🔔 ${diff} new enquir${diff > 1 ? "ies" : "y"} received!`);
    }
    if (prevPendingCountRef.current !== null && pendingCount > prevPendingCountRef.current) {
      const diff = pendingCount - prevPendingCountRef.current;
      playNotifSound();
      sendBrowserNotif("New Listing", `${diff} listing${diff > 1 ? "s" : ""} pending approval`);
      toast.info(`🔔 ${diff} new listing${diff > 1 ? "s" : ""} pending review!`);
    }

    prevEnquiryCountRef.current = enquiryCount;
    prevPendingCountRef.current = pendingCount;
  }, [enquiries, pendingListings, playNotifSound, sendBrowserNotif]);

  // Auto-refresh every 30s to detect new data
  useEffect(() => {
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const listing = allListings.find(l => l.id === id);
      const updates: Record<string, any> = { status: "approved", rejectionReason: "", previousApproved: {} };
      if (listing?.pendingLogoUrl) { updates.logoUrl = listing.pendingLogoUrl; updates.pendingLogoUrl = ""; }
      if (listing?.pendingImageUrls && listing.pendingImageUrls.length > 0) { updates.imageUrls = listing.pendingImageUrls; updates.pendingImageUrls = []; }
      await updateDoc(doc(db, "listings", id), updates);
      setPendingListings((prev) => prev.filter((l) => l.id !== id));
      setAllListings((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
      toast.success("Listing approved");
    } catch (e: any) {
      console.error("Approve failed:", e);
      toast.error(
        e?.code === "permission-denied"
          ? "Approve blocked by permissions — confirm you're signed in as an admin and the latest Firestore rules are deployed."
          : `Failed to approve: ${e?.message || e}`
      );
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) { toast.error("Please provide a reason"); return; }
    setActionLoading(rejectingId);
    try {
      await updateDoc(doc(db, "listings", rejectingId), { status: "rejected", rejectionReason: rejectionReason.trim() });
      setPendingListings((prev) => prev.filter((l) => l.id !== rejectingId));
      setAllListings((prev) => prev.map((l) => l.id === rejectingId ? { ...l, status: "rejected" } : l));
      toast.success("Listing rejected");
    } catch (e: any) {
      console.error("Reject failed:", e);
      toast.error(
        e?.code === "permission-denied"
          ? "Action blocked by permissions — confirm admin access and that Firestore rules are deployed."
          : `Failed to reject: ${e?.message || e}`
      );
    }
    setActionLoading(null); setRejectingId(null); setRejectionReason("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing permanently? This cannot be undone.")) return;
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "listings", id));
      setAllListings((prev) => prev.filter((l) => l.id !== id));
      setPendingListings((prev) => prev.filter((l) => l.id !== id));
      toast.success("Listing deleted");
    } catch { toast.error("Failed to delete"); }
    setActionLoading(null);
  };

  // ── Super-admin user management ──────────────────────────────
  const toggleDisabled = async (u: AppUser) => {
    const next = !u.disabled;
    if (next && !confirm(`Disable ${u.email || "this user"}? They'll be signed out and blocked from logging in.`)) return;
    setUserActionLoading(u.id);
    try {
      await updateDoc(doc(db, "users", u.id), { disabled: next });
      setAppUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, disabled: next } : x));
      toast.success(next ? "User disabled" : "User enabled");
    } catch (e: any) {
      toast.error(e?.code === "permission-denied" ? "Only super admins can do this." : "Failed to update user");
    }
    setUserActionLoading(null);
  };

  const toggleAdmin = async (u: AppUser) => {
    const isAdminNow = adminUids.has(u.id);
    if (!confirm(isAdminNow ? `Remove admin access from ${u.email || "this user"}?` : `Make ${u.email || "this user"} an admin?`)) return;
    setUserActionLoading(u.id);
    try {
      if (isAdminNow) {
        await deleteDoc(doc(db, "admins", u.id));
        setAdminUids((prev) => { const n = new Set(prev); n.delete(u.id); return n; });
        toast.success("Admin access removed");
      } else {
        await setDoc(doc(db, "admins", u.id), {
          email: u.email || "",
          grantedBy: user?.email || user?.uid || "",
          grantedAt: serverTimestamp(),
        });
        setAdminUids((prev) => new Set(prev).add(u.id));
        toast.success("User is now an admin");
      }
    } catch (e: any) {
      toast.error(e?.code === "permission-denied" ? "Only super admins can do this." : "Failed to update admin access");
    }
    setUserActionLoading(null);
  };

  const toggleSuperAdmin = async (u: AppUser) => {
    const isSuperNow = superadminUids.has(u.id);
    if (!confirm(isSuperNow
      ? `Remove super-admin access from ${u.email || "this user"}?`
      : `Make ${u.email || "this user"} a SUPER ADMIN? They'll have full control, including managing other admins.`)) return;
    setUserActionLoading(u.id);
    try {
      if (isSuperNow) {
        await deleteDoc(doc(db, "superadmins", u.id));
        setSuperadminUids((prev) => { const n = new Set(prev); n.delete(u.id); return n; });
        toast.success("Super-admin access removed");
      } else {
        await setDoc(doc(db, "superadmins", u.id), {
          email: u.email || "",
          grantedBy: user?.email || user?.uid || "",
          grantedAt: serverTimestamp(),
        });
        setSuperadminUids((prev) => new Set(prev).add(u.id));
        toast.success("User is now a super admin");
      }
    } catch (e: any) {
      toast.error(e?.code === "permission-denied" ? "Only super admins can do this. Make sure the latest Firestore rules are deployed." : "Failed to update super-admin access");
    }
    setUserActionLoading(null);
  };

  const openAdminEdit = (listing: Listing) => {
    setEditingListing(listing);
    setAdminEditData({
      name: listing.name, category: listing.category, district: listing.district,
      address: listing.address,
      phone: listing.phone || listing.contactDetails?.whatsapp || "",
      email: listing.email || listing.contactEmail || "",
      ownerEmail: listing.ownerEmail || "",
      website: listing.website || listing.contactDetails?.website || "",
      description: listing.description || "",
      imageUrls: listing.imageUrls || [], logoUrl: listing.logoUrl || "", status: listing.status,
    });
  };

  const saveAdminEdit = async () => {
    if (!editingListing) return;
    setAdminSaving(true);
    try {
      const updates = { ...adminEditData, previousApproved: {} };
      // 1. Update listing document
      await updateDoc(doc(db, "listings", editingListing.id), updates);

      // 2. Synchronize contact details only when the owner profile exists.
      // Admins can update another user's profile but cannot create it, so a
      // missing profile must not make a successful listing edit look failed.
      if (editingListing.ownerId) {
        try {
          const ownerRef = doc(db, "users", editingListing.ownerId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            await updateDoc(ownerRef, {
              email: adminEditData.email || "",
              phone: adminEditData.phone || "",
            });

            setAppUsers(prev => prev.map(u => u.id === editingListing.ownerId ? {
              ...u,
              email: adminEditData.email || u.email,
              phone: adminEditData.phone || u.phone
            } : u));
          }
        } catch (profileError) {
          // The listing is already saved. Profile sync is secondary and must
          // not roll back or misreport the primary edit.
          console.warn("owner profile sync skipped", profileError);
        }
      }

      setAllListings(prev => prev.map(l => l.id === editingListing.id ? { ...l, ...updates } : l));
      setPendingListings(prev => prev.filter(l => l.id !== editingListing.id || updates.status === "pending_approval")
        .map(l => l.id === editingListing.id ? { ...l, ...updates } : l));
      setEditingListing(null);
      toast.success("Listing updated by admin");
    } catch (error: any) {
      console.error("admin listing update failed", error);
      toast.error(error?.code === "permission-denied"
        ? "Permission denied. Confirm the latest Firestore rules are deployed."
        : error?.message || "Failed to update listing");
    }
    setAdminSaving(false);
  };

  // ── Computed ──
  const stats = useMemo(() => ({
    total: allListings.length,
    pending: pendingListings.length,
    approved: allListings.filter((l) => l.status === "approved").length,
    rejected: allListings.filter((l) => l.status === "rejected").length,
    enquiries: enquiries.length,
    unreadEnquiries: enquiries.filter((e) => e.status === "unread").length,
  }), [allListings, pendingListings, enquiries]);

  const filteredAllListings = useMemo(() => {
    return allListings.filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || (l.postalCode && l.postalCode.includes(searchQuery.trim())) || (l.district && l.district.toLowerCase().includes(q)) || (l.address && l.address.toLowerCase().includes(q));
      const matchFilter = listingFilter === "all" || l.status === listingFilter;
      return matchSearch && matchFilter;
    });
  }, [allListings, searchQuery, listingFilter]);

  const filteredPending = pendingListings.filter((l) => {
    const q = searchQuery.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) || (l.postalCode && l.postalCode.includes(searchQuery.trim())) || (l.district && l.district.toLowerCase().includes(q));
  });

  const activeViewingListing = useMemo(() => {
    if (!viewingImages) return null;
    return allListings.find(l => l.id === viewingImages.listing.id) || pendingListings.find(l => l.id === viewingImages.listing.id) || null;
  }, [viewingImages, allListings, pendingListings]);

  const filteredEnquiries = enquiries.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(q) || e.listingName.toLowerCase().includes(q) || (e.phone && e.phone.includes(searchQuery.trim()));
    const matchFilter = enquiryFilter === "all" || e.status === enquiryFilter;
    return matchSearch && matchFilter;
  });

  // User directory search — match by name, email, or mobile number
  const userName = getUserDisplayName;
  const filteredUsers = useMemo(
    () => (searchQuery.trim() ? appUsers.filter((u) => matchesUserSearch(u, searchQuery)) : appUsers),
    [appUsers, searchQuery],
  );

  const isSearching = searchQuery.trim().length > 0;

  // Global search — the header search box previously only filtered whichever
  // tab you happened to be on (so searching an approved business from the
  // Dashboard, which only lists pending items, looked broken). This searches
  // every admin dataset at once, ignoring per-tab status filters.
  const globalResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return { listings: [] as Listing[], users: [] as AppUser[], total: 0 };
    const q = raw.toLowerCase();

    // allListings should already contain everything, but merge pending defensively.
    const byId = new Map<string, Listing>();
    [...allListings, ...pendingListings].forEach((l) => byId.set(l.id, l));
    const has = (v: unknown) => typeof v === "string" && v.toLowerCase().includes(q);

    const listings = [...byId.values()].filter((l) => {
      const a = l as any;
      return has(l.name) || has(l.category) || has(l.district) || has(l.address) || has(l.uen)
        || has(a.ownerName) || has(a.ownerEmail) || has(a.email) || has(a.contactEmail)
        || has(a.phone) || has(a.contactDetails?.whatsapp) || has(a.contactDetails?.instagram)
        || (!!l.postalCode && l.postalCode.includes(raw));
    });

    const users = appUsers.filter((u) => matchesUserSearch(u, raw));

    return { listings, users, total: listings.length + users.length };
  }, [searchQuery, allListings, pendingListings, appUsers]);

  const notifications = useMemo(() => {
    const items: { id: string; icon: any; text: string; time: string; color: string; action?: () => void }[] = [];
    if (!welcomeSeen) {
      const adminName = user?.displayName?.split(" ")[0] || "";
      const pendingCount = stats.pending;
      items.push({
        id: "n-welcome",
        icon: Sparkles,
        text: `Welcome back${adminName ? `, ${adminName}` : ""}! 👋 ${pendingCount > 0 ? `You have ${pendingCount} item${pendingCount > 1 ? "s" : ""} to review.` : "You're all caught up."}`,
        time: "Just now",
        color: "hsl(152,69%,40%)",
        action: () => { dismissWelcome(); setActiveTab("dashboard"); setNotifOpen(false); },
      });
    }
    if (stats.pending > 0) items.push({ id: "n-pending", icon: Clock, text: `${stats.pending} listing${stats.pending > 1 ? "s" : ""} awaiting approval`, time: "Action required", color: "hsl(38,85%,50%)", action: () => { setActiveTab("dashboard"); setNotifOpen(false); } });
    if (stats.unreadEnquiries > 0) items.push({ id: "n-unread", icon: MessageSquare, text: `${stats.unreadEnquiries} new enquir${stats.unreadEnquiries > 1 ? "ies" : "y"} received`, time: "Unread", color: "hsl(220,70%,50%)", action: () => { setActiveTab("enquiries"); setEnquiryFilter("unread"); setNotifOpen(false); } });
    pendingListings.filter(l => l.pendingLogoUrl).forEach(l => items.push({ id: `n-logo-${l.id}`, icon: Image, text: `${l.name} uploaded a new logo`, time: "Needs review", color: "hsl(280,60%,55%)", action: () => { setActiveTab("dashboard"); setNotifOpen(false); } }));
    pendingListings.filter(l => l.pendingImageUrls && l.pendingImageUrls.length > 0).forEach(l => items.push({ id: `n-img-${l.id}`, icon: Image, text: `${l.name} uploaded ${l.pendingImageUrls!.length} new photo${l.pendingImageUrls!.length > 1 ? "s" : ""}`, time: "Needs review", color: "hsl(200,70%,50%)", action: () => { setActiveTab("dashboard"); setNotifOpen(false); } }));
    pendingListings.filter(l => (l as any).previousApproved && Object.keys((l as any).previousApproved).length > 0).forEach(l => items.push({ id: `n-edit-${l.id}`, icon: Edit3, text: `${l.name} edited ${Object.keys((l as any).previousApproved).length} field(s)`, time: "Review changes", color: "hsl(354,70%,54%)", action: () => { setActiveTab("dashboard"); setNotifOpen(false); } }));
    enquiries.filter(e => e.status === "unread").slice(0, 5).forEach(e => items.push({ id: `n-enq-${e.id}`, icon: Mail, text: `${e.name} enquired about ${e.listingName}`, time: e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : "Recently", color: "hsl(152,69%,40%)", action: () => { setActiveTab("enquiries"); setNotifOpen(false); } }));
    return items;
  }, [stats, pendingListings, enquiries, welcomeSeen, user]);

  const enquiryStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enquiries.length };
    ENQUIRY_STATUSES.forEach(s => { counts[s.key] = enquiries.filter(e => e.status === s.key).length; });
    return counts;
  }, [enquiries]);

  // ── Computed analytics ──
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    allListings.forEach(l => { map[l.category] = (map[l.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [allListings]);

  const districtBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    allListings.forEach(l => { if (l.district) map[l.district] = (map[l.district] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allListings]);

  const topListings = useMemo(() =>
    [...allListings].filter(l => l.status === "approved").sort((a, b) => ((b as any).viewCount || 0) - ((a as any).viewCount || 0)).slice(0, 5),
  [allListings]);

  const activityLog = useMemo(() => {
    const items: { id: string; type: string; icon: any; text: string; time: string; color: string }[] = [];
    pendingListings.slice(0, 3).forEach(l => items.push({
      id: `p-${l.id}`, type: "pending", icon: Clock,
      text: `${l.name} submitted for review`,
      time: "Pending",
      color: "hsl(38,85%,50%)",
    }));
    return items.slice(0, 8);
  }, [pendingListings]);

  const enquiryConversion = useMemo(() => {
    const total = enquiries.length || 1;
    return {
      contacted: Math.round((enquiries.filter(e => e.status === "contacted").length / total) * 100),
      qualified: Math.round((enquiries.filter(e => e.status === "qualified").length / total) * 100),
      converted: Math.round((enquiries.filter(e => e.status === "converted").length / total) * 100),
    };
  }, [enquiries]);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAllListings.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredAllListings.map(l => l.id)));
  };
  const handleBulkApprove = async () => {
    for (const id of selectedIds) { await handleApprove(id); }
    setSelectedIds(new Set());
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} listing(s) permanently?`)) return;
    for (const id of selectedIds) { await handleDelete(id); }
    setSelectedIds(new Set());
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} records to ${filename}`);
  };

  const exportListings = () => {
    const headers = ["Name", "Category", "District", "Status", "Phone", "Email", "Address", "Verified", "Featured"];
    const rows = filteredAllListings.map(l => [
      l.name, l.category, l.district || "", l.status || "", l.phone || "", l.email || "",
      l.address || "", l.verified ? "Yes" : "No", l.featured ? "Yes" : "No",
    ]);
    downloadCSV(`listings_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const exportEnquiries = () => {
    const headers = ["Name", "Email", "Phone", "Business", "Message", "Status", "Date"];
    const rows = filteredEnquiries.map(e => [
      e.name, e.email, e.phone || "", e.listingName, e.message, e.status,
      e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : "",
    ]);
    downloadCSV(`enquiries_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,15%,97%)]">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(220,70%,50%)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════
         SIDEBAR — Clean modern white sidebar
         ══════════════════════════════════════════════════════ */}
      <aside className={`hidden md:flex flex-col bg-card border-r border-foreground/[0.06] shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-[68px]" : "w-[240px]"}`}>
        {/* Logo area */}
        <div className={`h-14 flex items-center border-b border-foreground/[0.06] gap-2.5 bg-gradient-to-b from-primary/[0.05] to-transparent ${sidebarCollapsed ? "px-0 justify-center" : "px-4"}`}>
          {sidebarCollapsed ? (
            <div className="w-8 h-8 rounded-[10px] bg-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(31,58,46,0.18)] ring-1 ring-black/5">
              <BrandMark className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <BrandLockup subtitle="Control Center" />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {!sidebarCollapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mb-2">Overview</p>}
          <NavItem icon={LayoutDashboard} label={sidebarCollapsed ? "" : "Dashboard"} active={activeTab === "dashboard"} badge={stats.pending} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={Building2} label={sidebarCollapsed ? "" : "All Listings"} active={activeTab === "listings"} badge={stats.total} onClick={() => setActiveTab("listings")} />
          
          {!sidebarCollapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mt-5 mb-2">People</p>}
          <NavItem icon={Users} label={sidebarCollapsed ? "" : "Users"} active={activeTab === "users"} badge={appUsers.length} onClick={() => setActiveTab("users")} />

          {!sidebarCollapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mt-5 mb-2">Insights</p>}
          <NavItem icon={BarChart3} label={sidebarCollapsed ? "" : "Analytics"} active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")} />
          <NavItem icon={Activity} label={sidebarCollapsed ? "" : "Activity Log"} active={activeTab === "activity"} onClick={() => setActiveTab("activity")} />

          {!sidebarCollapsed && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 mt-5 mb-2">System</p>}
          {isSuperAdmin && (
            <NavItem icon={Layers} label={sidebarCollapsed ? "" : "Categories"} active={activeTab === "categories"} onClick={() => setActiveTab("categories")} />
          )}
          <NavItem icon={Settings} label={sidebarCollapsed ? "" : "Settings"} active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-foreground/[0.06]">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2 rounded-xl bg-secondary/40 border border-foreground/[0.04]">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" title="Online" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate leading-tight">{user?.displayName || user?.email?.split("@")[0] || "Admin"}</p>
                <span className="inline-flex items-center mt-1 text-[8.5px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={async () => { if (isDevMode) devLogout(); else await signOut(auth); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-semibold text-destructive hover:bg-destructive/5 transition"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-foreground/[0.06] flex items-center px-3 h-14 shadow-sm">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors active:scale-95">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm ring-1 ring-black/5">
            <BrandMark className="w-[18px] h-[18px] text-primary" />
          </div>
          <span className="font-extrabold text-sm text-foreground tracking-tight">Nearbuy</span>
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.5 rounded">Admin</span>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[280px] h-full bg-card flex flex-col py-5 px-4 shadow-2xl">
            <div className="flex items-center gap-2.5 mb-6 px-2">
              <BrandLockup chip="w-9 h-9" mark="w-[22px] h-[22px]" subtitle="Control Center" />
            </div>
            <div className="space-y-1">
              {([
                { tab: "dashboard" as const, icon: LayoutDashboard, label: "Dashboard", badge: stats.pending },
                { tab: "listings" as const, icon: Building2, label: "All Listings", badge: stats.total },
                { tab: "users" as const, icon: Users, label: "Users", badge: appUsers.length },
                { tab: "analytics" as const, icon: BarChart3, label: "Analytics" },
                { tab: "activity" as const, icon: Activity, label: "Activity Log" },
                ...(isSuperAdmin ? [{ tab: "categories" as const, icon: Layers, label: "Categories" }] : []),
                { tab: "settings" as const, icon: Settings, label: "Settings" },
              ]).map((item) => (
                <NavItem key={item.tab} icon={item.icon} label={item.label} active={activeTab === item.tab} badge={item.badge}
                  onClick={() => { setActiveTab(item.tab); setMobileMenuOpen(false); }} />
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-[hsl(220,15%,92%)]">
              <button onClick={async () => { if (isDevMode) devLogout(); else await signOut(auth); navigate("/"); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-[hsl(0,60%,50%)] hover:bg-[hsl(0,60%,97%)] transition">
                <LogOut className="w-[18px] h-[18px]" /><span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
         MAIN CONTENT
         ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 md:pt-0 pt-14">

        {/* ── Top command bar ── */}
        <header className="sticky top-0 z-30 bg-card border-b border-foreground/[0.06] px-4 md:px-6 py-2.5 md:py-0 md:h-14 flex flex-wrap md:flex-nowrap items-center gap-x-2 gap-y-2.5 md:gap-4 shadow-sm shadow-black/[0.01]">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-foreground">
              {{ dashboard: "Dashboard", listings: "Listings", enquiries: "Enquiries", users: "Users", categories: "Categories", analytics: "Analytics", activity: "Activity Log", settings: "Settings" }[activeTab]}
            </h1>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {stats.pending} pending
              </span>
            )}
          </div>

          <div className="relative order-last basis-full md:basis-auto md:flex-1 max-w-full md:max-w-md ml-0 md:ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search businesses and users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground border border-foreground/[0.06] focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-200"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            <Button variant="outline" size="sm" onClick={exportListings} className="h-8 px-2.5 lg:px-4 rounded-xl text-xs border-foreground/[0.08] text-muted-foreground hover:bg-secondary" title="Export CSV">
              <Download className="w-3.5 h-3.5 lg:mr-1.5" /><span className="hidden lg:inline">Export CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} className="h-8 px-2.5 lg:px-4 rounded-xl text-xs border-foreground/[0.08] text-muted-foreground hover:bg-secondary" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 lg:mr-1.5" /><span className="hidden lg:inline">Refresh</span>
            </Button>
            <div className="w-px h-6 bg-foreground/[0.08] mx-0.5 md:mx-1" />
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center transition">
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="fixed left-3 right-3 top-[104px] w-auto md:absolute md:left-auto md:right-0 md:top-11 md:w-[380px] z-50 bg-card rounded-2xl border border-foreground/[0.06] shadow-xl overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-foreground/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                        {notifications.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">{notifications.length}</span>
                        )}
                      </div>
                      <button onClick={() => setNotifOpen(false)} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-10">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm font-semibold text-foreground">All clear!</p>
                          <p className="text-xs text-muted-foreground mt-0.5">No new notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-foreground/[0.04]">
                          {notifications.map((n) => (
                            <button key={n.id} onClick={n.action} className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors text-left">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${n.color}12` }}>
                                <n.icon className="w-4 h-4" style={{ color: n.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] text-foreground leading-snug">{n.text}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{n.time}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/45 shrink-0 mt-1" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative pl-3 ml-1 border-l border-foreground/[0.08]">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)} 
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all focus:outline-none"
              >
                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-45" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-10.5 z-50 w-[240px] bg-card rounded-2xl border border-foreground/[0.06] shadow-xl py-2 overflow-hidden animate-fade-in text-left">
                    <div className="px-4 py-2.5 border-b border-foreground/[0.06] mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{user?.displayName || "Admin User"}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email || "admin@nearbuy.sg"}</p>
                      <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                        Super Admin
                      </span>
                    </div>

                    <button 
                      onClick={() => { navigate("/"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>View Main Website</span>
                    </button>

                    <button 
                      onClick={() => { setActiveTab("dashboard"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Dashboard</span>
                    </button>

                    <button 
                      onClick={() => { setActiveTab("settings"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>System Settings</span>
                    </button>

                    <div className="h-px bg-foreground/[0.06] my-1" />

                    <button 
                      onClick={async () => { 
                        setUserMenuOpen(false); 
                        if (isDevMode) devLogout(); 
                        else await signOut(auth); 
                        navigate("/"); 
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {/* ═══ GLOBAL SEARCH RESULTS ════════════════════════ */}
          {isSearching && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-foreground">Search results</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {globalResults.total} match{globalResults.total !== 1 ? "es" : ""} for “{searchQuery.trim()}” across listings and users
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="h-8 px-3 rounded-xl text-xs border-foreground/[0.08]">
                  <X className="w-3.5 h-3.5 mr-1.5" />Clear search
                </Button>
              </div>

              {globalResults.total === 0 ? (
                <div className="rounded-2xl border border-dashed border-foreground/[0.12] p-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-bold text-foreground text-sm">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">Nothing in listings or users matches “{searchQuery.trim()}”.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Listings */}
                  {globalResults.listings.length > 0 && (
                    <div className="rounded-2xl border border-foreground/[0.06] bg-card overflow-hidden">
                      <div className="px-5 py-3 border-b border-foreground/[0.06] bg-secondary/30 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Businesses ({globalResults.listings.length})</span>
                      </div>
                      <div className="divide-y divide-foreground/[0.04]">
                        {globalResults.listings.map((l) => {
                          const s = { approved: "text-emerald-600 bg-emerald-500/10", pending_approval: "text-amber-600 bg-amber-500/10", rejected: "text-rose-600 bg-rose-500/10" }[l.status] || "text-muted-foreground bg-secondary";
                          return (
                            <button key={l.id} onClick={() => openAdminEdit(l)} className="w-full text-left px-5 py-3 hover:bg-secondary/20 transition-colors flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-foreground/[0.06]">
                                {l.logoUrl ? <img src={l.logoUrl} alt="" className="w-full h-full object-cover" /> : <Store className="w-4 h-4 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">{l.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{l.category} · {l.district || l.address}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${s}`}>{l.status === "pending_approval" ? "Pending" : l.status === "approved" ? "Live" : "Rejected"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Users */}
                  {globalResults.users.length > 0 && (
                    <div className="rounded-2xl border border-foreground/[0.06] bg-card overflow-hidden">
                      <div className="px-5 py-3 border-b border-foreground/[0.06] bg-secondary/30 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Users ({globalResults.users.length})</span>
                      </div>
                      <div className="divide-y divide-foreground/[0.04]">
                        {globalResults.users.map((u) => (
                          <button key={u.id} onClick={() => setActiveTab("users")} className="w-full text-left px-5 py-3 hover:bg-secondary/20 transition-colors flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold uppercase">
                              {(userName(u) || u.email || "U").slice(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{userName(u) || "—"}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

          {/* ═══ DASHBOARD ════════════════════════════════════ */}
          {!isSearching && activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Listing administration summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  { icon: Building2, label: "Total Listings", value: stats.total, accent: "text-primary", bg: "bg-primary/5", trend: "+12%" },
                  { icon: Clock, label: "Pending Review", value: stats.pending, accent: "text-amber-500", bg: "bg-amber-500/5", trend: null },
                  { icon: Check, label: "Approved", value: stats.approved, accent: "text-emerald-500", bg: "bg-emerald-500/5", trend: "+8%" },
                  { icon: X, label: "Rejected", value: stats.rejected, accent: "text-rose-500", bg: "bg-rose-500/5", trend: null },
                ] as const).map((s) => (
                  <div key={s.label} className="relative bg-card rounded-2xl border border-foreground/[0.06] p-5 overflow-hidden hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        <p className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">{s.value}</p>
                        {s.trend && (
                          <div className="flex items-center gap-1 mt-1">
                            <ArrowUp className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600">{s.trend}</span>
                          </div>
                        )}
                      </div>
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${s.bg}`}>
                        <s.icon className={`w-5 h-5 ${s.accent}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions + Platform Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Quick Actions */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-5">
                    {[
                      { icon: Check, label: "Approve All Pending", color: "text-emerald-500", bg: "bg-emerald-500/5", action: () => { pendingListings.forEach(l => handleApprove(l.id)); } },
                      { icon: Download, label: "Export All Data", color: "text-primary", bg: "bg-primary/5", action: exportListings },
                      { icon: RefreshCw, label: "Refresh Data", color: "text-sky-500", bg: "bg-sky-500/5", action: fetchData },
                    ].map((a) => (
                      <button key={a.label} onClick={a.action}
                        className="flex items-center gap-3 p-4 rounded-2xl border border-foreground/[0.06] hover:border-primary/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 text-left group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.bg}`}>
                          <a.icon className={`w-4 h-4 ${a.color}`} />
                        </div>
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Health */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">Platform Health</h3>
                    <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />All Systems Operational
                    </span>
                  </div>
                  <div className="p-5 space-y-3.5">
                    {[
                      { icon: Globe, label: "Website", status: "Operational", uptime: "99.9%", color: "bg-emerald-500" },
                      { icon: Database, label: "Firestore DB", status: "Operational", uptime: "99.8%", color: "bg-emerald-500" },
                      { icon: HardDrive, label: "Storage", status: "Operational", uptime: "100%", color: "bg-emerald-500" },
                      { icon: Wifi, label: "API Gateway", status: "Operational", uptime: "99.7%", color: "bg-emerald-500" },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between py-1 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <s.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-medium text-muted-foreground">{s.uptime} uptime</span>
                          <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Breakdown + Top Listings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <PieChart className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-bold text-foreground">By Category</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                    ) : categoryBreakdown.map(([cat, count], i) => {
                      const max = categoryBreakdown[0][1];
                      const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-sky-500", "bg-teal-500", "bg-pink-500"];
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground truncate flex-1">{cat}</span>
                            <span className="text-[11px] font-bold text-foreground tabular-nums ml-2">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`} style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Listings Leaderboard */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">Top Listings</h3>
                  </div>
                  <div className="divide-y divide-foreground/[0.04]">
                    {topListings.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">No approved listings</p>
                    ) : topListings.map((l, i) => (
                      <div key={l.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          i === 0 ? "bg-amber-100 text-amber-800" : i === 1 ? "bg-slate-100 text-slate-700" : "bg-secondary text-muted-foreground"
                        }`}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{l.name}</p>
                          <p className="text-[10px] text-muted-foreground">{l.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-foreground tabular-nums">{((l as any).viewCount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Pending Queue */}
              <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="px-6 py-4.5 border-b border-foreground/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Pending Review</h3>
                      <p className="text-[11px] text-muted-foreground">{filteredPending.length} listing{filteredPending.length !== 1 ? "s" : ""} awaiting approval</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab("listings")} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="font-bold text-foreground text-sm">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No pending listings to review</p>
                  </div>
                ) : (
                  <div className="divide-y divide-foreground/[0.04]">
                    {filteredPending.map((listing) => {
                      const changeCount = (listing as any).previousApproved ? Object.keys((listing as any).previousApproved).length : 0;
                      return (
                        <div key={listing.id} className="p-5 hover:bg-secondary/15 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-foreground/[0.06]">
                              {listing.logoUrl ? (
                                <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <h4 className="font-bold text-sm text-foreground truncate">{listing.name}</h4>
                                <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px] px-2 py-0.5 rounded-lg font-bold">Pending</Badge>
                                {changeCount > 0 && (
                                  <Badge className="bg-purple-500/10 text-purple-600 border-0 text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                                    <Edit3 className="w-2.5 h-2.5" />
                                    {changeCount} changed
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{listing.address}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                                <span className="font-semibold">{listing.category}</span>
                                <span className="text-foreground/20">·</span>
                                <span>{listing.district}</span>
                                {(listing.phone || listing.contactDetails?.whatsapp) && (
                                  <><span className="text-foreground/20">·</span>
                                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{listing.phone || listing.contactDetails?.whatsapp}</span></>
                                )}
                                {(listing.ownerEmail || listing.contactEmail || listing.email) && (
                                  <><span className="text-foreground/20">·</span>
                                  <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail className="w-3 h-3" />{listing.ownerEmail || listing.contactEmail || listing.email}</span></>
                                )}
                              </div>

                              {/* Highlighted Modifications */}
                              {changeCount > 0 && listing.previousApproved && (
                                <div className="mt-3 bg-amber-50/40 border border-amber-200/50 rounded-xl p-3.5 space-y-3">
                                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <Edit3 className="w-3 h-3 text-amber-600" /> Changed Fields Highlight
                                  </p>
                                  <div className="divide-y divide-amber-100/50 space-y-2.5">
                                    {Object.entries(listing.previousApproved).map(([field, oldVal]) => {
                                      const newVal = (listing as any)[field];
                                      
                                      // Format values for human readability
                                      let formattedOld = String(oldVal || "—");
                                      let formattedNew = String(newVal || "—");
                                      
                                      if (field === "operatingHours") {
                                        const formatHoursObj = (h: any) => {
                                          if (!h) return "—";
                                          try {
                                            return summarizeHours(h)
                                              .map(item => `${item.label}: ${item.closed ? "Closed" : item.time}`)
                                              .join(", ");
                                          } catch {
                                            return JSON.stringify(h);
                                          }
                                        };
                                        formattedOld = formatHoursObj(oldVal);
                                        formattedNew = formatHoursObj(newVal);
                                      }

                                      if (formattedOld === formattedNew) return null;

                                      const fieldLabels: Record<string, string> = {
                                        name: "Business Name",
                                        category: "Category",
                                        district: "District",
                                        address: "Address",
                                        phone: "Phone Number",
                                        website: "Website URL",
                                        email: "Email Address",
                                        description: "Description",
                                        customSlug: "Custom URL Slug",
                                        operatingHours: "Operating Hours"
                                      };
                                      const label = fieldLabels[field] || field;

                                      return (
                                        <div key={field} className="pt-2.5 first:pt-0 text-[11px] grid grid-cols-1 md:grid-cols-12 gap-2">
                                          <span className="md:col-span-3 font-semibold text-amber-900">{label}</span>
                                          <div className="md:col-span-9 space-y-1">
                                            <div className="flex items-start gap-1 bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100/70 line-through decoration-red-400">
                                              <span className="font-semibold text-[9px] uppercase tracking-wider text-red-500/80 mt-0.5 mr-1 shrink-0">Old:</span>
                                              <span className="break-all">{formattedOld}</span>
                                            </div>
                                            <div className="flex items-start gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-100/70 font-medium">
                                              <span className="font-semibold text-[9px] uppercase tracking-wider text-emerald-600 mt-0.5 mr-1 shrink-0">New:</span>
                                              <span className="break-all">{formattedNew}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Images */}
                          {listing.imageUrls && listing.imageUrls.length > 0 && (
                            <div className="mt-3 ml-14">
                              <p className="text-[10px] font-semibold text-[hsl(220,10%,55%)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Image className="w-3 h-3" />Current Images ({listing.imageUrls.length})
                              </p>
                              <div className="flex gap-1.5 overflow-x-auto">
                                {listing.imageUrls.map((url, i) => (
                                  <div key={i} className="relative group shrink-0">
                                    <img src={url} alt={`${listing.name} ${i + 1}`} onClick={() => setPreviewImage(url)}
                                      className="w-14 h-14 rounded-lg object-cover border border-[hsl(220,15%,88%)] cursor-zoom-in hover:opacity-90 transition" />
                                    <button onClick={() => handleDeleteSingleImage(listing.id, i, "imageUrls")}
                                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[hsl(354,70%,54%)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                      title="Delete"><X className="w-3 h-3" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pending Logo */}
                          {listing.pendingLogoUrl && (
                            <div className="mt-3 ml-14">
                              <p className="text-[10px] font-semibold text-[hsl(38,85%,40%)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />Pending Logo
                              </p>
                              <div className="flex items-center gap-3">
                                <img src={listing.pendingLogoUrl} alt="Pending logo" className="w-14 h-14 rounded-lg object-cover border-2 border-[hsl(38,85%,60%)] shrink-0" />
                                <div className="flex gap-1.5">
                                  <Button size="sm" onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, "listings", listing.id), { logoUrl: listing.pendingLogoUrl, pendingLogoUrl: "" });
                                      setAllListings(prev => prev.map(l => l.id === listing.id ? { ...l, logoUrl: listing.pendingLogoUrl, pendingLogoUrl: "" } : l));
                                      setPendingListings(prev => prev.map(l => l.id === listing.id ? { ...l, logoUrl: listing.pendingLogoUrl, pendingLogoUrl: "" } : l));
                                      if (listing.email || listing.ownerId) notifyImageApproval({ type: "image_approved", recipientEmail: listing.email || "", recipientName: listing.name, businessName: listing.name, imageType: "logo", listingId: listing.id, ownerId: listing.ownerId || "" }).catch(() => {});
                                      toast.success("Logo approved");
                                    } catch { toast.error("Failed to approve logo"); }
                                  }} className="bg-[hsl(152,69%,40%)] hover:bg-[hsl(152,69%,35%)] text-white text-[10px] h-7 px-2 rounded-lg">
                                    <Check className="w-3 h-3 mr-1" />Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, "listings", listing.id), { pendingLogoUrl: "" });
                                      setAllListings(prev => prev.map(l => l.id === listing.id ? { ...l, pendingLogoUrl: "" } : l));
                                      setPendingListings(prev => prev.map(l => l.id === listing.id ? { ...l, pendingLogoUrl: "" } : l));
                                      if (listing.email || listing.ownerId) notifyImageApproval({ type: "image_rejected", recipientEmail: listing.email || "", recipientName: listing.name, businessName: listing.name, imageType: "logo", listingId: listing.id, ownerId: listing.ownerId || "" }).catch(() => {});
                                      toast.success("Logo rejected");
                                    } catch { toast.error("Failed"); }
                                  }} className="border-[hsl(354,50%,80%)] text-[hsl(354,70%,50%)] text-[10px] h-7 px-2 rounded-lg">
                                    <X className="w-3 h-3 mr-1" />Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pending Images */}
                          {listing.pendingImageUrls && listing.pendingImageUrls.length > 0 && (
                            <div className="mt-3 ml-14">
                              <p className="text-[10px] font-semibold text-[hsl(38,85%,40%)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />Pending Images ({listing.pendingImageUrls.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto">
                                {listing.pendingImageUrls.map((url, i) => (
                                  <div key={i} className="relative shrink-0 group">
                                    <img src={url} alt={`Pending ${i + 1}`} onClick={() => setPreviewImage(url)}
                                      className="w-14 h-14 rounded-lg object-cover border-2 border-[hsl(38,85%,60%)] cursor-zoom-in hover:opacity-90 transition" />
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleApproveSinglePendingImage(listing.id, i)} className="w-5 h-5 rounded-full bg-[hsl(152,69%,40%)] text-white flex items-center justify-center shadow-md"><Check className="w-3 h-3" /></button>
                                      <button onClick={() => handleDeleteSingleImage(listing.id, i, "pendingImageUrls")} className="w-5 h-5 rounded-full bg-[hsl(354,70%,54%)] text-white flex items-center justify-center shadow-md"><X className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-1.5 mt-2">
                                <Button size="sm" onClick={async () => {
                                  try {
                                    const merged = [...(listing.imageUrls || []), ...(listing.pendingImageUrls || [])];
                                    await updateDoc(doc(db, "listings", listing.id), { imageUrls: merged, pendingImageUrls: [] });
                                    const updater = (l: Listing) => l.id === listing.id ? { ...l, imageUrls: merged, pendingImageUrls: [] } : l;
                                    setAllListings(prev => prev.map(updater));
                                    setPendingListings(prev => prev.map(updater));
                                    if (listing.email || listing.ownerId) notifyImageApproval({ type: "image_approved", recipientEmail: listing.email || "", recipientName: listing.name, businessName: listing.name, imageType: "photos", listingId: listing.id, ownerId: listing.ownerId || "" }).catch(() => {});
                                    toast.success("All images approved");
                                  } catch { toast.error("Failed"); }
                                }} className="bg-[hsl(152,69%,40%)] hover:bg-[hsl(152,69%,35%)] text-white text-[10px] h-7 px-2 rounded-lg">
                                  <Check className="w-3 h-3 mr-1" />Approve All
                                </Button>
                                <Button size="sm" variant="outline" onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, "listings", listing.id), { pendingImageUrls: [] });
                                    const updater = (l: Listing) => l.id === listing.id ? { ...l, pendingImageUrls: [] } : l;
                                    setAllListings(prev => prev.map(updater));
                                    setPendingListings(prev => prev.map(updater));
                                    if (listing.email || listing.ownerId) notifyImageApproval({ type: "image_rejected", recipientEmail: listing.email || "", recipientName: listing.name, businessName: listing.name, imageType: "photos", listingId: listing.id, ownerId: listing.ownerId || "" }).catch(() => {});
                                    toast.success("All pending images rejected");
                                  } catch { toast.error("Failed"); }
                                }} className="border-[hsl(354,50%,80%)] text-[hsl(354,70%,50%)] text-[10px] h-7 px-2 rounded-lg">
                                  <X className="w-3 h-3 mr-1" />Reject All
                                </Button>
                              </div>
                            </div>
                          )}

                          {listing.description && (
                            <p className="text-xs text-[hsl(220,10%,55%)] mt-2 line-clamp-2 ml-14">{listing.description}</p>
                          )}

                          {/* Full customer-submitted application data */}
                          <div className="mt-3 ml-14">
                            <SubmittedDetails listing={listing} />
                          </div>

                          {/* Changed Fields Highlight */}
                          {(listing as any).previousApproved && Object.keys((listing as any).previousApproved).length > 0 && (
                            <div className="mt-3 ml-14 rounded-lg border border-[hsl(38,85%,80%)] bg-[hsl(38,90%,98%)] p-3">
                              <p className="text-[10px] font-semibold text-[hsl(38,85%,35%)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" />
                                {Object.keys((listing as any).previousApproved).length} Field{Object.keys((listing as any).previousApproved).length !== 1 ? "s" : ""} Modified
                              </p>
                              <div className="space-y-1.5">
                                {Object.entries((listing as any).previousApproved).map(([field, oldValue]) => {
                                  const newValue = (listing as any)[field];
                                  const label = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, " $1");
                                  const oldStr = typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue || "—");
                                  const newStr = typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue || "—");
                                  if (field === "operatingHours") {
                                    const oldGroups = oldValue && typeof oldValue === "object" ? summarizeHours(oldValue as any) : [];
                                    const newGroups = newValue && typeof newValue === "object" ? summarizeHours(newValue as any) : [];
                                    return (
                                      <div key={field} className="text-[11px]">
                                        <span className="font-semibold text-[hsl(220,15%,20%)]">{label}:</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                          <div className="rounded-md bg-[hsl(354,70%,96%)] p-2 space-y-0.5">
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[hsl(354,70%,45%)] mb-1">Before</p>
                                            {oldGroups.map((g, i) => (
                                              <div key={i} className="flex items-center justify-between text-[10px]">
                                                <span className="text-[hsl(354,70%,35%)] line-through">{g.label}</span>
                                                <span className={`tabular-nums line-through ${g.closed ? "text-destructive" : "text-[hsl(354,70%,35%)]"}`}>{g.time}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="rounded-md bg-[hsl(152,50%,93%)] p-2 space-y-0.5">
                                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[hsl(152,69%,30%)] mb-1">After</p>
                                            {newGroups.map((g, i) => (
                                              <div key={i} className="flex items-center justify-between text-[10px]">
                                                <span className="font-medium text-[hsl(152,69%,25%)]">{g.label}</span>
                                                <span className={`tabular-nums font-semibold ${g.closed ? "text-destructive" : "text-[hsl(152,69%,25%)]"}`}>{g.time}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={field} className="text-[11px]">
                                      <span className="font-semibold text-[hsl(220,15%,20%)]">{label}:</span>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 mt-0.5">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[hsl(354,70%,96%)] text-[hsl(354,70%,45%)] line-through text-[10px] max-w-[200px] truncate">{oldStr}</span>
                                        <ChevronRight className="w-3 h-3 text-[hsl(220,10%,60%)] hidden sm:block shrink-0" />
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[hsl(152,50%,93%)] text-[hsl(152,69%,30%)] font-medium text-[10px] max-w-[200px] truncate">{newStr}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {listing.documentsUrl && listing.documentsUrl.length > 0 && (
                            <div className="flex gap-1.5 mt-2 ml-14 flex-wrap">
                              {listing.documentsUrl.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-[hsl(220,70%,50%)] hover:underline bg-[hsl(220,70%,97%)] px-2 py-1 rounded-md">
                                  <FileText className="w-3 h-3" />Doc {i + 1}<ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-3 ml-14 pt-3 border-t border-border/50">
                            <Button size="sm" onClick={() => handleApprove(listing.id)} disabled={actionLoading === listing.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8 px-3">
                              {actionLoading === listing.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRejectingId(listing.id); setRejectionReason(""); }} disabled={actionLoading === listing.id}
                              className="border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl text-xs h-8 px-3">
                              <X className="w-3.5 h-3.5 mr-1" />Reject
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAdminEdit(listing)}
                              className="rounded-xl text-xs h-8 px-3">
                              <Edit3 className="w-3.5 h-3.5 mr-1" />Edit
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ ALL LISTINGS ═════════════════════════════════ */}
          {!isSearching && activeTab === "listings" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-foreground">All Listings</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">{stats.total} total listings on the platform</p>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: "all", label: "All", count: allListings.length },
                  { key: "approved", label: "Live", count: stats.approved },
                  { key: "pending_approval", label: "Pending", count: stats.pending },
                  { key: "rejected", label: "Rejected", count: stats.rejected },
                ] as const).map((f) => (
                  <button key={f.key} onClick={() => setListingFilter(f.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border
                      ${listingFilter === f.key
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/10"
                        : "bg-card text-muted-foreground border-foreground/[0.08] hover:bg-secondary hover:text-foreground"
                      }`}>
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>

              {/* Bulk Actions Bar */}
              {selectedIds.size > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary">{selectedIds.size} selected</span>
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-3 rounded-xl">
                      <Check className="w-3 h-3 mr-1" />Approve All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBulkDelete} className="border-destructive/20 text-destructive text-[11px] h-7 px-3 rounded-xl hover:bg-destructive/5">
                      <Trash2 className="w-3 h-3 mr-1" />Delete All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-[11px] h-7 px-2 hover:bg-secondary">Clear</Button>
                  </div>
                </div>
              )}

              {/* Listings table */}
              {loading ? (
                <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredAllListings.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-foreground/[0.06]">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground text-sm">No listings found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="bg-card border border-foreground/[0.06] rounded-2xl overflow-hidden shadow-sm shadow-black/[0.01]">
                  {/* Table header */}
                  <div className="grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 px-5 py-3 border-b border-foreground/[0.06] bg-secondary/35">
                    <button onClick={toggleSelectAll} className="w-5 h-5 rounded-md border border-foreground/[0.12] flex items-center justify-center hover:bg-secondary transition-all">
                      {selectedIds.size === filteredAllListings.length && filteredAllListings.length > 0 ? <Check className="w-3 h-3 text-primary" /> : null}
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Business</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden sm:block">Category</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden sm:block">Status</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 text-right">Actions</span>
                  </div>
                  <div className="divide-y divide-foreground/[0.04]">
                    {filteredAllListings.map((l) => {
                      const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                        approved: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Live" },
                        pending_approval: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Pending" },
                        rejected: { bg: "bg-rose-500/10", text: "text-rose-600", label: "Rejected" },
                      };
                      const s = statusMap[l.status] || statusMap.approved;
                      return (
                        <div key={l.id} className={`grid grid-cols-[32px_1fr_120px_100px_80px] gap-3 items-center px-5 py-3.5 hover:bg-secondary/15 transition-colors ${selectedIds.has(l.id) ? "bg-primary/[0.02]" : ""}`}>
                          <button onClick={() => toggleSelect(l.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedIds.has(l.id) ? "bg-primary border-primary" : "border-foreground/[0.12] hover:bg-secondary"}`}>
                            {selectedIds.has(l.id) && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-foreground/[0.06]">
                              {l.logoUrl ? (
                                <img
                                  src={l.logoUrl}
                                  alt={l.name}
                                  className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition"
                                  onClick={() => setPreviewImage(l.logoUrl)}
                                />
                              ) : (
                                <Store className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{l.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{l.district}</p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground hidden sm:block truncate">{l.category}</span>
                          <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold w-fit ${s.bg} ${s.text}`}>{s.label}</span>
                          <div className="flex items-center gap-1 justify-end">
                            {l.imageUrls && l.imageUrls.length > 0 && (
                              <button onClick={() => setViewingImages({ listing: l })} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition" title="View images">
                                <Image className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}
                            <button onClick={() => openAdminEdit(l)} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition" title="Edit">
                              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(l.id)} disabled={actionLoading === l.id}
                              className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition animate-fade-in" title="Delete">
                              {actionLoading === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ ENQUIRIES ════════════════════════════════════ */}
          {!isSearching && activeTab === "enquiries" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-foreground">Enquiries</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{stats.unreadEnquiries} new · {stats.enquiries} total</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[{ key: "all" as const, label: "All" }, ...ENQUIRY_STATUSES].map((f) => (
                  <button key={f.key} onClick={() => setEnquiryFilter(f.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border
                      ${enquiryFilter === f.key
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/10"
                        : "bg-card text-muted-foreground border-foreground/[0.08] hover:bg-secondary"
                      }`}>
                    {f.label} ({enquiryStatusCounts[f.key] || 0})
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredEnquiries.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-foreground/[0.06]">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground text-sm">No enquiries found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filter</p>
                </div>
              ) : (
                <div className="bg-card border border-foreground/[0.06] rounded-2xl overflow-hidden divide-y divide-foreground/[0.04]">
                  {filteredEnquiries.map((e) => {
                    const statusInfo = ENQUIRY_STATUSES.find(s => s.key === e.status) || ENQUIRY_STATUSES[0];
                    return (
                      <div key={e.id} className="flex items-start gap-3 px-5 py-4 hover:bg-secondary/15 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                          {e.name[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-bold text-sm text-foreground">{e.name}</p>
                            <select
                              value={e.status}
                              onChange={(ev) => handleEnquiryStatus(e.id, ev.target.value as EnquiryStatus)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border-0 cursor-pointer outline-none ${statusInfo.color}`}
                            >
                              {ENQUIRY_STATUSES.map(s => (<option key={s.key} value={s.key}>{s.label}</option>))}
                            </select>
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-1">{e.listingName}</p>
                          {e.phone && <p className="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{e.phone}</p>}
                          <p className="text-xs text-foreground/80 line-clamp-2">{e.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(() => {
                            const waUrl = getWhatsAppUrl(e);
                            return waUrl ? (
                              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg hover:bg-emerald-500/10 flex items-center justify-center transition" title="Reply via WhatsApp">
                                <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                              </a>
                            ) : null;
                          })()}
                          {e.email && (
                            <a href={`mailto:${e.email}`} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition" title="Email">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                          <button onClick={() => handleDeleteEnquiry(e.id)} disabled={actionLoading === e.id}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition" title="Delete">
                            {actionLoading === e.id ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ ANALYTICS ══════════════════════════════════ */}
          {!isSearching && activeTab === "analytics" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h1 className="text-lg font-bold text-foreground">Analytics</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Platform performance insights and data breakdown</p>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Approval Rate", value: `${stats.total ? Math.round((stats.approved / stats.total) * 100) : 0}%`, sub: "of total listings", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/5" },
                  { label: "Pending Rate", value: `${stats.total ? Math.round((stats.pending / stats.total) * 100) : 0}%`, sub: "awaiting review", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/5" },
                  { label: "Categories", value: categoryBreakdown.length, sub: "active categories", icon: Layers, color: "text-purple-500", bg: "bg-purple-500/5" },
                  { label: "Districts", value: districtBreakdown.length, sub: "areas represented", icon: MapPin, color: "text-sky-500", bg: "bg-sky-500/5" },
                ].map((k) => (
                  <div key={k.label} className="bg-card rounded-2xl border border-foreground/[0.06] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${k.bg}`}>
                        <k.icon className={`w-4 h-4 ${k.color}`} />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{k.label}</span>
                    </div>
                    <p className="text-3xl font-extrabold text-foreground tabular-nums tracking-tight">{k.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Category + District breakdown side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Category */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-bold text-foreground">Listings by Category</h3>
                  </div>
                  <div className="p-5 space-y-3.5">
                    {categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-center py-8 text-muted-foreground">No data</p>
                    ) : categoryBreakdown.map(([cat, count], i) => {
                      const max = categoryBreakdown[0][1];
                      const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-sky-500", "bg-teal-500", "bg-pink-500"];
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                          <span className="text-xs font-semibold text-foreground flex-1 truncate">{cat}</span>
                          <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-foreground tabular-nums w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* District */}
                <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="px-5 py-4 border-b border-foreground/[0.06] flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-sky-500" />
                    <h3 className="text-sm font-bold text-foreground">Listings by District</h3>
                  </div>
                  <div className="p-5 space-y-3.5">
                    {districtBreakdown.length === 0 ? (
                      <p className="text-xs text-center py-8 text-muted-foreground">No data</p>
                    ) : districtBreakdown.map(([dist, count], i) => {
                      const max = districtBreakdown[0][1];
                      return (
                        <div key={dist} className="flex items-center gap-3">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-semibold text-foreground flex-1 truncate">{dist}</span>
                          <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden shrink-0">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-foreground tabular-nums w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ═══ ACTIVITY LOG ═════════════════════════════════ */}
          {!isSearching && activeTab === "activity" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-foreground">Activity Log</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Recent platform events and actions</p>
              </div>

              <div className="bg-card rounded-2xl border border-foreground/[0.06] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                {activityLog.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="font-medium text-[hsl(220,15%,15%)] text-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[hsl(220,15%,94%)]">
                    {activityLog.map((item, i) => (
                      <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[hsl(220,20%,99%)] transition-colors">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                            <item.icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          {i < activityLog.length - 1 && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-[hsl(220,15%,90%)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-[hsl(220,15%,20%)]">{item.text}</p>
                          <p className="text-[11px] text-[hsl(220,10%,55%)] mt-0.5">{item.time}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.type === "enquiry" ? "bg-[hsl(220,70%,95%)] text-[hsl(220,70%,40%)]" : "bg-[hsl(38,90%,93%)] text-[hsl(38,85%,35%)]"
                        }`}>
                          {item.type === "enquiry" ? "Enquiry" : "Listing"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ USERS ═══════════════════════════════════════ */}
          {!isSearching && activeTab === "users" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-[hsl(220,15%,15%)]">Registered Users</h1>
                  <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">
                    {searchQuery.trim()
                      ? `${filteredUsers.length} of ${appUsers.length} user${appUsers.length !== 1 ? "s" : ""} match "${searchQuery.trim()}"`
                      : `${appUsers.length} user${appUsers.length !== 1 ? "s" : ""} registered`}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-lg" onClick={() => {
                  const rows = searchQuery.trim() ? filteredUsers : appUsers;
                  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
                  const csv = ["Name,Email,Mobile,Registered"].concat(rows.map(u => [
                    esc(userName(u)), esc(u.email || ""), esc(u.phone || ""),
                    esc(u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : ""),
                  ].join(","))).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`${rows.length} user${rows.length !== 1 ? "s" : ""} exported`);
                }}>
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
              </div>

              <div className="bg-white border border-[hsl(220,15%,90%)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(220,15%,93%)] bg-[hsl(220,20%,97%)]">
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">#</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Name</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Email</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Mobile Number</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Registered</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Role</th>
                        {isSuperAdmin && <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,10%,50%)]">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(220,15%,94%)]">
                      {appUsers.length === 0 ? (
                        <tr><td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-10 text-[hsl(220,10%,55%)] text-sm">No registered users yet</td></tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-10 text-[hsl(220,10%,55%)] text-sm">No users match “{searchQuery.trim()}”</td></tr>
                      ) : filteredUsers.map((u, i) => (
                        <tr key={u.id} className="hover:bg-[hsl(220,20%,98%)] transition-colors">
                          <td className="px-4 py-3 text-[hsl(220,10%,55%)] text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${userName(u) ? "text-[hsl(220,15%,20%)]" : "text-[hsl(220,10%,60%)]"}`}>{userName(u) || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-[hsl(220,70%,50%)]" />
                              <span className="text-[hsl(220,15%,20%)]">{u.email || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-[hsl(152,69%,40%)]" />
                              <span className="text-[hsl(220,15%,20%)] font-medium">{u.phone || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[hsl(220,10%,55%)]">
                            {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {superadminUids.has(u.id) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[hsl(280,60%,95%)] text-[hsl(280,60%,42%)] text-[10px] font-bold">
                                  <Star className="w-3 h-3" /> Super Admin
                                </span>
                              ) : adminUids.has(u.id) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[hsl(220,70%,95%)] text-[hsl(220,70%,40%)] text-[10px] font-bold">
                                  <Shield className="w-3 h-3" /> Admin
                                </span>
                              ) : (
                                <span className="text-xs text-[hsl(220,10%,55%)]">User</span>
                              )}
                              {u.disabled && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[hsl(0,70%,95%)] text-[hsl(0,70%,45%)] text-[10px] font-bold">
                                  <Ban className="w-3 h-3" /> Disabled
                                </span>
                              )}
                            </div>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              {u.id === user?.uid ? (
                                <span className="block text-right text-[11px] text-[hsl(220,10%,60%)]">You</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  <button
                                    onClick={() => toggleAdmin(u)}
                                    disabled={userActionLoading === u.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[hsl(220,15%,88%)] text-[11px] font-semibold text-[hsl(220,15%,30%)] hover:bg-[hsl(220,20%,97%)] disabled:opacity-50 transition"
                                    title={adminUids.has(u.id) ? "Remove admin access" : "Make admin"}
                                  >
                                    {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : adminUids.has(u.id) ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                                    {adminUids.has(u.id) ? "Remove admin" : "Make admin"}
                                  </button>
                                  <button
                                    onClick={() => toggleSuperAdmin(u)}
                                    disabled={userActionLoading === u.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50 transition border border-[hsl(280,40%,82%)] text-[hsl(280,50%,42%)] hover:bg-[hsl(280,50%,97%)]"
                                    title={superadminUids.has(u.id) ? "Remove super-admin access" : "Make super admin"}
                                  >
                                    {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                                    {superadminUids.has(u.id) ? "Remove super" : "Make super"}
                                  </button>
                                  <button
                                    onClick={() => toggleDisabled(u)}
                                    disabled={userActionLoading === u.id}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-50 transition ${
                                      u.disabled
                                        ? "border border-[hsl(152,50%,80%)] text-[hsl(152,69%,32%)] hover:bg-[hsl(152,50%,96%)]"
                                        : "border border-[hsl(0,60%,85%)] text-[hsl(0,70%,45%)] hover:bg-[hsl(0,60%,97%)]"
                                    }`}
                                    title={u.disabled ? "Enable user" : "Disable user"}
                                  >
                                    {userActionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : u.disabled ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                    {u.disabled ? "Enable" : "Disable"}
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ CATEGORY MANAGEMENT — SUPER ADMIN ONLY ═══════ */}
          {!isSearching && activeTab === "categories" && isSuperAdmin && user && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl">
              <div>
                <h1 className="text-lg font-semibold text-[hsl(220,15%,15%)]">Categories</h1>
                <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">Add or edit listing categories and subcategories</p>
              </div>
              <CategoryManager userId={user.uid} />
            </motion.div>
          )}

          {/* ═══ SETTINGS ═════════════════════════════════════ */}
          {!isSearching && activeTab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-2xl">
              <div>
                <h1 className="text-lg font-semibold text-[hsl(220,15%,15%)]">Settings</h1>
                <p className="text-xs text-[hsl(220,10%,55%)] mt-0.5">Configure platform-wide preferences</p>
              </div>

              <div className="bg-white border border-[hsl(220,15%,90%)] rounded-xl overflow-hidden divide-y divide-[hsl(220,15%,94%)]">
                {[
                  { key: "autoApprove" as const, label: "Auto-approve listings", desc: "Automatically approve new listings without manual review", icon: Zap },
                  { key: "emailNotifications" as const, label: "Email notifications", desc: "Send email alerts for new listings and approval activity", icon: Mail },
                  { key: "documentRequired" as const, label: "Require documents", desc: "Require ACRA business profile upload during listing submission", icon: FileText },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[hsl(220,15%,97%)] flex items-center justify-center">
                        <s.icon className="w-4 h-4 text-[hsl(220,10%,45%)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(220,15%,15%)]">{s.label}</p>
                        <p className="text-[11px] text-[hsl(220,10%,55%)] mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                    <Switch checked={settings[s.key]} onCheckedChange={() => setSettings((prev) => ({ ...prev, [s.key]: !prev[s.key] }))} />
                  </div>
                ))}

                {/* Browser Push Notifications */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(220,15%,97%)] flex items-center justify-center">
                      <Bell className="w-4 h-4 text-[hsl(220,10%,45%)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(220,15%,15%)]">Browser push notifications</p>
                      <p className="text-[11px] text-[hsl(220,10%,55%)] mt-0.5">
                        {notifPermission === "granted" ? "Enabled — you'll receive alerts for new listings and approval activity" :
                         notifPermission === "denied" ? "Blocked — enable in browser settings" :
                         "Click to enable desktop alerts"}
                      </p>
                    </div>
                  </div>
                  {notifPermission === "granted" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(152,50%,93%)] text-[hsl(152,69%,35%)] text-[11px] font-semibold">
                      <Check className="w-3 h-3" />Active
                    </span>
                  ) : notifPermission === "denied" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(354,70%,95%)] text-[hsl(354,70%,45%)] text-[11px] font-semibold">
                      <X className="w-3 h-3" />Blocked
                    </span>
                  ) : (
                    <Button size="sm" onClick={requestNotifPermission} className="bg-[hsl(220,70%,50%)] hover:bg-[hsl(220,70%,45%)] text-white rounded-lg text-xs h-8">
                      <Bell className="w-3.5 h-3.5 mr-1.5" />Enable
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[hsl(220,15%,90%)] rounded-xl px-5 py-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(152,50%,95%)] flex items-center justify-center">
                    <WhatsAppIcon className="w-4 h-4 text-[hsl(152,69%,40%)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(220,15%,15%)]">WhatsApp Quick Reply</h3>
                    <p className="text-[11px] text-[hsl(220,10%,55%)]">
                      Use <code className="px-1 py-0.5 bg-[hsl(220,15%,96%)] rounded text-[10px]">{"{{name}}"}</code> and <code className="px-1 py-0.5 bg-[hsl(220,15%,96%)] rounded text-[10px]">{"{{business}}"}</code>
                    </p>
                  </div>
                </div>
                <Textarea value={settings.whatsappPrefill} onChange={(e) => setSettings((prev) => ({ ...prev, whatsappPrefill: e.target.value }))}
                  rows={3} className="rounded-lg text-sm border-[hsl(220,15%,88%)]" />
              </div>

              <div className="bg-white border border-[hsl(220,15%,90%)] rounded-xl px-5 py-4">
                <h3 className="text-sm font-semibold text-[hsl(220,15%,15%)] mb-3">Account</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(220,10%,50%)]">Email</span>
                    <span className="text-sm font-medium text-[hsl(220,15%,15%)]">{user?.email || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[hsl(220,10%,50%)]">Role</span>
                    <Badge className="bg-[hsl(220,70%,95%)] text-[hsl(220,70%,40%)] border-0 text-xs font-semibold">Super Admin</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* ── Rejection Dialog ── */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => { if (!open) { setRejectingId(null); setRejectionReason(""); } }}>
        <DialogContent className="sm:max-w-md rounded-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[hsl(220,15%,15%)]">
              <div className="w-8 h-8 rounded-lg bg-[hsl(354,70%,95%)] flex items-center justify-center">
                <X className="w-4 h-4 text-[hsl(354,70%,50%)]" />
              </div>
              Reject Listing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-[hsl(220,10%,50%)]">Please provide a reason. This will be visible to the business owner.</p>
            <div className="space-y-2">
              <Label className="text-[hsl(220,15%,15%)] text-xs font-medium">Rejection Reason *</Label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Missing ACRA business profile document..." rows={3} className="rounded-lg border-[hsl(220,15%,88%)]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectingId(null); setRejectionReason(""); }} className="rounded-lg border-[hsl(220,15%,85%)]">Cancel</Button>
            <Button onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading === rejectingId}
              className="bg-[hsl(354,70%,54%)] hover:bg-[hsl(354,70%,48%)] text-white rounded-lg">
              {actionLoading === rejectingId ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Edit Dialog ── */}
      <Dialog open={!!editingListing} onOpenChange={(open) => { if (!open) setEditingListing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[hsl(220,15%,15%)]">
              <div className="w-8 h-8 rounded-lg bg-[hsl(220,70%,95%)] flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-[hsl(220,70%,50%)]" />
              </div>
              Edit Listing
            </DialogTitle>
          </DialogHeader>
          {editingListing && (() => {
            const hasChanged = (field: string) => {
              return editingListing.previousApproved && field in editingListing.previousApproved;
            };
            return (
              <div className="space-y-4 py-2">
                {editingListing.previousApproved && Object.keys(editingListing.previousApproved).length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[13px]">Pending Owner Modifications</p>
                      <p className="text-[11px] text-amber-700/90 mt-0.5">The owner has submitted edits. Modified fields are highlighted in gold with their original values listed for reference.</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[hsl(220,15%,15%)] text-xs font-medium">Business Name</Label>
                    {hasChanged("name") && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                    )}
                  </div>
                  <Input value={adminEditData.name || ""} onChange={e => setAdminEditData(prev => ({ ...prev, name: e.target.value }))}
                    className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("name") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                  {hasChanged("name") && (
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                      <span className="font-medium text-red-500/90">Original:</span>
                      <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.name || "—")}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Category</Label>
                      {hasChanged("category") && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                      )}
                    </div>
                    <Select
                      value={adminEditData.category || ""}
                      onValueChange={category => setAdminEditData(prev => ({ ...prev, category }))}
                    >
                      <SelectTrigger className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("category") ? "border-amber-400 focus:ring-amber-500 bg-amber-50/5" : ""}`}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryNames.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanged("category") && (
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                        <span className="font-medium text-red-500/90">Original:</span>
                        <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.category || "—")}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">District</Label>
                      {hasChanged("district") && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                      )}
                    </div>
                    <Input value={adminEditData.district || ""} onChange={e => setAdminEditData(prev => ({ ...prev, district: e.target.value }))}
                      className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("district") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                    {hasChanged("district") && (
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                        <span className="font-medium text-red-500/90">Original:</span>
                        <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.district || "—")}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Address</Label>
                    {hasChanged("address") && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                    )}
                  </div>
                  <Input value={adminEditData.address || ""} onChange={e => setAdminEditData(prev => ({ ...prev, address: e.target.value }))}
                    className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("address") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                  {hasChanged("address") && (
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                      <span className="font-medium text-red-500/90">Original:</span>
                      <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.address || "—")}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Phone</Label>
                      {hasChanged("phone") && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                      )}
                    </div>
                    <Input value={adminEditData.phone || ""} onChange={e => setAdminEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("phone") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                    {hasChanged("phone") && (
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                        <span className="font-medium text-red-500/90">Original:</span>
                        <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.phone || "—")}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Email</Label>
                      {hasChanged("email") && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                      )}
                    </div>
                    <Input value={adminEditData.email || ""} onChange={e => setAdminEditData(prev => ({ ...prev, email: e.target.value }))}
                      className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("email") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                    {hasChanged("email") && (
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                        <span className="font-medium text-red-500/90">Original:</span>
                        <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.email || "—")}</span>
                      </p>
                    )}
                  </div>
                </div>

                {adminEditData.ownerEmail && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Owner Registration Email</Label>
                    <Input value={adminEditData.ownerEmail} readOnly className="rounded-lg border-[hsl(220,15%,88%)] bg-[hsl(220,20%,97%)] text-[hsl(220,10%,45%)]" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Website</Label>
                    {hasChanged("website") && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                    )}
                  </div>
                  <Input value={adminEditData.website || ""} onChange={e => setAdminEditData(prev => ({ ...prev, website: e.target.value }))}
                    className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("website") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                  {hasChanged("website") && (
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                      <span className="font-medium text-red-500/90">Original:</span>
                      <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.website || "—")}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Description</Label>
                    {hasChanged("description") && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 font-medium">Modified</Badge>
                    )}
                  </div>
                  <Textarea value={adminEditData.description || ""} onChange={e => setAdminEditData(prev => ({ ...prev, description: e.target.value }))} rows={3}
                    className={`rounded-lg border-[hsl(220,15%,88%)] ${hasChanged("description") ? "border-amber-400 focus-visible:ring-amber-500 bg-amber-50/5" : ""}`} />
                  {hasChanged("description") && (
                    <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5 px-1">
                      <span className="font-medium text-red-500/90">Original:</span>
                      <span className="line-through text-muted-foreground/80">{String(editingListing.previousApproved.description || "—")}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[hsl(220,15%,15%)]">Status</Label>
                  <select value={adminEditData.status || "pending_approval"} onChange={e => setAdminEditData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-lg border border-[hsl(220,15%,88%)] bg-white px-3 py-2 text-sm text-[hsl(220,15%,15%)]">
                    <option value="approved">Approved (Live)</option>
                    <option value="pending_approval">Pending Review</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {editingListing.documentsUrl && editingListing.documentsUrl.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-[hsl(220,15%,92%)]">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Documents</Label>
                    <div className="space-y-1.5">
                      {editingListing.documentsUrl.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-[hsl(220,70%,50%)] hover:underline bg-[hsl(220,70%,98%)] px-3 py-2 rounded-lg">
                          <FileText className="w-4 h-4 shrink-0" /><span className="truncate flex-1">{url}</span><ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {adminEditData.imageUrls && adminEditData.imageUrls.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-[hsl(220,15%,92%)]">
                    <Label className="text-xs font-medium text-[hsl(220,15%,15%)] flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Images ({adminEditData.imageUrls.length})</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(adminEditData.imageUrls as string[]).map((url, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[hsl(220,15%,90%)]">
                          <img src={url} alt={`Image ${i + 1}`} onClick={() => setPreviewImage(url)} className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition" />
                          <button onClick={() => setAdminEditData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_: string, idx: number) => idx !== i) }))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[hsl(354,70%,54%)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[hsl(220,15%,92%)]">
                  <SubmittedDetails listing={editingListing} />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingListing(null)} className="rounded-lg border-[hsl(220,15%,85%)]">Cancel</Button>
                  <Button onClick={saveAdminEdit} disabled={adminSaving}
                    className="bg-[hsl(220,70%,50%)] hover:bg-[hsl(220,70%,45%)] text-white rounded-lg">
                    {adminSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Image Viewer ── */}
      <Dialog open={!!viewingImages} onOpenChange={(open) => { if (!open) setViewingImages(null); }}>
        <DialogContent className="sm:max-w-lg rounded-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[hsl(220,15%,15%)]">
              <Image className="w-5 h-5 text-[hsl(220,70%,50%)]" />{activeViewingListing?.name || viewingImages?.listing.name} — Images
            </DialogTitle>
          </DialogHeader>
          {activeViewingListing && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
              {(activeViewingListing.imageUrls || []).map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[hsl(220,15%,90%)]">
                  <img src={url} alt={`Image ${i + 1}`} onClick={() => setPreviewImage(url)}
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition" />
                  <button onClick={() => handleDeleteSingleImage(activeViewingListing.id, i, "imageUrls")}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[hsl(354,70%,54%)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-[hsl(354,70%,48%)]"
                    title="Remove Image">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(activeViewingListing.imageUrls || []).length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  No images uploaded for this business.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Full-Screen Preview ── */}
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 bg-black/95 border-none rounded-2xl overflow-hidden [&>button:last-child]:hidden" aria-describedby={undefined}>
          <div className="relative flex items-center justify-center min-h-[50vh] sm:min-h-[70vh]">
            {previewImage && <img src={previewImage} alt="Preview" className="w-full max-h-[85vh] object-contain cursor-zoom-out" onClick={() => setPreviewImage(null)} />}
            <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 flex items-center justify-center transition-colors z-10"
              onClick={() => setPreviewImage(null)}><X className="w-5 h-5" /></button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
