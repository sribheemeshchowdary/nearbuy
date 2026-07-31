// Minimal Open Location Code (Plus Code) encoder.
// Minimal Open Location Code encoder used for local display labels.
const ALPHABET = "23456789CFGHJMRVWX";
const SEP = "+";
const SEP_POS = 8;
const PADDING = "0";
const ENC_BASE = 20;
const PAIR_CODE_LEN = 10;

export function encodePlusCode(lat: number, lng: number, codeLength = PAIR_CODE_LEN): string {
  if (codeLength < 2 || (codeLength < SEP_POS && codeLength % 2 === 1)) {
    codeLength = PAIR_CODE_LEN;
  }
  lat = Math.min(90, Math.max(-90, lat));
  if (lat === 90) lat = lat - 1e-10;
  lng = ((lng + 180) % 360 + 360) % 360 - 180;

  let latVal = Math.floor(Math.round((lat + 90) * 8000 * 1e6) / 1e6);
  let lngVal = Math.floor(Math.round((lng + 180) * 8000 * 1e6) / 1e6);

  let code = "";
  for (let i = 0; i < PAIR_CODE_LEN / 2; i++) {
    code = ALPHABET[lngVal % ENC_BASE] + code;
    code = ALPHABET[latVal % ENC_BASE] + code;
    latVal = Math.floor(latVal / ENC_BASE);
    lngVal = Math.floor(lngVal / ENC_BASE);
    if (i === 0) code = SEP + code;
  }
  if (codeLength < SEP_POS) {
    code = code.substring(0, codeLength) + Array(SEP_POS - codeLength + 1).join(PADDING) + SEP;
  } else {
    code = code.substring(0, codeLength + 1);
  }
  return code;
}

// Short form: drop the first 4 chars (region prefix), append locality.
// e.g. "6PH59R5C+8X" + "Bedok" -> "59R5C+8X Bedok"
export function shortPlusCode(full: string, locality?: string): string {
  const trimmed = full.length > 8 ? full.substring(4) : full;
  return locality ? `${trimmed} ${locality}` : trimmed;
}
