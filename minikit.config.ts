const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
    "accountAssociation": {
      "header": "eyJmaWQiOjEzMjk2NDUsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhEOERDREY2QjAzMzlkMEZFZDlkMDhiMmMxYTYzZTk2NDRDRTRhMmE5In0",
      "payload": "eyJkb21haW4iOiJub3d3aXQudmVyY2VsLmFwcCJ9",
      "signature": "rN0Z4fnahwc5ksWpF9K2EAaoDU3FDNcUtP5X2DGtStoNiOHmFSGVd6Hx15+N9fKmwdrGYGga5cL6Gw4goEXU8hs="
    },
  miniapp: {
    version: "1",
    name: "NowWit", 
    subtitle: "Your AI Ad Companion", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["marketing", "ads", "quickstart", "waitlist"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

