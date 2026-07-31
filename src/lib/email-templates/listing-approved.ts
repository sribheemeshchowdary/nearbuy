import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface ListingApprovedData {
  businessName: string;
  category: string;
  district: string;
  ownerName?: string;
  listingUrl: string;
  dashboardUrl: string;
}

export const listingApprovedSubject = (data: ListingApprovedData) =>
  `🎉 Your business "${data.businessName}" has been approved!`;

export const listingApprovedHtml = (data: ListingApprovedData) =>
  wrapEmail(listingApprovedSubject(data), `
    <!-- Success Icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(152, 69%, 95%); line-height: 56px; font-size: 28px;">
        ✅
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">Your Business is Live!</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hey ${data.ownerName}, g` : "G"}reat news — <strong style="color: ${brand.colors.foreground};">${data.businessName}</strong> has been reviewed and approved. Your listing is now visible to thousands of users in the ${brand.name} directory.
    </p>

    <!-- Business Info -->
    <div style="${baseStyles.infoBox}">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">
            <p style="${baseStyles.infoLabel}">Business</p>
            <p style="${baseStyles.infoValue}">${data.businessName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">
            <p style="${baseStyles.infoLabel}">Category</p>
            <p style="${baseStyles.infoValue}">${data.category}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">
            <p style="${baseStyles.infoLabel}">District</p>
            <p style="${baseStyles.infoValue}">${data.district}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.listingUrl}" style="${baseStyles.buttonSuccess}">
        View Your Listing →
      </a>
    </div>
    <div style="text-align: center; margin-top: 12px;">
      <a href="${data.dashboardUrl}" style="color: ${brand.colors.primary}; font-size: 13px; text-decoration: none; font-weight: 500;">
        Go to Dashboard
      </a>
    </div>

    <hr style="${baseStyles.divider}" />

    <p style="${baseStyles.text} font-size: 12px; text-align: center;">
      💡 <strong>Tip:</strong> Add photos, offers, and business hours from your dashboard to attract more customers.
    </p>
  `);
