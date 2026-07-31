import { useState } from "react";
import { collection, addDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SINGAPORE_DISTRICTS } from "@/lib/districts";
import { Listing } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, Check, MapPin } from "lucide-react";
import { toast } from "sonner";
import { geocodeSingaporePostalCode, formatSgAddress } from "@/lib/geocode-pincode";
import { useCategoryCatalog } from "@/hooks/useCategoryCatalog";

interface AdminAddBusinessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (listing: Listing) => void;
  adminUserId: string;
}

const AdminAddBusiness = ({ open, onOpenChange, onCreated, adminUserId }: AdminAddBusinessProps) => {
  const { categoryNames: categories, getSubcategories } = useCategoryCatalog();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [uen, setUen] = useState("");
  const [category, setCategory] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [otherSubcategory, setOtherSubcategory] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"approved" | "pending_approval">("approved");

  // Postal-code verification
  const [verifying, setVerifying] = useState(false);
  const [resolved, setResolved] = useState<{
    lat: number; lng: number; postal: string; building: string; block: string; road: string;
    matchQuality: "exact" | "partial" | "approx";
  } | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifiedPostal, setVerifiedPostal] = useState("");

  const resetForm = () => {
    setName(""); setUen(""); setCategory(""); setSubcategories([]); setOtherSubcategory(""); setDistrict("");
    setAddress(""); setPostalCode(""); setPhone(""); setEmail("");
    setWebsite(""); setDescription(""); setStatus("approved");
    setResolved(null); setVerified(false); setVerifiedPostal("");
  };

  const handlePostalChange = (code: string) => {
    setPostalCode(code);
    setVerified(false);
    setVerifiedPostal("");
    setResolved(null);
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(postalCode)) {
      toast.error("Enter a valid 6-digit Singapore postal code");
      return;
    }
    setVerifying(true);
    const r = await geocodeSingaporePostalCode(postalCode);
    setVerifying(false);
    if (!r) { toast.error("Postal code not found"); return; }
    setDistrict(r.district);
    setResolved({
      lat: r.lat, lng: r.lng, postal: r.postal,
      building: r.building, block: r.block, road: r.road, matchQuality: r.matchQuality,
    });
    if (r.matchQuality === "approx") {
      toast.error("Only approximate sector found — use a more specific postal code");
    }
  };

  const handleConfirm = () => {
    if (!resolved || resolved.matchQuality === "approx") return;
    setAddress(formatSgAddress(resolved));
    setVerified(true);
    setVerifiedPostal(postalCode);
    toast.success("Address verified");
  };

  const handleCreate = async () => {
    if (!name || !uen || !category || !district || !postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!verified || verifiedPostal !== postalCode || !resolved) {
      toast.error("Verify the postal-code address before creating the listing");
      return;
    }
    const categoryOptions = getSubcategories(category);
    if (categoryOptions.length > 0 && subcategories.length === 0 && !otherSubcategory.trim()) {
      toast.error("Select at least one subcategory");
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, any> = {
        name, uen, category, district,
        subcategories: [...subcategories, ...(otherSubcategory.trim() ? [otherSubcategory.trim()] : [])],
        address: address || formatSgAddress(resolved),
        postalCode,
        phone, email, website, description, status,
        ownerId: adminUserId,
        lat: resolved.lat,
        lng: resolved.lng,
        location: new GeoPoint(resolved.lat, resolved.lng),
        verifiedAddress: {
          building: resolved.building,
          block: resolved.block,
          road: resolved.road,
          postal: resolved.postal,
        },
        createdAt: serverTimestamp(),
        createdBy: "admin",
      };
      const docRef = await addDoc(collection(db, "listings"), data);
      onCreated({ id: docRef.id, ...data } as Listing);
      toast.success(`Business "${name}" created successfully`);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create business");
    }
    setSaving(false);
  };

  const categoryOptions = getSubcategories(category);
  const districts = SINGAPORE_DISTRICTS.filter(d => d !== "All Districts");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add New Business
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Business Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Singapore Delights Pte Ltd" />
          </div>

          <div className="space-y-1.5">
            <Label>UEN *</Label>
            <Input value={uen} onChange={(e) => setUen(e.target.value)} placeholder="e.g. 202312345A" />
          </div>

          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(value) => {
              setCategory(value);
              setSubcategories([]);
              setOtherSubcategory("");
            }}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {categoryOptions.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Subcategories *</Label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(option => {
                  const selected = subcategories.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => setSubcategories(current =>
                        selected ? current.filter(value => value !== option.value) : [...current, option.value]
                      )}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              <Input
                value={otherSubcategory}
                onChange={(event) => setOtherSubcategory(event.target.value)}
                placeholder="Other subcategory"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>District *</Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>
                {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Postal Code *</Label>
            <div className="flex gap-2">
              <Input value={postalCode} onChange={(e) => handlePostalChange(e.target.value)} placeholder="e.g. 238872" maxLength={6} />
              <Button type="button" variant="outline" onClick={handleVerify} disabled={verifying || postalCode.length !== 6}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address {verified && verifiedPostal === postalCode && <span className="text-xs text-emerald-600">(verified)</span>}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Verify postal code to auto-fill" />
          </div>

          {resolved && (
            <div className={`sm:col-span-2 rounded-lg border p-3 text-sm space-y-2 ${
              verified && verifiedPostal === postalCode
                ? "border-emerald-500/40 bg-emerald-500/5"
                : resolved.matchQuality === "approx"
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-amber-500/40 bg-amber-500/5"
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {verified && verifiedPostal === postalCode ? "Verified address" : "Confirm this is correct"}
              </p>
              <div className="space-y-0.5">
                <p><span className="text-muted-foreground">Postal:</span> {resolved.postal}</p>
                <p><span className="text-muted-foreground">Building:</span> {resolved.building || <em className="text-muted-foreground">none</em>}</p>
                <p><span className="text-muted-foreground">Block:</span> {resolved.block || <em className="text-muted-foreground">none</em>}</p>
                <p><span className="text-muted-foreground">Road:</span> {resolved.road || <em className="text-muted-foreground">none</em>}</p>
                <p className="text-xs text-muted-foreground">Lat {resolved.lat.toFixed(5)}, Lng {resolved.lng.toFixed(5)}</p>
              </div>
              {resolved.matchQuality === "approx" ? (
                <p className="text-xs text-destructive">Only sector-level coordinates available — use a more specific postal code.</p>
              ) : !(verified && verifiedPostal === postalCode) ? (
                <Button type="button" size="sm" onClick={handleConfirm}>
                  <Check className="w-3.5 h-3.5 mr-1.5" /> Confirm address is correct
                </Button>
              ) : null}
            </div>
          )}


          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 6234 5678" />
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@business.com" />
          </div>

          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label>Initial Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved (Live)</SelectItem>
                <SelectItem value="pending_approval">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the business..." rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !verified || verifiedPostal !== postalCode}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Create Business
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAddBusiness;
