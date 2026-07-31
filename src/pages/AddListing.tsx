import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs } from "firebase/firestore";
import {
  geocodeSingaporePostalCode,
  nearestDistrict,
  formatSgAddress,
  fetchOneMap,
  reverseGeocodeLocation,
} from "@/lib/geocode-pincode";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { processImageFiles } from "@/lib/image-utils";

import LogoUpload from "@/components/LogoUpload";
import DraggableImageGrid from "@/components/DraggableImageGrid";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay, DialogStackTrigger,
} from "@/components/kibo-ui/dialog-stack";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCategoryCatalog } from "@/hooks/useCategoryCatalog";
import {
  needsSubcategoryScreen, needsComplianceScreen, getComplianceGates,
  TUITION_SUBJECTS, TUITION_LANGUAGES, TUITION_LEVELS, TUITION_SYLLABI,
  MUSIC_ART_CRAFT_SUBS, BEAUTY_SUBS, PET_SUBS, HANDYMAN_SUBS,
  HOME_FOOD_SUBS, BAKING_SUBS, PHOTOGRAPHY_SUBS, TAILORING_SUBS, WELLNESS_SUBS,
  EVENT_SERVICES_SUBS, CLEANING_SUBS,
  SPORTS_SUBS, RETAIL_SUBS,
  SERVICE_LOCATIONS, CONTACT_METHODS,
  type MultiSelectOption,
} from "@/lib/listing-form-config";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Building2, X,
  MapPin, FileText, Phone, Image, ShieldCheck, MessageCircle,
  AlertTriangle, Clock, Upload, Trash2, CloudOff, CheckCircle2,
  Crosshair, Signal, Info,
} from "lucide-react";
import { toast } from "sonner";

/* ── Reusable multi-select chip component ── */
const ChipSelect = ({
  options, selected, onChange, allowOther = false, otherValue = "", onOtherChange,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (v: string[]) => void;
  allowOther?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) => {
  const allSelected = options.every((opt) => selected.includes(opt.value));
  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            allSelected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:border-primary/40"
          }`}
        >
          Select All
        </button>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {allowOther && (
        <Input
          placeholder="Other (type here)"
          value={otherValue}
          onChange={(e) => onOtherChange?.(e.target.value)}
          className="max-w-xs"
        />
      )}
    </div>
  );
};

/* ── Single-select chip ── */
const SingleChipSelect = ({
  options, selected, onChange, allowOther = false, otherValue = "", onOtherChange,
}: {
  options: MultiSelectOption[];
  selected: string;
  onChange: (v: string) => void;
  allowOther?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) => (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selected === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:border-primary/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
    {allowOther && (
      <Input
        placeholder="Other (type here)"
        value={otherValue}
        onChange={(e) => onOtherChange?.(e.target.value)}
        className="max-w-xs"
      />
    )}
  </div>
);

// A business owner can list up to this many businesses, each tracked individually.
const MAX_LISTINGS = 10;

/* ── Step definitions ── */
const getSteps = (category: string, serviceLocations: string[]) => {
  const steps: { key: string; label: string; icon: React.ReactNode }[] = [
    { key: "category", label: "Category", icon: <Building2 className="w-4 h-4" /> },
  ];
  steps.push(
    { key: "details", label: "Business Details", icon: <FileText className="w-4 h-4" /> },
  );
  steps.push(
    { key: "service-location", label: "Service Location", icon: <MapPin className="w-4 h-4" /> },
    { key: "address", label: "Location", icon: <MapPin className="w-4 h-4" /> },
    { key: "description", label: "Description", icon: <FileText className="w-4 h-4" /> },
    { key: "hours", label: "Working Hours", icon: <Clock className="w-4 h-4" /> },
    { key: "images", label: "Images", icon: <Image className="w-4 h-4" /> },
    { key: "profile", label: "Profile Extras", icon: <Image className="w-4 h-4" /> },
  );
  steps.push({ key: "contact", label: "Contact", icon: <MessageCircle className="w-4 h-4" /> });
  return steps;
};

/* ── Days of the week ── */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const AddListing = () => {
  const { user, loading: authLoading } = useAuth();
  const { categoryNames, getSubcategories } = useCategoryCatalog();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [atListingLimit, setAtListingLimit] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  
  // ── Screen 1: Category ──
  const [category, setCategory] = useState("");
  const [district, setDistrict] = useState("");

  // ── Screen 2: Business Details ──
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [uen, setUen] = useState("");
  const [uenValidation, setUenValidation] = useState<{
    status: "idle" | "validating" | "success" | "error" | "format-only";
    entityName?: string;
    message?: string;
  }>({ status: "idle" });

  // ── Screen 3: Subcategory data ──
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsOther, setSubjectsOther] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languagesOther, setLanguagesOther] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [levelsOther, setLevelsOther] = useState("");
  const [syllabi, setSyllabi] = useState<string[]>([]);
  const [syllabiOther, setSyllabiOther] = useState("");
  const [musicArtSub, setMusicArtSub] = useState("");
  const [musicArtOther, setMusicArtOther] = useState("");
  const [beautySubs, setBeautySubs] = useState<string[]>([]);
  const [beautyOther, setBeautyOther] = useState("");
  const [petSubs, setPetSubs] = useState<string[]>([]);
  const [petOther, setPetOther] = useState("");
  const [handymanSubs, setHandymanSubs] = useState<string[]>([]);
  const [handymanOther, setHandymanOther] = useState("");
  const [homeFoodSubs, setHomeFoodSubs] = useState<string[]>([]);
  const [homeFoodOther, setHomeFoodOther] = useState("");
  const [wellnessSubs, setWellnessSubs] = useState<string[]>([]);
  const [wellnessOther, setWellnessOther] = useState("");
  const [bakingSubs, setBakingSubs] = useState<string[]>([]);
  const [bakingOther, setBakingOther] = useState("");
  const [photoSubs, setPhotoSubs] = useState<string[]>([]);
  const [photoOther, setPhotoOther] = useState("");
  const [tailoringSubs, setTailoringSubs] = useState<string[]>([]);
  const [tailoringOther, setTailoringOther] = useState("");
  const [eventSubs, setEventSubs] = useState<string[]>([]);
  const [eventOther, setEventOther] = useState("");
  const [cleaningSubs, setCleaningSubs] = useState<string[]>([]);
  const [cleaningOther, setCleaningOther] = useState("");
  const [sportsSubs, setSportsSubs] = useState<string[]>([]);
  const [sportsOther, setSportsOther] = useState("");
  const [retailSubs, setRetailSubs] = useState<string[]>([]);
  const [retailOther, setRetailOther] = useState("");
  const [customCategorySubs, setCustomCategorySubs] = useState<string[]>([]);
  const [customCategoryOther, setCustomCategoryOther] = useState("");
  const configuredSubcategories = getSubcategories(category);

  // ── Screen 4: Service location ──
  const [serviceLocations, setServiceLocations] = useState<string[]>([]);
  const [travelArea, setTravelArea] = useState("");

  // ── Screen 5: Address ──
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [geocodingPostal, setGeocodingPostal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");
  // Postal-code verification — must be confirmed against OneMap before saving.
  const [resolvedAddress, setResolvedAddress] = useState<{
    postal: string; building: string; block: string; road: string; matchQuality: "exact" | "partial" | "approx";
  } | null>(null);
  const [postalVerified, setPostalVerified] = useState(false);
  const [verifiedPostal, setVerifiedPostal] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationDetectedAt, setLocationDetectedAt] = useState<string | null>(null);
  const [locationVerification, setLocationVerification] = useState("");

  // ── Screen 6: Description ──
  const [shortDescription, setShortDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");

  // ── Screen 7: Working Hours ──
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(
    Object.fromEntries(DAYS.map(d => [d, { open: "09:00", close: "18:00", closed: false }]))
  );

  // ── Screen 8: Images ──
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; fileName?: string }>({ completed: 0, total: 0 });
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Screen 9: Profile extras ──
  const [logoUrl, setLogoUrl] = useState("");
  const [shortDescriptor, setShortDescriptor] = useState("");

  // ── Compliance ──
  const [complianceChecks, setComplianceChecks] = useState<Record<string, boolean>>({});

  // ── Contact ──
  const [primaryContact, setPrimaryContact] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("+65");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [verificationDocUrl, setVerificationDocUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ═══ AUTO-SAVE DRAFT (60 days) ═══
  const DRAFT_KEY = "listing_draft";
  const DRAFT_EXPIRY_DAYS = 60;

  const draftState = useMemo(() => ({
    stepIndex, category, district, name, ownerName, uen,
    subjects, subjectsOther, languages, languagesOther, levels, levelsOther,
    syllabi, syllabiOther, musicArtSub, musicArtOther, beautySubs, beautyOther,
    petSubs, petOther, handymanSubs, handymanOther, homeFoodSubs, homeFoodOther, wellnessSubs, wellnessOther,
    bakingSubs, bakingOther, photoSubs, photoOther, tailoringSubs, tailoringOther,
    eventSubs, eventOther, cleaningSubs, cleaningOther, sportsSubs, sportsOther, retailSubs, retailOther,
    serviceLocations, travelArea, address, postalCode, unitNumber,
    locationLat, locationLng, shortDescription, detailedDescription,
    workingHours, imageUrls, logoUrl, shortDescriptor,
    complianceChecks, primaryContact, whatsappNumber, whatsappMessage,
    instagramHandle, websiteUrl, contactEmail, secondaryContact, secondaryValue,
    verificationDocUrl, gpsAccuracy, locationDetectedAt,
  }), [
    stepIndex, category, district, name, ownerName, uen,
    subjects, subjectsOther, languages, languagesOther, levels, levelsOther,
    syllabi, syllabiOther, musicArtSub, musicArtOther, beautySubs, beautyOther,
    petSubs, petOther, handymanSubs, handymanOther, homeFoodSubs, homeFoodOther, wellnessSubs, wellnessOther,
    bakingSubs, bakingOther, photoSubs, photoOther, tailoringSubs, tailoringOther,
    eventSubs, eventOther, cleaningSubs, cleaningOther, sportsSubs, sportsOther, retailSubs, retailOther,
    serviceLocations, travelArea, address, postalCode, unitNumber,
    locationLat, locationLng, shortDescription, detailedDescription,
    workingHours, imageUrls, logoUrl, shortDescriptor,
    complianceChecks, primaryContact, whatsappNumber, whatsappMessage,
    instagramHandle, websiteUrl, contactEmail, secondaryContact, secondaryValue,
    verificationDocUrl, gpsAccuracy, locationDetectedAt,
  ]);

  // Save draft (debounced) with indicator
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [draftSavedShow, setDraftSavedShow] = useState(false);
  const draftFadeRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!category && !name) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const payload = {
          data: draftState,
          expiresAt: Date.now() + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setDraftSavedShow(true);
        clearTimeout(draftFadeRef.current);
        draftFadeRef.current = setTimeout(() => setDraftSavedShow(false), 2500);
      } catch {}
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [draftState]);

  // Restore draft on mount
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    if (draftRestored) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setDraftRestored(true); return; }
      const { data, expiresAt } = JSON.parse(raw);
      if (Date.now() > expiresAt) {
        localStorage.removeItem(DRAFT_KEY);
        setDraftRestored(true);
        return;
      }
      // Restore all fields
      if (data.stepIndex != null) setStepIndex(data.stepIndex);
      if (data.category) setCategory(data.category);
      if (data.district) setDistrict(data.district);
      if (data.name) setName(data.name);
      if (data.ownerName) setOwnerName(data.ownerName);
      if (data.uen) setUen(data.uen);
      if (data.subjects) setSubjects(data.subjects);
      if (data.subjectsOther) setSubjectsOther(data.subjectsOther);
      if (data.languages) setLanguages(data.languages);
      if (data.languagesOther) setLanguagesOther(data.languagesOther);
      if (data.levels) setLevels(data.levels);
      if (data.levelsOther) setLevelsOther(data.levelsOther);
      if (data.syllabi) setSyllabi(data.syllabi);
      if (data.syllabiOther) setSyllabiOther(data.syllabiOther);
      if (data.musicArtSub) setMusicArtSub(data.musicArtSub);
      if (data.musicArtOther) setMusicArtOther(data.musicArtOther);
      if (data.beautySubs) setBeautySubs(data.beautySubs);
      if (data.beautyOther) setBeautyOther(data.beautyOther);
      if (data.petSubs) setPetSubs(data.petSubs);
      if (data.petOther) setPetOther(data.petOther);
      if (data.handymanSubs) setHandymanSubs(data.handymanSubs);
      if (data.handymanOther) setHandymanOther(data.handymanOther);
      if (data.homeFoodSubs) setHomeFoodSubs(data.homeFoodSubs);
      if (data.homeFoodOther) setHomeFoodOther(data.homeFoodOther);
      if (data.wellnessSubs) setWellnessSubs(data.wellnessSubs);
      if (data.wellnessOther) setWellnessOther(data.wellnessOther);
      if (data.bakingSubs) setBakingSubs(data.bakingSubs);
      if (data.bakingOther) setBakingOther(data.bakingOther);
      if (data.photoSubs) setPhotoSubs(data.photoSubs);
      if (data.photoOther) setPhotoOther(data.photoOther);
      if (data.tailoringSubs) setTailoringSubs(data.tailoringSubs);
      if (data.tailoringOther) setTailoringOther(data.tailoringOther);
      if (data.eventSubs) setEventSubs(data.eventSubs);
      if (data.eventOther) setEventOther(data.eventOther);
      if (data.cleaningSubs) setCleaningSubs(data.cleaningSubs);
      if (data.cleaningOther) setCleaningOther(data.cleaningOther);
      if (data.sportsSubs) setSportsSubs(data.sportsSubs);
      if (data.sportsOther) setSportsOther(data.sportsOther);
      if (data.retailSubs) setRetailSubs(data.retailSubs);
      if (data.retailOther) setRetailOther(data.retailOther);
      if (data.serviceLocations) setServiceLocations(data.serviceLocations);
      if (data.travelArea) setTravelArea(data.travelArea);
      if (data.address) setAddress(data.address);
      if (data.postalCode) setPostalCode(data.postalCode);
      if (data.unitNumber) setUnitNumber(data.unitNumber);
      if (data.locationLat != null) setLocationLat(data.locationLat);
      if (data.locationLng != null) setLocationLng(data.locationLng);
      if (data.shortDescription) setShortDescription(data.shortDescription);
      if (data.detailedDescription) setDetailedDescription(data.detailedDescription);
      if (data.workingHours) setWorkingHours(data.workingHours);
      if (data.imageUrls?.length) setImageUrls(data.imageUrls);
      if (data.logoUrl) setLogoUrl(data.logoUrl);
      if (data.shortDescriptor) setShortDescriptor(data.shortDescriptor);
      if (data.complianceChecks) setComplianceChecks(data.complianceChecks);
      if (data.primaryContact) setPrimaryContact(data.primaryContact);
      if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
      if (data.whatsappMessage) setWhatsappMessage(data.whatsappMessage);
      if (data.instagramHandle) setInstagramHandle(data.instagramHandle);
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
      if (data.contactEmail) setContactEmail(data.contactEmail);
      if (data.secondaryContact) setSecondaryContact(data.secondaryContact);
      if (data.secondaryValue) setSecondaryValue(data.secondaryValue);
      if (data.verificationDocUrl) setVerificationDocUrl(data.verificationDocUrl);
      if (data.gpsAccuracy != null) setGpsAccuracy(data.gpsAccuracy);
      if (data.locationDetectedAt) setLocationDetectedAt(data.locationDetectedAt);
      toast.info("Draft restored — continue where you left off!", { duration: 4000 });
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    setDraftRestored(true);
  }, [draftRestored]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  // UEN Auto-Validation Effect
  useEffect(() => {
    const cleanUen = uen.trim().toUpperCase();
    if (!cleanUen) {
      setUenValidation({ status: "idle" });
      return;
    }

    // Check basic length/format first
    const businessRegex = /^[0-9]{8}[A-Z]$/;
    const companyRegex = /^[0-9]{9}[A-Z]$/;
    const otherRegex = /^[TSR][0-9]{2}[A-Z]{2}[0-9]{4}[A-Z]$/;
    
    const isValidFormat = businessRegex.test(cleanUen) || companyRegex.test(cleanUen) || otherRegex.test(cleanUen);
    if (!isValidFormat) {
      if (cleanUen.length >= 9) {
        setUenValidation({ status: "error", message: "Invalid UEN format (e.g. 201912345A)" });
      } else {
        setUenValidation({ status: "idle" });
      }
      return;
    }

    // Local Mock Fallback check for testing demo UENs
    const mockUens: Record<string, string> = {
      "201912345A": "Singapore Delights Pte Ltd",
      "202011111A": "Hawker King",
      "202100001F": "Orchard Lifestyle Store",
      "202200099Z": "ShopLocal SG",
      "201800002G": "HealthFirst Medical Clinic",
      "202133344H": "SmileBright Dental",
      "201854321D": "LearnSG Academy",
      "202244455I": "TutorHub SG",
      "201900003H": "PrimeConsult Advisory",
      "202212345C": "Glow Aesthetics Clinic",
      "202355566J": "Zen Spa & Massage",
      "202098765E": "HomeFixSG Services",
      "202466677K": "CleanPro SG",
      "202000004I": "SpeedWorks Auto",
      "202301234B": "TechHub Solutions",
      "202577788L": "AppCraft Studio",
      "201700005J": "Prestige Properties SG",
      "201600006K": "LawPoint LLP",
      "201500007L": "WealthBridge Advisors",
      "202100008M": "SwiftMove Logistics",
      "202200009N": "Celebrate! Events Co",
      "201800010P": "BuildRight Contractors",
      "202301001A": "MathWhiz Tuition Centre",
      "202301002B": "BrightStar Tuition",
      "202302001C": "Sweet Oven Bakes"
    };

    if (mockUens[cleanUen]) {
      const mockName = mockUens[cleanUen];
      setUenValidation({
        status: "success",
        entityName: mockName,
        message: `Verified: ${mockName}`
      });
      setName(mockName);
      toast.success(`Auto-filled: ${mockName}`);
      return;
    }

    // Start validation loader
    setUenValidation({ status: "validating" });
    const timer = setTimeout(async () => {
      try {
        const resourceId = "d_3f960c10fed6145404ca7b821f263b87";
        // Query data.gov.sg ACRA dataset
        const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${resourceId}&filters=${encodeURIComponent(JSON.stringify({ uen: cleanUen }))}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Gov registry query failed");
        
        const data = await res.json();
        if (data?.result?.records?.length > 0) {
          const record = data.result.records[0];
          const entityName = record.entity_name || record.business_name || "";
          setUenValidation({
            status: "success",
            entityName,
            message: `Verified: ${entityName}`
          });
          if (entityName) {
            setName(entityName);
            toast.success(`Auto-filled: ${entityName}`);
          }
        } else {
          // Format is correct but entity not found in monthly datastore (e.g., brand new or other types of entities)
          setUenValidation({
            status: "format-only",
            message: "Format is valid (not found in monthly registry)"
          });
        }
      } catch (err) {
        console.error("Gov UEN lookup failed:", err);
        setUenValidation({
          status: "format-only",
          message: "Format is valid"
        });
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [uen, setName]);

  // Derived
  const steps = getSteps(category, serviceLocations);
  const currentStep = steps[stepIndex];

  useEffect(() => {
    const checkExisting = async () => {
      if (authLoading) return;
      if (!user) {
        setCheckingExisting(false);
        return;
      }
      setCheckingExisting(true);
      try {
        const q = query(collection(db, "listings"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        setAtListingLimit(snap.size >= MAX_LISTINGS);
      } catch {}
      setCheckingExisting(false);
    };
    checkExisting();
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingExisting) {
      if (!user) {
        navigate("/signup");
      } else if (atListingLimit) {
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, checkingExisting, atListingLimit, navigate]);

  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  // Auto-geocode postal code (resets verification on every change)
  const handlePostalCodeChange = useCallback(async (code: string) => {
    setPostalCode(code);
    setPostalVerified(false);
    setVerifiedPostal("");
    setResolvedAddress(null);
    setGpsAccuracy(null);
    setLocationVerification("");
    if (code.length === 6) {
      setGeocodingPostal(true);
      const result = await geocodeSingaporePostalCode(code);
      if (result) {
        setLocationLat(result.lat);
        setLocationLng(result.lng);
        setDistrict(result.district);
        setResolvedAddress({
          postal: result.postal,
          building: result.building,
          block: result.block,
          road: result.road,
          matchQuality: result.matchQuality,
        });
        setLocationDetectedAt(new Date().toISOString());
        // Auto-fill address from resolved postal code
        if (result.matchQuality !== "approx") {
          const autoAddr = formatSgAddress({ postal: result.postal, building: result.building, block: result.block, road: result.road, matchQuality: result.matchQuality });
          setAddress(autoAddr);
        } else {
          toast.error("Approximate area only — please enter address manually");
        }
      } else {
        setLocationLat(null);
        setLocationLng(null);
        setAddress("");
        toast.error("Could not find location for this postal code");
      }
      setGeocodingPostal(false);
    } else {
      setLocationLat(null);
      setLocationLng(null);
    }
  }, []);

  // User confirms the resolved address — locks in the verified postal code.
  const handleConfirmAddress = useCallback(() => {
    if (!resolvedAddress) return;
    if (resolvedAddress.matchQuality === "approx") {
      toast.error("This postal code only resolved to an approximate area. Use a more specific code.");
      return;
    }
    const confirmed = formatSgAddress(resolvedAddress);
    setAddress(confirmed);
    setPostalVerified(true);
    setVerifiedPostal(postalCode);
    toast.success("Address verified");
  }, [resolvedAddress, postalCode]);

  // Detect device location via GPS (mobile-responsive watchPosition for best accuracy)
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported by your browser"); return; }
    setDetectingLocation(true);

    let resolved = false;
    let bestFix: GeolocationPosition | null = null;
    let watchId: number | null = null;

    const finish = async () => {
      if (resolved || !bestFix) return;
      resolved = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      const { latitude, longitude, accuracy } = bestFix.coords;
      setGpsAccuracy(accuracy ?? null);
      setLocationDetectedAt(new Date().toISOString());
      setLocationLat(latitude);
      setLocationLng(longitude);
      setDistrict(nearestDistrict(latitude, longitude));
      setPostalVerified(false);
      setVerifiedPostal("");

      // Cross-check the fused browser location (GPS/Wi-Fi/mobile network)
      // against both OneMap and Google Maps. The selected postal code is then
      // forward-geocoded to obtain canonical building/block/road fields.
      try {
        const [oneMapResult, googleResult] = await Promise.allSettled([
          fetchOneMap(`/api/public/revgeocode?location=${latitude},${longitude}&buffer=200&addressType=All`)
            .then(res => res.json())
            .then(data => data?.GeocodeInfo?.[0] || null),
          reverseGeocodeLocation(latitude, longitude),
        ]);

        const oneMapInfo = oneMapResult.status === "fulfilled" ? oneMapResult.value : null;
        const googleInfo = googleResult.status === "fulfilled" ? googleResult.value : null;
        const oneMapPostal =
          oneMapInfo?.POSTALCODE && /^\d{6}$/.test(oneMapInfo.POSTALCODE)
            ? String(oneMapInfo.POSTALCODE)
            : "";
        const googlePostal =
          googleInfo?.postal && /^\d{6}$/.test(googleInfo.postal)
            ? googleInfo.postal
            : "";
        const detectedPostal = oneMapPostal || googlePostal;

        if (!detectedPostal) {
          throw new Error("No Singapore postal code was returned for this location");
        }

        const forward = await geocodeSingaporePostalCode(detectedPostal);
        if (!forward || forward.matchQuality === "approx") {
          throw new Error("Only an approximate address was found");
        }

        const sourcesAgree = !!oneMapPostal && !!googlePostal && oneMapPostal === googlePostal;
        const sourceLabel = sourcesAgree
          ? "OneMap and Google Maps"
          : oneMapPostal
            ? "OneMap"
            : "Google Maps";

        setPostalCode(forward.postal);
        setDistrict(forward.district);
        setResolvedAddress({
          postal: forward.postal,
          building: forward.building,
          block: forward.block,
          road: forward.road,
          matchQuality: forward.matchQuality,
        });
        setAddress(formatSgAddress(forward));
        setLocationVerification(
          sourcesAgree
            ? `Cross-checked with ${sourceLabel} from your device location.`
            : `Auto-filled from ${sourceLabel}; please confirm the address.`,
        );

        if (sourcesAgree && forward.matchQuality === "exact") {
          setPostalVerified(true);
          setVerifiedPostal(forward.postal);
          toast.success(`Address detected and verified (±${Math.round(accuracy || 0)}m)`);
        } else {
          toast.success(`Address detected and auto-filled (±${Math.round(accuracy || 0)}m) — please confirm`);
        }
      } catch (error) {
        setLocationVerification("");
        toast.error(error instanceof Error ? error.message : "Could not verify this location");
      }
      setDetectingLocation(false);
    };

    const TIMEOUT_MS = 12000;
    const ACCEPT_ACCURACY = 50;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestFix || (pos.coords.accuracy || Infinity) < (bestFix.coords.accuracy || Infinity)) {
          bestFix = pos;
        }
        if (bestFix && (bestFix.coords.accuracy || Infinity) <= ACCEPT_ACCURACY) {
          finish();
        }
      },
      (err) => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (bestFix) { finish(); return; }
        setDetectingLocation(false);
        const map: Record<number, string> = {
          1: "Location permission was denied. Please enable it in your browser/device settings.",
          2: "GPS unavailable. Check that location services are on.",
          3: "Took too long to get a GPS fix. Try again outdoors.",
        };
        toast.error(map[err.code] || err.message || "Unable to detect location");
      },
      { timeout: TIMEOUT_MS, maximumAge: 0, enableHighAccuracy: true }
    );

    setTimeout(() => {
      if (!resolved && bestFix) {
        finish();
      } else if (!bestFix) {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        setDetectingLocation(false);
      }
    }, TIMEOUT_MS + 500);
  }, []);

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  /* ── Inline error helper ── */
  const FieldError = ({ show, message }: { show: boolean; message: string }) =>
    show ? <p className="text-xs font-medium text-destructive mt-1">{message}</p> : null;

  const canProceed = (): boolean => {
    if (!currentStep) return false;
    switch (currentStep.key) {
      case "category": {
        if (!category) return false;
        // Subcategory validation inline
        if (needsSubcategoryScreen(category)) {
          if (category === "Tuition") return subjects.length > 0 && levels.length > 0 && syllabi.length > 0;
          if (category === "Music/Art/Craft") return !!musicArtSub || !!musicArtOther;
          if (category === "Beauty") return beautySubs.length > 0 || !!beautyOther;
          if (category === "Pet Services") return petSubs.length > 0 || !!petOther;
          if (category === "Handyman") return handymanSubs.length > 0 || !!handymanOther;
          if (category === "Home Food") return homeFoodSubs.length > 0 || !!homeFoodOther;
          if (category === "Wellness") return wellnessSubs.length > 0 || !!wellnessOther;
          if (category === "Baking") return bakingSubs.length > 0 || !!bakingOther;
          if (category === "Photography / Videography") return photoSubs.length > 0 || !!photoOther;
          if (category === "Tailoring") return tailoringSubs.length > 0 || !!tailoringOther;
          if (category === "Event Services") return eventSubs.length > 0 || !!eventOther;
          if (category === "Cleaning") return cleaningSubs.length > 0 || !!cleaningOther;
          if (category === "Sports") return sportsSubs.length > 0 || !!sportsOther;
          if (category === "Retail") return retailSubs.length > 0 || !!retailOther;
          return false;
        }
        if (configuredSubcategories.length > 0) {
          return customCategorySubs.length > 0 || !!customCategoryOther.trim();
        }
        return true;
      }
      case "details": return !!name && !!ownerName;
      case "service-location": return serviceLocations.length > 0;
      case "address": return !!address && !!postalCode && locationLat !== null && locationLng !== null && postalVerified && verifiedPostal === postalCode;
      case "description": return true;
      case "hours": return true;
      case "images": return imageUrls.length >= 1;
      case "profile": return !!logoUrl;
      case "contact":
        if (!primaryContact) return false;
        if (!contactEmail || !/\S+@\S+\.\S+/.test(contactEmail)) return false;
        if (primaryContact === "whatsapp" && (!whatsappNumber || whatsappNumber === "+65")) return false;
        if (primaryContact === "instagram" && !instagramHandle) return false;
        if (primaryContact === "website" && !websiteUrl) return false;
        if (!agreeTerms) return false;
        return true;
      default: return true;
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (!user) return;
    const remaining = 20 - imageUrls.length;
    if (remaining <= 0) { toast.error("Maximum 20 images allowed"); return; }

    setUploadingImages(true);
    setUploadProgress({ completed: 0, total: Math.min(files.length, remaining) });
    try {
      const { validBase64, errors } = await processImageFiles(
        Array.from(files),
        remaining,
        (completed, total, fileName) => setUploadProgress({ completed, total, fileName })
      );
      errors.forEach(e => toast.error(e));

      if (validBase64.length > 0) {
        setImageUrls(prev => [...prev, ...validBase64]);
        toast.success(`${validBase64.length} image(s) added`);
      }
    } catch (err: any) {
      console.error("Image processing error:", err);
      toast.error(err.message || "Failed to process images");
    }
    setUploadingImages(false);
    setUploadProgress({ completed: 0, total: 0 });
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const buildSubcategoryData = () => {
    if (category === "Tuition") {
      return {
        subjects: [...subjects, ...(subjectsOther ? [subjectsOther] : [])],
        languages: [...languages, ...(languagesOther ? [languagesOther] : [])],
        levels: [...levels, ...(levelsOther ? [levelsOther] : [])],
        syllabi: [...syllabi, ...(syllabiOther ? [syllabiOther] : [])],
      };
    }
    if (category === "Music/Art/Craft") return { subcategory: musicArtOther || musicArtSub };
    if (category === "Beauty") return { subcategories: [...beautySubs, ...(beautyOther ? [beautyOther] : [])] };
    if (category === "Pet Services") return { subcategories: [...petSubs, ...(petOther ? [petOther] : [])] };
    if (category === "Handyman") return { subcategories: [...handymanSubs, ...(handymanOther ? [handymanOther] : [])] };
    if (category === "Home Food") return { subcategories: [...homeFoodSubs, ...(homeFoodOther ? [homeFoodOther] : [])] };
    if (category === "Wellness") return { subcategories: [...wellnessSubs, ...(wellnessOther ? [wellnessOther] : [])] };
    if (category === "Baking") return { subcategories: [...bakingSubs, ...(bakingOther ? [bakingOther] : [])] };
    if (category === "Photography / Videography") return { subcategories: [...photoSubs, ...(photoOther ? [photoOther] : [])] };
    if (category === "Tailoring") return { subcategories: [...tailoringSubs, ...(tailoringOther ? [tailoringOther] : [])] };
    if (category === "Event Services") return { subcategories: [...eventSubs, ...(eventOther ? [eventOther] : [])] };
    if (category === "Cleaning") return { subcategories: [...cleaningSubs, ...(cleaningOther ? [cleaningOther] : [])] };
    if (category === "Sports") return { subcategories: [...sportsSubs, ...(sportsOther ? [sportsOther] : [])] };
    if (category === "Retail") return { subcategories: [...retailSubs, ...(retailOther ? [retailOther] : [])] };
    if (customCategorySubs.length || customCategoryOther) {
      return { subcategories: [...customCategorySubs, ...(customCategoryOther ? [customCategoryOther] : [])] };
    }
    return {};
  };

  // Build a flat array of all selected subcategory values for easy filtering
  const buildSubcategoryList = (): string[] => {
    if (category === "Tuition") return [...subjects, ...(subjectsOther ? [subjectsOther] : []), ...languages, ...(languagesOther ? [languagesOther] : [])];
    if (category === "Music/Art/Craft") return [musicArtOther || musicArtSub].filter(Boolean);
    if (category === "Beauty") return [...beautySubs, ...(beautyOther ? [beautyOther] : [])];
    if (category === "Pet Services") return [...petSubs, ...(petOther ? [petOther] : [])];
    if (category === "Handyman") return [...handymanSubs, ...(handymanOther ? [handymanOther] : [])];
    if (category === "Home Food") return [...homeFoodSubs, ...(homeFoodOther ? [homeFoodOther] : [])];
    if (category === "Wellness") return [...wellnessSubs, ...(wellnessOther ? [wellnessOther] : [])];
    if (category === "Baking") return [...bakingSubs, ...(bakingOther ? [bakingOther] : [])];
    if (category === "Photography / Videography") return [...photoSubs, ...(photoOther ? [photoOther] : [])];
    if (category === "Tailoring") return [...tailoringSubs, ...(tailoringOther ? [tailoringOther] : [])];
    if (category === "Event Services") return [...eventSubs, ...(eventOther ? [eventOther] : [])];
    if (category === "Cleaning") return [...cleaningSubs, ...(cleaningOther ? [cleaningOther] : [])];
    if (category === "Sports") return [...sportsSubs, ...(sportsOther ? [sportsOther] : [])];
    if (category === "Retail") return [...retailSubs, ...(retailOther ? [retailOther] : [])];
    if (customCategorySubs.length || customCategoryOther) {
      return [...customCategorySubs, ...(customCategoryOther ? [customCategoryOther] : [])];
    }
    return [];
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (atListingLimit) { toast.error(`You can list up to ${MAX_LISTINGS} businesses per account.`); return; }
    if (!postalVerified || verifiedPostal !== postalCode) {
      toast.error("Please verify the postal-code address before submitting");
      return;
    }

    setLoading(true);
    try {
      const whatsApp = primaryContact === "whatsapp" ? whatsappNumber : "";
      await addDoc(collection(db, "listings"), {
        name, ownerName, uen, category, district, address, postalCode, unitNumber,
        shortDescription,
        description: detailedDescription,
        logoUrl, shortDescriptor,
        imageUrls,
        workingHours,
        serviceLocations,
        travelArea: serviceLocations.includes("at-customer-home") ? travelArea : "",
        subcategoryData: buildSubcategoryData(),
        subcategoryList: buildSubcategoryList(),
        complianceChecks,
        primaryContact,
        contactEmail,
        email: contactEmail,
        phone: whatsApp || "",
        ownerEmail: user.email || "",
        contactDetails: {
          whatsapp: whatsApp,
          whatsappMessage: primaryContact === "whatsapp" ? whatsappMessage : "",
          instagram: primaryContact === "instagram" ? instagramHandle : "",
          website: primaryContact === "website" ? websiteUrl : "",
          secondary: secondaryContact ? { method: secondaryContact, value: secondaryValue } : null,
        },
        documentsUrl: verificationDocUrl ? [verificationDocUrl] : [],
        status: "pending_approval",
        ownerId: user.uid,
        location: new GeoPoint(locationLat || 1.3521, locationLng || 103.8198),
        lat: locationLat,
        lng: locationLng,
        createdAt: serverTimestamp(),
      });
      clearDraft();
      toast.success("Listing submitted for approval!");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    }
    setLoading(false);
  };

  const isLastStep = stepIndex === steps.length - 1;

  if (authLoading || checkingExisting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Checking status...</p>
      </div>
    );
  }

  /* ────────── RENDER ────────── */
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Directory
          </Button>
          {(category || name) && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { clearDraft(); window.location.reload(); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear Draft
            </Button>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Add Your Business</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Please provide your business details clearly and accurately. Your listing will be reviewed by our admin team before it is published.
          </p>
          {draftSavedShow && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> Draft saved
            </div>
          )}
        </div>

        {/* Guidelines — shown only on the initial start screen, hidden once the form is started */}
        {!submitted && !checkingExisting && !atListingLimit && stepIndex === 0 && (
        <div className="rounded-2xl border border-border/70 bg-secondary/40 px-5 py-4 mb-6">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold tracking-tight text-foreground">Before you submit</p>
              <ul className="space-y-1.5">
                {[
                  "Only upload original content that belongs to your business",
                  "Use clear, relevant photos — no blurry or unrelated images",
                  "Changes made after submission are re-reviewed before going live",
                ].map((g) => (
                  <li key={g} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        )}

        {submitted ? (
          <div className="rounded-2xl border-2 border-border bg-card p-8 retro-shadow-primary">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Submission Received!</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Thanks for listing your business with Nearbuy. Here's what happens next.
              </p>
            </div>

            {/* Approval timeline */}
            <div className="rounded-xl border-2 border-border bg-background p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Estimated approval timeline</p>
                <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">~24–48 hrs</span>
              </div>
              <ol className="relative space-y-4">
                <li className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 ring-4 ring-emerald-500/15">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Submitted</p>
                    <p className="text-xs text-muted-foreground">Just now — your details are queued for review.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 ring-4 ring-primary/15 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Under Review</p>
                    <p className="text-xs text-muted-foreground">Within 24 hours — our team verifies UEN, address, and Instagram profile.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary border-2 border-border flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Live on Nearbuy</p>
                    <p className="text-xs text-muted-foreground">Within 48 hours — you'll receive an email once approved.</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Instagram verification */}
            <div className="rounded-xl border-2 border-border bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-orange-950/30 p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Speed up verification</p>
              </div>
              <p className="text-sm text-foreground mb-3 leading-relaxed">
                Visit our Instagram profile <span className="font-bold">@nearbuy.sg</span> and send us a DM with your submitted business name. Our team uses Instagram to verify ownership before going live.
              </p>
              <a href="https://instagram.com/nearbuy.sg" target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button className="rounded-full font-semibold gap-2 text-white shadow-lg hover:opacity-90" style={{ background: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  View @nearbuy.sg on Instagram
                </Button>
              </a>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Back to Directory</Button>
            </div>
          </div>
        ) : checkingExisting ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Checking account status...</p>
          </div>
        ) : atListingLimit ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Listing Limit Reached</h2>
            <p className="text-sm text-muted-foreground mb-6">You've reached the maximum of {MAX_LISTINGS} businesses per account. Manage them from your dashboard.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Back to Directory</Button>
            </div>
          </div>
        ) : (
          <DialogStack
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            activeIndex={stepIndex}
            onActiveIndexChange={(idx) => { if (idx < stepIndex) { setShowErrors(false); setStepIndex(idx); } }}
            clickable
          >
            {/* ── Launcher card (on the page) ── */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {currentStep?.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {stepIndex === 0 ? "Let’s list your business" : "Continue your listing"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {steps.length} quick steps — {Math.round(((stepIndex + (stepIndex === 0 ? 0 : 1)) / steps.length) * 100)}% done
                </p>
              </div>
              <DialogStackTrigger asChild>
                <Button size="lg" className="w-full rounded-xl h-12 text-base">
                  {stepIndex === 0 ? "Start" : `Continue — Step ${stepIndex + 1} of ${steps.length}`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogStackTrigger>
            </div>

            <DialogStackOverlay />
            <DialogStackBody className="max-w-2xl">
              {steps.map((s, i) => (
                <DialogStackContent key={s.key} className="p-0 overflow-hidden">
                  {/* Step header + progress */}
                  <div className="px-6 pt-6 pb-4 border-b border-border">
                    <div className="flex items-center justify-between text-xs mb-2.5">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        {s.icon}{s.label}
                        <span className="text-muted-foreground font-normal ml-1">Step {i + 1} of {steps.length}</span>
                      </span>
                      <span className="font-semibold text-primary tabular-nums">{Math.round(((i + 1) / steps.length) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${Math.round(((i + 1) / steps.length) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Step body */}
                  <div className="px-6 py-5 max-h-[56vh] overflow-y-auto">
                    {i === stepIndex ? (
                      <>

              {/* SCREEN 1: Category */}
              {currentStep?.key === "category" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">What do you do?</h2>
                  <div className="space-y-2">
                    <Label>Business Category *</Label>
                    <p className="text-xs text-muted-foreground">e.g., Home Food, Beauty, Tuition, Services, etc.</p>
                    <Select value={category} onValueChange={(value) => {
                      setCategory(value);
                      setCustomCategorySubs([]);
                      setCustomCategoryOther("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categoryNames.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError show={showErrors && !category} message="Please select a category" />
                  </div>
                  <p className="text-xs text-muted-foreground">Your district will be set automatically from your address postal code in the next steps.</p>


                  {/* Inline subcategory selection */}
                  {(needsSubcategoryScreen(category) || configuredSubcategories.length > 0) && (
                    <div className="space-y-4 pt-2 border-t border-border mt-4">
                      {category === "Tuition" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Tuition Profile</h3>
                          <div className="space-y-2">
                            <Label>Subjects taught *</Label>
                            <ChipSelect options={TUITION_SUBJECTS} selected={subjects} onChange={setSubjects} allowOther otherValue={subjectsOther} onOtherChange={setSubjectsOther} />
                            <FieldError show={showErrors && subjects.length === 0} message="Please select at least one subject" />
                          </div>
                          <div className="space-y-2">
                            <Label>Languages</Label>
                            <ChipSelect options={TUITION_LANGUAGES} selected={languages} onChange={setLanguages} allowOther otherValue={languagesOther} onOtherChange={setLanguagesOther} />
                          </div>
                          <div className="space-y-2">
                            <Label>Levels supported *</Label>
                            <ChipSelect options={TUITION_LEVELS} selected={levels} onChange={setLevels} allowOther otherValue={levelsOther} onOtherChange={setLevelsOther} />
                            <FieldError show={showErrors && levels.length === 0} message="Please select at least one level" />
                          </div>
                          <div className="space-y-2">
                            <Label>Syllabus supported *</Label>
                            <ChipSelect options={TUITION_SYLLABI} selected={syllabi} onChange={setSyllabi} allowOther otherValue={syllabiOther} onOtherChange={setSyllabiOther} />
                            <FieldError show={showErrors && syllabi.length === 0} message="Please select at least one syllabus" />
                          </div>
                        </>
                      )}

                      {category === "Music/Art/Craft" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Subcategory *</h3>
                          <div className="space-y-2">
                            <Label>Select one *</Label>
                            <SingleChipSelect options={MUSIC_ART_CRAFT_SUBS} selected={musicArtSub} onChange={setMusicArtSub} allowOther otherValue={musicArtOther} onOtherChange={setMusicArtOther} />
                            <FieldError show={showErrors && !musicArtSub && !musicArtOther} message="Please select or enter a subcategory" />
                          </div>
                        </>
                      )}

                      {category === "Beauty" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Beauty Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={BEAUTY_SUBS} selected={beautySubs} onChange={setBeautySubs} allowOther otherValue={beautyOther} onOtherChange={setBeautyOther} />
                            <FieldError show={showErrors && beautySubs.length === 0 && !beautyOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Pet Services" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Pet Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={PET_SUBS} selected={petSubs} onChange={setPetSubs} allowOther otherValue={petOther} onOtherChange={setPetOther} />
                            <FieldError show={showErrors && petSubs.length === 0 && !petOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Handyman" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Handyman Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={HANDYMAN_SUBS} selected={handymanSubs} onChange={setHandymanSubs} allowOther otherValue={handymanOther} onOtherChange={setHandymanOther} />
                            <FieldError show={showErrors && handymanSubs.length === 0 && !handymanOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Home Food" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Home Food Type *</h3>
                          <div className="space-y-2">
                            <Label>Select cuisine type *</Label>
                            <ChipSelect options={HOME_FOOD_SUBS} selected={homeFoodSubs} onChange={setHomeFoodSubs} allowOther otherValue={homeFoodOther} onOtherChange={setHomeFoodOther} />
                            <FieldError show={showErrors && homeFoodSubs.length === 0 && !homeFoodOther} message="Please select at least one cuisine type" />
                          </div>
                        </>
                      )}

                      {category === "Wellness" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Wellness Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={WELLNESS_SUBS} selected={wellnessSubs} onChange={setWellnessSubs} allowOther otherValue={wellnessOther} onOtherChange={setWellnessOther} />
                            <FieldError show={showErrors && wellnessSubs.length === 0 && !wellnessOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}



                      {category === "Baking" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Baking Speciality *</h3>
                          <div className="space-y-2">
                            <Label>Select baked goods *</Label>
                            <ChipSelect options={BAKING_SUBS} selected={bakingSubs} onChange={setBakingSubs} allowOther otherValue={bakingOther} onOtherChange={setBakingOther} />
                            <FieldError show={showErrors && bakingSubs.length === 0 && !bakingOther} message="Please select at least one type" />
                          </div>
                        </>
                      )}

                      {category === "Photography / Videography" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Photography / Videography *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={PHOTOGRAPHY_SUBS} selected={photoSubs} onChange={setPhotoSubs} allowOther otherValue={photoOther} onOtherChange={setPhotoOther} />
                            <FieldError show={showErrors && photoSubs.length === 0 && !photoOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Tailoring" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Tailoring Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={TAILORING_SUBS} selected={tailoringSubs} onChange={setTailoringSubs} allowOther otherValue={tailoringOther} onOtherChange={setTailoringOther} />
                            <FieldError show={showErrors && tailoringSubs.length === 0 && !tailoringOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Event Services" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Event Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={EVENT_SERVICES_SUBS} selected={eventSubs} onChange={setEventSubs} allowOther otherValue={eventOther} onOtherChange={setEventOther} />
                            <FieldError show={showErrors && eventSubs.length === 0 && !eventOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Cleaning" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Cleaning Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={CLEANING_SUBS} selected={cleaningSubs} onChange={setCleaningSubs} allowOther otherValue={cleaningOther} onOtherChange={setCleaningOther} />
                            <FieldError show={showErrors && cleaningSubs.length === 0 && !cleaningOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Sports" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Sports Services *</h3>
                          <div className="space-y-2">
                            <Label>Select services *</Label>
                            <ChipSelect options={SPORTS_SUBS} selected={sportsSubs} onChange={setSportsSubs} allowOther otherValue={sportsOther} onOtherChange={setSportsOther} />
                            <FieldError show={showErrors && sportsSubs.length === 0 && !sportsOther} message="Please select at least one service" />
                          </div>
                        </>
                      )}

                      {category === "Retail" && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">Retail Type *</h3>
                          <div className="space-y-2">
                            <Label>Select retail types *</Label>
                            <ChipSelect options={RETAIL_SUBS} selected={retailSubs} onChange={setRetailSubs} allowOther otherValue={retailOther} onOtherChange={setRetailOther} />
                            <FieldError show={showErrors && retailSubs.length === 0 && !retailOther} message="Please select at least one retail type" />
                          </div>
                        </>
                      )}

                      {!needsSubcategoryScreen(category) && configuredSubcategories.length > 0 && (
                        <>
                          <h3 className="text-base font-semibold text-foreground">{category} services *</h3>
                          <div className="space-y-2">
                            <Label>Select subcategories *</Label>
                            <ChipSelect
                              options={configuredSubcategories}
                              selected={customCategorySubs}
                              onChange={setCustomCategorySubs}
                              allowOther
                              otherValue={customCategoryOther}
                              onOtherChange={setCustomCategoryOther}
                            />
                            <FieldError
                              show={showErrors && customCategorySubs.length === 0 && !customCategoryOther}
                              message="Please select at least one subcategory"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 2: Business Details */}
              {currentStep?.key === "details" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Business Details</h2>
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mary's Home Kitchen" />
                    <FieldError show={showErrors && !name} message="Business name is required" />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name *</Label>
                    <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. Mary Tan" />
                    <FieldError show={showErrors && !ownerName} message="Owner name is required" />
                  </div>
                  <div className="space-y-2">
                    <Label>UEN <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <div className="relative">
                      <Input 
                        value={uen} 
                        onChange={e => setUen(e.target.value)} 
                        placeholder="e.g. 201912345A" 
                        className={
                          uenValidation.status === "success" 
                            ? "border-emerald-500 pr-10 focus-visible:ring-emerald-500" 
                            : uenValidation.status === "error" 
                            ? "border-destructive pr-10 focus-visible:ring-destructive" 
                            : ""
                        }
                      />
                      {uenValidation.status === "validating" && (
                        <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                      {uenValidation.status === "success" && (
                        <div className="absolute right-3 top-3 h-4 w-4 text-emerald-500 font-bold">✓</div>
                      )}
                    </div>
                    
                    {uenValidation.status === "success" && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center gap-2 mt-1">
                        <span>🏢 {uenValidation.message}</span>
                        {uenValidation.entityName && name !== uenValidation.entityName && (
                          <button
                            type="button"
                            onClick={() => setName(uenValidation.entityName || "")}
                            className="underline font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            Use official name
                          </button>
                        )}
                      </div>
                    )}
                    {uenValidation.status === "format-only" && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ✓ UEN format is valid
                      </div>
                    )}
                    {uenValidation.status === "error" && (
                      <div className="text-xs text-destructive mt-1">
                        ✗ {uenValidation.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 3: Service Location */}
              {currentStep?.key === "service-location" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Where does your service happen?</h2>
                  <p className="text-sm text-muted-foreground">Do you provide home service / delivery?</p>
                  <ChipSelect options={SERVICE_LOCATIONS} selected={serviceLocations} onChange={setServiceLocations} />
                  <FieldError show={showErrors && serviceLocations.length === 0} message="Please select at least one service location" />
                  {serviceLocations.includes("at-customer-home") && (
                    <div className="space-y-2 pt-2">
                      <Label>Travel area (optional)</Label>
                      <Input value={travelArea} onChange={e => setTravelArea(e.target.value)} placeholder="e.g. Within 10km of Tampines" />
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 5: Location */}
              {currentStep?.key === "address" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Your Location</h2>
                  <p className="text-sm text-muted-foreground">Enter your 6-digit postal code and we'll auto-detect your address.</p>

                  {/* Postal Code FIRST */}
                  <div className="space-y-2">
                    <Label>Postal Code *</Label>
                    <Input
                      value={postalCode}
                      onChange={e => handlePostalCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="e.g. 238872"
                      maxLength={6}
                      inputMode="numeric"
                      className="text-lg font-semibold tracking-widest"
                    />
                    {geocodingPostal && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Looking up address...</p>}
                    <FieldError show={showErrors && !postalCode} message="Postal code is required" />
                  </div>

                  {/* Postal-code verification card & validation warnings (on top for mobile visibility) */}
                  {resolvedAddress && (
                    <div className={`rounded-lg border p-3 space-y-2 ${
                      postalVerified && verifiedPostal === postalCode
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : resolvedAddress.matchQuality === "approx"
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-amber-500/40 bg-amber-500/5"
                    }`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {postalVerified && verifiedPostal === postalCode ? "Verified address" : "Confirm this is your exact address"}
                      </p>
                      <div className="text-sm text-foreground space-y-0.5">
                        <p><span className="text-muted-foreground">Postal:</span> {resolvedAddress.postal}</p>
                        <p><span className="text-muted-foreground">Building:</span> {resolvedAddress.building || <em className="text-muted-foreground">— none —</em>}</p>
                        <p><span className="text-muted-foreground">Block:</span> {resolvedAddress.block || <em className="text-muted-foreground">— none —</em>}</p>
                        <p><span className="text-muted-foreground">Road:</span> {resolvedAddress.road || <em className="text-muted-foreground">— none —</em>}</p>
                      </div>
                      {resolvedAddress.matchQuality === "approx" ? (
                        <p className="text-xs text-destructive">Only the postal sector was found. Re-enter a valid 6-digit postal code.</p>
                      ) : !(postalVerified && verifiedPostal === postalCode) ? (
                        <Button type="button" size="sm" onClick={handleConfirmAddress}>
                          <Check className="w-3.5 h-3.5 mr-1.5" /> Confirm address is correct
                        </Button>
                      ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Locked. Editing the postal code will require re-verification.
                        </p>
                      )}
                    </div>
                  )}
                  <FieldError
                    show={showErrors && !!postalCode && (!postalVerified || verifiedPostal !== postalCode)}
                    message="Please verify the postal-code address before continuing"
                  />

                  {/* Auto-filled address (editable) */}
                  <div className="space-y-2">
                    <Label>Address {address ? <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">✓ Auto-filled</span> : "*"}</Label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter postal code above to auto-fill" />
                    <p className="text-xs text-muted-foreground">Auto-filled from postal code. You can edit if needed.</p>
                    {locationVerification && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                        <Check className="w-3 h-3 mt-0.5 shrink-0" />
                        {locationVerification}
                      </p>
                    )}
                    <FieldError show={showErrors && !address} message="Address is required" />
                  </div>

                  {/* Unit number */}
                  <div className="space-y-2">
                    <Label>Unit Number (private)</Label>
                    <Input value={unitNumber} onChange={e => setUnitNumber(e.target.value)} placeholder="e.g. #12-345" />
                    <p className="text-xs text-muted-foreground">Unit number is kept private and won't be shown publicly.</p>
                  </div>

                  {/* Detect Location Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                  >
                    {detectingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    {detectingLocation ? "Detecting location..." : "Or Detect My Location via GPS"}
                  </Button>

                  {/* Location status */}
                  {locationLat !== null && locationLng !== null ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Location pinned</p>
                        <p className="text-xs text-muted-foreground">Lat: {locationLat.toFixed(4)}, Lng: {locationLng.toFixed(4)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-muted-foreground">Enter a valid 6-digit postal code or use "Detect My Location" to pin your business on the map.</p>
                    </div>
                  )}
                  <FieldError show={showErrors && (locationLat === null || locationLng === null)} message="Location is required — enter postal code or detect your location" />

                  {/* GPS & Resolution Details Panel */}
                  {resolvedAddress && (
                    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <Signal className="w-3 h-3" /> Location Resolution Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* GPS Accuracy */}
                        <div className="rounded-md border border-border bg-background p-2.5 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Crosshair className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">GPS Accuracy</p>
                            <p className="text-sm font-semibold text-foreground">
                              {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : <span className="text-muted-foreground font-normal">Not available</span>}
                            </p>
                          </div>
                        </div>
                        {/* Last Update */}
                        <div className="rounded-md border border-border bg-background p-2.5 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Last Update</p>
                            <p className="text-sm font-semibold text-foreground">
                              {locationDetectedAt
                                ? (() => {
                                    const diff = Date.now() - new Date(locationDetectedAt).getTime();
                                    if (diff < 60000) return "Just now";
                                    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                                    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                                    return new Date(locationDetectedAt).toLocaleDateString();
                                  })()
                                : <span className="text-muted-foreground font-normal">—</span>}
                            </p>
                          </div>
                        </div>
                        {/* Match Quality */}
                        <div className="rounded-md border border-border bg-background p-2.5 flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            resolvedAddress.matchQuality === "exact"
                              ? "bg-emerald-500/10"
                              : resolvedAddress.matchQuality === "partial"
                                ? "bg-amber-500/10"
                                : "bg-destructive/10"
                          }`}>
                            {resolvedAddress.matchQuality === "exact" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : resolvedAddress.matchQuality === "partial" ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Match Quality</p>
                            <p className={`text-sm font-semibold ${
                              resolvedAddress.matchQuality === "exact"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : resolvedAddress.matchQuality === "partial"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-destructive"
                            }`}>
                              {resolvedAddress.matchQuality === "exact" ? "Exact Match" : resolvedAddress.matchQuality === "partial" ? "Partial Match" : "Approximate"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Map preview */}
                  {locationLat !== null && locationLng !== null && (
                    <div className="rounded-lg overflow-hidden border border-border h-[200px]">
                      <iframe
                        title="Business Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://www.google.com/maps?q=${locationLat},${locationLng}&z=16&output=embed`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 6: Description */}
              {currentStep?.key === "description" && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Business Description</h2>

                  <div className="space-y-2">
                    <Label>Short Description (50–100 words)</Label>
                    <p className="text-xs text-muted-foreground">Explain what you offer and what makes your business unique.</p>
                    <Textarea
                      value={shortDescription}
                      onChange={e => setShortDescription(e.target.value)}
                      placeholder="e.g. We specialize in premium home-baked artisan cookies and cakes, made with high-quality ingredients. What sets us apart is our personalized approach — every order is customized to your taste preferences..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className={`text-xs text-right text-muted-foreground`}>
                      {wordCount(shortDescription)} words
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Detailed Description</Label>
                    <p className="text-xs text-muted-foreground">Services or products you provide, pricing (optional), experience or background.</p>
                    <Textarea
                      value={detailedDescription}
                      onChange={e => setDetailedDescription(e.target.value)}
                      placeholder="Share details about your services, products, pricing, and experience..."
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">{detailedDescription.length} characters</p>
                  </div>
                </div>
              )}

              {/* SCREEN 7: Working Hours */}
              {currentStep?.key === "hours" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Working Hours</h2>
                  <p className="text-sm text-muted-foreground">Set your available days and timings.</p>
                  <div className="space-y-2">
                    {DAYS.map(day => {
                      const h = workingHours[day];
                      return (
                        <div key={day} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/20">
                          <Checkbox
                            checked={!h.closed}
                            onCheckedChange={(checked) =>
                              setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !checked } }))
                            }
                          />
                          <span className="text-sm font-medium w-20 shrink-0">{day.slice(0, 3)}</span>
                          {h.closed ? (
                            <span className="text-xs text-muted-foreground">Closed</span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-1">
                              <Input
                                type="time"
                                value={h.open}
                                onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                                className="h-8 text-xs w-auto"
                              />
                              <span className="text-xs text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={h.close}
                                onChange={e => setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                                className="h-8 text-xs w-auto"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SCREEN 8: Images Upload */}
              {currentStep?.key === "images" && (
                <div className="space-y-4 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Business Images</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload at least 1 high-quality image of your business, products, or services (up to 20). No blurry or unrelated images.
                  </p>

                  {/* Image grid with drag & drop reordering */}
                  <DraggableImageGrid
                    images={imageUrls}
                    onReorder={setImageUrls}
                    onRemove={removeImage}
                    onUploadClick={() => imageInputRef.current?.click()}
                    uploading={uploadingImages}
                    maxImages={20}
                  />
                  <p className="text-[10px] text-muted-foreground/70">Drag images to reorder. First image is the cover photo.</p>

                  {/* Processing indicator with progress */}
                  {uploadingImages && uploadProgress.total > 0 && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                          <p className="text-xs font-medium text-foreground truncate">
                            Uploading {uploadProgress.completed} of {uploadProgress.total}
                            {uploadProgress.fileName ? ` — ${uploadProgress.fileName}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary shrink-0">
                          {Math.round((uploadProgress.completed / uploadProgress.total) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={(uploadProgress.completed / uploadProgress.total) * 100}
                        className="h-2"
                      />
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleImageUpload(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />

                  <p className="text-xs text-muted-foreground">
                    {imageUrls.length}/20 images uploaded. Minimum 1 required. Max 5MB each. JPG, PNG, or WEBP.
                  </p>
                  <FieldError show={showErrors && imageUrls.length < 1} message={`Please upload at least 1 image`} />
                </div>
              )}

              {/* SCREEN 9: Profile Extras */}
              {currentStep?.key === "profile" && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Profile Extras</h2>
                  {user && (
                    <div className="space-y-2">
                      <Label>Business Logo / Profile Image *</Label>
                      <LogoUpload
                        currentUrl={logoUrl || undefined}
                        userId={user.uid}
                        onUploaded={url => setLogoUrl(url)}
                        onRemoved={() => setLogoUrl("")}
                      />
                      <FieldError show={showErrors && !logoUrl} message="Please upload a logo or profile image to continue" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Short Descriptor (optional)</Label>
                    <Input
                      value={shortDescriptor}
                      onChange={e => setShortDescriptor(e.target.value.slice(0, 30))}
                      placeholder='e.g. "Gel nails", "IGCSE tuition", "Home bakes"'
                      maxLength={30}
                    />
                    <p className="text-xs text-muted-foreground">{shortDescriptor.length}/30 characters</p>
                  </div>
                </div>
              )}


              {/* Contact */}
              {currentStep?.key === "contact" && (
                <div className="space-y-5 animate-fade-in">
                  <h2 className="text-lg font-semibold text-foreground">Contact Details</h2>

                  <div className="space-y-2">
                    <Label>Email Address (Mandatory) *</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="info@yourbusiness.com"
                    />
                    <FieldError show={showErrors && (!contactEmail || !/\S+@\S+\.\S+/.test(contactEmail))} message="Valid email address is required" />
                  </div>

                  <div className="space-y-2">
                    <Label>Primary contact method *</Label>
                    <p className="text-xs text-muted-foreground">Phone Number (WhatsApp preferred)</p>
                    <SingleChipSelect options={CONTACT_METHODS} selected={primaryContact} onChange={setPrimaryContact} />
                    <FieldError show={showErrors && !primaryContact} message="Please select a contact method" />
                  </div>

                  {primaryContact === "whatsapp" && (
                    <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/20">
                      <div className="space-y-2">
                        <Label>WhatsApp Number *</Label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 h-10 rounded-l-lg border-2 border-r-0 border-border bg-muted text-sm font-medium text-muted-foreground select-none">+65</span>
                          <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="9123 4567" className="rounded-l-none rounded-r-lg" maxLength={8} inputMode="numeric" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Pre-filled message (optional)</Label>
                        <Input value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} placeholder="Hi! I'd like to enquire about..." />
                      </div>
                    </div>
                  )}

                  {primaryContact === "instagram" && (
                    <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
                      <Label>Instagram Handle *</Label>
                      <Input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="@yourbusiness" />
                    </div>
                  )}

                  {primaryContact === "website" && (
                    <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/20">
                      <Label>Website URL *</Label>
                      <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourbusiness.com" />
                    </div>
                  )}

                  <div className="pt-3 border-t border-border">
                    <div className="space-y-2">
                      <Label>Social Media / Website (optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">Instagram / Facebook / Website link. Used for the "Book / Order" button.</p>
                      <Select value={secondaryContact} onValueChange={setSecondaryContact}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {CONTACT_METHODS.filter(m => m.value !== primaryContact).map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {secondaryContact && secondaryContact !== "none" && (
                      <div className="space-y-2 mt-3">
                        <Label>
                          {secondaryContact === "whatsapp" ? "WhatsApp Number" :
                           secondaryContact === "instagram" ? "Instagram Handle" : "Website URL"}
                        </Label>
                        <Input
                          value={secondaryValue}
                          onChange={e => setSecondaryValue(e.target.value)}
                          placeholder={
                            secondaryContact === "whatsapp" ? "+65 9123 4567" :
                            secondaryContact === "instagram" ? "@yourbusiness" : "https://..."
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Verification Document URL */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <Label>Verification Document URL (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Share a Google Drive, Dropbox, or OneDrive link to your ACRA business profile, license, or property ownership documents for faster verification. 
                      <strong className="text-foreground"> Make sure the link is set to "Anyone with the link can view".</strong>
                    </p>
                    <Input
                      value={verificationDocUrl}
                      onChange={e => setVerificationDocUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or https://www.dropbox.com/..."
                    />
                    {verificationDocUrl && !/^https?:\/\/.+/.test(verificationDocUrl) && (
                      <p className="text-xs text-destructive">Please enter a valid URL starting with https://</p>
                    )}
                  </div>

                  {/* Agreement */}
                  <div className="pt-4 border-t border-border">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={agreeTerms}
                        onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                        className="mt-0.5"
                      />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        By submitting, I agree that my listing will be reviewed before going live and any updates will go through the approval process. I confirm all content and images belong to my business.
                      </span>
                    </label>
                    <FieldError show={showErrors && !agreeTerms} message="You must agree to the terms before submitting" />
                  </div>
                </div>
              )}

                      </>
                    ) : (
                      <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">{s.icon}</div>
                        <p className="text-sm font-medium text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{i < stepIndex ? "Completed ✓" : "Coming up next"}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Footer navigation (active card is interactive) ── */}
                  <div className="flex justify-between gap-2 px-6 py-4 border-t border-border bg-card">
                    <Button variant="outline" onClick={() => { setShowErrors(false); setStepIndex(x => x - 1); }} disabled={stepIndex === 0}>
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </Button>
                    {!isLastStep ? (
                      <Button onClick={() => {
                        if (canProceed()) { setShowErrors(false); setStepIndex(x => x + 1); }
                        else { setShowErrors(true); toast.error("Please fill in all required fields"); }
                      }}>
                        Next <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        if (canProceed()) { handleSubmit(); }
                        else { setShowErrors(true); toast.error("Please fill in all required fields"); }
                      }} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Submit Listing
                      </Button>
                    )}
                  </div>
                </DialogStackContent>
              ))}
            </DialogStackBody>
          </DialogStack>
        )}
      </div>
    </div>
  );
};

export default AddListing;
