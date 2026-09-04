import Link from "next/link";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";

export default function NotFound() {
  return <div className="storefront">
    <StorefrontHeader/>
    <main className="sf-error-page">
      <p className="sf-kicker">Page not found</p>
      <h1>We couldn&apos;t find that page.</h1>
      <p>The page may have moved, or the address may be incorrect. You can return to the shop or contact us for help.</p>
      <div className="sf-error-actions">
        <Link className="sf-button sf-button-dark" href="/shop">Browse the shop</Link>
        <Link className="sf-button sf-button-light" href="/">Return home</Link>
        <Link className="sf-error-contact" href="/contact">Contact us</Link>
      </div>
    </main>
    <StorefrontFooter/>
  </div>;
}
