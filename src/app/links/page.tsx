import Link from "next/link";
import { Camera, Mail, MessageCircle, Music2, ShoppingBag } from "lucide-react";

export const metadata = { title: "Via Nova Addis · Links", description: "Shop, socials and contact for Via Nova Addis." };

/* The QR printed on cards and packaging points here, so this list is the one place to edit
   when a channel changes — the printed code never has to change. */
const links = [
  { href: "/shop", icon: ShoppingBag, label: "Shop the collection", detail: "vianovaaddis.store", primary: true },
  { href: "https://www.instagram.com/vianovaaddis/", icon: Camera, label: "Instagram", detail: "@vianovaaddis" },
  { href: "https://www.tiktok.com/@vianova_addis", icon: Music2, label: "TikTok", detail: "@vianova_addis" },
  { href: "https://t.me/vianova_addis", icon: MessageCircle, label: "Telegram", detail: "@vianova_addis" },
  { href: "mailto:vianovaitalian@gmail.com", icon: Mail, label: "Email us", detail: "vianovaitalian@gmail.com" },
];

export default function LinksPage() {
  return <div className="storefront sf-links-page">
    <main className="sf-links">
      <Link className="sf-brand sf-links-brand" href="/" aria-label="Via Nova Addis home"><span className="sf-logo-image"><img src="/assets/via-nova-tiktok-app-icon.png" alt=""/></span><span className="sf-logo"><span>VIA</span><span>NOVA</span><small>ADDIS</small></span></Link>
      <p className="sf-kicker">Addis Ababa</p>
      <h1>Find us everywhere</h1>
      <p className="sf-links-intro">Italian-inspired pieces, delivered across Addis Ababa.</p>
      <nav className="sf-links-list" aria-label="Via Nova channels">
        {links.map(({ href, icon: Icon, label, detail, primary }) => {
          const external = href.startsWith("http") || href.startsWith("mailto:");
          const className = `sf-links-item${primary ? " is-primary" : ""}`;
          const body = <><Icon aria-hidden/><span><strong>{label}</strong><small>{detail}</small></span></>;
          return external
            ? <a key={href} className={className} href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">{body}</a>
            : <Link key={href} className={className} href={href}>{body}</Link>;
        })}
      </nav>
      <p className="sf-links-foot">© {new Date().getFullYear()} Via Nova Addis</p>
    </main>
  </div>;
}
