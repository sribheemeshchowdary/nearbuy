import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface ListingRejectedData {
  businessName: string;
  category: string;
  ownerName?: string;
  rejectionReason: string;
  dashboardUrl: string;
  supportEmail?: string;
}

export const listingRejectedSubject = (data: ListingRejectedData) =>
  `Action needed: "${data.businessName}" listing requires changes`;

export const listingRejectedHtml = (data: ListingRejectedData) =>
  wrapEmail(listingRejectedSubject(data), `
    <!-- Warning Icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(0, 84%, 95%); line-height: 56px; font-size: 28px;">
        ⚠️
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">Listing Not Approved</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hi ${data.ownerName}, w` : "W"}e've reviewed <strong style="color: ${brand.colors.foreground};">${data.businessName}</strong> and unfortunately it couldn't be approved at this time. Please review the feedback below and resubmit.
    </p>

    <!-- Rejection Reason -->
    <div style="background-color: hsl(0, 84%, 97%); border: 1px solid hsl(0, 84%, 90%); border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: ${brand.colors.destructive}; font-size: 12px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        Reason for Rejection
      </p>
      <p style="color: ${brand.colors.foreground}; font-size: 14px; line-height: 1.5; margin: 0;">
        ${data.rejectionReason}
      </p>
    </div>

    <!-- What to do -->
    <div style="${baseStyles.infoBox}">
      <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">What you can do:</p>
      <ol style="color: ${brand.colors.muted}; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Review the rejection reason above</li>
        <li>Go to your dashboard and update your listing</li>
        <li>Make the necessary corrections</li>
        <li>Your listing will be re-submitted for review automatically</li>
      </ol>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.dashboardUrl}" style="${baseStyles.buttonPrimary}">
        Update Your Listing →
      </a>
    </div>

    <hr style="${baseStyles.divider}" />

    <p style="${baseStyles.text} font-size: 12px; text-align: center;">
      Need help? Reply to this email${data.supportEmail ? ` or contact <a href="mailto:${data.supportEmail}" style="color: ${brand.colors.primary}; text-decoration: none;">${data.supportEmail}</a>` : ""} and we'll assist you.
    </p>
  `);
