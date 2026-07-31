import { baseStyles, brand, wrapEmail } from "./base-layout";

export interface WelcomeEmailData {
  ownerName?: string;
  email: string;
  addListingUrl: string;
  directoryUrl: string;
}

export const welcomeSubject = () =>
  `Welcome to ${brand.name} — Let's get your business listed! 🚀`;

export const welcomeHtml = (data: WelcomeEmailData) =>
  wrapEmail(welcomeSubject(), `
    <!-- Wave Icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; border-radius: 50%; background-color: hsl(246, 80%, 95%); line-height: 56px; font-size: 28px;">
        👋
      </div>
    </div>

    <h1 style="${baseStyles.heading} text-align: center;">Welcome to ${brand.name}!</h1>
    <p style="${baseStyles.text} text-align: center;">
      ${data.ownerName ? `Hey ${data.ownerName}, y` : "Y"}our account has been created successfully. You're now part of Singapore's trusted business directory.
    </p>

    <!-- Getting started steps -->
    <div style="${baseStyles.infoBox}">
      <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0 0 12px 0;">🎯 Get started in 3 steps:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; vertical-align: top; width: 30px;">
            <span style="${baseStyles.badge(brand.colors.primary, brand.colors.primaryForeground)}">1</span>
          </td>
          <td style="padding: 8px 0; padding-left: 12px;">
            <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0;">Add your business</p>
            <p style="color: ${brand.colors.muted}; font-size: 12px; margin: 2px 0 0;">Fill in your business details, UEN, and contact info</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; vertical-align: top;">
            <span style="${baseStyles.badge(brand.colors.primary, brand.colors.primaryForeground)}">2</span>
          </td>
          <td style="padding: 8px 0; padding-left: 12px;">
            <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0;">Upload documents</p>
            <p style="color: ${brand.colors.muted}; font-size: 12px; margin: 2px 0 0;">Share your ACRA profile and other verification docs</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; vertical-align: top;">
            <span style="${baseStyles.badge(brand.colors.primary, brand.colors.primaryForeground)}">3</span>
          </td>
          <td style="padding: 8px 0; padding-left: 12px;">
            <p style="color: ${brand.colors.foreground}; font-size: 13px; font-weight: 600; margin: 0;">Get verified</p>
            <p style="color: ${brand.colors.muted}; font-size: 12px; margin: 2px 0 0;">Our team reviews your listing within 24 hours</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 24px 0 8px;">
      <a href="${data.addListingUrl}" style="${baseStyles.buttonPrimary}">
        Add Your Business →
      </a>
    </div>
    <div style="text-align: center; margin-top: 12px;">
      <a href="${data.directoryUrl}" style="color: ${brand.colors.primary}; font-size: 13px; text-decoration: none; font-weight: 500;">
        Browse the directory
      </a>
    </div>

    <hr style="${baseStyles.divider}" />

    <p style="${baseStyles.text} font-size: 12px; text-align: center;">
      You're receiving this because you signed up with <strong>${data.email}</strong>.
    </p>
  `);
