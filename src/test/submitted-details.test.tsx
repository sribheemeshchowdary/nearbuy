import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmittedDetails } from "@/pages/Admin";
import type { Listing } from "@/components/ListingCard";

// A listing carrying the full spread of customer-submitted fields, including the
// ones the admin UI previously hid (Instagram, website, WhatsApp message,
// secondary contact, UEN, owner name, subcategories, service locations,
// compliance). Cast through `any` because AddListing writes a few fields that
// aren't on the Listing type (serviceLocations, complianceChecks, unitNumber…).
const fullListing = {
  id: "l1",
  name: "Sunrise Bakes",
  uen: "202312345A",
  category: "Baking",
  district: "Tampines",
  address: "Blk 123 Tampines St 11",
  postalCode: "521123",
  unitNumber: "#05-67",
  ownerName: "Aisha Rahman",
  status: "pending_approval",
  ownerId: "u1",
  contactEmail: "aisha@sunrisebakes.sg",
  primaryContact: "instagram",
  subcategoryList: ["cakes", "cupcakes"],
  serviceLocations: ["at-my-home", "online"],
  complianceChecks: { "sfa-comply": true, "no-catering": true, "unchecked-gate": false },
  contactDetails: {
    whatsapp: "+6591234567",
    whatsappMessage: "Hi! Keen to order.",
    instagram: "@sunrisebakes",
    website: "sunrisebakes.sg",
    secondary: { method: "whatsapp", value: "+6598887777" },
  },
} as unknown as Listing;

describe("SubmittedDetails", () => {
  it("surfaces every customer-submitted field, including Instagram", () => {
    render(<SubmittedDetails listing={fullListing} />);

    // The field the user reported as missing.
    expect(screen.getByText("@sunrisebakes")).toBeInTheDocument();
    // Instagram renders as a clickable profile link.
    const ig = screen.getByText("@sunrisebakes").closest("a");
    expect(ig).toHaveAttribute("href", "https://instagram.com/sunrisebakes");

    // Website is a link too.
    const site = screen.getByText("sunrisebakes.sg").closest("a");
    expect(site).toHaveAttribute("href", "https://sunrisebakes.sg");

    // The rest of the previously-hidden data.
    expect(screen.getByText("Aisha Rahman")).toBeInTheDocument();
    expect(screen.getByText("202312345A")).toBeInTheDocument();
    expect(screen.getByText(/#05-67/)).toBeInTheDocument();
    expect(screen.getByText(/Hi! Keen to order\./)).toBeInTheDocument();
    expect(screen.getByText(/whatsapp: \+6598887777/)).toBeInTheDocument();
    expect(screen.getByText("cakes, cupcakes")).toBeInTheDocument();
    expect(screen.getByText("at-my-home, online")).toBeInTheDocument();
    // Only the confirmed compliance gates show (the false one is filtered out).
    expect(screen.getByText("sfa-comply, no-catering")).toBeInTheDocument();
  });

  it("renders nothing when there is no submitted data", () => {
    const bare = { id: "x", name: "n", uen: "", category: "c", district: "", address: "", postalCode: "", status: "approved", ownerId: "o" } as unknown as Listing;
    const { container } = render(<SubmittedDetails listing={bare} />);
    expect(container.firstChild).toBeNull();
  });
});
