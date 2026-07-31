// Vercel serverless tracking pixel — one per business.
//
//   GET /api/pixel?id=<listingId>
//
// Returns a 1x1 transparent GIF and records a view for that specific listing by
// incrementing its `viewCount` in Firestore via the REST API. Uses the same
// public "+1 to viewCount" security rule the in-app tracker relies on, so no
// service-account credentials are needed. The pixel is always returned, even if
// tracking fails, so an embedded <img> never shows broken.

// 43-byte 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export default async function handler(req, res) {
  const sendPixel = () => {
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.status(200).send(PIXEL);
  };

  try {
    const id = String((req.query && req.query.id) || "").trim();
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    // Validate the id (Firestore auto-ids are alphanumeric) and config before writing.
    const validId = id && id.length <= 128 && /^[A-Za-z0-9_-]+$/.test(id);
    if (validId && projectId && apiKey) {
      const base = `projects/${projectId}/databases/(default)/documents`;
      const url = `https://firestore.googleapis.com/v1/${base}:commit?key=${apiKey}`;
      const body = {
        writes: [
          {
            transform: {
              document: `${base}/listings/${id}`,
              fieldTransforms: [
                { fieldPath: "viewCount", increment: { integerValue: "1" } },
              ],
            },
          },
        ],
      };
      // Fire the write but never let it block or break the pixel response.
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }
  } catch {
    // ignore — always return the pixel
  }

  return sendPixel();
}
