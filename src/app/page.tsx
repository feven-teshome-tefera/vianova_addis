import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/storefront/product-card";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
import { toStoreProduct } from "@/lib/storefront-product";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = (await db.product.findMany({ where: { status: ProductStatus.PUBLISHED }, include: { category: true, media: { orderBy: { position: "asc" } }, sizes: { where: { isActive: true }, orderBy: { position: "asc" } } }, orderBy: { updatedAt: "desc" }, take: 6 })).map(toStoreProduct);
  return <div className="storefront"><StorefrontHeader overlay/><main>
    <section className="sf-hero"><div className="sf-shell sf-hero-grid"><div className="sf-hero-copy"><h1>Via<br/>Nova</h1><p>Selected with intention.</p><div className="sf-actions"><Link className="sf-button sf-button-dark" href="/shop">Shop now <ArrowRight size={17}/></Link></div></div></div></section>
    <section className="sf-marquee" aria-label="Via Nova values"><span>Authentic</span><i>✦</i><span>Considered</span><i>✦</i><span>Timeless</span></section>
    <section className="sf-section sf-shell"><div className="sf-section-heading"><div><span className="sf-kicker">New selection</span><h2>The latest edit</h2></div><Link href="/shop">View all <ArrowRight size={16}/></Link></div>{products.length ? <div className="sf-product-grid">{products.map((product)=><ProductCard key={product.id} product={product}/>)}</div> : <div className="sf-empty"><h3>Coming soon.</h3></div>}</section>
    <section className="sf-story"><div className="sf-shell sf-story-grid"><div className="sf-story-mark">VN</div><div><span className="sf-kicker">Via Nova</span><h2>From Italy<br/>Chosen to last.</h2><p>Quality pieces for women and men, selected for their timeless character—not passing trends.</p><Link href="/about">Our story <ArrowRight size={16}/></Link></div></div></section>
  </main><StorefrontFooter/></div>;
}
