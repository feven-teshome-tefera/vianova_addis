import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/checkout";

const valid = {
  requestId: "f1e68f22-7d0c-4f1b-8fe4-70d1039ea139",
  items: [{ id: "product-1", quantity: 1 }],
  customer: {
    firstName: "Amina",
    lastName: "Mohammed",
    phone: "0912345678",
    address: "Bole, near the main road",
  },
};

describe("checkout validation", () => {
  it("accepts a valid Addis delivery address", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an omitted or blank optional email", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: { ...valid.customer, email: "" },
      }).success,
    ).toBe(true);
  });

  it("accepts a correctly formatted email", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: { ...valid.customer, email: "customer@example.com" },
      }).success,
    ).toBe(true);
  });

  it("rejects an incorrectly formatted email with a clear message", () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      customer: { ...valid.customer, email: "not-an-email" },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message === "Enter a valid email address.")).toBe(true);
  });

  it("accepts a selected product size", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        items: [{ id: "product-1", sizeId: "size-m", quantity: 1 }],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate lines for the same product and size", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        items: [
          { id: "product-1", sizeId: "size-m", quantity: 1 },
          { id: "product-1", sizeId: "size-m", quantity: 2 },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires an Ethiopian phone beginning with 09 or 07", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: { ...valid.customer, phone: "0812345678" },
      }).success,
    ).toBe(false);
  });

  it("requires latitude and longitude together", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: { ...valid.customer, latitude: 9.03 },
      }).success,
    ).toBe(false);
  });

  it("accepts a location in Addis without a manual address", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: {
          firstName: "Amina",
          lastName: "Mohammed",
          phone: "0712345678",
          latitude: 9.03,
          longitude: 38.74,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects a shared location outside the Addis delivery area", () => {
    expect(
      checkoutSchema.safeParse({
        ...valid,
        customer: {
          ...valid.customer,
          latitude: 8.54,
          longitude: 39.27,
        },
      }).success,
    ).toBe(false);
  });
});
