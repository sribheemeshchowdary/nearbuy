import { Listing } from "@/components/ListingCard";
import { DISTRICT_COORDINATES } from "@/lib/districts";

// Demo users for the platform
export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  role: "superadmin" | "admin" | "business_owner" | "user";
  status: "active" | "suspended" | "banned";
  joinedAt: string;
  listingsCount: number;
  lastActive: string;
  phone?: string;
  avatar?: string;
}

export const DEMO_USERS: PlatformUser[] = [
  { id: "u1", email: "admin@nearbuy.sg", displayName: "Nearbuy Admin", role: "superadmin", status: "active", joinedAt: "2024-01-15", listingsCount: 0, lastActive: "2026-03-08", phone: "+65 9000 0001" },
  { id: "u2", email: "john.tan@gmail.com", displayName: "John Tan", role: "business_owner", status: "active", joinedAt: "2024-06-20", listingsCount: 3, lastActive: "2026-03-07", phone: "+65 9123 4567" },
  { id: "u3", email: "sarah.lim@outlook.com", displayName: "Sarah Lim", role: "business_owner", status: "active", joinedAt: "2024-09-10", listingsCount: 1, lastActive: "2026-03-06", phone: "+65 9234 5678" },
  { id: "u4", email: "david.wong@hotmail.com", displayName: "David Wong", role: "user", status: "active", joinedAt: "2025-01-05", listingsCount: 0, lastActive: "2026-03-05" },
  { id: "u5", email: "mei.chen@yahoo.com", displayName: "Mei Chen", role: "business_owner", status: "suspended", joinedAt: "2025-02-14", listingsCount: 2, lastActive: "2026-02-28", phone: "+65 9345 6789" },
  { id: "u6", email: "rajesh.kumar@gmail.com", displayName: "Rajesh Kumar", role: "admin", status: "active", joinedAt: "2024-03-22", listingsCount: 0, lastActive: "2026-03-08", phone: "+65 9456 7890" },
  { id: "u7", email: "lisa.ng@gmail.com", displayName: "Lisa Ng", role: "business_owner", status: "active", joinedAt: "2025-05-10", listingsCount: 1, lastActive: "2026-03-04", phone: "+65 9567 8901" },
  { id: "u8", email: "spam.user@temp.com", displayName: "Spam User", role: "user", status: "banned", joinedAt: "2025-11-01", listingsCount: 0, lastActive: "2025-12-01" },
];

/* ═══════════════════════════════════════════════════════════
   110 DEMO LISTINGS — 10 per category
   ═══════════════════════════════════════════════════════════ */

const districts = [
  "Ang Mo Kio", "Bedok", "Bishan", "Bukit Batok", "Bukit Merah",
  "Bukit Timah", "Clementi", "Geylang", "Hougang", "Jurong East",
  "Jurong West", "Kallang", "Novena", "Orchard", "Pasir Ris",
  "Punggol", "Queenstown", "Sembawang", "Sengkang", "Serangoon",
  "Tampines", "Toa Payoh", "Woodlands", "Yishun", "CBD / Raffles Place",
  "Chinatown", "Marina Bay", "Changi",
];

const pick = (arr: string[], i: number) => arr[i % arr.length];
const coord = (d: string) => DISTRICT_COORDINATES[d] || { lat: 1.35, lng: 103.82 };

interface BizTemplate { name: string; desc: string; phone: string; email?: string; website?: string; }

const tuition: BizTemplate[] = [
  { name: "MathWhiz Tuition Centre", desc: "Expert tuition for Primary to JC levels in Math, Science, and English.", phone: "+65 8100 1001", email: "learn@mathwhiz.sg" },
  { name: "BrightStar Learning Hub", desc: "MOE-aligned tuition with proven results for primary and secondary students.", phone: "+65 8100 1002" },
  { name: "AcePro Tuition", desc: "Small group and 1-to-1 A-level tuition specialising in H2 Math and Physics.", phone: "+65 8100 1003", email: "info@acepro.sg" },
  { name: "SmartKids Education", desc: "Fun and interactive enrichment classes for K1 to P6 in English and Math.", phone: "+65 8100 1004" },
  { name: "EduBridge Academy", desc: "PSLE and O-level intensive crash courses with experienced ex-MOE teachers.", phone: "+65 8100 1005", email: "hello@edubridge.sg" },
  { name: "LearnSG Tutors", desc: "Coding, robotics, and STEM enrichment for ages 5–16.", phone: "+65 8100 1006", website: "https://learnsg.sg" },
  { name: "TopGrade Tuition", desc: "Specialised Chemistry and Biology tuition for JC and IP students.", phone: "+65 8100 1007" },
  { name: "SurePass Learning", desc: "Affordable group tuition for N-level and O-level students with free notes.", phone: "+65 8100 1008", email: "surepass@gmail.com" },
  { name: "HomeTutor SG", desc: "Experienced home tutors dispatched island-wide for all subjects.", phone: "+65 8100 1009", website: "https://hometutorsg.com" },
  { name: "The Study Room", desc: "Self-study space with on-demand tutoring support for secondary and JC students.", phone: "+65 8100 1010" },
];

const baking: BizTemplate[] = [
  { name: "Sweet Oven Bakes", desc: "Custom cakes, cupcakes, and pastries for all occasions. Halal-certified.", phone: "+65 8200 2001", email: "orders@sweetoven.sg" },
  { name: "Butter & Bloom", desc: "Artisan sourdough bread and butter croissants baked fresh daily.", phone: "+65 8200 2002" },
  { name: "CakeCraft SG", desc: "Fondant and buttercream birthday cakes with 3D designs and free delivery.", phone: "+65 8200 2003", email: "hello@cakecraft.sg" },
  { name: "The Cookie Jar", desc: "Premium cookies in 20+ flavours — corporate gifts and party packs available.", phone: "+65 8200 2004", website: "https://cookiejar.sg" },
  { name: "Bake My Day", desc: "Home-baked brownies, tarts, and dessert boxes for gifting and events.", phone: "+65 8200 2005" },
  { name: "Flour & Fold", desc: "Handmade pasta, pizza dough, and artisan bakes for the home cook.", phone: "+65 8200 2006" },
  { name: "Sugar Rush Bakery", desc: "Customised wedding cakes and dessert tables for weddings and engagements.", phone: "+65 8200 2007", email: "weddings@sugarrush.sg" },
  { name: "Kneadful Things", desc: "Gluten-free and vegan baked goods — muffins, banana bread, and granola.", phone: "+65 8200 2008" },
  { name: "Whisk & Roll", desc: "Swiss rolls, chiffon cakes, and traditional kuehs for festive seasons.", phone: "+65 8200 2009" },
  { name: "PastryPal SG", desc: "French pastry workshop and custom patisserie orders for special events.", phone: "+65 8200 2010", website: "https://pastrypal.sg" },
];

const musicArtCraft: BizTemplate[] = [
  { name: "Melody Music Studio", desc: "Private lessons — piano, guitar, violin, and ukulele for all ages.", phone: "+65 8300 3001", email: "hello@melodystudio.sg" },
  { name: "Canvas & Clay", desc: "Art jamming, pottery, and craft workshops for kids and adults.", phone: "+65 8300 3002" },
  { name: "Harmony Piano School", desc: "ABRSM and Trinity graded piano lessons with experienced concert pianists.", phone: "+65 8300 3003", website: "https://harmonypiano.sg" },
  { name: "The Art Loft", desc: "Oil painting, watercolour, and sketching classes in a cozy loft studio.", phone: "+65 8300 3004" },
  { name: "BeatBox Drums SG", desc: "Drumming and percussion lessons — cajon, djembe, and drum kit.", phone: "+65 8300 3005", email: "drums@beatbox.sg" },
  { name: "Stitch & Create", desc: "Sewing, embroidery, and macramé workshops for beginners and hobbyists.", phone: "+65 8300 3006" },
  { name: "Vocal Edge Academy", desc: "Vocal coaching and singing lessons for pop, jazz, and classical genres.", phone: "+65 8300 3007" },
  { name: "Crafty Hands Studio", desc: "Resin art, candle making, and terrarium workshops — great for team-building.", phone: "+65 8300 3008", website: "https://craftyhands.sg" },
  { name: "String Theory Music", desc: "Guitar, bass, and ukulele lessons with performance opportunities.", phone: "+65 8300 3009" },
  { name: "Little Picasso Art", desc: "Creative art enrichment for children aged 3–12 using Montessori methods.", phone: "+65 8300 3010" },
];

const homeFood: BizTemplate[] = [
  { name: "Aunty Mei's Kitchen", desc: "Home-cooked nasi lemak, curry chicken, and bento sets. Order by 10am.", phone: "+65 8400 4001" },
  { name: "Makan@Home", desc: "Daily changing menu of Malay, Chinese, and Indian home-cooked meals.", phone: "+65 8400 4002", email: "order@makanathome.sg" },
  { name: "FreshBowl SG", desc: "Healthy poke bowls and salad jars prepared fresh daily and delivered.", phone: "+65 8400 4003", website: "https://freshbowl.sg" },
  { name: "Nasi Padang Mama", desc: "Authentic Padang cuisine — rendang, sambal goreng, and ayam pop.", phone: "+65 8400 4004" },
  { name: "The Bento Box", desc: "Japanese-inspired bento boxes with onigiri, tamagoyaki, and karaage.", phone: "+65 8400 4005" },
  { name: "Curry House SG", desc: "Home-style fish head curry, mutton curry, and biryani for gatherings.", phone: "+65 8400 4006" },
  { name: "Uncle Wong's BBQ", desc: "Char siew, roast duck, and soy sauce chicken — catering available.", phone: "+65 8400 4007", email: "bbq@unclewong.sg" },
  { name: "Green Plate Kitchen", desc: "Plant-based home meals — tofu steak, mushroom rendang, and tempeh bowls.", phone: "+65 8400 4008" },
  { name: "Dumpling House SG", desc: "Handmade dumplings, bao, and wonton in 12 different fillings.", phone: "+65 8400 4009" },
  { name: "Kampong Flavours", desc: "Traditional Peranakan recipes — laksa, ayam buah keluak, and kueh pie tee.", phone: "+65 8400 4010", website: "https://kampongflavours.sg" },
];

const beauty: BizTemplate[] = [
  { name: "Glow Beauty Studio", desc: "Manicure, pedicure, lash extensions, and facials. By appointment only.", phone: "+65 8500 5001", email: "book@glowbeauty.sg" },
  { name: "Lash & Brow Bar", desc: "Eyelash extensions, brow embroidery, and lash lift specialists.", phone: "+65 8500 5002" },
  { name: "Nail It! SG", desc: "Gel manicure, nail art, and pedicure in a cozy home-based salon.", phone: "+65 8500 5003" },
  { name: "Skin Glow Aesthetics", desc: "Facial treatments, LED therapy, and microneedling for radiant skin.", phone: "+65 8500 5004", website: "https://skinglow.sg" },
  { name: "Brow Studio SG", desc: "Microblading, brow shaping, and lip blush — semi-permanent makeup.", phone: "+65 8500 5005", email: "info@browstudio.sg" },
  { name: "Zen Spa & Wellness", desc: "Full body massage, aromatherapy, and hot stone treatments at home.", phone: "+65 8500 5006" },
  { name: "Pretty Nails Express", desc: "Express manicure and pedicure services — walk-ins welcome.", phone: "+65 8500 5007" },
  { name: "HairDo Studio", desc: "Hair styling, rebonding, colouring, and keratin treatments.", phone: "+65 8500 5008" },
  { name: "The Wax Room", desc: "Professional waxing services — Brazilian, full body, and facial waxing.", phone: "+65 8500 5009", email: "book@waxroom.sg" },
  { name: "Aura Beauty Lounge", desc: "Bridal makeup, event styling, and personal colour analysis consultations.", phone: "+65 8500 5010" },
];

const petServices: BizTemplate[] = [
  { name: "Pawfect Care", desc: "Pet grooming, sitting, and dog walking. Home visits available.", phone: "+65 8600 6001" },
  { name: "Fluffy Tails Grooming", desc: "Professional grooming for dogs and cats — bath, trim, and nail clipping.", phone: "+65 8600 6002", email: "book@fluffytails.sg" },
  { name: "Happy Paws Boarding", desc: "Home-based pet boarding with 24/7 care and daily photo updates.", phone: "+65 8600 6003" },
  { name: "WalkieDog SG", desc: "Reliable daily dog walking services in your neighbourhood.", phone: "+65 8600 6004", website: "https://walkiedog.sg" },
  { name: "Pet Salon Express", desc: "Quick grooming sessions — 1-hour bath and blow dry for small breeds.", phone: "+65 8600 6005" },
  { name: "Purrfect Sitters", desc: "Cat sitting and home visits for cats, rabbits, and small pets.", phone: "+65 8600 6006" },
  { name: "K9 Training SG", desc: "Obedience training, puppy socialisation, and behaviour modification.", phone: "+65 8600 6007", email: "train@k9sg.com" },
  { name: "The Pet Pantry", desc: "Homemade dog treats, raw food prep, and pet nutrition consultations.", phone: "+65 8600 6008" },
  { name: "Aqua Pets SG", desc: "Aquarium setup, fish care, and tank maintenance services.", phone: "+65 8600 6009" },
  { name: "Bark Avenue Grooming", desc: "Luxury grooming with organic shampoo, teeth cleaning, and spa packages.", phone: "+65 8600 6010", website: "https://barkavenue.sg" },
];

const eventServices: BizTemplate[] = [
  { name: "PartyPop Decor", desc: "Balloon decorations and party setups for birthdays, weddings, and corporate events.", phone: "+65 8700 7001", email: "hello@partypop.sg" },
  { name: "Eventful SG", desc: "Full event planning — venue sourcing, catering coordination, and day-of management.", phone: "+65 8700 7002", website: "https://eventful.sg" },
  { name: "Balloon Bliss", desc: "Custom balloon garlands, arches, and centrepieces for all celebrations.", phone: "+65 8700 7003" },
  { name: "SG Party Rentals", desc: "Tables, chairs, tentage, and AV equipment rental for outdoor events.", phone: "+65 8700 7004" },
  { name: "KidsFest Entertainment", desc: "Magic shows, face painting, and mascot appearances for children's parties.", phone: "+65 8700 7005", email: "fun@kidsfest.sg" },
  { name: "Sound & Light Pro", desc: "Professional DJ, sound system, and lighting setup for events and weddings.", phone: "+65 8700 7006" },
  { name: "Wedding Bells SG", desc: "Wedding planning, bridal styling, and reception coordination.", phone: "+65 8700 7007", website: "https://weddingbells.sg" },
  { name: "Flash Mob SG", desc: "Surprise flash mob performances, proposal setups, and themed events.", phone: "+65 8700 7008" },
  { name: "Corporate Events Plus", desc: "Team-building activities, D&D planning, and corporate retreat coordination.", phone: "+65 8700 7009", email: "events@corpplus.sg" },
  { name: "Candy Cart SG", desc: "Dessert table styling with cotton candy, popcorn, and candy cart hire.", phone: "+65 8700 7010" },
];

const tailoring: BizTemplate[] = [
  { name: "Stitch & Style Tailoring", desc: "Expert alterations — suits, dresses, curtains, and traditional wear.", phone: "+65 8800 8001" },
  { name: "Perfect Fit Alterations", desc: "Quick and affordable clothing alterations — hems, zips, and resizing.", phone: "+65 8800 8002" },
  { name: "Bespoke Tailor SG", desc: "Custom-made suits, shirts, and cheongsam with premium fabrics.", phone: "+65 8800 8003", email: "measure@bespoke.sg" },
  { name: "Madam Sew", desc: "Home-based seamstress for curtains, cushion covers, and soft furnishings.", phone: "+65 8800 8004" },
  { name: "The Hem Bar", desc: "Same-day hemming and minor alterations at affordable prices.", phone: "+65 8800 8005" },
  { name: "Kebaya Queen", desc: "Traditional Malay and Peranakan kebaya tailoring and alterations.", phone: "+65 8800 8006", website: "https://kebayaqueen.sg" },
  { name: "Suit Up SG", desc: "Wedding suits, tuxedos, and formal wear — tailored to perfection.", phone: "+65 8800 8007" },
  { name: "Patchy's Repairs", desc: "Clothing repairs, patching, darning, and invisible mending services.", phone: "+65 8800 8008" },
  { name: "Sari & Salwar Studio", desc: "Indian ethnic wear tailoring — blouses, salwar kameez, and lehengas.", phone: "+65 8800 8009" },
  { name: "Quick Stitch Express", desc: "Express alterations in 2 hours — buttons, zips, and trouser hems.", phone: "+65 8800 8010", email: "express@quickstitch.sg" },
];

const cleaning: BizTemplate[] = [
  { name: "SparkleClean SG", desc: "Professional home cleaning — weekly, bi-weekly, or deep cleaning. Eco-friendly products.", phone: "+65 8900 9001" },
  { name: "Maid-To-Shine", desc: "Part-time and ad-hoc cleaning services for HDB and condo units.", phone: "+65 8900 9002", email: "book@maidtoshine.sg" },
  { name: "Deep Clean Pro", desc: "Move-in/move-out deep cleaning, spring cleaning, and post-renovation clean-up.", phone: "+65 8900 9003" },
  { name: "AirCon Clean SG", desc: "Aircon servicing, chemical wash, and gas top-up for all brands.", phone: "+65 8900 9004", website: "https://airconclean.sg" },
  { name: "Sofa & Mattress Cleaners", desc: "Professional upholstery cleaning — sofas, mattresses, and carpets.", phone: "+65 8900 9005" },
  { name: "Office Sparkle", desc: "Commercial cleaning for offices, co-working spaces, and retail shops.", phone: "+65 8900 9006" },
  { name: "Green Clean SG", desc: "100% eco-friendly cleaning using plant-based and non-toxic products.", phone: "+65 8900 9007", email: "hello@greenclean.sg" },
  { name: "Window Wizards", desc: "Exterior and interior window cleaning for landed and high-rise units.", phone: "+65 8900 9008" },
  { name: "Laundry Express SG", desc: "Wash, dry, and fold laundry service with free pickup and delivery.", phone: "+65 8900 9009" },
  { name: "Kitchen Blitz Cleaners", desc: "Kitchen deep cleaning — hood, hob, oven, and exhaust degreasing.", phone: "+65 8900 9010", website: "https://kitchenblitz.sg" },
];

const handyman: BizTemplate[] = [
  { name: "FixIt Handyman", desc: "Furniture assembly, shelf mounting, minor plumbing, and electrical fixes.", phone: "+65 9000 0001" },
  { name: "Mr Drill SG", desc: "Wall drilling, TV bracket mounting, and curtain rod installation.", phone: "+65 9000 0002", email: "drill@mrdrill.sg" },
  { name: "Plumber On Call", desc: "24/7 emergency plumbing — leaks, chokes, and pipe replacement.", phone: "+65 9000 0003" },
  { name: "Sparky Electrical", desc: "Licensed electrician for wiring, power point installation, and DB box servicing.", phone: "+65 9000 0004", website: "https://sparky.sg" },
  { name: "Door & Lock Pro", desc: "Door repair, lock replacement, and digital lock installation.", phone: "+65 9000 0005" },
  { name: "Paint Perfect SG", desc: "HDB and condo painting services — interior, exterior, and feature walls.", phone: "+65 9000 0006" },
  { name: "AC Repair Express", desc: "Fast aircon repair, gas top-up, and compressor replacement.", phone: "+65 9000 0007", email: "fix@acrepair.sg" },
  { name: "FloorFix SG", desc: "Vinyl flooring, parquet repair, and tile replacement services.", phone: "+65 9000 0008" },
  { name: "Roof & Waterproof SG", desc: "Roof leak repair, waterproofing, and ceiling crack fixing.", phone: "+65 9000 0009" },
  { name: "IKEA Assembly SG", desc: "Professional IKEA furniture assembly — wardrobes, desks, and shelving.", phone: "+65 9000 0010", website: "https://ikeaassembly.sg" },
];

const photography: BizTemplate[] = [
  { name: "LensWork Photography", desc: "Weddings, events, portraits, and product shoots. Drone footage available.", phone: "+65 9100 1001", email: "hello@lenswork.sg", website: "https://lenswork.sg" },
  { name: "SnapShot Studio", desc: "Professional passport photos, family portraits, and graduation shoots.", phone: "+65 9100 1002" },
  { name: "Cinematic Weddings SG", desc: "Cinematic wedding videography with same-day edits and drone coverage.", phone: "+65 9100 1003", website: "https://cinematicweddings.sg" },
  { name: "Product Shots SG", desc: "E-commerce product photography — flat lay, lifestyle, and 360° shots.", phone: "+65 9100 1004", email: "shoot@productshots.sg" },
  { name: "NewBorn Bliss Photo", desc: "Newborn and maternity photography in a warm, comfortable studio.", phone: "+65 9100 1005" },
  { name: "Event Lens SG", desc: "Corporate event photography — conferences, launches, and gala dinners.", phone: "+65 9100 1006" },
  { name: "Pet Portrait Studio", desc: "Professional pet photography — studio and outdoor shoots for your fur babies.", phone: "+65 9100 1007" },
  { name: "Food Stylist & Photographer", desc: "Menu shoots, food styling, and restaurant photography for F&B brands.", phone: "+65 9100 1008", email: "food@stylist.sg" },
  { name: "Drone View SG", desc: "Aerial photography and videography for real estate, events, and marketing.", phone: "+65 9100 1009", website: "https://droneview.sg" },
  { name: "Photo Booth Fun SG", desc: "Instant photo booth rental with props, backdrops, and custom prints.", phone: "+65 9100 1010" },
];

// Subcategory assignments per category — each business gets relevant subcategories
const CATEGORY_SUBCATEGORIES: Record<string, string[][]> = {
  "Tuition": [
    ["maths", "english"], ["maths", "english"], ["maths", "physics"], ["english", "maths"],
    ["maths", "english"], ["maths"], ["chemistry", "biology"], ["maths", "english"],
    ["maths", "english", "physics"], ["maths", "english"],
  ],
  "Baking": [
    ["cakes", "cupcakes"], ["bread", "pastries"], ["cakes", "custom-cakes"], ["cookies"],
    ["pastries", "cakes"], ["bread"], ["cakes", "custom-cakes"], ["pastries", "bread"],
    ["cakes", "pastries"], ["pastries", "custom-cakes"],
  ],
  "Music/Art/Craft": [
    ["music"], ["art", "craft"], ["music"], ["art"], ["music"],
    ["craft"], ["music"], ["craft", "art"], ["music"], ["art"],
  ],
  "Home Food": [
    ["malay-cuisine"], ["malay-cuisine", "indian-cuisine", "chinese-cuisine"], ["vegetarian-vegan", "meal-prep"],
    ["malay-cuisine"], ["meal-prep"], ["indian-cuisine"], ["chinese-cuisine"],
    ["vegetarian-vegan"], ["chinese-cuisine"], ["malay-cuisine", "chinese-cuisine"],
  ],
  "Beauty": [
    ["nails", "lashes"], ["lashes", "brows"], ["nails"], ["makeup"],
    ["brows", "makeup"], ["nails", "lashes"], ["nails"], ["hair"],
    ["nails", "lashes"], ["makeup", "hair"],
  ],
  "Pet Services": [
    ["basic-grooming", "pet-sitting"], ["basic-grooming"], ["pet-sitting"], ["dog-walking"],
    ["basic-grooming"], ["pet-sitting"], ["dog-walking"], ["pet-sitting"],
    ["pet-sitting"], ["basic-grooming"],
  ],
  "Event Services": [
    ["balloon-decoration"], ["party-planning", "catering-coordination"], ["balloon-decoration", "floral"],
    ["party-planning"], ["party-planning"], ["party-planning"], ["party-planning", "floral"],
    ["party-planning"], ["party-planning", "catering-coordination"], ["party-planning"],
  ],
  "Tailoring": [
    ["alterations"], ["alterations"], ["custom-clothing"], ["curtains"],
    ["alterations"], ["traditional-wear"], ["custom-clothing"], ["alterations"],
    ["traditional-wear", "custom-clothing"], ["alterations"],
  ],
  "Cleaning": [
    ["regular-cleaning", "deep-cleaning"], ["regular-cleaning"], ["deep-cleaning", "move-in-out"],
    ["regular-cleaning"], ["deep-cleaning"], ["regular-cleaning"], ["regular-cleaning"],
    ["regular-cleaning"], ["regular-cleaning"], ["deep-cleaning"],
  ],
  "Handyman": [
    ["carpenter", "plumber"], ["carpenter"], ["plumber"], ["minor-electrical"],
    ["carpenter"], ["patching-painting"], ["minor-electrical"], ["carpenter"],
    ["plumber", "patching-painting"], ["carpenter"],
  ],
  "Photography / Videography": [
    ["event-wedding", "drone"], ["portrait"], ["videography", "event-wedding"], ["product"],
    ["portrait"], ["event-wedding"], ["portrait"], ["product"],
    ["drone", "videography"], ["event-wedding"],
  ],
};

const categoryMap: Record<string, BizTemplate[]> = {
  "Tuition": tuition,
  "Baking": baking,
  "Music/Art/Craft": musicArtCraft,
  "Home Food": homeFood,
  "Beauty": beauty,
  "Pet Services": petServices,
  "Event Services": eventServices,
  "Tailoring": tailoring,
  "Cleaning": cleaning,
  "Handyman": handyman,
  "Photography / Videography": photography,
};

const CATEGORY_LOGOS: Record<string, string[]> = {
  "Tuition": [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=128&h=128&fit=crop",
  ],
  "Baking": [
    "https://images.unsplash.com/photo-1486427944544-d2c246c4d282?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=128&h=128&fit=crop",
  ],
  "Music/Art/Craft": [
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1596367407372-96cb88503db6?w=128&h=128&fit=crop",
  ],
  "Home Food": [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=128&h=128&fit=crop",
  ],
  "Beauty": [
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=128&h=128&fit=crop",
  ],
  "Pet Services": [
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=128&h=128&fit=crop",
  ],
  "Event Services": [
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=128&h=128&fit=crop",
  ],
  "Tailoring": [
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1592878897400-38a0f0a6d6f8?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1612731486606-2d66e8e61f84?w=128&h=128&fit=crop",
  ],
  "Cleaning": [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1527515637462-cee1143f1c67?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=128&h=128&fit=crop",
  ],
  "Handyman": [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1535350356005-fd52b3b524fb?w=128&h=128&fit=crop",
  ],
  "Photography / Videography": [
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=128&h=128&fit=crop",
    "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=128&h=128&fit=crop",
  ],
};

let idCounter = 1;
const allDemoListings: Listing[] = [];

Object.entries(categoryMap).forEach(([category, templates]) => {
  const logos = CATEGORY_LOGOS[category] || [];
  const subs = CATEGORY_SUBCATEGORIES[category] || [];
  templates.forEach((t, i) => {
    const district = pick(districts, idCounter);
    const coords = coord(district);
    const postalCode = String(100000 + idCounter * 137).slice(0, 6);
    const subcats = subs[i] || subs[0] || [];
    const subcategoryData: Record<string, any> = category === "Tuition"
      ? { subjects: subcats, levels: ["secondary"], syllabi: ["moe"] }
      : category === "Music/Art/Craft"
        ? { subcategory: subcats[0] || "music" }
        : { subcategories: subcats };
    const subcategoryList: string[] = category === "Tuition"
      ? subcats
      : category === "Music/Art/Craft"
        ? [subcats[0] || "music"]
        : subcats;
    allDemoListings.push({
      id: `demo-${idCounter}`,
      name: t.name,
      uen: `2023${String(idCounter).padStart(5, "0")}${String.fromCharCode(65 + (idCounter % 26))}`,
      category,
      district,
      address: `Blk ${100 + i} ${district} Street ${1 + (i % 5)}, Singapore ${postalCode}`,
      postalCode,
      phone: t.phone,
      email: t.email,
      website: t.website,
      description: t.desc,
      status: "approved",
      ownerId: "demo",
      logoUrl: logos[i % logos.length],
      subcategoryData,
      subcategoryList,
      lat: coords.lat + (Math.random() - 0.5) * 0.005,
      lng: coords.lng + (Math.random() - 0.5) * 0.005,
    });
    idCounter++;
  });
});

export const DEMO_ALL_LISTINGS: Listing[] = allDemoListings;
