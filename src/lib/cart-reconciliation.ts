import { z } from "zod";

export const cartValidationSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        sizeId: z.string().min(1).optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(50),
});

export type CartValidationLine = z.infer<typeof cartValidationSchema>["items"][number];

export type CartCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: "ETB" | "USD";
  stock: number;
  availability: string;
  status: string;
  image?: string;
  sizes: Array<{ id: string; label: string; stock: number }>;
};

export type ReconciledCartItem = {
  lineId: string;
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: "ETB" | "USD";
  stock: number;
  image?: string;
  sizeId?: string;
  sizeLabel?: string;
  quantity: number;
};

export type RemovedCartLine = CartValidationLine & {
  lineId: string;
  reason:
    | "PRODUCT_UNAVAILABLE"
    | "OUT_OF_STOCK"
    | "SIZE_REQUIRED"
    | "SIZE_UNAVAILABLE"
    | "PRODUCT_CHANGED";
};

export type AdjustedCartLine = {
  lineId: string;
  id: string;
  sizeId?: string;
  reason: "QUANTITY_REDUCED";
  from: number;
  to: number;
};

export type CartValidationResult = {
  items: ReconciledCartItem[];
  removed: RemovedCartLine[];
  adjusted: AdjustedCartLine[];
};

export function reconcileCartLines(
  requested: CartValidationLine[],
  catalog: CartCatalogProduct[],
): CartValidationResult {
  const products = new Map(catalog.map((product) => [product.id, product]));
  const items: ReconciledCartItem[] = [];
  const removed: RemovedCartLine[] = [];
  const adjusted: AdjustedCartLine[] = [];

  for (const line of requested) {
    const lineId = cartLineId(line.id, line.sizeId);
    const product = products.get(line.id);
    if (!product || product.status !== "PUBLISHED") {
      removed.push({ ...line, lineId, reason: "PRODUCT_UNAVAILABLE" });
      continue;
    }
    if (product.availability !== "IN_STOCK" || product.stock < 1) {
      removed.push({ ...line, lineId, reason: "OUT_OF_STOCK" });
      continue;
    }

    const size = line.sizeId
      ? product.sizes.find((candidate) => candidate.id === line.sizeId)
      : undefined;
    if (product.sizes.length && !line.sizeId) {
      removed.push({ ...line, lineId, reason: "SIZE_REQUIRED" });
      continue;
    }
    if (line.sizeId && !product.sizes.length) {
      removed.push({ ...line, lineId, reason: "PRODUCT_CHANGED" });
      continue;
    }
    if (line.sizeId && (!size || size.stock < 1)) {
      removed.push({ ...line, lineId, reason: "SIZE_UNAVAILABLE" });
      continue;
    }

    const stock = size?.stock ?? product.stock;
    const quantity = Math.min(line.quantity, stock);
    if (quantity !== line.quantity) {
      adjusted.push({
        lineId,
        id: line.id,
        sizeId: line.sizeId,
        reason: "QUANTITY_REDUCED",
        from: line.quantity,
        to: quantity,
      });
    }
    items.push({
      lineId,
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      currency: product.currency,
      stock,
      image: product.image,
      sizeId: size?.id,
      sizeLabel: size?.label,
      quantity,
    });
  }

  return { items, removed, adjusted };
}

export function cartLineId(id: string, sizeId?: string) {
  return `${id}:${sizeId ?? "default"}`;
}
