import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface ImageRejectedData {
  businessName: string;
  ownerName?: string;
  imageType: "logo" | "photos";
  dashboardUrl: string;
  supportEmail?: string;
}

export const imageRejectedSubject = (data: ImageRejectedData) =>
  `⚠️ Your ${data.imageType === "logo" ? "logo" : "photos"} for "${data.businessName}" could not be approved`;

export const imageRejectedHtml = (data: ImageRejectedData) =>
  wrapEmail(imageRejectedSubject(data), `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(0, 84%, 95%); line-height: 56px; font-size: 28px;">
        🚫
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">${data.imageType === "logo" ? "Logo" : "Photos"} Not Approved</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hi ${data.ownerName}, w` : "W"}e've reviewed the updated <strong style="color: ${brand.colors.foreground};">${data.imageType === "logo" ? "logo" : "gallery photos"}</strong> for <strong style="color: ${brand.colors.foreground};">${data.businessName}</strong> and unfortunately ${data.imageType === "logo" ? "it" : "they"} could not be approved. Your previous ${data.imageType === "logo" ? "logo" : "photos"} will remain active.
    </p>

    <div style="${baseStyles.infoBox}">
      <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">Common reasons for rejection:</p>
      <ul style="color: ${brand.colors.muted}; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
        <li>Low resolution or blurry images</li>
        <li>Inappropriate or offensive content</li>
        <li>Misleading or unrelated images</li>
        <li>Copyright or trademark issues</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.dashboardUrl}" style="${baseStyles.buttonPrimary}">
        Upload New ${data.imageType === "logo" ? "Logo" : "Photos"} →
      </a>
    </div>

    <hr style="${baseStyles.divider}" />

    <p style="${baseStyles.text} font-size: 12px; text-align: center;">
      Need help? ${data.supportEmail ? `Contact <a href="mailto:${data.supportEmail}" style="color: ${brand.colors.primary}; text-decoration: none;">${data.supportEmail}</a>` : "Reach out to our support team"} and we'll assist you.
    </p>
  `);
