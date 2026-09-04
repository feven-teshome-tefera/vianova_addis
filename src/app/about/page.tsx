import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
export const metadata={title:"Our Story"};
export default function AboutPage(){return <div className="storefront"><StorefrontHeader/><main><section className="sf-content-hero"><div className="sf-shell"><span className="sf-kicker">Our story</span><h1>From Italy<br/>Chosen to last.</h1></div></section><section className="sf-shell sf-prose"><p className="sf-prose-lead">Via Nova brings together carefully selected pieces from Italy for women and men.</p><h2>Beyond fast fashion.</h2><p>We choose quality over passing trends—products distinguished by their craftsmanship, character, and timeless look.</p><Link className="sf-button sf-button-dark" href="/shop">View the collection <ArrowRight size={17}/></Link></section></main><StorefrontFooter/></div>}
