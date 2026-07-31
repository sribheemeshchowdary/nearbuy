import { describe, it, expect } from "vitest";
import { resolveInstagram, resolveWebsite } from "@/lib/contact-links";

describe("resolveInstagram", () => {
  it("uses the dedicated instagram field when present", () => {
    expect(resolveInstagram({ instagram: "@primary" })).toBe("@primary");
  });

  it("falls back to a secondary slot holding an Instagram value", () => {
    // The common case: owner picks WhatsApp as primary and adds Instagram as
    // the secondary social — previously invisible on the public page.
    expect(resolveInstagram({ secondary: { method: "instagram", value: "@secondary" } })).toBe("@secondary");
  });

  it("prefers the dedicated field over the secondary slot", () => {
    expect(resolveInstagram({ instagram: "@primary", secondary: { method: "instagram", value: "@secondary" } })).toBe("@primary");
  });

  it("ignores a secondary slot that is not Instagram", () => {
    expect(resolveInstagram({ secondary: { method: "whatsapp", value: "+6591234567" } })).toBe("");
  });

  it("falls back to the top-level instagramUrl field", () => {
    // Some listings store Instagram in the top-level `instagramUrl` (admin
    // edit / legacy / seed data) rather than contactDetails.
    expect(resolveInstagram(undefined, "https://instagram.com/legacybiz")).toBe("https://instagram.com/legacybiz");
    expect(resolveInstagram({}, "@fromtoplevel")).toBe("@fromtoplevel");
    // contactDetails still wins over the top-level field.
    expect(resolveInstagram({ instagram: "@primary" }, "@toplevel")).toBe("@primary");
  });

  it("returns empty for missing/blank data", () => {
    expect(resolveInstagram(undefined)).toBe("");
    expect(resolveInstagram({ instagram: "   " })).toBe("");
  });
});

describe("resolveWebsite", () => {
  it("prefers the top-level website", () => {
    expect(resolveWebsite({ website: "cd.example.com" }, "top.example.com")).toBe("top.example.com");
  });

  it("falls back to contactDetails.website then the secondary slot", () => {
    expect(resolveWebsite({ website: "cd.example.com" })).toBe("cd.example.com");
    expect(resolveWebsite({ secondary: { method: "website", value: "sec.example.com" } })).toBe("sec.example.com");
  });

  it("returns empty when nothing is set", () => {
    expect(resolveWebsite(undefined)).toBe("");
  });
});
