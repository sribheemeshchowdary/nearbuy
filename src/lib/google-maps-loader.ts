const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";
const GOOGLE_MAPS_CALLBACK_NAME = "__nearbuyGoogleMapsReady";

type GoogleMapsWindow = Window & typeof globalThis & {
  google?: typeof google;
  gm_authFailure?: () => void;
  __nearbuyGoogleMapsReady?: () => void;
};

let googleMapsLoadPromise: Promise<void> | null = null;

export const isGoogleMapsApiKeyFormatValid = (apiKey: string) =>
  /^AIza[0-9A-Za-z_-]{30,}$/.test(apiKey.trim());

export const getMapsScriptSrc = (apiKey: string) => {
  const params = new URLSearchParams({
    key: apiKey,
    loading: "async",
    libraries: "maps",
    v: "weekly",
    callback: GOOGLE_MAPS_CALLBACK_NAME,
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
};

/** Load Google Maps once and share the result between every rendered map. */
export const loadGoogleMapsApi = (apiKey: string): Promise<void> => {
  const mapsWindow = window as GoogleMapsWindow;
  if (mapsWindow.google?.maps) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  if (!isGoogleMapsApiKeyFormatValid(apiKey)) {
    return Promise.reject(new Error("Invalid Google Maps API key configuration"));
  }

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const previousAuthFailure = mapsWindow.gm_authFailure;

    const restoreCallbacks = () => {
      if (mapsWindow.__nearbuyGoogleMapsReady === handleReady) {
        delete mapsWindow.__nearbuyGoogleMapsReady;
      }
      if (mapsWindow.gm_authFailure === handleAuthFailure) {
        mapsWindow.gm_authFailure = previousAuthFailure;
      }
    };

    const fail = (message: string) => {
      restoreCallbacks();
      document.getElementById(GOOGLE_MAPS_SCRIPT_ID)?.remove();
      googleMapsLoadPromise = null;
      reject(new Error(message));
    };

    const handleReady = () => {
      restoreCallbacks();
      resolve();
    };

    const handleAuthFailure = () => {
      previousAuthFailure?.();
      fail("Google Maps rejected the configured API key");
    };

    mapsWindow.__nearbuyGoogleMapsReady = handleReady;
    mapsWindow.gm_authFailure = handleAuthFailure;

    const desiredSrc = getMapsScriptSrc(apiKey);
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (existingScript.getAttribute("src") === desiredSrc) return;
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = desiredSrc;
    script.async = true;
    script.onerror = () => fail("Failed to load Google Maps");
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};
