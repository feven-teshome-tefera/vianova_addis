import {db} from "@/lib/db";import {productRow} from "@/lib/admin-data";import {CATALOG_CATEGORY_NAMES} from "@/lib/catalog-categories";import {ProductsClient} from "./products-client";
export const dynamic="force-dynamic";
export default async function Products(){const products=await db.product.findMany({include:{category:true,media:{where:{isPrimary:true},take:1},publications:{orderBy:{createdAt:"desc"}}},orderBy:{updatedAt:"desc"}});return <ProductsClient products={products.map(productRow)} categories={[...CATALOG_CATEGORY_NAMES]}/>}
