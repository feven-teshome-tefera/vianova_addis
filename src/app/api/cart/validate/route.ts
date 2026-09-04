import { MediaType } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  cartValidationSchema,
  reconcileCartLines,
  type CartCatalogProduct,
} from "@/lib/cart-reconciliation";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const input = cartValidationSchema.parse(await request.json());
    if (!input.items.length) {
      return NextResponse.json({ items: [], removed: [], adjusted: [] });
    }

    const ids = [...new Set(input.items.map((item) => item.id))];
    const products = await db.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        currency: true,
        stock: true,
        availability: true,
        status: true,
        media: {
          where: { type: MediaType.IMAGE },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
          select: { url: true },
        },
        sizes: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          select: { id: true, label: true, stock: true },
        },
      },
    });
    const catalog: CartCatalogProduct[] = products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      currency: product.currency,
      stock: product.stock,
      availability: product.availability,
      status: product.status,
      image: product.media[0]?.url,
      sizes: product.sizes,
    }));

    return NextResponse.json(reconcileCartLines(input.items, catalog));
  } catch (error) {
    return apiError(error, {
      context: "validate-cart",
      defaultMessage: "We couldn’t refresh your bag. Your items are still saved; try again shortly.",
    });
  }
}
