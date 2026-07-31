import { getMapsScriptSrc, isGoogleMapsApiKeyFormatValid } from "@/lib/google-maps-loader";

describe("Google Maps loader configuration", () => {
  it("uses Google's asynchronous direct-loading parameters", () => {
    const src = new URL(getMapsScriptSrc("AIza12345678901234567890123456789012345"));

    expect(src.searchParams.get("loading")).toBe("async");
    expect(src.searchParams.get("callback")).toBe("__nearbuyGoogleMapsReady");
    expect(src.searchParams.get("libraries")).toBe("maps");
    expect(src.searchParams.get("v")).toBe("weekly");
  });

  it("rejects the common uppercase-I/lowercase-L key typo", () => {
    expect(isGoogleMapsApiKeyFormatValid("AlzaSyInvalidKeyValue123456789012345")).toBe(false);
    expect(isGoogleMapsApiKeyFormatValid("AIza12345678901234567890123456789012345")).toBe(true);
  });
});
