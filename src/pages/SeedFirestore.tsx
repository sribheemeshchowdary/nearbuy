import { useState, useEffect } from "react";
import { collection, doc, setDoc, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, Trash2 } from "lucide-react";
import type { Listing } from "@/components/ListingCard";
import { Link } from "react-router-dom";

const SEED_LISTINGS: Omit<Listing, "id">[] = [
  // Food & Beverage
  { name: "Singapore Delights Pte Ltd", uen: "201912345A", category: "Food & Beverage", district: "Orchard", address: "391 Orchard Road, #B2-01, Singapore 238872", postalCode: "238872", phone: "+65 6234 5678", website: "https://sgdelights.com", email: "info@sgdelights.com", whatsapp: "+6592345678", description: "Award-winning local cuisine serving traditional Peranakan dishes with a modern twist.", status: "approved", ownerId: "demo", lat: 1.3048, lng: 103.8318, verified: true, featured: true },
  { name: "Hawker King", uen: "202011111A", category: "Food & Beverage", district: "Chinatown", address: "335 Smith Street, Singapore 050335", postalCode: "050335", phone: "+65 6111 1111", description: "Authentic hawker-style dishes in a modern setting. Famous for chicken rice and laksa.", status: "approved", ownerId: "demo", lat: 1.2822, lng: 103.8441 },

  // Retail & Shopping
  { name: "Orchard Lifestyle Store", uen: "202100001F", category: "Retail & Shopping", district: "Orchard", address: "290 Orchard Road, #05-12, Singapore 238859", postalCode: "238859", phone: "+65 6600 1001", website: "https://orchardlifestyle.sg", description: "Curated lifestyle products from local and international brands.", status: "approved", ownerId: "demo", lat: 1.3040, lng: 103.8325, verified: true, featured: true },
  { name: "ShopLocal SG", uen: "202200099Z", category: "Retail & Shopping", district: "Bugis", address: "200 Victoria Street, #02-48, Singapore 188021", postalCode: "188021", phone: "+65 6600 2002", description: "Supporting local artisans — handmade crafts, fashion, and gifts.", status: "approved", ownerId: "demo", lat: 1.2993, lng: 103.8555 },

  // Healthcare & Medical
  { name: "HealthFirst Medical Clinic", uen: "201800002G", category: "Healthcare & Medical", district: "Novena", address: "6 Napier Road, #08-01, Singapore 258499", postalCode: "258499", phone: "+65 6700 2002", website: "https://healthfirst.sg", description: "Comprehensive family medicine and specialist consultations.", status: "approved", ownerId: "demo", lat: 1.3115, lng: 103.8260, verified: true },
  { name: "SmileBright Dental", uen: "202133344H", category: "Healthcare & Medical", district: "Toa Payoh", address: "490 Lorong 6 Toa Payoh, #02-11, Singapore 310490", postalCode: "310490", phone: "+65 6700 3003", description: "Gentle dental care for the whole family, from braces to implants.", status: "approved", ownerId: "demo", lat: 1.3343, lng: 103.8500 },

  // Education & Training
  { name: "LearnSG Academy", uen: "201854321D", category: "Education & Training", district: "Tampines", address: "1 Tampines Walk, #03-12, Singapore 528523", postalCode: "528523", phone: "+65 6456 7890", email: "enrol@learnsg.com", description: "Enrichment centre offering coding, robotics, and STEM courses for ages 5–16.", status: "approved", ownerId: "demo", lat: 1.3530, lng: 103.9453 },
  { name: "TutorHub SG", uen: "202244455I", category: "Education & Training", district: "Bishan", address: "9 Bishan Place, #04-01, Singapore 579837", postalCode: "579837", phone: "+65 6456 8901", description: "Expert tutoring in Math, Science, and English for primary to JC levels.", status: "approved", ownerId: "demo", lat: 1.3508, lng: 103.8491, verified: true },

  // Professional Services
  { name: "PrimeConsult Advisory", uen: "201900003H", category: "Professional Services", district: "CBD / Raffles Place", address: "80 Robinson Road, #15-01, Singapore 068898", postalCode: "068898", phone: "+65 6800 3003", website: "https://primeconsult.sg", description: "Business advisory, accounting, and corporate secretarial services.", status: "approved", ownerId: "demo", lat: 1.2810, lng: 103.8500, verified: true },

  // Beauty & Wellness
  { name: "Glow Aesthetics Clinic", uen: "202212345C", category: "Beauty & Wellness", district: "Novena", address: "10 Sinaran Drive, #10-05, Singapore 307506", postalCode: "307506", phone: "+65 6345 6789", email: "appointments@glowaesthetics.sg", description: "Premium aesthetic treatments using FDA-approved technology.", status: "approved", ownerId: "demo", lat: 1.3204, lng: 103.8447, verified: true },
  { name: "Zen Spa & Massage", uen: "202355566J", category: "Beauty & Wellness", district: "Kallang", address: "1 Stadium Place, #01-35, Singapore 397628", postalCode: "397628", phone: "+65 6345 7890", description: "Traditional Thai and Swedish massage in a tranquil oasis.", status: "approved", ownerId: "demo", lat: 1.3025, lng: 103.8753 },

  // Home Services
  { name: "HomeFixSG Services", uen: "202098765E", category: "Home Services", district: "Jurong East", address: "21 Jurong East St 31, Singapore 609517", postalCode: "609517", phone: "+65 6567 8901", whatsapp: "+6595678901", description: "Reliable plumbing, electrical, and aircon servicing across Singapore.", status: "approved", ownerId: "demo", lat: 1.3329, lng: 103.7436, verified: true, featured: true },
  { name: "CleanPro SG", uen: "202466677K", category: "Home Services", district: "Clementi", address: "321 Clementi Ave 3, #01-05, Singapore 129905", postalCode: "129905", phone: "+65 6567 2222", description: "Professional home and office cleaning services with eco-friendly products.", status: "approved", ownerId: "demo", lat: 1.3150, lng: 103.7650 },

  // Automotive
  { name: "SpeedWorks Auto", uen: "202000004I", category: "Automotive", district: "Bukit Merah", address: "163 Bukit Merah Central, #01-20, Singapore 150163", postalCode: "150163", phone: "+65 6900 4004", description: "Full car servicing, grooming, and performance tuning.", status: "approved", ownerId: "demo", lat: 1.2870, lng: 103.8160, verified: true },

  // Technology & IT
  { name: "TechHub Solutions", uen: "202301234B", category: "Technology & IT", district: "CBD / Raffles Place", address: "1 Raffles Place, #30-01, Singapore 048616", postalCode: "048616", phone: "+65 6789 0123", website: "https://techhub.sg", email: "hello@techhub.sg", whatsapp: "+6597890123", description: "Full-service IT consultancy specializing in cloud infrastructure and cybersecurity.", status: "approved", ownerId: "demo", lat: 1.2840, lng: 103.8510, verified: true, featured: true },
  { name: "AppCraft Studio", uen: "202577788L", category: "Technology & IT", district: "Queenstown", address: "71 Ayer Rajah Crescent, Singapore 139951", postalCode: "139951", phone: "+65 6789 3333", description: "Mobile app development and UI/UX design for startups and SMEs.", status: "approved", ownerId: "demo", lat: 1.2966, lng: 103.7870 },

  // Real Estate
  { name: "Prestige Properties SG", uen: "201700005J", category: "Real Estate", district: "Marina Bay", address: "10 Marina Boulevard, #28-01, Singapore 018983", postalCode: "018983", phone: "+65 6100 5005", website: "https://prestigeproperties.sg", description: "Luxury residential and commercial property consultancy.", status: "approved", ownerId: "demo", lat: 1.2815, lng: 103.8536, verified: true, featured: true },

  // Legal Services
  { name: "LawPoint LLP", uen: "201600006K", category: "Legal Services", district: "CBD / Raffles Place", address: "50 Collyer Quay, #10-01, Singapore 049321", postalCode: "049321", phone: "+65 6200 6006", description: "Corporate law, IP protection, and dispute resolution.", status: "approved", ownerId: "demo", lat: 1.2830, lng: 103.8530, verified: true },

  // Financial Services
  { name: "WealthBridge Advisors", uen: "201500007L", category: "Financial Services", district: "Bukit Timah", address: "1 Bukit Timah Road, #09-01, Singapore 229899", postalCode: "229899", phone: "+65 6300 7007", description: "Independent financial planning, insurance, and investment advisory.", status: "approved", ownerId: "demo", lat: 1.3100, lng: 103.8150, verified: true },

  // Logistics & Transport
  { name: "SwiftMove Logistics", uen: "202100008M", category: "Logistics & Transport", district: "Changi", address: "5 Changi Business Park Ave 1, Singapore 486038", postalCode: "486038", phone: "+65 6400 8008", description: "Same-day delivery, warehousing, and freight forwarding services.", status: "approved", ownerId: "demo", lat: 1.3340, lng: 103.9630 },

  // Events & Entertainment
  { name: "Celebrate! Events Co", uen: "202200009N", category: "Events & Entertainment", district: "Kallang", address: "1 Stadium Place, #03-01, Singapore 397628", postalCode: "397628", phone: "+65 6500 9009", website: "https://celebrateevents.sg", description: "Full-service event planning for weddings, corporate events, and parties.", status: "approved", ownerId: "demo", lat: 1.3045, lng: 103.8745, verified: true },

  // Construction & Renovation
  { name: "BuildRight Contractors", uen: "201800010P", category: "Construction & Renovation", district: "Ang Mo Kio", address: "53 Ang Mo Kio Ave 3, #01-01, Singapore 569933", postalCode: "569933", phone: "+65 6600 1010", description: "HDB & condo renovation specialists with 15 years of experience.", status: "approved", ownerId: "demo", lat: 1.3691, lng: 103.8454, verified: true },
];

const SeedFirestore = () => {
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(false);
  const [existingCount, setExistingCount] = useState<number | null>(null);

  const checkExisting = async () => {
    try {
      const snap = await getDocs(query(collection(db, "listings")));
      setExistingCount(snap.size);
    } catch {
      setExistingCount(0);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      let count = 0;
      for (const listing of SEED_LISTINGS) {
        const docRef = doc(collection(db, "listings"));
        await setDoc(docRef, {
          ...listing,
          createdAt: new Date(),
        });
        count++;
      }
      setDone(true);
      toast.success(`Successfully seeded ${count} businesses to Firestore!`);
      await checkExisting();
    } catch (err: any) {
      toast.error(`Failed to seed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      const snap = await getDocs(query(collection(db, "listings")));
      let count = 0;
      for (const docSnap of snap.docs) {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(docSnap.ref);
        count++;
      }
      toast.success(`Cleared ${count} listings from Firestore`);
      setDone(false);
      await checkExisting();
    } catch (err: any) {
      toast.error(`Failed to clear: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    checkExisting();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Seed Firestore</h1>
              <p className="text-sm text-muted-foreground">Push sample businesses to your Firebase database</p>
            </div>
          </div>

          {existingCount !== null && (
            <div className="rounded-lg bg-muted/50 p-4 mb-6 text-sm">
              <p className="text-muted-foreground">
                Current Firestore listings: <span className="font-semibold text-foreground">{existingCount}</span>
              </p>
              <p className="text-muted-foreground mt-1">
                Sample data to seed: <span className="font-semibold text-foreground">{SEED_LISTINGS.length}</span> businesses across all 15 categories
              </p>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-4 mb-6">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <p className="text-sm text-foreground">
                Data seeded successfully! Go to the <Link to="/" className="underline font-medium text-primary">homepage</Link> to see it live.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSeed} disabled={seeding || clearing} className="flex-1">
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Seeding {SEED_LISTINGS.length} listings...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Seed All Businesses
                </>
              )}
            </Button>

            <Button variant="destructive" onClick={handleClear} disabled={seeding || clearing || existingCount === 0}>
              {clearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedFirestore;
