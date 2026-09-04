import { ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ShopBrowser } from "@/components/storefront/shop-browser";
import { StorefrontFooter, StorefrontHeader } from "@/components/storefront/site-chrome";
import { CATALOG_CATEGORY_NAMES, CATALOG_CATEGORY_SLUGS } from "@/lib/catalog-categories";
import { toStoreProduct } from "@/lib/storefront-product";
export const dynamic = "force-dynamic";
export const metadata = { title: "Shop", description: "Explore the Via Nova collection." };
export default async function ShopPage() { const products=(await db.product.findMany({where:{status:ProductStatus.PUBLISHED,category:{slug:{in:CATALOG_CATEGORY_SLUGS}}},include:{category:true,media:{orderBy:{position:"asc"}},sizes:{where:{isActive:true},orderBy:{position:"asc"}}},orderBy:{updatedAt:"desc"}})).map(toStoreProduct); return <div className="storefront"><StorefrontHeader/><main className="sf-shell sf-shop"><div className="sf-page-heading"><span className="sf-kicker">Via Nova</span><h1>The Collection</h1></div><ShopBrowser products={products} categories={[...CATALOG_CATEGORY_NAMES]}/></main><StorefrontFooter/></div>; }
