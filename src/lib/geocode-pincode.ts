import { DISTRICT_COORDINATES } from "./districts";
import offlinePincodes from "./offline-pincodes.json";

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  /** Building name from OneMap, e.g. "THE TAPESTRY". Empty when unknown. */
  building: string;
  /** Block number from OneMap, e.g. "57". Empty when unknown. */
  block: string;
  /** Road name from OneMap, e.g. "TAMPINES STREET 86". Empty when unknown. */
  road: string;
  /** Postal code that OneMap actually returned. */
  postal: string;
  /** Exact district mapped from postal code sector, e.g. "Tampines" */
  district: string;
  /**
   * "exact"  – OneMap returned a row whose POSTAL matches the queried code
   *            AND has a road name → safe to save.
   * "partial" – OneMap returned something but it's missing road or differs
   *            from queried code → ask the user to confirm.
   * "approx" – Only the postal-sector centroid was available → not savable.
   */
  matchQuality: "exact" | "partial" | "approx";
}

/** Build the canonical "PostalCode, Building, Block N Road, Singapore" string. */
export function formatSgAddress(r: Pick<GeocodeResult, "building" | "block" | "road" | "postal">): string {
  const parts: string[] = [];
  if (r.postal) parts.push(r.postal);
  if (r.building) parts.push(r.building);
  const street = [r.block ? `Block ${r.block}` : "", r.road].filter(Boolean).join(" ").trim();
  if (street) parts.push(street);
  parts.push("Singapore");
  return parts.join(", ");
}

/**
 * Helper to fetch from OneMap, automatically routing through the Vite development proxy
 * if running on a local development origin to bypass CORS blocks.
 */
export async function fetchOneMap(urlPath: string): Promise<Response> {
  const fetchWithTimeout = async (url: string, ms: number) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  try {
    const res = await fetchWithTimeout(`/api-onemap${urlPath}`, 4000);
    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && !contentType.includes("text/html")) {
      return res;
    }
  } catch {
    // Fall through to direct fetch
  }

  return fetchWithTimeout(`https://www.onemap.gov.sg${urlPath}`, 4000);
}

export const SECTOR_TO_DISTRICT: Record<string, string> = {
  "01": "CBD / Raffles Place",
  "02": "CBD / Raffles Place",
  "03": "CBD / Raffles Place",
  "04": "Chinatown",
  "05": "Chinatown",
  "06": "Chinatown",
  "07": "CBD / Raffles Place",
  "08": "Chinatown",
  "09": "Bukit Merah",
  "10": "Bukit Merah",
  "11": "Queenstown",
  "12": "Queenstown",
  "13": "Queenstown",
  "14": "Bukit Merah",
  "15": "Bukit Merah",
  "16": "Bukit Merah",
  "17": "CBD / Raffles Place",
  "18": "Kallang",
  "19": "Kallang",
  "20": "Kallang",
  "21": "Kallang",
  "22": "Orchard",
  "23": "Orchard",
  "24": "Bukit Timah",
  "25": "Bukit Timah",
  "26": "Bukit Timah",
  "27": "Bukit Timah",
  "28": "Bukit Timah",
  "29": "Novena",
  "30": "Novena",
  "31": "Toa Payoh",
  "32": "Toa Payoh",
  "33": "Toa Payoh",
  "34": "Kallang",
  "35": "Kallang",
  "36": "Kallang",
  "37": "Kallang",
  "38": "Geylang",
  "39": "Geylang",
  "40": "Geylang",
  "41": "Geylang",
  "42": "Bedok",
  "43": "Bedok",
  "44": "Bedok",
  "45": "Bedok",
  "46": "Bedok",
  "47": "Bedok",
  "48": "Bedok",
  "49": "Changi",
  "50": "Changi",
  "81": "Changi",
  "51": "Pasir Ris",
  "52": "Tampines",
  "53": "Hougang",
  "54": "Sengkang",
  "55": "Serangoon",
  "82": "Punggol",
  "56": "Ang Mo Kio",
  "57": "Bishan",
  "58": "Bukit Timah",
  "59": "Bukit Timah",
  "60": "Jurong West",
  "61": "Jurong West",
  "62": "Jurong West",
  "63": "Jurong West",
  "64": "Jurong West",
  "69": "Jurong West",
  "70": "Jurong West",
  "71": "Jurong West",
  "65": "Bukit Batok",
  "66": "Jurong East",
  "67": "Jurong East",
  "68": "Jurong East",
  "72": "Bukit Batok",
  "73": "Bukit Batok",
  "74": "Bukit Batok",
  "75": "Woodlands",
  "76": "Woodlands",
  "77": "Sembawang",
  "78": "Yishun",
  "79": "Yishun",
  "80": "Sembawang",
};

/**
 * Find the nearest Singapore district name for a given location.
 *
 * Postal sector 43 spans multiple neighbourhoods. Tanjong Rhu and Mountbatten
 * belong with Kallang in this app's district taxonomy, so road/building data
 * must take precedence over the sector-wide Bedok fallback.
 */
export function nearestDistrict(
  lat: number,
  lng: number,
  postalCode?: string,
  addressHint = "",
): string {
  const normalizedHint = addressHint.toUpperCase();
  if (
    normalizedHint.includes("TANJONG RHU")
    || normalizedHint.includes("MOUNTBATTEN")
  ) {
    return "Kallang";
  }

  if (postalCode && postalCode.length >= 2) {
    const sector = postalCode.trim().slice(0, 2);
    if (SECTOR_TO_DISTRICT[sector]) {
      return SECTOR_TO_DISTRICT[sector];
    }
  }
  let best = "";
  let bestDist = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_COORDINATES)) {
    const dLat = lat - c.lat;
    const dLng = lng - c.lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// Approximate centroid for each Singapore postal sector (first 2 digits).
// Used as a fallback when OneMap returns no results for a valid 6-digit code.
const POSTAL_SECTOR_COORDS: Record<string, { lat: number; lng: number; area: string }> = {
  "01": { lat: 1.2840, lng: 103.8514, area: "Raffles Place" },
  "02": { lat: 1.2840, lng: 103.8514, area: "Raffles Place" },
  "03": { lat: 1.2840, lng: 103.8514, area: "Raffles Place" },
  "04": { lat: 1.2790, lng: 103.8430, area: "Tanjong Pagar" },
  "05": { lat: 1.2790, lng: 103.8430, area: "Tanjong Pagar" },
  "06": { lat: 1.2890, lng: 103.8470, area: "City Hall" },
  "07": { lat: 1.2950, lng: 103.8540, area: "Bugis" },
  "08": { lat: 1.2950, lng: 103.8540, area: "Bugis" },
  "09": { lat: 1.2730, lng: 103.8200, area: "Harbourfront" },
  "10": { lat: 1.2730, lng: 103.8200, area: "Harbourfront" },
  "11": { lat: 1.3200, lng: 103.8200, area: "Newton" },
  "12": { lat: 1.3343, lng: 103.8563, area: "Toa Payoh" },
  "13": { lat: 1.3300, lng: 103.8800, area: "Macpherson" },
  "14": { lat: 1.3201, lng: 103.8918, area: "Geylang" },
  "15": { lat: 1.3050, lng: 103.9050, area: "Katong" },
  "16": { lat: 1.3236, lng: 103.9273, area: "Bedok" },
  "17": { lat: 1.3644, lng: 103.9915, area: "Changi" },
  "18": { lat: 1.3496, lng: 103.9568, area: "Tampines" },
  "19": { lat: 1.3554, lng: 103.8679, area: "Serangoon" },
  "20": { lat: 1.3526, lng: 103.8352, area: "Bishan" },
  "21": { lat: 1.3300, lng: 103.8000, area: "Upper Bukit Timah" },
  "22": { lat: 1.3048, lng: 103.8318, area: "Orchard" },
  "23": { lat: 1.3294, lng: 103.8021, area: "Bukit Timah" },
  "24": { lat: 1.3400, lng: 103.7700, area: "Bukit Batok" },
  "25": { lat: 1.4382, lng: 103.7891, area: "Woodlands" },
  "26": { lat: 1.3700, lng: 103.7900, area: "Upper Thomson" },
  "27": { lat: 1.4304, lng: 103.8354, area: "Yishun" },
  "28": { lat: 1.3700, lng: 103.8700, area: "Seletar" },
  "29": { lat: 1.3300, lng: 103.8000, area: "Bukit Timah" },
  "30": { lat: 1.3300, lng: 103.8600, area: "Balestier" },
  "31": { lat: 1.3300, lng: 103.8600, area: "Balestier" },
  "32": { lat: 1.3300, lng: 103.8600, area: "Balestier" },
  "33": { lat: 1.3300, lng: 103.8600, area: "Balestier" },
  "34": { lat: 1.3100, lng: 103.8651, area: "Kallang" },
  "35": { lat: 1.3100, lng: 103.8651, area: "Kallang" },
  "36": { lat: 1.3100, lng: 103.8651, area: "Kallang" },
  "37": { lat: 1.3100, lng: 103.8651, area: "Kallang" },
  "38": { lat: 1.3201, lng: 103.8918, area: "Geylang" },
  "39": { lat: 1.3201, lng: 103.8918, area: "Geylang" },
  "40": { lat: 1.3201, lng: 103.8918, area: "Geylang" },
  "41": { lat: 1.3201, lng: 103.8918, area: "Geylang" },
  "42": { lat: 1.3050, lng: 103.9050, area: "Katong" },
  "43": { lat: 1.3050, lng: 103.9050, area: "Katong" },
  "44": { lat: 1.3050, lng: 103.9050, area: "Katong" },
  "45": { lat: 1.3050, lng: 103.9050, area: "Katong" },
  "46": { lat: 1.3236, lng: 103.9273, area: "Bedok" },
  "47": { lat: 1.3236, lng: 103.9273, area: "Bedok" },
  "48": { lat: 1.3236, lng: 103.9273, area: "Bedok" },
  "49": { lat: 1.3644, lng: 103.9915, area: "Changi" },
  "50": { lat: 1.3644, lng: 103.9915, area: "Changi" },
  "51": { lat: 1.3496, lng: 103.9568, area: "Tampines" },
  "52": { lat: 1.3496, lng: 103.9568, area: "Tampines" },
  "53": { lat: 1.3612, lng: 103.8863, area: "Hougang" },
  "54": { lat: 1.3868, lng: 103.8914, area: "Sengkang" },
  "55": { lat: 1.3554, lng: 103.8679, area: "Serangoon" },
  "56": { lat: 1.3691, lng: 103.8454, area: "Ang Mo Kio" },
  "57": { lat: 1.3691, lng: 103.8454, area: "Ang Mo Kio" },
  "58": { lat: 1.3300, lng: 103.8000, area: "Upper Bukit Timah" },
  "59": { lat: 1.3300, lng: 103.8000, area: "Bukit Timah" },
  "60": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "61": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "62": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "63": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "64": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "65": { lat: 1.3404, lng: 103.7090, area: "Jurong West" },
  "66": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "67": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "68": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "69": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "70": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "71": { lat: 1.3329, lng: 103.7436, area: "Jurong East" },
  "72": { lat: 1.3590, lng: 103.7637, area: "Bukit Batok" },
  "73": { lat: 1.3590, lng: 103.7637, area: "Bukit Batok" },
  "75": { lat: 1.4382, lng: 103.7891, area: "Woodlands" },
  "76": { lat: 1.4382, lng: 103.7891, area: "Woodlands" },
  "77": { lat: 1.3700, lng: 103.7900, area: "Upper Thomson" },
  "78": { lat: 1.3700, lng: 103.7900, area: "Upper Thomson" },
  "79": { lat: 1.4304, lng: 103.8354, area: "Yishun" },
  "80": { lat: 1.4304, lng: 103.8354, area: "Yishun" },
  "81": { lat: 1.3868, lng: 103.8914, area: "Sengkang" },
  "82": { lat: 1.3984, lng: 103.9072, area: "Punggol" },
};

/**
 * Geocode a Singapore postal code. Uses OneMap (free, no key) and falls
 * back to a postal-sector centroid when OneMap has no exact match.
 */
export async function geocodeSingaporePostalCode(
  postalCode: string
): Promise<GeocodeResult | null> {
  const cleaned = postalCode.trim();
  if (!/^\d{6}$/.test(cleaned)) return null;

  // 1. Check local high-density offline directory first (instant, CORS-free, 0 network requests!)
  const localMatch = (offlinePincodes as any[]).find((p) => p.postal === cleaned);
  if (localMatch) {
    const district = nearestDistrict(
      localMatch.lat,
      localMatch.lng,
      cleaned,
      `${localMatch.building || ""} ${localMatch.road || ""}`,
    );
    const partial = {
      lat: localMatch.lat,
      lng: localMatch.lng,
      building: localMatch.building || "",
      block: localMatch.block || "",
      road: localMatch.road || "",
      postal: cleaned,
      matchQuality: "exact" as const,
      district,
    };
    return { ...partial, address: formatSgAddress(partial) };
  }

  try {
    const res = await fetchOneMap(
      `/api/common/elastic/search?searchVal=${cleaned}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
    );
    const data = await res.json();
    if (data?.found > 0 && Array.isArray(data.results) && data.results.length) {
      const exact = data.results.find((r: any) => r.POSTAL === cleaned) || data.results[0];
      const lat = parseFloat(exact.LATITUDE);
      const lng = parseFloat(exact.LONGITUDE);
      if (!isNaN(lat) && !isNaN(lng)) {
        const block = exact.BLK_NO && exact.BLK_NO !== "NIL" ? String(exact.BLK_NO) : "";
        const road = exact.ROAD_NAME && exact.ROAD_NAME !== "NIL" ? String(exact.ROAD_NAME) : "";
        const building = exact.BUILDING && exact.BUILDING !== "NIL" ? String(exact.BUILDING) : "";
        const postal = exact.POSTAL && exact.POSTAL !== "NIL" ? String(exact.POSTAL) : cleaned;
        const matchQuality: GeocodeResult["matchQuality"] =
          postal === cleaned && !!road ? "exact" : "partial";
        const district = nearestDistrict(lat, lng, postal, `${building} ${road}`);
        const partial = { lat, lng, building, block, road, postal, matchQuality, district };
        return { ...partial, address: formatSgAddress(partial) };
      }
    }
  } catch {
    // fall through
  }

  // 3. Fallback to Google Maps Javascript SDK Geocoder if OneMap fails
  // This bypasses REST API IP restrictions because it is authorized via the browser domain.
  if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const gData: any = await new Promise((resolve) => {
        geocoder.geocode({ address: `${cleaned} Singapore` }, (results: any, status: any) => {
          if (status === "OK") resolve(results);
          else resolve(null);
        });
      });
      
      if (gData && gData.length > 0) {
        const result = gData[0];
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        let building = "";
        let block = "";
        let road = "";
        for (const comp of result.address_components) {
          if (comp.types.includes("premise") || comp.types.includes("subpremise")) building = comp.long_name;
          if (comp.types.includes("street_number")) block = comp.long_name;
          if (comp.types.includes("route")) road = comp.long_name;
        }
        if (!building && !road) {
          building = result.formatted_address.split(",")[0];
        }
        const district = nearestDistrict(lat, lng, cleaned, `${building} ${road}`);
        const partial = { lat, lng, building, block, road, postal: cleaned, matchQuality: "exact" as const, district };
        return { ...partial, address: formatSgAddress(partial) };
      }
    } catch {
      // fall through
    }
  }

  // 4. Fallback to Google Maps REST API if JS SDK is not fully loaded yet
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${cleaned}+Singapore&key=${googleKey}`);
      const gData = await gRes.json();
      if (gData.status === "OK" && gData.results.length > 0) {
        const result = gData.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        let building = "";
        let block = "";
        let road = "";
        for (const comp of result.address_components) {
          if (comp.types.includes("premise") || comp.types.includes("subpremise")) building = comp.long_name;
          if (comp.types.includes("street_number")) block = comp.long_name;
          if (comp.types.includes("route")) road = comp.long_name;
        }
        if (!building && !road) {
          building = result.formatted_address.split(",")[0];
        }
        const district = nearestDistrict(lat, lng, cleaned, `${building} ${road}`);
        const partial = { lat, lng, building, block, road, postal: cleaned, matchQuality: "exact" as const, district };
        return { ...partial, address: formatSgAddress(partial) };
      }
    } catch {
      // fall through to sector fallback
    }
  }

  // 5. Try to fetch the full offline directory from public folder if OneMap & Google failed
  try {
    const response = await fetch("/offline-pincodes.json");
    if (response.ok) {
      const fullList: any[] = await response.json();
      const match = fullList.find((p) => p[0] === cleaned);
      if (match) {
        const [postal, building, block, road, lat, lng] = match;
        const district = nearestDistrict(lat, lng, postal, `${building} ${road}`);
        const partial = { lat, lng, building, block, road, postal, matchQuality: "exact" as const, district };
        return { ...partial, address: formatSgAddress(partial) };
      }
    }
  } catch {
    // Ignore and fall through to sector approximation
  }

  const approx = POSTAL_SECTOR_COORDS[cleaned.slice(0, 2)];
  if (approx) {
    const district = nearestDistrict(approx.lat, approx.lng, cleaned);
    return {
      lat: approx.lat,
      lng: approx.lng,
      address: `${approx.area}, Singapore ${cleaned}`,
      building: "",
      block: "",
      road: "",
      postal: cleaned,
      matchQuality: "approx",
      district,
    };
  }
  return null;
}

export const isInSingapore = (lat: number, lng: number) =>
  lat >= 1.15 && lat <= 1.48 && lng >= 103.6 && lng <= 104.1;

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<GeocodeResult | null> {
  const isSg = isInSingapore(lat, lng);

  if (isSg) {
    try {
      const res = await fetchOneMap(
        `/api/public/revgeocode?location=${lat},${lng}&buffer=500&addressType=All`
      );
      const data = await res.json();
      const result = data?.GeocodeInfo?.[0] || data?.geocodeInfo?.[0];
      if (result) {
        const postal = String(result.POSTALCODE || result.POSTAL || "").trim();
        const block = String(result.BLOCK || result.BLK_NO || "").replace(/^NIL$/i, "").trim();
        const road = String(result.ROAD || result.ROAD_NAME || "").replace(/^NIL$/i, "").trim();
        const building = String(result.BUILDINGNAME || result.BUILDING || "").replace(/^NIL$/i, "").trim();
        const district = nearestDistrict(lat, lng, postal, `${building} ${road}`);
        const partial = { lat, lng, building, block, road, postal, matchQuality: postal ? "exact" as const : "partial" as const, district };
        return { ...partial, address: formatSgAddress(partial) };
      }
    } catch {
      // fall through to broader reverse-geocoding fallbacks
    }
  } else {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const address = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const details = data?.address || {};
        const district = [
          details.city || details.town || details.village || details.suburb,
          details.state,
          details.country,
        ].filter(Boolean).join(", ");
        return {
          lat,
          lng,
          building: details.building || details.house_name || "",
          block: details.house_number || "",
          road: details.road || "",
          postal: details.postcode || "",
          matchQuality: "exact",
          district,
          address,
        };
      }
    } catch {
      // fall through to Google only if open reverse-geocoding is unavailable
    }
  }

  if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const gData: any = await new Promise((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === "OK") resolve(results);
          else resolve(null);
        });
      });
      
      if (gData && gData.length > 0) {
        const result = gData[0];
        let building = "";
        let block = "";
        let road = "";
        let postal = "";
        
        for (const comp of result.address_components) {
          if (comp.types.includes("premise") || comp.types.includes("subpremise")) building = comp.long_name;
          if (comp.types.includes("street_number")) block = comp.long_name;
          if (comp.types.includes("route")) road = comp.long_name;
          if (comp.types.includes("postal_code")) postal = comp.long_name;
        }
        
        if (!building && !road) {
          building = result.formatted_address.split(",")[0];
        }
        
        const isSg = isInSingapore(lat, lng);
        let address = "";
        let district = "";
        
        if (isSg) {
          district = nearestDistrict(lat, lng, postal, `${building} ${road}`);
          const partial = { lat, lng, building, block, road, postal, matchQuality: "exact" as const, district };
          address = formatSgAddress(partial);
        } else {
          address = result.formatted_address;
          let city = "";
          let state = "";
          let country = "";
          for (const comp of result.address_components) {
            if (comp.types.includes("locality")) city = comp.long_name;
            if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
            if (comp.types.includes("country")) country = comp.long_name;
          }
          district = [city, state, country].filter(Boolean).join(", ");
        }
        
        return { lat, lng, building, block, road, postal, matchQuality: "exact" as const, district, address };
      }
    } catch {
      // fall through
    }
  }

  // Fallback to REST API if SDK not loaded
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`);
      const gData = await gRes.json();
      if (gData.status === "OK" && gData.results.length > 0) {
        const result = gData.results[0];
        let building = "";
        let block = "";
        let road = "";
        let postal = "";
        for (const comp of result.address_components) {
          if (comp.types.includes("premise") || comp.types.includes("subpremise")) building = comp.long_name;
          if (comp.types.includes("street_number")) block = comp.long_name;
          if (comp.types.includes("route")) road = comp.long_name;
          if (comp.types.includes("postal_code")) postal = comp.long_name;
        }
        if (!building && !road) {
          building = result.formatted_address.split(",")[0];
        }
        
        const isSg = isInSingapore(lat, lng);
        let address = "";
        let district = "";
        
        if (isSg) {
          district = nearestDistrict(lat, lng, postal, `${building} ${road}`);
          const partial = { lat, lng, building, block, road, postal, matchQuality: "exact" as const, district };
          address = formatSgAddress(partial);
        } else {
          address = result.formatted_address;
          let city = "";
          let state = "";
          let country = "";
          for (const comp of result.address_components) {
            if (comp.types.includes("locality")) city = comp.long_name;
            if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
            if (comp.types.includes("country")) country = comp.long_name;
          }
          district = [city, state, country].filter(Boolean).join(", ");
        }
        return { lat, lng, building, block, road, postal, matchQuality: "exact" as const, district, address };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

