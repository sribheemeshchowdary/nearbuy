// Shared brand tokens for all email templates
// Extracted from index.css design system

export const brand = {
  name: "Nearbuy",
  url: "https://nearbuy.sg",
  logo: "", // Add logo URL when available
  colors: {
    primary: "hsl(246, 80%, 60%)",
    primaryForeground: "hsl(0, 0%, 100%)",
    background: "hsl(220, 20%, 98%)",
    foreground: "hsl(220, 25%, 10%)",
    muted: "hsl(220, 15%, 46%)",
    accent: "hsl(172, 66%, 50%)",
    success: "hsl(152, 69%, 45%)",
    destructive: "hsl(0, 84%, 60%)",
    border: "hsl(220, 18%, 90%)",
    cardBg: "hsl(0, 0%, 100%)",
  },
  font: "'Inter', Arial, sans-serif",
  radius: "12px",
};

export const baseStyles = {
  body: `
    margin: 0;
    padding: 0;
    background-color: ${brand.colors.background};
    font-family: ${brand.font};
    -webkit-font-smoothing: antialiased;
  `,
  container: `
    max-width: 560px;
    margin: 0 auto;
    padding: 40px 20px;
  `,
  card: `
    background-color: ${brand.colors.cardBg};
    border-radius: ${brand.radius};
    border: 1px solid ${brand.colors.border};
    padding: 32px;
  `,
  heading: `
    color: ${brand.colors.foreground};
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 8px 0;
    line-height: 1.3;
  `,
  text: `
    color: ${brand.colors.muted};
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 16px 0;
  `,
  buttonPrimary: `
    display: inline-block;
    background-color: ${brand.colors.primary};
    color: ${brand.colors.primaryForeground};
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  `,
  buttonSuccess: `
    display: inline-block;
    background-color: ${brand.colors.success};
    color: ${brand.colors.primaryForeground};
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  `,
  buttonDestructive: `
    display: inline-block;
    background-color: ${brand.colors.destructive};
    color: ${brand.colors.primaryForeground};
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  `,
  infoBox: `
    background-color: ${brand.colors.background};
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  `,
  infoLabel: `
    color: ${brand.colors.muted};
    font-size: 12px;
    margin: 0 0 2px 0;
  `,
  infoValue: `
    color: ${brand.colors.foreground};
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  `,
  divider: `
    border: none;
    border-top: 1px solid ${brand.colors.border};
    margin: 24px 0;
  `,
  footer: `
    text-align: center;
    padding: 24px 0 0 0;
  `,
  footerText: `
    color: ${brand.colors.muted};
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  `,
  badge: (bg: string, color: string) => `
    display: inline-block;
    background-color: ${bg};
    color: ${color};
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  `,
};

// Helper to wrap content in the base email layout
export const wrapEmail = (subject: string, bodyHtml: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: ${brand.colors.primary}; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
        ${brand.name}
      </h2>
      <p style="color: ${brand.colors.muted}; font-size: 12px; margin: 4px 0 0 0;">Singapore Business Directory</p>
    </div>

    <!-- Card -->
    <div style="${baseStyles.card}">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="${baseStyles.footer}">
      <p style="${baseStyles.footerText}">
        © ${new Date().getFullYear()} ${brand.name}. All rights reserved.<br/>
        <a href="${brand.url}" style="color: ${brand.colors.primary}; text-decoration: none;">Visit our directory</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
