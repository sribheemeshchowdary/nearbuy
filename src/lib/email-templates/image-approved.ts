import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface ImageApprovedData {
  businessName: string;
  ownerName?: string;
  imageType: "logo" | "photos";
  dashboardUrl: string;
}

export const imageApprovedSubject = (data: ImageApprovedData) =>
  `✅ Your ${data.imageType === "logo" ? "logo" : "photos"} for "${data.businessName}" ${data.imageType === "logo" ? "has" : "have"} been approved!`;

export const imageApprovedHtml = (data: ImageApprovedData) =>
  wrapEmail(imageApprovedSubject(data), `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(152, 69%, 95%); line-height: 56px; font-size: 28px;">
        🖼️
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">${data.imageType === "logo" ? "Logo" : "Photos"} Approved!</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hi ${data.ownerName}, y` : "Y"}our updated <strong style="color: ${brand.colors.foreground};">${data.imageType === "logo" ? "logo" : "gallery photos"}</strong> for <strong style="color: ${brand.colors.foreground};">${data.businessName}</strong> ${data.imageType === "logo" ? "has" : "have"} been reviewed and approved. The changes are now live on your listing.
    </p>

    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.dashboardUrl}" style="${baseStyles.buttonSuccess}">
        View Your Dashboard →
      </a>
    </div>

    <hr style="${baseStyles.divider}" />

    <p style="${baseStyles.text} font-size: 12px; text-align: center;">
      💡 <strong>Tip:</strong> Keep your listing fresh with high-quality images to attract more customers.
    </p>
  `);
