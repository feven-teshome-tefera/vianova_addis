import {PageHead} from "@/components/admin/common";import {ProductForm} from "@/components/products/product-form";import {CATALOG_CATEGORY_SLUGS,sortCatalogCategories} from "@/lib/catalog-categories";import {db} from "@/lib/db";
export const dynamic="force-dynamic";
export default async function NewProduct(){const categories=sortCatalogCategories(await db.category.findMany({where:{slug:{in:CATALOG_CATEGORY_SLUGS}},select:{id:true,name:true,slug:true}}));return <><PageHead title="Add product" description="Create once, then publish everywhere."/><ProductForm categories={categories}/></>}
