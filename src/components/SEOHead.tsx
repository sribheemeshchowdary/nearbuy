import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  canonical?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_NAME = "Nearbuy";
const DEFAULT_DESC = "Discover top-rated local businesses in Singapore. Find restaurants, services, healthcare, and more — verified and trusted.";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  image,
  url,
  type = "website",
  canonical,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Singapore Business Directory`;
  const canonicalUrl = canonical || url;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && (
        <script type="application/ld+json">
          {/* Escape < > & so user-controlled data (listing name/description) can't
              break out of the <script> tag — prevents stored XSS via JSON-LD. */}
          {JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026")}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
