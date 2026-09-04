import { describe, expect, it } from "vitest";
import {
  cartValidationSchema,
  reconcileCartLines,
  type CartCatalogProduct,
} from "@/lib/cart-reconciliation";

function product(
  overrides: Partial<CartCatalogProduct> = {},
): CartCatalogProduct {
  return {
    id: "product-1",
    slug: "linen-shirt",
    name: "Linen Shirt",
    price: 2400,
    currency: "ETB",
    stock: 5,
    availability: "IN_STOCK",
    status: "PUBLISHED",
    image: "/uploads/linen-shirt.jpg",
    sizes: [],
    ...overrides,
  };
}

describe("cart reconciliation", () => {
  it("removes missing and no-longer-published products", () => {
    const result = reconcileCartLines(
      [
        { id: "deleted-product", quantity: 1 },
        { id: "archived-product", quantity: 2 },
      ],
      [product({ id: "archived-product", status: "ARCHIVED" })],
    );

    expect(result.items).toEqual([]);
    expect(result.removed).toEqual([
      {
        id: "deleted-product",
        quantity: 1,
        lineId: "deleted-product:default",
        reason: "PRODUCT_UNAVAILABLE",
      },
      {
        id: "archived-product",
        quantity: 2,
        lineId: "archived-product:default",
        reason: "PRODUCT_UNAVAILABLE",
      },
    ]);
    expect(result.adjusted).toEqual([]);
  });

  it("returns current server details instead of stale cart details", () => {
    const result = reconcileCartLines(
      [{ id: "product-1", quantity: 2 }],
      [
        product({
          slug: "updated-linen-shirt",
          name: "Italian Linen Shirt",
          price: 2750,
          currency: "USD",
          stock: 8,
          image: "/uploads/updated-shirt.jpg",
        }),
      ],
    );

    expect(result.items).toEqual([
      {
        lineId: "product-1:default",
        id: "product-1",
        slug: "updated-linen-shirt",
        name: "Italian Linen Shirt",
        price: 2750,
        currency: "USD",
        stock: 8,
        image: "/uploads/updated-shirt.jpg",
        sizeId: undefined,
        sizeLabel: undefined,
        quantity: 2,
      },
    ]);
    expect(result.removed).toEqual([]);
    expect(result.adjusted).toEqual([]);
  });

  it("reduces quantity to current stock and records the adjustment", () => {
    const result = reconcileCartLines(
      [{ id: "product-1", quantity: 5 }],
      [product({ stock: 2 })],
    );

    expect(result.items[0]).toMatchObject({ quantity: 2, stock: 2 });
    expect(result.adjusted).toEqual([
      {
        lineId: "product-1:default",
        id: "product-1",
        sizeId: undefined,
        reason: "QUANTITY_REDUCED",
        from: 5,
        to: 2,
      },
    ]);
  });

  it("uses current size details and size-level stock", () => {
    const result = reconcileCartLines(
      [{ id: "product-1", sizeId: "size-m", quantity: 4 }],
      [
        product({
          stock: 7,
          sizes: [{ id: "size-m", label: "Medium", stock: 2 }],
        }),
      ],
    );

    expect(result.items[0]).toMatchObject({
      lineId: "product-1:size-m",
      sizeId: "size-m",
      sizeLabel: "Medium",
      stock: 2,
      quantity: 2,
    });
    expect(result.adjusted[0]).toMatchObject({
      lineId: "product-1:size-m",
      reason: "QUANTITY_REDUCED",
      from: 4,
      to: 2,
    });
  });

  it("removes lines when a required size is missing or unavailable", () => {
    const sizedProduct = product({
      sizes: [
        { id: "size-s", label: "Small", stock: 3 },
        { id: "size-m", label: "Medium", stock: 0 },
      ],
    });
    const result = reconcileCartLines(
      [
        { id: "product-1", quantity: 1 },
        { id: "product-1", sizeId: "size-m", quantity: 1 },
        { id: "product-1", sizeId: "removed-size", quantity: 1 },
      ],
      [sizedProduct],
    );

    expect(result.items).toEqual([]);
    expect(result.removed.map(({ reason }) => reason)).toEqual([
      "SIZE_REQUIRED",
      "SIZE_UNAVAILABLE",
      "SIZE_UNAVAILABLE",
    ]);
  });

  it("removes a sized line when the product no longer has sizes", () => {
    const result = reconcileCartLines(
      [{ id: "product-1", sizeId: "old-size", quantity: 1 }],
      [product()],
    );

    expect(result.items).toEqual([]);
    expect(result.removed[0]).toMatchObject({
      lineId: "product-1:old-size",
      reason: "PRODUCT_CHANGED",
    });
  });
});

describe("cart validation schema", () => {
  it("accepts the documented maximum item count and quantity", () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      id: `product-${index}`,
      quantity: 99,
    }));

    expect(cartValidationSchema.safeParse({ items }).success).toBe(true);
  });

  it("rejects more than 50 items and quantities outside 1 through 99", () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => ({
      id: `product-${index}`,
      quantity: 1,
    }));

    expect(cartValidationSchema.safeParse({ items: tooMany }).success).toBe(false);
    expect(
      cartValidationSchema.safeParse({
        items: [{ id: "product-1", quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      cartValidationSchema.safeParse({
        items: [{ id: "product-1", quantity: 100 }],
      }).success,
    ).toBe(false);
    expect(
      cartValidationSchema.safeParse({
        items: [{ id: "product-1", quantity: 1.5 }],
      }).success,
    ).toBe(false);
  });
});
