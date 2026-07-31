import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface ListingExpiryData {
  businessName: string;
  ownerName?: string;
  daysUntilExpiry: number;
  expiryDate: string;
  dashboardUrl: string;
  renewUrl: string;
}

export const listingExpirySubject = (data: ListingExpiryData) =>
  `⏰ "${data.businessName}" listing expires in ${data.daysUntilExpiry} days`;

export const listingExpiryHtml = (data: ListingExpiryData) =>
  wrapEmail(listingExpirySubject(data), `
    <!-- Clock Icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(38, 92%, 95%); line-height: 56px; font-size: 28px;">
        ⏰
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">Your Listing is Expiring Soon</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hi ${data.ownerName}, y` : "Y"}our listing for <strong style="color: ${brand.colors.foreground};">${data.businessName}</strong> will expire on <strong style="color: ${brand.colors.foreground};">${data.expiryDate}</strong>. Renew now to keep your business visible.
    </p>

    <!-- Urgency Box -->
    <div style="background-color: hsl(38, 92%, 96%); border: 1px solid hsl(38, 92%, 85%); border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
      <p style="color: hsl(38, 80%, 35%); font-size: 28px; font-weight: 800; margin: 0;">
        ${data.daysUntilExpiry}
      </p>
      <p style="color: hsl(38, 80%, 35%); font-size: 13px; font-weight: 600; margin: 4px 0 0;">
        days remaining
      </p>
    </div>

    <div style="${baseStyles.infoBox}">
      <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">What happens if it expires?</p>
      <ul style="color: ${brand.colors.muted}; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Your listing will be hidden from search results</li>
        <li>Customers won't be able to find your business</li>
        <li>Your reviews and ratings will be preserved</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.renewUrl}" style="${baseStyles.buttonPrimary}">
        Renew Now →
      </a>
    </div>
    <div style="text-align: center; margin-top: 12px;">
      <a href="${data.dashboardUrl}" style="color: ${brand.colors.primary}; font-size: 13px; text-decoration: none; font-weight: 500;">
        Go to Dashboard
      </a>
    </div>
  `);
