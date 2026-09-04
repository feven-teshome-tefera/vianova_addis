"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unexpected application error", error);
  }, [error]);

  return <html lang="en">
    <body>
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fbfaf7", color: "#191714", textAlign: "center" }}>
        <section style={{ maxWidth: 560 }}>
          <p style={{ color: "#8b612f", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase" }}>Via Nova</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "clamp(40px, 7vw, 64px)", margin: "18px 0" }}>The site could not load.</h1>
          <p style={{ color: "#685e52", lineHeight: 1.7 }}>Please refresh the page. If the problem continues, wait a moment and try again.</p>
          <button type="button" onClick={reset} style={{ marginTop: 24, border: "1px solid #191714", background: "#191714", color: "white", padding: "14px 24px", cursor: "pointer" }}>Try again</button>
        </section>
      </main>
    </body>
  </html>;
}
