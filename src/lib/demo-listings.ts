import type { Listing } from "@/components/ListingCard";
import { DEFAULT_OPERATING_HOURS } from "@/components/ListingCard";

// Reuse existing images for the new categories
import education1 from "@/assets/businesses/education1.jpg";
import education2 from "@/assets/businesses/education2.jpg";
import food1 from "@/assets/businesses/food1.jpg";
import food2 from "@/assets/businesses/food2.jpg";
import beauty1 from "@/assets/businesses/beauty1.jpg";
import beauty2 from "@/assets/businesses/beauty2.jpg";
import home1 from "@/assets/businesses/home1.jpg";
import home2 from "@/assets/businesses/home2.jpg";
import events1 from "@/assets/businesses/events1.jpg";
import retail1 from "@/assets/businesses/retail1.jpg";
import professional1 from "@/assets/businesses/professional1.jpg";

// Gallery images
import education1b from "@/assets/businesses/education1-b.jpg";
import education1c from "@/assets/businesses/education1-c.jpg";
import education2b from "@/assets/businesses/education2-b.jpg";
import education2c from "@/assets/businesses/education2-c.jpg";
import food1b from "@/assets/businesses/food1-b.jpg";
import food1c from "@/assets/businesses/food1-c.jpg";
import food2b from "@/assets/businesses/food2-b.jpg";
import food2c from "@/assets/businesses/food2-c.jpg";
import beauty1b from "@/assets/businesses/beauty1-b.jpg";
import beauty1c from "@/assets/businesses/beauty1-c.jpg";
import beauty2b from "@/assets/businesses/beauty2-b.jpg";
import beauty2c from "@/assets/businesses/beauty2-c.jpg";
import home1b from "@/assets/businesses/home1-b.jpg";
import home1c from "@/assets/businesses/home1-c.jpg";
import home2b from "@/assets/businesses/home2-b.jpg";
import home2c from "@/assets/businesses/home2-c.jpg";
import events1b from "@/assets/businesses/events1-b.jpg";
import events1c from "@/assets/businesses/events1-c.jpg";
import retail1b from "@/assets/businesses/retail1-b.jpg";
import retail1c from "@/assets/businesses/retail1-c.jpg";
import professional1b from "@/assets/businesses/professional1-b.jpg";
import professional1c from "@/assets/businesses/professional1-c.jpg";

export const GALLERY_MAP: Record<string, string[]> = {
  "1": [education1, education1b, education1c],
  "2": [education2, education2b, education2c],
  "3": [food1, food1b, food1c],
  "4": [food2, food2b, food2c],
  "5": [beauty1, beauty1b, beauty1c],
  "6": [beauty2, beauty2b, beauty2c],
  "7": [home1, home1b, home1c],
  "8": [events1, events1b, events1c],
  "9": [retail1, retail1b, retail1c],
  "10": [home2, home2b, home2c],
  "11": [professional1, professional1b, professional1c],
};

export const DEMO_LISTINGS: Listing[] = [
  {
    id: "1", name: "MathWhiz Tuition Centre", uen: "202301001A", category: "Tuition",
    district: "Bishan", address: "9 Bishan Place, #04-01, Singapore 579837", postalCode: "579837",
    phone: "+65 8123 4001", email: "learn@mathwhiz.sg",
    description: "Expert home-based tuition for Primary to JC levels in Math, Science, and English. Small group and 1-to-1 sessions available.",
    status: "approved", ownerId: "demo", lat: 1.3508, lng: 103.8491, verified: true,
 coverImage: education1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Saturday: { open: "09:00", close: "18:00" } },
  },
  {
    id: "2", name: "BrightStar Tuition", uen: "202301002B", category: "Tuition",
    district: "Tampines", address: "1 Tampines Walk, #03-12, Singapore 528523", postalCode: "528523",
    phone: "+65 8123 4002", description: "MOE-aligned tuition for primary and secondary students. Proven results with experienced tutors.",
    status: "approved", ownerId: "demo", lat: 1.3530, lng: 103.9453,
 coverImage: education2,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Saturday: { open: "09:00", close: "17:00" }, Sunday: { open: "09:00", close: "14:00", closed: false } },
  },
  {
    id: "3", name: "Sweet Oven Bakes", uen: "202302001C", category: "Baking",
    district: "Bedok", address: "Bedok North, Singapore 460123", postalCode: "460123",
    phone: "+65 9234 5001", whatsapp: "+6592345001", email: "orders@sweetovenbakes.sg",
    description: "Home-based bakery specialising in custom cakes, cupcakes, and pastries for all occasions. Halal-certified ingredients.",
    status: "approved", ownerId: "demo", lat: 1.3236, lng: 103.9273, verified: true,
 coverImage: food1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "09:00", close: "18:00" }, Tuesday: { open: "09:00", close: "18:00" }, Wednesday: { open: "09:00", close: "18:00" }, Thursday: { open: "09:00", close: "18:00" }, Friday: { open: "09:00", close: "18:00" }, Saturday: { open: "09:00", close: "15:00" } },
  },
  {
    id: "4", name: "Melody Music Studio", uen: "202303001D", category: "Music/Art/Craft",
    district: "Novena", address: "10 Sinaran Drive, #05-01, Singapore 307506", postalCode: "307506",
    phone: "+65 8345 6001", email: "hello@melodystudio.sg",
    description: "Private music lessons — piano, guitar, violin, and ukulele. Art and craft workshops for kids and adults on weekends.",
    status: "approved", ownerId: "demo", lat: 1.3204, lng: 103.8447, verified: true,
 coverImage: beauty1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "10:00", close: "20:00" }, Tuesday: { open: "10:00", close: "20:00" }, Wednesday: { open: "10:00", close: "20:00" }, Thursday: { open: "10:00", close: "20:00" }, Friday: { open: "10:00", close: "20:00" }, Saturday: { open: "10:00", close: "18:00" } },
  },
  {
    id: "5", name: "Aunty Mei's Kitchen", uen: "202304001E", category: "Home Food",
    district: "Ang Mo Kio", address: "Ang Mo Kio Ave 3, Singapore 560456", postalCode: "560456",
    phone: "+65 9456 7001", whatsapp: "+6594567001",
    description: "Home-cooked meals made fresh daily — nasi lemak, curry chicken, and bento sets. Order by 10am for same-day delivery.",
    status: "approved", ownerId: "demo", lat: 1.3691, lng: 103.8454,
 coverImage: food2,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "07:00", close: "14:00" }, Tuesday: { open: "07:00", close: "14:00" }, Wednesday: { open: "07:00", close: "14:00" }, Thursday: { open: "07:00", close: "14:00" }, Friday: { open: "07:00", close: "14:00" } },
  },
  {
    id: "6", name: "Glow Beauty Studio", uen: "202305001F", category: "Beauty",
    district: "Orchard", address: "391 Orchard Road, #B2-01, Singapore 238872", postalCode: "238872",
    phone: "+65 8567 8001", email: "appointments@glowbeauty.sg",
    description: "Home-based beauty services — manicure, pedicure, lash extensions, and facial treatments. By appointment only.",
    status: "approved", ownerId: "demo", lat: 1.3048, lng: 103.8318, verified: true,
 coverImage: beauty2,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "10:00", close: "20:00" }, Tuesday: { open: "10:00", close: "20:00" }, Wednesday: { open: "10:00", close: "20:00" }, Thursday: { open: "10:00", close: "20:00" }, Friday: { open: "10:00", close: "20:00" }, Saturday: { open: "10:00", close: "18:00" } },
  },
  {
    id: "7", name: "Pawfect Care", uen: "202306001G", category: "Pet Services",
    district: "Clementi", address: "321 Clementi Ave 3, #01-05, Singapore 129905", postalCode: "129905",
    phone: "+65 9678 9001", whatsapp: "+6596789001",
    description: "Pet grooming, pet sitting, and dog walking services. Gentle handling for all breeds. Home visits available.",
    status: "approved", ownerId: "demo", lat: 1.3150, lng: 103.7650, verified: true,
 coverImage: home1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "08:00", close: "18:00" }, Tuesday: { open: "08:00", close: "18:00" }, Wednesday: { open: "08:00", close: "18:00" }, Thursday: { open: "08:00", close: "18:00" }, Friday: { open: "08:00", close: "18:00" }, Saturday: { open: "09:00", close: "17:00" } },
  },
  {
    id: "8", name: "PartyPop Decor", uen: "202307001H", category: "Event Services",
    district: "Kallang", address: "1 Stadium Place, #03-01, Singapore 397628", postalCode: "397628",
    phone: "+65 8789 0001", email: "hello@partypop.sg", website: "https://partypop.sg",
    description: "Balloon decorations, party setups, and event styling for birthdays, weddings, and corporate events across Singapore.",
    status: "approved", ownerId: "demo", lat: 1.3045, lng: 103.8745, verified: true,
 coverImage: events1,
    operatingHours: DEFAULT_OPERATING_HOURS,
  },
  {
    id: "9", name: "Stitch & Style Tailoring", uen: "202308001I", category: "Tailoring",
    district: "Chinatown", address: "335 Smith Street, Singapore 050335", postalCode: "050335",
    phone: "+65 8890 1001",
    description: "Expert alterations and custom tailoring — suits, dresses, curtains, and traditional wear. Fast turnaround.",
    status: "approved", ownerId: "demo", lat: 1.2822, lng: 103.8441,
 coverImage: retail1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "09:00", close: "18:00" }, Tuesday: { open: "09:00", close: "18:00" }, Wednesday: { open: "09:00", close: "18:00" }, Thursday: { open: "09:00", close: "18:00" }, Friday: { open: "09:00", close: "18:00" }, Saturday: { open: "09:00", close: "15:00" } },
  },
  {
    id: "10", name: "SparkleClean SG", uen: "202309001J", category: "Cleaning",
    district: "Jurong East", address: "21 Jurong East St 31, Singapore 609517", postalCode: "609517",
    phone: "+65 9901 2001", whatsapp: "+6599012001",
    description: "Professional home cleaning for private residences — weekly, bi-weekly, or one-time deep cleaning. Eco-friendly products used.",
    status: "approved", ownerId: "demo", lat: 1.3329, lng: 103.7436,
 coverImage: home2,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "08:00", close: "18:00" }, Tuesday: { open: "08:00", close: "18:00" }, Wednesday: { open: "08:00", close: "18:00" }, Thursday: { open: "08:00", close: "18:00" }, Friday: { open: "08:00", close: "18:00" }, Saturday: { open: "08:00", close: "14:00" } },
  },
  {
    id: "11", name: "FixIt Handyman", uen: "202310001K", category: "Handyman",
    district: "Toa Payoh", address: "490 Lorong 6 Toa Payoh, #02-11, Singapore 310490", postalCode: "310490",
    phone: "+65 9012 3001", whatsapp: "+6590123001",
    description: "Basic handyman services — furniture assembly, shelf mounting, minor plumbing, and electrical fixes. Affordable rates.",
    status: "approved", ownerId: "demo", lat: 1.3343, lng: 103.8500, verified: true,
 coverImage: professional1,
    operatingHours: { ...DEFAULT_OPERATING_HOURS, Monday: { open: "09:00", close: "18:00" }, Tuesday: { open: "09:00", close: "18:00" }, Wednesday: { open: "09:00", close: "18:00" }, Thursday: { open: "09:00", close: "18:00" }, Friday: { open: "09:00", close: "18:00" }, Saturday: { open: "09:00", close: "15:00" } },
  },
  {
    id: "12", name: "LensWork Photography", uen: "202311001L", category: "Photography / Videography",
    district: "CBD / Raffles Place", address: "80 Robinson Road, #15-01, Singapore 068898", postalCode: "068898",
    phone: "+65 8123 4012", email: "hello@lenswork.sg", website: "https://lenswork.sg",
    description: "Professional photography and videography — weddings, events, portraits, and product shoots. Drone footage available.",
    status: "approved", ownerId: "demo", lat: 1.2810, lng: 103.8500, verified: true,
 coverImage: education1,
    operatingHours: DEFAULT_OPERATING_HOURS,
  },
];
