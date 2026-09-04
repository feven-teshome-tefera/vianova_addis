import Link from "next/link";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";

export default function ProductNotFound() {
  return <div className="storefront">
    <StorefrontHeader/>
    <main className="sf-error-page">
      <p className="sf-kicker">Product unavailable</p>
      <h1>This product is no longer in the shop.</h1>
      <p>It may be sold out or no longer available. Browse the current collection, or contact us if you need help finding something similar.</p>
      <div className="sf-error-actions">
        <Link className="sf-button sf-button-dark" href="/shop">Browse available products</Link>
        <Link className="sf-button sf-button-light" href="/contact">Contact us</Link>
      </div>
    </main>
    <StorefrontFooter/>
  </div>;
}
