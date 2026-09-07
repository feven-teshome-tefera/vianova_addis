/* One source of truth for the public identity used by metadata, sitemaps and JSON-LD. */
const PRODUCTION_URL = "https://www.vianovaaddis.store";
/* Canonicals, sitemaps and JSON-LD must always name the public site. NEXT_PUBLIC_APP_URL is
   http://localhost:3000 in development and could be stale in any environment, so it only wins
   when it is a real public https origin — otherwise a deploy would advertise localhost. */
const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
const usable = configured && /^https:\/\//i.test(configured) && !/^https:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(configured);
export const siteUrl = (usable ? configured : PRODUCTION_URL).replace(/\/+$/, "");
export const siteName = "Via Nova Addis";
export const siteDescription = "Italian-inspired clothing and accessories, delivered across Addis Ababa.";
export const contactEmail = "vianovaitalian@gmail.com";
export const socialProfiles = ["https://www.instagram.com/vianovaaddis/", "https://www.tiktok.com/@vianova_addis", "https://t.me/vianova_addis"];
export const shareImage = { url: "/assets/via-nova-hero.webp", width: 1708, height: 920 };
export const logoImage = "/assets/via-nova-tiktok-app-icon.png";
export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`);
