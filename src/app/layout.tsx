import type { Metadata } from "next"; import "./globals.css";
import { CartProvider } from "@/components/storefront/cart";
import { absoluteUrl, contactEmail, logoImage, shareImage, siteDescription, siteName, siteUrl, socialProfiles } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s | ${siteName}` },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName, title: siteName, description: siteDescription, url: siteUrl, locale: "en_ET", images: [{ ...shareImage, alt: siteName }] },
  twitter: { card: "summary_large_image", title: siteName, description: siteDescription, images: [shareImage.url] },
  robots: { index: true, follow: true },
};

/* Identity for search engines and AI answer engines. Only facts we actually hold — no
   invented street address, phone number or opening hours. */
const store = {
  "@context": "https://schema.org", "@type": "Store", "@id": `${siteUrl}#store`,
  name: siteName, url: siteUrl, description: siteDescription,
  image: absoluteUrl(shareImage.url), logo: absoluteUrl(logoImage), email: contactEmail,
  currenciesAccepted: "ETB",
  address: { "@type": "PostalAddress", addressLocality: "Addis Ababa", addressCountry: "ET" },
  areaServed: { "@type": "City", name: "Addis Ababa" },
  sameAs: socialProfiles,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(store) }}/><CartProvider>{children}</CartProvider></body></html>;
}
