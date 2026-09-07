import type { MetadataRoute } from "next";
import { ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/* Generated from live products so a newly published item is discoverable without a deploy. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({ where: { status: ProductStatus.PUBLISHED }, select: { slug: true, updatedAt: true } });
  const pages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/links`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
  return [...pages, ...products.map((product) => ({ url: `${siteUrl}/shop/${product.slug}`, lastModified: product.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 }))];
}
