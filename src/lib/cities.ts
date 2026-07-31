export interface City {
  id: string;
  name: string;
  country: string;
  slug: string;
  lat: number;
  lng: number;
  description: string;
}

export const CITIES: City[] = [
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    slug: "singapore",
    lat: 1.3521,
    lng: 103.8198,
    description: "The Lion City — a global hub for business, technology, and cuisine.",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    slug: "kuala-lumpur",
    lat: 3.1390,
    lng: 101.6869,
    description: "Malaysia's capital — a vibrant mix of modern skyscrapers and cultural landmarks.",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    slug: "jakarta",
    lat: -6.2088,
    lng: 106.8456,
    description: "Indonesia's bustling capital and the largest city in Southeast Asia.",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    slug: "bangkok",
    lat: 13.7563,
    lng: 100.5018,
    description: "Thailand's capital — famous for street food, temples, and nightlife.",
  },
  {
    id: "ho-chi-minh",
    name: "Ho Chi Minh City",
    country: "Vietnam",
    slug: "ho-chi-minh",
    lat: 10.8231,
    lng: 106.6297,
    description: "Vietnam's economic powerhouse with a dynamic startup scene.",
  },
];

export const DEFAULT_CITY = CITIES[0];

export const getCityBySlug = (slug: string): City | undefined =>
  CITIES.find((c) => c.slug === slug);
