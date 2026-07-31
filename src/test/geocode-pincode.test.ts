import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeSingaporePostalCode, formatSgAddress, nearestDistrict } from "@/lib/geocode-pincode";

const mockOneMap = (results: any[]) => {
  (globalThis as any).fetch = vi.fn().mockResolvedValue({
    json: async () => ({ found: results.length, results }),
  });
};

describe("geocodeSingaporePostalCode", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns exact match with building, block, road for The Tapestry (528542)", async () => {
    mockOneMap([{
      POSTAL: "528542",
      BLK_NO: "57",
      ROAD_NAME: "TAMPINES STREET 86",
      BUILDING: "THE TAPESTRY",
      LATITUDE: "1.3582",
      LONGITUDE: "103.9425",
    }]);
    const r = await geocodeSingaporePostalCode("528542");
    expect(r).not.toBeNull();
    expect(r!.matchQuality).toBe("exact");
    expect(r!.building).toBe("THE TAPESTRY");
    expect(r!.block).toBe("57");
    expect(r!.road).toBe("TAMPINES STREET 86");
    expect(r!.postal).toBe("528542");
    expect(r!.district).toBe("Tampines");
    expect(r!.address).toContain("528542");
    expect(r!.address).toContain("THE TAPESTRY");
    expect(r!.address).toContain("Block 57");
    expect(r!.address).toContain("TAMPINES STREET 86");
    expect(r!.address).toContain("Singapore");
  });

  it("marks as partial when road is missing", async () => {
    mockOneMap([{
      POSTAL: "528542", BLK_NO: "NIL", ROAD_NAME: "NIL", BUILDING: "X",
      LATITUDE: "1.35", LONGITUDE: "103.94",
    }]);
    const r = await geocodeSingaporePostalCode("528542");
    expect(r!.matchQuality).toBe("partial");
  });

  it("falls back to approx sector when fetch fails", async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const r = await geocodeSingaporePostalCode("528542");
    expect(r!.matchQuality).toBe("approx");
    expect(r!.building).toBe("");
  });

  it("rejects invalid postal codes", async () => {
    expect(await geocodeSingaporePostalCode("12")).toBeNull();
    expect(await geocodeSingaporePostalCode("abcdef")).toBeNull();
  });
});

describe("formatSgAddress", () => {
  it("produces the canonical 'postal, building, block road, Singapore' string", () => {
    expect(formatSgAddress({
      postal: "528542", building: "The Tapestry", block: "57", road: "Tampines Street 86",
    })).toBe("528542, The Tapestry, Block 57 Tampines Street 86, Singapore");
  });

  it("omits empty parts gracefully", () => {
    expect(formatSgAddress({
      postal: "238872", building: "", block: "", road: "Orchard Road",
    })).toBe("238872, Orchard Road, Singapore");
  });
});

describe("nearestDistrict", () => {
  it("classifies Tanjong Rhu as Kallang instead of the sector 43 Bedok fallback", () => {
    expect(nearestDistrict(
      1.2975,
      103.8858,
      "436000",
      "Tanjong Rhu Road",
    )).toBe("Kallang");
  });

  it("classifies Mountbatten addresses as Kallang", () => {
    expect(nearestDistrict(
      1.3029,
      103.8838,
      "437000",
      "Mountbatten Road",
    )).toBe("Kallang");
  });

  it("keeps other sector 43 addresses on the existing Bedok fallback", () => {
    expect(nearestDistrict(
      1.3048,
      103.9040,
      "437900",
      "East Coast Road",
    )).toBe("Bedok");
  });
});
