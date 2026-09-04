"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected storefront error", error);
  }, [error]);

  return <div className="storefront">
    <StorefrontHeader/>
    <main className="sf-error-page" aria-live="polite">
      <p className="sf-kicker">We&apos;re sorry</p>
      <h1>We couldn&apos;t open this page.</h1>
      <p>Please try again. If the page still does not open, you can return to the shop or contact us for help.</p>
      <div className="sf-error-actions">
        <button type="button" className="sf-button sf-button-dark" onClick={reset}>Try again</button>
        <Link className="sf-button sf-button-light" href="/shop">Return to shop</Link>
        <Link className="sf-error-contact" href="/contact">Contact us</Link>
      </div>
    </main>
    <StorefrontFooter/>
  </div>;
}
