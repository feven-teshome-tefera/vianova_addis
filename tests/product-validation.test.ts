import { describe, expect, it } from "vitest";
import { productSchema, publishSchema } from "@/lib/validation/product";

const valid = {
  name: "Coffee",
  description: "Fresh roast",
  categoryId: "cat",
  price: 10,
  currency: "ETB",
  stock: 2,
  sizes: [],
  availability: "IN_STOCK",
  platforms: ["WEBSITE"],
};

describe("product validation", () => {
  it("accepts a valid product without sizes", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid per-size stock", () => {
    expect(
      productSchema.safeParse({
        ...valid,
        sizes: [
          { label: "S", stock: 2 },
          { label: "M", stock: 3 },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate size labels regardless of case", () => {
    expect(
      productSchema.safeParse({
        ...valid,
        sizes: [
          { label: "M", stock: 2 },
          { label: "m", stock: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects negative per-size stock", () => {
    expect(
      productSchema.safeParse({
        ...valid,
        sizes: [{ label: "L", stock: -1 }],
      }).success,
    ).toBe(false);
  });

  it("rejects required and negative values", () => {
    expect(
      productSchema.safeParse({ ...valid, name: "", price: -1, stock: -2 }).success,
    ).toBe(false);
  });

  it("uses clear guidance when a number field is empty", () => {
    const result = productSchema.safeParse({ ...valid, price: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.price).toEqual(["Enter a valid price."]);
    }
  });

  it("requires a publishing destination", () => {
    expect(publishSchema.safeParse({ platforms: [] }).success).toBe(false);
  });

  it("accepts independent destinations", () => {
    expect(
      publishSchema.parse({ platforms: ["website", "instagram"] }).platforms,
    ).toEqual(["website", "instagram"]);
  });
});
