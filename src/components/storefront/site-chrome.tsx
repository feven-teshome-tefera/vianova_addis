"use client";

import Link from "next/link";
import { Camera, Mail, Menu, Music2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { CartButton } from "./cart";

export function StorefrontHeader({ overlay = false }: { overlay?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const className = ["sf-header", overlay && "sf-header-overlay", scrolled && "is-scrolled"].filter(Boolean).join(" ");
  return <header className={className}><div className="sf-shell sf-nav"><Link className="sf-brand" href="/" aria-label="Via Nova Addis home"><span className="sf-logo-image"><img src="/assets/via-nova-tiktok-app-icon.png" alt=""/></span><span className="sf-logo"><span>VIA</span><span>NOVA</span><small>ADDIS</small></span></Link><nav aria-label="Main navigation"><Link href="/shop">Shop</Link><Link href="/about">Maison</Link></nav><div className="sf-nav-actions"><Link className="sf-nav-cta" href="/contact">Contact</Link><CartButton/><details className="sf-mobile-menu"><summary aria-label="Open navigation"><Menu/></summary><div><Link href="/shop">Shop</Link><Link href="/about">Maison</Link><Link href="/contact">Contact</Link></div></details></div></div></header>;
}

export function StorefrontFooter() {
  return <footer className="sf-footer"><div className="sf-shell"><div className="sf-footer-top"><div><Link className="sf-logo sf-logo-light" href="/" aria-label="Via Nova Addis home"><span>VIA</span><span>NOVA</span><small>ADDIS</small></Link><p>Authentic products, thoughtfully selected.</p></div><div className="sf-footer-links"><div><strong>Explore</strong><Link href="/shop">Shop</Link><Link href="/about">Our story</Link><Link href="/contact">Contact</Link></div><div><strong>Information</strong><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link></div><div><strong>Connect</strong><a href="mailto:vianovaitalian@gmail.com"><Mail size={15}/> Email</a><a href="https://t.me/vianova_addis" target="_blank" rel="noreferrer"><Send size={15}/> Telegram</a><a href="https://www.instagram.com/vianovaaddis/" target="_blank" rel="noreferrer"><Camera size={15}/> Instagram</a><a href="https://www.tiktok.com/@vianova_addis" target="_blank" rel="noreferrer"><Music2 size={15}/> TikTok</a></div></div></div><div className="sf-footer-bottom"><span>© {new Date().getFullYear()} Via Nova Addis. All rights reserved.</span><Link href="/admin">Admin</Link></div></div></footer>;
}
