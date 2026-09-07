import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Send, ShieldCheck, Truck } from "lucide-react";
import { ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatProductPrice } from "@/components/storefront/product-card";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
import { AddToCartButton } from "@/components/storefront/cart";
import { absoluteUrl, siteName } from "@/lib/site";

/* cache() so generateMetadata and the page itself share one query rather than two. */
const getProduct = cache(async (slug: string) => db.product.findFirst({ where: { slug, status: ProductStatus.PUBLISHED }, include: { category: true, media: { orderBy: { position: "asc" } }, sizes: { where: { isActive: true }, orderBy: { position: "asc" } } } }));

const summarise = (product: { shortDescription: string | null; description: string }) => {
  const text = (product.shortDescription ?? product.description).replace(/\s+/g, " ").trim();
  return text.length > 155 ? `${text.slice(0, 152).trimEnd()}…` : text;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const image = product.media.find((item) => item.type === "IMAGE" && item.isPrimary) ?? product.media.find((item) => item.type === "IMAGE");
  const description = summarise(product);
  const path = `/shop/${product.slug}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName, title: `${product.name} | ${siteName}`, description, url: absoluteUrl(path), images: image ? [{ url: absoluteUrl(image.url), alt: product.name }] : undefined },
    twitter: { card: "summary_large_image", title: product.name, description, images: image ? [absoluteUrl(image.url)] : undefined },
  };
}
export const dynamic = "force-dynamic";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) { const product=await getProduct((await params).slug); if(!product)notFound(); const images=product.media.filter((item)=>item.type==="IMAGE"); const primary=images.find(item=>item.isPrimary)??images[0]; const available=product.availability==="IN_STOCK"&&product.stock>0; const sizeText=product.sizes.length?` Available sizes: ${product.sizes.filter(size=>size.stock>0).map(size=>size.label).join(", ")}.`:""; const orderText=encodeURIComponent(`Hello Via Nova, I am interested in ${product.name} (${formatProductPrice(product.price,product.currency)}).${sizeText} Is it available?`); const productSchema={"@context":"https://schema.org","@type":"Product",name:product.name,description:summarise(product),category:product.category.name,image:images.map((item)=>absoluteUrl(item.url)),...(product.sku?{sku:product.sku}:{}),brand:{"@type":"Brand",name:siteName},offers:{"@type":"Offer",url:absoluteUrl(`/shop/${product.slug}`),price:Number(product.price),priceCurrency:product.currency,availability:available?"https://schema.org/InStock":"https://schema.org/OutOfStock",seller:{"@type":"Organization",name:siteName}}};
 return <div className="storefront"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(productSchema)}}/><StorefrontHeader/><main className="sf-shell sf-product-page"><Link className="sf-back" href="/shop"><ArrowLeft size={16}/> Back to shop</Link><div className="sf-product-layout"><div className="sf-gallery">{images.length?images.map((image)=><img key={image.id} src={image.url} alt={product.name}/>):<div className="sf-gallery-empty">{product.name.slice(0,2).toUpperCase()}</div>}</div><div className="sf-product-detail"><span className="sf-kicker">{product.category.name}</span><h1>{product.name}</h1><strong className="sf-detail-price">{formatProductPrice(product.price,product.currency)}</strong><p className="sf-detail-description">{product.description}</p><div className={`sf-stock ${available?"available":"unavailable"}`}><Check size={16}/>{available?`In stock · ${product.stock} available`:"Currently unavailable"}</div><AddToCartButton sizes={product.sizes.map(size=>({id:size.id,label:size.label,stock:available?size.stock:0}))} product={{id:product.id,slug:product.slug,name:product.name,price:Number(product.price),currency:product.currency,stock:available?product.stock:0,image:primary?.url}}/><a className="sf-telegram-order" href={`https://t.me/vianova_addis?text=${orderText}`} target="_blank" rel="noreferrer"><Send size={15}/> Ask on Telegram</a><div className="sf-detail-notes"><span><ShieldCheck/> Carefully selected for quality</span><span><Truck/> Free delivery on orders of 5 items or more</span></div></div></div></main><StorefrontFooter/></div>; }
